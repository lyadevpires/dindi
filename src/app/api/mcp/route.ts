import { createMcpHandler } from "mcp-handler";
import { appUrl } from "@/lib/env";
import { CORS_HEADERS, verifyAccessToken } from "@/lib/oauth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DINDI_INSTRUCTIONS, registerDindiTools } from "@/lib/mcp/tools";
import type { Ctx } from "@/lib/db/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * O servidor MCP.
 * É este endereço que a pessoa cola no Claude para conectar o dindi.
 */

/** Resposta 401 no formato que o Claude entende para iniciar o OAuth. */
function unauthorized(message: string) {
  const metadataUrl = `${appUrl()}/.well-known/oauth-protected-resource`;
  return Response.json(
    { error: "unauthorized", error_description: message },
    {
      status: 401,
      headers: {
        ...CORS_HEADERS,
        "WWW-Authenticate": `Bearer realm="dindi", resource_metadata="${metadataUrl}"`,
      },
    }
  );
}

async function handle(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return unauthorized("Conecte sua conta do dindi para usar estas ferramentas.");
  }

  const owner = await verifyAccessToken(auth.slice(7).trim());
  if (!owner) {
    return unauthorized("Sua conexão expirou. Conecte o dindi novamente.");
  }

  const ctx: Ctx = {
    db: supabaseAdmin(),
    householdId: owner.householdId,
    userId: owner.userId,
  };

  const handler = createMcpHandler(
    (server) => {
      registerDindiTools(server, ctx);
    },
    {
      serverInfo: { name: "dindi", version: "1.0.0" },
      instructions: DINDI_INSTRUCTIONS,
    }
  );

  return handler(request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
