import Link from "next/link";
import { Card, Empty, SectionTitle } from "@/components/ui";
import { FormApagarLancamento } from "@/components/apagar";
import { pageCtx } from "@/lib/ctx";
import { listTransactions } from "@/lib/db/finance";
import { formatBRL } from "@/lib/money";
import { addMonths, formatDate, monthLabel, monthStart, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Extrato(props: PageProps<"/extrato">) {
  const { ctx } = await pageCtx();
  const params = await props.searchParams;

  const bruto = typeof params.mes === "string" ? params.mes : today();
  const mes = monthStart(/^\d{4}-\d{2}/.test(bruto) ? `${bruto.slice(0, 7)}-01` : today());

  const extrato = await listTransactions(ctx, { month: mes, limit: 500 });
  const saldoDoMes = extrato.total_income - extrato.total_expense;

  // Agrupa por dia para ficar fácil de ler.
  const porDia = new Map<string, typeof extrato.transactions>();
  for (const t of extrato.transactions) {
    const lista = porDia.get(t.date) ?? [];
    lista.push(t);
    porDia.set(t.date, lista);
  }

  return (
    <>
      <SectionTitle
        action={
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={`/extrato?mes=${addMonths(mes, -1).slice(0, 7)}`}
              className="rounded-lg border border-borda px-2.5 py-1 transition hover:bg-areia"
            >
              ←
            </Link>
            <Link
              href={`/extrato?mes=${addMonths(mes, 1).slice(0, 7)}`}
              className="rounded-lg border border-borda px-2.5 py-1 transition hover:bg-areia"
            >
              →
            </Link>
          </div>
        }
      >
        Extrato de {monthLabel(mes)}
      </SectionTitle>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-suave">Entrou</p>
          <p className="tabular mt-1 text-xl font-bold text-verdinho">
            {formatBRL(extrato.total_income)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-suave">Saiu</p>
          <p className="tabular mt-1 text-xl font-bold text-vermelhinho">
            {formatBRL(extrato.total_expense)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-suave">Diferença</p>
          <p
            className={`tabular mt-1 text-xl font-bold ${
              saldoDoMes < 0 ? "text-vermelhinho" : "text-verdinho"
            }`}
          >
            {formatBRL(saldoDoMes)}
          </p>
        </Card>
      </div>

      {extrato.count === 0 ? (
        <Empty>Nenhum lançamento em {monthLabel(mes)}.</Empty>
      ) : (
        <div className="space-y-4">
          {[...porDia.entries()].map(([dia, itens]) => (
            <div key={dia}>
              <p className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-suave">
                {formatDate(dia)}
              </p>
              <Card className="p-0">
                <ul className="divide-y divide-borda">
                  {itens.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.description}</p>
                        <p className="truncate text-xs text-suave">
                          {t.account}
                          {t.category ? ` · ${t.category}` : ""}
                          {t.person ? ` · ${t.person}` : ""}
                          {t.installment ? ` · ${t.installment}` : ""}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1">
                        <span
                          className={`tabular font-semibold ${
                            t.type === "income" ? "text-verdinho" : ""
                          }`}
                        >
                          {t.type === "income" ? "+" : "−"} {formatBRL(t.amount)}
                        </span>
                        <FormApagarLancamento id={t.id} descricao={t.description} />
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
