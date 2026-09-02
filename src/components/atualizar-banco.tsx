"use client";

import { useActionState } from "react";
import { atualizarBanco } from "@/app/(app)/ajustes/actions";
import type { ActionState } from "@/app/auth/actions";

/**
 * O botão de dono que aplica as atualizações do banco.
 *
 * Toda vez que uma novidade mexe na estrutura do banco (uma função nova, uma
 * coluna nova), ela só entra em vigor depois de rodar isto. Antes dependia de
 * uma chave de produção guardada na Vercel; agora é um clique.
 */
export function AtualizarBanco() {
  const [estado, acao, pendente] = useActionState<ActionState, FormData>(
    atualizarBanco,
    null
  );

  return (
    <form action={acao}>
      <button
        type="submit"
        disabled={pendente}
        className="inline-flex items-center gap-2 rounded-xl border border-borda px-4 py-2.5 text-sm font-medium transition hover:bg-areia disabled:opacity-60"
      >
        {pendente ? "Atualizando..." : "Atualizar o dindi"}
      </button>

      {estado?.error ? (
        <p className="mt-3 rounded-xl bg-vermelhinho-claro px-3.5 py-2.5 text-sm text-vermelhinho">
          {estado.error}
        </p>
      ) : null}
      {estado?.ok ? (
        <p className="mt-3 rounded-xl bg-verdinho-claro px-3.5 py-2.5 text-sm text-verdinho">
          {estado.ok}
        </p>
      ) : null}
    </form>
  );
}
