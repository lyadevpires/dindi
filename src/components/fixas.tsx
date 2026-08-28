"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { pararFixa } from "@/app/(app)/actions";

/**
 * Parar uma conta fixa.
 *
 * "Parar" e não "apagar": o que já foi lançado nos meses passados continua no
 * extrato, porque aquele dinheiro saiu mesmo. O que acaba é o futuro.
 *
 * Dois toques, como o apagar do extrato — no celular não existe passar o
 * mouse por cima para revelar nada.
 */
export function PararFixa({ id, descricao }: { id: string; descricao: string }) {
  const [perguntando, setPerguntando] = useState(false);

  return (
    <form action={pararFixa} className="shrink-0">
      <input type="hidden" name="id" value={id} />
      {perguntando ? (
        <span className="flex items-center gap-1">
          <Confirmar />
          <button
            type="button"
            onClick={() => setPerguntando(false)}
            className="rounded-lg px-3 py-2.5 text-sm text-suave transition hover:bg-areia"
          >
            não
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setPerguntando(true)}
          aria-label={`Parar ${descricao}`}
          className="rounded-lg px-3 py-2.5 text-sm text-suave transition hover:bg-areia"
        >
          parar
        </button>
      )}
    </form>
  );
}

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-vermelhinho-claro px-3 py-2.5 text-sm font-medium text-vermelhinho transition hover:brightness-95 disabled:opacity-50"
    >
      {pending ? "parando" : "parar?"}
    </button>
  );
}
