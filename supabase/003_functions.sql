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

-- Entra numa casa usando o código de convite.
create or replace function public.accept_invite(
  p_code         text,
  p_display_name text
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
begin
  if uid is null then raise exception 'não autenticado'; end if;

  select * into inv from household_invites
   where code = upper(trim(p_code)) and accepted_at is null and expires_at > now();

  if inv.id is null then raise exception 'convite inválido ou expirado'; end if;

  -- Já faz parte de alguma casa?
  --
  -- Quem clicou num convite, caiu no login e perdeu o código no caminho
  -- acabava criando um dindi vazio por engano — e depois não conseguia mais
  -- aceitar o convite, porque "já fazia parte de uma casa". Então: se a única
  -- casa da pessoa é um vazio que só ela habita (nada lançado, nenhuma conta,
  -- nenhuma meta), a gente descarta esse vazio e deixa ela entrar. O cascade
  -- do banco limpa as categorias-semente junto. Qualquer outra situação —
  -- casa com dados, ou dividida com mais alguém — continua barrada.
  select count(*) into minhas_casas from household_members where user_id = uid;

  if minhas_casas > 0 then
    select household_id into casa_atual
      from household_members where user_id = uid limit 1;

    if minhas_casas = 1
       and (select count(*) from household_members where household_id = casa_atual) = 1
       and not exists (select 1 from transactions where household_id = casa_atual)
       and not exists (select 1 from accounts     where household_id = casa_atual)
       and not exists (select 1 from goals        where household_id = casa_atual)
    then
      delete from households where id = casa_atual;
    else
      raise exception 'você já faz parte de uma casa';
    end if;
  end if;

  insert into household_members (household_id, user_id, display_name, role)
  values (inv.household_id, uid, coalesce(nullif(trim(p_display_name), ''), 'Eu'), 'member');

  update household_invites
     set accepted_at = now(), accepted_by = uid
   where id = inv.id;

  return inv.household_id;
end $$;
