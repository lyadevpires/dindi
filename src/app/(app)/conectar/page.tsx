import { Card, SectionTitle } from "@/components/ui";
import { Dindi } from "@/components/dindi";
import { CopiarEndereco } from "@/components/copiar";
import { pageCtx } from "@/lib/ctx";
import { formatDate } from "@/lib/dates";
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
    texto: "Use o botão Copiar ali em cima. Dê o nome de “dindi” para ele.",
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
  "quanto eu gastei com comida esse mês?",
  "guardei 500 na reserva de emergência",
  "paguei a fatura do Nubank",
  "dá pra viajar em dezembro?",
];

export default async function Conectar() {
  const url = `${appUrl()}/api/mcp`;
  const { session, ctx } = await pageCtx();

  /*
   * Já está conectado?
   *
   * Sem isto o app fica mudo quando dá certo: o aviso de "conecte o Claude"
   * some e mais nada aparece no lugar. Silêncio não é confirmação — quem
   * acabou de conectar precisa ver escrito que funcionou, senão fica sem
   * saber se deu certo e tenta de novo.
   */
  const { data: conexao } = await ctx.db
    .from("oauth_tokens")
    .select("created_at, last_used_at, oauth_clients(client_name)")
    .eq("user_id", session.userId)
    .eq("token_type", "access")
    .eq("revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const cliente = conexao?.oauth_clients as unknown as { client_name: string | null } | null;

  return (
    <>
      {conexao ? (
        <Card className="mb-6 border-verdinho/30 bg-verdinho-claro">
          <div className="flex items-start gap-4">
            <Dindi size={64} humor="comemorando" className="shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-verdinho">
                O {cliente?.client_name || "Claude"} já está conectado
              </h1>
              <p className="justo mt-1 text-sm leading-relaxed text-suave">
                Pronto: agora é só falar. Conte um gasto na conversa e ele aparece aqui —
                você não precisa fazer mais nada nesta tela.
              </p>
              <p className="mt-2 text-xs text-suave">
                Conectado em {formatDate(conexao.created_at.slice(0, 10))}
                {conexao.last_used_at
                  ? ` · usado por último em ${formatDate(conexao.last_used_at.slice(0, 10))}`
                  : " · ainda não foi usado"}
                . Para desconectar, vá em Ajustes.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="mb-6 flex items-start gap-4">
          <Dindi size={64} humor="atento" acena />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Conectar o Claude</h1>
            <p className="justo mt-1 text-sm leading-relaxed text-suave">
              Depois disso, é só conversar. Você fala, o Claude anota, e este site mostra.
            </p>
          </div>
        </div>
      )}

      <Card className="mb-6">
        <p className="text-xs uppercase tracking-wide text-suave">Endereço do dindi</p>
        <CopiarEndereco url={url} />
      </Card>

      <SectionTitle>
        {conexao ? "Conectar em outro lugar" : "Passo a passo"}
      </SectionTitle>
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
      <div className="flex flex-wrap gap-2">
        {EXEMPLOS.map((e) => (
          <span
            key={e}
            className="rounded-[20px] bg-[#F3E7D6] px-3.5 py-2 text-[12.5px] italic text-[#5D4B42]"
          >
            &ldquo;{e}&rdquo;
          </span>
        ))}
      </div>
      <p className="mt-4 text-xs text-suave">
        Não precisa falar bonito nem lembrar de nomes exatos — o Claude entende e
        pergunta quando ficar em dúvida.
      </p>
    </>
  );
}
