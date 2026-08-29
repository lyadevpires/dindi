import { appUrl, env } from "@/lib/env";

/**
 * Os emails do dindi.
 *
 * Escritos aqui, e não no painel do Supabase, por três motivos que se somam:
 *
 *   1. O endereço do link é montado por nós. O Supabase só manda para os
 *      endereços que estão na lista dele, e quando o nosso não está, ele
 *      ignora em silêncio e usa o padrão do projeto — foi assim que um link
 *      de recuperação foi parar em localhost:3000.
 *
 *   2. O visual é o do app, e muda junto com ele.
 *
 *   3. O remetente embutido do Supabase é limitado a alguns emails por hora e
 *      a documentação deles diz que não serve para produção.
 *
 * HTML de email não é HTML de site: nada de flexbox, de grid ou de folha de
 * estilo separada. É tabela, largura fixa e estilo escrito em cada tag —
 * caso contrário o Gmail e o Outlook desmontam tudo.
 */

const CREME = "#fdf8f3";
const BORDA = "#e6dacb";
const TINTA = "#2c2420";
const SUAVE = "#7a6a5e";

type Email = {
  para: string;
  assunto: string;
  titulo: string;
  /** Cada item vira um parágrafo. */
  paragrafos: string[];
  botao?: { texto: string; url: string };
  rodape?: string;
};

/** O desenho, igual para todos os emails. */
function montarHtml(e: Email): string {
  const paragrafos = e.paragrafos
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${SUAVE};">${p}</p>`
    )
    .join("");

  const botao = e.botao
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
         <tr><td style="border-radius:12px;background:${TINTA};">
           <a href="${e.botao.url}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:${CREME};text-decoration:none;border-radius:12px;">${e.botao.texto}</a>
         </td></tr>
       </table>
       <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${SUAVE};">
         Se o botão não funcionar, copie este endereço e cole no navegador:<br>
         <span style="word-break:break-all;color:${TINTA};">${e.botao.url}</span>
       </p>`
    : "";

  const rodape = e.rodape
    ? `<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid ${BORDA};font-size:13px;line-height:1.6;color:${SUAVE};">${e.rodape}</p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e.assunto}</title></head>
<body style="margin:0;padding:0;background:${CREME};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREME};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

        <!--
          Gmail e Outlook bloqueiam imagem de fora até a pessoa clicar em
          "exibir imagens", então o porquinho não pode ser o cabeçalho — ele é
          enfeite. Quem manda é a palavra, em texto, que aparece sempre. O
          `alt` vazio evita aquele retângulo com um ícone rasgado no lugar.
        -->
        <tr><td style="padding-bottom:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          <img src="${appUrl()}/icon-192.png" width="36" height="36" alt=""
               style="vertical-align:middle;border:0;border-radius:9px;">
          <span style="vertical-align:middle;padding-left:10px;font-size:20px;font-weight:700;color:${TINTA};">dindi</span>
        </td></tr>

        <tr><td style="background:#ffffff;border:1px solid ${BORDA};border-radius:20px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:700;color:${TINTA};">${e.titulo}</h1>
          ${paragrafos}
          ${botao}
          ${rodape}
        </td></tr>

        <tr><td style="padding-top:20px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${SUAVE};">
          dindi — seu dinheiro, sem planilha<br>
          <a href="${appUrl()}/privacidade" style="color:${SUAVE};">privacidade</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Só para olhar o desenho sem precisar mandar email de verdade. */
export const montarHtmlParaPrevia = montarHtml;

/** A versão em texto puro, para quem lê email sem imagem nem estilo. */
function montarTexto(e: Email): string {
  const corpo = e.paragrafos.map((p) => p.replace(/<[^>]+>/g, "")).join("\n\n");
  const link = e.botao ? `\n\n${e.botao.texto}:\n${e.botao.url}` : "";
  const rodape = e.rodape ? `\n\n${e.rodape.replace(/<[^>]+>/g, "")}` : "";
  return `${e.titulo}\n\n${corpo}${link}${rodape}\n\n— dindi`;
}

/**
 * Manda o email. Devolve a mensagem de erro, ou null se deu certo.
 *
 * Nunca lança: quem chama está no meio de um cadastro ou de uma recuperação,
 * e derrubar a operação inteira porque o servidor de email tossiu seria pior
 * do que avisar que a mensagem não saiu.
 */
export async function mandarEmail(e: Email): Promise<string | null> {
  const chave = env.resendApiKey;
  if (!chave) return "O envio de email ainda não está configurado.";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [e.para],
        subject: e.assunto,
        html: montarHtml(e),
        text: montarTexto(e),
      }),
    });

    if (!r.ok) {
      const detalhe = await r.text().catch(() => "");
      return `O servidor de email recusou (${r.status}). ${detalhe.slice(0, 200)}`;
    }
    return null;
  } catch (err) {
    return `Não consegui falar com o servidor de email: ${(err as Error).message}`;
  }
}

/* ------------------------------------------------------------------ */
/* Os emails que o dindi manda                                        */
/* ------------------------------------------------------------------ */

export function emailDeConfirmacao(para: string, link: string): Email {
  return {
    para,
    assunto: "Confirme seu email — dindi",
    titulo: "Falta um clique",
    paragrafos: [
      "Alguém (esperamos que você) criou uma conta no dindi com este email. Confirme que é seu e a gente começa.",
      "Depois disso é só conversar: você conta o que gastou, o dindi anota e organiza.",
    ],
    botao: { texto: "Confirmar meu email", url: link },
    rodape:
      "Se não foi você, pode ignorar esta mensagem — sem confirmar, a conta não existe de verdade. O link vale por uma hora.",
  };
}

export function emailDeSenha(para: string, link: string): Email {
  return {
    para,
    assunto: "Trocar sua senha — dindi",
    titulo: "Vamos trocar sua senha",
    paragrafos: [
      "Você pediu para trocar a senha do dindi. É só clicar no botão abaixo e escolher uma nova.",
    ],
    botao: { texto: "Escolher senha nova", url: link },
    rodape:
      "Se não foi você que pediu, ignore esta mensagem: sua senha continua a mesma e ninguém entrou na sua conta. O link vale por uma hora e só funciona uma vez.",
  };
}
