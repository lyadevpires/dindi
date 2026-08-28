"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { criarPrimeiraConta, lancar } from "@/app/(app)/actions";
import type { ActionState } from "@/app/auth/actions";

export type CategoriaOpcao = {
  id: string;
  name: string;
  kind: "expense" | "income" | "both";
  grupo: string;
};
export type ContaOpcao = { id: string; name: string; type: string; archived: boolean };

/**
 * O atalho de registrar sem conversar.
 *
 * Pede só duas coisas — quanto e em quê —, porque é o que dá para responder
 * de pé na fila do caixa. Conta e data já vêm preenchidas e ficam ali embaixo
 * para quem quiser mexer. Se a categoria for de receita, vira entrada sozinho.
 */
export function BotaoLancar({
  categorias,
  contas,
  hoje,
}: {
  categorias: CategoriaOpcao[];
  contas: ContaOpcao[];
  hoje: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  return (
    <>
      {/*
        Mora no meio da barra de baixo, elevado. O rosa é o do porquinho, e o
        traço escuro em cima dele é o que garante que dê para ler.
      */}
      <button
        type="button"
        onClick={() => dialogo.current?.showModal()}
        aria-label="Anotar um gasto"
        className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-creme bg-rosinha-forte text-3xl leading-none text-tinta shadow-md transition hover:brightness-95 active:scale-95"
      >
        <span aria-hidden className="-mt-0.5">
          +
        </span>
      </button>

      <dialog
        ref={dialogo}
        onClick={(e) => {
          // Clicou no escuro em volta, e não no cartão: fecha.
          if (e.target === dialogo.current) dialogo.current?.close();
        }}
        // O `m-auto` é o que centraliza: o reset do Tailwind zera a margem que
        // o navegador dá de graça para o <dialog>.
        className="m-auto w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-borda bg-white p-0 text-tinta backdrop:bg-tinta/40 backdrop:backdrop-blur-sm"
      >
        {/*
          Sem nenhuma conta não existe onde lançar. Em vez de esconder o botão
          (e deixar a pessoa sem saída), a primeira coisa que ele pergunta é
          onde o dinheiro está.
        */}
        {contas.length === 0 ? (
          <PrimeiraConta fechar={() => dialogo.current?.close()} />
        ) : (
          <Formulario
            categorias={categorias}
            contas={contas}
            hoje={hoje}
            fechar={() => dialogo.current?.close()}
          />
        )}
      </dialog>
    </>
  );
}

function PrimeiraConta({ fechar }: { fechar: () => void }) {
  const [estado, acao] = useActionState<ActionState, FormData>(criarPrimeiraConta, null);

  return (
    <form action={acao} className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Onde fica seu dinheiro?</h2>
        <button
          type="button"
          onClick={fechar}
          className="rounded-lg px-2 py-1 text-sm text-suave transition hover:bg-areia"
        >
          Fechar
        </button>
      </div>

      <p className="text-sm text-suave">
        Antes de anotar o primeiro gasto, o dindi precisa saber de onde ele sai. Cartão
        de crédito é melhor cadastrar conversando com o Claude, porque tem dia de
        fechamento.
      </p>

      <input
        name="nome"
        required
        autoComplete="off"
        placeholder="Nubank, Itaú, Carteira…"
        className="w-full rounded-xl border border-borda bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-suave/60 focus:border-tinta"
      />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Quanto tem aí hoje?</span>
        <div className="flex items-center gap-2 rounded-xl border border-borda bg-white px-3.5 py-2.5 focus-within:border-tinta">
          <span className="text-sm text-suave">R$</span>
          <input
            name="saldo"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            className="tabular w-full min-w-0 text-sm outline-none placeholder:text-suave/60"
          />
        </div>
      </label>

      {estado?.error ? (
        <p className="rounded-xl bg-vermelhinho-claro px-3.5 py-2.5 text-sm text-vermelhinho">
          {estado.error}
        </p>
      ) : null}

      <Salvar rotulo="Criar conta" />
    </form>
  );
}

function Formulario({
  categorias,
  contas,
  hoje,
  fechar,
}: {
  categorias: CategoriaOpcao[];
  contas: ContaOpcao[];
  hoje: string;
  fechar: () => void;
}) {
  const [estado, acao] = useActionState<ActionState, FormData>(lancar, null);
  const [categoria, setCategoria] = useState(categorias[0]?.name ?? "__nova__");
  const [entrada, setEntrada] = useState(false);
  const [repete, setRepete] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  // Depois de anotar, limpa para a próxima sem fechar — quem lança um gasto
  // costuma lançar dois.
  useEffect(() => {
    if (estado?.ok) form.current?.reset();
  }, [estado]);

  // A categoria já diz se é entrada ou saída. Só as que servem para os dois
  // (um "salário" e um "estorno" moram na mesma) precisam perguntar.
  const kind = categorias.find((c) => c.name === categoria)?.kind ?? "expense";
  const tipo = kind === "income" || (kind === "both" && entrada) ? "income" : "expense";

  // Agrupa por balde só para o seletor do celular ficar navegável.
  const grupos = [...new Set(categorias.map((c) => c.grupo))];

  return (
    <form ref={form} action={acao} className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          {repete
            ? tipo === "income"
              ? "O que entra todo mês"
              : "Conta que chega todo mês"
            : tipo === "income"
              ? "O que entrou"
              : "O que saiu"}
        </h2>
        <button
          type="button"
          onClick={fechar}
          className="rounded-lg px-2 py-1 text-sm text-suave transition hover:bg-areia"
        >
          Fechar
        </button>
      </div>

      <input type="hidden" name="tipo" value={tipo} />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Quanto?</span>
        <div className="flex items-center gap-2 rounded-xl border border-borda bg-white px-3.5 py-2.5 focus-within:border-tinta">
          <span className="text-sm text-suave">R$</span>
          <input
            name="valor"
            inputMode="decimal"
            autoComplete="off"
            required
            placeholder="45,90"
            className="tabular w-full min-w-0 text-lg font-semibold outline-none placeholder:font-normal placeholder:text-suave/60"
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Em quê?</span>
        <select
          name="categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="w-full rounded-xl border border-borda bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-tinta"
        >
          {grupos.map((g) => (
            <optgroup key={g} label={g}>
              {categorias
                .filter((c) => c.grupo === g)
                .map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          ))}
          <option value="__nova__">Outra…</option>
        </select>
      </label>

      {categoria === "__nova__" ? (
        <input
          name="categoria_nova"
          required
          placeholder="Nome da categoria nova"
          className="w-full rounded-xl border border-borda bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-suave/60 focus:border-tinta"
        />
      ) : null}

      {kind === "both" ? (
        <div className="flex gap-2 text-sm">
          {[
            { valor: false, texto: "Saiu" },
            { valor: true, texto: "Entrou" },
          ].map((o) => (
            <button
              key={o.texto}
              type="button"
              onClick={() => setEntrada(o.valor)}
              className={`flex-1 rounded-xl border px-3 py-2 transition ${
                entrada === o.valor
                  ? "border-tinta bg-tinta font-medium text-creme"
                  : "border-borda text-suave hover:bg-areia"
              }`}
            >
              {o.texto}
            </button>
          ))}
        </div>
      ) : null}

      {/*
        A conta fixa entra por aqui, e não por uma tela separada: para quem
        anota, "aluguel" é só mais um gasto — a diferença é que ele volta.
      */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-borda bg-areia/40 p-3.5">
        <input
          type="checkbox"
          name="repete"
          checked={repete}
          onChange={(e) => setRepete(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-tinta"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium">Isso se repete todo mês</span>
          <span className="block text-xs text-suave">
            Aluguel, luz, escola, assinatura. Eu lanço sozinho todo mês.
          </span>
        </span>
      </label>

      {repete ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Cai em que dia do mês?</span>
          <input
            name="dia"
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            required
            placeholder="5"
            className="w-28 rounded-xl border border-borda bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-suave/60 focus:border-tinta"
          />
        </label>
      ) : null}

      <details className="text-sm">
        <summary className="cursor-pointer text-suave">
          {repete ? "Conta e detalhe" : "Conta, data e detalhe"}
        </summary>
        <div className="mt-3 space-y-3">
          <select
            name="conta"
            defaultValue={contas[0]?.name}
            aria-label="Conta"
            className="w-full rounded-xl border border-borda bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-tinta"
          >
            {contas.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {repete ? null : (
            <input
              type="date"
              name="data"
              defaultValue={hoje}
              aria-label="Data"
              className="w-full rounded-xl border border-borda bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-tinta"
            />
          )}

          <input
            name="detalhe"
            placeholder="Onde foi? (opcional)"
            className="w-full rounded-xl border border-borda bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-suave/60 focus:border-tinta"
          />
        </div>
      </details>

      {estado?.error ? (
        <p className="rounded-xl bg-vermelhinho-claro px-3.5 py-2.5 text-sm text-vermelhinho">
          {estado.error}
        </p>
      ) : null}
      {estado?.ok ? (
        <p className="rounded-xl bg-verdinho-claro px-3.5 py-2.5 text-sm text-verdinho">
          {estado.ok}
        </p>
      ) : null}

      <Salvar rotulo="Anotar" />
    </form>
  );
}

function Salvar({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-tinta px-4 py-3 text-sm font-semibold text-creme transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Só um segundo..." : rotulo}
    </button>
  );
}
