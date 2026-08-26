import {
  addMonths,
  invoiceDates,
  invoiceMonthFor,
  monthStart,
  today,
} from "@/lib/dates";
import { num, round2, splitInstallments } from "@/lib/money";
import {
  allAccounts,
  allCategories,
  allMembers,
  resolveAccount,
  resolveCategory,
  resolvePerson,
} from "./resolve";
import { DindiError, type Account, type Ctx, type Invoice, type TxType } from "./types";

// =====================================================================
// Transações
// =====================================================================

export type AddTransactionInput = {
  amount: number;
  description: string;
  type?: TxType;
  date?: string;
  category?: string;
  account?: string;
  person?: string;
  note?: string;
};

export async function addTransaction(ctx: Ctx, input: AddTransactionInput) {
  if (!(input.amount > 0)) throw new DindiError("O valor precisa ser maior que zero.");

  const type: TxType = input.type ?? "expense";
  const date = input.date ?? today();
  const account = await resolveAccount(ctx, input.account, { required: true })!;
  if (!account) throw new DindiError("Preciso saber em qual conta lançar.");

  if (account.type === "credit_card" && type === "income") {
    throw new DindiError(
      "Não dá para lançar receita em cartão de crédito. Se foi estorno, use editar/apagar a despesa."
    );
  }

  const category = await resolveCategory(ctx, input.category, {
    createIfMissing: true,
    kind: type,
  });
  const personId = await resolvePerson(ctx, input.person);

  const invoiceMonth =
    account.type === "credit_card"
      ? invoiceMonthFor(date, account.closing_day!)
      : null;

  const { data, error } = await ctx.db
    .from("transactions")
    .insert({
      household_id: ctx.householdId,
      date,
      amount: round2(input.amount),
      description: input.description.trim(),
      type,
      category_id: category?.id ?? null,
      account_id: account.id,
      paid_by_user_id: personId,
      invoice_month: invoiceMonth,
      note: input.note ?? null,
    })
    .select("*")
    .single();

  if (error) throw new DindiError(error.message);

  return {
    id: data.id,
    date: data.date,
    amount: num(data.amount),
    description: data.description,
    type: data.type,
    account: account.name,
    category: category?.name ?? null,
    invoice_month: invoiceMonth,
  };
}

export type EditTransactionInput = {
  id: string;
  amount?: number;
  description?: string;
  date?: string;
  category?: string;
  account?: string;
  person?: string;
  type?: TxType;
};

export async function editTransaction(ctx: Ctx, input: EditTransactionInput) {
  const { data: existing, error: findErr } = await ctx.db
    .from("transactions")
    .select("*")
    .eq("id", input.id)
    .eq("household_id", ctx.householdId)
    .maybeSingle();
  if (findErr) throw new DindiError(findErr.message);
  if (!existing) throw new DindiError("Não achei esse lançamento.");

  const patch: Record<string, unknown> = {};
  if (input.amount !== undefined) {
    if (!(input.amount > 0)) throw new DindiError("O valor precisa ser maior que zero.");
    patch.amount = round2(input.amount);
  }
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.date !== undefined) patch.date = input.date;
  if (input.type !== undefined) patch.type = input.type;

  if (input.category !== undefined) {
    const cat = await resolveCategory(ctx, input.category, { createIfMissing: true });
    patch.category_id = cat?.id ?? null;
  }
  if (input.person !== undefined) {
    patch.paid_by_user_id = await resolvePerson(ctx, input.person);
  }

  let account: Account | null = null;
  if (input.account !== undefined) {
    account = await resolveAccount(ctx, input.account, { required: true });
    patch.account_id = account!.id;
  }

  // Se mudou a conta ou a data, a fatura do cartão pode ter mudado.
  const finalAccountId = (patch.account_id as string) ?? existing.account_id;
  const finalDate = (patch.date as string) ?? existing.date;
  const accounts = await allAccounts(ctx);
  const finalAccount = accounts.find((a) => a.id === finalAccountId)!;
  patch.invoice_month =
    finalAccount.type === "credit_card"
      ? invoiceMonthFor(finalDate, finalAccount.closing_day!)
      : null;

  const { data, error } = await ctx.db
    .from("transactions")
    .update(patch)
    .eq("id", input.id)
    .eq("household_id", ctx.householdId)
    .select("*")
    .single();
  if (error) throw new DindiError(error.message);

  return { ...data, amount: num(data.amount) };
}

