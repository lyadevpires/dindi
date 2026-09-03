"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Dindi } from "@/components/dindi";
import { Barra } from "@/components/barra";
import { Sino } from "@/components/sino";

/**
 * A casca das telas de dentro.
 *
 * Fica no layout (não em cada página), então ela não é remontada a cada
 * toque: a barra e o cabeçalho continuam na tela e só o miolo troca. É por
 * isso que é componente de cliente — precisa saber em que página você está.
 *
 * O desenho é de aplicativo: um cabeçalho com o mascote e o nome da tela, dois
 * botões (esconder valores e avisos), e a navegação flutuando embaixo.
 */

/** O nome que aparece no topo, por tela. */
function tituloDaTela(pathname: string): string {
  if (pathname === "/") return "dindi";
  if (pathname.startsWith("/extrato")) return "Extrato";
  if (pathname.startsWith("/cartoes")) return "Cartões";
  if (pathname.startsWith("/ajustes")) return "Seu perfil";
  if (pathname.startsWith("/metas")) return "Metas";
  if (pathname.startsWith("/reserva")) return "Reserva";
  if (pathname.startsWith("/orcamento")) return "Orçamento";
  if (pathname.startsWith("/fixas")) return "Contas fixas";
  if (pathname.startsWith("/saude")) return "Saúde";
  if (pathname.startsWith("/conquistas")) return "Conquistas";
  if (pathname.startsWith("/conectar")) return "Conectar";
  if (pathname.startsWith("/privacidade")) return "Privacidade";
  return "dindi";
}

/*
 * Esconder valores: uma preferência do aparelho, guardada para não voltar a
 * aparecer a cada troca de tela. Mora num pequeno store aqui, no padrão do
 * sino — assim o cabeçalho lê e escreve sem disparar render em cascata, e o
 * servidor sempre renderiza "mostrando" (o cliente ajusta ao montar).
 */
const CHAVE_ESCONDER = "dindi:esconder-valores";
const ouvintes = new Set<() => void>();

function lerEscondido(): boolean {
  try {
    return localStorage.getItem(CHAVE_ESCONDER) === "1";
  } catch {
    return false;
  }
}

function assinarEscondido(aviso: () => void) {
  ouvintes.add(aviso);
  return () => ouvintes.delete(aviso);
}

function alternarEsconder() {
  const novo = !lerEscondido();
  try {
    localStorage.setItem(CHAVE_ESCONDER, novo ? "1" : "0");
  } catch {
    /* navegador sem localStorage: segue mostrando, sem drama */
  }
  ouvintes.forEach((avisar) => avisar());
}

export function Shell({
  aviso,
  lancar,
  ultimoAviso,
  children,
}: {
  aviso?: React.ReactNode;
  lancar: React.ReactNode;
  ultimoAviso: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const titulo = tituloDaTela(pathname);

  // No servidor responde "mostrando"; o cliente ajusta para a preferência salva.
  const escondido = useSyncExternalStore(assinarEscondido, lerEscondido, () => false);

  return (
    <div className={escondido ? "valores-ocultos" : undefined}>
      <header className="sticky top-0 z-30 bg-creme/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-5 pb-3 pt-1.5">
          <Link href="/" aria-label="Início" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-rosinha">
              <Dindi size={27} humor="feliz" className="respira" />
            </span>
            <span className="fonte-display text-[19px] font-bold tracking-[-0.4px]">
              {titulo}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={alternarEsconder}
              aria-label={escondido ? "Mostrar valores" : "Esconder valores"}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[14px] bg-white text-tinta shadow-[0_1px_2px_rgba(46,33,28,0.08)] transition active:scale-95"
            >
              <Olho fechado={escondido} />
            </button>
            <Sino ultimoAviso={ultimoAviso} />
          </div>
        </div>
      </header>

      {/*
        O padding de baixo é o espaço da barra flutuante: sem ele, o último
        cartão de cada tela fica escondido atrás dela.
      */}
      <main
        className="mx-auto w-full max-w-2xl flex-1 px-5 pt-1"
        style={{ paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom))" }}
      >
        {pathname === "/conectar" ? null : aviso}
        {children}
      </main>

      <Barra lancar={lancar} />
    </div>
  );
}

/** O olho que liga/desliga a visibilidade dos valores. Fechado ganha a barra. */
function Olho({ fechado }: { fechado: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      {fechado ? <line x1="3" y1="3" x2="21" y2="21" /> : null}
    </svg>
  );
}
