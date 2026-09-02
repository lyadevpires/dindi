"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";
import type { ActionState } from "@/app/auth/actions";

/** Troca o nome do dindi. O RLS só deixa mexer no dindi de quem participa dele. */
export async function renameHousehold(formData: FormData): Promise<void> {
  const nome = String(formData.get("household_name") ?? "").trim();
  if (!nome) return;

  const session = await requireSession();
  const supabase = await supabaseServer();
  await supabase.from("households").update({ name: nome.slice(0, 60) }).eq("id", session.householdId);

  revalidatePath("/", "layout");
}

/**
 * Desconecta um app (o Claude, normalmente) do dindi.
 * O RLS só deixa a pessoa revogar os próprios tokens.
 */
export async function revokeConnection(formData: FormData): Promise<void> {
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return;

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  await supabase
    .from("oauth_tokens")
    .update({ revoked: true })
    .eq("client_id", clientId)
    .eq("user_id", data.user.id)
    .eq("revoked", false);

  revalidatePath("/ajustes");
}

/** O que o navegador devolve quando a pessoa aceita ser avisada. */
type Inscricao = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

/**
 * Guarda este aparelho na lista de quem recebe o recado da manhã.
 * Devolve a mensagem de erro, ou nada se deu certo.
 */
export async function ligarAvisos(inscricao: Inscricao): Promise<string | null> {
  const endpoint = inscricao?.endpoint;
  const p256dh = inscricao?.keys?.p256dh;
  const auth = inscricao?.keys?.auth;
  if (!endpoint || !p256dh || !auth) return "O navegador devolveu uma inscrição incompleta.";

  const session = await requireSession();
  const supabase = await supabaseServer();

  // O mesmo aparelho pode reinscrever — sobrescreve em vez de duplicar.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      household_id: session.householdId,
      user_id: session.userId,
      endpoint,
      p256dh,
      auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) return error.message;

  revalidatePath("/ajustes");
  return null;
}

/**
 * Apagar a conta e tudo que veio com ela.
 *
 * É de verdade: nada de "desativar" e guardar o dado escondido. Quem pede para
 * sair sai, e é exigência da LGPD que seja assim.
 *
 * Duas situações diferentes:
 *
 *   - você é a única pessoa no dindi → o dindi inteiro vai embora, e com ele
 *     contas, lançamentos, faturas, metas e limites (o banco apaga em cascata);
 *
 *   - tem mais gente → só a sua participação sai. Os lançamentos que você
 *     registrou continuam lá, porque o dinheiro foi de todo mundo e sumir com
 *     eles bagunçaria o extrato dos outros. Se você era quem criou, a pessoa
 *     mais antiga que ficou herda esse papel — senão o dindi ficaria sem dono.
 */
export async function apagarMinhaConta(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const confirmacao = String(formData.get("confirmacao") ?? "").trim().toUpperCase();
  if (confirmacao !== "APAGAR") {
    return { error: "Para confirmar, escreva APAGAR no campo." };
  }

  const session = await requireSession();
  const admin = supabaseAdmin();

  const { data: membros } = await admin
    .from("household_members")
    .select("user_id, role, created_at")
    .eq("household_id", session.householdId)
    .order("created_at", { ascending: true });

  const outros = (membros ?? []).filter((m) => m.user_id !== session.userId);

  if (outros.length === 0) {
    const { error } = await admin.from("households").delete().eq("id", session.householdId);
    if (error) return { error: error.message };
  } else {
    await admin
      .from("household_members")
      .delete()
      .eq("household_id", session.householdId)
      .eq("user_id", session.userId);

    if (session.role === "owner") {
      await admin
        .from("household_members")
        .update({ role: "owner" })
        .eq("household_id", session.householdId)
        .eq("user_id", outros[0].user_id);
    }
  }

  // Por último o login. Isso leva junto os tokens dos apps conectados e as
  // inscrições de aviso, que apontam para o usuário.
  const { error: authErro } = await admin.auth.admin.deleteUser(session.userId);
  if (authErro) return { error: authErro.message };

  const supabase = await supabaseServer();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}

/** Tira este aparelho da lista. */
export async function desligarAvisos(endpoint: string): Promise<void> {
  if (!endpoint) return;

  await requireSession();
  const supabase = await supabaseServer();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  revalidatePath("/ajustes");
}

/**
 * Aplica as atualizações do banco de dados — a versão com botão do que a rota
 * `/api/setup` faz com o CRON_SECRET.
 *
 * Existe porque quem cuida do dindi não tem a chave de produção à mão, e toda
 * mudança de estrutura (uma coluna nova, uma função nova) precisa ser aplicada
 * no banco depois que o código sobe. Fica só para o dono, e roda apenas o SQL
 * versionado no repositório — nunca SQL de fora. Repetir é seguro.
 */
export async function atualizarBanco(_prev: ActionState): Promise<ActionState> {
  const session = await requireSession();
  if (session.role !== "owner") {
    return { error: "Só quem criou o dindi pode atualizar o banco." };
  }

  const { aplicarMigracoes } = await import("@/lib/db/migrar");
  const resultado = await aplicarMigracoes();

  if (!resultado.ok) {
    return { error: `Parou em ${resultado.parou_em ?? "?"}: ${resultado.error}` };
  }

  return { ok: `Banco atualizado. ${resultado.aplicados.length} arquivos aplicados.` };
}
