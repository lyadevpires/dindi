"use client";

import { useActionState, useState } from "react";
import { createInvite } from "@/app/auth/actions";

/**
 * Gera o convite para o par entrar na mesma casa.
 *
 * O código sozinho obriga a pessoa a achar o site, criar conta e digitar oito
 * caracteres sem errar. O link já leva ela para a tela certa com o código
 * preenchido — então o que aparece aqui é o link, e o código fica ao lado
 * como plano B para quem preferir ditar por telefone.
 */
export function ConviteBotao({ baseUrl }: { baseUrl: string }) {
  const [state, action, pending] = useActionState(createInvite, null);
  const [copiado, setCopiado] = useState(false);

  const codigo = state?.ok;
  const link = codigo ? `${baseUrl}/comecar?convite=${codigo}` : "";

  async function mandar() {
    // No celular isso abre o WhatsApp, a mensagem, o que a pessoa escolher.
    if (navigator.share) {
      try {
        await navigator.share({ text: `Vem cuidar do nosso dinheiro comigo no dindi: ${link}` });
        return;
      } catch {
        // Fechou o menu sem escolher nada. Cai na cópia, que nunca falha feio.
      }
    }
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  if (codigo) {
    return (
      <div className="rounded-xl border border-borda bg-white p-4">
        <p className="text-sm text-suave">
          Manda esse link pro seu par. Ele clica, cria a conta dele e já cai aqui dentro.
        </p>

        <p className="mt-2 select-all break-all rounded-lg bg-areia px-3 py-2 font-mono text-xs">
          {link}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={mandar}
            className="rounded-lg bg-tinta px-3.5 py-2 text-sm font-medium text-creme transition hover:opacity-90"
          >
            {copiado ? "Link copiado!" : "Mandar o convite"}
          </button>
          <span className="text-xs text-suave">
            ou dite o código <span className="font-mono font-medium text-tinta">{codigo}</span>
          </span>
        </div>

        <p className="mt-3 text-xs text-suave">Vale por 30 dias.</p>
      </div>
    );
  }

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-borda bg-white px-3.5 py-2 text-sm font-medium transition hover:bg-areia disabled:opacity-60"
      >
        {pending ? "Gerando..." : "Convidar meu par"}
      </button>
      {state?.error ? (
        <p className="mt-2 text-sm text-vermelhinho">{state.error}</p>
      ) : null}
    </form>
  );
}
