import { addMonths, monthStart, today } from "@/lib/dates";
import { formatBRL, num, round2 } from "@/lib/money";
import {
  getBalance,
  getBudgetStatus,
  getGoalProgress,
  getSpendingByBucket,
  suggestEmergencyFund,
} from "./finance";
import type { Ctx } from "./types";

/**
 * Os alertas do dindi.
 *
 * A ideia: o site e o Claude não devem só mostrar número — devem cutucar
 * quando algo sai do lugar e ensinar o próximo passo. Cada conselho tem
 * um nível, um título curto e uma frase que explica o porquê em português
 * de gente. Nada de "sua taxa de poupança está em 4%".
 *
 * A voz é sempre com UMA pessoa ("você"). Quando precisa nomear o conjunto,
 * é "o seu dindi" — nunca "a casa" nem "vocês", que deixariam de fora
 * justamente quem usa sozinha, o caso mais comum.
 *
 * Níveis:
 *   urgente  → dinheiro vai faltar, precisa agir agora
 *   atencao  → ainda dá tempo de corrigir este mês
 *   dica     → não tem nada errado, é o próximo passo para melhorar
 *   parabens → deu certo, e é importante dizer isso também
 */
export type Nivel = "urgente" | "atencao" | "dica" | "parabens";

export type Conselho = {
  id: string;
  nivel: Nivel;
  titulo: string;
  texto: string;
  /** O que falar pro Claude para resolver. Vira botão/sugestão na tela. */
  sugestao?: string;
};

const ORDEM: Record<Nivel, number> = { urgente: 0, atencao: 1, dica: 2, parabens: 3 };

/** Que fatia do mês já passou (0 a 1). Serve para projetar o gasto até o dia 31. */
function fracaoDoMes(mes: string): number {
  const inicio = new Date(`${mes}T00:00:00`);
  const hoje = new Date(`${today()}T00:00:00`);
  const diasNoMes = new Date(
    inicio.getUTCFullYear(),
    inicio.getUTCMonth() + 1,
    0
  ).getDate();

  if (hoje < inicio) return 0;
  const diaAtual = hoje.getUTCMonth() === inicio.getUTCMonth() ? hoje.getUTCDate() : diasNoMes;
  return Math.min(diaAtual / diasNoMes, 1);
}

/**
 * Tudo que os conselhos precisam saber sobre o mês, buscado de uma vez só.
 *
 * Fica separado porque a tela inicial mostra esses mesmos números — assim ela
 * busca uma vez e usa para as duas coisas, em vez de perguntar tudo em dobro.
 */
export type RetratoDoMes = Awaited<ReturnType<typeof getRetratoDoMes>>;

export async function getRetratoDoMes(ctx: Ctx, month?: string) {
  const mes = monthStart(month ?? today());
  const mesPassado = addMonths(mes, -1);

  const [agora, antes, saldos, metas, orcamento, reservaIdeal] = await Promise.all([
    getSpendingByBucket(ctx, mes),
    getSpendingByBucket(ctx, mesPassado),
    getBalance(ctx),
    getGoalProgress(ctx),
    getBudgetStatus(ctx, mes),
    suggestEmergencyFund(ctx),
  ]);

  return { mes, agora, antes, saldos, metas, orcamento, reservaIdeal };
}

export async function getConselhos(ctx: Ctx, month?: string): Promise<Conselho[]> {
  return montarConselhos(await getRetratoDoMes(ctx, month));
}

