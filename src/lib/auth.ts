import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type SessionInfo = {
  userId: string;
  email: string | null;
  householdId: string;
  householdName: string;
  displayName: string;
  role: "owner" | "member";
};

/** Quem está logado agora? Devolve null se ninguém estiver. */
export async function getUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * Sessão completa: usuário + casa. Devolve null se não estiver logado
 * ou se ainda não tiver criado/entrado numa casa.
 */
export async function getSession(): Promise<SessionInfo | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const { data: member } = await supabase
    .from("household_members")
    .select("household_id, display_name, role, households(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return null;

  const household = member.households as unknown as { name: string } | null;

  return {
    userId: user.id,
    email: user.email ?? null,
    householdId: member.household_id,
    householdName: household?.name ?? "Nossa casa",
    displayName: member.display_name,
    role: member.role as "owner" | "member",
  };
}

/** Igual ao getSession, mas manda para o login/onboarding se faltar algo. */
export async function requireSession(): Promise<SessionInfo> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/entrar");

  const session = await getSession();
  if (!session) redirect("/comecar");

  return session;
}
