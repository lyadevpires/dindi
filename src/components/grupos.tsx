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

const COR: Record<string, { barra: string; ponto: string; traco: string }> = {
  fixo: { barra: "bg-roxinho", ponto: "bg-roxinho", traco: "stroke-roxinho" },
  dia_a_dia: { barra: "bg-azulzinho", ponto: "bg-azulzinho", traco: "stroke-azulzinho" },
  lazer: { barra: "bg-amarelinho", ponto: "bg-amarelinho", traco: "stroke-amarelinho" },
  guardar: { barra: "bg-verdinho", ponto: "bg-verdinho", traco: "stroke-verdinho" },
};

/** "R$ 4,2 mil" — cabe no buraco da rosquinha, que é onde isso vai. */
function curto(valor: number): string {
  if (valor < 1000) return `R$ ${Math.round(valor)}`;
  return `R$ ${(valor / 1000).toFixed(1).replace(".", ",")} mil`;
}

/**
 * O mês inteiro em um desenho só.
 *
 * As barras de baixo comparam cada grupo com o que entrou; a rosquinha compara
 * os grupos entre si. São perguntas diferentes — "cabe no salário?" e "o que
 * está pesando mais?" — então as duas porcentagens não batem de propósito.
 */
function Rosquinha({ fatias }: { fatias: Grupo[] }) {
  const total = fatias.reduce((s, g) => s + g.total, 0);
  if (total <= 0) return null;

  const raio = 42;
  const volta = 2 * Math.PI * raio;

  // Cada fatia precisa saber onde a anterior parou. Calcula tudo antes de
  // desenhar, para o desenho ser só desenho.
  const arcos: { grupo: Grupo; inicio: number; risco: number }[] = [];
  for (let i = 0, percorrido = 0; i < fatias.length; i++) {
    const pedaco = (fatias[i].total / total) * volta;
    // Tira um fiapo de cada fatia para as cores não encostarem umas nas outras.
    arcos.push({ grupo: fatias[i], inicio: percorrido, risco: Math.max(pedaco - 1.5, 0.5) });
    percorrido += pedaco;
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className="mx-auto h-44 w-44 shrink-0"
      role="img"
      aria-label={`Saíram ${curto(total)} no mês: ${fatias
        .map((g) => `${g.label} ${Math.round((g.total / total) * 100)}%`)
        .join(", ")}`}
    >
      <circle cx="50" cy="50" r={raio} fill="none" strokeWidth="11" className="stroke-areia" />
      {arcos.map(({ grupo, inicio, risco }) => (
        <circle
          key={grupo.bucket}
          cx="50"
          cy="50"
          r={raio}
          fill="none"
          strokeWidth="11"
          strokeDasharray={`${risco} ${volta - risco}`}
          strokeDashoffset={-inicio}
          transform="rotate(-90 50 50)"
          className={COR[grupo.bucket].traco}
        />
      ))}
      <text x="50" y="47" textAnchor="middle" className="fill-suave text-[6px]">
        saiu no mês
      </text>
      <text x="50" y="58" textAnchor="middle" className="fill-tinta text-[10px] font-bold">
        {curto(total)}
      </text>
    </svg>
  );
}

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
        <Card className="sm:flex sm:items-center sm:gap-7">
          <Rosquinha fatias={comValor} />
          <ul className="mt-5 flex-1 space-y-5 sm:mt-0">
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
