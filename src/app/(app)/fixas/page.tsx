import { Card, Empty, Pill, SectionTitle } from "@/components/ui";
import { PararFixa } from "@/components/fixas";
import { pageCtx } from "@/lib/ctx";
import { listRecurringRules, listTransactions, parcelasEmAberto } from "@/lib/db/finance";
import { formatBRL, round2 } from "@/lib/money";
import { formatDate, monthLabel, monthStart, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * As contas que chegam todo mês.
 *
 * Elas existiam no banco desde o começo, mas só apareciam como um total na
 * tela inicial ("Contas fixas: R$ 1.250") e como uma listinha perdida em
 * Ajustes. Faltava a pergunta que se faz de verdade no dia 10: o que já saiu
 * e o que ainda falta sair este mês.
 */
export default async function Fixas() {
  const { ctx } = await pageCtx();
  const mes = monthStart(today());
  const diaDeHoje = Number(today().slice(8, 10));

  const [regras, doMes, parcelas] = await Promise.all([
    listRecurringRules(ctx),
    listTransactions(ctx, { month: mes, limit: 500 }),
    parcelasEmAberto(ctx, 6),
  ]);

  // Uma linha por compra parcelada, e não uma por parcela: o que interessa é
  // "a geladeira ainda tem 7 parcelas", não ver as sete separadas.
  const compras = new Map<
    string,
    { descricao: string; conta: string; restam: number; valor: number; ate: string }
  >();
  for (const p of parcelas.parcelas) {
    const nome = p.description.replace(/\s*\(\d+\/\d+\)\s*$/, "");
    const atual = compras.get(p.purchase_id);
    compras.set(p.purchase_id, {
      descricao: nome,
      conta: p.account,
      valor: p.amount,
      restam: (atual?.restam ?? 0) + 1,
      ate: p.date,
    });
  }

  const saidas = regras.filter((r) => r.type === "expense");
  const entradas = regras.filter((r) => r.type === "income");

  const totalPorMes = round2(saidas.reduce((s, r) => s + r.amount, 0));
  const jaCaiu = saidas.filter((r) => r.day_of_month <= diaDeHoje);
  const aindaVem = saidas.filter((r) => r.day_of_month > diaDeHoje);
  const falta = round2(aindaVem.reduce((s, r) => s + r.amount, 0));

  // Uma regra vira lançamento quando a rotina diária passa. Se ainda não tem
  // lançamento dela neste mês, ela está só agendada.
  const lancadasEsteMes = new Set(
    doMes.transactions
      .map((t) => t.recurring_rule_id)
      .filter((id): id is string => Boolean(id))
  );

  return (
    <>
      <SectionTitle>O que chega todo mês</SectionTitle>

      {saidas.length === 0 && entradas.length === 0 ? (
        <Empty>
          Nenhuma conta fixa ainda. Toque no <strong className="font-medium">+</strong> e
          marque <em>&ldquo;isso se repete todo mês&rdquo;</em>, ou peça pro Claude:{" "}
          <em>&ldquo;todo dia 5 sai 2.400 de aluguel&rdquo;</em>.
        </Empty>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <Card>
              <p className="text-xs uppercase tracking-wide text-suave">Todo mês sai</p>
              <p className="tabular mt-1 text-2xl font-bold">{formatBRL(totalPorMes)}</p>
              <p className="mt-1 text-xs text-suave">
                em {saidas.length} conta{saidas.length === 1 ? "" : "s"} fixa
                {saidas.length === 1 ? "" : "s"}
              </p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wide text-suave">Ainda falta este mês</p>
              <p className="tabular mt-1 text-2xl font-bold">{formatBRL(falta)}</p>
              <p className="mt-1 text-xs text-suave">
                {aindaVem.length === 0
                  ? "tudo que era do mês já saiu"
                  : `em ${aindaVem.length} conta${aindaVem.length === 1 ? "" : "s"} até o fim do mês`}
              </p>
            </Card>
          </div>

          {aindaVem.length > 0 ? (
            <Secao titulo="Ainda vem" regras={aindaVem} lancadas={lancadasEsteMes} />
          ) : null}
          {jaCaiu.length > 0 ? (
            <Secao titulo="Já passou o dia" regras={jaCaiu} lancadas={lancadasEsteMes} />
          ) : null}
          {entradas.length > 0 ? (
            <Secao titulo="Entra todo mês" regras={entradas} lancadas={lancadasEsteMes} />
          ) : null}
        </>
      )}

      {/* ---------------- Parcelas ---------------- */}
      {compras.size > 0 ? (
        <section className="mt-10 border-t border-borda pt-8">
          <SectionTitle>Parcelas ainda rodando</SectionTitle>

          <Card className="mb-4">
            <p className="text-xs uppercase tracking-wide text-suave">
              Já comprometido daqui pra frente
            </p>
            <p className="tabular mt-1 text-2xl font-bold">{formatBRL(parcelas.total)}</p>
            <p className="justo mt-2 text-sm leading-relaxed text-suave">
              Isso é o que já está gasto nos próximos meses antes de você gastar
              qualquer coisa. Cada parcela sozinha é pequena; somadas, elas mandam no
              seu mês.
            </p>

            <ul className="mt-4 space-y-2">
              {parcelas.por_mes.map((m) => (
                <li key={m.month} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-suave">{monthLabel(m.month)}</span>
                  <span className="tabular font-semibold">{formatBRL(m.total)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-0">
            <ul className="divide-y divide-borda">
              {[...compras.entries()].map(([id, c]) => (
                <li key={id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.descricao}</p>
                    <p className="truncate text-xs text-suave">
                      {c.conta} · faltam {c.restam} · última em {formatDate(c.ate)}
                    </p>
                  </div>
                  <span className="tabular shrink-0 font-semibold">
                    {formatBRL(c.valor)}
                    <span className="font-normal text-suave">/mês</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <p className="justo mt-6 text-sm leading-relaxed text-suave">
        Eu lanço cada conta fixa sozinho no dia certo. Se o valor mudar, é só me contar —
        ou parar essa e cadastrar de novo com o valor novo.
      </p>
    </>
  );
}

type Regra = Awaited<ReturnType<typeof listRecurringRules>>[number];

function Secao({
  titulo,
  regras,
  lancadas,
}: {
  titulo: string;
  regras: Regra[];
  lancadas: Set<string>;
}) {
  return (
    <section className="mb-6">
      <SectionTitle>{titulo}</SectionTitle>
      <Card className="p-0">
        <ul className="divide-y divide-borda">
          {regras.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{r.description}</span>
                  {lancadas.has(r.id) ? (
                    <Pill tone="verde">lançado</Pill>
                  ) : (
                    <Pill>dia {r.day_of_month}</Pill>
                  )}
                </p>
                <p className="truncate text-xs text-suave">
                  {r.account}
                  {r.category ? ` · ${r.category}` : ""}
                </p>
              </div>

              <span className="flex shrink-0 items-center gap-1">
                <span
                  className={`tabular font-semibold ${
                    r.type === "income" ? "text-verdinho" : ""
                  }`}
                >
                  {r.type === "income" ? "+" : "−"} {formatBRL(r.amount)}
                </span>
                <PararFixa id={r.id} descricao={r.description} />
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