export async function deleteTransaction(ctx: Ctx, id: string) {
  const { data, error } = await ctx.db
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("household_id", ctx.householdId)
    .select("id, description, amount")
    .maybeSingle();
  if (error) throw new DindiError(error.message);
  if (!data) throw new DindiError("Não achei esse lançamento para apagar.");
  return { id: data.id, description: data.description, amount: num(data.amount) };
}

export type ListTransactionsFilters = {
  month?: string;
  from?: string;
  to?: string;
  category?: string;
  account?: string;
  person?: string;
  type?: TxType;
  search?: string;
  limit?: number;
};

export async function listTransactions(ctx: Ctx, f: ListTransactionsFilters = {}) {
  const [accounts, categories, members] = await Promise.all([
    allAccounts(ctx),
    allCategories(ctx),
    allMembers(ctx),
  ]);

  let q = ctx.db
    .from("transactions")
    .select("*")
    .eq("household_id", ctx.householdId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(Math.min(f.limit ?? 100, 500));

  if (f.month) {
    const start = monthStart(f.month);
    q = q.gte("date", start).lt("date", addMonths(start, 1));
  }
  if (f.from) q = q.gte("date", f.from);
  if (f.to) q = q.lte("date", f.to);
  if (f.type) q = q.eq("type", f.type);
  if (f.search) q = q.ilike("description", `%${f.search}%`);

  if (f.category) {
    const cat = await resolveCategory(ctx, f.category);
    if (cat) q = q.eq("category_id", cat.id);
  }
  if (f.account) {
    const acc = await resolveAccount(ctx, f.account, { required: true });
    q = q.eq("account_id", acc!.id);
  }
  if (f.person) {
    const pid = await resolvePerson(ctx, f.person);
    if (pid) q = q.eq("paid_by_user_id", pid);
  }

  const { data, error } = await q;
  if (error) throw new DindiError(error.message);

  const accName = new Map(accounts.map((a) => [a.id, a.name]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const memberName = new Map(members.map((m) => [m.user_id, m.display_name]));

  const rows = (data ?? []).map((t) => ({
    id: t.id,
    date: t.date,
    amount: num(t.amount),
    description: t.description,
    type: t.type as TxType,
    category: t.category_id ? catName.get(t.category_id) ?? null : null,
    account: accName.get(t.account_id) ?? "?",
    person: t.paid_by_user_id ? memberName.get(t.paid_by_user_id) ?? null : null,
    installment:
      t.installment_number && t.purchase_id ? `${t.installment_number}ª parcela` : null,
    invoice_month: t.invoice_month,
  }));

  const totalExpense = round2(
    rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0)
  );
  const totalIncome = round2(
    rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0)
  );

  return { count: rows.length, total_expense: totalExpense, total_income: totalIncome, transactions: rows };
}

// =====================================================================
// Saldos
// =====================================================================

async function paidInvoiceOutflows(ctx: Ctx): Promise<Map<string, number>> {
  const { data, error } = await ctx.db
    .from("invoices")
    .select("paid_from_account_id, total_amount")
    .eq("household_id", ctx.householdId)
    .eq("status", "paid");
  if (error) throw new DindiError(error.message);

  const map = new Map<string, number>();
  for (const inv of data ?? []) {
    if (!inv.paid_from_account_id) continue;
    map.set(
      inv.paid_from_account_id,
      round2((map.get(inv.paid_from_account_id) ?? 0) + num(inv.total_amount))
    );
  }
  return map;
}

export async function getBalance(ctx: Ctx, accountQuery?: string) {
  const accounts = (await allAccounts(ctx)).filter((a) => !a.archived);
  const target = accountQuery
    ? [(await resolveAccount(ctx, accountQuery, { required: true }))!]
    : accounts;

  const { data: txs, error } = await ctx.db
    .from("transactions")
    .select("account_id, amount, type, invoice_month")
    .eq("household_id", ctx.householdId);
  if (error) throw new DindiError(error.message);

  const { data: paidInvoices, error: invErr } = await ctx.db
    .from("invoices")
    .select("account_id, reference_month, status")
    .eq("household_id", ctx.householdId)
    .eq("status", "paid");
  if (invErr) throw new DindiError(invErr.message);

  const paidKeys = new Set(
    (paidInvoices ?? []).map((i) => `${i.account_id}|${i.reference_month}`)
  );
  const outflows = await paidInvoiceOutflows(ctx);

  const result = target.map((acc) => {
    const mine = (txs ?? []).filter((t) => t.account_id === acc.id);

    if (acc.type === "credit_card") {
      // Dívida em aberto = despesas que ainda estão em faturas não pagas.
      const open = mine.filter(
        (t) => !paidKeys.has(`${acc.id}|${t.invoice_month}`)
      );
      const owed = round2(open.reduce((s, t) => s + num(t.amount), 0));
      return {
        account: acc.name,
        type: acc.type,
        // saldo negativo = o quanto você deve nesse cartão
        balance: round2(-owed),
        open_invoice_debt: owed,
      };
    }

    const income = mine.filter((t) => t.type === "income").reduce((s, t) => s + num(t.amount), 0);
    const expense = mine.filter((t) => t.type === "expense").reduce((s, t) => s + num(t.amount), 0);
    const invoicesPaid = outflows.get(acc.id) ?? 0;

    return {
      account: acc.name,
      type: acc.type,
      balance: round2(num(acc.opening_balance) + income - expense - invoicesPaid),
      open_invoice_debt: 0,
    };
  });

  const liquid = round2(
    result.filter((r) => r.type !== "credit_card").reduce((s, r) => s + r.balance, 0)
  );
  const cardDebt = round2(
    result.filter((r) => r.type === "credit_card").reduce((s, r) => s + r.open_invoice_debt, 0)
  );

  return {
    accounts: result,
    total_in_accounts: liquid,
    total_credit_card_debt: cardDebt,
    net_worth: round2(liquid - cardDebt),
  };
}

// =====================================================================
// Contas e categorias
// =====================================================================

export async function createAccount(
  ctx: Ctx,
  input: {
    name: string;
    type: Account["type"];
    owner?: string;
    closing_day?: number;
    due_day?: number;
    opening_balance?: number;
  }
) {
  if (input.type === "credit_card" && (!input.closing_day || !input.due_day)) {
    throw new DindiError(
      "Para cartão de crédito preciso do dia de fechamento e do dia de vencimento da fatura."
    );
  }

  const owner =
    input.owner && input.owner.toLowerCase() !== "conjunta"
      ? await resolvePerson(ctx, input.owner)
      : null;

  const { data, error } = await ctx.db
    .from("accounts")
    .insert({
      household_id: ctx.householdId,
      name: input.name.trim(),
      type: input.type,
      owner_user_id: owner,
      closing_day: input.closing_day ?? null,
      due_day: input.due_day ?? null,
      opening_balance: round2(input.opening_balance ?? 0),
    })
    .select("*")
    .single();
  if (error) throw new DindiError(error.message);
  return data;
}

export async function listAccounts(ctx: Ctx) {
  const [accounts, members] = await Promise.all([allAccounts(ctx), allMembers(ctx)]);
  const memberName = new Map(members.map((m) => [m.user_id, m.display_name]));
  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    owner: a.owner_user_id ? memberName.get(a.owner_user_id) ?? null : "conjunta",
    closing_day: a.closing_day,
    due_day: a.due_day,
    archived: a.archived,
  }));
}

