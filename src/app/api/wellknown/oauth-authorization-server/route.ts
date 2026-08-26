import { appUrl } from "@/lib/env";
import { CORS_HEADERS, MCP_SCOPE } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Metadados do servidor de autorização (RFC 8414).
 * É por aqui que o Claude descobre onde fica cada endereço do OAuth.
 * URL pública real: /.well-known/oauth-authorization-server
 */
export function GET() {
  const base = appUrl();

  return Response.json(
    {
      issuer: base,
      authorization_endpoint: `${base}/oauth/autorizar`,
      token_endpoint: `${base}/api/oauth/token`,
      registration_endpoint: `${base}/api/oauth/register`,
      revocation_endpoint: `${base}/api/oauth/revoke`,
      scopes_supported: [MCP_SCOPE],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
      service_documentation: `${base}/conectar`,
    },
    { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=300" } }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
