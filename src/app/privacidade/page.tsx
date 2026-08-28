import Link from "next/link";
import { Dindi } from "@/components/dindi";

export const metadata = {
  title: "Privacidade — dindi",
  description: "O que o dindi guarda, onde, quem vê e como apagar tudo.",
};

const CONTATO = "dindi.adm@gmail.com";

/**
 * A página de privacidade, escrita para ser lida.
 *
 * Texto de advogado ninguém lê, e uma política que ninguém lê não protege
 * ninguém — nem quem usa, nem quem opera. Aqui é português de gente, direto
 * ao ponto, dizendo inclusive as partes que não são bonitas (que a pessoa que
 * administra o dindi tem acesso técnico ao banco, e que o que você conversa
 * com o Claude passa pela Anthropic).
 */
export default function Privacidade() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-20 pt-10">
      <Link href="/" className="mb-8 inline-flex items-center gap-2">
        <Dindi size={30} />
        <span className="text-lg font-bold tracking-tight">dindi</span>
      </Link>

      <h1 className="text-3xl font-bold leading-tight tracking-tight">
        O que o dindi faz com os seus dados
      </h1>
      <p className="mt-3 text-base leading-relaxed text-suave">
        Sem letra miúda. Se depois de ler sobrar dúvida, escreve pra gente que a
        gente responde.
      </p>

      <Bloco titulo="O que fica guardado">
        <p>Só o que você conta pro dindi, e mais nada:</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>Seu email e o nome que você escolheu ser chamado.</li>
          <li>Suas contas e cartões: o nome que você deu, o tipo e o saldo.</li>
          <li>
            Seus lançamentos: valor, data, descrição, categoria e em qual conta caiu.
          </li>
          <li>Seus limites por categoria, suas metas e sua reserva.</li>
          <li>
            Se você ligou os avisos, o endereço que o navegador do seu celular usa para
            receber notificação.
          </li>
        </ul>
        <p className="mt-3">
          O dindi <strong className="font-medium text-tinta">não</strong> se conecta ao
          seu banco, não lê extrato, não pede senha de banco e não tem acesso a nenhuma
          conta sua. Tudo que ele sabe é o que você digitou ou contou pro Claude.
        </p>
      </Bloco>

      <Bloco titulo="Onde isso fica">
        <p>
          Os dados moram num banco de dados do{" "}
          <strong className="font-medium text-tinta">Supabase</strong>, e o site roda na{" "}
          <strong className="font-medium text-tinta">Vercel</strong>. São duas empresas de
          infraestrutura conhecidas, e são elas que guardam e servem as informações.
        </p>
        <p className="mt-3">
          Cada dindi é separado dos outros dentro do banco por uma trava do próprio
          Postgres: uma pessoa não consegue ler o dindi de outra, nem por engano nem de
          propósito.
        </p>
      </Bloco>

      <Bloco titulo="Quem consegue ver">
        <p>
          Você, e quem você convidar pro seu dindi. Mais ninguém — não tem perfil público,
          não tem feed, não tem ranking.
        </p>
        <p className="mt-3">
          Sendo honesto sobre a parte chata: quem administra o dindi tem acesso técnico ao
          banco de dados, como acontece em qualquer serviço. Esse acesso é usado para
          manter a coisa funcionando e para investigar problema quando alguém pede ajuda —
          nunca para bisbilhotar. Se isso te incomoda, é justo, e a gente entende.
        </p>
      </Bloco>

      <Bloco titulo="Quando você conecta o Claude">
        <p>
          Conectar é opcional. Se você conectar, o que você escrever nas conversas e as
          informações do seu dindi que o Claude precisar consultar passam pela{" "}
          <strong className="font-medium text-tinta">Anthropic</strong>, que é quem faz o
          Claude, sob as regras de privacidade dela.
        </p>
        <p className="mt-3">
          Você corta essa ligação quando quiser, em Ajustes → Apps conectados. A partir
          dali o Claude não alcança mais nada do seu dindi.
        </p>
      </Bloco>

      <Bloco titulo="O que a gente não faz">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Não vende seus dados. Para ninguém, nunca.</li>
          <li>Não tem anúncio, e ninguém compra espaço para te alcançar aqui.</li>
          <li>Não passa seus dados para banco, seguradora ou empresa de crédito.</li>
          <li>Não tem rastreador de propaganda pendurado no site.</li>
        </ul>
      </Bloco>

      <Bloco titulo="Como apagar tudo">
        <p>
          Em <strong className="font-medium text-tinta">Ajustes</strong>, lá no fim, tem
          &ldquo;Quero apagar minha conta&rdquo;. Apagar é apagar de verdade: some o seu
          login e some tudo que estava dentro do seu dindi. Não fica cópia escondida
          esperando você mudar de ideia.
        </p>
        <p className="mt-3">
          Se tiver mais gente no seu dindi, sair tira só você — os lançamentos ficam,
          porque o extrato é de todo mundo que estava lá.
        </p>
      </Bloco>

      <Bloco titulo="Seus direitos">
        <p>
          A LGPD (a lei brasileira de proteção de dados) te dá o direito de saber o que é
          guardado sobre você, corrigir o que estiver errado, pedir uma cópia e mandar
          apagar. Apagar você faz sozinha pelo app; para o resto, é só escrever.
        </p>
      </Bloco>

      <Bloco titulo="Falar com a gente">
        <p>
          Dúvida, pedido de cópia dos seus dados, ou qualquer coisa relacionada a
          privacidade:
        </p>
        <p className="mt-3">
          <a
            href={`mailto:${CONTATO}`}
            className="font-medium text-tinta underline underline-offset-2"
          >
            {CONTATO}
          </a>
        </p>
      </Bloco>

      <p className="mt-10 border-t border-borda pt-6 text-sm text-suave">
        Se alguma coisa aqui mudar, a gente atualiza esta página. O dindi é novo e está
        sendo construído à vista de todo mundo — se você achar que alguma parte disto
        está vaga demais, escreve, que a gente melhora o texto.
      </p>
    </main>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight">{titulo}</h2>
      <div className="mt-3 text-base leading-relaxed text-suave">{children}</div>
    </section>
  );
}
