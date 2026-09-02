"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

/**
 * O sino de avisos, no topo.
 *
 * A bolinha acende quando o dindi falou alguma coisa que este aparelho ainda
 * não viu. O "já vi" mora no próprio navegador, e não no banco, de propósito:
 * é estado de leitura, não dado financeiro — e cada aparelho tem o seu, que é
 * como a pessoa espera que funcione.
 */
const CHAVE = "avisos-vistos-ate";
const ouvintes = new Set<() => void>();

function assinar(aviso: () => void) {
  ouvintes.add(aviso);
  return () => ouvintes.delete(aviso);
}

function vistoAte(): string {
  try {
    return localStorage.getItem(CHAVE) ?? "";
  } catch {
    return "";
  }
}

/** Chamado pela tela de avisos: daqui pra frente está tudo lido. */
export function marcarAvisosComoVistos(quando: string) {
  try {
    localStorage.setItem(CHAVE, quando);
  } catch {
    // Sem memória, a bolinha volta. Paciência.
  }
  ouvintes.forEach((avisar) => avisar());
}

export function Sino({ ultimoAviso }: { ultimoAviso: string | null }) {
  // No servidor responde "já viu": assim a bolinha nunca pisca na tela de
  // quem já leu tudo, que é o caso mais comum.
  const visto = useSyncExternalStore(assinar, vistoAte, () => ultimoAviso ?? "");
  const temNovidade = Boolean(ultimoAviso) && (visto === "" || visto < ultimoAviso!);

  return (
    <Link
      href="/avisos"
      aria-label={temNovidade ? "Avisos, tem novidade" : "Avisos"}
      className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[14px] bg-white text-tinta shadow-[0_1px_2px_rgba(46,33,28,0.08)] transition active:scale-95"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5" />
        <path d="M10.4 19a1.9 1.9 0 0 0 3.2 0" />
      </svg>

      {temNovidade ? (
        <span
          aria-hidden
          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-vermelhinho ring-[2.5px] ring-white"
        />
      ) : null}
    </Link>
  );
}

/** Marca tudo como lido ao abrir a tela de avisos. */
export function MarcarVistos({ ultimoAviso }: { ultimoAviso: string | null }) {
  useEffect(() => {
    if (ultimoAviso) marcarAvisosComoVistos(ultimoAviso);
  }, [ultimoAviso]);
  return null;
}
