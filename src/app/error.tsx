"use client";

import Link from "next/link";
import { Dindi } from "@/components/dindi";

/**
 * A tela de quando algo quebra.
 *
 * Sem ela, o Next mostra em produção uma tela cinza em inglês com um código
 * de erro — que para quem está olhando o próprio dinheiro parece que os dados
 * sumiram. Aqui o porquinho diz que o dinheiro está guardado e oferece o botão
 * de tentar de novo, que resolve a maioria dos casos (rede caindo, servidor
 * acordando).
 */
export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-16 text-center">
      <Dindi size={92} humor="preocupado" />

      <h1 className="mt-6 text-2xl font-bold tracking-tight">Deu ruim aqui do meu lado</h1>
      <p className="mt-3 text-base leading-relaxed text-suave">
        Alguma coisa quebrou ao montar esta tela. Seus dados estão guardados e
        inteiros — o problema é meu, não seu.
      </p>

      <button
        type="button"
        onClick={reset}
        className="mt-7 w-full max-w-xs rounded-xl bg-tinta px-5 py-3.5 text-base font-semibold text-creme transition hover:opacity-90 active:scale-[0.98]"
      >
        Tentar de novo
      </button>

      <Link href="/" className="mt-3 text-sm text-suave underline underline-offset-2">
        Voltar para o início
      </Link>
    </main>
  );
}
