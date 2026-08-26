"use server";

import { revalidatePath } from "next/cache";
import { pageCtx } from "@/lib/ctx";
import { addTransaction, createAccount } from "@/lib/db/finance";
import { DindiError } from "@/lib/db/types";
import { formatBRL } from "@/lib/money";
import type { ActionState } from "@/app/auth/actions";

/**
 * Registrar um gasto pelo site.
 *
 * O caminho principal continua sendo a conversa com o Claude. Isto aqui é o
 * atalho de quem está na fila do mercado e não quer abrir uma conversa —
 * e por isso passa exatamente pela mesma `addTransaction`, para o dinheiro
 * cair na fatura certa e no balde certo, venha de onde vier.
 */
export async function lancar(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const valor = parseValor(String(formData.get("valor") ?? ""));
  if (valor === null) return { error: "Não entendi o valor. Escreva algo como 45,90." };

  const categoria = String(formData.get("categoria") ?? "").trim();
  const categoriaNova = String(formData.get("categoria_nova") ?? "").trim();
  const nome = categoria === "__nova__" ? categoriaNova : categoria;
  if (!nome) return { error: "Escolha uma categoria." };

  const detalhe = String(formData.get("detalhe") ?? "").trim();
  const tipo = formData.get("tipo") === "income" ? "income" : "expense";

  try {
    const { ctx } = await pageCtx();
    const t = await addTransaction(ctx, {
      amount: valor,
      // Sem detalhe, o nome da categoria já diz o suficiente no extrato.
      description: detalhe || nome,
      type: tipo,
      date: String(formData.get("data") ?? "") || undefined,
      category: nome,
      account: String(formData.get("conta") ?? "") || undefined,
    });

    revalidatePath("/", "layout");

    return {
      ok:
        tipo === "income"
          ? `Anotado: entraram ${formatBRL(t.amount)} em ${t.category}.`
          : `Anotado: ${formatBRL(t.amount)} em ${t.category}${
              t.invoice_month ? ` — vai na fatura do ${t.account}` : ` — saiu do ${t.account}`
            }.`,
    };
  } catch (e) {
    if (e instanceof DindiError) return { error: e.message };
    throw e;
  }
}

/**
 * A primeira conta, criada na hora de anotar o primeiro gasto.
 *
 * Sem ela não existe onde lançar, e mandar a pessoa "pedir pro Claude
 * cadastrar" antes de conseguir usar o botão seria um beco sem saída.
 * Cartão de crédito pede dia de fechamento e vencimento — isso fica com o
 * Claude, aqui é só o lugar simples onde o dinheiro está.
 */
export async function criarPrimeiraConta(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Dê um nome, tipo Nubank ou Carteira." };

  try {
    const { ctx } = await pageCtx();
    await createAccount(ctx, {
      name: nome,
      type: "checking",
      opening_balance: parseValor(String(formData.get("saldo") ?? "")) ?? 0,
    });
    revalidatePath("/", "layout");
    return { ok: `Pronto, ${nome} criada.` };
  } catch (e) {
    if (e instanceof DindiError) return { error: e.message };
    throw e;
  }
}

/**
 * "45" · "45,90" · "1.500,00" · "R$ 45.90" → número.
 * Aceita os dois separadores porque ninguém digita dinheiro do mesmo jeito.
 */
function parseValor(bruto: string): number | null {
  const limpo = bruto.replace(/[^\d.,-]/g, "");
  if (!limpo) return null;

  // Com vírgula, ela é o separador decimal e os pontos são de milhar.
  const normal = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;

  const n = Number(normal);
  return Number.isFinite(n) && n > 0 ? n : null;
}
