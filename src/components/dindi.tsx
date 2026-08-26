/**
 * O dindi — mascote do app.
 * É uma moedinha com carinha. Desenhado em SVG, sem arquivo de imagem,
 * então dá para mudar cor e tamanho direto por aqui.
 */
export function Dindi({
  size = 40,
  mood = "feliz",
}: {
  size?: number;
  mood?: "feliz" | "atento" | "dormindo";
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="dindi"
    >
      <circle cx="32" cy="33" r="26" fill="#dc9631" />
      <circle cx="32" cy="30" r="26" fill="#f0b556" />
      <circle cx="32" cy="30" r="20" fill="#f7cd85" />

      {mood === "dormindo" ? (
        <>
          <path
            d="M20 28c2.5 2.5 5.5 2.5 8 0"
            stroke="#8a5a1c"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M36 28c2.5 2.5 5.5 2.5 8 0"
            stroke="#8a5a1c"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="24" cy="28" r="3" fill="#5b3a10" />
          <circle cx="40" cy="28" r="3" fill="#5b3a10" />
          <circle cx="25.2" cy="26.8" r="1.1" fill="#fff" />
          <circle cx="41.2" cy="26.8" r="1.1" fill="#fff" />
        </>
      )}

      {mood === "atento" ? (
        <ellipse cx="32" cy="38" rx="3.5" ry="4" fill="#8a5a1c" />
      ) : (
        <path
          d="M26 37c1.8 3 4 4.2 6 4.2s4.2-1.2 6-4.2"
          stroke="#8a5a1c"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      )}

      <circle cx="18.5" cy="35" r="3" fill="#e8825f" opacity="0.35" />
      <circle cx="45.5" cy="35" r="3" fill="#e8825f" opacity="0.35" />
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
