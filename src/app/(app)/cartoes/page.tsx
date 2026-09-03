import Link from "next/link";
import { Empty } from "@/components/ui";
import { CartaoColorido } from "@/components/cartoes";
import { pageCtx } from "@/lib/ctx";
import { getInvoice, listAccounts } from "@/lib/db/finance";
import { formatBRL } from "@/lib/money";
import { addMonths, monthLabel, monthStart, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

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
        // A lista: cada cartão abre a fatura numa tela própria.
        <div className="space-y-4">
          {faturas.map((fatura, i) =>
            !fatura ? null : (
              <Link
                key={cartoes[i].id}
                href={`/cartoes/${cartoes[i].id}?mes=${mes.slice(0, 7)}`}
                className="block transition active:scale-[0.99]"
              >
                <CartaoColorido
                  nome={fatura.card}
                  status={fatura.status}
                  total={fatura.total}
                  fecha={fatura.closing_date}
                  vence={fatura.due_date}
                />
              </Link>
            )
          )}
        </div>
      )}
    </>
  );
}
