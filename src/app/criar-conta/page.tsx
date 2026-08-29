import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Field } from "@/components/auth-form";
import { Dindi, Logo } from "@/components/dindi";
import { signUp } from "@/app/auth/actions";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Criar conta — dindi" };

export default async function CriarContaPage(props: PageProps<"/criar-conta">) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/";

  const user = await getUser();
  if (user) redirect("/comecar");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
      <div className="mb-8 text-center">
        <Logo size={44} />
        <p className="mt-3 text-sm text-suave">
          Suas contas organizadas conversando. Sozinha, ou dividindo com quem você quiser.
        </p>
      </div>

      <div className="rounded-2xl border border-borda bg-white p-6">
        <ActionForm
          action={signUp}
          submitLabel="Criar minha conta"
          hidden={{ next }}
          aoConcluir={(email) => <ConfiraOEmail email={email} />}
        >
          <Field label="Email" name="email" type="email" autoComplete="email" />
          <Field
            label="Senha"
            name="password"
            type="password"
            autoComplete="new-password"
            hint="Pelo menos 8 caracteres."
          />
        </ActionForm>
      </div>

      <p className="mt-5 text-center text-sm text-suave">
        Já tem conta?{" "}
        <Link
          href={`/entrar?next=${encodeURIComponent(next)}`}
          className="font-semibold text-tinta underline underline-offset-2"
        >
          Entrar
        </Link>
      </p>
    </main>
  );
}

/**
 * O que aparece no lugar do formulário depois de criar a conta.
 *
 * Deixar os campos preenchidos na tela faz a pessoa achar que não funcionou e
 * clicar de novo. Aqui a próxima ação dela está dita em uma frase.
 */
function ConfiraOEmail({ email }: { email: string }) {
  return (
    <div className="text-center">
      <Dindi size={64} humor="atento" className="mx-auto" />
      <h2 className="mt-4 text-lg font-bold tracking-tight">Confira seu email</h2>
      <p className="justo mt-2 text-sm leading-relaxed text-suave">
        Mandei um link de confirmação para{" "}
        <strong className="font-medium text-tinta">{email}</strong>. É só clicar nele que
        eu abro seu dindi.
      </p>
      <p className="mt-3 text-sm text-suave">
        Não chegou em alguns minutos? Olha no spam — e confere se o endereço está certo.
      </p>
    </div>
  );
}
