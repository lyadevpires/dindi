import { num, round2 } from "@/lib/money";
import type { RetratoDoMes } from "./conselhos";

/**
 * A saúde do seu dinheiro, de 0 a 10.
 *
 * Uma nota só existe para responder "estou indo bem?" sem precisar ler seis
 * telas. Para isso ela precisa medir coisa de verdade — senão vira enfeite
 * bonito em que ninguém confia, e um número em que ninguém confia é pior que
 * número nenhum.
 *
 * Por isso duas regras:
 *
 *   1. Cada pilar tem uma conta explicada em uma frase, que aparece na tela.
 *      Nada de fórmula secreta.
 *
 *   2. Pilar sem dado suficiente não vira zero — ele sai da conta, e o peso
 *      dele é redistribuído entre os outros. Dar nota baixa para quem acabou
 *      de chegar seria mentir e desanimar de graça.
 */

export type Pilar = {
  id: string;
  nome: string;
  peso: number;
  /** 0 a 10, ou null quando ainda não dá para afirmar nada. */
  nota: number | null;
  /** A frase que explica de onde saiu a nota. */
  porque: string;
};

export type Saude = {
  nota: number | null;
  pilares: Pilar[];
  /** Quantos pilares entraram na conta. */
  medidos: number;
};

/** Uma régua linear entre dois pontos, presa entre 0 e 10. */
function regua(valor: number, zero: number, dez: number): number {
  if (dez === zero) return 0;
  const bruto = ((valor - zero) / (dez - zero)) * 10;
  return Math.max(0, Math.min(10, Math.round(bruto * 10) / 10));
}

export function calcularSaude(retrato: RetratoDoMes): Saude {
  const { agora, saldos, metas, orcamento, reservaIdeal } = retrato;

  const renda = agora.income;
  const emConta = num(saldos.total_in_accounts);
  const fatura = num(saldos.total_credit_card_debt);

  const grupo = (b: "fixo" | "guardar") => agora.groups.find((g) => g.bucket === b)!;

  const pilares: Pilar[] = [
    reservaDeEmergencia(metas, reservaIdeal),
    dividaNoCartao(fatura, emConta, saldos.accounts.length),
    quantoGuarda(renda, grupo("guardar").total),
    pesoDasFixas(renda, grupo("fixo").total),
    orcamentoRespeitado(orcamento.budgets),
  ];

  // Só os pilares com dado entram na média, e o peso dos que ficaram de fora
  // é diluído nos outros — não jogado no lixo nem contado como zero.
  const medidos = pilares.filter((p) => p.nota !== null);
  const pesoTotal = medidos.reduce((s, p) => s + p.peso, 0);

  /*
   * Abaixo de metade do peso medido não existe nota, e sim silêncio.
   *
   * Sem isto, uma conta recém-criada tirava 10: o único ponto mensurável era
   * "não deve nada no cartão" — verdade, mas verdade de quem ainda não tem
   * cartão. Um dez que não quer dizer nada estraga a confiança em todos os
   * outros dez que virão depois.
   */
  const nota =
    pesoTotal >= 50
      ? Math.round((medidos.reduce((s, p) => s + p.nota! * p.peso, 0) / pesoTotal) * 10) / 10
      : null;

  return { nota, pilares, medidos: medidos.length };
}

/* ------------------------------------------------------------------ */

/** 30% — o colchão. Seis meses de custo de vida guardados é nota dez. */
function reservaDeEmergencia(
  metas: RetratoDoMes["metas"],
  ideal: RetratoDoMes["reservaIdeal"]
): Pilar {
  const base = { id: "reserva", nome: "Reserva de emergência", peso: 30 };
  const reserva = metas.find((m) => m.kind === "emergencia");
  const guardado = reserva ? num(reserva.current_amount) : 0;

  // Sem dois meses de histórico não dá para saber quanto custa a sua vida, e
  // sem isso "seis meses de reserva" é um número inventado.
  if (!ideal || ideal.months_of_data < 2) {
    return {
      ...base,
      nota: null,
      porque:
        "Preciso de uns dois meses de gastos para saber quanto custa a sua vida — só então dá para dizer se a reserva está do tamanho certo.",
    };
  }

  const meses = ideal.monthly_cost > 0 ? guardado / ideal.monthly_cost : 0;
  return {
    ...base,
    nota: regua(meses, 0, 6),
    porque:
      guardado <= 0
        ? `Você ainda não tem reserva. O ideal seriam seis meses de vida guardados, ou seja ${brl(ideal.ideal)}.`
        : `Você tem ${brl(guardado)} guardados — cerca de ${meses.toFixed(1).replace(".", ",")} ${meses < 2 ? "mês" : "meses"} de vida. A régua vai até seis meses.`,
  };
}

