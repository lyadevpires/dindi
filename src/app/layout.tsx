import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  themeColor: "#fdf8f3",
  // Deixar dar zoom num número é bom; esticar a tela toda, não.
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
