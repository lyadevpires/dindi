import Link from "next/link";
import { Empty } from "@/components/ui";
import { FormApagarLancamento } from "@/components/apagar";
import { GraficoPorDia, ChipsCategoria, ResumoMes } from "@/components/extrato";
import { pageCtx } from "@/lib/ctx";
import { listTransactions } from "@/lib/db/finance";
import { formatBRL } from "@/lib/money";
import { addMonths, formatDate, monthLabel, monthStart, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

const CORES_INICIAL = [
  { bg: "#FBE3DE", fg: "#C2705F" },
  { bg: "#DDF0E5", fg: "#17915C" },
  { bg: "#E4EDFD", fg: "#2F5AA8" },
  { bg: "#FDEFD6", fg: "#B98B2A" },
  { bg: "#EDE7F5", fg: "#7B62C9" },
];
function corDaInicial(texto: string) {
  let soma = 0;
  for (let i = 0; i < texto.length; i++) soma += texto.charCodeAt(i);
  return CORES_INICIAL[soma % CORES_INICIAL.length];
}

/** "setembro de 2026" -> "Setembro 2026". */
function tituloMes(mes: string): string {
  const rotulo = monthLabel(mes).replace(" de ", " ");
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

export default async function Extrato(props: PageProps<"/extrato">) {
  const { ctx } = await pageCtx();
  const params = await props.searchParams;

  const bruto = typeof params.mes === "string" ? params.mes : today();
  const mes = monthStart(/^\d{4}-\d{2}/.test(bruto) ? `${bruto.slice(0, 7)}-01` : today());
  const categoria = typeof params.categoria === "string" ? params.categoria : null;

  const extrato = await listTransactions(ctx, { month: mes, limit: 500 });
  const saldoDoMes = extrato.total_income - extrato.total_expense;

  // Gasto por dia do mês, para o gráfico (sempre o mês inteiro, sem filtro).
  const ano = Number(mes.slice(0, 4));
  const numMes = Number(mes.slice(5, 7));
  const diasNoMes = new Date(ano, numMes, 0).getDate();
  const gastoPorDia = new Map<number, number>();
  for (const t of extrato.transactions) {
    if (t.type !== "expense") continue;
    const dia = Number(t.date.slice(8, 10));
    gastoPorDia.set(dia, (gastoPorDia.get(dia) ?? 0) + t.amount);
  }
  const dias = Array.from({ length: diasNoMes }, (_, i) => ({
    dia: i + 1,
    total: gastoPorDia.get(i + 1) ?? 0,
  }));

  // Categorias presentes no mês, para os chips.
  const categorias = [
    ...new Set(extrato.transactions.map((t) => t.category).filter((c): c is string => !!c)),
  ].sort();

  // A lista respeita o chip escolhido; o resto da tela, não.
  const lista = categoria
    ? extrato.transactions.filter((t) => t.category === categoria)
    : extrato.transactions;

  const porDia = new Map<string, typeof lista>();
  for (const t of lista) {
    const l = porDia.get(t.date) ?? [];
    l.push(t);
    porDia.set(t.date, l);
  }

  const ehMesAtual = mes.slice(0, 7) === today().slice(0, 7);
  const linkMes = (m: string, cat: string | null) =>
    `/extrato?mes=${m.slice(0, 7)}${cat ? `&categoria=${encodeURIComponent(cat)}` : ""}`;

  return (
    <>
      {/* ---------------- Navegação de mês ---------------- */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="fonte-display text-[15px] font-bold">{tituloMes(mes)}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={linkMes(addMonths(mes, -1), categoria)}
            aria-label="Mês anterior"
            className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-tinta text-white transition active:scale-95"
          >
            ←
          </Link>
          {ehMesAtual ? (
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-[11px] text-[#C7B7AC]"
            >
              →
            </span>
          ) : (
            <Link
              href={linkMes(addMonths(mes, 1), categoria)}
              aria-label="Próximo mês"
              className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-tinta text-white transition active:scale-95"
            >
              →
            </Link>
          )}
        </div>
      </div>

      <ResumoMes entrou={extrato.total_income} saiu={extrato.total_expense} sobrou={saldoDoMes} />

      {extrato.count === 0 ? (
        <Empty>Nenhum lançamento em {monthLabel(mes)}.</Empty>
      ) : (
        <div className="space-y-4">
          <GraficoPorDia dias={dias} />

          {categorias.length > 0 ? (
            <ChipsCategoria
              categorias={categorias}
              ativa={categoria}
              href={(c) => linkMes(mes, c)}
            />
          ) : null}

          {/* ---------------- Lista por dia ---------------- */}
          <div className="space-y-4">
            {[...porDia.entries()].map(([dia, itens]) => {
              const totalDia = itens.reduce(
                (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
                0
              );
              return (
                <div key={dia}>
                  <div className="mb-1.5 flex items-baseline justify-between px-1">
                    <p className="fonte-display text-[12.5px] font-bold text-suave">
                      {formatDate(dia)}
                    </p>
                    <p className="tabular text-[12px] font-semibold text-fraco">
                      {totalDia < 0 ? "−" : "+"} {formatBRL(Math.abs(totalDia))}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white px-4 shadow-[0_2px_10px_-6px_rgba(46,33,28,0.2)]">
                    <ul className="divide-y divide-borda">
                      {itens.map((t) => {
                        const cor = corDaInicial(t.description);
                        return (
                          <li key={t.id} className="flex items-center gap-3 py-3">
                            <span
                              className="fonte-display flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[13px] text-sm font-bold"
                              style={{ background: cor.bg, color: cor.fg }}
                            >
                              {t.description.trim().charAt(0).toUpperCase() || "?"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{t.description}</p>
                              <p className="truncate text-[11.5px] text-fraco">
                                {t.account}
                                {t.category ? ` · ${t.category}` : ""}
                                {t.person ? ` · ${t.person}` : ""}
                                {t.installment ? ` · ${t.installment}` : ""}
                              </p>
                            </div>
                            <span className="flex shrink-0 items-center gap-2">
                              <span
                                className={`tabular fonte-display text-[14.5px] font-bold ${
                                  t.type === "income" ? "text-verdinho" : "text-tinta"
                                }`}
                              >
                                {t.type === "income" ? "+" : "−"} {formatBRL(t.amount)}
                              </span>
                              <FormApagarLancamento id={t.id} descricao={t.description} />
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
