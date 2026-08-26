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

  // Só de chamar isso o token é renovado quando necessário.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Todas as rotas, menos arquivos estáticos, imagens e o endpoint do MCP
     * (que usa token OAuth, não cookie).
     */
    "/((?!_next/static|_next/image|favicon.ico|api/mcp|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
