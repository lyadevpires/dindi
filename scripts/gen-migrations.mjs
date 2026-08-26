/**
 * Transforma os arquivos de supabase/*.sql num módulo TypeScript.
 *
 * Assim a rota /api/setup não depende de achar arquivo em disco dentro
 * do servidor — o SQL viaja junto com o código. Roda no prebuild.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const raiz = join(import.meta.dirname, "..");
const dir = join(raiz, "supabase");
const destino = join(raiz, "src", "lib", "migrations.generated.ts");

const arquivos = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const corpo = arquivos
  .map((f) => `  { nome: ${JSON.stringify(f)}, sql: ${JSON.stringify(readFileSync(join(dir, f), "utf8"))} },`)
  .join("\n");

writeFileSync(
  destino,
  `// GERADO AUTOMATICAMENTE por scripts/gen-migrations.mjs — não edite à mão.
// Edite os arquivos em supabase/ e rode \`npm run build\`.

export const MIGRATIONS: { nome: string; sql: string }[] = [
${corpo}
];
`
);

console.log(`migrations.generated.ts: ${arquivos.length} arquivo(s) — ${arquivos.join(", ")}`);
