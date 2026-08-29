import Link from "next/link";
import { Card, Empty, SectionTitle } from "@/components/ui";
import { Conselhos } from "@/components/conselhos";
import { Avisos } from "@/components/avisos";
import { MarcarVistos } from "@/components/sino";
import { Dindi } from "@/components/dindi";
import { pageCtx } from "@/lib/ctx";
import { env } from "@/lib/env";
import { getConselhos } from "@/lib/db/conselhos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Avisos — dindi" };

/**
 * Tudo que o dindi tem a dizer, num lugar só.
 *
 * O sino do topo aponta para cá. É a mesma coisa que ele mandaria de manhã
 * no celular, só que sempre disponível — inclusive para quem não ligou (ou
 * não pode ligar) as notificações.
 *
 * Os conselhos são recalculados na hora, não são histórico: o que importa é
 * o que está acontecendo com o dinheiro agora, não o que já foi resolvido.
 */
export default async function AvisosPage() {
  const { ctx } = await pageCtx();

  const [conselhos, { data: ultimo }, { count: aparelhos }] = await Promise.all([
    getConselhos(ctx),
    ctx.db
      .from("alert_log")
      .select("last_sent")
      .eq("household_id", ctx.householdId)
      .order("last_sent", { ascending: false })
      .limit(1)
      .maybeSingle(),
    ctx.db
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("household_id", ctx.householdId),
  ]);

  return (
    <>
      <MarcarVistos ultimoAviso={ultimo?.last_sent ?? null} />

      {conselhos.length > 0 ? (
        <Conselhos itens={conselhos} />
      ) : (
        <>
          <SectionTitle>O dindi reparou</SectionTitle>
          <Empty semLink humor="dormindo">
            Nada pedindo atenção agora. Quando algo sair do lugar — fatura fechando, gasto
            acima do combinado, meta batida — eu aviso aqui.
          </Empty>
        </>
      )}

      {/* Quem ainda não liga as notificações só descobre isso aqui. */}
      {(aparelhos ?? 0) === 0 ? (
        <section className="mt-8">
          <SectionTitle>Receber no celular</SectionTitle>
          <Card>
            <div className="flex items-start gap-3">
              <Dindi size={52} humor="atento" acena className="shrink-0" />
              <div className="min-w-0">
                <p className="justo text-sm leading-relaxed text-suave">
                  Toda manhã eu olho suas contas e, se tiver algo que vale a pena saber,
                  aviso neste aparelho. Se estiver tudo em ordem, fico quieto.
                </p>
                <div className="mt-3">
                  <Avisos chavePublica={env.vapidPublicKey} />
                </div>
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      <p className="mt-8 text-center">
        <Link href="/conquistas" className="text-sm text-suave underline underline-offset-2">
          Ver minhas conquistas
        </Link>
      </p>
    </>
  );
}
