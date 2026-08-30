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
 *
 * O retorno do login com Google também chega aqui, com `code`. Quando esse
 * caminho falha (a pessoa desistiu no meio, ou algo deu errado lá), a conversa
 * continua na tela de entrar — não na de senha esquecida, que é assunto de
 * link de email vencido.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const supabase = await supabaseServer();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return NextResponse.redirect(`${origin}/esqueci?expirou=1`);
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // O `code` também aparece no link de senha nova; se era esse o caso,
      // a tela certa para pedir outro continua sendo a de senha esquecida.
      const eraSenha = next === "/nova-senha";
      return NextResponse.redirect(
        eraSenha ? `${origin}/esqueci?expirou=1` : `${origin}/entrar?erro=google`
      );
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Sem token e sem código: ou o link veio pela metade, ou o Google devolveu
  // um erro em vez do código.
  return NextResponse.redirect(`${origin}/entrar?erro=google`);
}
