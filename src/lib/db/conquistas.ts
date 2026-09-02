import { addMonths, monthStart, today } from "@/lib/dates";
import { num } from "@/lib/money";
import { getBalance, getGoalProgress, getSpendingByBucket, suggestEmergencyFund } from "./finance";
import { allAccounts } from "./resolve";
import type { Ctx } from "./types";

/**
 * As conquistas do dindi.
 *
 * A ideia veio do Duolingo, mas a mecânica dele não serve aqui inteira.
 * Sequência diária e ponto por lançamento premiariam **digitar**, não gastar
 * melhor — e criariam culpa por não abrir o app num dia em que não houve
 * gasto nenhum, que é justamente um bom dia.
 *
 * Então toda conquista aqui é ligada a dinheiro de verdade: reserva que
 * cresce, mês que fecha no azul, meta batida, cartão sem dívida. São coisas
 * que a pessoa não consegue "fazer para o app ver" — ela só ganha quando a
 * vida financeira dela melhora de fato.
 *
 * Só entram meses já fechados. O mês corrente ainda pode virar do avesso no
 * dia 30, e conquista que é dada e depois tirada não vale nada.
 */

export type Conquista = {
  id: string;
  grupo: string;
  titulo: string;
  texto: string;
  conquistada: boolean;
  /** 0 a 100, quando faz sentido mostrar o quanto falta. */
  progresso?: number;
};

const MESES_OLHADOS = 6;

