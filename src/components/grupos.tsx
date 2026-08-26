import { Card, Empty, SectionTitle } from "@/components/ui";
import { formatBRL } from "@/lib/money";
import type { Bucket } from "@/lib/db/types";

/**
 * O mês dividido em contas fixas, dia a dia, lazer e guardar.
 *
 * É a tela mais importante do dindi: ela responde "o que dá para mexer?".
 * Contas fixas quase não dá; lazer dá na hora.
 */

type Grupo = {
  bucket: Bucket;
  label: string;
  hint: string;
  total: number;
  percent: number;
  categories: { name: string; total: number }[];
};

const COR: Record<string, { barra: string; ponto: string }> = {
  fixo: { barra: "bg-roxinho", ponto: "bg-roxinho" },
  dia_a_dia: { barra: "bg-azulzinho", ponto: "bg-azulzinho" },
  lazer: { barra: "bg-amarelinho", ponto: "bg-amarelinho" },
  guardar: { barra: "bg-verdinho", ponto: "bg-verdinho" },
};

export function Grupos({
  grupos,
  temRenda,
}: {
  grupos: Grupo[];
  temRenda: boolean;
}) {
  const comValor = grupos.filter((g) => g.total > 0);

  return (
    <section className="mb-8">
      <SectionTitle>Para onde foi o dinheiro</SectionTitle>

      {comValor.length === 0 ? (
        <Empty>
          Assim que vocês registrarem os primeiros gastos, eu separo tudo aqui entre o que é
          obrigação e o que é escolha.
        </Empty>
      ) : (
        <Card>
          <ul className="space-y-5">
            {comValor.map((g) => (
              <li key={g.bucket}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${COR[g.bucket].ponto}`} />
                    <span className="font-medium">{g.label}</span>
                    <span className="hidden text-xs text-suave sm:inline">· {g.hint}</span>
                  </div>
                  <span className="tabular shrink-0 font-semibold">{formatBRL(g.total)}</span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-areia">
                  <div
                    className={`h-full rounded-full ${COR[g.bucket].barra}`}
                    style={{ width: `${Math.min(Math.max(g.percent, 2), 100)}%` }}
                  />
                </div>

                <p className="mt-1.5 text-xs text-suave">
                  {g.percent}% {temRenda ? "do que entrou" : "do que se movimentou"}
                  {g.categories.length > 0
                    ? ` · ${g.categories
                        .slice(0, 3)
                        .map((c) => c.name)
                        .join(", ")}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
