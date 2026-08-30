import { redirect } from "next/navigation";

/**
 * O cadastro por formulário acabou: criar conta e entrar viraram a mesma
 * porta, a do Google. O endereço continua no ar porque ele já circulou por
 * aí — em story, em conversa — e link antigo não pode virar página de erro.
 */
export default function CriarContaPage() {
  redirect("/entrar");
}
