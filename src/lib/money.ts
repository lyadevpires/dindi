/** Dinheiro em reais. Sempre em número com 2 casas. */

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** 1500 → "R$ 1.500,00" */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value ?? 0);
}

/** 1500 → "1.500,00" (sem o R$) */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

/** O Postgres devolve numeric como string. Isso normaliza. */
export function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Divide um valor total em N parcelas sem perder centavo.
 * Ex: 100 em 3x → [33.34, 33.33, 33.33]
 */
export function splitInstallments(total: number, count: number): number[] {
  const cents = Math.round(round2(total) * 100);
  const base = Math.floor(cents / count);
  const rest = cents - base * count;
  return Array.from({ length: count }, (_, i) =>
    round2((base + (i < rest ? 1 : 0)) / 100)
  );
}
