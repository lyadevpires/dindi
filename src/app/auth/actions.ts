"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/env";

export type ActionState = { error?: string; ok?: string } | null;

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  // Só aceita caminhos internos — evita redirecionar para site de fora.
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Preencha email e senha." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : error.message,
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Preencha email e senha." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };

  // A conta nasce já confirmada, em vez de depender do email de confirmação
  // do Supabase — que não temos como configurar (a integração fica trancada
  // dentro da Vercel) e que hoje aponta para localhost.
  const { error: createError } = await supabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    const jaExiste =
      createError.message.includes("already registered") ||
      createError.message.includes("already been registered");
    return { error: jaExiste ? "Esse email já tem conta. Tente entrar." : createError.message };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(next === "/" ? "/comecar" : next);
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/entrar");
}

export async function createHousehold(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!displayName) return { error: "Diga como você quer ser chamado." };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("bootstrap_household", {
    // Nasce batizado com o nome da pessoa; dá para renomear em /ajustes.
    p_household_name: `dindi da ${displayName}`,
    p_display_name: displayName,
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(next);
}

export async function joinHousehold(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!code) return { error: "Cole o código do convite." };
  if (!displayName) return { error: "Diga como você quer ser chamado." };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("accept_invite", {
    p_code: code,
    p_display_name: displayName,
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(next);
}

/**
 * Manda o email com o link para escolher uma senha nova.
 *
 * Responde a mesma coisa achando ou não o email: se dissesse "esse email não
 * existe", qualquer pessoa poderia descobrir quem tem conta aqui só chutando.
 */
export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Escreva seu email." };

  const supabase = await supabaseServer();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl()}/auth/confirm?next=${encodeURIComponent("/nova-senha")}`,
  });

  return {
    ok: "Se existe uma conta com esse email, o link acabou de sair. Dá uma olhada na caixa de entrada (e no spam).",
  };
}

/**
 * Troca a senha de quem já está logado — inclusive de quem acabou de entrar
 * pelo link do email, que para o Supabase é uma sessão como outra qualquer.
 */
export async function updatePassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "O link expirou. Peça outro na tela de entrar." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { ok: "Senha trocada. Pode usar a nova daqui pra frente." };
}

export async function createInvite(_prev: ActionState): Promise<ActionState> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("create_invite", { p_email: null });
  if (error) return { error: error.message };
  revalidatePath("/ajustes");
  return { ok: String(data) };
}
