-- =====================================================================
-- dindi — schema principal
-- Rode este arquivo no SQL Editor do Supabase (uma vez só).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Casa (household) = o espaço compartilhado de um casal / família.
-- Todo dado do sistema pertence a uma casa.
-- ---------------------------------------------------------------------
create table if not exists households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role         text not null default 'member' check (role in ('owner','member')),
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index if not exists idx_members_user on household_members(user_id);

create table if not exists household_invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  code         text not null unique,
  email        text,
  created_by   uuid not null references auth.users(id) on delete cascade,
  accepted_by  uuid references auth.users(id) on delete set null,
  accepted_at  timestamptz,
  expires_at   timestamptz not null default (now() + interval '30 days'),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Contas: conta corrente, poupança e cartão de crédito
-- ---------------------------------------------------------------------
create table if not exists accounts (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  name           text not null,
  type           text not null check (type in ('checking','savings','credit_card')),
  owner_user_id  uuid references auth.users(id) on delete set null, -- null = conjunta
  closing_day    int check (closing_day between 1 and 31),
  due_day        int check (due_day between 1 and 31),
  opening_balance numeric(14,2) not null default 0,
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint card_needs_days check (
    type <> 'credit_card' or (closing_day is not null and due_day is not null)
  )
);

create index if not exists idx_accounts_household on accounts(household_id);

-- ---------------------------------------------------------------------
-- Categorias
-- ---------------------------------------------------------------------
create table if not exists categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  kind         text not null default 'expense' check (kind in ('expense','income','both')),
  emoji        text,
  archived     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (household_id, name)
);

create index if not exists idx_categories_household on categories(household_id);

-- ---------------------------------------------------------------------
-- Regras recorrentes (aluguel, salário, assinaturas...)
-- ---------------------------------------------------------------------
create table if not exists recurring_rules (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references households(id) on delete cascade,
  description          text not null,
  amount               numeric(14,2) not null check (amount > 0),
  type                 text not null default 'expense' check (type in ('expense','income')),
  category_id          uuid references categories(id) on delete set null,
  account_id           uuid not null references accounts(id) on delete cascade,
  paid_by_user_id      uuid references auth.users(id) on delete set null,
  day_of_month         int not null check (day_of_month between 1 and 31),
  start_date           date not null default current_date,
  end_date             date,
  active               boolean not null default true,
  last_generated_month date, -- primeiro dia do último mês já gerado (evita duplicar)
  created_at           timestamptz not null default now()
);

create index if not exists idx_recurring_household on recurring_rules(household_id);

