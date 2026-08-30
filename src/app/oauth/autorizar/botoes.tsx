"use client";

import { useFormStatus } from "react-dom";

/**
 * Os botões da tela de permissão.
 *
 * Autorizar conversa com o banco e depois viaja de volta para o Claude — leva
 * um respiro. Sem resposta visual, a pessoa acha que o toque não pegou e
 * clica de novo; com o girinho e o botão travado, ela sabe que está andando.
 */
export function BotaoDeEnvio({
  rotulo,
  rotuloOcupado,
  className,
}: {
  rotulo: string;
  rotuloOcupado: string;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? (
          <span
            aria-hidden
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        {pending ? rotuloOcupado : rotulo}
      </span>
    </button>
  );
}
