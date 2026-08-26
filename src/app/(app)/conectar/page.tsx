import { Card, SectionTitle } from "@/components/ui";
import { Dindi } from "@/components/dindi";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

const PASSOS = [
  {
    titulo: "Abra o Claude",
    texto: "Pode ser o app do computador, do celular ou o site claude.ai.",
  },
  {
    titulo: "Vá em Configurações → Conectores",
    texto: "Procure o botão “Adicionar conector personalizado”.",
  },
  {
    titulo: "Cole o endereço do dindi",
    texto: "É o endereço logo abaixo. Dê o nome de “dindi” para ele.",
  },
  {
    titulo: "Clique em Permitir",
    texto:
      "O Claude vai abrir uma tela do dindi pedindo autorização. Você confere e clica em Permitir. Pronto.",
  },
];

const EXEMPLOS = [
  "gastei 45 no mercado hoje",
  "comprei uma cadeira de 900 reais em 6x no cartão",
  "recebi meu salário",
  "quanto a gente gastou com comida esse mês?",
  "guardei 500 na reserva de emergência",
  "paguei a fatura do Nubank",
  "dá pra viajar em dezembro?",
];

export default async function Conectar() {
  const url = `${appUrl()}/api/mcp`;

  return (
    <>
      <div className="mb-6 flex items-start gap-4">
        <Dindi size={56} humor="atento" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conectar o Claude</h1>
          <p className="mt-1 text-sm text-suave">
            Depois disso, é só conversar. Você fala, o Claude anota, e este site mostra.
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <p className="text-xs uppercase tracking-wide text-suave">
          Endereço do dindi (copie tudo)
        </p>
        <p className="mt-2 select-all break-all rounded-lg bg-areia px-3 py-2 font-mono text-sm">
          {url}
        </p>
      </Card>

      <SectionTitle>Passo a passo</SectionTitle>
      <ol className="mb-8 space-y-3">
        {PASSOS.map((p, i) => (
          <li key={p.titulo}>
            <Card>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tinta text-sm font-bold text-creme">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{p.titulo}</h3>
                  <p className="mt-0.5 text-sm text-suave">{p.texto}</p>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <SectionTitle>Coisas que você pode dizer</SectionTitle>
      <Card>
        <ul className="space-y-2 text-sm">
          {EXEMPLOS.map((e) => (
            <li key={e} className="text-suave">
              <span className="text-tinta">&ldquo;{e}&rdquo;</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-suave">
          Não precisa falar bonito nem lembrar de nomes exatos — o Claude entende e
          pergunta quando ficar em dúvida.
        </p>
      </Card>
    </>
  );
}
