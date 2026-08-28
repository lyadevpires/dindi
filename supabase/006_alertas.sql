-- ---------------------------------------------------------------------
-- Memória dos avisos já enviados.
--
-- Sem isso, o mesmo recado ("o lazer passou do ponto") sairia todo santo
-- dia enquanto a situação durasse — e em três dias a pessoa desliga as
-- notificações, levando junto o aviso que importava.
--
-- Uma linha por dindi e por tipo de aviso, guardando quando ele saiu pela
-- última vez. Quem decide o intervalo de cada tipo é o código.
-- ---------------------------------------------------------------------
create table if not exists public.alert_log (
  household_id uuid not null references public.households (id) on delete cascade,
  alert_id     text not null,
  last_sent    date not null,
  primary key (household_id, alert_id)
);

alter table public.alert_log enable row level security;

-- Quem participa do dindi pode ver o histórico dos próprios avisos.
-- Quem grava é a rotina diária, que roda com a chave de serviço.
drop policy if exists alert_log_select on public.alert_log;
create policy alert_log_select on public.alert_log
  for select using (public.is_household_member(household_id));
