"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Field } from "@/components/auth-form";
import { joinHousehold, type ActionState } from "@/app/auth/actions";

/**
 * O formulário de aceitar um convite.
 *
 * Quando a pessoa já tem um dindi com coisas dentro, ela escolhe o que fazer
 * com o que já lançou: levar tudo para o dindi novo, ou começar zerado. Quem
 * chega sem nada (conta nova ou dindi vazio) não vê essa pergunta — não faria
 * sentido escolher entre nada e nada.
 */
export function AceitarConvite({
  next,
  codigo,
  nomeSugerido,
  temDados,
}: {
  next: string;
  codigo: string;
  nomeSugerido: string;
  temDados: boolean;
}) {
  const [estado, acao] = useActionState<ActionState, FormData>(joinHousehold, null);
  const [modo, setModo] = useState<"fresh" | "migrate">("fresh");

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="code" value={codigo} />
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="mode" value={modo} />

      <Field
        label="Como você quer ser chamada?"
        name="display_name"
        placeholder="Ex: Vanessa"
        defaultValue={nomeSugerido}
        hint="É esse nome que o Claude usa pra saber quem gastou o quê."
      />

      {temDados ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">O que fazer com o que você já tem?</p>

          <Escolha
            marcado={modo === "migrate"}
            aoMarcar={() => setModo("migrate")}
            titulo="Levar minhas coisas"
            texto="Suas contas, lançamentos e metas vêm junto para o dindi novo."
          />
          <Escolha
            marcado={modo === "fresh"}
            aoMarcar={() => setModo("fresh")}
            titulo="Começar zerado"
            texto="Entra limpa no dindi novo. O que estava no seu dindi antigo é descartado."
          />
        </div>
      ) : null}

      {estado?.error ? (
        <p className="rounded-xl bg-vermelhinho-claro px-3.5 py-2.5 text-sm text-vermelhinho">
          {estado.error}
        </p>
      ) : null}

      <Enviar />
    </form>
  );
}

function Escolha({
  marcado,
  aoMarcar,
  titulo,
  texto,
}: {
  marcado: boolean;
  aoMarcar: () => void;
  titulo: string;
  texto: string;
}) {
  return (
    <button
      type="button"
      onClick={aoMarcar}
      className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${
        marcado ? "border-tinta bg-areia/60" : "border-borda bg-white hover:bg-areia/30"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          marcado ? "border-tinta" : "border-borda"
        }`}
      >
        {marcado ? <span className="h-2.5 w-2.5 rounded-full bg-tinta" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className="block text-xs text-suave">{texto}</span>
      </span>
    </button>
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
      {pending ? "Entrando..." : "Entrar no dindi"}
    </button>
  );
}
