import Link from "next/link";
import { ActionForm, Field } from "@/components/auth-form";
import { Dindi } from "@/components/dindi";
import { requestPasswordReset } from "@/app/auth/actions";

export const metadata = { title: "Esqueci minha senha — dindi" };

export default async function EsqueciPage(props: PageProps<"/esqueci">) {
  const params = await props.searchParams;
  const expirou = params.expirou === "1";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
      <div className="mb-8 text-center">
        <Dindi size={52} humor="atento" />
        <h1 className="mt-4 text-xl font-bold tracking-tight">Esqueceu a senha?</h1>
        <p className="mt-2 text-sm text-suave">
          Acontece. Diz seu email que a gente manda um link para você escolher outra.
        </p>
      </div>

      {expirou ? (
        <p className="mb-4 rounded-xl bg-amarelinho-claro px-3.5 py-2.5 text-sm">
          Esse link já tinha vencido ou já foi usado. Peça um novo aqui embaixo.
        </p>
      ) : null}

      <div className="rounded-2xl border border-borda bg-white p-6">
        <ActionForm action={requestPasswordReset} submitLabel="Mandar o link">
          <Field label="Email" name="email" type="email" autoComplete="email" />
        </ActionForm>
      </div>

      <p className="mt-5 text-center text-sm text-suave">
        Lembrou?{" "}
        <Link href="/entrar" className="font-semibold text-tinta underline underline-offset-2">
          Voltar para entrar
        </Link>
      </p>
    </main>
  );
}
