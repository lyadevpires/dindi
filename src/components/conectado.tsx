import Link from "next/link";
import { Dindi } from "@/components/dindi";

/**
 * A festa de quando o Claude conecta.
 *
 * É o momento em que a pessoa deixa de configurar e começa a usar — vale
 * confete, o porquinho pulando e um selo verde de "pronto". Depois disso a
 * própria tela diz: agora é só falar, não tem mais nada pra fazer aqui.
 */

const CONFETES = [
  { left: "10%", cor: "#F2A69B", delay: "0ms" },
  { left: "26%", cor: "#E8C46A", delay: "340ms" },
  { left: "42%", cor: "#8FBF9F", delay: "680ms" },
  { left: "58%", cor: "#A9B7E8", delay: "1020ms" },
  { left: "74%", cor: "#F2A69B", delay: "1360ms" },
  { left: "90%", cor: "#E8C46A", delay: "1700ms" },
];

export function Conectado({ nome }: { nome: string }) {
  return (
    <section className="relative mb-8 overflow-hidden pt-4 text-center">
      {/* Confete caindo. */}
      {CONFETES.map((c, i) => (
        <span
          key={i}
          aria-hidden
          className="confete pointer-events-none absolute top-0 h-3 w-2 rounded-[2px]"
          style={{ left: c.left, background: c.cor, animationDelay: c.delay }}
        />
      ))}

      {/* O porquinho no círculo verde, com o selo de pronto. */}
      <div className="relative mx-auto mt-2 flex h-[140px] w-[140px] items-center justify-center rounded-full bg-verdinho-claro">
        <Dindi size={140} humor="comemorando" className="festa-pig" />
        <span
          aria-hidden
          className="selo-pronto absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_6px_16px_-6px_rgba(37,160,90,0.8)]"
          style={{ background: "#25A05A" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
      </div>

      <h1 className="fonte-display mt-5 text-[28px] font-extrabold tracking-tight">
        O Claude está conectado
      </h1>
      <p className="mx-auto mt-2 max-w-[19rem] text-sm leading-relaxed text-suave">
        Agora é só falar, {nome}. Conte um gasto na conversa com o Claude e ele aparece
        aqui — você não precisa fazer mais nada nesta tela.
      </p>

      <Link
        href="/"
        className="fonte-display mt-6 block w-full rounded-[20px] bg-tinta px-5 py-4 text-center text-[15px] font-bold text-creme transition hover:opacity-90 active:scale-[0.99]"
      >
        Ver meu painel
      </Link>
    </section>
  );
}
