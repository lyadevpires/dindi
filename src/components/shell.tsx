"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dindi } from "@/components/dindi";
import { Barra } from "@/components/barra";
import { Sino } from "@/components/sino";

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
  sair,
  aviso,
  lancar,
  ultimoAviso,
  children,
}: {
  sair: React.ReactNode;
  aviso?: React.ReactNode;
  lancar: React.ReactNode;
  /** Data do aviso mais recente, para o sino saber se tem novidade. */
  ultimoAviso: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      {/*
        Cabeçalho enxuto: o porquinho como ícone e o sino. Nada de nome de
        pessoa nem de dindi — quem está logado já sabe de quem é a conta, e
        isso mora em Ajustes.
      */}
      <header className="sticky top-0 z-30 border-b border-borda bg-creme/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" aria-label="Início" className="-ml-1 flex items-center">
            <Dindi size={34} humor="feliz" />
          </Link>
          <Sino ultimoAviso={ultimoAviso} />
        </div>
      </header>

      {/*
        O padding de baixo é o espaço da barra: sem ele, o último cartão de
        cada tela fica escondido atrás dela.
      */}
      <main
        className="mx-auto w-full max-w-2xl flex-1 px-5 py-6"
        style={{ paddingBottom: "calc(7.75rem + env(safe-area-inset-bottom))" }}
      >
        {/* Na própria tela de conectar o lembrete seria piada. */}
        {pathname === "/conectar" ? null : aviso}
        {children}
      </main>

      <Barra lancar={lancar} sair={sair} />
    </>
  );
}
