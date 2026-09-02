import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Servidor OAuth 2.1 do dindi.
 *
 * É isso que permite o usuário clicar em "conectar" no Claude, fazer
 * login no dindi e autorizar o acesso — sem nunca colar token nenhum.
 *
 * Fluxo:
 *   1. O Claude descobre os endereços em /.well-known/...
 *   2. Se registra sozinho em /api/oauth/register  (Dynamic Client Registration)
 *   3. Manda o usuário para /oauth/autorizar       (login + tela de permissão)
 *   4. Troca o código por um token em /api/oauth/token
 *   5. Usa o token no header Authorization ao chamar /api/mcp
 */

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dias
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 ano
export const AUTH_CODE_TTL_SECONDS = 60 * 5; // 5 minutos

export const MCP_SCOPE = "financas";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(prefix: string): string {
  return `${prefix}${base64url(randomBytes(32))}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Confere o PKCE (a prova de que quem troca o código é quem pediu). */
export function verifyPkce(
  verifier: string,
  challenge: string | null,
  method: string | null
): boolean {
  if (!challenge) return true; // cliente não usou PKCE
  if (method === "S256" || !method) {
    const computed = base64url(createHash("sha256").update(verifier).digest());
    return safeEqual(computed, challenge);
  }
  if (method === "plain") return safeEqual(verifier, challenge);
  return false;
}

/**
 * Um redirect_uri só vale se o cliente registrou exatamente ele.
 * Comparação exata — nada de "começa com", que abriria brecha.
 */
export function isRegisteredRedirect(registered: unknown, uri: string): boolean {
  if (!Array.isArray(registered)) return false;
  return registered.some((r) => typeof r === "string" && r === uri);
}

// ---------------------------------------------------------------------

export type TokenOwner = {
  userId: string;
  householdId: string;
  clientId: string;
  scope: string | null;
};

/** Valida um access token vindo do header Authorization. */
export async function verifyAccessToken(token: string): Promise<TokenOwner | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("oauth_tokens")
    .select("user_id, household_id, client_id, scope, expires_at, revoked")
    .eq("token_hash", hashToken(token))
    .eq("token_type", "access")
    .maybeSingle();

  if (error || !data) return null;
  if (data.revoked) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  // Marca o uso (útil para a pessoa ver conexões ativas). Falha aqui não bloqueia.
  void db
    .from("oauth_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token))
    .then(() => {});

  /*
   * O dindi certo é o de AGORA, não o do dia da conexão.
   *
   * O token guardava um retrato do household na hora que a pessoa conectou o
   * Claude. Só que o dindi de alguém muda: ela aceita um convite, migra as
   * coisas para o dindi de outra pessoa. Quando isso acontecia, o Claude
   * continuava lendo o dindi antigo — o marido conectado via só as coisas dele
   * e não as da esposa que tinha acabado de entrar no mesmo dindi. Então
   * perguntamos ao banco de qual dindi a pessoa faz parte agora.
   */
  const { data: membro } = await db
    .from("household_members")
    .select("household_id")
    .eq("user_id", data.user_id)
    .limit(1)
    .maybeSingle();

  return {
    userId: data.user_id,
    householdId: membro?.household_id ?? data.household_id,
    clientId: data.client_id,
    scope: data.scope,
  };
}

/** Cria o par access + refresh token e devolve a resposta do /token. */
export async function issueTokens(params: {
  clientId: string;
  userId: string;
  householdId: string;
  scope: string | null;
}) {
  const db = supabaseAdmin();
  const accessToken = randomToken("dindi_at_");
  const refreshToken = randomToken("dindi_rt_");
  const now = Date.now();

  const { error } = await db.from("oauth_tokens").insert([
    {
      token_hash: hashToken(accessToken),
      token_type: "access",
      client_id: params.clientId,
      user_id: params.userId,
      household_id: params.householdId,
      scope: params.scope,
      expires_at: new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
    },
    {
      token_hash: hashToken(refreshToken),
      token_type: "refresh",
      client_id: params.clientId,
      user_id: params.userId,
      household_id: params.householdId,
      scope: params.scope,
      expires_at: new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString(),
    },
  ]);
  if (error) throw new Error(error.message);

  return {
    access_token: accessToken,
    token_type: "Bearer" as const,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: params.scope ?? MCP_SCOPE,
  };
}

export function oauthError(
  error: string,
  description: string,
  status = 400
): Response {
  return Response.json(
    { error, error_description: description },
    {
      status,
      headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
    }
  );
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-protocol-version",
  "Access-Control-Max-Age": "86400",
};
