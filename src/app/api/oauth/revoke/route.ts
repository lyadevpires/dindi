import { supabaseAdmin } from "@/lib/supabase/admin";
import { CORS_HEADERS, hashToken } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Revogação de token (RFC 7009).
 * Sempre responde 200, mesmo se o token não existir — é o que a spec pede.
 */
export async function POST(request: Request) {
  const form = new URLSearchParams(await request.text());
  const token = form.get("token");

  if (token) {
    await supabaseAdmin()
      .from("oauth_tokens")
      .update({ revoked: true })
      .eq("token_hash", hashToken(token));
  }

  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
