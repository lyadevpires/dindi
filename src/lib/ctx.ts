import { requireSession, type SessionInfo } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { Ctx } from "@/lib/db/types";

/**
 * Contexto para as telas do site.
 *
 * Diferente do MCP (que usa a chave de admin), aqui o cliente é o do
 * navegador logado — então o RLS do Postgres ainda vale como segunda trava.
 */
export async function pageCtx(): Promise<{ session: SessionInfo; ctx: Ctx }> {
  const session = await requireSession();
  const db = await supabaseServer();
  return {
    session,
    ctx: { db, householdId: session.householdId, userId: session.userId },
  };
}
