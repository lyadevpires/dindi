import type { MetadataRoute } from "next";

/**
 * O que faz o celular entender que o dindi é um app, e não uma página.
 *
 * Com isto, "Adicionar à tela de início" cria um ícone do porquinho e abre em
 * tela cheia, sem barra de endereço. `start_url` cai direto no resumo do mês;
 * quem ainda não entrou é mandado para o login pelo próprio site.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "dindi — o dinheiro da casa, sem planilha",
    short_name: "dindi",
    description:
      "Registre gastos conversando com o Claude. O dindi cuida das contas, faturas, orçamento e metas — sozinha ou dividindo com quem mora com você.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdf8f3",
    theme_color: "#fdf8f3",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // O Android recorta este em círculo, folha ou o que o tema mandar.
      { src: "/icon-mascara-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Extrato", url: "/extrato" },
      { name: "Metas", url: "/metas" },
      { name: "Cartões", url: "/cartoes" },
    ],
  };
}
