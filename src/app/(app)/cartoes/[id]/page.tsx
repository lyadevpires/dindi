import Link from "next/link";
import { notFound } from "next/navigation";
import { Dindi } from "@/components/dindi";
import { CartaoColorido } from "@/components/cartoes";
import { pageCtx } from "@/lib/ctx";
import { getInvoice } from "@/lib/db/finance";
import { allAccounts, allMembers } from "@/lib/db/resolve";
import { formatBRL } from "@/lib/money";
import { formatDateShort, monthStart, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function FaturaDoCartao(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, ctx } = await pageCtx();
  const { id } = await props.params;
  const params = await props.searchParams;

  const bruto = typeof params.mes === "string" ? params.mes : today();
  const mes = monthStart(/^\d{4}-\d{2}/.test(bruto) ? `${bruto.slice(0, 7)}-01` : today());

  const fatura = await getInvoice(ctx, id, mes).catch(() => null);
  if (!fatura) notFound();

  // De quem é este cartão — só faz diferença quando o dindi tem mais gente.
  const [contas, membros] = await Promise.all([allAccounts(ctx), allMembers(ctx)]);
  const conta = contas.find((c) => c.id === id);
  const dono =
    membros.length < 2 || !conta
      ? undefined
      : !conta.owner_user_id
        ? "de todo mundo"
        : conta.owner_user_id === session.userId
          ? "seu"
          : `de ${membros.find((m) => m.user_id === conta.owner_user_id)?.display_name.trim().split(" ")[0] ?? "alguém do dindi"}`;

  return (
    <>
      <Link
        href="/cartoes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-suave transition hover:text-tinta"
      >
        <span aria-hidden>←</span> Cartões
      </Link>

      <CartaoColorido
        nome={fatura.card}
        dono={dono}
        status={fatura.status}
        total={fatura.total}
        fecha={fatura.closing_date}
        vence={fatura.due_date}
      />

      {fatura.items.length === 0 ? (
        <p className="mt-4 px-1 text-sm text-suave">Nada nesta fatura.</p>
      ) : (
        <div className="mt-4 rounded-[22px] bg-white px-4 shadow-[0_2px_10px_-6px_rgba(46,33,28,0.2)]">
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
        <div className="mt-3 flex items-center gap-3 rounded-[22px] bg-white p-3.5 shadow-[0_2px_10px_-6px_rgba(46,33,28,0.2)]">
          <Dindi size={42} humor="atento" className="flutua-bob shrink-0" />
          <p className="text-[12.5px] leading-snug text-medio">
            Quando pagar, é só dizer pro Claude:{" "}
            <em>&ldquo;paguei a fatura do {fatura.card}&rdquo;</em>.
          </p>
        </div>
      ) : null}
    </>
  );
}
