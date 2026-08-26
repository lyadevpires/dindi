import { cache } from "react";
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

/**
 * Quem está logado agora? Devolve null se ninguém estiver.
 *
 * Usa `getClaims()` e não `getUser()`: os dois conferem a assinatura do token,
 * mas o `getUser()` pergunta ao servidor do Supabase toda vez, e essa espera
 * aparecia em cada troca de tela. O `getClaims()` confere na hora, com a chave
 * pública do projeto. O `cache()` completa o serviço: uma conferência por visita.
 */
export const getUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
});

/**
 * Sessão completa: usuário + o dindi dele. Devolve null se não estiver logado
 * ou se ainda não tiver criado/entrado em um.
 *
 * No banco a tabela se chama `household` por motivos históricos; para quem usa,
 * isso é "o seu dindi" — você e quem você convidar para dividir o dinheiro.
 */
export const getSession = cache(async (): Promise<SessionInfo | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await supabaseServer();
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
    householdName: household?.name ?? "Meu dindi",
    displayName: member.display_name,
    role: member.role as "owner" | "member",
  };
});

/** Igual ao getSession, mas manda para o login/onboarding se faltar algo. */
export async function requireSession(): Promise<SessionInfo> {
  if (!(await getUser())) redirect("/entrar");

  const session = await getSession();
  if (!session) redirect("/comecar");

  return session;
}