export async function createCategory(
  ctx: Ctx,
  input: { name: string; kind?: "expense" | "income" | "both"; emoji?: string }
) {
  const { data, error } = await ctx.db
    .from("categories")
    .insert({
      household_id: ctx.householdId,
      name: input.name.trim(),
      kind: input.kind ?? "expense",
      emoji: input.emoji ?? null,
    })
    .select("*")
    .single();
  if (error) throw new DindiError(error.message);
  return data;
}

export async function listCategories(ctx: Ctx) {
  const cats = await allCategories(ctx);
  return cats.map((c) => ({ id: c.id, name: c.name, kind: c.kind, emoji: c.emoji }));
}

// =====================================================================
// Recorrências
// =====================================================================

export async function createRecurringRule(
  ctx: Ctx,
  input: {
    description: string;
    amount: number;
    day_of_month: number;
    account?: string;
    category?: string;
    person?: string;
    type?: TxType;
    start_date?: string;
    end_date?: string;
  }
) {
  const account = await resolveAccount(ctx, input.account, { required: true })!;
  const category = await resolveCategory(ctx, input.category, {
    createIfMissing: true,
    kind: input.type ?? "expense",
  });
  const person = await resolvePerson(ctx, input.person);

  const { data, error } = await ctx.db
    .from("recurring_rules")
    .insert({
      household_id: ctx.householdId,
      description: input.description.trim(),
      amount: round2(input.amount),
      type: input.type ?? "expense",
      category_id: category?.id ?? null,
      account_id: account!.id,
      paid_by_user_id: person,
      day_of_month: input.day_of_month,
      start_date: input.start_date ?? today(),
      end_date: input.end_date ?? null,
    })
    .select("*")
    .single();
  if (error) throw new DindiError(error.message);
  return { ...data, amount: num(data.amount), account: account!.name, category: category?.name ?? null };
}

