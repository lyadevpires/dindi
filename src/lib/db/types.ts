import type { SupabaseClient } from "@supabase/supabase-js";

/** Contexto de toda operação: quem está mexendo e em qual casa. */
export type Ctx = {
  db: SupabaseClient;
  householdId: string;
  userId: string;
};

export type AccountType = "checking" | "savings" | "credit_card";
export type TxType = "expense" | "income";

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
