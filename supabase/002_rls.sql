-- =====================================================================
-- dindi — Row Level Security
-- Garante que cada casa só enxerga os próprios dados.
-- Rode DEPOIS do 001_schema.sql.
-- =====================================================================

-- Função auxiliar: o usuário logado é membro desta casa?
-- SECURITY DEFINER evita recursão infinita nas policies de household_members.
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from household_members
     where household_id = hid and user_id = auth.uid()
  );
$$;

create or replace function public.my_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from household_members where user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------
alter table households            enable row level security;
alter table household_members     enable row level security;
alter table household_invites     enable row level security;
alter table accounts              enable row level security;
alter table categories            enable row level security;
alter table recurring_rules       enable row level security;
alter table credit_card_purchases enable row level security;
alter table invoices              enable row level security;
alter table transactions          enable row level security;
alter table budgets               enable row level security;
alter table goals                 enable row level security;
alter table goal_contributions    enable row level security;
alter table oauth_clients         enable row level security;
alter table oauth_authorization_codes enable row level security;
alter table oauth_tokens          enable row level security;

-- households -----------------------------------------------------------
drop policy if exists households_select on households;
create policy households_select on households
  for select using (public.is_household_member(id));

drop policy if exists households_update on households;
create policy households_update on households
  for update using (public.is_household_member(id));

-- household_members ----------------------------------------------------
drop policy if exists members_select on household_members;
create policy members_select on household_members
  for select using (public.is_household_member(household_id));

drop policy if exists members_update_self on household_members;
create policy members_update_self on household_members
  for update using (user_id = auth.uid());

-- household_invites ----------------------------------------------------
drop policy if exists invites_select on household_invites;
create policy invites_select on household_invites
  for select using (public.is_household_member(household_id));

-- ---------------------------------------------------------------------
-- Tabelas de dados: mesma regra para tudo (membro da casa = acesso total)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'accounts','categories','recurring_rules','credit_card_purchases',
    'invoices','transactions','budgets','goals','goal_contributions'
  ] loop
    execute format('drop policy if exists %I_all on %I', t, t);
    execute format(
      'create policy %I_all on %I for all
         using (public.is_household_member(household_id))
         with check (public.is_household_member(household_id))', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- OAuth: nenhuma policy permissiva.
-- Só o servidor (service_role, que ignora RLS) acessa essas tabelas.
-- O usuário pode ver e revogar as próprias conexões.
-- ---------------------------------------------------------------------
drop policy if exists tokens_select_own on oauth_tokens;
create policy tokens_select_own on oauth_tokens
  for select using (user_id = auth.uid());

drop policy if exists tokens_revoke_own on oauth_tokens;
create policy tokens_revoke_own on oauth_tokens
  for update using (user_id = auth.uid());
