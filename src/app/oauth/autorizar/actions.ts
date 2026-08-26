"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AUTH_CODE_TTL_SECONDS, isRegisteredRedirect } from "@/lib/oauth";

/**
 * Chamada quando a pessoa clica em "Permitir".
 * Gera o código de autorização e devolve o usuário para o Claude.
 */
export async function authorize(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "");
  const codeChallengeMethod = String(formData.get("code_challenge_method") ?? "");
  const scope = String(formData.get("scope") ?? "");
  const resource = String(formData.get("resource") ?? "");

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("oauth_clients")
    .select("client_id, redirect_uris")
    .eq("client_id", clientId)
    .maybeSingle();

  // Revalida tudo no servidor: nunca confie só no que veio do formulário.
  if (!client || !isRegisteredRedirect(client.redirect_uris, redirectUri)) {
    redirect("/oauth/autorizar?erro=cliente_invalido");
  }

  const code = `dindi_code_${randomBytes(32).toString("hex")}`;

  const { error } = await db.from("oauth_authorization_codes").insert({
    code,
    client_id: clientId,
    user_id: session.userId,
    household_id: session.householdId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge || null,
    code_challenge_method: codeChallengeMethod || null,
    scope: scope || null,
    resource: resource || null,
    expires_at: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000).toISOString(),
  });

  if (error) redirect("/oauth/autorizar?erro=falha_ao_gerar_codigo");

  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  if (state) target.searchParams.set("state", state);

  redirect(target.toString());
}

/** Quando a pessoa clica em "Agora não". */
export async function denyAuthorization(formData: FormData): Promise<void> {
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");
  const clientId = String(formData.get("client_id") ?? "");

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("oauth_clients")
    .select("redirect_uris")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!client || !isRegisteredRedirect(client.redirect_uris, redirectUri)) {
    redirect("/");
  }

  const target = new URL(redirectUri);
  target.searchParams.set("error", "access_denied");
  target.searchParams.set("error_description", "A pessoa não autorizou o acesso.");
  if (state) target.searchParams.set("state", state);

  redirect(target.toString());
}
