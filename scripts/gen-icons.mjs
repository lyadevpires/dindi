/**
 * Desenha os ícones do app a partir do mesmo porquinho do site.
 *
 * Rode à mão (`node scripts/gen-icons.mjs`) quando o desenho mudar — os PNGs
 * ficam versionados. Não entra no build: o celular pede PNG, o build não tem
 * por que redesenhar isso a cada deploy.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

/** O porquinho, em um quadrado de 96 com a cabeça centrada em (48, 38). */
const PORQUINHO = `
  <g stroke="#1C1917" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M35 20C28 9 16 5 12 12c-4 7-1 19 9 26" fill="#FBD5CD"/>
    <path d="M61 20c7-11 19-15 23-8 4 7 1 19-9 26" fill="#FBD5CD"/>
    <path d="M48 13c16.5 0 26.5 9.6 26.5 24.5S64.5 62 48 62 21.5 52.4 21.5 37.5 31.5 13 48 13Z" fill="#FBD5CD"/>
    <ellipse cx="48" cy="44" rx="11.5" ry="8.6" fill="#EE9E9E"/>
  </g>
  <g fill="#1C1917">
    <ellipse cx="37" cy="34" rx="3.6" ry="4"/><ellipse cx="59" cy="34" rx="3.6" ry="4"/>
    <ellipse cx="44.2" cy="44" rx="1.9" ry="2.6"/><ellipse cx="51.8" cy="44" rx="1.9" ry="2.6"/>
  </g>
  <circle cx="38.2" cy="32.6" r="1.2" fill="#fff"/><circle cx="60.2" cy="32.6" r="1.2" fill="#fff"/>
  <ellipse cx="27" cy="42" rx="4.2" ry="2.8" fill="#F3B9AE"/>
  <ellipse cx="69" cy="42" rx="4.2" ry="2.8" fill="#F3B9AE"/>
`;

const CREME = "#FDF6F1";

/**
 * @param escala tamanho do porquinho dentro do quadrado.
 *   1.02 preenche o tile; 0.62 recua para a "zona segura" que o Android exige
 *   nos ícones mascaráveis, onde o sistema pode cortar as bordas em círculo.
 */
const svg = (escala, raio) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="${raio}" fill="${CREME}"/>
  <g transform="translate(48 ${raio === 0 ? 48 : 50}) scale(${escala}) translate(-48 -38)">${PORQUINHO}</g>
</svg>`;

const png = (fonte, tamanho) =>
  sharp(Buffer.from(fonte)).resize(tamanho, tamanho).png().toBuffer();

await mkdir("public", { recursive: true });

const tile = svg(1.02, 20);
const mascaravel = svg(0.62, 0);

await writeFile("public/icon-192.png", await png(tile, 192));
await writeFile("public/icon-512.png", await png(tile, 512));
await writeFile("public/icon-mascara-512.png", await png(mascaravel, 512));
// O iPhone arredonda o ícone por conta própria, então este vai quadrado e cheio.
await writeFile("src/app/apple-icon.png", await png(svg(1.02, 0), 180));

console.log("porquinho desenhado em 192, 512, máscara e apple-icon");
