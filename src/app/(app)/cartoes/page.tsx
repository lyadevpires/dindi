import Link from "next/link";
import { Empty } from "@/components/ui";
import { Dindi } from "@/components/dindi";
import { pageCtx } from "@/lib/ctx";
import { getInvoice, listAccounts } from "@/lib/db/finance";
import { formatBRL } from "@/lib/money";
import { addMonths, formatDate, formatDateShort, monthLabel, monthStart, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ROTULO = { open: "aberta", closed: "fechada", paid: "paga" } as const;

/** O gradiente do cartão: os conhecidos têm a cor da marca; o resto, uma paleta. */
function gradiente(nome: string): string {
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

function tituloMes(mes: string): string {
  const rotulo = monthLabel(mes).replace(" de ", " ");
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

export default async function Cartoes(props: PageProps<"/cartoes">) {
  const { ctx } = await pageCtx();
  const params = await props.searchParams;

  const bruto = typeof params.mes === "string" ? params.mes : today();
  const mes = monthStart(/^\d{4}-\d{2}/.test(bruto) ? `${bruto.slice(0, 7)}-01` : today());

  const contas = await listAccounts(ctx);
  const cartoes = contas.filter((c) => c.tem_credito && !c.archived);
  const faturas = await Promise.all(
    cartoes.map((c) => getInvoice(ctx, c.id, mes).catch(() => null))
  );

  const totalFaturas = faturas.reduce((s, f) => s + (f?.total ?? 0), 0);
  const ehMesAtual = mes.slice(0, 7) === today().slice(0, 7);
  const linkMes = (m: string) => `/cartoes?mes=${m.slice(0, 7)}`;

  return (
    <>
      {/* ---------------- Total + navegação de mês ---------------- */}
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[12.5px] text-suave">
            Suas faturas de <strong className="font-semibold text-tinta">{tituloMes(mes)}</strong>{" "}
            somam
          </p>
          <p className="tabular fonte-display mt-0.5 text-[34px] font-extrabold tracking-[-1.4px]">
            {formatBRL(totalFaturas)}
          </p>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Link
            href={linkMes(addMonths(mes, -1))}
            aria-label="Mês anterior"
            className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-tinta text-white transition active:scale-95"
          >
            ←
          </Link>
          {ehMesAtual ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-[11px] text-[#C7B7AC]">
              →
            </span>
          ) : (
            <Link
              href={linkMes(addMonths(mes, 1))}
              aria-label="Próximo mês"
              className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-tinta text-white transition active:scale-95"
            >
              →
            </Link>
          )}
        </div>
      </div>

      {cartoes.length === 0 ? (
        <Empty>
          Nenhum cartão cadastrado. Peça pro Claude:{" "}
          <em>&ldquo;cadastra meu cartão Nubank, fecha dia 3 e vence dia 10&rdquo;</em>.
        </Empty>
      ) : (
        <div className="space-y-6">
          {faturas.map((fatura, i) =>
            !fatura ? null : (
              <div key={cartoes[i].id}>
                {/* ---- O cartão colorido ---- */}
                <div
                  className="relative overflow-hidden rounded-[24px] p-[18px] text-white"
                  style={{ background: gradiente(fatura.card) }}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/[0.09]"
                  />
                  <div className="relative flex items-center justify-between">
                    <span className="fonte-display text-[14px] font-bold">{fatura.card}</span>
                    <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-[10.5px] font-semibold">
                      {ROTULO[fatura.status]}
                    </span>
                  </div>
                  <p className="tabular fonte-display relative mt-3 text-[26px] font-extrabold">
                    {formatBRL(fatura.total)}
                  </p>
                  <p className="relative mt-1 text-[11.5px] text-white/75">
                    fecha {formatDateShort(fatura.closing_date)} · vence {formatDate(fatura.due_date)}
                  </p>
                </div>

                {/* ---- Os itens da fatura ---- */}
                {fatura.items.length === 0 ? (
                  <p className="mt-2 px-1 text-sm text-suave">Nada nesta fatura.</p>
                ) : (
                  <div className="mt-2 rounded-[22px] bg-white px-4 shadow-[0_2px_10px_-6px_rgba(46,33,28,0.2)]">
                    <ul className="divide-y divide-borda">
                      {fatura.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{item.description}</p>
                            <p className="truncate text-[11.5px] text-fraco">
                              {formatDateShort(item.date)}
                              {item.category ? ` · ${item.category}` : ""}
                            </p>
                          </div>
                          <span className="tabular fonte-display shrink-0 text-[14.5px] font-bold text-tinta">
                            {formatBRL(item.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {fatura.status !== "paid" && fatura.total > 0 ? (
                  <div className="mt-2 flex items-center gap-3 rounded-[22px] bg-white p-3.5 shadow-[0_2px_10px_-6px_rgba(46,33,28,0.2)]">
                    <Dindi size={42} humor="atento" className="flutua-bob shrink-0" />
                    <p className="text-[12.5px] leading-snug text-medio">
                      Quando pagar, é só dizer pro Claude:{" "}
                      <em>&ldquo;paguei a fatura do {fatura.card}&rdquo;</em>.
                    </p>
                  </div>
                ) : null}
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}