export async function calcularConquistas(ctx: Ctx): Promise<{
  conquistas: Conquista[];
  ganhas: number;
  total: number;
}> {
  const mesAtual = monthStart(today());

  // Os meses já fechados, do mais recente para o mais antigo.
  const mesesFechados = Array.from({ length: MESES_OLHADOS }, (_, i) =>
    addMonths(mesAtual, -(i + 1))
  );

  const [contas, metas, saldos, custo, fechados, agora] = await Promise.all([
    allAccounts(ctx),
    getGoalProgress(ctx),
    getBalance(ctx),
    suggestEmergencyFund(ctx),
    Promise.all(mesesFechados.map((m) => getSpendingByBucket(ctx, m))),
    getSpendingByBucket(ctx, mesAtual),
  ]);

  const { count: lancamentos } = await ctx.db
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("household_id", ctx.householdId);

  const { count: conexoes } = await ctx.db
    .from("oauth_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .eq("token_type", "access")
    .eq("revoked", false);

  /* ---------------- reserva ---------------- */
  const reserva = metas.find((m) => m.kind === "emergencia");
  const guardado = reserva ? num(reserva.current_amount) : 0;
  const porMes = custo?.monthly_cost ?? 0;
  const mesesDeReserva = porMes > 0 ? guardado / porMes : 0;

  /* ---------------- hábito, mês a mês ---------------- */
  // Fechou no azul = entrou mais do que saiu, contando o que foi guardado.
  const azul = fechados.map((f) => f.income > 0 && f.income > f.total_spent + f.saved);
  const guardou = fechados.map((f) => f.saved > 0);

  const seguidos = (lista: boolean[]) => {
    let n = 0;
    for (const v of lista) {
      if (!v) break;
      n++;
    }
    return n;
  };

  const azuisSeguidos = seguidos(azul);
  const guardouSeguidos = seguidos(guardou);

  /* ---------------- sonhos e cartão ---------------- */
  const sonhos = metas.filter((m) => m.kind === "sonho");
  const temCartao = contas.some((c) => c.tem_credito && !c.archived);
  const fatura = num(saldos.total_credit_card_debt);

  const c = (x: Conquista) => x;
  const conquistas: Conquista[] = [
    c({
      id: "primeira-conta",
      grupo: "O começo",
      titulo: "Onde o dinheiro mora",
      texto: "Você cadastrou sua primeira conta. Sem isso o dindi não sabe de onde as coisas saem.",
      conquistada: contas.length > 0,
    }),
    c({
      id: "primeiro-gasto",
      grupo: "O começo",
      titulo: "O primeiro anotado",
      texto: "O gasto mais difícil de anotar é o primeiro. Depois vira hábito.",
      conquistada: (lancamentos ?? 0) > 0,
    }),
    c({
      id: "claude-conectado",
      grupo: "O começo",
      titulo: "Conversa ligada",
      texto: "Com o Claude conectado, anotar vira falar. É aqui que o dindi fica fácil de usar todo dia.",
      conquistada: (conexoes ?? 0) > 0,
    }),

    c({
      id: "reserva-criada",
      grupo: "A reserva",
      titulo: "O colchão existe",
      texto: "Você deu nome à sua reserva de emergência. Antes de qualquer sonho, vem ela.",
      conquistada: Boolean(reserva),
    }),
    c({
      id: "reserva-1-mes",
      grupo: "A reserva",
      titulo: "Um mês de paz",
      texto: "Sua reserva já cobre um mês inteiro da sua vida. Um susto pequeno não vira dívida.",
      conquistada: mesesDeReserva >= 1,
      progresso: porMes > 0 ? Math.min(100, Math.round(mesesDeReserva * 100)) : undefined,
    }),
    c({
      id: "reserva-3-meses",
      grupo: "A reserva",
      titulo: "Três meses de chão",
      texto: "É o mínimo que os manuais pedem — e o ponto em que perder a renda deixa de ser desespero.",
      conquistada: mesesDeReserva >= 3,
      progresso: porMes > 0 ? Math.min(100, Math.round((mesesDeReserva / 3) * 100)) : undefined,
    }),
    c({
      id: "reserva-6-meses",
      grupo: "A reserva",
      titulo: "Reserva completa",
      texto: "Seis meses guardados. Daqui pra frente, tudo que sobrar pode ir para os sonhos sem culpa.",
      conquistada: mesesDeReserva >= 6,
      progresso: porMes > 0 ? Math.min(100, Math.round((mesesDeReserva / 6) * 100)) : undefined,
    }),

    c({
      id: "guardou-um-mes",
      grupo: "O hábito",
      titulo: "Sobrou e ficou",
      texto: "Você fechou um mês tendo guardado alguma coisa. Qualquer valor conta.",
      conquistada: guardou.some(Boolean),
    }),
    c({
      id: "guardou-tres-seguidos",
      grupo: "O hábito",
      titulo: "Três meses seguidos guardando",
      texto: "Guardar uma vez é sorte. Três meses seguidos é hábito — e hábito é o que constrói.",
      conquistada: guardouSeguidos >= 3,
      progresso: Math.min(100, Math.round((guardouSeguidos / 3) * 100)),
    }),
    c({
      id: "mes-no-azul",
      grupo: "O hábito",
      titulo: "Mês fechado no azul",
      texto: "Entrou mais do que saiu num mês inteiro. Parece pouco; é o jogo todo.",
      conquistada: azul.some(Boolean),
    }),
    c({
      id: "tres-meses-no-azul",
      grupo: "O hábito",
      titulo: "Três meses no azul",
      texto: "Três meses seguidos fechando positivo. É assim que a diferença aparece daqui a um ano.",
      conquistada: azuisSeguidos >= 3,
      progresso: Math.min(100, Math.round((azuisSeguidos / 3) * 100)),
    }),

    c({
      id: "primeiro-sonho",
      grupo: "Os sonhos",
      titulo: "Um sonho com nome",
      texto: "Guardar sem motivo é chato e a gente desiste. Guardar para algo com nome é outra história.",
      conquistada: sonhos.length > 0,
    }),
    c({
      id: "sonho-batido",
      grupo: "Os sonhos",
      titulo: "Sonho conquistado",
      texto: "Você chegou nos 100% de uma meta. Era um plano, e ele foi cumprido.",
      conquistada: sonhos.some((m) => m.percent >= 100),
    }),

    c({
      id: "cartao-limpo",
      grupo: "O cartão",
      titulo: "Cartão sem dívida",
      texto: "Nenhuma fatura em aberto pesando. É o lugar mais caro para dever dinheiro, e você não está lá.",
      conquistada: temCartao && fatura <= 0 && agora.total_spent > 0,
    }),
  ];

  return {
    conquistas,
    ganhas: conquistas.filter((x) => x.conquistada).length,
    total: conquistas.length,
  };
}
