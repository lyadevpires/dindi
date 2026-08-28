import Link from "next/link";
import { formatBRL } from "@/lib/money";

/**
 * O painel de abertura da tela inicial.
 *
 * A ideia é responder as três perguntas que se faz abrindo o app, na ordem em
 * que elas vêm: quanto eu tenho, quanto entrou e saiu, e onde foi parar. Só
 * depois disso vêm os conselhos e o resto.
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
      {/* Manchas de cor no canto, só para o cartão não ser um retângulo escuro. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-azulzinho/30"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-verdinho/25"
      />

      <div className="relative">
        <p className="text-sm text-creme/70">Seu dinheiro hoje</p>
        <p className="tabular mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
          {formatBRL(total)}
        </p>

        <p className="mt-2 text-sm text-creme/70">
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
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-creme/70 transition hover:text-creme">
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
                  <span className="min-w-0 truncate text-creme/80">
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
    <section className="mb-8 grid grid-cols-2 divide-x divide-creme/15 overflow-hidden rounded-2xl bg-tinta text-creme">
      <div className="flex items-center gap-3 px-5 py-4">
        <span aria-hidden className="text-xl leading-none text-verdinho">
          ↑
        </span>
        <div className="min-w-0">
          <p className="text-xs text-creme/70">Entrou</p>
          <p className="tabular truncate text-lg font-bold">{formatBRL(entrou)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 px-5 py-4">
        <span aria-hidden className="text-xl leading-none text-vermelhinho">
          ↓
        </span>
        <div className="min-w-0">
          <p className="text-xs text-creme/70">Saiu</p>
          <p className="tabular truncate text-lg font-bold">{formatBRL(saiu)}</p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const BLOCOS = ["bg-bloco-1", "bg-bloco-2", "bg-bloco-3", "bg-bloco-4", "bg-bloco-5"];

/**
 * Onde mais saiu dinheiro no mês, em blocos que rolam de lado.
 *
 * Rolar de lado é de propósito: empilhar cinco cartões numa tela de celular
 * empurraria o resto da página para longe, e essa é uma leitura de relance.
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
          {categorias.map((c, i) => (
            <li
              key={c.name}
              className={`flex h-36 w-36 shrink-0 flex-col justify-between rounded-2xl p-4 text-creme ${
                BLOCOS[i % BLOCOS.length]
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-creme/25 text-sm font-bold">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm text-creme/85">{c.name}</p>
                <p className="tabular truncate text-xl font-bold">{formatBRL(c.total)}</p>
              </div>
            </li>
          ))}
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
          const cor =
            b.status === "estourou"
              ? "bg-vermelhinho"
              : b.status === "atenção"
                ? "bg-amarelinho"
                : "bg-verdinho";

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

              <p className="tabular mt-2 truncate text-right text-xs text-suave">
                {resta >= 0
                  ? `${formatBRL(resta)} restam`
                  : `${formatBRL(-resta)} a mais`}
              </p>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-areia">
                <div
                  className={`h-full rounded-full ${cor}`}
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