export async function listRecurringRules(ctx: Ctx, onlyActive = true) {
  const [accounts, categories] = await Promise.all([allAccounts(ctx), allCategories(ctx)]);
  let q = ctx.db
    .from("recurring_rules")
    .select("*")
    .eq("household_id", ctx.householdId)
    .order("day_of_month");
  if (onlyActive) q = q.eq("active", true);

  const { data, error } = await q;
  if (error) throw new DindiError(error.message);

  const accName = new Map(accounts.map((a) => [a.id, a.name]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (data ?? []).map((r) => ({
    id: r.id,
    description: r.description,
    amount: num(r.amount),
    type: r.type,
    day_of_month: r.day_of_month,
    account: accName.get(r.account_id) ?? "?",
    category: r.category_id ? catName.get(r.category_id) ?? null : null,
    active: r.active,
    end_date: r.end_date,
  }));
}

export async function deactivateRecurringRule(ctx: Ctx, id: string) {
  const { data, error } = await ctx.db
    .from("recurring_rules")
    .update({ active: false })
    .eq("id", id)
    .eq("household_id", ctx.householdId)
    .select("id, description")
    .maybeSingle();
  if (error) throw new DindiError(error.message);
  if (!data) throw new DindiError("Não achei essa recorrência.");
  return data;
}

// =====================================================================
// Cartão de crédito
// =====================================================================

export async function addCreditCardPurchase(
  ctx: Ctx,
  input: {
    description: string;
    total_amount: number;
    installments: number;
    card?: string;
    category?: string;
    person?: string;
    purchase_date?: string;
  }
) {
  if (!(input.total_amount > 0)) throw new DindiError("O valor precisa ser maior que zero.");
  if (input.installments < 1) throw new DindiError("O número de parcelas precisa ser 1 ou mais.");

  const card = await resolveAccount(ctx, input.card, { type: "credit_card", required: true })!;
  if (!card) throw new DindiError("Preciso saber em qual cartão foi a compra.");

  const category = await resolveCategory(ctx, input.category, { createIfMissing: true });
  const person = await resolvePerson(ctx, input.person);
  const purchaseDate = input.purchase_date ?? today();
  const firstInvoiceMonth = invoiceMonthFor(purchaseDate, card.closing_day!);

  const { data: purchase, error: pErr } = await ctx.db
    .from("credit_card_purchases")
    .insert({
      household_id: ctx.householdId,
      account_id: card.id,
      description: input.description.trim(),
      total_amount: round2(input.total_amount),
      installments_count: input.installments,
      first_invoice_month: firstInvoiceMonth,
      purchase_date: purchaseDate,
      category_id: category?.id ?? null,
      paid_by_user_id: person,
    })
    .select("*")
    .single();
  if (pErr) throw new DindiError(pErr.message);

  const values = splitInstallments(input.total_amount, input.installments);
  const rows = values.map((amount, i) => ({
    household_id: ctx.householdId,
    date: i === 0 ? purchaseDate : addMonths(purchaseDate, i),
    amount,
    description:
      input.installments > 1
        ? `${input.description.trim()} (${i + 1}/${input.installments})`
        : input.description.trim(),
    type: "expense" as const,
    category_id: category?.id ?? null,
    account_id: card.id,
    paid_by_user_id: person,
    purchase_id: purchase.id,
    installment_number: i + 1,
    invoice_month: addMonths(firstInvoiceMonth, i),
  }));

  const { error: tErr } = await ctx.db.from("transactions").insert(rows);
  if (tErr) throw new DindiError(tErr.message);

  return {
    purchase_id: purchase.id,
    description: input.description,
    card: card.name,
    total_amount: round2(input.total_amount),
    installments: input.installments,
    installment_amount: values[0],
    first_invoice_month: firstInvoiceMonth,
    last_invoice_month: addMonths(firstInvoiceMonth, input.installments - 1),
    category: category?.name ?? null,
  };
}

/** Garante que a linha da fatura existe e está com o total certo. */
async function ensureInvoice(
  ctx: Ctx,
  card: Account,
  referenceMonth: string
): Promise<Invoice> {
  const { closingDate, dueDate } = invoiceDates(
    referenceMonth,
    card.closing_day!,
    card.due_day!
  );

  const { data: txs, error: tErr } = await ctx.db
    .from("transactions")
    .select("amount")
    .eq("household_id", ctx.householdId)
    .eq("account_id", card.id)
    .eq("invoice_month", referenceMonth);
  if (tErr) throw new DindiError(tErr.message);

  const total = round2((txs ?? []).reduce((s, t) => s + num(t.amount), 0));

  const { data: existing } = await ctx.db
    .from("invoices")
    .select("*")
    .eq("account_id", card.id)
    .eq("reference_month", referenceMonth)
    .maybeSingle();

  // Fatura paga não muda mais de valor.
  if (existing?.status === "paid") return existing as Invoice;

  const status = existing?.status ?? (today() > closingDate ? "closed" : "open");

  const { data, error } = await ctx.db
    .from("invoices")
    .upsert(
      {
        household_id: ctx.householdId,
        account_id: card.id,
        reference_month: referenceMonth,
        closing_date: closingDate,
        due_date: dueDate,
        total_amount: total,
        status,
      },
      { onConflict: "account_id,reference_month" }
    )
    .select("*")
    .single();
  if (error) throw new DindiError(error.message);
  return data as Invoice;
}

export async function getInvoice(ctx: Ctx, cardQuery?: string, month?: string) {
  const card = await resolveAccount(ctx, cardQuery, { type: "credit_card", required: true })!;
  if (!card) throw new DindiError("Preciso saber qual cartão.");

  const referenceMonth = month
    ? monthStart(month)
    : invoiceMonthFor(today(), card.closing_day!);

  const invoice = await ensureInvoice(ctx, card, referenceMonth);

  const categories = await allCategories(ctx);
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const { data: txs, error } = await ctx.db
    .from("transactions")
    .select("*")
    .eq("household_id", ctx.householdId)
    .eq("account_id", card.id)
    .eq("invoice_month", referenceMonth)
    .order("date");
  if (error) throw new DindiError(error.message);

  const byCategory: Record<string, number> = {};
  for (const t of txs ?? []) {
    const name = t.category_id ? catName.get(t.category_id) ?? "Sem categoria" : "Sem categoria";
    byCategory[name] = round2((byCategory[name] ?? 0) + num(t.amount));
  }

  return {
    card: card.name,
    reference_month: referenceMonth,
    closing_date: invoice.closing_date,
    due_date: invoice.due_date,
    status: invoice.status,
    total: num(invoice.total_amount),
    by_category: byCategory,
    items: (txs ?? []).map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: num(t.amount),
      category: t.category_id ? catName.get(t.category_id) ?? null : null,
    })),
  };
}

