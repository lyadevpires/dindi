import type { ReactNode } from "react";
import Link from "next/link";

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
}: {
  children: ReactNode;
  semLink?: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-borda bg-areia/40 px-4 py-8 text-center text-sm text-suave">
      {children}
      {semLink ? null : (
        <p className="mt-3">
          <Link href="/conectar" className="underline underline-offset-2">
            Conectar o Claude
          </Link>
        </p>
      )}
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
  tone?: "verde" | "vermelho" | "amarelo" | "roxo" | "azul";
}) {
  const cores = {
    verde: "bg-verdinho",
    vermelho: "bg-vermelhinho",
    amarelo: "bg-amarelinho",
    roxo: "bg-roxinho",
    azul: "bg-azulzinho",
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
