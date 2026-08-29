import type { ReactNode } from "react";
import Link from "next/link";
import { Dindi, type Humor } from "@/components/dindi";

/** Peças visuais reutilizadas em todas as telas. */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-borda bg-white p-5 shadow-[0_1px_2px_rgba(44,36,32,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

/**
 * A tela vazia.
 *
 * Quase todo vazio aqui termina em "peça pro Claude" — e isso é um beco sem
 * saída para quem ainda não conectou. Por isso o caminho vem junto, a não ser
 * que a própria tela já esteja oferecendo ele (`semLink`).
 */
export function Empty({
  children,
  semLink = false,
  humor = "atento",
  semDindi = false,
}: {
  children: ReactNode;
  semLink?: boolean;
  humor?: Humor;
  /** Para telas que já mostram o porquinho perto — ele não precisa aparecer duas vezes. */
  semDindi?: boolean;
}) {
  if (semDindi) {
    return (
      <div className="rounded-2xl border border-dashed border-borda bg-areia/40 px-4 py-6 text-center text-sm text-suave">
        {children}
        {semLink ? null : (
          <p className="mt-2">
            <Link href="/conectar" className="underline underline-offset-2">
              Conectar o Claude
            </Link>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-borda bg-areia/40 p-5">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Dindi size={76} humor={humor} acena className="shrink-0" />

        {/* Balão de fala: o rabinho é um quadradinho girado, escondendo a borda
            do lado que encosta no balão. */}
        <div className="relative w-full rounded-2xl border border-borda bg-white px-4 py-3.5 text-center text-sm text-suave sm:text-left">
          <span
            aria-hidden
            className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-borda bg-white sm:left-auto sm:-left-1.5 sm:top-1/2 sm:-translate-x-0 sm:-translate-y-1/2 sm:border-l sm:border-t-0 sm:border-b sm:border-r-0"
          />
          <span className="relative block">{children}</span>

          {semLink ? null : (
            <Link
              href="/conectar"
              className="relative mt-2 inline-block font-medium text-tinta underline underline-offset-2"
            >
              Conectar o Claude
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function Pill({
  children,
  tone = "neutro",
}: {
  children: ReactNode;
  tone?: "neutro" | "verde" | "vermelho" | "amarelo" | "azul" | "roxo";
}) {
  const tones = {
    neutro: "bg-areia text-suave",
    verde: "bg-verdinho-claro text-verdinho",
    vermelho: "bg-vermelhinho-claro text-vermelhinho",
    amarelo: "bg-amarelinho-claro text-amarelinho",
    azul: "bg-azulzinho-claro text-azulzinho",
    roxo: "bg-roxinho-claro text-roxinho",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Progress({
  percent,
  tone = "verde",
}: {
  percent: number;
  tone?: "verde" | "vermelho" | "amarelo" | "roxo" | "azul" | "tinta";
}) {
  const cores = {
    verde: "bg-verdinho",
    vermelho: "bg-vermelhinho",
    amarelo: "bg-amarelinho",
    roxo: "bg-roxinho",
    azul: "bg-azulzinho",
    tinta: "bg-tinta",
  } as const;

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-areia">
      <div
        className={`h-full rounded-full transition-all ${cores[tone]}`}
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
      />
    </div>
  );
}
