import { redirect } from "next/navigation";
import { ActionForm, Field } from "@/components/auth-form";
import { Dindi, Logo } from "@/components/dindi";
import { createHousehold, joinHousehold } from "@/app/auth/actions";
import { getSession, getUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Começar — dindi" };

/**
 * Onboarding: a pessoa cria o dindi dela ou entra num que já existe por convite.
 *
 * Duas portas bem diferentes. Quem chega pelo link de convite (`?convite=`) vê
 * o convite como caminho principal — antes ele ficava escondido embaixo de
 * "criar um dindi novo", e quem foi convidado acabava criando um vazio por
 * engano. O caminho de criar continua sendo o padrão para quem chega sem
 * convite.
 */
export default async function ComecarPage(props: PageProps<"/comecar">) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const convite = typeof params.convite === "string" ? params.convite : "";

  const user = await getUser();
  if (!user) {
    // O código do convite precisa sobreviver ao login — senão a pessoa volta
    // do Google sem ele e cai na tela de criar um dindi novo.
    const volta = convite
      ? `/comecar?convite=${encodeURIComponent(convite)}`
      : "/comecar";
    redirect(`/entrar?next=${encodeURIComponent(volta)}`);
  }

  const session = await getSession();
  // Já tem dindi e não veio por convite: nada a fazer aqui, vai pro app.
  // Com convite na mão, deixamos passar mesmo com sessão — quem criou um vazio
  // por engano ainda consegue entrar no dindi certo (o accept_invite cuida).
  if (session && !convite) redirect(next);

  // Quem chegou pelo Google já disse o nome uma vez; a caixa vem preenchida
  // com o primeiro nome, e é só apagar se quiser ser chamado de outro jeito.
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const meta = (claims?.claims?.user_metadata ?? {}) as Record<string, unknown>;
  const nomeDoGoogle =
    typeof meta.full_name === "string" ? meta.full_name.trim().split(/\s+/)[0] : "";

  // ---------------------------------------------------------------
  // Chegou por convite: o convite é a tela inteira.
  // ---------------------------------------------------------------
  if (convite) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
        <div className="mb-8 text-center">
          <Dindi size={72} humor="feliz" acena className="mx-auto" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Você foi convidada</h1>
          <p className="mt-2 text-sm text-suave">
            Alguém te chamou pra cuidar do dinheiro junto. Diz como você quer ser
            chamada e pronto.
          </p>
        </div>

        <div className="rounded-2xl border border-borda bg-white p-6">
          <ActionForm action={joinHousehold} submitLabel="Entrar no dindi" hidden={{ next }}>
            <Field
              label="Como você quer ser chamada?"
              name="display_name"
              placeholder="Ex: Vanessa"
              defaultValue={nomeDoGoogle}
              hint="É esse nome que o Claude usa pra saber quem gastou o quê."
            />
            <input type="hidden" name="code" value={convite} />
          </ActionForm>
        </div>

        <p className="mt-5 text-center text-sm text-suave">
          Esse convite não é seu? Fale com quem te mandou.
        </p>
      </main>
    );
  }

  // ---------------------------------------------------------------
  // Chegou sem convite: criar o dindi da pessoa (caminho normal).
  // ---------------------------------------------------------------
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
            defaultValue={nomeDoGoogle}
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
        <h2 className="mb-1 font-semibold">Recebi um convite</h2>
        <p className="mb-4 text-sm text-suave">
          Se alguém já te chamou pro dindi dela, é por aqui. Peça o código para essa pessoa.
        </p>
        <ActionForm action={joinHousehold} submitLabel="Entrar" hidden={{ next }}>
          <Field
            label="Código do convite"
            name="code"
            placeholder="Ex: A1B2C3D4"
          />
          <Field
            label="Como você quer ser chamado?"
            name="display_name"
            placeholder="Ex: João"
            defaultValue={nomeDoGoogle}
          />
        </ActionForm>
      </div>
    </main>
  );
}
