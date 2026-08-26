"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

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

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return {
      error:
        error.message.includes("already registered")
          ? "Esse email já tem conta. Tente entrar."
          : error.message,
    };
  }

  // Se a confirmação por email estiver ligada no Supabase, não há sessão ainda.
  if (!data.session) {
    return { ok: "Conta criada! Confirme o email que enviamos e depois faça login." };
  }

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
  const householdName = String(formData.get("household_name") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!displayName) return { error: "Diga como você quer ser chamado." };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("bootstrap_household", {
    p_household_name: householdName || "Nossa casa",
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

export async function createInvite(_prev: ActionState): Promise<ActionState> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("create_invite", { p_email: null });
  if (error) return { error: error.message };
  revalidatePath("/casa");
  return { ok: String(data) };
}
