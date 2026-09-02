import Link from "next/link";
import { Empty, SectionTitle } from "@/components/ui";
import { Balao, HeroSaldo, CardSonho, NovoSonho } from "@/components/inicio";
import { pageCtx } from "@/lib/ctx";
import { listTransactions } from "@/lib/db/finance";
import { getRetratoDoMes } from "@/lib/db/conselhos";
import { formatBRL } from "@/lib/money";
import { formatDateShort, horaAgora, monthLabel, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Uma cor de fundo para o quadradinho da inicial, estável por texto. */
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

export default async function Home() {
  const { session, ctx } = await pageCtx();

  const [retrato, extrato] = await Promise.all([
    getRetratoDoMes(ctx),
    listTransactions(ctx, { month: today(), limit: 6 }),
  ]);

  const { metas, saldos, agora: grupos } = retrato;
  const sonhos = metas.filter((m) => m.kind === "sonho");

  const semNada = saldos.accounts.length === 0 && extrato.count === 0 && metas.length === 0;

  // Quanto saiu hoje — é o que o porquinho comenta no balão.
  const saiuHoje = extrato.transactions
    .filter((t) => t.date === today() && t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  // A frase do balão: nunca inventa ânimo. Mês apertado não vem sorrindo.
  const hora = horaAgora();
  const apertado = grupos.income > 0 && grupos.total_spent > grupos.income;
  const { frase, humor } = semNada
    ? {
        frase: "Vamos começar? Me conta o primeiro gasto que eu cuido do resto.",
        humor: "feliz" as const,
      }
    : apertado
      ? {
          frase: "Este mês já saiu mais do que entrou. Dá uma olhada comigo.",
          humor: "preocupado" as const,
        }
      : saiuHoje > 0
        ? { frase: `Hoje saíram ${formatBRL(saiuHoje)} até agora.`, humor: "atento" as const }
        : hora >= 21
          ? { frase: "Hoje não saiu nada. Dia tranquilo.", humor: "dormindo" as const }
          : { frase: "Hoje ainda não saiu nada.", humor: "feliz" as const };

  return (
    <>
      <Balao nome={session.displayName} frase={frase} humor={humor} />

      <HeroSaldo
        livre={saldos.total_in_accounts}
        entrou={grupos.income}
        saiu={grupos.total_spent}
      />

      {/* ---------------- Seus sonhos ---------------- */}
      <section className="mb-8">
        <SectionTitle
          action={
            <Link href="/metas" className="text-sm font-semibold text-link">
              ver todos
            </Link>
          }
        >
          Seus sonhos
        </SectionTitle>

        {sonhos.length === 0 ? (
          <Empty semDindi>
            Ainda não tem nenhum sonho com nome. Peça pro Claude:{" "}
            <em>&ldquo;quero juntar 12 mil até dezembro para uma viagem&rdquo;</em>.
          </Empty>
        ) : (
          // O padding lateral negativo faz os cards sumirem na borda da tela.
          <div className="-mx-5 overflow-x-auto px-5">
            <div className="flex gap-3 pb-1">
              {sonhos.slice(0, 6).map((m, i) => (
                <CardSonho
                  key={m.id}
                  nome={m.name}
                  atual={m.current_amount}
                  alvo={m.target_amount}
                  percent={m.percent}
                  mensal={m.monthly_needed}
                  cor={i}
                />
              ))}
              <NovoSonho />
            </div>
          </div>
        )}
      </section>

      {/* ---------------- Últimos lançamentos ---------------- */}
      <section>
        <SectionTitle
          action={
            <Link href="/extrato" className="text-sm font-semibold text-link">
              extrato
            </Link>
          }
        >
          Últimos lançamentos
        </SectionTitle>

        {extrato.count === 0 ? (
          <Empty semDindi>
            Nada lançado em {monthLabel(today())} ainda. Diga pro Claude:{" "}
            <em>&ldquo;gastei 45 reais no mercado&rdquo;</em>.
          </Empty>
        ) : (
          <div className="rounded-[22px] bg-white px-4 shadow-[0_2px_10px_-6px_rgba(46,33,28,0.2)]">
            <ul className="divide-y divide-borda">
              {extrato.transactions.map((t) => {
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
                        {t.category ? `${t.category} · ` : ""}
                        {formatDateShort(t.date)}
                      </p>
                    </div>
                    <span
                      className={`tabular fonte-display shrink-0 text-[14.5px] font-bold ${
                        t.type === "income" ? "text-verdinho" : "text-tinta"
                      }`}
                    >
                      {t.type === "income" ? "+" : "−"} {formatBRL(t.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
