import Link from "next/link";
import { formatBRL } from "@/lib/money";

/**
 * O gráfico "onde foi o dinheiro", uma barra por dia do mês.
 *
 * A altura é o gasto do dia sobre o maior gasto do mês. A cor conta a
 * intensidade sem precisar de número: dia quente em vermelho, morno no acento,
 * fraco no bege. Rótulo só de cinco em cinco, para não virar sopa de número.
 */
export function GraficoPorDia({
  dias,
}: {
  dias: { dia: number; total: number }[];
}) {
  const max = Math.max(1, ...dias.map((d) => d.total));

  return (
    <div className="rounded-[22px] bg-white p-4 shadow-[0_2px_10px_-6px_rgba(46,33,28,0.2)]">
      <p className="fonte-display mb-3 text-sm font-bold">Onde foi o dinheiro</p>
      <div className="flex h-[92px] items-end gap-[3px]">
        {dias.map((d) => {
          const frac = d.total / max;
          const altura = d.total === 0 ? 6 : Math.max(6, Math.round(frac * 76));
          const cor =
            d.total === 0
              ? "#F0DFCB"
              : frac > 0.66
                ? "#E4574A"
                : frac > 0.33
                  ? "#F2A69B"
                  : "#F0DFCB";
          return (
            <div key={d.dia} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span
                className="w-full rounded-[3px]"
                style={{ height: `${altura}px`, background: cor }}
              />
              <span className="h-2 text-[8px] leading-none text-[#BFAEA2]">
                {d.dia % 5 === 0 ? d.dia : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Os chips de categoria. Filtram a lista sem sair da tela — cada um é um link
 * que troca só o parâmetro na URL, mantendo o mês.
 */
export function ChipsCategoria({
  categorias,
  ativa,
  href,
}: {
  categorias: string[];
  ativa: string | null;
  href: (categoria: string | null) => string;
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <div className="flex gap-2 pb-1">
        <Chip label="Tudo" ativo={!ativa} href={href(null)} />
        {categorias.map((c) => (
          <Chip key={c} label={c} ativo={ativa === c} href={href(c)} />
        ))}
      </div>
    </div>
  );
}

function Chip({ label, ativo, href }: { label: string; ativo: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-[20px] px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
        ativo
          ? "bg-tinta text-white"
          : "bg-white text-medio shadow-[0_1px_2px_rgba(46,33,28,0.06)]"
      }`}
    >
      {label}
    </Link>
  );
}

/** As três colunas do resumo do mês, num card só. */
export function ResumoMes({
  entrou,
  saiu,
  sobrou,
}: {
  entrou: number;
  saiu: number;
  sobrou: number;
}) {
  return (
    <div className="mb-4 grid grid-cols-3 divide-x divide-[#F1E6D7] rounded-[22px] bg-white px-1.5 py-4 shadow-[0_2px_10px_-6px_rgba(46,33,28,0.2)]">
      <Coluna rotulo="Entrou" valor={entrou} cor="#17915C" />
      <Coluna rotulo="Saiu" valor={saiu} cor="#D9452F" />
      <Coluna rotulo="Sobrou" valor={sobrou} cor="#2E211C" />
    </div>
  );
}

function Coluna({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div className="px-1 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-fraco">{rotulo}</p>
      <p className="tabular fonte-display mt-1 text-[16.5px] font-bold" style={{ color: cor }}>
        {formatBRL(valor)}
      </p>
    </div>
  );
}
