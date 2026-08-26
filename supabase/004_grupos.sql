-- =====================================================================
-- dindi — grupos de gasto e tipos de meta
--
-- Toda categoria passa a pertencer a um grupo:
--   fixo      → chega todo mês e não dá para escolher (aluguel, luz, escola)
--   dia_a_dia → o básico de viver (mercado, transporte, saúde, pet)
--   lazer     → o que é escolha (restaurante, viagem, compras, presente)
--   guardar   → o que sai da conta para virar reserva ou meta
--   receita   → o que entra
--
-- E toda meta passa a ser reserva de emergência ou sonho.
-- =====================================================================

-- ---------------------------------------------------------------------
-- categories.bucket
-- ---------------------------------------------------------------------
alter table categories add column if not exists bucket text not null default 'dia_a_dia';

alter table categories drop constraint if exists categories_bucket_check;
alter table categories add constraint categories_bucket_check
  check (bucket in ('fixo','dia_a_dia','lazer','guardar','receita'));

-- Arruma as casas que já existiam, pelo nome das categorias padrão.
update categories set bucket = 'fixo'
 where bucket = 'dia_a_dia'
   and name in ('Moradia','Contas de casa','Assinaturas','Educação');

update categories set bucket = 'lazer'
 where bucket = 'dia_a_dia'
   and name in ('Restaurante','Lazer','Compras','Presentes','Viagem');

update categories set bucket = 'guardar'
 where bucket = 'dia_a_dia'
   and name in ('Reserva','Poupança','Investimentos');

update categories set bucket = 'receita' where kind = 'income';

create index if not exists idx_categories_bucket on categories(household_id, bucket);

-- ---------------------------------------------------------------------
-- goals.kind — reserva de emergência é diferente de sonho
-- ---------------------------------------------------------------------
alter table goals add column if not exists kind text not null default 'sonho';

alter table goals drop constraint if exists goals_kind_check;
alter table goals add constraint goals_kind_check check (kind in ('emergencia','sonho'));

-- Uma casa só tem uma reserva de emergência.
create unique index if not exists idx_goals_uma_emergencia
  on goals(household_id) where kind = 'emergencia' and archived = false;

-- Metas que já existiam e têm cara de reserva viram reserva.
update goals set kind = 'emergencia'
 where kind = 'sonho'
   and (name ilike '%emerg%' or name ilike '%reserva%')
   and not exists (
     select 1 from goals g2
      where g2.household_id = goals.household_id
        and g2.kind = 'emergencia'
        and g2.id <> goals.id
   );
