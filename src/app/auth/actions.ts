"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { appUrl, temEmail } from "@/lib/env";
import { emailDeSenha, mandarEmail } from "@/lib/email";

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

/**
 * Entrar com o Google.
 *
 * Não tem senha nem email de confirmação para se perder no spam: o Google já
 * provou que o email é da pessoa. Se já existe conta confirmada com o mesmo
 * email, o Supabase junta as duas — a pessoa cai na conta de sempre.
 */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNext(formData.get("next"));

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl()}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data?.url) redirect("/entrar?erro=google");
  redirect(data.url);
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
  // Direto para os primeiros passos: é aqui que se ganha ou se perde a pessoa.
  redirect(next === "/" ? "/primeiros-passos" : next);
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
  // Quem entra por convite também precisa do app no celular e do Claude.
  redirect(next === "/" ? "/primeiros-passos" : next);
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

  const recado =
    "Se existe uma conta com esse email, o link acabou de sair. Dá uma olhada na caixa de entrada (e no spam).";

  /*
   * O link é montado por nós, e não pelo Supabase.
   *
   * Quando pedíamos para ele mandar, ele conferia o nosso endereço na lista
   * dele, não encontrava, ignorava em silêncio e usava o padrão do projeto —
   * e o link de recuperação chegava apontando para localhost:3000. Gerando o
   * token aqui e montando o endereço nós mesmos, isso não acontece mais.
   */
  if (temEmail()) {
    const { data } = await supabaseAdmin().auth.admin.generateLink({
      type: "recovery",
      email,
    });

    const hash = data?.properties?.hashed_token;
    if (hash) {
      const link = `${appUrl()}/auth/confirm?token_hash=${hash}&type=recovery&next=${encodeURIComponent("/nova-senha")}`;
      await mandarEmail(emailDeSenha(email, link));
    }
    // Email inexistente cai aqui em silêncio, e a resposta é a mesma de
    // sempre: dizer "esse email não existe" entregaria quem tem conta aqui.
    return { ok: recado };
  }

  const supabase = await supabaseServer();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl()}/auth/confirm?next=${encodeURIComponent("/nova-senha")}`,
  });

  return { ok: recado };
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
