import Link from "next/link";
import { Dindi } from "@/components/dindi";

export const metadata = { title: "Não achei — dindi" };

/** Endereço que não existe. Acontece com link velho e com dedo errado. */
export default function NaoAchei() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-16 text-center">
      <Dindi size={92} humor="atento" />

      <h1 className="mt-6 text-2xl font-bold tracking-tight">Essa página não existe</h1>
      <p className="mt-3 text-base leading-relaxed text-suave">
        Ou o endereço mudou, ou escapou um dedo. Nada de errado com a sua conta.
      </p>

      <Link
        href="/"
        className="mt-7 w-full max-w-xs rounded-xl bg-tinta px-5 py-3.5 text-base font-semibold text-creme transition hover:opacity-90 active:scale-[0.98]"
      >
        Ir para o início
      </Link>
    </main>
  );
}
