import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CORS_HEADERS, MCP_SCOPE, oauthError } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dynamic Client Registration (RFC 7591).
 * O Claude se cadastra sozinho aqui antes de pedir autorização.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return oauthError("invalid_client_metadata", "Corpo da requisição não é um JSON válido.");
  }

  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return oauthError("invalid_redirect_uri", "É obrigatório informar redirect_uris.");
  }

  for (const uri of redirectUris) {
    if (typeof uri !== "string") {
      return oauthError("invalid_redirect_uri", "Cada redirect_uri precisa ser texto.");
    }
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      return oauthError("invalid_redirect_uri", `redirect_uri inválida: ${uri}`);
    }
    const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const isCustomScheme = !parsed.protocol.startsWith("http");
    if (parsed.protocol !== "https:" && !isLocal && !isCustomScheme) {
      return oauthError("invalid_redirect_uri", `redirect_uri precisa usar https: ${uri}`);
    }
  }

  const authMethod =
    typeof body.token_endpoint_auth_method === "string"
      ? body.token_endpoint_auth_method
      : "none";

  const clientId = `dindi_client_${randomBytes(16).toString("hex")}`;
  const clientSecret = authMethod === "none" ? null : randomBytes(32).toString("hex");

  const { error } = await supabaseAdmin().from("oauth_clients").insert({
    client_id: clientId,
    client_secret: clientSecret,
    client_name:
      typeof body.client_name === "string" ? body.client_name.slice(0, 120) : "Cliente MCP",
    redirect_uris: redirectUris,
    grant_types: Array.isArray(body.grant_types)
      ? body.grant_types
      : ["authorization_code", "refresh_token"],
    token_endpoint_auth_method: authMethod,
  });

  if (error) {
    return oauthError("server_error", `Não consegui registrar o cliente: ${error.message}`, 500);
  }

  return Response.json(
    {
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: authMethod,
      scope: MCP_SCOPE,
    },
    { status: 201, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
