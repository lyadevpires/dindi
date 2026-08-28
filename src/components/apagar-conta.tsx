"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { apagarMinhaConta } from "@/app/(app)/ajustes/actions";
import type { ActionState } from "@/app/auth/actions";

/**
 * Apagar a conta de vez.
 *
 * Fica escondido atrás de um "quero apagar minha conta" e pede a palavra
 * escrita à mão. Não é burocracia: é a única coisa aqui dentro que não tem
 * volta, e um toque errado no celular não pode custar o histórico inteiro.
 */
export function ApagarMinhaConta({ sozinha }: { sozinha: boolean }) {
  const [estado, acao] = useActionState<ActionState, FormData>(apagarMinhaConta, null);
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-sm text-vermelhinho underline underline-offset-2"
      >
        Quero apagar minha conta
      </button>
    );
  }

  return (
    <form action={acao} className="space-y-3">
      <p className="text-sm leading-relaxed text-suave">
        {sozinha ? (
          <>
            Isso apaga <strong className="font-medium text-tinta">tudo</strong>: suas
            contas, lançamentos, faturas, limites e metas. Não tem como voltar atrás e eu
            não guardo cópia.
          </>
        ) : (
          <>
            Como tem mais gente no seu dindi, isso tira só você. Os lançamentos ficam,
            porque o extrato é de todo mundo. Não tem como voltar atrás.
          </>
        )}
      </p>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Escreva APAGAR para confirmar
        </span>
        <input
          name="confirmacao"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="APAGAR"
          className="w-full max-w-xs rounded-xl border border-borda bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-suave/60 focus:border-vermelhinho"
        />
      </label>

      {estado?.error ? (
        <p className="text-sm text-vermelhinho">{estado.error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Confirmar />
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-xl px-3.5 py-2.5 text-sm text-suave transition hover:bg-areia"
        >
          Deixa pra lá
        </button>
      </div>
    </form>
  );
}

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-vermelhinho px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Apagando..." : "Apagar minha conta"}
    </button>
  );
}
