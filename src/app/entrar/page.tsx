import Link from "next/link";
import { redirect } from "next/navigation";
import { Dindi } from "@/components/dindi";
import { BotaoGoogle } from "@/components/entrar-google";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Entrar — dindi" };

/**
 * A porta do dindi: uma tela só, com um botão só.
 *
 * Não tem formulário de cadastro. Entrar e criar conta são a mesma coisa —
 * o Google resolve os dois, sem senha pra inventar e sem email de confirmação
 * pra se perder no spam. Quem é novo cai no "como a gente te chama?" logo
 * depois; quem já é de casa cai direto no extrato.
 *
 * Email e senha não sumiu: virou a porta dos fundos (/entrar/senha), num link
 * pequeno, para quem criou conta antes do Google chegar.
 */
export default async function EntrarPage(props: PageProps<"/entrar">) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/";

  const user = await getUser();
  if (user) redirect(next);

  const deuErroNoGoogle = params.erro === "google";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 pb-8 pt-16">
      {/* A conversa: quem fala é o porquinho. */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight">
          Oi! Eu sou
          <br />o dindi.
        </h1>

        <p className="mt-4 max-w-[17rem] text-base leading-relaxed text-suave">
          Eu cuido do seu dinheiro numa conversa. Entra com o Google que eu cuido
          do resto.
        </p>
      </div>

      {/* O porquinho fica colado no botão: é ele que está convidando. */}
      <Dindi size={210} humor="feliz" acena className="pulinho mx-auto" />

      {/* O botão, sozinho na base — do jeito que o polegar alcança. */}
      <div className="mt-7">
        {deuErroNoGoogle ? (
          <p className="mb-4 rounded-xl bg-vermelhinho-claro px-3.5 py-2.5 text-center text-sm text-vermelhinho">
            Não deu certo entrar com o Google. Respira e tenta de novo.
          </p>
        ) : null}

        <BotaoGoogle next={next} rotulo="Continuar com o Google" />

        <p className="mt-4 text-center text-sm text-suave">
          <Link
            href={`/entrar/senha?next=${encodeURIComponent(next)}`}
            className="underline underline-offset-2"
          >
            Já uso email e senha
          </Link>
        </p>
      </div>
    </main>
  );
}
