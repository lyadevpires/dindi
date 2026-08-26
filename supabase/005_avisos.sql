-- =====================================================================
-- dindi — avisos no celular
-- Guarda o "endereço" de cada aparelho que topou receber o recado da manhã.
-- =====================================================================

create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  -- O navegador é quem inventa este endereço; ele é único por aparelho.
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  created_at   timestamptz not null default now(),
  last_sent_at timestamptz
);

create index if not exists idx_push_household on push_subscriptions(household_id);

alter table push_subscriptions enable row level security;

-- Cada pessoa só enxerga e mexe nos próprios aparelhos. Quem manda o aviso é
-- a rotina diária, que usa a chave de serviço e não passa por aqui.
drop policy if exists push_proprio on push_subscriptions;
create policy push_proprio on push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
