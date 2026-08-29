import { pageCtx } from "@/lib/ctx";
import { today } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Baixar tudo que o dindi guarda sobre você, num arquivo só.
 *
 * Serve a duas coisas ao mesmo tempo:
 *
 *   - a LGPD dá o direito de pedir uma cópia dos próprios dados, e o certo é
 *     isso ser um botão, não um email pedindo favor;
 *
 *   - é a cópia de segurança de quem usa. O banco tem plano gratuito e sem
 *     restauração — se ele se perder, o histórico de dinheiro de quem confiou
 *     aqui se perde junto. Uma pessoa com o próprio arquivo salvo não fica na
 *     mão, e isso não depende de contratar nada.
 *
 * Vai só o dindi de quem está logado: as consultas passam pelo cliente do
 * navegador, então a trava do banco continua valendo como segunda barreira.
 */
export async function GET() {
  const { session, ctx } = await pageCtx();

  const tabelas = [
    "accounts",
    "categories",
    "transactions",
    "credit_card_purchases",
    "recurring_rules",
    "invoices",
    "budgets",
    "goals",
    "goal_contributions",
    "household_members",
  ] as const;

  const dados: Record<string, unknown> = {
    exportado_em: new Date().toISOString(),
    dindi: session.householdName,
    voce: { nome: session.displayName, email: session.email },
  };

  for (const t of tabelas) {
    const { data, error } = await ctx.db.from(t).select("*");
    dados[t] = error ? { erro: error.message } : data;
  }

  const arquivo = `dindi-${today()}.json`;

  return new Response(JSON.stringify(dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