-- ---------------------------------------------------------------------
-- Compras parceladas no cartão
-- ---------------------------------------------------------------------
create table if not exists credit_card_purchases (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references households(id) on delete cascade,
  account_id          uuid not null references accounts(id) on delete cascade,
  description         text not null,
  total_amount        numeric(14,2) not null check (total_amount > 0),
  installments_count  int not null check (installments_count between 1 and 72),
  first_invoice_month date not null, -- sempre dia 1 do mês
  purchase_date       date not null default current_date,
  category_id         uuid references categories(id) on delete set null,
  paid_by_user_id     uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_purchases_household on credit_card_purchases(household_id);

-- ---------------------------------------------------------------------
-- Faturas do cartão
-- ---------------------------------------------------------------------
create table if not exists invoices (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references households(id) on delete cascade,
  account_id           uuid not null references accounts(id) on delete cascade,
  reference_month      date not null, -- dia 1 do mês de referência
  closing_date         date not null,
  due_date             date not null,
  total_amount         numeric(14,2) not null default 0,
  status               text not null default 'open' check (status in ('open','closed','paid')),
  paid_at              timestamptz,
  paid_from_account_id uuid references accounts(id) on delete set null,
  created_at           timestamptz not null default now(),
  unique (account_id, reference_month)
);

create index if not exists idx_invoices_household on invoices(household_id);

-- ---------------------------------------------------------------------
-- Transações (gastos e receitas)
-- ---------------------------------------------------------------------
create table if not exists transactions (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null references households(id) on delete cascade,
  date               date not null default current_date,
  amount             numeric(14,2) not null check (amount > 0),
  description        text not null,
  type               text not null check (type in ('expense','income')),
  category_id        uuid references categories(id) on delete set null,
  account_id         uuid not null references accounts(id) on delete cascade,
  paid_by_user_id    uuid references auth.users(id) on delete set null,
  recurring_rule_id  uuid references recurring_rules(id) on delete set null,
  purchase_id        uuid references credit_card_purchases(id) on delete cascade,
  installment_number int,
  -- só para transações de cartão: em qual fatura (dia 1 do mês) ela cai
  invoice_month      date,
  note               text,
  created_at         timestamptz not null default now()
);

create index if not exists idx_tx_household_date on transactions(household_id, date desc);
create index if not exists idx_tx_account on transactions(account_id);
create index if not exists idx_tx_category on transactions(category_id);
create index if not exists idx_tx_invoice on transactions(account_id, invoice_month);
create index if not exists idx_tx_purchase on transactions(purchase_id);

-- ---------------------------------------------------------------------
-- Orçamento por categoria/mês
-- ---------------------------------------------------------------------
create table if not exists budgets (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references households(id) on delete cascade,
  category_id     uuid not null references categories(id) on delete cascade,
  reference_month date not null, -- dia 1 do mês
  limit_amount    numeric(14,2) not null check (limit_amount > 0),
  created_at      timestamptz not null default now(),
  unique (household_id, category_id, reference_month)
);

-- ---------------------------------------------------------------------
-- Metas de economia
-- ---------------------------------------------------------------------
create table if not exists goals (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  name           text not null,
  target_amount  numeric(14,2) not null check (target_amount > 0),
  target_date    date,
  current_amount numeric(14,2) not null default 0,
  archived       boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists idx_goals_household on goals(household_id);

create table if not exists goal_contributions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  goal_id      uuid not null references goals(id) on delete cascade,
  date         date not null default current_date,
  amount       numeric(14,2) not null,
  user_id      uuid references auth.users(id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);

-- Mantém goals.current_amount sempre em dia
create or replace function sync_goal_amount() returns trigger
language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  gid := coalesce(new.goal_id, old.goal_id);
  update goals
     set current_amount = coalesce((select sum(amount) from goal_contributions where goal_id = gid), 0)
   where id = gid;
  return null;
end $$;

drop trigger if exists trg_sync_goal_amount on goal_contributions;
create trigger trg_sync_goal_amount
after insert or update or delete on goal_contributions
for each row execute function sync_goal_amount();

-- =====================================================================
-- OAuth — usado pelo Claude para conectar no MCP
-- =====================================================================
create table if not exists oauth_clients (
  client_id                  text primary key,
  client_secret              text,
  client_name                text,
  redirect_uris              jsonb not null default '[]'::jsonb,
  grant_types                jsonb not null default '["authorization_code","refresh_token"]'::jsonb,
  token_endpoint_auth_method text not null default 'none',
  created_at                 timestamptz not null default now()
);

create table if not exists oauth_authorization_codes (
  code                  text primary key,
  client_id             text not null references oauth_clients(client_id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  household_id          uuid not null references households(id) on delete cascade,
  redirect_uri          text not null,
  code_challenge        text,
  code_challenge_method text,
  scope                 text,
  resource              text,
  expires_at            timestamptz not null,
  used                  boolean not null default false,
  created_at            timestamptz not null default now()
);

create table if not exists oauth_tokens (
  id            uuid primary key default gen_random_uuid(),
  token_hash    text not null unique,
  token_type    text not null check (token_type in ('access','refresh')),
  client_id     text not null references oauth_clients(client_id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  household_id  uuid not null references households(id) on delete cascade,
  scope         text,
  expires_at    timestamptz,
  revoked       boolean not null default false,
  last_used_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_oauth_tokens_user on oauth_tokens(user_id);
