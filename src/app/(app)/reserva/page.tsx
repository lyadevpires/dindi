import Link from "next/link";
import { Card, SectionTitle } from "@/components/ui";
import { Dindi } from "@/components/dindi";
import { pageCtx } from "@/lib/ctx";
import { getRetratoDoMes } from "@/lib/db/conselhos";
import { formatBRL } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Como montar sua reserva — dindi" };

/**
 * O guia da reserva de emergência.
 *
 * O dindi já sabia dizer "junte oito mil". Faltava a parte que a pessoa
 * realmente não sabe: onde é que se deixa esse dinheiro, e como não gastá-lo
 * sem querer no caminho.
 *
 * Sobre o limite disto aqui: são critérios e hábito, não indicação de produto
 * nem de banco. Dizer "põe no produto tal" seria recomendação de investimento,
 * e isso é trabalho de gente registrada para fazer isso — não de um app de
 * anotar gasto. O texto do fim diz isso à pessoa, com todas as letras.
 */
const CRITERIOS = [
  {
    titulo: "Dá para sacar hoje",
    texto:
      "Emergência não marca hora. Se o dinheiro leva dias para cair na conta, ou tem multa para sair antes do prazo, ele não serve para isso — por melhor que pareça.",
  },
  {
    titulo: "Não pode oscilar",
    texto:
      "Reserva não é lugar de arriscar. Ela existe justamente para o dia em que tudo deu errado, e nesse dia ela não pode valer menos do que você guardou.",
  },
  {
    titulo: "Longe da conta do dia a dia",
    texto:
      "Esse é o que mais importa e o que ninguém fala. Dinheiro que aparece no saldo junto com o resto vira gasto sem você perceber. Tem que estar em outro lugar, com outro nome, dando um pouquinho de trabalho para resgatar.",
  },
];

const PASSOS = [
  {
    titulo: "Separe no dia que o dinheiro entra",
    texto:
      "Não no fim do mês, com o que sobrar — porque não sobra. No dia seguinte ao salário cair, antes de qualquer coisa.",
  },
  {
    titulo: "Comece pequeno e fixo",
    texto:
      "Um valor pequeno todo mês vence um valor grande de vez em quando. O que constrói reserva é a repetição, não o tamanho.",
  },
  {
    titulo: "Dê um nome para ela",
    texto:
      "A maioria dos bancos deixa você separar dinheiro em potinhos com nome — caixinha, cofrinho, objetivo, cada um chama de um jeito. Batize de “emergência”. Dinheiro com nome é muito mais difícil de gastar.",
  },
  {
    titulo: "Automatize e esqueça",
    texto:
      "Se der para deixar programado para separar sozinho todo mês, deixe. A melhor reserva é a que você não precisa lembrar de fazer.",
  },
];

