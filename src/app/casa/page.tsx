import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, Empty, Pill, SectionTitle } from "@/components/ui";
import { ConviteBotao } from "@/components/convite";
import { revokeConnection } from "./actions";
import { pageCtx } from "@/lib/ctx";
import { listAccounts, listCategories, listRecurringRules } from "@/lib/db/finance";
import { formatBRL } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { allMembers } from "@/lib/db/resolve";

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
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <Pill key={c.id}>
              {c.emoji ? `${c.emoji} ` : ""}
              {c.name}
            </Pill>
          ))}
        </div>
        <p className="mt-3 text-sm text-suave">
          O Claude cria categoria nova sozinho quando você fala de algo diferente.
        </p>
      </section>
    </Shell>
  );
}
