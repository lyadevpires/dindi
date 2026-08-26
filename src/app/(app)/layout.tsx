import { Shell } from "@/components/shell";
import { BotaoLancar } from "@/components/lancar";
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
  const [contas, categorias] = await Promise.all([listAccounts(ctx), listCategories(ctx)]);

  return (
    <Shell
      displayName={session.displayName}
      householdName={session.householdName}
      sair={
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg px-2.5 py-1.5 text-suave transition hover:bg-areia"
          >
            Sair
          </button>
        </form>
      }
    >
      {children}

      <BotaoLancar
        contas={contas.filter((c) => !c.archived)}
        categorias={categorias}
        hoje={today()}
      />
    </Shell>
  );
}
