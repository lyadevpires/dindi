import { addMonths, monthStart, today } from "@/lib/dates";
import { formatBRL, num, round2 } from "@/lib/money";
import { mandarRecado } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Ctx } from "./types";
import type { Nivel } from "./conselhos";

/**
 * Quando o dindi abre a boca.
 *
 * Dois momentos diferentes, e a diferença importa:
 *
 *   - na hora do gasto: só quando algo acabou de sair do lugar (passou do
 *     limite combinado, ou foi um valor muito fora do normal). É o aviso que
 *     ainda dá para agir em cima, porque a pessoa está com o dinheiro na mão.
 *
 *   - de manhã: o resumo do que precisa de atenção e os parabéns do que deu
 *     certo. Esse não corre, então pode esperar o café.
 *
 * A regra que vale para os dois: falar pouco. Um app que avisa demais é um app
 * com as notificações desligadas, e aí o aviso que importava também não chega.
 */

/* ------------------------------------------------------------------ */
/* Não repetir                                                        */
/* ------------------------------------------------------------------ */

/**
 * De quantos em quantos dias cada tipo de aviso pode voltar.
 *
 * Coisa urgente pode insistir; parabéns e dica, não — elogio repetido para
 * de significar alguma coisa, e dica repetida vira sermão.
 */
const DESCANSO: Record<Nivel, number> = {
  urgente: 2,
  atencao: 4,
  dica: 8,
  parabens: 8,
};

