import { Client } from "pg";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/oauth";
import { MIGRATIONS } from "@/lib/migrations.generated";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Monta (ou atualiza) o banco de dados.
 *
 * Existe porque quem cuida do dindi não abre terminal nem painel de banco,
 * e porque as chaves do Supabase ficam trancadas na Vercel — só o próprio
 * deploy consegue enxergá-las. Então o site sabe se instalar sozinho.
 *
 * Só roda com o CRON_SECRET no cabeçalho, e só executa o SQL que está
 * versionado no repositório (nunca SQL vindo de fora).
 * É seguro repetir: os arquivos usam `if not exists` / `or replace`.
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
      {
        error:
          "Não achei POSTGRES_URL_NON_POOLING. Confira a integração do Supabase na Vercel.",
      },
      { status: 500 }
    );
  }

  // O `sslmode=require` da string de conexão sobrescreveria a opção `ssl`
  // abaixo, e o certificado do Supabase é assinado por uma CA própria.
  const limpa = new URL(url);
  limpa.searchParams.delete("sslmode");

  const aplicados: string[] = [];
  let client: Client | null = null;

  try {
    client = new Client({
      connectionString: limpa.toString(),
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    for (const { nome, sql } of MIGRATIONS) {
      await client.query(sql);
      aplicados.push(nome);
    }
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : String(err),
        parou_em: MIGRATIONS[aplicados.length]?.nome ?? null,
        aplicados,
      },
      { status: 500 }
    );
  } finally {
    await client?.end().catch(() => {});
  }

  return Response.json({ ok: true, aplicados });
}
