import { supabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/oauth";
import { monthStart, today } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Os números do dindi — quantas pessoas, quantos lançamentos, onde elas param.
 *
 * Só contagem. Nenhum nome, nenhum email, nenhum valor: para saber se o
 * produto está indo, ninguém precisa ler o dinheiro de ninguém. Foi por isso
 * que a rota antiga (que listava as contas) saiu — ela abria demais para
 * responder de menos.
 *
 * Protegida pelo CRON_SECRET. É ferramenta de quem opera, não do site.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  if (!provided || !safeEqual(provided, env.cronSecret)) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }

  const db = supabaseAdmin();

  /*
   * Com `?pessoas=1`, devolve também quem são — nome, quando entrou e até
   * onde chegou no cadastro.
   *
   * Saber quem se cadastrou é administração normal de quem opera o produto.
   * O que continua fora daqui, e não vai entrar, é o dinheiro de cada um:
   * saldo, gasto, categoria. A página de privacidade promete que o acesso
   * técnico serve para manter a coisa de pé e ajudar quem pede ajuda, não
   * para bisbilhotar — e uma lista de nomes respeita isso; um extrato alheio,
   * não.
   */
  const querPessoas = new URL(request.url).searchParams.get("pessoas") === "1";
  // `select("*")` e não `select("id")`: nem toda tabela tem coluna `id` —
  // household_members usa chave composta, e pedir "id" ali devolvia vazio,
  // fazendo parecer que ninguém tinha terminado o cadastro.
  const contar = async (tabela: string) => {
    const { count } = await db.from(tabela).select("*", { count: "exact", head: true });
    return count ?? 0;
  };

  const mes = monthStart(today());

  const [
    { data: usuarios },
    dindis,
    pessoas,
    lancamentos,
    doMes,
    aparelhos,
    metas,
    contas,
  ] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    contar("households"),
    contar("household_members"),
    contar("transactions"),
    db.from("transactions").select("*", { count: "exact", head: true }).gte("date", mes),
    contar("push_subscriptions"),
    contar("goals"),
    contar("accounts"),
  ]);

  const lancamentosDoMes = doMes.count ?? 0;

  // Quem conectou o Claude — uma pessoa pode ter vários tokens, então conta
  // gente, não token.
  const { data: tokens } = await db
    .from("oauth_tokens")
    .select("user_id")
    .eq("token_type", "access")
    .eq("revoked", false);
  const comClaude = new Set((tokens ?? []).map((t) => t.user_id)).size;

  const criaram = usuarios?.users.length ?? 0;
  const confirmaram = (usuarios?.users ?? []).filter((u) => u.email_confirmed_at).length;

  let lista: unknown = undefined;
  if (querPessoas) {
    const { data: membros } = await db
      .from("household_members")
      .select("user_id, display_name, role, created_at, households(name)")
      .order("created_at");

    const conectados = new Set((tokens ?? []).map((t) => t.user_id));
    const porId = new Map((usuarios?.users ?? []).map((u) => [u.id, u]));

    lista = (membros ?? []).map((m) => {
      const u = porId.get(m.user_id);
      const dindi = m.households as unknown as { name: string } | null;
      return {
        nome: m.display_name,
        dindi: dindi?.name ?? null,
        papel: m.role === "owner" ? "criou" : "participa",
        entrou_em: m.created_at?.slice(0, 10),
        confirmou_email: Boolean(u?.email_confirmed_at),
        conectou_o_claude: conectados.has(m.user_id),
      };
    });

    // Quem criou login e nunca terminou não aparece na lista acima.
    const semDindi = (usuarios?.users ?? [])
      .filter((u) => !(membros ?? []).some((m) => m.user_id === u.id))
      .map((u) => ({
        nome: "(não terminou o cadastro)",
        entrou_em: u.created_at?.slice(0, 10),
        confirmou_email: Boolean(u.email_confirmed_at),
      }));

    lista = [...(lista as unknown[]), ...semDindi];
  }

  return Response.json({
    ...(querPessoas ? { quem: lista } : {}),
    pessoas: {
      criaram_conta: criaram,
      confirmaram_email: confirmaram,
      // Criou conta e escolheu o nome — passou do onboarding.
      terminaram_cadastro: pessoas,
      conectaram_o_claude: comClaude,
      ligaram_avisos: aparelhos,
    },
    // Onde as pessoas desistem. É o número mais útil da lista.
    perdidos: {
      criaram_mas_nao_confirmaram: criaram - confirmaram,
      confirmaram_mas_nao_terminaram: Math.max(0, confirmaram - pessoas),
      terminaram_mas_nao_conectaram: Math.max(0, pessoas - comClaude),
    },
    uso: {
      dindis: dindis,
      contas_cadastradas: contas,
      lancamentos_total: lancamentos,
      lancamentos_este_mes: lancamentosDoMes,
      metas: metas,
    },
  });
}