/** 25% — dever no cartão é o buraco mais caro que existe. */
function dividaNoCartao(fatura: number, emConta: number, contas: number): Pilar {
  const base = { id: "cartao", nome: "Dívida no cartão", peso: 25 };

  // Sem nenhuma conta cadastrada, "não deve nada" é verdade de quem ainda não
  // contou nada — não é mérito, e não pode virar nota dez.
  if (contas === 0) {
    return {
      ...base,
      nota: null,
      porque:
        "Você ainda não cadastrou nenhuma conta ou cartão. Assim que cadastrar, eu passo a olhar o quanto a fatura pesa.",
    };
  }

  if (fatura <= 0) {
    return {
      ...base,
      nota: 10,
      porque: "Você não está devendo nada no cartão. Esse é o lugar certo de estar.",
    };
  }

  // Dever metade do que se tem em conta já é aperto; dever tudo é nota zero.
  const proporcao = emConta > 0 ? fatura / emConta : 2;
  return {
    ...base,
    nota: regua(proporcao, 1, 0),
    porque: `A fatura está em ${brl(fatura)} e você tem ${brl(emConta)} em conta. Quanto mais a fatura chega perto do que você tem, mais perto do sufoco.`,
  };
}

/** 20% — guardar 20% do que entra é a marca que quase ninguém bate. */
function quantoGuarda(renda: number, guardado: number): Pilar {
  const base = { id: "guardar", nome: "Quanto você guarda", peso: 20 };

  if (renda <= 0) {
    return {
      ...base,
      nota: null,
      porque:
        "Ainda não sei quanto entra por mês. Me conta o seu salário que eu passo a medir isso.",
    };
  }

  const fatia = (guardado / renda) * 100;
  return {
    ...base,
    nota: regua(fatia, 0, 20),
    porque:
      guardado <= 0
        ? "Nada foi separado este mês. Guardar primeiro e gastar o resto funciona melhor que o contrário."
        : `Foram ${brl(guardado)} para o futuro, ${Math.round(fatia)}% de tudo que entrou. Guardar 20% é nota dez.`,
  };
}

/** 15% — o que não se escolhe. Acima de 60% da renda, sobra pouco ar. */
function pesoDasFixas(renda: number, fixo: number): Pilar {
  const base = { id: "fixas", nome: "Peso das contas fixas", peso: 15 };

  if (renda <= 0 || fixo <= 0) {
    return {
      ...base,
      nota: null,
      porque:
        "Preciso saber quanto entra e quais são suas contas fixas para medir o quanto elas pesam.",
    };
  }

  const fatia = (fixo / renda) * 100;
  return {
    ...base,
    nota: regua(fatia, 60, 30),
    porque: `${Math.round(fatia)}% do que entra já vai embora em contas fixas (${brl(fixo)}). Até 30% é folgado; acima de 60% quase não sobra escolha.`,
  };
}

/** 10% — combinou um limite e cumpriu? */
function orcamentoRespeitado(budgets: RetratoDoMes["orcamento"]["budgets"]): Pilar {
  const base = { id: "orcamento", nome: "Orçamento respeitado", peso: 10 };

  if (budgets.length === 0) {
    return {
      ...base,
      nota: null,
      porque:
        "Você ainda não combinou nenhum limite. Sem limite combinado não dá para dizer se ele foi respeitado.",
    };
  }

  const dentro = budgets.filter((b) => b.percent_used <= 100).length;
  return {
    ...base,
    nota: regua(dentro / budgets.length, 0, 1),
    porque: `${dentro} de ${budgets.length} limite${budgets.length === 1 ? "" : "s"} respeitado${dentro === 1 ? "" : "s"} este mês.`,
  };
}

/* ------------------------------------------------------------------ */

function brl(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    round2(v)
  );
}
