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
