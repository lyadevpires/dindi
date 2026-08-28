import { supabaseAdmin } from "@/lib/supabase/admin";
import { env, appUrl } from "@/lib/env";
import { safeEqual } from "@/lib/oauth";

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

  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  if (!email) return Response.json({ error: "falta o email" }, { status: 400 });

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

  return Response.json({ link, validade: "uma hora" });
}
