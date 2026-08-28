import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { cookieLongo } from "@/lib/supabase/cookies";

/**
 * Cliente do Supabase para usar no servidor (páginas e server actions).
 * Usa o login do usuário via cookie — ou seja, o RLS está valendo.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, cookieLongo(value, options))
          );
        } catch {
          // Chamado de dentro de um Server Component: o middleware cuida disso.
        }
      },
    },
  });
}
