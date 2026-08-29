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
 *
 * ---------------------------------------------------------------------
 * DÍVIDA CONHECIDA: duas descobertas por lançamento
 *
 * Ao importar uma fatura, o registro mostrou 78 chamadas para fazer o
 * trabalho de 26: dois `server/discover` antes de cada `tools/call`.
 *
 * A causa é que este endereço não tem sessão. Cada requisição monta o
 * servidor do zero, e a versão do `mcp-handler` que usamos não expõe
 * nenhuma opção de guardar sessão. Sem sessão o cliente não tem o que
 * reaproveitar e redescobre as ferramentas toda vez. O custo real de cada
 * redescoberta é uma consulta ao banco (`verifyAccessToken`) mais a
 * remontagem das ferramentas.
 *
 * Decidido em 2026-08-29 NÃO consertar ainda, porque:
 *   - guardar sessão de verdade exige um Redis (infra nova) — desproporcional
 *     para o tamanho de hoje;
 *   - guardar o token em memória tiraria a consulta, mas faria um token
 *     revogado continuar valendo por algum tempo. Trocar segurança do
 *     "Desconectar" por velocidade que ninguém está sentindo é mau negócio.
 *
 * Reabrir quando alguém reclamar de lentidão importando fatura grande, ou
 * quando houver gente suficiente para a consulta pesar. Aí o Redis se paga.
 * ---------------------------------------------------------------------
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

  /*
   * Deixa rastro de qual ferramenta foi chamada.
   *
   * Sem isto, quando alguém diz "falei com o Claude e não apareceu nada", não
   * há como saber se ele chegou a pedir alguma coisa ou só se apresentou — e
   * a diferença entre esses dois casos é o conserto inteiro.
   *
   * Vai só o nome do método e da ferramenta. Valor, descrição e categoria não
   * entram no log: isso é dinheiro de gente, não é material de depuração.
   */
  try {
    const espiada = await request.clone().json();
    const nome =
      espiada?.method === "tools/call"
        ? `tools/call ${espiada?.params?.name ?? "?"}`
        : String(espiada?.method ?? "?");
    console.log(`[mcp] ${nome} · dindi ${owner.householdId.slice(0, 8)}`);
  } catch {
    // GET e DELETE não têm corpo. Sem rastro, seguimos.
  }

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
