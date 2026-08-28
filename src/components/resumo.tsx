import Link from "next/link";
import { formatBRL } from "@/lib/money";

/**
 * O painel de abertura da tela inicial.
 *
 * A ideia é responder as três perguntas que se faz abrindo o app, na ordem em
 * que elas vêm: quanto eu tenho, quanto entrou e saiu, e onde foi parar. Só
 * depois disso vêm os conselhos e o resto.
 *
 * A paleta é a do dindi e nada mais: preto, bege e branco. A hierarquia vem do
 * peso da cor, não de cores diferentes — o que pesa mais no mês é o bloco
 * preto, o resto é bege. Cor com significado sobrou só onde ela avisa de algo
 * (o limite estourado), para não virar enfeite.
 *
 * É desenhado para o celular primeiro: uma coluna, números grandes o bastante
 * para ler de relance, e a lista de gastos rolando de lado em vez de empilhar.
 */

/* ------------------------------------------------------------------ */

type Conta = { account: string; type: string; balance: number };

export function Saldo({
  total,
  emContas,
  noCartao,
  contas,
}: {
  total: number;
  emContas: number;
  noCartao: number;
  contas: Conta[];
}) {
  return (
    <section className="relative mb-3 overflow-hidden rounded-3xl bg-tinta p-6 text-creme">
      {/* Manchas tom sobre tom, só para o cartão não ser um retângulo chapado. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-creme/[0.07]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-creme/[0.05]"
      />

      <div className="relative">
        <p className="text-sm text-creme/60">Seu dinheiro hoje</p>
        <p className="tabular mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
          {formatBRL(total)}
        </p>

        <p className="mt-2 text-sm text-creme/60">
          <span className="tabular">{formatBRL(emContas)}</span> nas contas
          {noCartao > 0 ? (
            <>
              {" · "}
              <span className="tabular">{formatBRL(noCartao)}</span> devendo no cartão
            </>
          ) : null}
        </p>

        {contas.length > 0 ? (
          <details className="group mt-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-creme/60 transition hover:text-creme">
              Ver conta por conta
              <span
                aria-hidden
                className="flex h-6 w-6 items-center justify-center rounded-full bg-creme/15 text-xs transition group-open:rotate-180"
              >
                ↓
              </span>
            </summary>

            <ul className="mt-3 space-y-2 border-t border-creme/15 pt-3">
              {contas.map((c) => (
                <li key={c.account} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-creme/70">
                    {c.account}
                    {c.type === "credit_card" ? " (cartão)" : ""}
                  </span>
                  <span className="tabular shrink-0 font-semibold">
                    {formatBRL(c.balance)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function EntrouSaiu({ entrou, saiu }: { entrou: number; saiu: number }) {
  return (
    <section className="mb-8 grid grid-cols-2 divide-x divide-borda overflow-hidden rounded-2xl bg-areia">
      <div className="flex items-center gap-3 px-5 py-4">
        <span aria-hidden className="text-xl leading-none text-suave">
          ↑
        </span>
        <div className="min-w-0">
          <p className="text-xs text-suave">Entrou</p>
          <p className="tabular truncate text-lg font-bold">{formatBRL(entrou)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 px-5 py-4">
        <span aria-hidden className="text-xl leading-none text-suave">
          ↓
        </span>
        <div className="min-w-0">
          <p className="text-xs text-suave">Saiu</p>
          <p className="tabular truncate text-lg font-bold">{formatBRL(saiu)}</p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Onde mais saiu dinheiro no mês, em blocos que rolam de lado.
 *
 * Rolar de lado é de propósito: empilhar cinco cartões numa tela de celular
 * empurraria o resto da página para longe, e essa é uma leitura de relance.
 * O primeiro lugar vem preto e os outros bege — o ranking se lê antes de ler
 * os números.
 */
export function OndeMaisSaiu({
  categorias,
}: {
  categorias: { name: string; total: number }[];
}) {
  if (categorias.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">Onde mais saiu</h2>

      {/* O padding lateral negativo faz os blocos sumirem na borda da tela. */}
      <div className="-mx-5 overflow-x-auto px-5">
        <ul className="flex gap-3 pb-1">
          {categorias.map((c, i) => {
            const primeiro = i === 0;
            return (
              <li
                key={c.name}
                className={`flex h-36 w-40 shrink-0 flex-col justify-between rounded-2xl p-4 ${
                  primeiro
                    ? "bg-tinta text-creme"
                    : "border border-borda bg-areia text-tinta"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                    primeiro ? "bg-creme/20" : "bg-white"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm ${primeiro ? "text-creme/70" : "text-suave"}`}
                  >
                    {c.name}
                  </p>
                  <p className="tabular truncate text-lg font-bold">{formatBRL(c.total)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

type Combinado = {
  category: string;
  spent: number;
  limit_amount: number;
  percent_used: number;
  status: string;
};

export function GastoVsCombinado({ budgets }: { budgets: Combinado[] }) {
  if (budgets.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Gasto x combinado</h2>
        <Link href="/orcamento" className="text-sm text-suave underline underline-offset-2">
          ver tudo
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {budgets.slice(0, 4).map((b) => {
          const resta = b.limit_amount - b.spent;
          const estourou = b.status === "estourou";

          return (
            <Link
              key={b.category}
              href="/orcamento"
              className="rounded-2xl border border-borda bg-white p-4 shadow-[0_1px_2px_rgba(44,36,32,0.04)] transition hover:bg-areia/40"
            >
              <p className="truncate text-sm text-suave">{b.category}</p>
              <p className="tabular mt-0.5 truncate text-xl font-bold">
                {formatBRL(b.spent)}
              </p>

              <p
                className={`tabular mt-2 truncate text-right text-xs ${
                  estourou ? "font-medium text-vermelhinho" : "text-suave"
                }`}
              >
                {resta >= 0 ? `${formatBRL(resta)} restam` : `${formatBRL(-resta)} a mais`}
              </p>
              {/* Preto para o normal; o vermelho só aparece quando passou do combinado. */}
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-areia">
                <div
                  className={`h-full rounded-full ${estourou ? "bg-vermelhinho" : "bg-tinta"}`}
                  style={{ width: `${Math.min(Math.max(b.percent_used, 2), 100)}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
