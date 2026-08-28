import type { Pilar } from "@/lib/db/saude";

/**
 * O anel da saúde do dinheiro.
 *
 * Um arco por pilar, todos do mesmo tamanho, com uma folga entre eles. Cada
 * arco é desenhado duas vezes: o caminho inteiro em bege — o quanto aquele
 * pilar poderia valer — e por cima, em preto, o quanto ele vale hoje.
 *
 * É por isso que ele funciona sem cor nenhuma: você lê a nota pelo tamanho da
 * parte escura, não por vermelho-amarelo-verde. Um arco quase todo bege é um
 * pilar que precisa de você, e isso se vê de longe, sem legenda.
 */
export function Anel({
  pilares,
  nota,
  tamanho = 240,
}: {
  pilares: Pilar[];
  nota: number | null;
  tamanho?: number;
}) {
  const raio = 42;
  const volta = 2 * Math.PI * raio;
  const folga = 3.2;

  const pedaco = volta / pilares.length;
  const arco = pedaco - folga;

  return (
    <div className="relative mx-auto" style={{ width: tamanho, height: tamanho }}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={
          nota === null
            ? "Ainda sem nota"
            : `Saúde do seu dinheiro: ${nota.toFixed(1).replace(".", ",")} de 10`
        }
      >
        {pilares.map((p, i) => {
          const inicio = i * pedaco;
          // Pilar sem dado fica só com o traço bege: nada a afirmar ainda.
          const cheio = p.nota === null ? 0 : (p.nota / 10) * arco;

          return (
            <g key={p.id}>
              <circle
                cx="50"
                cy="50"
                r={raio}
                fill="none"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${arco} ${volta - arco}`}
                strokeDashoffset={-inicio}
                className="stroke-areia"
              />
              {cheio > 0 ? (
                <circle
                  cx="50"
                  cy="50"
                  r={raio}
                  fill="none"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${cheio} ${volta - cheio}`}
                  strokeDashoffset={-inicio}
                  className="stroke-tinta"
                />
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {nota === null ? (
          <>
            <p className="text-3xl font-bold tracking-tight">—</p>
            <p className="mt-1 max-w-[9rem] text-center text-xs text-suave">
              ainda sem dado para dar nota
            </p>
          </>
        ) : (
          <>
            <p className="tabular text-5xl font-bold tracking-tight">
              {nota.toFixed(1).replace(".", ",")}
            </p>
            <p className="mt-1 text-xs text-suave">de 10</p>
          </>
        )}
      </div>
    </div>
  );
}
