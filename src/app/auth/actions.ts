"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { appUrl, temEmail } from "@/lib/env";
import { emailDeConfirmacao, emailDeSenha, mandarEmail } from "@/lib/email";

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
 * Freio de mão do cadastro.
 *
 * O cadastro é aberto e não tem captcha, então um script conseguiria criar
 * milhares de contas numa tarde e estourar o plano do banco. Isto limita por
 * endereço de internet: seis contas por hora resolve o abuso e nunca atrapalha
 * gente de verdade, nem várias pessoas saindo do mesmo wi-fi.
 *
 * A memória é do processo, não do banco: some quando o servidor troca. Serve
 * para atrapalhar script, não para ser à prova de bala — quem quiser mesmo
 * pode trocar de endereço. O passo seguinte, se virar problema, é captcha.
 */
const cadastrosRecentes = new Map<string, number[]>();
const TETO_POR_HORA = 6;

function podeCadastrar(ip: string): boolean {
  const agora = Date.now();
  const umaHoraAtras = agora - 60 * 60 * 1000;
  const anteriores = (cadastrosRecentes.get(ip) ?? []).filter((t) => t > umaHoraAtras);

  if (anteriores.length >= TETO_POR_HORA) {
    cadastrosRecentes.set(ip, anteriores);
    return false;
  }

  anteriores.push(agora);
  cadastrosRecentes.set(ip, anteriores);

  // Faxina preguiçosa, para o mapa não crescer para sempre.
  if (cadastrosRecentes.size > 5000) {
    for (const [chave, marcas] of cadastrosRecentes) {
      if (marcas.every((t) => t <= umaHoraAtras)) cadastrosRecentes.delete(chave);
    }
  }

  return true;
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Preencha email e senha." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };

  const cabecalhos = await headers();
  const ip = (cabecalhos.get("x-forwarded-for") ?? "desconhecido").split(",")[0].trim();
  if (!podeCadastrar(ip)) {
    return { error: "Muitas contas criadas daí em pouco tempo. Tente de novo daqui a pouco." };
  }

  /*
   * Com email configurado, a conta nasce por confirmar.
   *
   * Não é burocracia: sem confirmação, um robô cria mil contas com endereços
   * inventados e — pior — quem digita o próprio email errado fica com uma
   * conta que nunca vai conseguir recuperar. O clique prova as duas coisas.
   *
   * O token é do Supabase, mas quem monta o endereço e manda a mensagem somos
   * nós. É isso que garante que o link aponte para o dindi, e não para o que
   * estiver configurado no painel — foi assim que um link foi parar em
   * localhost:3000.
   */
  if (temEmail()) {
    const { data, error: linkErro } = await supabaseAdmin().auth.admin.generateLink({
      type: "signup",
      email,
      password,
    });

    if (linkErro) {
      const jaExiste = /already (been )?registered|already exists/i.test(linkErro.message);
      return { error: jaExiste ? "Esse email já tem conta. Tente entrar." : linkErro.message };
    }

    const hash = data.properties?.hashed_token;
    if (!hash) return { error: "Não consegui gerar o link de confirmação. Tente de novo." };

    const destino = next === "/" ? "/comecar" : next;
    const link = `${appUrl()}/auth/confirm?token_hash=${hash}&type=signup&next=${encodeURIComponent(destino)}`;

    const falhou = await mandarEmail(emailDeConfirmacao(email, link));
    if (falhou) return { error: `A conta foi criada, mas o email não saiu. ${falhou}` };

    // Devolve o email para a tela dizer "olha a caixa de entrada do fulano@".
    return { ok: email };
  }

  // Sem email configurado o cadastro segue como antes, já confirmado. É pior
  // que confirmar, mas melhor que deixar todo mundo sem entrar por falta de
  // uma chave.
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