export async function payInvoice(
  ctx: Ctx,
  input: { card?: string; month?: string; from_account?: string }
) {
  const card = await resolveAccount(ctx, input.card, { type: "credit_card", required: true })!;
  const referenceMonth = input.month
    ? monthStart(input.month)
    : invoiceMonthFor(today(), card!.closing_day!);

  const invoice = await ensureInvoice(ctx, card!, referenceMonth);
  if (invoice.status === "paid") {
    throw new DindiError(`A fatura de ${referenceMonth} do ${card!.name} já está paga.`);
  }
  if (num(invoice.total_amount) === 0) {
    throw new DindiError(`A fatura de ${referenceMonth} do ${card!.name} está zerada.`);
  }

  const fromAccount = await resolveAccount(ctx, input.from_account, { required: true });
  if (fromAccount!.type === "credit_card") {
    throw new DindiError("Você não pode pagar uma fatura com outro cartão de crédito.");
  }

  const { data, error } = await ctx.db
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paid_from_account_id: fromAccount!.id,
    })
    .eq("id", invoice.id)
    .select("*")
    .single();
  if (error) throw new DindiError(error.message);

  return {
    card: card!.name,
    reference_month: referenceMonth,
    amount_paid: num(data.total_amount),
    paid_from: fromAccount!.name,
  };
}

