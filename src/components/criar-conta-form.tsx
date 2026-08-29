"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Dindi } from "@/components/dindi";
import { Field } from "@/components/auth-form";
import { signUp, type ActionState } from "@/app/auth/actions";

/**
 * O cadastro, inteiro do lado do cliente.
 *
 * Ele mora aqui, e não na página, porque a tela muda depois de enviar: some o
 * formulário e entra o "confira seu email". Deixar os campos preenchidos na
 * tela faz a pessoa achar que não funcionou e clicar de novo — e aí ela recebe
 * dois emails e desconfia dos dois.
 */
export function CriarContaForm({ next }: { next: string }) {
  const [estado, acao] = useActionState<ActionState, FormData>(signUp, null);

  // Quando dá certo, a ação devolve o email para onde a mensagem foi.
  if (estado?.ok) return <ConfiraOEmail email={estado.ok} />;

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Pelo menos 8 caracteres."
      />

      {estado?.error ? (
        <p className="rounded-xl bg-vermelhinho-claro px-3.5 py-2.5 text-sm text-vermelhinho">
          {estado.error}
        </p>
      ) : null}

      <Enviar />
    </form>
  );
}

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-tinta px-4 py-3 text-sm font-semibold text-creme transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Só um segundo..." : "Criar minha conta"}
    </button>
  );
}

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
