import Link from "next/link";
import { redirect } from "next/navigation";
import { CriarContaForm } from "@/components/criar-conta-form";
import { Logo } from "@/components/dindi";
import { EntrarComGoogle } from "@/components/entrar-google";
import { getUser, loginComGoogleLigado } from "@/lib/auth";

export const metadata = { title: "Criar conta — dindi" };

export default async function CriarContaPage(props: PageProps<"/criar-conta">) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/";

  const user = await getUser();
  if (user) redirect("/comecar");

  const comGoogle = await loginComGoogleLigado();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
      <div className="mb-8 text-center">
        <Logo size={44} />
        <p className="mt-3 text-sm text-suave">
          Suas contas organizadas conversando. Sozinha, ou dividindo com quem você quiser.
        </p>
      </div>

      <div className="rounded-2xl border border-borda bg-white p-6">
        <CriarContaForm next={next} />
      </div>

      {comGoogle ? <EntrarComGoogle next={next} rotulo="Criar conta com o Google" /> : null}

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