export default async function ReservaPage() {
  const { ctx } = await pageCtx();
  const { reservaIdeal, metas } = await getRetratoDoMes(ctx);

  const jaTem = metas.find((m) => m.kind === "emergencia");
  const podeCalcular = reservaIdeal && reservaIdeal.months_of_data >= 2;

  return (
    <>
      <section className="mb-8 text-center">
        <Dindi size={96} humor="atento" className="mx-auto" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Como montar sua reserva
        </h1>
        <p className="justo mx-auto mt-2 max-w-md text-sm leading-relaxed text-suave">
          Reserva de emergência é o dinheiro que impede que um pneu furado, um dente
          quebrado ou um mês sem trabalho virem dívida no cartão. É a primeira coisa a
          fazer — antes de qualquer sonho.
        </p>
      </section>

      {/* De quanto, quando dá para afirmar. */}
      {podeCalcular ? (
        <Card className="mb-8">
          <p className="text-xs uppercase tracking-wide text-suave">No seu caso</p>
          <p className="tabular mt-1 text-2xl font-bold">{formatBRL(reservaIdeal.ideal)}</p>
          <p className="justo mt-2 text-sm leading-relaxed text-suave">
            São seis meses do que a sua vida custa hoje ({formatBRL(reservaIdeal.monthly_cost)}{" "}
            por mês, contando o que é obrigação e o básico de viver, sem lazer). Começar
            por {formatBRL(reservaIdeal.minimum)} — três meses — já resolve a maioria dos
            sustos.
          </p>
        </Card>
      ) : (
        <Card className="mb-8">
          <p className="justo text-sm leading-relaxed text-suave">
            Ainda não dá para eu dizer de quanto deveria ser a sua: preciso de uns dois
            meses de gastos anotados para saber quanto a sua vida custa. Enquanto isso, o
            que está escrito aqui embaixo vale igual.
          </p>
        </Card>
      )}

      <SectionTitle>Onde deixar esse dinheiro</SectionTitle>
      <p className="justo mb-4 text-sm leading-relaxed text-suave">
        Não existe um lugar certo único, mas existem três exigências. Qualquer lugar que
        cumpra as três serve; qualquer um que falhe em uma, não.
      </p>
      <div className="mb-8 space-y-3">
        {CRITERIOS.map((c, i) => (
          <Card key={c.titulo}>
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-areia text-sm font-bold">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold">{c.titulo}</h2>
                <p className="justo mt-1 text-sm leading-relaxed text-suave">{c.texto}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <SectionTitle>Como começar de verdade</SectionTitle>
      <div className="mb-8 space-y-3">
        {PASSOS.map((p) => (
          <Card key={p.titulo}>
            <h2 className="font-semibold">{p.titulo}</h2>
            <p className="justo mt-1 text-sm leading-relaxed text-suave">{p.texto}</p>
          </Card>
        ))}
      </div>

      <SectionTitle>Quando usar — e quando não</SectionTitle>
      <Card className="mb-8">
        <p className="justo text-sm leading-relaxed text-suave">
          Usa quando é <strong className="font-medium text-tinta">urgente e imprevisto</strong>:
          remédio, conserto que não dá para adiar, perder a renda. Não usa para promoção
          boa, viagem, presente nem para completar uma compra grande — para essas coisas
          existem as metas, que é outro potinho. Se usou, tudo bem: repor a reserva vira a
          prioridade do mês seguinte.
        </p>
      </Card>

      {/* O convite para o Claude fazer a parte chata. */}
      <Card className="mb-8 bg-rosinha/50">
        <div className="flex items-start gap-3">
          <Dindi size={56} humor="feliz" acena className="shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">
              {jaTem ? "Sua reserva já existe" : "Quer que eu já deixe ela criada?"}
            </p>
            <p className="justo mt-1 text-sm leading-relaxed">
              {jaTem
                ? "Sempre que separar dinheiro, me conta que eu somo e te mostro o quanto falta."
                : "Eu acompanho o quanto já tem e o quanto falta. Você me conta cada vez que separar."}
            </p>
            <p className="mt-3 text-sm">
              <span className="text-tinta/60">Fala pro Claude: </span>
              <span className="rounded-lg bg-creme px-2.5 py-1 font-medium">
                {jaTem
                  ? "“guardei 200 na minha reserva”"
                  : podeCalcular
                    ? `“cria minha reserva de emergência de ${formatBRL(reservaIdeal.ideal)}”`
                    : "“me ajuda a montar minha reserva de emergência”"}
              </span>
            </p>
          </div>
        </div>
      </Card>

      {/*
        O limite, dito com clareza. O app ensina critério e hábito; escolher
        produto e instituição é decisão dela, e conselho de investimento é
        trabalho de quem tem registro para isso.
      */}
      <Card>
        <h2 className="font-semibold">Uma honestidade</h2>
        <p className="justo mt-1 text-sm leading-relaxed text-suave">
          O dindi não indica banco, produto nem investimento, e não sabe qual rende mais —
          isso muda toda hora e é trabalho de quem é registrado para dar esse tipo de
          conselho. O que está aqui são critérios e hábito, que valem em qualquer lugar
          que você escolher. Na hora de escolher onde, pergunte no seu banco quais opções
          atendem as três exigências lá de cima, e compare você mesma.
        </p>
      </Card>

      <p className="mt-6 text-center">
        <Link href="/metas" className="text-sm text-suave underline underline-offset-2">
          Ver minhas metas
        </Link>
      </p>
    </>
  );
}
