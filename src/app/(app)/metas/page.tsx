import { Card, Empty, Pill, Progress, SectionTitle } from "@/components/ui";
import { pageCtx } from "@/lib/ctx";
import { getGoalProgress } from "@/lib/db/finance";
import { formatBRL, num } from "@/lib/money";
import { formatDate, formatDateShort } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Metas() {
  const { session, ctx } = await pageCtx();
  const metas = await getGoalProgress(ctx);

  const { data: aportes } = await ctx.db
    .from("goal_contributions")
    .select("id, goal_id, amount, date, note")
    .eq("household_id", session.householdId)
    .order("date", { ascending: false })
    .limit(60);

  const porMeta = new Map<string, NonNullable<typeof aportes>>();
  for (const a of aportes ?? []) {
    const lista = porMeta.get(a.goal_id) ?? [];
    lista.push(a);
    porMeta.set(a.goal_id, lista);
  }

  const guardado = metas.reduce((s, m) => s + m.current_amount, 0);

  return (
    <>
      <SectionTitle>Seus sonhos</SectionTitle>

      {metas.length === 0 ? (
        <Empty>
          Nenhuma meta ainda. Peça pro Claude:{" "}
          <em>&ldquo;cria uma meta de viagem pro Chile de 12 mil até dezembro&rdquo;</em>.
        </Empty>
      ) : (
        <>
          <Card className="mb-5 bg-roxinho-claro">
            <p className="text-xs uppercase tracking-wide text-suave">Já guardado no total</p>
            <p className="tabular mt-1 text-3xl font-bold text-roxinho">
              {formatBRL(guardado)}
            </p>
          </Card>

          <div className="space-y-4">
            {metas.map((m) => {
              const lista = (porMeta.get(m.id) ?? []).slice(0, 5);
              return (
                <Card key={m.id}>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                      {m.name}
                      {m.kind === "emergencia" ? (
                        <Pill tone="azul">reserva de emergência</Pill>
                      ) : null}
                      {m.percent >= 100 ? <Pill tone="verde">conquistada!</Pill> : null}
                    </h2>
                    <p className="tabular text-sm text-suave">{m.percent}%</p>
                  </div>

                  <Progress
                    percent={m.percent}
                    tone={m.percent >= 100 ? "verde" : m.kind === "emergencia" ? "azul" : "roxo"}
                  />

                  <p className="mt-2 text-sm text-suave">
                    <span className="tabular font-medium text-tinta">
                      {formatBRL(m.current_amount)}
                    </span>{" "}
                    de <span className="tabular">{formatBRL(m.target_amount)}</span>
                    {m.remaining > 0 ? (
                      <> · faltam <span className="tabular">{formatBRL(m.remaining)}</span></>
                    ) : null}
                  </p>

                  {m.target_date ? (
                    <p className="mt-1 text-xs text-suave">
                      Prazo: {formatDate(m.target_date)}
                      {m.monthly_needed
                        ? ` — dá ${formatBRL(m.monthly_needed)} por mês.`
                        : ""}
                    </p>
                  ) : null}

                  {lista.length > 0 ? (
                    <ul className="mt-4 space-y-1.5 border-t border-borda pt-3 text-sm">
                      {lista.map((a) => (
                        <li key={a.id} className="flex justify-between gap-3 text-suave">
                          <span className="truncate">
                            {formatDateShort(a.date)}
                            {a.note ? ` · ${a.note}` : ""}
                          </span>
                          <span className="tabular shrink-0 font-medium text-verdinho">
                            + {formatBRL(num(a.amount))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
