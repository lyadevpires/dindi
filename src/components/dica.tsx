"use client";

import { useSyncExternalStore } from "react";
import { Dindi } from "@/components/dindi";

/**
 * O porquinho apontando para alguma coisa.
 *
 * Existe para o momento em que a pessoa abre o app pela primeira vez, olha
 * uma tela vazia e não sabe o que fazer. Em vez de um texto de ajuda que
 * ninguém lê, ele acena e a setinha desce e sobe em cima do botão.
 *
 * Some para sempre depois do primeiro fechamento, e some sozinho quando a
 * pessoa faz o que ele pediu — dica que insiste vira estorvo. O "para sempre"
 * mora no próprio aparelho: é lembrete de interface, não dado de ninguém.
 */
/*
 * Quem já dispensou a dica.
 *
 * Fica fora do React porque a resposta mora no navegador, não no componente.
 * `useSyncExternalStore` é o jeito certo de ler algo assim: no servidor ele
 * responde "já dispensou" (e a dica não aparece no HTML), e no navegador ele
 * responde a verdade — sem aquele pisca-pisca de aparecer e sumir.
 */
const ouvintes = new Set<() => void>();

function assinar(aviso: () => void) {
  ouvintes.add(aviso);
  return () => ouvintes.delete(aviso);
}

function jaDispensou(chave: string): boolean {
  try {
    return localStorage.getItem(chave) !== null;
  } catch {
    // Armazenamento bloqueado: melhor calar do que insistir toda abertura sem
    // nunca conseguir lembrar que foi dispensada.
    return true;
  }
}

export function DicaDoMais({ chave = "dica-mais" }: { chave?: string }) {
  const dispensada = useSyncExternalStore(
    assinar,
    () => jaDispensou(chave),
    () => true
  );

  function dispensar() {
    try {
      localStorage.setItem(chave, "1");
    } catch {
      // Sem memória, ela volta na próxima. Paciência.
    }
    ouvintes.forEach((avisar) => avisar());
  }

  if (dispensada) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-5"
      style={{ bottom: "calc(6.5rem + env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-borda bg-rosinha px-4 py-3 shadow-lg">
        <Dindi size={40} humor="feliz" acena className="shrink-0" />

        <p className="min-w-0 flex-1 text-sm leading-snug">
          Toque no <strong className="font-semibold">+</strong> aqui embaixo para anotar
          seu primeiro gasto.
        </p>

        <button
          type="button"
          onClick={dispensar}
          aria-label="Entendi, pode sumir"
          className="shrink-0 rounded-lg px-2 py-1 text-sm text-tinta/60 transition hover:bg-creme/50"
        >
          ok
        </button>
      </div>

      {/* A setinha, descendo em cima do botão. */}
      <span
        aria-hidden
        className="cutuca pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-2xl leading-none text-rosinha-forte"
      >
        ▼
      </span>
    </div>
  );
}
