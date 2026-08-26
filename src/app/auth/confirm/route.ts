import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * A porta de entrada dos links que chegam por email.
 *
 * O Supabase manda a pessoa para cá de duas formas diferentes dependendo de
 * como o projeto está configurado — com `token_hash` ou com `code`. Atender as
 * duas custa quatro linhas e evita um link quebrado que ninguém consegue
 * consertar do lado de fora.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const supabase = await supabaseServer();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: { message: "Link incompleto." } };

  if (error) {
    return NextResponse.redirect(`${origin}/esqueci?expirou=1`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
