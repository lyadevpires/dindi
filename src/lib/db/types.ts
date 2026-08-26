import type { SupabaseClient } from "@supabase/supabase-js";

/** Contexto de toda operação: quem está mexendo e em qual casa. */
export type Ctx = {
  db: SupabaseClient;
  householdId: string;
  userId: string;
};

export type AccountType = "checking" | "savings" | "credit_card";
export type TxType = "expense" | "income";

/**
 * O "balde" onde o gasto cai. É o que permite dizer se a casa está
 * apertada por obrigação (fixo) ou por escolha (lazer).
 */
export type Bucket = "fixo" | "dia_a_dia" | "lazer" | "guardar" | "receita";

export const BUCKETS = ["fixo", "dia_a_dia", "lazer", "guardar"] as const;

export const BUCKET_LABEL: Record<Bucket, string> = {
  fixo: "Contas fixas",
  dia_a_dia: "Dia a dia",
  lazer: "Lazer",
  guardar: "Guardar",
  receita: "Entrou",
};

export const BUCKET_HINT: Record<Bucket, string> = {
  fixo: "chega todo mês e você não escolhe",
  dia_a_dia: "o básico de viver",
  lazer: "o que é escolha sua",
  guardar: "vira reserva ou sonho",
  receita: "o que entrou na casa",
};

export type Account = {
  id: string;
  household_id: string;
  name: string;
  type: AccountType;
  owner_user_id: string | null;
  closing_day: number | null;
  due_day: number | null;
  opening_balance: number | string;
  archived: boolean;
};

export type Category = {
  id: string;
  household_id: string;
  name: string;
  kind: "expense" | "income" | "both";
  bucket: Bucket;
  emoji: string | null;
  archived: boolean;
};

export type Transaction = {
  id: string;
  household_id: string;
  date: string;
  amount: number | string;
  description: string;
  type: TxType;
  category_id: string | null;
  account_id: string;
  paid_by_user_id: string | null;
  recurring_rule_id: string | null;
  purchase_id: string | null;
  installment_number: number | null;
  invoice_month: string | null;
  note: string | null;
  created_at: string;
};

export type Member = {
  household_id: string;
  user_id: string;
  display_name: string;
  role: "owner" | "member";
};

export type Goal = {
  id: string;
  name: string;
  kind: "emergencia" | "sonho";
  target_amount: number | string;
  target_date: string | null;
  current_amount: number | string;
  archived: boolean;
};

export type Invoice = {
  id: string;
  household_id: string;
  account_id: string;
  reference_month: string;
  closing_date: string;
  due_date: string;
  total_amount: number | string;
  status: "open" | "closed" | "paid";
  paid_at: string | null;
  paid_from_account_id: string | null;
};

/** Erro com mensagem amigável — o Claude repassa isso pro usuário. */
export class DindiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DindiError";
  }
}
