-- =====================================================================
-- dindi — funções de onboarding
-- Rode DEPOIS do 002_rls.sql.
-- =====================================================================

-- Categorias que toda casa nova ganha de brinde
create or replace function public.seed_default_categories(hid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into categories (household_id, name, kind, bucket, emoji) values
    -- chega todo mês, não dá para escolher
    (hid, 'Moradia',        'expense', 'fixo',      '🏠'),
    (hid, 'Contas de casa', 'expense', 'fixo',      '💡'),
    (hid, 'Assinaturas',    'expense', 'fixo',      '📺'),
    (hid, 'Educação',       'expense', 'fixo',      '📚'),
    -- o básico de viver
    (hid, 'Mercado',        'expense', 'dia_a_dia', '🛒'),
    (hid, 'Transporte',     'expense', 'dia_a_dia', '🚗'),
    (hid, 'Saúde',          'expense', 'dia_a_dia', '💊'),
    (hid, 'Pets',           'expense', 'dia_a_dia', '🐶'),
    (hid, 'Outros',         'expense', 'dia_a_dia', '📦'),
    -- o que é escolha
    (hid, 'Restaurante',    'expense', 'lazer',     '🍽️'),
    (hid, 'Lazer',          'expense', 'lazer',     '🎬'),
    (hid, 'Compras',        'expense', 'lazer',     '🛍️'),
    (hid, 'Presentes',      'expense', 'lazer',     '🎁'),
    (hid, 'Viagem',         'expense', 'lazer',     '✈️'),
    -- o que sai da conta para virar reserva
    (hid, 'Reserva',        'expense', 'guardar',   '🐷'),
    (hid, 'Investimentos',  'expense', 'guardar',   '🌱'),
    -- o que entra
    (hid, 'Salário',        'income',  'receita',   '💼'),
    (hid, 'Freela',         'income',  'receita',   '💻'),
    (hid, 'Rendimentos',    'income',  'receita',   '📈'),
    (hid, 'Outras receitas','income',  'receita',   '➕')
  on conflict (household_id, name) do nothing;
end $$;

-- Cria a casa do usuário logado e o coloca como dono.
create or replace function public.bootstrap_household(
  p_household_name text,
  p_display_name   text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'não autenticado';
  end if;

  -- se já tem casa, devolve a existente (idempotente)
  select household_id into hid from household_members where user_id = uid limit 1;
  if hid is not null then
    return hid;
  end if;

  insert into households (name) values (coalesce(nullif(trim(p_household_name), ''), 'Nossa casa'))
  returning id into hid;

  insert into household_members (household_id, user_id, display_name, role)
  values (hid, uid, coalesce(nullif(trim(p_display_name), ''), 'Eu'), 'owner');

  perform seed_default_categories(hid);

  return hid;
end $$;

-- Gera um convite para o parceiro entrar na casa.
create or replace function public.create_invite(p_email text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  hid  uuid;
  uid  uuid := auth.uid();
  code text;
begin
  select household_id into hid from household_members where user_id = uid limit 1;
  if hid is null then raise exception 'você ainda não tem uma casa'; end if;

  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into household_invites (household_id, code, email, created_by)
  values (hid, code, p_email, uid);

  return code;
end $$;

-- Move tudo de um dindi para outro: contas, categorias, lançamentos, faturas,
-- recorrências, orçamentos e metas. Usado quando alguém aceita um convite e
-- escolhe "levar minhas coisas".
--
-- As categorias são mescladas por nome (a tabela tem unique(household_id,name),
-- e dois dindis novos nascem com as mesmas categorias-semente): se o destino já
-- tem uma categoria com aquele nome, os lançamentos são reapontados para ela e
-- a de origem é descartada. O resto muda de household_id direto.
drop function if exists public.migrar_dindi(uuid, uuid);
create or replace function public.migrar_dindi(de uuid, para uuid, p_nome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c        record;
  a        record;
  alvo     uuid;
  primeiro text := coalesce(nullif(split_part(trim(p_nome), ' ', 1), ''), 'Migrado');
begin
  -- Categorias: mesclar por nome, reapontando quem as usa.
  for c in select id, name from categories where household_id = de loop
    select id into alvo
      from categories where household_id = para and name = c.name limit 1;

    if alvo is not null then
      update transactions           set category_id = alvo where category_id = c.id;
      update credit_card_purchases  set category_id = alvo where category_id = c.id;
      update recurring_rules        set category_id = alvo where category_id = c.id;
      update budgets                set category_id = alvo where category_id = c.id;
      delete from categories where id = c.id;
    else
      update categories set household_id = para where id = c.id;
    end if;
  end loop;

  -- Contas e cartões: diferente das categorias, não se mesclam — a "Nubank"
  -- dela pode ser outra conta que não a "Nubank" dele. Mas duas com o mesmo
  -- nome confundem, então a que vem ganha o primeiro nome da pessoa na frente
  -- ("Nubank" → "Lyandra Nubank"). O id não muda, então nada que aponta para
  -- ela quebra.
  for a in select id, name from accounts where household_id = de loop
    if exists (select 1 from accounts where household_id = para and name = a.name) then
      update accounts set name = left(primeiro || ' ' || a.name, 60) where id = a.id;
    end if;
  end loop;

  -- Contas e o que pende delas (mantêm o mesmo id, então nada quebra).
  update accounts              set household_id = para where household_id = de;
  update credit_card_purchases set household_id = para where household_id = de;
  update recurring_rules       set household_id = para where household_id = de;
  update invoices              set household_id = para where household_id = de;
  update transactions          set household_id = para where household_id = de;

  -- Reserva de emergência é única por dindi (não-arquivada). Se o destino já
  -- tem a dele, a que vem vira sonho para não bater na trava.
  update goals set kind = 'sonho'
    where household_id = de and kind = 'emergencia' and archived = false
      and exists (
        select 1 from goals
         where household_id = para and kind = 'emergencia' and archived = false
      );
  update goals              set household_id = para where household_id = de;
  update goal_contributions set household_id = para where household_id = de;

  -- Orçamentos: um limite por categoria e mês. Se o destino já tem um para a
  -- mesma categoria e mês, o dele manda e o que vinha é descartado.
  delete from budgets b
    where b.household_id = de
      and exists (
        select 1 from budgets t
         where t.household_id = para
           and t.category_id = b.category_id
           and t.reference_month = b.reference_month
      );
  update budgets set household_id = para where household_id = de;
end $$;

-- Entra numa casa usando o código de convite.
--
-- p_mode diz o que fazer com o dindi antigo de quem aceita:
--   'fresh'   — começa zerado; o dindi antigo (dela e só dela) é descartado.
--   'migrate' — leva as coisas do dindi antigo para o novo, e depois o antigo
--               é descartado.
-- Vale só para quem está sozinha no dindi antigo. Dindi dividido com outras
-- pessoas é outro caso (levaria dados dos outros junto) — barrado com um aviso
-- que o app reconhece.
create or replace function public.accept_invite(
  p_code         text,
  p_display_name text,
  p_mode         text default 'fresh'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv          household_invites%rowtype;
  uid          uuid := auth.uid();
  minhas_casas int;
  casa_atual   uuid;
  membros_ali  int;
begin
  if uid is null then raise exception 'não autenticado'; end if;

  select * into inv from household_invites
   where code = upper(trim(p_code)) and accepted_at is null and expires_at > now();

  if inv.id is null then raise exception 'convite inválido ou expirado'; end if;

  select count(*) into minhas_casas from household_members where user_id = uid;

  if minhas_casas > 0 then
    select household_id into casa_atual
      from household_members where user_id = uid limit 1;

    if casa_atual = inv.household_id then
      raise exception 'você já está nesse dindi';
    end if;

    select count(*) into membros_ali
      from household_members where household_id = casa_atual;

    -- Dividido com mais alguém: fluxo à parte, ainda não tratado. Barra sem
    -- destruir nada. O app reconhece esta marca e explica.
    if minhas_casas > 1 or membros_ali > 1 then
      raise exception 'dindi-dividido';
    end if;

    -- Sozinha no dindi antigo: leva as coisas se pediu, e descarta o antigo.
    if p_mode = 'migrate' then
      perform migrar_dindi(casa_atual, inv.household_id, p_display_name);
    end if;
    delete from households where id = casa_atual;  -- cascade limpa o resto
  end if;

  insert into household_members (household_id, user_id, display_name, role)
  values (inv.household_id, uid, coalesce(nullif(trim(p_display_name), ''), 'Eu'), 'member');

  update household_invites
     set accepted_at = now(), accepted_by = uid
   where id = inv.id;

  return inv.household_id;
end $$;
