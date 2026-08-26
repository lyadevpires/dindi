import { redirect } from "next/navigation";
import { Dindi } from "@/components/dindi";
import { getSession, getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isRegisteredRedirect, MCP_SCOPE } from "@/lib/oauth";
import { authorize, denyAuthorization } from "./actions";

export const metadata = { title: "Conectar o Claude — dindi" };
export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16 text-center">
      <Dindi size={56} mood="atento" />
      <h1 className="mt-4 text-xl font-bold">{titulo}</h1>
      <p className="mt-2 text-sm text-suave">{texto}</p>
    </main>
  );
}

/**
 * Tela de permissão do OAuth.
 * O Claude manda a pessoa para cá; ela faz login e autoriza.
 */
export default async function AutorizarPage(props: PageProps<"/oauth/autorizar">) {
  const sp = await props.searchParams;

  const clientId = first(sp.client_id);
  const redirectUri = first(sp.redirect_uri);
  const responseType = first(sp.response_type);
  const state = first(sp.state);
  const codeChallenge = first(sp.code_challenge);
  const codeChallengeMethod = first(sp.code_challenge_method);
  const scope = first(sp.scope) || MCP_SCOPE;
  const resource = first(sp.resource);

  if (first(sp.erro)) {
    return (
      <Aviso
        titulo="Algo não bateu"
        texto="A conexão não pôde ser concluída. Volte no Claude e tente conectar de novo."
      />
    );
  }

  if (!clientId || !redirectUri) {
    return (
      <Aviso
        titulo="Faltou informação"
        texto="Este endereço só funciona quando o Claude te manda para cá. Abra a conexão pelo Claude."
      />
    );
  }

  if (responseType && responseType !== "code") {
    return (
      <Aviso titulo="Tipo de resposta não suportado" texto="Só trabalhamos com response_type=code." />
    );
  }

  const { data: client } = await supabaseAdmin()
    .from("oauth_clients")
    .select("client_id, client_name, redirect_uris")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!client) {
    return (
      <Aviso
        titulo="Aplicativo desconhecido"
        texto="Esse aplicativo não está registrado no dindi. Tente conectar novamente pelo Claude."
      />
    );
  }

  if (!isRegisteredRedirect(client.redirect_uris, redirectUri)) {
    return (
      <Aviso
        titulo="Endereço de retorno inválido"
        texto="Por segurança, só devolvemos para endereços que o aplicativo registrou antes."
      />
    );
  }

  // Precisa estar logado e ter uma casa antes de autorizar.
  const selfUrl = `/oauth/autorizar?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    ...(responseType ? { response_type: responseType } : {}),
    ...(state ? { state } : {}),
    ...(codeChallenge ? { code_challenge: codeChallenge } : {}),
    ...(codeChallengeMethod ? { code_challenge_method: codeChallengeMethod } : {}),
    ...(scope ? { scope } : {}),
    ...(resource ? { resource } : {}),
  }).toString()}`;

  const user = await getUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(selfUrl)}`);

  const session = await getSession();
  if (!session) redirect(`/comecar?next=${encodeURIComponent(selfUrl)}`);

  const hidden = {
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    scope,
    resource,
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
      <div className="rounded-2xl border border-borda bg-white p-6">
        <div className="flex flex-col items-center text-center">
          <Dindi size={56} mood="atento" />
          <h1 className="mt-4 text-xl font-bold tracking-tight">
            Conectar {client.client_name || "o Claude"} ao dindi?
          </h1>
          <p className="mt-2 text-sm text-suave">
            Você está autorizando como <strong className="text-tinta">{session.displayName}</strong>,
            na casa <strong className="text-tinta">{session.householdName}</strong>.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-areia/60 p-4 text-sm">
          <p className="mb-2 font-medium">O que ele vai poder fazer:</p>
          <ul className="space-y-1.5 text-suave">
            <li>• Registrar, editar e apagar gastos e receitas</li>
            <li>• Ver saldos, extrato, faturas do cartão e orçamento</li>
            <li>• Criar e acompanhar metas de economia</li>
          </ul>
          <p className="mt-3 text-xs text-suave">
            Só nesta casa. Você pode desconectar quando quiser em Configurações.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <form action={denyAuthorization} className="flex-1">
            {Object.entries(hidden).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <button
              type="submit"
              className="w-full rounded-xl border border-borda px-4 py-3 text-sm font-semibold transition hover:bg-areia"
            >
              Agora não
            </button>
          </form>

          <form action={authorize} className="flex-1">
            {Object.entries(hidden).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <button
              type="submit"
              className="w-full rounded-xl bg-verdinho px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Permitir
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
