import Link from "next/link";
import { Card, Empty, Pill, SectionTitle } from "@/components/ui";
import { pageCtx } from "@/lib/ctx";
import { getInvoice, listAccounts } from "@/lib/db/finance";
import { formatBRL } from "@/lib/money";
import { addMonths, formatDate, formatDateShort, monthLabel, monthStart, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ROTULO = { open: "aberta", closed: "fechada", paid: "paga" } as const;
const TOM = { open: "azul", closed: "amarelo", paid: "verde" } as const;

export default async function Cartoes(props: PageProps<"/cartoes">) {
  const { ctx } = await pageCtx();
  const params = await props.searchParams;

  const bruto = typeof params.mes === "string" ? params.mes : today();
  const mes = monthStart(/^\d{4}-\d{2}/.test(bruto) ? `${bruto.slice(0, 7)}-01` : today());

  const contas = await listAccounts(ctx);
  const cartoes = contas.filter((c) => c.tem_credito && !c.archived);

  const faturas = await Promise.all(
    cartoes.map((c) => getInvoice(ctx, c.id, mes).catch(() => null))
  );

  return (
    <>
      <SectionTitle
        action={
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={`/cartoes?mes=${addMonths(mes, -1).slice(0, 7)}`}
              className="rounded-lg border border-borda px-2.5 py-1 transition hover:bg-areia"
            >
              ←
            </Link>
            <Link
              href={`/cartoes?mes=${addMonths(mes, 1).slice(0, 7)}`}
              className="rounded-lg border border-borda px-2.5 py-1 transition hover:bg-areia"
            >
              →
            </Link>
          </div>
        }
      >
        Faturas de {monthLabel(mes)}
      </SectionTitle>

      {cartoes.length === 0 ? (
        <Empty>
          Nenhum cartão cadastrado. Peça pro Claude:{" "}
          <em>&ldquo;cadastra meu cartão Nubank, fecha dia 3 e vence dia 10&rdquo;</em>.
        </Empty>
      ) : (
        <div className="space-y-5">
          {faturas.map((fatura, i) =>
            !fatura ? null : (
              <Card key={cartoes[i].id} className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borda px-5 py-4">
                  <div>
                    <h2 className="flex items-center gap-2 font-semibold">
                      {fatura.card}
                      <Pill tone={TOM[fatura.status]}>{ROTULO[fatura.status]}</Pill>
                    </h2>
                    <p className="mt-0.5 text-xs text-suave">
                      Fecha {formatDateShort(fatura.closing_date)} · vence{" "}
                      {formatDate(fatura.due_date)}
                    </p>
                  </div>
                  <p className="tabular text-2xl font-bold">{formatBRL(fatura.total)}</p>
                </div>

                {fatura.items.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-suave">
                    Nada nesta fatura.
                  </p>
                ) : (
                  <ul className="divide-y divide-borda">
                    {fatura.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-5 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.description}</p>
                          <p className="truncate text-xs text-suave">
                            {formatDateShort(item.date)}
                            {item.category ? ` · ${item.category}` : ""}
                          </p>
                        </div>
                        <span className="tabular shrink-0 font-semibold">
                          {formatBRL(item.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {fatura.status !== "paid" && fatura.total > 0 ? (
                  <p className="border-t border-borda px-5 py-3 text-xs text-suave">
                    Quando pagar, diga pro Claude: <em>&ldquo;paguei a fatura do{" "}
                    {fatura.card}&rdquo;</em>.
                  </p>
                ) : null}
              </Card>
            )
          )}
        </div>
      )}
    </>
  );
}