// =====================================================================
// Orçamento
// =====================================================================

export async function setBudget(
  ctx: Ctx,
  input: { category: string; limit_amount: number; month?: string }
) {
  const category = await resolveCategory(ctx, input.category, { createIfMissing: true });
  if (!category) throw new DindiError("Preciso saber a categoria do orçamento.");
  const referenceMonth = monthStart(input.month ?? today());

  const { data, error } = await ctx.db
    .from("budgets")
    .upsert(
      {
        household_id: ctx.householdId,
        category_id: category.id,
        reference_month: referenceMonth,
        limit_amount: round2(input.limit_amount),
      },
      { onConflict: "household_id,category_id,reference_month" }
    )
    .select("*")
    .single();
  if (error) throw new DindiError(error.message);

  return {
    category: category.name,
    month: referenceMonth,
    limit_amount: num(data.limit_amount),
  };
}

export async function getBudgetStatus(ctx: Ctx, month?: string) {
  const referenceMonth = monthStart(month ?? today());
  const categories = await allCategories(ctx);
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const { data: budgets, error } = await ctx.db
    .from("budgets")
    .select("*")
    .eq("household_id", ctx.householdId)
    .eq("reference_month", referenceMonth);
  if (error) throw new DindiError(error.message);

  const { data: txs, error: tErr } = await ctx.db
    .from("transactions")
    .select("category_id, amount, type")
    .eq("household_id", ctx.householdId)
    .eq("type", "expense")
    .gte("date", referenceMonth)
    .lt("date", addMonths(referenceMonth, 1));
  if (tErr) throw new DindiError(tErr.message);

  const spent = new Map<string, number>();
  for (const t of txs ?? []) {
    if (!t.category_id) continue;
    spent.set(t.category_id, round2((spent.get(t.category_id) ?? 0) + num(t.amount)));
  }

  const items = (budgets ?? []).map((b) => {
    const used = spent.get(b.category_id) ?? 0;
    const limit = num(b.limit_amount);
    const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
    return {
      category: catName.get(b.category_id) ?? "?",
      limit_amount: limit,
      spent: used,
      remaining: round2(limit - used),
      percent_used: pct,
      status: pct >= 100 ? "estourou" : pct >= 80 ? "atenção" : "ok",
    };
  });

  return {
    month: referenceMonth,
    budgets: items.sort((a, b) => b.percent_used - a.percent_used),
    categories_without_budget: categories
      .filter((c) => c.kind !== "income" && !(budgets ?? []).some((b) => b.category_id === c.id))
      .map((c) => c.name),
  };
}

