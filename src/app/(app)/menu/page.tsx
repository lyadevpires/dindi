import Link from "next/link";
import { Dindi } from "@/components/dindi";
import { signOut } from "@/app/auth/actions";
import { pageCtx } from "@/lib/ctx";
import { claudeConectado } from "@/lib/auth";
import { diasDesde } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Item = { href: string; label: string; dica: string; cor: { bg: string; fg: string } };

const CORES = {
  rosa: { bg: "#FBE3DE", fg: "#C2705F" },
  verde: { bg: "#DDF0E5", fg: "#17915C" },
  azul: { bg: "#E4EDFD", fg: "#2F5AA8" },
  amarelo: { bg: "#FDEFD6", fg: "#B98B2A" },
  roxo: { bg: "#EDE7F5", fg: "#7B62C9" },
} as const;

export default async function Menu() {
  const { session, ctx } = await pageCtx();
  const conectado = await claudeConectado();

  // Há quantos dias essa pessoa está no dindi — para o "N dias com o dindi".
  const { data: membro } = await ctx.db
    .from("household_members")
    .select("created_at")
    .eq("user_id", session.userId)
    .maybeSingle();
  const dias = membro?.created_at ? Math.max(1, diasDesde(membro.created_at)) : null;

  const dinheiro: Item[] = [
    { href: "/saude", label: "Saúde do seu dinheiro", dica: "sua nota e de onde ela sai", cor: CORES.verde },
    { href: "/reserva", label: "Montar minha reserva", dica: "onde deixar e como começar", cor: CORES.azul },
    { href: "/fixas", label: "Contas fixas", dica: "o que chega todo mês", cor: CORES.amarelo },
    { href: "/orcamento", label: "Orçamento", dica: "seus limites do mês", cor: CORES.rosa },
    { href: "/metas", label: "Metas", dica: "reserva e sonhos", cor: CORES.roxo },
  ];

  const dindi: Item[] = [
    { href: "/conquistas", label: "Conquistas", dica: "o que você já conseguiu", cor: CORES.amarelo },
    {
      href: "/conectar",
      label: "Conectar o Claude",
      dica: conectado ? "conectado" : "para anotar falando",
      cor: CORES.verde,
    },
    { href: "/ajustes", label: "Ajustes", dica: "seu dindi, senha e avisos", cor: CORES.azul },
    { href: "/privacidade", label: "Privacidade", dica: "o que fica guardado", cor: CORES.rosa },
  ];

  return (
    <>
      {/* ---------------- Cartão de perfil ---------------- */}
      <Link
        href="/ajustes"
        className="mb-6 flex items-center gap-3 rounded-[24px] bg-white p-4 shadow-[0_2px_10px_-6px_rgba(46,33,28,0.2)] transition active:scale-[0.99]"
      >
        <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] bg-rosinha">
          <Dindi size={42} humor="feliz" className="respira" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="fonte-display truncate text-[16px] font-bold">{session.displayName}</p>
          <p className="truncate text-[12px] text-suave">
            Plano grátis{dias ? ` · ${dias} ${dias === 1 ? "dia" : "dias"} com o dindi` : ""}
          </p>
        </div>
        <span aria-hidden className="shrink-0 text-[#C7B7AC]">
          ›
        </span>
      </Link>

      <Grupo titulo="Seu dinheiro" itens={dinheiro} />
      <Grupo titulo="Seu dindi" itens={dindi} />

      <form action={signOut} className="mt-2 text-center">
        <button
          type="submit"
          className="fonte-display px-4 py-2.5 text-[13px] font-semibold text-link transition active:scale-95"
        >
          Sair da conta
        </button>
      </form>
    </>
  );
}

function Grupo({ titulo, itens }: { titulo: string; itens: Item[] }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.6px] text-fraco">
        {titulo}
      </h2>
      <div className="rounded-[22px] bg-white px-4 shadow-[0_2px_10px_-6px_rgba(46,33,28,0.2)]">
        <ul className="divide-y divide-borda">
          {itens.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="flex items-center gap-3 py-3">
                <span
                  className="fonte-display flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] text-[13px] font-bold"
                  style={{ background: i.cor.bg, color: i.cor.fg }}
                >
                  {i.label.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{i.label}</p>
                  <p className="truncate text-[11.5px] text-fraco">{i.dica}</p>
                </div>
                <span aria-hidden className="shrink-0 text-[15px] text-[#C7B7AC]">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
