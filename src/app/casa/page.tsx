import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, Empty, Pill, SectionTitle } from "@/components/ui";
import { ConviteBotao } from "@/components/convite";
import { renameHousehold, revokeConnection } from "./actions";
import { pageCtx } from "@/lib/ctx";
import { listAccounts, listCategories, listRecurringRules } from "@/lib/db/finance";
import { formatBRL } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { allMembers } from "@/lib/db/resolve";
import { BUCKET_HINT, BUCKET_LABEL } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const TIPO = { checking: "conta corrente", savings: "poupança", credit_card: "cartão de crédito" };

export default async function Casa() {
  const { session, ctx } = await pageCtx();

  const [membros, contas, categorias, recorrencias] = await Promise.all([
    allMembers(ctx),
    listAccounts(ctx),
    listCategories(ctx),
    listRecurringRules(ctx),
  ]);

  const { data: tokens } = await ctx.db
    .from("oauth_tokens")
    .select("client_id, created_at, last_used_at, oauth_clients(client_name)")
    .eq("user_id", session.userId)
    .eq("token_type", "access")
    .eq("revoked", false)
    .order("created_at", { ascending: false });

  // Um app pode ter vários tokens; mostra uma linha por app.
  const conexoes = new Map<string, { nome: string; desde: string; usado: string | null }>();
  for (const t of tokens ?? []) {
    if (conexoes.has(t.client_id)) continue;
    const cliente = t.oauth_clients as unknown as { client_name: string | null } | null;
    conexoes.set(t.client_id, {
      nome: cliente?.client_name || "Claude",
      desde: t.created_at,
      usado: t.last_used_at,
    });
  }

  return (
    <Shell session={session} active="/casa">
      {/* ---------------- Quem mora aqui ---------------- */}
      <section className="mb-8">
        <SectionTitle>Quem mora na {session.householdName}</SectionTitle>
        <Card className="p-0">
          <ul className="divide-y divide-borda">
            {membros.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <span className="font-medium">{m.display_name}</span>
                <Pill tone={m.role === "owner" ? "roxo" : "neutro"}>
                  {m.role === "owner" ? "dona da casa" : "par"}
                </Pill>
              </li>
            ))}
          </ul>
        </Card>

        <form action={renameHousehold} className="mt-3 flex items-center gap-2">
          <input
            name="household_name"
            defaultValue={session.householdName}
            maxLength={60}
            aria-label="Nome da casa"
            className="min-w-0 flex-1 rounded-xl border border-borda bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-tinta"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl border border-borda px-3.5 py-2.5 text-sm text-suave transition hover:bg-areia"
          >
            Trocar o nome
          </button>
        </form>

        {membros.length < 2 ? (
          <div className="mt-3">
            <ConviteBotao />
          </div>
        ) : null}
      </section>

      {/* ---------------- Contas ---------------- */}
      <section className="mb-8">
        <SectionTitle>Contas e cartões</SectionTitle>
        {contas.length === 0 ? (
          <Empty>
            Peça pro Claude cadastrar suas contas:{" "}
            <em>&ldquo;minha conta do Itaú tem 3 mil&rdquo;</em>.
          </Empty>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-borda">
              {contas.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {c.name}
                      {c.archived ? " (arquivada)" : ""}
                    </p>
                    <p className="text-xs text-suave">
                      {TIPO[c.type]} · {c.owner ?? "conjunta"}
                      {c.type === "credit_card" && c.closing_day
                        ? ` · fecha dia ${c.closing_day}, vence dia ${c.due_day}`
                        : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* ---------------- Recorrências ---------------- */}
      <section className="mb-8">
        <SectionTitle>Todo mês, no automático</SectionTitle>
        {recorrencias.length === 0 ? (
          <Empty>
            Nada automático ainda. Peça pro Claude:{" "}
            <em>&ldquo;todo dia 5 sai 2.400 de aluguel&rdquo;</em>.
          </Empty>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-borda">
              {recorrencias.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.description}</p>
                    <p className="text-xs text-suave">
                      dia {r.day_of_month} · {r.account}
                      {r.category ? ` · ${r.category}` : ""}
                      {r.end_date ? ` · até ${formatDate(r.end_date)}` : ""}
                    </p>
                  </div>
                  <span
                    className={`tabular shrink-0 font-semibold ${
                      r.type === "income" ? "text-verdinho" : ""
                    }`}
                  >
                    {r.type === "income" ? "+" : "−"} {formatBRL(r.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* ---------------- Conexões ---------------- */}
      <section className="mb-8">
        <SectionTitle
          action={
            <Link href="/conectar" className="text-sm text-suave underline underline-offset-2">
              como conectar
            </Link>
          }
        >
          Apps conectados
        </SectionTitle>

        {conexoes.size === 0 ? (
          <Empty>
            Nenhum app conectado ainda.{" "}
            <Link href="/conectar" className="underline underline-offset-2">
              Conectar o Claude
            </Link>
            .
          </Empty>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-borda">
              {[...conexoes.entries()].map(([clientId, c]) => (
                <li key={clientId} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.nome}</p>
                    <p className="text-xs text-suave">
                      conectado em {formatDate(c.desde.slice(0, 10))}
                      {c.usado ? ` · usado por último em ${formatDate(c.usado.slice(0, 10))}` : ""}
                    </p>
                  </div>
                  <form action={revokeConnection}>
                    <input type="hidden" name="client_id" value={clientId} />
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm text-vermelhinho transition hover:bg-vermelhinho-claro"
                    >
                      Desconectar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* ---------------- Categorias ---------------- */}
      <section>
        <SectionTitle>Categorias</SectionTitle>
        <div className="space-y-4">
          {(["fixo", "dia_a_dia", "lazer", "guardar", "receita"] as const).map((b) => {
            const doGrupo = categorias.filter((c) => c.bucket === b);
            if (doGrupo.length === 0) return null;
            return (
              <div key={b}>
                <p className="mb-2 text-sm font-medium">
                  {BUCKET_LABEL[b]}{" "}
                  <span className="font-normal text-suave">— {BUCKET_HINT[b]}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {doGrupo.map((c) => (
                    <Pill key={c.id}>
                      {c.emoji ? `${c.emoji} ` : ""}
                      {c.name}
                    </Pill>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-suave">
          O Claude cria categoria nova sozinho quando você fala de algo diferente. Se alguma
          estiver no grupo errado, é só falar: <em>&ldquo;academia é conta fixa pra mim&rdquo;</em>.
        </p>
      </section>
    </Shell>
  );
}
