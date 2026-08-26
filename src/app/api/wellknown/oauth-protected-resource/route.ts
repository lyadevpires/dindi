import { appUrl } from "@/lib/env";
import { CORS_HEADERS, MCP_SCOPE } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Metadados do recurso protegido (RFC 9728).
 * Diz ao Claude: "para falar com /api/mcp, autorize em tal servidor".
 * URL pública real: /.well-known/oauth-protected-resource[/api/mcp]
 */
export function GET() {
  const base = appUrl();

  return Response.json(
    {
      resource: `${base}/api/mcp`,
      authorization_servers: [base],
      scopes_supported: [MCP_SCOPE],
      bearer_methods_supported: ["header"],
      resource_name: "dindi",
      resource_documentation: `${base}/conectar`,
    },
    { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=300" } }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
