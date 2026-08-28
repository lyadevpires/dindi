"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dindi } from "@/components/dindi";
import { Barra } from "@/components/barra";

/**
 * A casca das telas de dentro.
 *
 * Fica no layout (não em cada página), então ela não é remontada a cada
 * toque: a barra continua na tela e só o miolo troca. É por isso que é
 * componente de cliente — precisa saber em que página você está sem uma nova
 * ida ao servidor.
 *
 * O desenho é de aplicativo, não de site: um cabeçalho magro em cima só para
 * dizer onde você está, e a navegação embaixo, na altura do polegar.
 */
export function Shell({
  displayName,
  householdName,
  sair,
  aviso,
  lancar,
  children,
}: {
  displayName: string;
  householdName: string;
  sair: React.ReactNode;
  aviso?: React.ReactNode;
  lancar: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-borda bg-creme/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Dindi size={28} />
            <span className="text-lg font-bold tracking-tight">dindi</span>
          </Link>
          <span className="truncate text-sm text-suave">
            {displayName} · {householdName}
          </span>
        </div>
      </header>

      {/*
        O padding de baixo é o espaço da barra: sem ele, o último cartão de
        cada tela fica escondido atrás dela.
      */}
      <main
        className="mx-auto w-full max-w-2xl flex-1 px-5 py-6"
        style={{ paddingBottom: "calc(6.5rem + env(safe-area-inset-bottom))" }}
      >
        {/* Na própria tela de conectar o lembrete seria piada. */}
        {pathname === "/conectar" ? null : aviso}
        {children}
      </main>

      <Barra lancar={lancar} sair={sair} />
    </>
  );
}
