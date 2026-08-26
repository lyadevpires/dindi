/**
 * Roda os arquivos .sql de supabase/ no banco, em ordem.
 *
 * Uso: node --env-file=.env.local scripts/migrate.mjs
 *
 * Os arquivos são escritos para poder rodar de novo sem quebrar
 * (create table if not exists, create or replace function, etc).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("Falta POSTGRES_URL_NON_POOLING no .env.local.");
  process.exit(1);
}

const dir = join(import.meta.dirname, "..", "supabase");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

for (const file of files) {
  process.stdout.write(`→ ${file} ... `);
  try {
    await client.query(readFileSync(join(dir, file), "utf8"));
    console.log("ok");
  } catch (err) {
    console.log("ERRO");
    console.error(err.message);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("Banco pronto.");
