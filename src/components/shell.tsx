import Link from "next/link";
import { Dindi } from "@/components/dindi";
import { signOut } from "@/app/auth/actions";
import type { SessionInfo } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/extrato", label: "Extrato" },
  { href: "/cartoes", label: "Cartões" },
  { href: "/orcamento", label: "Orçamento" },
  { href: "/metas", label: "Metas" },
  { href: "/casa", label: "Casa" },
];

/** Cabeçalho + navegação, usado em todas as telas de dentro. */
export function Shell({
  session,
  active,
  children,
}: {
  session: SessionInfo;
  active: string;
  children: React.ReactNode;
}) {
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
              {session.displayName} · {session.householdName}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg px-2.5 py-1.5 text-suave transition hover:bg-areia"
              >
                Sair
              </button>
            </form>
          </div>
        </div>

        <nav className="mx-auto w-full max-w-5xl overflow-x-auto px-5">
          <ul className="flex gap-1 pb-2">
            {NAV.map((item) => {
              const isActive = item.href === active;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`inline-block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      isActive ? "bg-tinta text-creme" : "text-suave hover:bg-areia"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">{children}</main>

      <footer className="mx-auto w-full max-w-5xl px-5 py-8 text-center text-xs text-suave">
        Para registrar gastos, converse com o Claude.{" "}
        <Link href="/conectar" className="underline underline-offset-2">
          Como conectar
        </Link>
      </footer>
    </>
  );
}
