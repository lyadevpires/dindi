"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * A barra de baixo — a navegação do dindi.
 *
 * Antes eram sete abas no topo, rolando de lado: cara de site aberto no
 * celular, não de aplicativo. Quem usa o dindi usa no celular, e no celular a
 * navegação mora onde o polegar alcança.
 *
 * Só quatro destinos ficam à mão, porque é o que cabe sem virar sopa de
 * letrinha; o resto entra pelo Menu. E o + fica no meio, elevado: é a ação que
 * a pessoa faz todo dia, e é a única que não é "ir para algum lugar".
 */

const ABAS = [
  { href: "/", label: "Início", icone: Casinha },
  { href: "/extrato", label: "Extrato", icone: Lista },
  { href: "/cartoes", label: "Cartões", icone: Cartao },
];

const NO_MENU = [
  { href: "/saude", label: "Saúde do seu dinheiro", dica: "sua nota e de onde ela sai" },
  { href: "/conquistas", label: "Conquistas", dica: "o que você já conseguiu" },
  { href: "/reserva", label: "Montar minha reserva", dica: "onde deixar e como começar" },
  { href: "/fixas", label: "Contas fixas", dica: "o que chega todo mês" },
  { href: "/orcamento", label: "Orçamento", dica: "seus limites do mês" },
  { href: "/metas", label: "Metas", dica: "reserva e sonhos" },
  { href: "/ajustes", label: "Ajustes", dica: "seu dindi, senha e avisos" },
  { href: "/conectar", label: "Conectar o Claude", dica: "para anotar falando" },
  { href: "/privacidade", label: "Privacidade", dica: "o que fica guardado" },
];

export function Barra({ lancar, sair }: { lancar: React.ReactNode; sair: React.ReactNode }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDialogElement>(null);

  // Trocar de tela tem que fechar o menu — senão ele fica por cima da página nova.
  useEffect(() => {
    menu.current?.close();
  }, [pathname]);

  const noMenu = NO_MENU.some((i) => pathname.startsWith(i.href) && i.href !== "/");

  return (
    <>
      {/*
        Barra flutuante: descolada das bordas, branca e sólida, com uma sombra
        que a levanta do fundo. Cara de aplicativo, não de rodapé de site.
      */}
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

          <li>
            <button
              type="button"
              onClick={() => menu.current?.showModal()}
              className={`flex w-[4.25rem] flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition ${
                noMenu ? "text-tinta" : "text-apagado"
              }`}
            >
              <Tracos ativa={noMenu} />
              <span className="fonte-display text-[10px] font-semibold leading-none">Menu</span>
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        ref={menu}
        onClick={(e) => {
          if (e.target === menu.current) menu.current?.close();
        }}
        className="folha m-0 mt-auto w-full max-w-none rounded-t-3xl border-t border-borda bg-creme p-0 text-tinta sm:mx-auto sm:max-w-lg"
      >
        <div
          className="px-5 pb-6 pt-3"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        >
          <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-borda" />

          <ul className="space-y-1">
            {NO_MENU.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 transition hover:bg-areia"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{i.label}</span>
                    <span className="block text-sm text-suave">{i.dica}</span>
                  </span>
                  <span aria-hidden className="shrink-0 text-suave">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-borda pt-4">
            {sair}
            <button
              type="button"
              onClick={() => menu.current?.close()}
              className="rounded-xl px-4 py-2.5 text-sm text-suave transition hover:bg-areia"
            >
              Fechar
            </button>
          </div>
        </div>
      </dialog>
    </>
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
/* Desenhados aqui à mão, do mesmo jeito que o porquinho: traço grosso */
/* e arredondado, sem biblioteca de ícone junto. A aba ativa ganha um  */
/* preenchimento rosa — a cor da pele do dindi — em vez de mudar de    */
/* forma, para o olho não perder o lugar ao trocar de tela.            */
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
