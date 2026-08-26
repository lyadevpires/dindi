"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

/** Troca o nome da casa. O RLS só deixa mexer na casa de quem mora nela. */
export async function renameHousehold(formData: FormData): Promise<void> {
  const nome = String(formData.get("household_name") ?? "").trim();
  if (!nome) return;

  const session = await requireSession();
  const supabase = await supabaseServer();
  await supabase.from("households").update({ name: nome.slice(0, 60) }).eq("id", session.householdId);

  revalidatePath("/", "layout");
}

/**
 * Desconecta um app (o Claude, normalmente) da casa.
 * O RLS só deixa a pessoa revogar os próprios tokens.
 */
export async function revokeConnection(formData: FormData): Promise<void> {
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return;

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  await supabase
    .from("oauth_tokens")
    .update({ revoked: true })
    .eq("client_id", clientId)
    .eq("user_id", data.user.id)
    .eq("revoked", false);

  revalidatePath("/casa");
}

/** O que o navegador devolve quando a pessoa aceita ser avisada. */
type Inscricao = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

/**
 * Guarda este aparelho na lista de quem recebe o recado da manhã.
 * Devolve a mensagem de erro, ou nada se deu certo.
 */
export async function ligarAvisos(inscricao: Inscricao): Promise<string | null> {
  const endpoint = inscricao?.endpoint;
  const p256dh = inscricao?.keys?.p256dh;
  const auth = inscricao?.keys?.auth;
  if (!endpoint || !p256dh || !auth) return "O navegador devolveu uma inscrição incompleta.";

  const session = await requireSession();
  const supabase = await supabaseServer();

  // O mesmo aparelho pode reinscrever — sobrescreve em vez de duplicar.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      household_id: session.householdId,
      user_id: session.userId,
      endpoint,
      p256dh,
      auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) return error.message;

  revalidatePath("/casa");
  return null;
}

/** Tira este aparelho da lista. */
export async function desligarAvisos(endpoint: string): Promise<void> {
  if (!endpoint) return;

  await requireSession();
  const supabase = await supabaseServer();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  revalidatePath("/casa");
}
