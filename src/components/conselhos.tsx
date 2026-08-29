import { Dindi, type Humor } from "@/components/dindi";
import { SectionTitle } from "@/components/ui";
import type { Conselho, Nivel } from "@/lib/db/conselhos";

/**
 * Os avisos do dindi na tela inicial.
 *
 * A regra: mostrar no máximo três, começando pelo mais grave. O objetivo
 * é a pessoa agir, e ninguém age diante de uma lista de dez problemas.
 */

const ESTILO: Record<Nivel, { borda: string; fundo: string; texto: string; etiqueta: string }> = {
  urgente: {
    borda: "border-vermelhinho/30",
    fundo: "bg-vermelhinho-claro",
    texto: "text-vermelhinho",
    etiqueta: "Precisa de atenção agora",
  },
  atencao: {
    borda: "border-amarelinho/30",
    fundo: "bg-amarelinho-claro",
    texto: "text-amarelinho",
    etiqueta: "Dá tempo de ajeitar",
  },
  dica: {
    borda: "border-azulzinho/30",
    fundo: "bg-azulzinho-claro",
    texto: "text-azulzinho",
    etiqueta: "Próximo passo",
  },
  parabens: {
    borda: "border-verdinho/30",
    fundo: "bg-verdinho-claro",
    texto: "text-verdinho",
    etiqueta: "Deu certo",
  },
};

const HUMOR: Record<Nivel, Humor> = {
  urgente: "preocupado",
  atencao: "atento",
  dica: "feliz",
  parabens: "comemorando",
};

export function Conselhos({ itens }: { itens: Conselho[] }) {
  if (itens.length === 0) return null;

  const mostrar = itens.slice(0, 3);
  const sobrando = itens.length - mostrar.length;

  return (
    <section className="mb-8">
      <SectionTitle>O dindi reparou</SectionTitle>

      <div className="space-y-3">
        {mostrar.map((c) => {
          const e = ESTILO[c.nivel];
          return (
            <div key={c.id} className={`rounded-2xl border ${e.borda} ${e.fundo} p-5`}>
              <div className="flex items-start gap-3">
                <Dindi size={58} humor={HUMOR[c.nivel]} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${e.texto}`}>
                    {e.etiqueta}
                  </p>
                  <h3 className="mt-1 font-semibold">{c.titulo}</h3>
                  <p className="justo mt-1.5 text-sm leading-relaxed text-suave">{c.texto}</p>

                  {c.sugestao ? (
                    <p className="mt-3 text-sm text-suave">
                      Fala pro Claude:{" "}
                      <span className="select-all rounded-lg bg-white/70 px-2 py-1 font-medium text-tinta">
                        &ldquo;{c.sugestao}&rdquo;
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sobrando > 0 ? (
        <p className="mt-3 text-sm text-suave">
          Tem mais {sobrando === 1 ? "uma coisa" : `${sobrando} coisas`} que eu queria te contar —
          é só perguntar pro Claude <em>&ldquo;como estão minhas finanças?&rdquo;</em>.
        </p>
      ) : null}
    </section>
  );
}
