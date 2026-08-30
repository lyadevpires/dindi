import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Field } from "@/components/auth-form";
import { Logo } from "@/components/dindi";
import { signIn } from "@/app/auth/actions";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Entrar — dindi" };

/**
 * A porta dos fundos: email e senha.
 *
 * Existe para quem criou conta antes do login com Google chegar. Conta nova
 * não nasce mais por aqui — a porta da frente (/entrar) é o Google.
 */
export default async function EntrarComSenhaPage(props: PageProps<"/entrar/senha">) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/";

  const user = await getUser();
  if (user) redirect(next);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
      <div className="mb-8 text-center">
        <Logo size={44} />
        <p className="mt-3 text-sm text-suave">Que bom te ver de novo.</p>
      </div>

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

      <p className="mt-5 text-center text-sm text-suave">
        <Link
          href={`/entrar?next=${encodeURIComponent(next)}`}
          className="underline underline-offset-2"
        >
          Voltar e entrar com o Google
        </Link>
      </p>
    </main>
  );
}
