import { PrimeirosPassos } from "@/components/primeiros-passos";
import { pageCtx } from "@/lib/ctx";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Primeiros passos — dindi" };

export default async function PrimeirosPassosPage() {
  const { session, ctx } = await pageCtx();

  // Quem já conectou o Claude não precisa ver esse passo de novo.
  const { count } = await ctx.db
    .from("oauth_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.userId)
    .eq("token_type", "access")
    .eq("revoked", false);

  return (
    <PrimeirosPassos
      nome={session.displayName}
      url={`${appUrl()}/api/mcp`}
      conectado={(count ?? 0) > 0}
    />
  );
}
