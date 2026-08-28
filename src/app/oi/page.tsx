import Link from "next/link";
import { Dindi } from "@/components/dindi";

/**
 * A porta de entrada de quem nunca ouviu falar do dindi.
 *
 * O proxy manda para cá quem abre o site sem estar logado, sem mudar o
 * endereço — então este é o `dindi.vercel.app` que a pessoa recebe de um
 * amigo ou de um story. Antes ela caía num "Que bom te ver de novo", que só
 * faz sentido para quem já tem conta.
 *
 * Escrito para o polegar: uma coluna, texto grande, e o botão de criar conta
 * aparecendo três vezes ao longo da rolagem.
 */
export const metadata = {
  title: "dindi — seu dinheiro, sem planilha",
};

const PASSOS = [
  {
    numero: "1",
    titulo: "Você fala",
    texto: "Do jeito que contaria pra alguém.",
    exemplos: ["gastei 45 no mercado", "comprei uma cadeira de 900 em 6x"],
  },
  {
    numero: "2",
    titulo: "O dindi anota",
    texto:
      "Ele entende sozinho: escolhe a categoria, joga na fatura certa e divide as parcelas nos meses certos.",
  },
  {
    numero: "3",
    titulo: "Você vê aqui",
    texto:
      "Extrato, faturas, orçamento e metas prontos. E ele te cutuca quando alguma coisa sai do lugar.",
  },
];

const CUIDA = [
  {
    titulo: "Cartão de crédito de gente grande",
    texto:
      "Parcela, fatura que fecha num dia e vence noutro, compra que cai no mês que vem. Ele sabe a diferença.",
  },
  {
    titulo: "Para onde o dinheiro foi",
    texto:
      "Separa o que é obrigação (aluguel, luz) do que é escolha (delivery, rolê). É aí que aparece o que dá pra mudar.",
  },
  {
    titulo: "Reserva de emergência e sonhos",
    texto:
      "Ele calcula o tamanho da sua reserva pelo que você realmente gasta, e diz quanto separar por mês pra viagem sair.",
  },
  {
    titulo: "Um recado de manhã",
    texto:
      "Só quando tem algo que importa: fatura fechando, gasto passando do combinado, meta batida. Se está tudo certo, ele fica quieto.",
  },
];

export default function Oi() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-10 sm:pt-16">
      {/* ---------------- Chamada ---------------- */}
      <section className="text-center">
        <Dindi size={92} humor="feliz" className="mx-auto" />

        <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Seu dinheiro,
          <br />
          sem planilha
        </h1>

        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-suave">
          Você conta o que gastou por mensagem. O dindi anota, organiza e mostra
          aqui — sem categoria pra escolher, sem célula pra preencher.
        </p>

        <Botoes />
      </section>

      {/* ---------------- Como funciona ---------------- */}
      <section className="mt-14">
        <h2 className="text-xl font-bold tracking-tight">Como funciona</h2>

        <ol className="mt-4 space-y-3">
          {PASSOS.map((p) => (
            <li
              key={p.numero}
              className="rounded-2xl border border-borda bg-white p-5 shadow-[0_1px_2px_rgba(44,36,32,0.04)]"
            >
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tinta text-sm font-bold text-creme">
                  {p.numero}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{p.titulo}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-suave">{p.texto}</p>

                  {p.exemplos ? (
                    <div className="mt-3 space-y-1.5">
                      {p.exemplos.map((e) => (
                        <p
                          key={e}
                          className="rounded-xl rounded-br-sm bg-areia px-3.5 py-2 text-sm"
                        >
                          {e}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- O que ele cuida ---------------- */}
      <section className="mt-14">
        <h2 className="text-xl font-bold tracking-tight">O que ele cuida</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CUIDA.map((c) => (
            <div
              key={c.titulo}
              className="rounded-2xl border border-borda bg-white p-5 shadow-[0_1px_2px_rgba(44,36,32,0.04)]"
            >
              <h3 className="font-semibold">{c.titulo}</h3>
              <p className="mt-1 text-sm leading-relaxed text-suave">{c.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Sozinha ou dividindo ---------------- */}
      <section className="mt-14 rounded-2xl bg-areia/60 p-6">
        <h2 className="text-xl font-bold tracking-tight">Sozinha ou dividindo</h2>
        <p className="mt-2 text-sm leading-relaxed text-suave">
          Começa só com você. Se um dia quiser, chama quem divide as contas — o
          marido, a mãe, o irmão, um filho. Ou ninguém. Não tem limite de gente e
          não precisa ser ninguém em especial.
        </p>
      </section>

      {/* ---------------- Fecho ---------------- */}
      <section className="mt-14 text-center">
        <Dindi size={64} humor="comemorando" className="mx-auto" />
        <h2 className="mt-4 text-2xl font-bold tracking-tight">
          Bora organizar isso?
        </h2>
        <p className="mt-2 text-sm text-suave">
          Leva dois minutos e é de graça.
        </p>
        <Botoes />
      </section>
    </main>
  );
}

/** Os dois botões repetidos no começo e no fim, porque no celular a rolagem é longa. */
function Botoes() {
  return (
    <div className="mt-7 flex flex-col items-center gap-3">
      <Link
        href="/criar-conta"
        className="w-full max-w-xs rounded-xl bg-tinta px-5 py-3.5 text-center text-base font-semibold text-creme transition hover:opacity-90 active:scale-[0.98]"
      >
        Criar minha conta
      </Link>
      <Link href="/entrar" className="text-sm text-suave underline underline-offset-2">
        Já tenho conta
      </Link>
    </div>
  );
}
