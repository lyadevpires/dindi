import { supabaseAdmin } from "@/lib/supabase/admin";
import { env, appUrl } from "@/lib/env";
import { safeEqual } from "@/lib/oauth";
import { emailDeSenha, mandarEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Porta de emergência: gera um link de recuperação de senha sem passar por email.
 *
 * TEMPORÁRIA, e vai ser removida assim que a dona da conta entrar de novo.
 *
 * Por que ela existe: o envio de email do Supabase ainda não está configurado
 * (o Site URL do projeto aponta para localhost), então o "esqueci minha senha"
 * manda um link que não chega a lugar nenhum — e quem sai da conta fica
 * trancado do lado de fora do próprio dinheiro.
 *
 * O que ela faz: pede ao Supabase o mesmo token que iria dentro do email e
 * devolve o endereço já montado em cima do /auth/confirm do próprio dindi.
 * Quem clica escolhe a senha nova; ninguém mais vê nem escolhe senha nenhuma.
 *
 * Só responde com o CRON_SECRET no cabeçalho. Esse segredo é uma chave mestra,
 * e é exatamente por isso que esta rota não pode ficar aqui para sempre.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  if (!provided || !safeEqual(provided, env.cronSecret)) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }

  const { email, enviar } = (await request.json().catch(() => ({}))) as {
    email?: string;
    enviar?: boolean;
  };

  // Sem email, devolve quem existe. É o único jeito de descobrir com qual
  // endereço a conta foi criada quando ninguém lembra — e some junto com o
  // resto desta rota.
  if (!email) {
    const { data, error: listaErro } = await supabaseAdmin().auth.admin.listUsers();
    if (listaErro) return Response.json({ error: listaErro.message }, { status: 400 });
    return Response.json({
      contas: data.users.map((u) => ({
        email: u.email,
        confirmado: Boolean(u.email_confirmed_at),
        criada: u.created_at,
      })),
    });
  }

  const { data, error } = await supabaseAdmin().auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const hash = data.properties?.hashed_token;
  if (!hash) return Response.json({ error: "o Supabase não devolveu o token" }, { status: 500 });

  // Montado em cima do nosso próprio /auth/confirm, e não do link do Supabase:
  // assim ele funciona mesmo com o Site URL do projeto ainda errado.
  const link = `${appUrl()}/auth/confirm?token_hash=${hash}&type=recovery&next=${encodeURIComponent("/nova-senha")}`;

  // Com `enviar`, tenta mandar de verdade e conta o que deu — é assim que se
  // descobre por que um email não chegou, em vez de adivinhar.
  const envio = enviar ? await mandarEmail(emailDeSenha(email, link)) : "não pedido";

  return Response.json({ link, envio: envio ?? "saiu", validade: "uma hora" });
}
