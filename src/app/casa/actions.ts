"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

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
