import { addMonths, daysInMonth, invoiceDates, parseISO, today, toISO } from "@/lib/dates";
import { num, round2 } from "@/lib/money";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/oauth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Rotina diária — a Vercel chama isto uma vez por dia (ver vercel.json).
 *
 * Faz duas coisas:
 *   1. Lança as contas que se repetem todo mês (aluguel, salário, assinaturas)
 *   2. Fecha as faturas dos cartões que fecham hoje
 *
 * É idempotente: se rodar duas vezes no mesmo dia, não duplica nada.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  if (!provided || !safeEqual(provided, env.cronSecret)) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }

  const hoje = today();
  const { y, m, d } = parseISO(hoje);
  const ultimoDiaDoMes = daysInMonth(y, m);
  const mesAtual = toISO(y, m, 1);

  const db = supabaseAdmin();
  const log = { data: hoje, recorrencias_lancadas: 0, faturas_fechadas: 0, erros: [] as string[] };

  // -------------------------------------------------------------------
  // 1. Recorrências
  // -------------------------------------------------------------------
  const { data: regras, error: regrasErr } = await db
    .from("recurring_rules")
    .select("*")
    .eq("active", true)
    .lte("start_date", hoje);

  if (regrasErr) {
    log.erros.push(`recorrências: ${regrasErr.message}`);
  } else {
    for (const regra of regras ?? []) {
      // Se o dia não existe neste mês (ex: dia 31 em fevereiro), lança no último dia.
      const diaEfetivo = Math.min(regra.day_of_month, ultimoDiaDoMes);
      if (d !== diaEfetivo) continue;
      if (regra.end_date && hoje > regra.end_date) continue;
      if (regra.last_generated_month === mesAtual) continue; // já lançou este mês

      const { error: insErr } = await db.from("transactions").insert({
        household_id: regra.household_id,
        date: hoje,
        amount: regra.amount,
        description: regra.description,
        type: regra.type,
        category_id: regra.category_id,
        account_id: regra.account_id,
        paid_by_user_id: regra.paid_by_user_id,
        recurring_rule_id: regra.id,
      });

      if (insErr) {
        log.erros.push(`regra ${regra.id}: ${insErr.message}`);
        continue;
      }

      await db
        .from("recurring_rules")
        .update({ last_generated_month: mesAtual })
        .eq("id", regra.id);

      log.recorrencias_lancadas++;
    }
  }

  // -------------------------------------------------------------------
  // 2. Fechamento de faturas
  // -------------------------------------------------------------------
  const { data: cartoes, error: cartoesErr } = await db
    .from("accounts")
    .select("*")
    .eq("type", "credit_card")
    .eq("archived", false);

  if (cartoesErr) {
    log.erros.push(`cartões: ${cartoesErr.message}`);
  } else {
    for (const cartao of cartoes ?? []) {
      const diaFechamento = Math.min(cartao.closing_day, ultimoDiaDoMes);
      if (d !== diaFechamento) continue;

      const { closingDate, dueDate } = invoiceDates(mesAtual, cartao.closing_day, cartao.due_day);

      const { data: lancamentos, error: txErr } = await db
        .from("transactions")
        .select("amount")
        .eq("account_id", cartao.id)
        .eq("invoice_month", mesAtual);

      if (txErr) {
        log.erros.push(`fatura ${cartao.id}: ${txErr.message}`);
        continue;
      }

      const total = round2((lancamentos ?? []).reduce((s, t) => s + num(t.amount), 0));

      const { data: existente } = await db
        .from("invoices")
        .select("status")
        .eq("account_id", cartao.id)
        .eq("reference_month", mesAtual)
        .maybeSingle();

      if (existente?.status === "paid") continue; // não mexe em fatura já paga

      const { error: upErr } = await db.from("invoices").upsert(
        {
          household_id: cartao.household_id,
          account_id: cartao.id,
          reference_month: mesAtual,
          closing_date: closingDate,
          due_date: dueDate,
          total_amount: total,
          status: "closed",
        },
        { onConflict: "account_id,reference_month" }
      );

      if (upErr) {
        log.erros.push(`fatura ${cartao.id}: ${upErr.message}`);
        continue;
      }

      // Já deixa a fatura do mês seguinte aberta.
      const proximoMes = addMonths(mesAtual, 1);
      const proximas = invoiceDates(proximoMes, cartao.closing_day, cartao.due_day);
      await db.from("invoices").upsert(
        {
          household_id: cartao.household_id,
          account_id: cartao.id,
          reference_month: proximoMes,
          closing_date: proximas.closingDate,
          due_date: proximas.dueDate,
          total_amount: 0,
          status: "open",
        },
        { onConflict: "account_id,reference_month", ignoreDuplicates: true }
      );

      log.faturas_fechadas++;
    }
  }

  return Response.json(log);
}
