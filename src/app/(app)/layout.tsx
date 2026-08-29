import { Shell } from "@/components/shell";
import { BotaoLancar } from "@/components/lancar";
import { AvisoConectar } from "@/components/aviso-conectar";
import { signOut } from "@/app/auth/actions";
import { pageCtx } from "@/lib/ctx";
import { listAccounts, listCategories } from "@/lib/db/finance";
import { today } from "@/lib/dates";

/**
 * Casca das telas de dentro.
 *
 * Estar aqui e não dentro de cada página faz o cabeçalho e o menu ficarem de
 * pé durante a navegação: ao clicar numa aba só o miolo é buscado, e o
 * `loading.tsx` ao lado preenche o buraco enquanto os números chegam.
 *
 * O botão de anotar também mora aqui: ele acompanha você em qualquer tela.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, ctx } = await pageCtx();
  const [contas, categorias, conexoes, ultimo] = await Promise.all([
    listAccounts(ctx),
    listCategories(ctx),
    ctx.db
      .from("oauth_tokens")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId)
      .eq("token_type", "access")
      .eq("revoked", false),
    // Só a data do aviso mais recente: é tudo que o sino precisa saber, e é
    // uma consulta barata o bastante para rodar em toda tela.
    ctx.db
      .from("alert_log")
      .select("last_sent")
      .eq("household_id", ctx.householdId)
      .order("last_sent", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <Shell
      ultimoAviso={ultimo.data?.last_sent ?? null}
      aviso={(conexoes.count ?? 0) > 0 ? null : <AvisoConectar />}
      lancar={
        <BotaoLancar
          contas={contas.filter((c) => !c.archived)}
          categorias={categorias}
          hoje={today()}
        />
      }
      sair={
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-xl px-4 py-2.5 text-sm text-vermelhinho transition hover:bg-vermelhinho-claro"
          >
            Sair da conta
          </button>
        </form>
      }
    >
      {children}
    </Shell>
  );
}
