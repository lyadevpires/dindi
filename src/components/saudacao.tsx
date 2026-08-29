import { Dindi } from "@/components/dindi";
import { formatBRL } from "@/lib/money";
import { horaAgora } from "@/lib/dates";

/**
 * O porquinho cumprimentando, no topo da tela inicial.
 *
 * A Início abria direto num número. Faltava alguém dizer "oi" — é o que dá a
 * sensação de abrir um app e não uma planilha, e é onde o mascote deixa de ser
 * enfeite e vira personagem.
 *
 * A frase muda com a hora e com o que aconteceu hoje, mas nunca inventa
 * ânimo: se o mês está apertado ele não vem dar bom dia sorrindo. Mascote que
 * comemora na hora errada é pior do que mascote nenhum.
 */
export function Saudacao({
  nome,
  saiuHoje,
  entrouNoMes,
  saiuNoMes,
  semNada,
}: {
  nome: string;
  saiuHoje: number;
  entrouNoMes: number;
  saiuNoMes: number;
  semNada: boolean;
}) {
  const hora = horaAgora();
  const parte = hora < 6 ? "Boa madrugada" : hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const apertado = entrouNoMes > 0 && saiuNoMes > entrouNoMes;

  const { frase, humor } = (() => {
    if (semNada) {
      return {
        frase: "Vamos começar? Me conta o primeiro gasto que eu cuido do resto.",
        humor: "feliz" as const,
      };
    }
    if (apertado) {
      return {
        frase: "Este mês já saiu mais do que entrou. Dá uma olhada comigo.",
        humor: "preocupado" as const,
      };
    }
    if (saiuHoje > 0) {
      return {
        frase: `Hoje saíram ${formatBRL(saiuHoje)} até agora.`,
        humor: "atento" as const,
      };
    }
    if (hora >= 21) {
      return { frase: "Hoje não saiu nada. Dia tranquilo.", humor: "dormindo" as const };
    }
    return { frase: "Hoje ainda não saiu nada.", humor: "feliz" as const };
  })();

  return (
    <section className="mb-5 flex items-center gap-3">
      <Dindi size={76} humor={humor} enquadramento="rosto" className="balancinho shrink-0" />
      <div className="min-w-0">
        <p className="text-sm text-suave">{parte},</p>
        <h1 className="truncate text-xl font-bold tracking-tight">{nome}</h1>
        <p className="justo mt-0.5 text-sm leading-relaxed text-suave">{frase}</p>
      </div>
    </section>
  );
}
