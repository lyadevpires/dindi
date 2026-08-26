import { redirect } from "next/navigation";
import { ActionForm, Field } from "@/components/auth-form";
import { Logo } from "@/components/dindi";
import { createHousehold, joinHousehold } from "@/app/auth/actions";
import { getSession, getUser } from "@/lib/auth";

export const metadata = { title: "Começar — dindi" };

/**
 * Onboarding: depois de criar a conta, a pessoa cria a casa dela
 * ou entra na casa do parceiro usando um código de convite.
 */
export default async function ComecarPage(props: PageProps<"/comecar">) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/";

  const user = await getUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent("/comecar")}`);

  const session = await getSession();
  if (session) redirect(next);

  const convite = typeof params.convite === "string" ? params.convite : "";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-16">
      <div className="mb-8 text-center">
        <Logo size={44} />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Vamos começar</h1>
        <p className="mt-2 text-sm text-suave">Falta só uma coisa.</p>
      </div>

      <div className="rounded-2xl border border-borda bg-white p-6">
        <ActionForm action={createHousehold} submitLabel="Começar" hidden={{ next }}>
          <Field
            label="Como a gente te chama?"
            name="display_name"
            placeholder="Ex: Lya"
            hint="É esse nome que o Claude vai usar para saber quem gastou o quê."
          />
        </ActionForm>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-suave">
        <span className="h-px flex-1 bg-borda" />
        ou
        <span className="h-px flex-1 bg-borda" />
      </div>

      <div className="rounded-2xl border border-borda bg-white p-6">
        <h2 className="mb-1 font-semibold">Entrar na casa do meu par</h2>
        <p className="mb-4 text-sm text-suave">
          Peça o código de convite para quem já criou a casa.
        </p>
        <ActionForm action={joinHousehold} submitLabel="Entrar na casa" hidden={{ next }}>
          <Field
            label="Código do convite"
            name="code"
            placeholder="Ex: A1B2C3D4"
            defaultValue={convite}
          />
          <Field
            label="Como você quer ser chamado?"
            name="display_name"
            placeholder="Ex: João"
          />
        </ActionForm>
      </div>
    </main>
  );
}
