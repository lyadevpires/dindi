"use client";

import { useActionState } from "react";
import { createInvite } from "@/app/auth/actions";

/** Gera um código para o par entrar na mesma casa. */
export function ConviteBotao() {
  const [state, action, pending] = useActionState(createInvite, null);

  return (
    <form action={action}>
      {state?.ok ? (
        <div className="rounded-xl border border-borda bg-white p-4">
          <p className="text-sm text-suave">
            Mande este código para seu par. Ele usa em{" "}
            <span className="font-medium text-tinta">dindi &rarr; Entrar na casa do meu par</span>:
          </p>
          <p className="mt-2 select-all font-mono text-2xl font-bold tracking-widest">
            {state.ok}
          </p>
          <p className="mt-2 text-xs text-suave">Vale por 30 dias.</p>
        </div>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-borda bg-white px-3.5 py-2 text-sm font-medium transition hover:bg-areia disabled:opacity-60"
        >
          {pending ? "Gerando..." : "Convidar meu par"}
        </button>
      )}

      {state?.error ? (
        <p className="mt-2 text-sm text-vermelhinho">{state.error}</p>
      ) : null}
    </form>
  );
}