// =====================================================================
// Metas
// =====================================================================

export async function createGoal(
  ctx: Ctx,
  input: { name: string; target_amount: number; target_date?: string }
) {
  const { data, error } = await ctx.db
    .from("goals")
    .insert({
      household_id: ctx.householdId,
      name: input.name.trim(),
      target_amount: round2(input.target_amount),
      target_date: input.target_date ?? null,
    })
    .select("*")
    .single();
  if (error) throw new DindiError(error.message);
  return { ...data, target_amount: num(data.target_amount), current_amount: 0 };
}

async function resolveGoal(ctx: Ctx, query: string) {
  const { data, error } = await ctx.db
    .from("goals")
    .select("*")
    .eq("household_id", ctx.householdId)
    .eq("archived", false);
  if (error) throw new DindiError(error.message);

  const goals = data ?? [];
  const q = query.toLowerCase().trim();
  const found =
    goals.find((g) => g.id === query) ??
    goals.find((g) => g.name.toLowerCase() === q) ??
    goals.find((g) => g.name.toLowerCase().includes(q));

  if (!found) {
    throw new DindiError(
      `Não achei a meta "${query}". Metas ativas: ${goals.map((g) => g.name).join(", ") || "nenhuma"}.`
    );
  }
  return found;
}

export async function contributeToGoal(
  ctx: Ctx,
  input: { goal: string; amount: number; date?: string; person?: string; note?: string }
) {
  const goal = await resolveGoal(ctx, input.goal);
  const person = await resolvePerson(ctx, input.person);

  const { error } = await ctx.db.from("goal_contributions").insert({
    household_id: ctx.householdId,
    goal_id: goal.id,
    amount: round2(input.amount),
    date: input.date ?? today(),
    user_id: person,
    note: input.note ?? null,
  });
  if (error) throw new DindiError(error.message);

  const { data: updated } = await ctx.db
    .from("goals")
    .select("*")
    .eq("id", goal.id)
    .single();

  const current = num(updated?.current_amount);
  const target = num(updated?.target_amount);

  return {
    goal: goal.name,
    contributed: round2(input.amount),
    current_amount: current,
    target_amount: target,
    percent: target > 0 ? Math.round((current / target) * 100) : 0,
    remaining: round2(Math.max(target - current, 0)),
  };
}

export async function getGoalProgress(ctx: Ctx, goalQuery?: string) {
  const { data, error } = await ctx.db
    .from("goals")
    .select("*")
    .eq("household_id", ctx.householdId)
    .eq("archived", false)
    .order("created_at");
  if (error) throw new DindiError(error.message);

  let goals = data ?? [];
  if (goalQuery) {
    const g = await resolveGoal(ctx, goalQuery);
    goals = [g];
  }

  return goals.map((g) => {
    const current = num(g.current_amount);
    const target = num(g.target_amount);
    const remaining = round2(Math.max(target - current, 0));

    let monthly_needed: number | null = null;
    if (g.target_date && remaining > 0) {
      const months = Math.max(
        1,
        (new Date(g.target_date).getTime() - new Date(today()).getTime()) /
          (1000 * 60 * 60 * 24 * 30.44)
      );
      monthly_needed = round2(remaining / months);
    }

    return {
      id: g.id,
      name: g.name,
      target_amount: target,
      current_amount: current,
      percent: target > 0 ? Math.round((current / target) * 100) : 0,
      remaining,
      target_date: g.target_date,
      monthly_needed,
    };
  });
}

