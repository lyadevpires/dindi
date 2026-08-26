@AGENTS.md

# dindi

Finanças de casal onde **todo o registro acontece conversando com o Claude via MCP**.
O site é só visualização — não existe formulário de cadastro de gasto em lugar nenhum.

Quem toca este projeto é uma pessoa **não-técnica** fazendo vibe coding. Explique em
termos de produto ("agora o site mostra as metas"), nunca em termos técnicos. Faça tudo
por CLI; nunca peça para ela rodar comando, abrir arquivo ou colar código.

## Regras que não se quebram

- **Sempre com escopo de casa.** Toda query filtra `household_id`. O app é multi-tenant.
- **`supabaseAdmin()` só no MCP e no cron.** Ele passa por cima do RLS, então todo
  acesso a dados vai por `src/lib/db/*`, que exige um `Ctx { db, householdId, userId }`.
  As telas do site usam `pageCtx()`, que usa o cliente com cookie e mantém o RLS ligado.
- **Pagamento de fatura é transferência, não despesa.** Nunca criar uma transação ao
  pagar fatura — isso contaria o gasto duas vezes. Ver `payInvoice` e `getBalance`.
- **`invoice_month` é escrito na hora do insert.** Não deduzir a fatura por data depois.
- **Texto em português coloquial.** Nada de jargão, nada de id na tela. Este app aparece
  em vídeo.

## Mapa rápido

- `supabase/00{1,2,3}_*.sql` — schema, RLS e funções.
- `src/app/api/setup/route.ts` — aplica esses .sql. **Mexeu no schema? Publique e chame
  `POST /api/setup` com o `CRON_SECRET`.** As chaves do Supabase são "sensíveis" na
  Vercel e não podem ser lidas de fora, então só o deploy alcança o banco.
  O `prebuild` transforma os .sql em `src/lib/migrations.generated.ts` — não edite esse.
- `src/lib/db/finance.ts` — toda a regra de negócio. As ferramentas do MCP são casca fina.
- `src/lib/db/resolve.ts` — traduz nome falado ("cartão nubank") em registro.
- `src/lib/mcp/tools.ts` — as ferramentas + `DINDI_INSTRUCTIONS` (como o Claude deve agir).
- `src/lib/oauth.ts` + `src/app/api/oauth/*` — servidor OAuth 2.1 com DCR e PKCE.
- `src/app/api/cron/daily/route.ts` — recorrências e fechamento de fatura, idempotente.
- `src/proxy.ts` — renova a sessão do Supabase (no Next 16 isto substitui o middleware).

## Ambiente local

Não há Homebrew nesta máquina. Node e `gh` estão em `~/.local/opt` com links em
`~/.local/bin`. Antes de qualquer comando: `export PATH="$HOME/.local/bin:$PATH"`.
