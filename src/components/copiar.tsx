"use client";

import { useState } from "react";

/**
 * O endereço do dindi com um botão de copiar.
 *
 * Selecionar um endereço comprido com o dedo, sem errar o começo nem o fim, é
 * das coisas mais chatas de fazer no celular — e é justamente o passo em que
 * a pessoa desiste de conectar.
 */
export function CopiarEndereco({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Navegador sem permissão de área de transferência: o texto continua
      // selecionável na mão, que é o comportamento de antes.
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
      <p className="min-w-0 flex-1 select-all break-all rounded-lg bg-areia px-3 py-2.5 font-mono text-sm">
        {url}
      </p>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded-xl bg-tinta px-4 py-2.5 text-sm font-semibold text-creme transition hover:opacity-90 active:scale-[0.98]"
      >
        {copiado ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
