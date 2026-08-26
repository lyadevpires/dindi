/**
 * O dindi — mascote do app.
 *
 * Um porquinho de gravatinha borboleta segurando uma moeda. Desenhado em SVG
 * na mão, sem arquivo de imagem: fica nítido em qualquer tamanho, serve de
 * favicon e dá para mudar a expressão dele conforme a notícia da tela.
 *
 * As expressões existem porque o dindi dá conselho: ele fica preocupado
 * quando o mês está no vermelho e comemora quando sobra dinheiro guardado.
 */
export type Humor = "feliz" | "atento" | "preocupado" | "comemorando" | "dormindo";

const PELE = "#FBD5CD";
const BOCHECHA = "#F3B9AE";
const FOCINHO = "#EE9E9E";
const TRACO = "#1C1917";

export function Dindi({
  size = 40,
  humor = "feliz",
  className,
}: {
  size?: number;
  humor?: Humor;
  className?: string;
}) {
  const dormindo = humor === "dormindo";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      role="img"
      aria-label="dindi, o porquinho"
      className={className}
    >
      <g stroke={TRACO} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        {/* rabinho de rolha */}
        <path
          d="M63.5 79c5-.5 7.8 1.2 8.2 4.9.3 2.8-1 4.4-4 4.7-2.5.2-3.9-.8-4.1-3.3-.2-1.9.9-3 3-3.2"
          fill="none"
        />

        {/* corpo, patinhas e bracinhos */}
        <path
          d="M30 62c0-3.9 3-6.4 7-6.4h22c4 0 7 2.5 7 6.4v12c0 6.6-5.4 12-12 12H42c-6.6 0-12-5.4-12-12V62Z"
          fill={PELE}
        />
        <path d="M39 86v-3.2c0-2 1.6-3.6 3.6-3.6s3.6 1.6 3.6 3.6V86" fill={PELE} />
        <path d="M49.8 86v-3.2c0-2 1.6-3.6 3.6-3.6S57 80.8 57 82.8V86" fill={PELE} />
        <path d="M30.5 63c-3.8.6-5.7 3.2-5.7 7.9 0 3.2 1.1 5.3 3.4 6.2" fill={PELE} />
        <path d="M65.5 63c3.8.6 5.7 3.2 5.7 7.9 0 3.2-1.1 5.3-3.4 6.2" fill={PELE} />

        {/* orelhas — atrás da cabeça, por isso vêm antes */}
        <path d="M35 20C28 9 16 5 12 12c-4 7-1 19 9 26" fill={PELE} />
        <path d="M61 20c7-11 19-15 23-8 4 7 1 19-9 26" fill={PELE} />

        {/* cabeça */}
        <path
          d="M48 13c16.5 0 26.5 9.6 26.5 24.5S64.5 62 48 62 21.5 52.4 21.5 37.5 31.5 13 48 13Z"
          fill={PELE}
        />
        <ellipse cx="48" cy="44" rx="11.5" ry="8.6" fill={FOCINHO} />

        {/* gravatinha borboleta */}
        <path
          d="M37 68.5c0-3.3 1.2-5 3.6-5 2 0 3.8 1.1 5.4 3.3h4c1.6-2.2 3.4-3.3 5.4-3.3 2.4 0 3.6 1.7 3.6 5s-1.2 5-3.6 5c-2 0-3.8-1.1-5.4-3.3h-4c-1.6 2.2-3.4 3.3-5.4 3.3-2.4 0-3.6-1.7-3.6-5Z"
          fill="#3F3F46"
        />

        {/* a moeda */}
        <circle cx="70" cy="67" r="8.6" fill="#F5C542" />
        <circle cx="70" cy="67" r="5.5" fill="none" stroke="#C89A1E" strokeWidth="1.8" />
        <path
          d="M70 63v8M72.1 64.4c-.6-.7-1.4-1-2.4-1-1.4 0-2.3.7-2.3 1.8s.7 1.5 2.3 1.9c1.7.4 2.5.9 2.5 2s-1 1.9-2.5 1.9c-1 0-1.9-.4-2.6-1.1"
          stroke="#8A6512"
          strokeWidth="1.7"
          fill="none"
        />
      </g>

      {/* olhos */}
      {dormindo || humor === "comemorando" ? (
        <g stroke={TRACO} strokeWidth="2.8" strokeLinecap="round" fill="none">
          <path d={dormindo ? "M33 34c1.7 2.1 4 2.1 5.7 0" : "M33 35c1.7-2.3 4-2.3 5.7 0"} />
          <path d={dormindo ? "M56.3 34c1.7 2.1 4 2.1 5.7 0" : "M56.3 35c1.7-2.3 4-2.3 5.7 0"} />
        </g>
      ) : (
        <>
          <g fill={TRACO}>
            <ellipse cx="37" cy="34" rx="3.6" ry="4" />
            <ellipse cx="59" cy="34" rx="3.6" ry="4" />
          </g>
          {humor === "atento" ? null : (
            <>
              <circle cx="38.2" cy="32.6" r="1.2" fill="#fff" />
              <circle cx="60.2" cy="32.6" r="1.2" fill="#fff" />
            </>
          )}
          {humor === "preocupado" ? (
            <g stroke={TRACO} strokeWidth="2.6" strokeLinecap="round" fill="none">
              <path d="M31.5 26c1.8-1.5 4.1-1.8 6.3-1" />
              <path d="M64.5 26c-1.8-1.5-4.1-1.8-6.3-1" />
            </g>
          ) : null}
        </>
      )}

      {/* narinas */}
      <g fill={TRACO}>
        <ellipse cx="44.2" cy="44" rx="1.9" ry="2.6" />
        <ellipse cx="51.8" cy="44" rx="1.9" ry="2.6" />
      </g>

      {/* bochechas */}
      {humor === "preocupado" ? null : (
        <>
          <ellipse cx="27" cy="42" rx="4.2" ry="2.8" fill={BOCHECHA} />
          <ellipse cx="69" cy="42" rx="4.2" ry="2.8" fill={BOCHECHA} />
        </>
      )}
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Dindi size={size} />
      <span className="text-xl font-bold tracking-tight">dindi</span>
    </span>
  );
}
