import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Field } from "@/components/auth-form";
import { Dindi } from "@/components/dindi";
import { updatePassword } from "@/app/auth/actions";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Nova senha — dindi" };

/**
 * Só se chega aqui vindo do link do email, que já deixou a pessoa logada.
 * Sem sessão não há o que trocar — volta para pedir outro link.
 */
export default async function NovaSenhaPage() {
  if (!(await getUser())) redirect("/esqueci?expirou=1");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
      <div className="mb-8 text-center">
        <Dindi size={52} humor="feliz" />
        <h1 className="mt-4 text-xl font-bold tracking-tight">Escolhe uma senha nova</h1>
        <p className="mt-2 text-sm text-suave">Pelo menos 8 letras. Anota em algum lugar.</p>
      </div>

      <div className="rounded-2xl border border-borda bg-white p-6">
        <ActionForm action={updatePassword} submitLabel="Salvar a senha">
          <Field label="Senha nova" name="password" type="password" autoComplete="new-password" />
        </ActionForm>
      </div>

      <p className="mt-5 text-center text-sm text-suave">
        <Link href="/" className="font-semibold text-tinta underline underline-offset-2">
          Ir para o dindi
        </Link>
      </p>
    </main>
  );
}
