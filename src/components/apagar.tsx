"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { apagarConta, apagarLancamento } from "@/app/(app)/actions";
import type { ActionState } from "@/app/auth/actions";

/**
 * Apagar em dois toques.
 *
 * No celular não existe "passar o mouse por cima", e um `confirm()` do
 * navegador dentro de um app instalado fica com cara de erro. Então o próprio
 * botão vira a pergunta: o primeiro toque abre "apagar?", o segundo confirma.
 * Os alvos têm o tamanho de dedo, não de cursor.
 */
export function ApagarLancamento({ descricao }: { descricao: string }) {
  const [perguntando, setPerguntando] = useState(false);

  if (!perguntando) {
    return (
      <button
        type="button"
        onClick={() => setPerguntando(true)}
        aria-label={`Apagar ${descricao}`}
        className="shrink-0 rounded-lg px-2.5 py-2 text-sm text-suave transition hover:bg-areia"
      >
        apagar
      </button>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-1">
      <Confirmar />
      <button
        type="button"
        onClick={() => setPerguntando(false)}
        className="rounded-lg px-2.5 py-2 text-sm text-suave transition hover:bg-areia"
      >
        não
      </button>
    </span>
  );
}

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-vermelhinho-claro px-2.5 py-2 text-sm font-medium text-vermelhinho transition hover:brightness-95 disabled:opacity-50"
    >
      {pending ? "apagando" : "apagar?"}
    </button>
  );
}

/** O mesmo botão, para o formulário do extrato. */
export function FormApagarLancamento({
  id,
  descricao,
}: {
  id: string;
  descricao: string;
}) {
  return (
    <form action={apagarLancamento}>
      <input type="hidden" name="id" value={id} />
      <ApagarLancamento descricao={descricao} />
    </form>
  );
}

/**
 * Apagar uma conta, em Ajustes.
 *
 * Diferente do lançamento, este pode dar errado por um motivo que vale
 * explicar (a conta ainda tem gasto dentro), então ele carrega a resposta.
 */
export function ApagarConta({ id, nome }: { id: string; nome: string }) {
  const [estado, acao] = useActionState<ActionState, FormData>(apagarConta, null);
  const [perguntando, setPerguntando] = useState(false);

  return (
    <div className="shrink-0 text-right">
      <form action={acao}>
        <input type="hidden" name="id" value={id} />
        {perguntando ? (
          <span className="flex items-center gap-1">
            <Confirmar />
            <button
              type="button"
              onClick={() => setPerguntando(false)}
              className="rounded-lg px-2.5 py-2 text-sm text-suave transition hover:bg-areia"
            >
              não
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setPerguntando(true)}
            aria-label={`Apagar ${nome}`}
            className="rounded-lg px-2.5 py-2 text-sm text-suave transition hover:bg-areia"
          >
            apagar
          </button>
        )}
      </form>

      {estado?.error ? (
        <p className="mt-1 max-w-[16rem] text-xs text-vermelhinho">{estado.error}</p>
      ) : null}
    </div>
  );
}
