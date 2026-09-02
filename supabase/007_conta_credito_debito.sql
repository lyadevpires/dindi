-- ---------------------------------------------------------------------
-- Uma conta pode ser débito, crédito, ou os dois.
--
-- No Brasil é comum o banco ser tudo junto: o Nubank, o Inter, o C6 são a
-- conta onde cai o salário E o cartão que fecha fatura. Antes o dindi obrigava
-- a escolher um só (o `type`), então quem recebia salário num "cartão" via o
-- dinheiro sumir. Agora cada conta declara o que sabe fazer:
--
--   tem_debito  = tem saldo; recebe dinheiro e paga no débito na hora.
--   tem_credito = tem fatura; a compra no crédito entra e fecha depois.
--
-- O `type` (checking/savings/credit_card) continua para rotular o sabor da
-- conta, mas quem manda no comportamento agora são estas duas chaves.
-- ---------------------------------------------------------------------

alter table accounts add column if not exists tem_debito  boolean;
alter table accounts add column if not exists tem_credito boolean;

-- Preenche só quem ainda está em branco (nunca mexe em conta já ajustada, para
-- não desfazer uma conta que o dono tornou híbrida depois).
update accounts set tem_debito  = (type <> 'credit_card') where tem_debito  is null;
update accounts set tem_credito = (type =  'credit_card') where tem_credito is null;

alter table accounts alter column tem_debito  set default true;
alter table accounts alter column tem_credito set default false;

-- A trava antiga só cobrava os dias da fatura de quem era 'credit_card'. Agora
-- é de quem tem crédito, seja qual for o sabor.
alter table accounts drop constraint if exists card_needs_days;
alter table accounts drop constraint if exists conta_credito_precisa_dias;
alter table accounts add  constraint conta_credito_precisa_dias check (
  tem_credito is not true or (closing_day is not null and due_day is not null)
);
