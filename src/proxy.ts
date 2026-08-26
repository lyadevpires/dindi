import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Roda antes de cada página e mantém o login do Supabase renovado.
 * (No Next 16 este arquivo se chama proxy.ts — antes era middleware.ts.)
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Renova o token quando ele está vencendo — e só nessa hora.
  //
  // Aqui era `getUser()`, que conversa com o servidor do Supabase a cada clique
  // e segurava a troca de tela. `getSession()` lê o cookie na hora e só sai para
  // a rede se o token já venceu. Não é uma brecha: quem decide se você está
  // logado de verdade continua sendo o `getUser()` de dentro de cada página.
  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: [
    /*
     * Todas as rotas, menos arquivos estáticos, imagens e o endpoint do MCP
     * (que usa token OAuth, não cookie).
     */
    "/((?!_next/static|_next/image|favicon.ico|api/mcp|api/cron|api/setup|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
