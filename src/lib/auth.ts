import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";

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

/**
 * O login com Google está ligado no painel do Supabase?
 *
 * O botão só aparece quando estiver: mostrar um botão que erra na cara da
 * pessoa é pior que não mostrar botão nenhum. A resposta vem de um endereço
 * público do próprio Supabase e fica guardada por cinco minutos — ligar lá
 * faz o botão aparecer aqui sozinho, sem publicar nada de novo.
 */
export async function loginComGoogleLigado(): Promise<boolean> {
  try {
    const resposta = await fetch(`${env.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: env.supabaseAnonKey },
      next: { revalidate: 300 },
    });
    if (!resposta.ok) return false;
    const config = (await resposta.json()) as { external?: { google?: boolean } };
    return config.external?.google === true;
  } catch {
    return false;
  }
}

/** Igual ao getSession, mas manda para o login/onboarding se faltar algo. */
export async function requireSession(): Promise<SessionInfo> {
  if (!(await getUser())) redirect("/entrar");

  const session = await getSession();
  if (!session) redirect("/comecar");

  return session;
}