function diasEntre(de: string, ate: string): number {
  const a = new Date(`${de}T00:00:00Z`).getTime();
  const b = new Date(`${ate}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Filtra o que já foi dito há pouco e marca o que vai sair agora.
 *
 * Recebe a lista inteira de candidatos e devolve só o que passou do descanso.
 * Quem chama decide quantos desses realmente envia.
 */
export async function aindaPodeFalar(
  householdId: string,
  candidatos: { id: string; nivel: Nivel }[]
): Promise<Set<string>> {
  if (candidatos.length === 0) return new Set();

  const db = supabaseAdmin();
  const hoje = today();

  const { data: jaDitos } = await db
    .from("alert_log")
    .select("alert_id, last_sent")
    .eq("household_id", householdId)
    .in(
      "alert_id",
      candidatos.map((c) => c.id)
    );

  const ultimaVez = new Map((jaDitos ?? []).map((r) => [r.alert_id, r.last_sent as string]));

  const liberados = new Set<string>();
  for (const c of candidatos) {
    const quando = ultimaVez.get(c.id);
    if (!quando || diasEntre(quando, hoje) >= DESCANSO[c.nivel]) liberados.add(c.id);
  }
  return liberados;
}

/** Anota que este aviso saiu hoje, para ele descansar antes de voltar. */
export async function anotarQueFalou(householdId: string, alertId: string): Promise<void> {
  await supabaseAdmin()
    .from("alert_log")
    .upsert(
      { household_id: householdId, alert_id: alertId, last_sent: today() },
      { onConflict: "household_id,alert_id" }
    );
}

/* ------------------------------------------------------------------ */
/* O aviso na hora do gasto                                            */
/* ------------------------------------------------------------------ */

type GastoRecemFeito = {
  amount: number;
  description: string;
  category: string | null;
  categoryId: string | null;
  type: "expense" | "income";
};

/**
 * Chamado logo depois de registrar um gasto, venha ele do Claude ou do site.
 *
 * Nunca deixa o erro subir: se a notificação falhar, o gasto já está guardado
 * e é isso que importa. Um push que não saiu não pode desfazer um lançamento.
 */
export async function avisarSobreOGasto(ctx: Ctx, gasto: GastoRecemFeito): Promise<void> {
  try {
    if (gasto.type !== "expense" || gasto.amount <= 0) return;

    const aviso =
      (await passouDoCombinado(ctx, gasto)) ?? (await foraDoNormal(ctx, gasto));
    if (!aviso) return;

    const liberados = await aindaPodeFalar(ctx.householdId, [aviso]);
    if (!liberados.has(aviso.id)) return;

    const entregues = await mandarRecado(ctx.householdId, {
      titulo: aviso.titulo,
      texto: aviso.texto,
      url: "/extrato",
    });
    if (entregues > 0) await anotarQueFalou(ctx.householdId, aviso.id);
  } catch {
    // Silêncio de propósito: ver o comentário acima.
  }
}

type Aviso = { id: string; nivel: Nivel; titulo: string; texto: string };

/** Este gasto acabou de furar o limite combinado da categoria? */
async function passouDoCombinado(ctx: Ctx, gasto: GastoRecemFeito): Promise<Aviso | null> {
  if (!gasto.categoryId) return null;
  const mes = monthStart(today());

  const { data: limite } = await ctx.db
    .from("budgets")
    .select("limit_amount")
    .eq("household_id", ctx.householdId)
    .eq("category_id", gasto.categoryId)
    .eq("month", mes)
    .maybeSingle();

  if (!limite) return null;
  const teto = num(limite.limit_amount);
  if (teto <= 0) return null;

  const { data: doMes } = await ctx.db
    .from("transactions")
    .select("amount")
    .eq("household_id", ctx.householdId)
    .eq("category_id", gasto.categoryId)
    .eq("type", "expense")
    .gte("date", mes)
    .lt("date", addMonths(mes, 1));

  const gastoNoMes = round2((doMes ?? []).reduce((s, t) => s + num(t.amount), 0));
  const nome = gasto.category ?? "essa categoria";

  if (gastoNoMes > teto) {
    return {
      id: `estourou-${gasto.categoryId}`,
      nivel: "atencao",
      titulo: `Passou do combinado em ${nome}`,
      texto: `Com esses ${formatBRL(gasto.amount)}, ${nome} chegou a ${formatBRL(gastoNoMes)} — o combinado era ${formatBRL(teto)}. Ainda dá para segurar o resto do mês.`,
    };
  }

  // Avisar em 80% dá tempo de reagir; avisar só no estouro é dar notícia velha.
  if (gastoNoMes >= teto * 0.8) {
    return {
      id: `perto-do-limite-${gasto.categoryId}`,
      nivel: "dica",
      titulo: `${nome} está chegando no limite`,
      texto: `Já foram ${formatBRL(gastoNoMes)} dos ${formatBRL(teto)} combinados. Sobram ${formatBRL(round2(teto - gastoNoMes))} até o fim do mês.`,
    };
  }

  return null;
}

/**
 * Este gasto é muito maior do que os dessa categoria costumam ser?
 *
 * Compara com a mediana dos últimos três meses, não com a média: uma única
 * compra grande puxa a média para cima e faz o dindi parar de estranhar
 * justamente o tipo de gasto que ele deveria estranhar.
 */
async function foraDoNormal(ctx: Ctx, gasto: GastoRecemFeito): Promise<Aviso | null> {
  // Abaixo disso não vale acordar ninguém, por mais fora da curva que seja.
  if (gasto.amount < 300) return null;

  const desde = addMonths(monthStart(today()), -3);

  const { data: antigos } = await ctx.db
    .from("transactions")
    .select("amount")
    .eq("household_id", ctx.householdId)
    .eq("type", "expense")
    .gte("date", desde)
    .limit(500);

  const valores = (antigos ?? []).map((t) => num(t.amount)).sort((a, b) => a - b);
  // Com menos de dez gastos não existe "normal" para comparar.
  if (valores.length < 10) return null;

  const mediana = valores[Math.floor(valores.length / 2)];
  if (mediana <= 0 || gasto.amount < mediana * 4) return null;

  return {
    id: "gasto-grande",
    nivel: "atencao",
    titulo: `Gasto grande: ${formatBRL(gasto.amount)}`,
    texto: `${gasto.description} ficou bem acima do que costuma sair por aqui (o normal gira em torno de ${formatBRL(mediana)}). Se foi planejado, ótimo — só não deixe passar batido.`,
  };
}
