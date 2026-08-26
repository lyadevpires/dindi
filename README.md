# dindi

**As finanças de vocês dois, sem planilha e sem formulário.**

Você conversa com o Claude do jeito que fala com uma pessoa:

> "gastei 45 no mercado"
> "comprei uma cadeira de 900 em 6x no cartão"
> "quanto sobrou esse mês?"
> "guardei 500 na reserva"

O Claude anota. Este site mostra.

---

## O que o dindi cuida sozinho

- **Contas e cartões** — quanto tem em cada lugar, quanto deve em cada cartão.
- **Fatura do cartão** — sabe em qual fatura cada compra cai, divide parcelas certinho
  e fecha a fatura no dia que fecha.
- **Contas que se repetem** — aluguel, salário, assinatura. Lança sozinho todo mês.
- **Orçamento** — você diz o limite por categoria e ele avisa quando está perto.
- **Metas** — a reserva, a viagem, a entrada do apê. É a primeira coisa que aparece.

Tudo é da **casa**: você e seu par veem os mesmos números, cada um entrando com a
própria conta.

---

## Como começar

1. Crie sua conta em **/criar-conta**.
2. Dê um nome para a casa de vocês.
3. Em **Casa**, clique em *Convidar meu par* e mande o código para ele.
4. Em **Conectar**, siga os 4 passos para ligar o dindi no seu Claude.
5. Comece a falar.

---

## Para quem for mexer no código

Next.js + Supabase, hospedado na Vercel. O Claude conversa com o dindi por um
servidor MCP com OAuth 2.1.

```bash
cp .env.example .env.local   # preencha as chaves do Supabase
npm install
npm run dev
```

O banco se monta sozinho: mudou algo em `supabase/*.sql`, publique e chame

```bash
curl -X POST https://SEU-SITE/api/setup -H "Authorization: Bearer $CRON_SECRET"
```

Pode repetir quantas vezes quiser, não estraga nada.

Detalhes de arquitetura e as regras que não se quebram estão em `CLAUDE.md`.
