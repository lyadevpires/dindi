import Link from "next/link";
import { Anel } from "@/components/anel";
import { Card, Progress, SectionTitle } from "@/components/ui";
import { Dindi } from "@/components/dindi";
import { pageCtx } from "@/lib/ctx";
import { getRetratoDoMes, montarConselhos } from "@/lib/db/conselhos";
import { calcularSaude } from "@/lib/db/saude";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saúde do seu dinheiro — dindi" };

/**
 * A saúde do dinheiro em uma tela.
 *
 * O anel responde "estou indo bem?" de relance; a lista embaixo responde
 * "por quê?" e "o que eu faço?". Sem a segunda parte a nota seria só um
 * número bonito, e número sem explicação ninguém acredita — com razão.
 */
export default async function SaudePage() {
  const { ctx } = await pageCtx();
  const retrato = await getRetratoDoMes(ctx);
  const saude = calcularSaude(retrato);
  const conselho = montarConselhos(retrato)[0];

  return (
    <>
      <section className="mb-8 text-center">
        <Anel pilares={saude.pilares} nota={saude.nota} />
        <h1 className="mt-4 text-lg font-semibold tracking-tight">
          Saúde do seu dinheiro
        </h1>
        <p className="mt-1 text-sm text-suave">
          {saude.nota === null
            ? "Assim que houver o que medir, a nota aparece aqui."
            : `${saude.medidos} de ${saude.pilares.length} pontos medidos hoje`}
        </p>
      </section>

      {/* O recado do porquinho, no rosa dele. */}
      {conselho ? (
        <section className="mb-8 rounded-2xl bg-rosinha/60 p-5">
          <div className="flex items-start gap-3">
            <Dindi
              size={40}
              humor={conselho.nivel === "parabens" ? "comemorando" : "atento"}
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className="font-semibold">{conselho.titulo}</p>
              <p className="justo mt-1 text-sm leading-relaxed">{conselho.texto}</p>

              {conselho.sugestao ? (
                <p className="mt-3 text-sm">
                  <span className="text-tinta/60">Fala pro Claude: </span>
                  <span className="rounded-lg bg-creme px-2.5 py-1 font-medium">
                    &ldquo;{conselho.sugestao}&rdquo;
                  </span>
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <SectionTitle>De onde sai a nota</SectionTitle>
      <div className="space-y-3">
        {saude.pilares.map((p) => (
          <Card key={p.id}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="font-medium">{p.nome}</h2>
              <span className="tabular shrink-0 text-sm">
                {p.nota === null ? (
                  <span className="text-suave">sem dado</span>
                ) : (
                  <>
                    <span className="text-lg font-bold">
                      {p.nota.toFixed(1).replace(".", ",")}
                    </span>
                    <span className="text-suave"> de 10</span>
                  </>
                )}
              </span>
            </div>

            <Progress percent={p.nota === null ? 0 : p.nota * 10} tone="tinta" />

            <p className="justo mt-2 text-sm leading-relaxed text-suave">{p.porque}</p>
            <p className="mt-1 text-xs text-suave">vale {p.peso}% da nota</p>
          </Card>
        ))}
      </div>

      <p className="justo mt-6 text-sm leading-relaxed text-suave">
        Ponto sem dado não vira nota baixa: ele fica de fora da conta e o peso dele se
        divide entre os outros. Dar nota ruim para quem acabou de chegar seria mentira.
      </p>

      <p className="mt-6 text-center">
        <Link href="/" className="text-sm text-suave underline underline-offset-2">
          Voltar para o início
        </Link>
      </p>
    </>
  );
}
