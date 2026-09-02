import { redirect } from "next/navigation";
import { ActionForm, Field } from "@/components/auth-form";
import { Dindi, Logo } from "@/components/dindi";
import { AceitarConvite } from "@/components/aceitar-convite";
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
    // Já tem um dindi? Descobrimos se ele é dividido (outro fluxo) e se tem
    // coisas dentro (aí a pessoa escolhe levar ou zerar).
    let dividido = false;
    let temDados = false;
    if (session) {
      const [membros, tx, contas, metas] = await Promise.all([
        supabase
          .from("household_members")
          .select("user_id", { count: "exact", head: true })
          .eq("household_id", session.householdId),
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("household_id", session.householdId),
        supabase
          .from("accounts")
          .select("id", { count: "exact", head: true })
          .eq("household_id", session.householdId),
        supabase
          .from("goals")
          .select("id", { count: "exact", head: true })
          .eq("household_id", session.householdId),
      ]);
      dividido = (membros.count ?? 0) > 1;
      temDados = (tx.count ?? 0) > 0 || (contas.count ?? 0) > 0 || (metas.count ?? 0) > 0;
    }

    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
        <div className="mb-8 text-center">
          <Dindi size={72} humor={dividido ? "atento" : "feliz"} acena className="mx-auto" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            {dividido ? "Opa, um segundo" : "Você foi convidada"}
          </h1>
          <p className="mt-2 text-sm text-suave">
            {dividido
              ? "Você já divide um dindi com outra pessoa. Entrar num novo a partir daí a gente ainda vai desenhar com calma."
              : "Alguém te chamou pra cuidar do dinheiro junto. Diz como você quer ser chamada e pronto."}
          </p>
        </div>

        {dividido ? (
          <div className="rounded-2xl border border-borda bg-white p-6 text-center text-sm text-suave">
            Me chama que a gente resolve isso juntos — sem mexer no dindi que você já
            divide.
          </div>
        ) : (
          <div className="rounded-2xl border border-borda bg-white p-6">
            <AceitarConvite
              next={next}
              codigo={convite}
              nomeSugerido={nomeDoGoogle}
              temDados={temDados}
            />
          </div>
        )}

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
