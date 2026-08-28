"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Dindi } from "@/components/dindi";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/extrato", label: "Extrato" },
  { href: "/cartoes", label: "Cartões" },
  { href: "/orcamento", label: "Orçamento" },
  { href: "/metas", label: "Metas" },
  { href: "/ajustes", label: "Ajustes" },
];

/**
 * Cabeçalho + navegação.
 *
 * Fica no layout (não em cada página), então ele não é remontado a cada
 * clique: o menu continua na tela e só o miolo troca. É por isso que ele é
 * componente de cliente — precisa saber em que página você está sem uma nova
 * ida ao servidor.
 */
export function Shell({
  displayName,
  householdName,
  sair,
  aviso,
  children,
}: {
  displayName: string;
  householdName: string;
  sair: React.ReactNode;
  aviso?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      <header className="border-b border-borda bg-creme/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Dindi size={30} />
            <span className="text-lg font-bold tracking-tight">dindi</span>
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-suave sm:inline">
              {displayName} · {householdName}
            </span>
            {sair}
          </div>
        </div>

        <nav className="mx-auto w-full max-w-5xl overflow-x-auto px-5">
          <ul className="flex gap-1 pb-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    item.href === pathname
                      ? "bg-tinta text-creme"
                      : "text-suave hover:bg-areia"
                  }`}
                >
                  {item.label}
                  <Carregando />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">
        {/* Na própria tela de conectar o lembrete seria piada. */}
        {pathname === "/conectar" ? null : aviso}
        {children}
      </main>

      {/* O pb extra é o espaço do botão de anotar, que flutua por cima. */}
      <footer className="mx-auto w-full max-w-5xl px-5 pb-28 pt-8 text-center text-xs text-suave">
        Dá para anotar no <strong className="font-medium">+</strong> aí do lado, ou só
        contar pro Claude.{" "}
        <Link href="/conectar" className="underline underline-offset-2">
          Como conectar
        </Link>
      </footer>
    </>
  );
}

/** Bolinha girando dentro do item clicado, para o clique responder na hora. */
function Carregando() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60"
    />
  );
}
