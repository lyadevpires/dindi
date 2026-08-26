import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Cliente ADMIN do Supabase — ignora o RLS.
 *
 * ⚠️ Só pode ser usado no servidor, e apenas em dois lugares:
 *   1. O servidor MCP (o Claude se autentica por OAuth, não por cookie do Supabase)
 *   2. A rotina diária (cron), que roda sem usuário logado
 *
 * Como o RLS não protege aqui, TODA consulta feita com este cliente
 * precisa filtrar por household_id na mão. Por isso o acesso a dados
 * do MCP passa sempre por src/lib/db/*, que exige o householdId.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!cached) {
    cached = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cached;
}
