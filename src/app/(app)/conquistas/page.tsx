import { Card, Progress, SectionTitle } from "@/components/ui";
import { Dindi } from "@/components/dindi";
import { pageCtx } from "@/lib/ctx";
import { calcularConquistas, type Conquista } from "@/lib/db/conquistas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conquistas — dindi" };

/**
 * As conquistas.
 *
 * Nenhuma delas se ganha usando o app — só melhorando o dinheiro. É de
 * propósito: prêmio por abrir o aplicativo ensina a abrir o aplicativo.
 *
 * As já ganhas ficam em cima e em destaque; as que faltam continuam
 * visíveis, com o texto explicando por que valem a pena. Conquista escondida
 * não motiva ninguém — ela precisa ser vista antes de ser desejada.
 */
export default async function ConquistasPage() {
  const { ctx } = await pageCtx();
  const { conquistas, ganhas, total } = await calcularConquistas(ctx);

  const grupos = [...new Set(conquistas.map((c) => c.grupo))];
  const tudo = ganhas === total;

  return (
    <>
      <section className="mb-8 text-center">
        <Dindi
          size={96}
          humor={tudo ? "comemorando" : ganhas > 0 ? "feliz" : "atento"}
          className={ganhas > 0 ? "pulinho mx-auto" : "mx-auto"}
        />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          {tudo ? "Você conquistou todas" : "Suas conquistas"}
        </h1>
        <p className="tabular mt-1 text-sm text-suave">
          {ganhas} de {total}
        </p>

        <div className="mx-auto mt-4 max-w-xs">
          <Progress percent={(ganhas / total) * 100} tone="tinta" />
        </div>

        <p className="justo mx-auto mt-4 max-w-md text-sm leading-relaxed text-suave">
          Nenhuma delas se ganha usando o dindi — só melhorando o seu dinheiro. Não tem
          ponto por anotar gasto nem sequência por abrir o app: isso ensinaria a abrir o
          app, não a gastar melhor.
        </p>
      </section>

      {grupos.map((g) => (
        <section key={g} className="mb-8">
          <SectionTitle>{g}</SectionTitle>
          <div className="space-y-3">
            {conquistas
              .filter((c) => c.grupo === g)
              .map((c) => (
                <Medalha key={c.id} c={c} />
              ))}
          </div>
        </section>
      ))}
    </>
  );
}

function Medalha({ c }: { c: Conquista }) {
  return (
    <Card className={c.conquistada ? "border-verdinho/30 bg-verdinho-claro" : ""}>
      <div className="flex items-start gap-3">
        {/* Ganha ganha o porquinho; a que falta ganha um círculo vazio. */}
        {c.conquistada ? (
          <Dindi size={44} humor="comemorando" className="shrink-0" />
        ) : (
          <span
            aria-hidden
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-borda text-suave"
          >
            ?
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h2 className={`font-semibold ${c.conquistada ? "text-verdinho" : ""}`}>
            {c.titulo}
          </h2>
          <p className="justo mt-0.5 text-sm leading-relaxed text-suave">{c.texto}</p>

          {!c.conquistada && c.progresso !== undefined && c.progresso > 0 ? (
            <div className="mt-2.5">
              <Progress percent={c.progresso} tone="tinta" />
              <p className="tabular mt-1 text-xs text-suave">{c.progresso}% do caminho</p>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