// =====================================================================
// Resumo para o Claude analisar
// =====================================================================

export async function getFinancialSummary(
  ctx: Ctx,
  input: { month?: string; compare_months?: number } = {}
) {
  const referenceMonth = monthStart(input.month ?? today());
  const compare = Math.min(Math.max(input.compare_months ?? 3, 1), 12);
  const from = addMonths(referenceMonth, -(compare - 1));

  const [categories, accounts, members] = await Promise.all([
    allCategories(ctx),
    allAccounts(ctx),
    allMembers(ctx),
  ]);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const accName = new Map(accounts.map((a) => [a.id, a.name]));
  const memberName = new Map(members.map((m) => [m.user_id, m.display_name]));

  const { data: txs, error } = await ctx.db
    .from("transactions")
    .select("*")
    .eq("household_id", ctx.householdId)
    .gte("date", from)
    .lt("date", addMonths(referenceMonth, 1));
  if (error) throw new DindiError(error.message);

  const months: string[] = [];
  for (let i = 0; i < compare; i++) months.push(addMonths(from, i));

  const perMonth = months.map((m) => {
    const end = addMonths(m, 1);
    const rows = (txs ?? []).filter((t) => t.date >= m && t.date < end);

    const income = round2(
      rows.filter((t) => t.type === "income").reduce((s, t) => s + num(t.amount), 0)
    );
    const expense = round2(
      rows.filter((t) => t.type === "expense").reduce((s, t) => s + num(t.amount), 0)
    );

    const byCategory: Record<string, number> = {};
    for (const t of rows) {
      if (t.type !== "expense") continue;
      const name = t.category_id ? catName.get(t.category_id) ?? "Sem categoria" : "Sem categoria";
      byCategory[name] = round2((byCategory[name] ?? 0) + num(t.amount));
    }

    const byPerson: Record<string, number> = {};
    for (const t of rows) {
      if (t.type !== "expense") continue;
      const name = t.paid_by_user_id ? memberName.get(t.paid_by_user_id) ?? "?" : "não informado";
      byPerson[name] = round2((byPerson[name] ?? 0) + num(t.amount));
    }

    return {
      month: m,
      income,
      expense,
      balance: round2(income - expense),
      by_category: byCategory,
      by_person: byPerson,
    };
  });

  const current = perMonth[perMonth.length - 1];
  const previous = perMonth.length > 1 ? perMonth[perMonth.length - 2] : null;

  const categoryChanges = previous
    ? Object.keys({ ...current.by_category, ...previous.by_category })
        .map((cat) => {
          const now = current.by_category[cat] ?? 0;
          const before = previous.by_category[cat] ?? 0;
          return {
            category: cat,
            current: now,
            previous: before,
            diff: round2(now - before),
            percent_change: before > 0 ? Math.round(((now - before) / before) * 100) : null,
          };
        })
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    : [];

  // Gastos "avulsos": despesas que não vieram de recorrência nem de parcelamento
  const currentEnd = addMonths(referenceMonth, 1);
  const oneOffs = (txs ?? [])
    .filter(
      (t) =>
        t.type === "expense" &&
        t.date >= referenceMonth &&
        t.date < currentEnd &&
        !t.recurring_rule_id &&
        !t.purchase_id
    )
    .map((t) => ({
      date: t.date,
      description: t.description,
      amount: num(t.amount),
      category: t.category_id ? catName.get(t.category_id) ?? null : null,
      account: accName.get(t.account_id) ?? "?",
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20);

  return {
    reference_month: referenceMonth,
    current_month: current,
    previous_month: previous,
    months: perMonth,
    biggest_category_changes: categoryChanges.slice(0, 10),
    biggest_one_off_expenses: oneOffs,
  };
}
