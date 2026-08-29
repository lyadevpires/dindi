import Link from "next/link";
import { Dindi } from "@/components/dindi";

/**
 * O lembrete de conectar o Claude.
 *
 * Antes esse convite só existia no cartão de boas-vindas, que some no instante
 * em que aparece qualquer dado — então bastava anotar um gasto para o app nunca
 * mais falar em conectar, e todas as telas continuavam dizendo "peça pro
 * Claude". Este fica até estar conectado de verdade, e some sozinho depois.
 */
export function AvisoConectar() {
  return (
    <Link
      href="/conectar"
      className="mb-6 flex items-center gap-3 rounded-2xl border border-azulzinho/30 bg-azulzinho-claro p-4 transition hover:brightness-[0.98]"
    >
      <Dindi size={52} humor="atento" acena className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">O Claude ainda não está conectado</p>
        <p className="mt-0.5 text-sm text-suave">
          É ele quem anota quando você fala. Leva um minuto.
        </p>
      </div>
      <span aria-hidden className="shrink-0 text-lg text-suave">
        →
      </span>
    </Link>
  );
}
