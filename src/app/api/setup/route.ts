import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/oauth";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Aplica os arquivos de `supabase/*.sql` no banco, em ordem.
 *
 * Existe porque quem cuida do dindi não abre terminal nem painel de banco:
 * o próprio site sabe se instalar. Só roda com o CRON_SECRET no cabeçalho.
 *
 * É seguro repetir — os arquivos usam `if not exists` / `or replace`.
 * E não executa SQL de fora: só o que está versionado no repositório.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  if (!provided || !safeEqual(provided, env.cronSecret)) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }

  const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!url) {
    return Response.json(
      { error: "Falta POSTGRES_URL_NON_POOLING. Confira a integração do Supabase na Vercel." },
      { status: 500 }
    );
  }

  const dir = join(process.cwd(), "supabase");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const aplicados: string[] = [];
  try {
    for (const file of files) {
      await client.query(await readFile(join(dir, file), "utf8"));
      aplicados.push(file);
    }
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "erro desconhecido",
        parou_em: files[aplicados.length],
        aplicados,
      },
      { status: 500 }
    );
  } finally {
    await client.end();
  }

  return Response.json({ ok: true, aplicados });
}