export function montarConselhos(retrato: RetratoDoMes): Conselho[] {
  const { mes, agora, antes, saldos, metas, orcamento, reservaIdeal } = retrato;

  /*
   * Quanto custa viver, mas só quando dá para afirmar isso.
   *
   * O mês corrente está sempre pela metade, então com um único mês de dados a
   * média não significa nada: uma compra de 45 reais virava "você gasta 45 por
   * mês, junte 275". Abaixo de dois meses o dindi prefere não chutar — existe
   * um conselho genérico logo abaixo para esse caso.
   */
  const custoDeVida =
    reservaIdeal && reservaIdeal.months_of_data >= 2 ? reservaIdeal : null;

  const grupo = (b: "fixo" | "dia_a_dia" | "lazer" | "guardar") =>
    agora.groups.find((g) => g.bucket === b)!;

  const fixo = grupo("fixo");
  const lazer = grupo("lazer");
  const guardar = grupo("guardar");

  const out: Conselho[] = [];
  const renda = agora.income;
  const gasto = agora.total_spent;

  // -------------------------------------------------------------------
  // 1. O mês fechou no vermelho
  // -------------------------------------------------------------------
  if (renda > 0 && gasto + agora.saved > renda) {
    const buraco = round2(gasto + agora.saved - renda);
    out.push({
      id: "mes-no-vermelho",
      nivel: "urgente",
      titulo: "Saiu mais do que entrou",
      texto: `Entrou ${formatBRL(renda)} e saiu ${formatBRL(round2(gasto + agora.saved))}. São ${formatBRL(buraco)} a mais do que entrou este mês. O buraco vai sair de algum lugar: da reserva ou do cartão.`,
      sugestao: "onde dá para cortar este mês?",
    });
  }

  // -------------------------------------------------------------------
  // 2. No ritmo atual, o mês não fecha
  // -------------------------------------------------------------------
  const fracao = fracaoDoMes(mes);
  if (renda > 0 && fracao > 0.25 && fracao < 0.95) {
    const projecao = round2(gasto / fracao);
    if (projecao > renda && gasto <= renda) {
      out.push({
        id: "ritmo-perigoso",
        nivel: "atencao",
        titulo: "Nesse ritmo o mês não fecha",
        texto: `Faltando ${Math.round((1 - fracao) * 30)} dias, já saíram ${formatBRL(gasto)}. Mantendo esse ritmo, o mês termina em ${formatBRL(projecao)} — mais do que os ${formatBRL(renda)} que entraram.`,
        sugestao: "quanto posso gastar por dia até o fim do mês?",
      });
    }
  }

  // -------------------------------------------------------------------
  // 3. As contas fixas comem quase tudo
  // -------------------------------------------------------------------
  if (renda > 0 && fixo.total > 0 && fixo.percent >= 55) {
    out.push({
      id: "fixo-pesado",
      nivel: "atencao",
      titulo: "As contas fixas estão pesadas",
      texto: `${fixo.percent}% do que entra já vai embora em contas fixas (${formatBRL(fixo.total)}), e isso é o que não se escolhe no mês. Acima de 50% sobra pouco espaço para respirar. Vale olhar assinatura parada e plano que dá para baixar.`,
      sugestao: "quais contas fixas eu poderia cortar ou renegociar?",
    });
  }

  // -------------------------------------------------------------------
  // 4. Lazer explodiu — o alerta de "comprando além da conta"
  // -------------------------------------------------------------------
  const lazerAntes = antes.groups.find((g) => g.bucket === "lazer")!.total;
  if (renda > 0 && lazer.total > 0 && lazer.percent >= 25) {
    const top = lazer.categories[0];
    out.push({
      id: "lazer-alto",
      nivel: "atencao",
      titulo: "O lazer passou do ponto",
      texto: `${formatBRL(lazer.total)} em lazer, ${lazer.percent}% de tudo que entrou.${top ? ` A maior parte foi em ${top.name} (${formatBRL(top.total)}).` : ""} Lazer é importante, mas acima de 20% ele começa a comer o dinheiro dos seus sonhos.`,
      sugestao: "me ajuda a definir um limite de lazer para o mês que vem",
    });
  } else if (lazerAntes > 0 && lazer.total > lazerAntes * 1.6 && fracao > 0.6) {
    const aMais = round2(lazer.total - lazerAntes);
    out.push({
      id: "lazer-subiu",
      nivel: "atencao",
      titulo: "O lazer subiu bastante",
      texto: `Foram ${formatBRL(aMais)} a mais que no mês passado em lazer. Não é proibido — só vale saber se foi escolha ou se passou batido.`,
      sugestao: "o que mudou no meu lazer em relação ao mês passado?",
    });
  }

  // -------------------------------------------------------------------
  // 5. A fatura do cartão é maior que o dinheiro em conta
  // -------------------------------------------------------------------
  const emConta = num(saldos.total_in_accounts);
  const fatura = num(saldos.total_credit_card_debt);
  if (fatura > 0 && fatura > emConta) {
    out.push({
      id: "fatura-maior-que-conta",
      nivel: "urgente",
      titulo: "A fatura está maior que o dinheiro em conta",
      texto: `Você deve ${formatBRL(fatura)} no cartão e tem ${formatBRL(emConta)} disponível. Se a fatura vencer hoje, não dá para pagar tudo. Pagar só o mínimo é a forma mais cara de dever dinheiro que existe.`,
      sugestao: "monta um plano para eu pagar a fatura inteira",
    });
  }

  // -------------------------------------------------------------------
  // 6. Reserva de emergência — o conselho mais importante do app
  // -------------------------------------------------------------------
  const reserva = metas.find((m) => m.kind === "emergencia");

  if (!reserva && custoDeVida) {
    out.push({
      id: "sem-reserva",
      nivel: "dica",
      titulo: "Ainda não existe uma reserva de emergência",
      texto: `Reserva de emergência é o dinheiro que impede que um pneu furado ou um dente quebrado vire dívida no cartão. Pelo que você gasta para viver (${formatBRL(custoDeVida.monthly_cost)} por mês), o ideal é chegar em ${formatBRL(custoDeVida.ideal)} — seis meses parados. Começar por ${formatBRL(custoDeVida.minimum)} já resolve a maioria dos sustos.`,
      sugestao: `cria minha reserva de emergência de ${formatBRL(custoDeVida.ideal)}`,
    });
  } else if (!reserva) {
    out.push({
      id: "sem-reserva-sem-dados",
      nivel: "dica",
      titulo: "Comece pela reserva de emergência",
      texto: "Antes de qualquer sonho, vem o colchão: um dinheiro parado que cobre uns meses de vida se a renda sumir. Assim um imprevisto não vira dívida. Me conta quanto você gasta por mês que eu calculo o tamanho certo.",
      sugestao: "me ajuda a montar minha reserva de emergência",
    });
  } else if (reserva.percent < 100 && custoDeVida && reserva.target_amount < custoDeVida.minimum) {
    out.push({
      id: "reserva-pequena",
      nivel: "dica",
      titulo: "A reserva está menor do que deveria",
      texto: `A reserva mira ${formatBRL(reserva.target_amount)}, mas viver custa ${formatBRL(custoDeVida.monthly_cost)} por mês. O mínimo saudável seria ${formatBRL(custoDeVida.minimum)} — três meses de tranquilidade.`,
      sugestao: `aumenta minha reserva para ${formatBRL(custoDeVida.minimum)}`,
    });
  } else if (reserva.percent >= 100) {
    out.push({
      id: "reserva-completa",
      nivel: "parabens",
      titulo: "A reserva de emergência está completa",
      texto: `${formatBRL(reserva.current_amount)} guardados. Seu dindi está protegido de um susto — agora todo dinheiro que sobrar pode ir para os sonhos, sem culpa.`,
      sugestao: "qual sonho eu deveria priorizar agora?",
    });
  }

  // -------------------------------------------------------------------
  // 7. Guardar: nada foi para o futuro este mês
  // -------------------------------------------------------------------
  if (renda > 0 && guardar.total === 0 && fracao > 0.7) {
    const sobrou = round2(renda - gasto);
    out.push({
      id: "nao-guardou",
      nivel: sobrou > 0 ? "atencao" : "dica",
      titulo: "Este mês não sobrou nada guardado",
      texto:
        sobrou > 0
          ? `Sobraram ${formatBRL(sobrou)} e nada foi separado. Dinheiro que fica na conta corrente costuma virar gasto sem querer. Guardar primeiro e gastar o resto funciona melhor que o contrário.`
          : "Nada foi guardado este mês. Mesmo um valor pequeno e fixo, separado no dia que o salário cai, faz mais diferença que um valor grande de vez em quando.",
      sugestao: sobrou > 0 ? `guarda ${formatBRL(sobrou)} na minha reserva` : "quanto eu consigo guardar por mês?",
    });
  } else if (renda > 0 && guardar.percent >= 20) {
    out.push({
      id: "guardou-bem",
      nivel: "parabens",
      titulo: "Mês bom: sobrou dinheiro guardado",
      texto: `${formatBRL(guardar.total)} foram para o futuro — ${guardar.percent}% de tudo que entrou. Guardar 20% é a marca que quase ninguém bate.`,
    });
  }

  // -------------------------------------------------------------------
  // 8. Nenhum sonho cadastrado
  // -------------------------------------------------------------------
  const sonhos = metas.filter((m) => m.kind === "sonho");
  if (sonhos.length === 0) {
    out.push({
      id: "sem-sonho",
      nivel: "dica",
      titulo: "Dê nome ao seu sonho",
      texto: "Guardar dinheiro sem motivo é chato e a gente desiste. Guardar para a viagem, a entrada do apê ou a festa é outra história. Me conta o que você quer e até quando, que eu calculo quanto separar por mês.",
      sugestao: "quero juntar para uma viagem",
    });
  }

  // -------------------------------------------------------------------
  // 9. Sonho parado / sonho conquistado
  // -------------------------------------------------------------------
  for (const meta of sonhos) {
    if (meta.percent >= 100) {
      out.push({
        id: `sonho-feito-${meta.id}`,
        nivel: "parabens",
        titulo: `${meta.name}: conquistado!`,
        texto: `Os ${formatBRL(meta.target_amount)} estão juntados. Esse era o plano, e ele foi cumprido.`,
      });
    } else if (meta.monthly_needed && meta.monthly_needed > 0) {
      const guardadoNaMeta = agora.saved_in_goals;
      if (guardadoNaMeta < meta.monthly_needed && fracao > 0.7) {
        out.push({
          id: `sonho-atrasado-${meta.id}`,
          nivel: "atencao",
          titulo: `${meta.name} está atrasando`,
          texto: `Para chegar na data combinada, é preciso separar ${formatBRL(meta.monthly_needed)} por mês. Este mês foram ${formatBRL(guardadoNaMeta)}. Ou o valor aumenta, ou a data anda para frente — as duas respostas valem, contanto que seja escolha.`,
          sugestao: `quanto preciso guardar por mês para ${meta.name}?`,
        });
      }
    }
  }

  // -------------------------------------------------------------------
  // 10. Orçamento estourado
  // -------------------------------------------------------------------
  const estourados = orcamento.budgets.filter((b) => b.percent_used >= 100);
  const quaseLa = orcamento.budgets.filter((b) => b.percent_used >= 80 && b.percent_used < 100);

  if (estourados.length > 0) {
    const nomes = estourados.map((b) => b.category).join(", ");
    out.push({
      id: "orcamento-estourado",
      nivel: "atencao",
      titulo: estourados.length === 1 ? `${nomes} estourou` : "Alguns limites estouraram",
      texto: `O limite combinado para ${nomes} foi ultrapassado. Não é o fim do mundo — mas se estourar todo mês, o limite está errado, não o gasto.`,
      sugestao: `revisa meu limite de ${estourados[0].category}`,
    });
  } else if (quaseLa.length > 0) {
    const nomes = quaseLa.map((b) => b.category).join(", ");
    out.push({
      id: "orcamento-perto",
      nivel: "dica",
      titulo: "Chegando no limite",
      texto: `${nomes} já passou de 80% do combinado para o mês. Ainda dá para segurar.`,
    });
  }

  return out.sort((a, b) => ORDEM[a.nivel] - ORDEM[b.nivel]);
}
