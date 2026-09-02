import type { Metadata, Viewport } from "next";
import { Outfit, Figtree } from "next/font/google";
import "./globals.css";

// Outfit é a fonte de exibição — títulos, valores, rótulos, nomes. Figtree é a
// de corpo — parágrafos, descrições, metadados. Foi o par escolhido no redesign.
const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "dindi — seu dinheiro, sem planilha",
  description:
    "Registre gastos conversando com o Claude. O dindi cuida das contas, faturas, orçamento e metas — sozinha ou dividindo com quem você quiser.",
  // Sem isto o iPhone abre o atalho dentro do Safari, com barra de endereço e tudo.
  appleWebApp: { capable: true, title: "dindi", statusBarStyle: "default" },
};

/** A cor da barra do celular. Igual ao fundo, para não existir emenda. */
export const viewport: Viewport = {
  themeColor: "#FCF5EA",
  // Deixar dar zoom num número é bom; esticar a tela toda, não.
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
