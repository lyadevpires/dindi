import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  CORS_HEADERS,
  hashToken,
  issueTokens,
  oauthError,
  safeEqual,
  verifyPkce,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Aceita client_secret via body ou via header Basic. */
function readClientCredentials(request: Request, form: URLSearchParams) {
  let clientId = form.get("client_id");
  let clientSecret = form.get("client_secret");

  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    if (sep > -1) {
      clientId = decodeURIComponent(decoded.slice(0, sep));
      clientSecret = decodeURIComponent(decoded.slice(sep + 1));
    }
  }

  return { clientId, clientSecret };
}

export async function POST(request: Request) {
  const form = new URLSearchParams(await request.text());
  const grantType = form.get("grant_type");
  const { clientId, clientSecret } = readClientCredentials(request, form);

  if (!clientId) return oauthError("invalid_client", "Falta o client_id.", 401);

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("oauth_clients")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!client) return oauthError("invalid_client", "Cliente não registrado.", 401);

  if (client.client_secret) {
    if (!clientSecret || !safeEqual(clientSecret, client.client_secret)) {
      return oauthError("invalid_client", "client_secret inválido.", 401);
    }
  }

  // -------------------------------------------------------------------
  if (grantType === "authorization_code") {
    const code = form.get("code");
    const redirectUri = form.get("redirect_uri");
    const codeVerifier = form.get("code_verifier");

    if (!code) return oauthError("invalid_request", "Falta o código de autorização.");

    const { data: authCode } = await db
      .from("oauth_authorization_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (!authCode) return oauthError("invalid_grant", "Código inválido.");
    if (authCode.used) {
      // Código reutilizado: por segurança, derruba os tokens dessa sessão.
      await db
        .from("oauth_tokens")
        .update({ revoked: true })
        .eq("client_id", authCode.client_id)
        .eq("user_id", authCode.user_id);
      return oauthError("invalid_grant", "Esse código já foi usado.");
    }
    if (new Date(authCode.expires_at) < new Date()) {
      return oauthError("invalid_grant", "Código expirado. Tente conectar de novo.");
    }
    if (authCode.client_id !== clientId) {
      return oauthError("invalid_grant", "Esse código não é deste cliente.");
    }
    if (redirectUri && redirectUri !== authCode.redirect_uri) {
      return oauthError("invalid_grant", "redirect_uri não confere.");
    }
    if (authCode.code_challenge && !codeVerifier) {
      return oauthError("invalid_request", "Falta o code_verifier (PKCE).");
    }
    if (
      codeVerifier &&
      !verifyPkce(codeVerifier, authCode.code_challenge, authCode.code_challenge_method)
    ) {
      return oauthError("invalid_grant", "PKCE não confere.");
    }

    await db
      .from("oauth_authorization_codes")
      .update({ used: true })
      .eq("code", code);

    const tokens = await issueTokens({
      clientId,
      userId: authCode.user_id,
      householdId: authCode.household_id,
      scope: authCode.scope,
    });

    return Response.json(tokens, {
      headers: { ...CORS_HEADERS, "Cache-Control": "no-store" },
    });
  }

  // -------------------------------------------------------------------
  if (grantType === "refresh_token") {
    const refreshToken = form.get("refresh_token");
    if (!refreshToken) return oauthError("invalid_request", "Falta o refresh_token.");

    const { data: stored } = await db
      .from("oauth_tokens")
      .select("*")
      .eq("token_hash", hashToken(refreshToken))
      .eq("token_type", "refresh")
      .maybeSingle();

    if (!stored || stored.revoked) {
      return oauthError("invalid_grant", "Refresh token inválido ou revogado.");
    }
    if (stored.expires_at && new Date(stored.expires_at) < new Date()) {
      return oauthError("invalid_grant", "Refresh token expirado.");
    }
    if (stored.client_id !== clientId) {
      return oauthError("invalid_grant", "Esse refresh token não é deste cliente.");
    }

    // Rotação: o refresh antigo morre junto com o access token antigo.
    await db.from("oauth_tokens").update({ revoked: true }).eq("id", stored.id);

    const tokens = await issueTokens({
      clientId,
      userId: stored.user_id,
      householdId: stored.household_id,
      scope: stored.scope,
    });

    return Response.json(tokens, {
      headers: { ...CORS_HEADERS, "Cache-Control": "no-store" },
    });
  }

  return oauthError("unsupported_grant_type", `grant_type não suportado: ${grantType}`);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
