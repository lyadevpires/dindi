/**
 * Contas com datas. Tudo trabalha com texto no formato "AAAA-MM-DD",
 * que é como o Postgres guarda campos `date`. Sem fuso, sem surpresa.
 */

export const TIMEZONE = "America/Sao_Paulo";

/** Hoje, no horário de Brasília. Ex: "2026-08-26" */
export function today(tz: string = TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function parseISO(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function toISO(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Se o dia não existe no mês (ex: 31 em fevereiro), usa o último dia do mês. */
export function safeDate(y: number, m: number, day: number): string {
  return toISO(y, m, Math.min(day, daysInMonth(y, m)));
}

/** Primeiro dia do mês de uma data. Ex: "2026-08-26" → "2026-08-01" */
export function monthStart(iso: string): string {
  const { y, m } = parseISO(iso);
  return toISO(y, m, 1);
}

/** Soma (ou subtrai) meses, mantendo o dia quando possível. */
export function addMonths(iso: string, n: number): string {
  const { y, m, d } = parseISO(iso);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return safeDate(ny, nm, d);
}

export function addDays(iso: string, n: number): string {
  const { y, m, d } = parseISO(iso);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Quantos meses entre dois meses de referência. */
export function monthsBetween(fromISO: string, toISOStr: string): number {
  const a = parseISO(fromISO);
  const b = parseISO(toISOStr);
  return (b.y - a.y) * 12 + (b.m - a.m);
}

// ---------------------------------------------------------------------
// Cartão de crédito
// ---------------------------------------------------------------------

/**
 * Em qual fatura cai uma compra feita nesta data?
 * Regra: comprou até o dia do fechamento (inclusive) → entra na fatura
 * que fecha neste mês. Depois disso → cai na do mês seguinte.
 *
 * Devolve o mês de referência da fatura ("AAAA-MM-01").
 */
export function invoiceMonthFor(purchaseDate: string, closingDay: number): string {
  const { y, m, d } = parseISO(purchaseDate);
  if (d <= closingDay) return toISO(y, m, 1);
  return addMonths(toISO(y, m, 1), 1);
}

/** Datas de fechamento e vencimento de uma fatura. */
export function invoiceDates(
  referenceMonth: string,
  closingDay: number,
  dueDay: number
): { closingDate: string; dueDate: string } {
  const { y, m } = parseISO(referenceMonth);
  const closingDate = safeDate(y, m, closingDay);
  // Se o vencimento é depois do fechamento, cai no mesmo mês. Senão, no mês seguinte.
  const dueDate =
    dueDay > closingDay
      ? safeDate(y, m, dueDay)
      : (() => {
          const next = addMonths(toISO(y, m, 1), 1);
          const n = parseISO(next);
          return safeDate(n.y, n.m, dueDay);
        })();
  return { closingDate, dueDate };
}

// ---------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2026-08-01" → "agosto de 2026" */
export function monthLabel(iso: string): string {
  const { y, m } = parseISO(iso);
  return `${MESES[m - 1]} de ${y}`;
}

/** "2026-08-26" → "26/08/2026" */
export function formatDate(iso: string): string {
  const { y, m, d } = parseISO(iso);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

/** "2026-08-26" → "26/08" */
export function formatDateShort(iso: string): string {
  const { m, d } = parseISO(iso);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}
