import Link from "next/link";
import { Dindi } from "@/components/dindi";
import { Card, Empty, Pill, Progress, SectionTitle } from "@/components/ui";
import { Conselhos } from "@/components/conselhos";
import { Grupos } from "@/components/grupos";
import { pageCtx } from "@/lib/ctx";
import { listTransactions } from "@/lib/db/finance";
import { getRetratoDoMes, montarConselhos } from "@/lib/db/conselhos";
import { formatBRL } from "@/lib/money";
import { formatDateShort, monthLabel, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { session, ctx } = await pageCtx();

  // Um retrato do mês serve as duas coisas: os números da tela e os conselhos.
  const [retrato, extrato] = await Promise.all([
    getRetratoDoMes(ctx),
    listTransactions(ctx, { month: today(), limit: 8 }),
  ]);

  const { metas, saldos, orcamento, agora: grupos } = retrato;
  const conselhos = montarConselhos(retrato);

  const semNada = saldos.accounts.length === 0 && extrato.count === 0 && metas.length === 0;
  const reserva = metas.find((m) => m.kind === "emergencia");
  const sonhos = metas.filter((m) => m.kind === "sonho");

  return (
    <>
      {semNada ? <PrimeiroDia nome={session.displayName} /> : null}

      {/* ---------------- O que o dindi tem a dizer ---------------- */}
      {semNada ? null : <Conselhos itens={conselhos} />}

      {/* ---------------- Reserva de emergência ---------------- */}
      {reserva ? (
        <section className="mb-8">
          <SectionTitle>Nosso colchão</SectionTitle>
          <Card>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="font-semibold">{reserva.name}</h3>
              <span className="tabular text-sm text-suave">{reserva.percent}%</span>
            </div>
            <Progress percent={reserva.percent} tone={reserva.percent >= 100 ? "verde" : "azul"} />
            <p className="mt-2 text-sm text-suave">
              <span className="tabular font-medium text-tinta">
                {formatBRL(reserva.current_amount)}
              </span>{" "}
              de <span className="tabular">{formatBRL(reserva.target_amount)}</span>
              {reserva.percent >= 100
                ? " · seu dindi está protegido de um imprevisto"
                : ` · faltam ${formatBRL(reserva.remaining)} para dormir tranquilo`}
            </p>
          </Card>
        </section>
      ) : null}

      {/* ---------------- Os grupos do mês ---------------- */}
      {semNada ? null : <Grupos grupos={grupos.groups} temRenda={grupos.income > 0} />}

      {/* ---------------- Metas ---------------- */}
      <section className="mb-8">
        <SectionTitle
          action={
            <Link href="/metas" className="text-sm text-suave underline underline-offset-2">
              ver todas
            </Link>
          }
        >
          Nossos sonhos
        </SectionTitle>

        {sonhos.length === 0 ? (
          <Empty>
            Ainda não tem nenhum sonho com nome. Peça pro Claude:{" "}
            <em>&ldquo;quero juntar 12 mil até dezembro para uma viagem&rdquo;</em>.
          </Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sonhos.slice(0, 4).map((m) => (
              <Card key={m.id}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{m.name}</h3>
                  <span className="tabular text-sm text-suave">{m.percent}%</span>
                </div>
                <Progress percent={m.percent} tone={m.percent >= 100 ? "verde" : "roxo"} />
                <p className="mt-2 text-sm text-suave">
                  <span className="tabular font-medium text-tinta">
                    {formatBRL(m.current_amount)}
                  </span>{" "}
                  de <span className="tabular">{formatBRL(m.target_amount)}</span>
                </p>
                {m.monthly_needed ? (
                  <p className="mt-1 text-xs text-suave">
                    Guardando {formatBRL(m.monthly_needed)} por mês você chega lá.
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- Saldos ---------------- */}
      <section className="mb-8">
        <SectionTitle>Onde está o dinheiro</SectionTitle>

        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <Card>
            <p className="text-xs uppercase tracking-wide text-suave">Nas contas</p>
            <p className="tabular mt-1 text-2xl font-bold">
              {formatBRL(saldos.total_in_accounts)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-suave">Nos cartões</p>
            <p className="tabular mt-1 text-2xl font-bold text-vermelhinho">
              {formatBRL(saldos.total_credit_card_debt)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-suave">Sobra de verdade</p>
            <p
              className={`tabular mt-1 text-2xl font-bold ${
                saldos.net_worth < 0 ? "text-vermelhinho" : "text-verdinho"
              }`}
            >
              {formatBRL(saldos.net_worth)}
            </p>
          </Card>
        </div>

        {saldos.accounts.length === 0 ? (
          <Empty>
            Nenhuma conta cadastrada ainda. Peça pro Claude:{" "}
            <em>&ldquo;cria a conta do Nubank com 2 mil de saldo&rdquo;</em>.
          </Empty>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-borda">
              {saldos.accounts.map((a) => (
                <li key={a.account} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{a.account}</span>
                    <Pill tone={a.type === "credit_card" ? "roxo" : "azul"}>
                      {a.type === "credit_card"
                        ? "cartão"
                        : a.type === "savings"
                          ? "poupança"
                          : "conta"}
                    </Pill>
                  </span>
                  <span
                    className={`tabular font-semibold ${
                      a.balance < 0 ? "text-vermelhinho" : ""
                    }`}
                  >
                    {formatBRL(a.balance)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* ---------------- Orçamento ---------------- */}
      {orcamento.budgets.length > 0 ? (
        <section className="mb-8">
          <SectionTitle
            action={
              <Link href="/orcamento" className="text-sm text-suave underline underline-offset-2">
                ver tudo
              </Link>
            }
          >
            Orçamento de {monthLabel(orcamento.month)}
          </SectionTitle>
          <Card>
            <ul className="space-y-4">
              {orcamento.budgets.slice(0, 4).map((b) => (
                <li key={b.category}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{b.category}</span>
                    <span className="tabular text-suave">
                      {formatBRL(b.spent)} de {formatBRL(b.limit_amount)}
                    </span>
                  </div>
                  <Progress
                    percent={b.percent_used}
                    tone={
                      b.status === "estourou" ? "vermelho" : b.status === "atenção" ? "amarelo" : "verde"
                    }
                  />
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      {/* ---------------- Últimos lançamentos ---------------- */}
      <section>
        <SectionTitle
          action={
            <Link href="/extrato" className="text-sm text-suave underline underline-offset-2">
              extrato completo
            </Link>
          }
        >
          O que rolou este mês
        </SectionTitle>

        {extrato.count === 0 ? (
          <Empty>
            Nada lançado em {monthLabel(today())} ainda. Diga pro Claude:{" "}
            <em>&ldquo;gastei 45 reais no mercado&rdquo;</em>.
          </Empty>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-borda">
              {extrato.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.description}</p>
                    <p className="truncate text-xs text-suave">
                      {formatDateShort(t.date)} · {t.account}
                      {t.category ? ` · ${t.category}` : ""}
                      {t.person ? ` · ${t.person}` : ""}
                    </p>
                  </div>
                  <span
                    className={`tabular shrink-0 font-semibold ${
                      t.type === "income" ? "text-verdinho" : ""
                    }`}
                  >
                    {t.type === "income" ? "+" : "−"} {formatBRL(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </>
  );
}

/** Boas-vindas de quem acabou de criar o dindi e ainda não tem nada. */
function PrimeiroDia({ nome }: { nome: string }) {
  return (
    <Card className="mb-8 bg-areia/50">
      <div className="flex items-start gap-4">
        <Dindi size={52} humor="feliz" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">Oi, {nome}!</h1>
          <p className="mt-1 text-sm text-suave">
            Este site é só a vitrine — quem anota tudo é o Claude. Conecte o dindi lá e
            comece dizendo suas contas e seus gastos com palavras normais.
          </p>
          <Link
            href="/conectar"
            className="mt-3 inline-block rounded-lg bg-tinta px-3.5 py-2 text-sm font-medium text-creme transition hover:opacity-90"
          >
            Conectar o Claude
          </Link>
        </div>
      </div>
    </Card>
  );
}
