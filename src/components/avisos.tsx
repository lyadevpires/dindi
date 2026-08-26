"use client";

import { useEffect, useState } from "react";
import { ligarAvisos, desligarAvisos } from "@/app/(app)/casa/actions";

type Estado = "carregando" | "sem_suporte" | "bloqueado" | "desligado" | "ligado" | "erro";

/** A chave pública vem em base64 url-safe; o navegador pede bytes crus. */
function paraBytes(base64: string): Uint8Array<ArrayBuffer> {
  const preenchido = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const cru = atob(preenchido);
  const bytes = new Uint8Array(new ArrayBuffer(cru.length));
  for (let i = 0; i < cru.length; i++) bytes[i] = cru.charCodeAt(i);
  return bytes;
}

/**
 * Liga o recado da manhã neste aparelho.
 *
 * A inscrição é por aparelho, não por conta: o celular dela e o dele são dois
 * cadastros diferentes, e cada um decide se quer ser avisado.
 */
export function Avisos({ chavePublica }: { chavePublica: string }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [recado, setRecado] = useState("");

  // Descobrir se este aparelho já está inscrito só é possível no navegador, e
  // só depois que ele responde — por isso a tela começa em "carregando".
  useEffect(() => {
    let vivo = true;

    async function conferir(): Promise<Estado> {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "sem_suporte";
      if (Notification.permission === "denied") return "bloqueado";
      const reg = await navigator.serviceWorker.register("/sw.js");
      return (await reg.pushManager.getSubscription()) ? "ligado" : "desligado";
    }

    conferir()
      .then((novo) => vivo && setEstado(novo))
      .catch(() => vivo && setEstado("erro"));

    return () => {
      vivo = false;
    };
  }, []);

  async function ligar() {
    setEstado("carregando");
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setEstado("bloqueado");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const inscricao = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: paraBytes(chavePublica),
      });
      const erro = await ligarAvisos(JSON.parse(JSON.stringify(inscricao)));
      if (erro) {
        setRecado(erro);
        setEstado("erro");
        return;
      }
      setEstado("ligado");
    } catch {
      setEstado("erro");
    }
  }

  async function desligar() {
    setEstado("carregando");
    try {
      const reg = await navigator.serviceWorker.ready;
      const inscricao = await reg.pushManager.getSubscription();
      if (inscricao) {
        await desligarAvisos(inscricao.endpoint);
        await inscricao.unsubscribe();
      }
      setEstado("desligado");
    } catch {
      setEstado("erro");
    }
  }

  if (estado === "sem_suporte") {
    return (
      <p className="text-sm text-suave">
        Este navegador não sabe avisar. No iPhone funciona depois de instalar o dindi na tela
        de início.
      </p>
    );
  }

  if (estado === "bloqueado") {
    return (
      <p className="text-sm text-suave">
        Os avisos estão bloqueados nas configurações do navegador para este site. Libere lá e
        recarregue esta página.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={estado === "ligado" ? desligar : ligar}
          disabled={estado === "carregando"}
          className={
            estado === "ligado"
              ? "rounded-lg border border-borda px-3.5 py-2 text-sm text-suave transition hover:bg-areia disabled:opacity-60"
              : "rounded-lg bg-tinta px-3.5 py-2 text-sm font-medium text-creme transition hover:opacity-90 disabled:opacity-60"
          }
        >
          {estado === "carregando"
            ? "Um segundo..."
            : estado === "ligado"
              ? "Desligar neste aparelho"
              : "Quero ser avisada"}
        </button>

        {estado === "ligado" ? (
          <span className="text-sm text-verdinho">Ligado neste aparelho.</span>
        ) : null}
      </div>

      {estado === "erro" ? (
        <p className="mt-2 text-sm text-vermelhinho">
          {recado || "Não consegui ligar agora. Tente de novo daqui a pouco."}
        </p>
      ) : null}
    </div>
  );
}
