import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Field } from "@/components/auth-form";
import { Logo } from "@/components/dindi";
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
          Suas finanças de casal, organizadas conversando.
        </p>
      </div>

      <div className="rounded-2xl border border-borda bg-white p-6">
        <ActionForm action={signUp} submitLabel="Criar minha conta" hidden={{ next }}>
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
