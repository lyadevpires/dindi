import { formatBRL } from "@/lib/money";
import { formatDate, formatDateShort } from "@/lib/dates";

const ROTULO = { open: "aberta", closed: "fechada", paid: "paga" } as const;

/** O gradiente do cartão: os conhecidos têm a cor da marca; o resto, uma paleta. */
export function gradiente(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes("nubank")) return "linear-gradient(150deg,#8B4FC4,#5E2E8F)";
  if (n.includes("inter")) return "linear-gradient(150deg,#F08A3C,#C25A1A)";
  if (n.includes("itaú") || n.includes("itau")) return "linear-gradient(150deg,#F0663C,#B23A16)";
  const paletas = [
    "linear-gradient(150deg,#4A7FD4,#2F5AA8)",
    "linear-gradient(150deg,#3AA76D,#1E7A4C)",
    "linear-gradient(150deg,#7B62C9,#5A3EA8)",
    "linear-gradient(150deg,#5D4B42,#2E211C)",
  ];
  let s = 0;
  for (let i = 0; i < n.length; i++) s += n.charCodeAt(i);
  return paletas[s % paletas.length];
}

/**
 * O cartão colorido, com nome, status, valor da fatura e as datas.
 *
 * `dono` só aparece quando tem mais de uma pessoa no dindi — aí saber de quem
 * é o cartão importa; sozinha, seria só barulho.
 */
export function CartaoColorido({
  nome,
  dono,
  status,
  total,
  fecha,
  vence,
}: {
  nome: string;
  dono?: string;
  status: "open" | "closed" | "paid";
  total: number;
  fecha: string;
  vence: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[24px] p-[18px] text-white"
      style={{ background: gradiente(nome) }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/[0.09]"
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="fonte-display block truncate text-[14px] font-bold">{nome}</span>
          {dono ? (
            <span className="mt-0.5 block truncate text-[11px] text-white/70">{dono}</span>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-white/25 px-2.5 py-0.5 text-[10.5px] font-semibold">
          {ROTULO[status]}
        </span>
      </div>
      <p className="tabular fonte-display relative mt-3 text-[26px] font-extrabold">
        {formatBRL(total)}
      </p>
      <p className="relative mt-1 text-[11.5px] text-white/75">
        fecha {formatDateShort(fecha)} · vence {formatDate(vence)}
      </p>
    </div>
  );
}
