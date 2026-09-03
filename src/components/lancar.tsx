"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { criarPrimeiraConta, lancar } from "@/app/(app)/actions";
import { Dindi } from "@/components/dindi";
import type { ActionState } from "@/app/auth/actions";

export type CategoriaOpcao = {
  id: string;
  name: string;
  kind: "expense" | "income" | "both";
  grupo: string;
};
export type ContaOpcao = {
  id: string;
  name: string;
  type: string;
  tem_debito: boolean;
  tem_credito: boolean;
  archived: boolean;
};

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
        className="flex h-[54px] w-[54px] -translate-y-4 items-center justify-center rounded-full bg-rosa text-3xl leading-none text-tinta shadow-[0_10px_22px_-8px_rgba(226,127,112,0.9)] ring-[5px] ring-creme transition hover:brightness-95 active:scale-95"
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
        // Folha que sobe de baixo: cara de aplicativo, na altura do polegar.
        className="folha m-0 mt-auto w-full max-w-none rounded-t-[32px] bg-creme p-0 text-tinta sm:mx-auto sm:max-w-md"
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
    <form
      action={acao}
      className="space-y-4 px-5 pt-3"
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
    >
      <span aria-hidden className="mx-auto block h-1 w-10 rounded-full bg-[#E2D4C2]" />
      <div className="flex items-center justify-between">
        <h2 className="fonte-display text-lg font-bold tracking-tight">Onde fica seu dinheiro?</h2>
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
  const [parcelado, setParcelado] = useState(false);
  const [conta, setConta] = useState(contas[0]?.name ?? "");
  const [via, setVia] = useState<"debito" | "credito">("debito");
  const form = useRef<HTMLFormElement>(null);

  // Conta que é débito E crédito (tipo Nubank PJ): num gasto, a pessoa escolhe
  // se foi no crédito (vai pra fatura) ou no débito (sai do saldo).
  const contaObj = contas.find((c) => c.name === conta);
  const hibrida = Boolean(contaObj?.tem_debito && contaObj?.tem_credito);

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
    <form
      ref={form}
      action={acao}
      className="space-y-4 px-5 pt-3"
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
    >
      <span aria-hidden className="mx-auto block h-1 w-10 rounded-full bg-[#E2D4C2]" />

      <div className="flex items-center gap-3">
        <Dindi size={44} humor="feliz" className="flutua-bob shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="fonte-display text-[15px] font-bold">Lançar na mão</h2>
          <p className="text-[11.5px] text-suave">
            Falar com o Claude é mais rápido, mas fica à vontade.
          </p>
        </div>
        <button
          type="button"
          onClick={fechar}
          className="rounded-lg px-2 py-1 text-sm text-suave transition hover:bg-areia"
        >
          Fechar
        </button>
      </div>

      <input type="hidden" name="tipo" value={tipo} />
      {hibrida && tipo === "expense" && !repete && !parcelado ? (
        <input type="hidden" name="via" value={via} />
      ) : null}

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
        Conta que é débito e crédito: o gasto foi no crédito (fatura) ou no
        débito (sai do saldo)? Só aparece quando faz sentido.
      */}
      {hibrida && tipo === "expense" && !repete && !parcelado ? (
        <div>
          <span className="mb-1.5 block text-sm font-medium">Como foi no {conta}?</span>
          <div className="flex gap-2 text-sm">
            {[
              { valor: "debito" as const, texto: "Débito" },
              { valor: "credito" as const, texto: "Crédito" },
            ].map((o) => (
              <button
                key={o.valor}
                type="button"
                onClick={() => setVia(o.valor)}
                className={`flex-1 rounded-xl border px-3 py-2 transition ${
                  via === o.valor
                    ? "border-tinta bg-tinta font-medium text-creme"
                    : "border-borda text-suave hover:bg-areia"
                }`}
              >
                {o.texto}
              </button>
            ))}
          </div>
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

      {/*
        Parcelado e fixo são coisas diferentes e não se misturam: parcela
        acaba, conta fixa não. Marcar um esconde o outro.
      */}
      {repete || tipo === "income" ? null : (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-borda bg-areia/40 p-3.5">
          <input
            type="checkbox"
            checked={parcelado}
            onChange={(e) => setParcelado(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-tinta"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Foi parcelado</span>
            <span className="block text-xs text-suave">
              Cartão ou carnê. Escreva o valor total lá em cima.
            </span>
          </span>
        </label>
      )}

      {parcelado && !repete && tipo !== "income" ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Em quantas vezes?</span>
          <input
            name="vezes"
            type="number"
            min={2}
            max={72}
            inputMode="numeric"
            required
            placeholder="10"
            className="w-28 rounded-xl border border-borda bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-suave/60 focus:border-tinta"
          />
        </label>
      ) : null}

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
            value={conta}
            onChange={(e) => setConta(e.target.value)}
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
      {/* Anotar é a ação que a pessoa faz todo dia; vale um porquinho feliz. */}
      {estado?.ok ? (
        <p className="surge flex items-center gap-2.5 rounded-xl bg-verdinho-claro px-3.5 py-2.5 text-sm text-verdinho">
          <Dindi size={30} humor="comemorando" className="pulinho shrink-0" />
          <span className="min-w-0">{estado.ok}</span>
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
