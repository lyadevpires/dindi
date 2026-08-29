import Link from "next/link";
import { Dindi } from "@/components/dindi";
import { Card, Empty, Progress, SectionTitle } from "@/components/ui";
import { Conselhos } from "@/components/conselhos";
import { Grupos } from "@/components/grupos";
import { Anel } from "@/components/anel";
import { DicaDoMais } from "@/components/dica";
import { calcularSaude } from "@/lib/db/saude";
import {
  EntrouSaiu,
  GastoVsCombinado,
  OndeMaisSaiu,
  Saldo,
} from "@/components/resumo";
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
  const saude = calcularSaude(retrato);

  const semNada = saldos.accounts.length === 0 && extrato.count === 0 && metas.length === 0;
  const reserva = metas.find((m) => m.kind === "emergencia");
  const sonhos = metas.filter((m) => m.kind === "sonho");

  // As categorias que mais pesaram no mês, misturando os baldes: quem olha
  // "onde saiu mais" quer ver "mercado", não "dia a dia".
  const maioresGastos = grupos.groups
    .filter((g) => g.bucket !== "guardar")
    .flatMap((g) => g.categories)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <>
      {semNada ? (
        <>
          <PrimeiroDia nome={session.displayName} />
          {/* Só enquanto não existe nada: assim que houver um gasto, ele cala. */}
          <DicaDoMais />
        </>
      ) : null}

      {/* ---------------- A nota, resumida ---------------- */}
      {saude.nota === null ? null : (
        <Link
          href="/saude"
          className="mb-3 flex items-center gap-4 rounded-3xl border border-borda bg-white p-5 shadow-[0_1px_2px_rgba(44,36,32,0.04)] transition hover:bg-areia/30"
        >
          <Anel pilares={saude.pilares} nota={saude.nota} tamanho={92} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Saúde do seu dinheiro</p>
            <p className="justo mt-0.5 text-sm leading-relaxed text-suave">
              {saude.nota >= 8
                ? "Está indo bem. Toque para ver o que sustenta essa nota."
                : saude.nota >= 5
                  ? "Dá para melhorar. Toque para ver o que está puxando para baixo."
                  : "Tem coisa pedindo atenção. Toque para ver o quê."}
            </p>
          </div>
          <span aria-hidden className="shrink-0 text-suave">
            →
          </span>
        </Link>
      )}

      {/* ---------------- O retrato da conta ---------------- */}
      <Saldo
        total={saldos.net_worth}
        emContas={saldos.total_in_accounts}
        noCartao={saldos.total_credit_card_debt}
        contas={saldos.accounts}
      />
      <EntrouSaiu entrou={grupos.income} saiu={grupos.total_spent} />

      {/* ---------------- O que o dindi tem a dizer ---------------- */}
      {semNada ? null : <Conselhos itens={conselhos} />}

      {/* ---------------- Onde mais saiu ---------------- */}
      <OndeMaisSaiu categorias={maioresGastos} />

      {/* ---------------- Gasto x combinado ---------------- */}
      <GastoVsCombinado budgets={orcamento.budgets} />

      {/* ---------------- Reserva de emergência ---------------- */}
      {reserva ? (
        <section className="mb-8">
          <SectionTitle>Seu colchão</SectionTitle>
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
          Seus sonhos
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

/**
 * Boas-vindas de quem acabou de criar o dindi e ainda não tem nada.
 *
 * Sem botão de conectar: o aviso que fica logo acima já é esse convite, e
 * pedir a mesma coisa duas vezes na mesma tela confunde mais do que ajuda.
 */
function PrimeiroDia({ nome }: { nome: string }) {
  return (
    <Card className="mb-8 bg-areia/50">
      <div className="flex items-start gap-4">
        <Dindi size={88} humor="feliz" acena className="shrink-0" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">Oi, {nome}!</h1>
          <p className="mt-1 text-sm text-suave">
            Aqui você vê para onde vai o seu dinheiro. Dá para anotar no botão{" "}
            <strong className="font-medium text-tinta">+</strong> ali embaixo, mas o jeito
            bom mesmo é conectar o Claude e só falar:{" "}
            <em>&ldquo;gastei 45 no mercado&rdquo;</em>.
          </p>
        </div>
      </div>
    </Card>
  );
}
