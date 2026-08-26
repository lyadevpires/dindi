import { Shell } from "@/components/shell";
import { signOut } from "@/app/auth/actions";
import { requireSession } from "@/lib/auth";

/**
 * Casca das telas de dentro.
 *
 * Estar aqui e não dentro de cada página faz o cabeçalho e o menu ficarem de
 * pé durante a navegação: ao clicar numa aba só o miolo é buscado, e o
 * `loading.tsx` ao lado preenche o buraco enquanto os números chegam.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

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
    </Shell>
  );
}
