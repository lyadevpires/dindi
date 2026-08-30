import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Field } from "@/components/auth-form";
import { Logo } from "@/components/dindi";
import { EntrarComGoogle } from "@/components/entrar-google";
import { signIn } from "@/app/auth/actions";
import { getUser, loginComGoogleLigado } from "@/lib/auth";

export const metadata = { title: "Entrar — dindi" };

export default async function EntrarPage(props: PageProps<"/entrar">) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/";

  const user = await getUser();
  if (user) redirect(next);

  const comGoogle = await loginComGoogleLigado();
  const deuErroNoGoogle = params.erro === "google";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
      <div className="mb-8 text-center">
        <Logo size={44} />
        <p className="mt-3 text-sm text-suave">Que bom te ver de novo.</p>
      </div>

      {deuErroNoGoogle ? (
        <p className="mb-4 rounded-xl bg-vermelhinho-claro px-3.5 py-2.5 text-sm text-vermelhinho">
          Não deu certo entrar com o Google. Tente de novo — ou entre com email e senha.
        </p>
      ) : null}

      <div className="rounded-2xl border border-borda bg-white p-6">
        <ActionForm action={signIn} submitLabel="Entrar" hidden={{ next }}>
          <Field label="Email" name="email" type="email" autoComplete="email" />
          <Field
            label="Senha"
            name="password"
            type="password"
            autoComplete="current-password"
          />
        </ActionForm>

        <p className="mt-4 text-center text-sm">
          <Link href="/esqueci" className="text-suave underline underline-offset-2">
            Esqueci minha senha
          </Link>
        </p>
      </div>

      {comGoogle ? <EntrarComGoogle next={next} rotulo="Entrar com o Google" /> : null}

      <p className="mt-5 text-center text-sm text-suave">
        Ainda não tem conta?{" "}
        <Link
          href={`/criar-conta?next=${encodeURIComponent(next)}`}
          className="font-semibold text-tinta underline underline-offset-2"
        >
          Criar agora
        </Link>
      </p>
    </main>
  );
}
