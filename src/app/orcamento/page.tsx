import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, Empty, Pill, Progress, SectionTitle } from "@/components/ui";
import { pageCtx } from "@/lib/ctx";
import { getBudgetStatus } from "@/lib/db/finance";
import { formatBRL } from "@/lib/money";
import { addMonths, monthLabel, monthStart, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Orcamento(props: PageProps<"/orcamento">) {
  const { session, ctx } = await pageCtx();
  const params = await props.searchParams;

  const bruto = typeof params.mes === "string" ? params.mes : today();
  const mes = monthStart(/^\d{4}-\d{2}/.test(bruto) ? `${bruto.slice(0, 7)}-01` : today());

  const status = await getBudgetStatus(ctx, mes);
  const totalLimite = status.budgets.reduce((s, b) => s + b.limit_amount, 0);
  const totalGasto = status.budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <Shell session={session} active="/orcamento">
      <SectionTitle
        action={
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={`/orcamento?mes=${addMonths(mes, -1).slice(0, 7)}`}
              className="rounded-lg border border-borda px-2.5 py-1 transition hover:bg-areia"
            >
              ←
            </Link>
            <Link
              href={`/orcamento?mes=${addMonths(mes, 1).slice(0, 7)}`}
              className="rounded-lg border border-borda px-2.5 py-1 transition hover:bg-areia"
            >
              →
            </Link>
          </div>
        }
      >
        Orçamento de {monthLabel(mes)}
      </SectionTitle>

      {status.budgets.length === 0 ? (
        <Empty>
          Nenhum limite definido para {monthLabel(mes)}. Peça pro Claude:{" "}
          <em>&ldquo;põe um limite de 800 reais por mês em mercado&rdquo;</em>.
        </Empty>
      ) : (
        <>
          <Card className="mb-5">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">No total</p>
              <p className="tabular text-sm text-suave">
                {formatBRL(totalGasto)} de {formatBRL(totalLimite)}
              </p>
            </div>
            <Progress
              percent={totalLimite > 0 ? (totalGasto / totalLimite) * 100 : 0}
              tone={totalGasto > totalLimite ? "vermelho" : "verde"}
            />
          </Card>

          <div className="space-y-3">
            {status.budgets.map((b) => (
              <Card key={b.category}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-semibold">
                    {b.category}
                    {b.status === "estourou" ? (
                      <Pill tone="vermelho">estourou</Pill>
                    ) : b.status === "atenção" ? (
                      <Pill tone="amarelo">quase lá</Pill>
                    ) : null}
                  </h3>
                  <p className="tabular text-sm text-suave">
                    {formatBRL(b.spent)} de {formatBRL(b.limit_amount)}
                  </p>
                </div>
                <Progress
                  percent={b.percent_used}
                  tone={
                    b.status === "estourou"
                      ? "vermelho"
                      : b.status === "atenção"
                        ? "amarelo"
                        : "verde"
                  }
                />
                <p className="mt-2 text-sm text-suave">
                  {b.remaining >= 0 ? (
                    <>
                      Ainda dá pra gastar{" "}
                      <span className="tabular font-medium text-tinta">
                        {formatBRL(b.remaining)}
                      </span>
                      .
                    </>
                  ) : (
                    <>
                      Passou{" "}
                      <span className="tabular font-medium text-vermelhinho">
                        {formatBRL(-b.remaining)}
                      </span>{" "}
                      do combinado.
                    </>
                  )}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}

      {status.categories_without_budget.length > 0 ? (
        <p className="mt-6 text-sm text-suave">
          Sem limite ainda: {status.categories_without_budget.join(", ")}.
        </p>
      ) : null}
    </Shell>
  );
}
