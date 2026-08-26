import webpush from "web-push";
import { env, appUrl } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type Recado = { titulo: string; texto: string; url?: string };

let configurado = false;

function configurar() {
  if (configurado) return;
  webpush.setVapidDetails(appUrl(), env.vapidPublicKey, env.vapidPrivateKey);
  configurado = true;
}

/**
 * Entrega um recado em todos os celulares de uma casa.
 *
 * Aparelho que responde 404 ou 410 é aparelho que desinstalou o app ou limpou
 * o navegador — o endereço nunca mais vai funcionar, então some com ele em vez
 * de tentar de novo todo dia para sempre.
 */
export async function mandarRecado(householdId: string, recado: Recado): Promise<number> {
  configurar();

  const db = supabaseAdmin();
  const { data: inscricoes } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("household_id", householdId);

  if (!inscricoes?.length) return 0;

  const corpo = JSON.stringify({ url: "/", ...recado });
  const mortos: string[] = [];
  let entregues = 0;

  await Promise.all(
    inscricoes.map(async (i) => {
      try {
        await webpush.sendNotification(
          { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
          corpo,
          { TTL: 60 * 60 * 12 }
        );
        entregues++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) mortos.push(i.id);
      }
    })
  );

  if (mortos.length) await db.from("push_subscriptions").delete().in("id", mortos);
  if (entregues) {
    await db
      .from("push_subscriptions")
      .update({ last_sent_at: new Date().toISOString() })
      .eq("household_id", householdId);
  }

  return entregues;
}
