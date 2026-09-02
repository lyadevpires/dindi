import { env } from "@/lib/env";
import { safeEqual } from "@/lib/oauth";
import { aplicarMigracoes } from "@/lib/db/migrar";

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
 * versionado no repositório (nunca SQL vindo de fora). O mesmo trabalho tem
 * uma segunda porta: o botão de dono em Ajustes, para quem não tem a chave à
 * mão. É seguro repetir: os arquivos usam `if not exists` / `or replace`.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  if (!provided || !safeEqual(provided, env.cronSecret)) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }

  const resultado = await aplicarMigracoes();
  return Response.json(resultado, { status: resultado.ok ? 200 : 500 });
}
