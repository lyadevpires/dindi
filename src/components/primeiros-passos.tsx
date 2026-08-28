"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dindi } from "@/components/dindi";
import { CopiarEndereco } from "@/components/copiar";

/**
 * Os primeiros passos: botar o dindi na tela do celular e conectar o Claude.
 *
 * As duas coisas que fazem o app virar hábito, e as duas que ninguém faz
 * sozinho. Por isso viraram uma tela só, um passo de cada vez, com um botão
 * grande embaixo — dá para atravessar de polegar, sem ler nada além do título.
 *
 * O movimento é de propósito: cada passo entra deslizando e o porquinho pula.
 * Quem tem "reduzir movimento" ligado no aparelho vê tudo parado (globals.css).
 */

/** O evento que o Chrome dispara quando o site pode virar app de verdade. */
type EventoDeInstalar = Event & { prompt: () => Promise<void> };

export function PrimeirosPassos({
  nome,
  url,
  conectado,
}: {
  nome: string;
  url: string;
  conectado: boolean;
}) {
  const router = useRouter();

  // Se o Claude já está conectado, o passo dele não tem por que aparecer.
  const passos = conectado ? ["oi", "app", "fim"] : ["oi", "app", "claude", "fim"];
  const [i, setI] = useState(0);
  const atual = passos[i];

  const avancar = () => setI((n) => Math.min(n + 1, passos.length - 1));

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-8">
      <Bolinhas total={passos.length} atual={i} />

      {/* A `key` é o que faz o passo novo entrar animado: para o React ele é
          um elemento diferente, então a animação de entrada roda de novo. */}
      <div key={atual} className="surge flex flex-1 flex-col">
        {atual === "oi" ? <Oi nome={nome} /> : null}
        {atual === "app" ? <NaTelaDoCelular /> : null}
        {atual === "claude" ? <ConectarClaude url={url} /> : null}
        {atual === "fim" ? <Fim /> : null}
      </div>

      <div className="mt-8 space-y-3">
        {atual === "fim" ? (
          <Botao onClick={() => router.push("/")}>Ir pro meu dindi</Botao>
        ) : (
          <>
            <Botao onClick={avancar}>
              {atual === "oi" ? "Bora" : "Já fiz, próximo"}
            </Botao>
            {atual === "oi" ? null : (
              <button
                type="button"
                onClick={avancar}
                className="w-full py-2 text-sm text-suave underline underline-offset-2"
              >
                Depois eu faço
              </button>
            )}
          </>
        )}
      </div>

      {atual === "claude" ? (
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-1 w-full py-2 text-sm text-suave underline underline-offset-2"
        >
          Já conectei, confere aí
        </button>
      ) : null}
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Bolinhas({ total, atual }: { total: number; atual: number }) {
  return (
    <div className="mb-8 flex justify-center gap-2" aria-hidden>
      {Array.from({ length: total }, (_, n) => (
        <span
          key={n}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            n === atual ? "w-7 bg-tinta" : "w-1.5 bg-borda"
          }`}
        />
      ))}
    </div>
  );
}

function Botao({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl bg-tinta px-5 py-3.5 text-base font-semibold text-creme transition hover:opacity-90 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-bold leading-tight tracking-tight">{children}</h1>;
}

/* ------------------------------------------------------------------ */

function Oi({ nome }: { nome: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Dindi size={110} humor="feliz" className="pulinho" />
      <div className="mt-6">
        <Titulo>Oi, {nome}!</Titulo>
        <p className="mx-auto mt-3 max-w-xs text-base leading-relaxed text-suave">
          Seu dindi já está de pé. Faltam duas coisinhas rápidas para ele virar
          parte do seu dia — e as duas cabem em um minuto.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const NO_IPHONE = [
  "Abra o dindi no Safari (não no Chrome — só o Safari instala).",
  "Toque no quadradinho com a setinha pra cima, embaixo na barra.",
  "Role e escolha “Adicionar à Tela de Início”.",
  "Confirme. Pronto: o porquinho vira um ícone junto dos outros apps.",
];

const NO_ANDROID = [
  "Abra o dindi no Chrome.",
  "Toque nos três pontinhos, no canto de cima.",
  "Escolha “Instalar app” (ou “Adicionar à tela inicial”).",
  "Confirme. Pronto: o porquinho vira um ícone junto dos outros apps.",
];

function NaTelaDoCelular() {
  const [aparelho, setAparelho] = useState<"iphone" | "android">("iphone");
  const [instalador, setInstalador] = useState<EventoDeInstalar | null>(null);

  // O Chrome avisa quando dá para instalar de verdade, com um toque só. Quando
  // esse aviso chega, o passo a passo vira plano B.
  useEffect(() => {
    function guardar(e: Event) {
      e.preventDefault();
      setInstalador(e as EventoDeInstalar);
    }
    window.addEventListener("beforeinstallprompt", guardar);
    return () => window.removeEventListener("beforeinstallprompt", guardar);
  }, []);

  const passos = aparelho === "iphone" ? NO_IPHONE : NO_ANDROID;

  return (
    <div>
      <div className="flex items-start gap-4">
        <Dindi size={64} humor="comemorando" className="pulinho shrink-0" />
        <div>
          <Titulo>Bota o dindi na tela do celular</Titulo>
          <p className="justo mt-2 text-sm leading-relaxed text-suave">
            Ele vira um ícone igual aos outros apps: abre em tela cheia, sem barra
            de endereço, e você não precisa mais digitar o site.
          </p>
        </div>
      </div>

      {instalador ? (
        <button
          type="button"
          onClick={() => instalador.prompt()}
          className="mt-5 w-full rounded-xl border-2 border-tinta px-5 py-3.5 text-base font-semibold transition hover:bg-areia active:scale-[0.98]"
        >
          Instalar agora
        </button>
      ) : null}

      <div className="mt-5 flex gap-2">
        {(["iphone", "android"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAparelho(a)}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition ${
              aparelho === a
                ? "border-tinta bg-tinta font-medium text-creme"
                : "border-borda text-suave hover:bg-areia"
            }`}
          >
            {a === "iphone" ? "iPhone" : "Android"}
          </button>
        ))}
      </div>

      <ol className="mt-4 space-y-2.5">
        {passos.map((p, n) => (
          <li key={p} className="flex gap-3 rounded-2xl border border-borda bg-white p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-areia text-xs font-bold">
              {n + 1}
            </span>
            <span className="text-sm leading-relaxed">{p}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const COM_O_CLAUDE = [
  "Abra o Claude — app do celular, do computador ou claude.ai.",
  "Vá em Configurações → Conectores.",
  "Toque em “Adicionar conector personalizado” e cole o endereço aí de cima.",
  "Dê o nome de “dindi” e clique em Permitir.",
];

function ConectarClaude({ url }: { url: string }) {
  return (
    <div>
      <div className="flex items-start gap-4">
        <Dindi size={64} humor="atento" className="pulinho shrink-0" />
        <div>
          <Titulo>Agora conecte o Claude</Titulo>
          <p className="justo mt-2 text-sm leading-relaxed text-suave">
            É ele quem anota. Depois disso você só fala —{" "}
            <em>&ldquo;gastei 45 no mercado&rdquo;</em> — e aparece aqui, na categoria
            certa.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-borda bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-suave">Endereço do dindi</p>
        <CopiarEndereco url={url} />
      </div>

      <ol className="mt-4 space-y-2.5">
        {COM_O_CLAUDE.map((p, n) => (
          <li key={p} className="flex gap-3 rounded-2xl border border-borda bg-white p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-areia text-xs font-bold">
              {n + 1}
            </span>
            <span className="text-sm leading-relaxed">{p}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Uns confetes bege e preto caindo, porque terminar merece festa. */
function Confete() {
  const pedacos = Array.from({ length: 14 }, (_, n) => ({
    esquerda: (n * 7.3 + 4) % 96,
    atraso: (n % 7) * 0.18,
    escuro: n % 3 === 0,
  }));

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {pedacos.map((p, n) => (
        <span
          key={n}
          className={`cai absolute top-0 h-2.5 w-2 rounded-[2px] ${
            p.escuro ? "bg-tinta" : "bg-areia"
          }`}
          style={{ left: `${p.esquerda}%`, animationDelay: `${p.atraso}s` }}
        />
      ))}
    </div>
  );
}

function Fim() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Confete />
      <Dindi size={110} humor="comemorando" className="pulinho" />
      <div className="mt-6">
        <Titulo>Pronto!</Titulo>
        <p className="mx-auto mt-3 max-w-xs text-base leading-relaxed text-suave">
          Agora é só viver e ir contando. Quando quiser rever isso aqui, tem um
          atalho lá em Ajustes.
        </p>
      </div>
    </div>
  );
}
