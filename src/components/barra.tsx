"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

/**
 * A barra de baixo — a navegação do dindi.
 *
 * Quem usa o dindi usa no celular, e no celular a navegação mora onde o polegar
 * alcança. Quatro destinos (Início, Extrato, Cartões, Menu) e o + no meio,
 * elevado: é a ação de todo dia, a única que não é "ir para algum lugar". O
 * Menu é uma tela própria — o resto das telas mora lá dentro.
 */

const ABAS = [
  { href: "/", label: "Início", icone: Casinha },
  { href: "/extrato", label: "Extrato", icone: Lista },
  { href: "/cartoes", label: "Cartões", icone: Cartao },
  { href: "/menu", label: "Menu", icone: Tracos },
];

export function Barra({ lancar }: { lancar: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-3 z-40"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <ul className="mx-auto flex h-16 w-full max-w-lg items-center justify-around rounded-[24px] bg-white px-2 shadow-[0_14px_30px_-16px_rgba(46,33,28,0.4),0_0_0_1px_rgba(46,33,28,0.04)]">
        {ABAS.slice(0, 2).map((a) => (
          <Aba key={a.href} {...a} ativa={ehAtiva(pathname, a.href)} />
        ))}

        {/* O + sobe para fora da barra: é ação, não destino. */}
        <li className="shrink-0">{lancar}</li>

        {ABAS.slice(2).map((a) => (
          <Aba key={a.href} {...a} ativa={ehAtiva(pathname, a.href)} />
        ))}
      </ul>
    </nav>
  );
}

/** A raiz só acende no "/" exato; o resto acende no começo do endereço. */
function ehAtiva(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Aba({
  href,
  label,
  icone: Icone,
  ativa,
}: {
  href: string;
  label: string;
  icone: (p: { ativa: boolean }) => React.ReactElement;
  ativa: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={`flex w-[4.25rem] flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition ${
          ativa ? "text-tinta" : "text-apagado"
        }`}
      >
        <span className="relative">
          <Icone ativa={ativa} />
          <Carregando />
        </span>
        <span className="fonte-display text-[10px] font-semibold leading-none">{label}</span>
      </Link>
    </li>
  );
}

/** Bolinha girando por cima do ícone, para o toque responder na hora. */
function Carregando() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="absolute -right-1.5 -top-1 h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Ícones                                                              */
/*                                                                     */
/* Desenhados à mão, do mesmo jeito que o porquinho: traço grosso e    */
/* arredondado. A aba ativa ganha um preenchimento no rosa de acento — */
/* em vez de mudar de forma, para o olho não perder o lugar.           */
/* ------------------------------------------------------------------ */

function Base({ children, ativa }: { children: React.ReactNode; ativa: boolean }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill={ativa ? "var(--color-rosa)" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function Casinha({ ativa }: { ativa: boolean }) {
  return (
    <Base ativa={ativa}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" />
    </Base>
  );
}

function Lista({ ativa }: { ativa: boolean }) {
  return (
    <Base ativa={ativa}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" />
    </Base>
  );
}

function Cartao({ ativa }: { ativa: boolean }) {
  return (
    <Base ativa={ativa}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" stroke="currentColor" />
    </Base>
  );
}

function Tracos({ ativa }: { ativa: boolean }) {
  return (
    <Base ativa={ativa}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Base>
  );
}
