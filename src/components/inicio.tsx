import Link from "next/link";
import { Dindi } from "@/components/dindi";
import { formatBRL } from "@/lib/money";
import { horaAgora } from "@/lib/dates";

/**
 * As peças da tela inicial no desenho novo.
 *
 * Um herói só (o dinheiro livre), o porquinho dizendo oi num balão, os sonhos
 * em anéis que rolam de lado e os últimos lançamentos. O resto — saúde,
 * conquistas — mora no Menu, para a abertura respirar.
 */

/* ---------------- O balão do porquinho ---------------- */

export function Balao({
  nome,
  frase,
  humor = "feliz",
}: {
  nome: string;
  frase: string;
  humor?: "feliz" | "atento" | "preocupado" | "comemorando" | "dormindo";
}) {
  const hora = horaAgora();
  const parte =
    hora < 6 ? "Boa madrugada" : hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <section className="mb-3 flex items-center gap-3">
      <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[20px] bg-rosinha">
        <Dindi size={58} humor={humor} className="respira" />
      </span>
      {/* Balão com o rabinho apontando para o porquinho. */}
      <div className="relative min-w-0 flex-1 rounded-[18px] rounded-bl-[6px] bg-white px-3.5 py-2.5 shadow-[0_2px_10px_-4px_rgba(46,33,28,0.18)]">
        <span
          aria-hidden
          className="absolute -left-1 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 rounded-[2px] bg-white"
        />
        <p className="fonte-display text-[13px] font-bold leading-tight">
          {parte}, {nome}
        </p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-suave">{frase}</p>
      </div>
    </section>
  );
}

/* ---------------- O card-herói do saldo ---------------- */

export function HeroSaldo({
  livre,
  entrou,
  saiu,
}: {
  livre: number;
  entrou: number;
  saiu: number;
}) {
  return (
    <section
      className="relative mb-8 overflow-hidden rounded-[28px] p-[22px] text-white"
      style={{ background: "linear-gradient(160deg, #3A2A23 0%, #241A16 100%)" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full"
        style={{ background: "rgba(242,166,155,0.13)" }}
      />
      {/* O porquinho espiando atrás, sem cobrir número nenhum (z-0). */}
      <span
        aria-hidden
        className="espia pointer-events-none absolute -right-4 bottom-2 z-0 opacity-50"
      >
        <Dindi size={96} humor="atento" espelhado />
      </span>

      <div className="relative z-10">
        <p className="text-[12.5px] text-white/60">Livre pra gastar hoje</p>
        <p className="tabular fonte-display mt-1 text-[44px] font-extrabold leading-none tracking-[-2px]">
          {formatBRL(livre)}
        </p>

        <div className="mt-5 flex items-stretch gap-4 border-t border-white/10 pt-3">
          <div className="flex-1">
            <p className="text-[11.5px] text-white/60">
              <span aria-hidden style={{ color: "#7FD3A6" }}>
                ↑
              </span>{" "}
              Entrou
            </p>
            <p className="tabular fonte-display mt-0.5 text-[17px] font-bold">
              {formatBRL(entrou)}
            </p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex-1">
            <p className="text-[11.5px] text-white/60">
              <span aria-hidden style={{ color: "#F0A79C" }}>
                ↓
              </span>{" "}
              Saiu
            </p>
            <p className="tabular fonte-display mt-0.5 text-[17px] font-bold">
              {formatBRL(saiu)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Um sonho, com o anel de progresso ---------------- */

const CORES_ANEL = ["#F2A69B", "#8FBF9F", "#E8C46A", "#A9B7E8"];

export function CardSonho({
  nome,
  atual,
  alvo,
  percent,
  mensal,
  cor,
}: {
  nome: string;
  atual: number;
  alvo: number;
  percent: number;
  mensal?: number | null;
  cor: number;
}) {
  const p = Math.min(Math.max(percent, 0), 100);
  const anel = CORES_ANEL[cor % CORES_ANEL.length];

  return (
    <div className="flex w-[152px] shrink-0 flex-col rounded-[22px] bg-white p-4 shadow-[0_2px_10px_-6px_rgba(46,33,28,0.2)]">
      <div
        className="flex h-[46px] w-[46px] items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${anel} ${p * 3.6}deg, #F5EAD9 0)` }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
          <span className="tabular fonte-display text-[11px] font-bold">{Math.round(p)}%</span>
        </span>
      </div>
      <p className="fonte-display mt-3 truncate text-sm font-bold">{nome}</p>
      <p className="tabular mt-0.5 text-xs text-suave">
        {formatBRL(atual)} de {formatBRL(alvo)}
      </p>
      {mensal ? (
        <p className="tabular mt-1 text-[11px] text-fraco">{formatBRL(mensal)}/mês</p>
      ) : null}
    </div>
  );
}

/** O card tracejado de "novo sonho" no fim do carrossel. */
export function NovoSonho() {
  return (
    <Link
      href="/metas"
      className="flex w-[152px] shrink-0 flex-col items-center justify-center gap-2 rounded-[22px] border-[1.5px] border-dashed border-[#DFD0BC] p-4 text-center text-suave transition hover:bg-white"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-areia text-lg">
        +
      </span>
      <span className="text-xs font-medium">novo sonho</span>
    </Link>
  );
}
