import { Client } from "pg";
import { MIGRATIONS } from "@/lib/migrations.generated";

export type ResultadoMigracao =
  | { ok: true; aplicados: string[] }
  | { ok: false; error: string; parou_em: string | null; aplicados: string[] };

/**
 * Aplica o SQL versionado do repositório no banco.
 *
 * Mora aqui, e não dentro da rota, porque duas portas chamam a mesma coisa: a
 * rota `/api/setup` (protegida pelo CRON_SECRET, para o deploy) e o botão de
 * dono em Ajustes (protegido pelo login). As duas rodam exatamente as mesmas
 * migrações — nunca SQL vindo de fora —, e repetir é seguro: os arquivos usam
 * `if not exists` / `or replace`.
 */
export async function aplicarMigracoes(): Promise<ResultadoMigracao> {
  const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!url) {
    return {
      ok: false,
      error:
        "Não achei POSTGRES_URL_NON_POOLING. Confira a integração do Supabase na Vercel.",
      parou_em: null,
      aplicados: [],
    };
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
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      parou_em: MIGRATIONS[aplicados.length]?.nome ?? null,
      aplicados,
    };
  } finally {
    await client?.end().catch(() => {});
  }

  return { ok: true, aplicados };
}
