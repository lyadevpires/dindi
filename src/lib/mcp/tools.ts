import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { today } from "@/lib/dates";
import * as fin from "@/lib/db/finance";
import { allMembers, allAccounts, allCategories } from "@/lib/db/resolve";
import { DindiError, type Ctx } from "@/lib/db/types";

/** Resposta padrão de uma ferramenta. */
function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

/** Envolve o handler para transformar erro em mensagem amigável. */
function safe<T>(fn: (args: T) => Promise<unknown>) {
  return async (args: T) => {
    try {
      return ok(await fn(args));
    } catch (e) {
      if (e instanceof DindiError) return fail(e.message);
      const msg = e instanceof Error ? e.message : String(e);
      return fail(`Deu ruim aqui no dindi: ${msg}`);
    }
  };
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato AAAA-MM-DD")
  .describe("Data no formato AAAA-MM-DD. Se não informar, uso hoje.");

const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/, "use AAAA-MM")
  .describe("Mês no formato AAAA-MM. Se não informar, uso o mês atual.");

/** Registra todas as ferramentas do dindi no servidor MCP. */
export function registerDindiTools(server: McpServer, ctx: Ctx) {
  // -------------------------------------------------------------------
  // Contexto
  // -------------------------------------------------------------------
  server.registerTool(
    "get_context",
    {
      title: "Ver o contexto da casa",
      description:
        "Retorna a data de hoje, quem são as pessoas da casa, quais contas e cartões existem e quais categorias estão cadastradas. Chame isto UMA VEZ no começo da conversa para saber com o que está lidando antes de registrar qualquer coisa.",
      inputSchema: z.object({}),
    },
    safe(async () => {
      const [members, accounts, categories] = await Promise.all([
        allMembers(ctx),
        allAccounts(ctx),
        allCategories(ctx),
      ]);

      return {
        hoje: today(),
        voce_esta_falando_com: members.find((m) => m.user_id === ctx.userId)?.display_name,
        pessoas_da_casa: members.map((m) => m.display_name),
        contas: accounts
          .filter((a) => !a.archived)
          .map((a) => ({
            nome: a.name,
            tipo: a.type,
            ...(a.type === "credit_card"
              ? { fecha_dia: a.closing_day, vence_dia: a.due_day }
              : {}),
          })),
        categorias: categories.filter((c) => !c.archived).map((c) => c.name),
      };
    })
  );

  // -------------------------------------------------------------------
  // Transações
  // -------------------------------------------------------------------
  server.registerTool(
    "add_transaction",
    {
      title: "Registrar gasto ou receita",
      description:
        "Registra um gasto (expense) ou uma receita (income). Para compra PARCELADA no cartão use add_credit_card_purchase. Se a pessoa não disser a conta e existir mais de uma, pergunte antes.",
      inputSchema: z.object({
        amount: z.number().positive().describe("Valor em reais. Ex: 80.50"),
        description: z.string().min(1).describe("O que foi. Ex: 'mercado', 'uber pro trabalho'"),
        type: z
          .enum(["expense", "income"])
          .default("expense")
          .describe("expense = saiu dinheiro, income = entrou dinheiro"),
        date: dateSchema.optional(),
        category: z
          .string()
          .optional()
          .describe("Nome da categoria. Se não existir, crio. Infira pelo contexto e confirme com a pessoa."),
        account: z.string().optional().describe("Nome da conta ou cartão."),
        person: z.string().optional().describe("Quem pagou. Se não informar, assumo quem está falando."),
        note: z.string().optional(),
      }),
    },
    safe((args) => fin.addTransaction(ctx, args))
  );

  server.registerTool(
    "edit_transaction",
    {
      title: "Corrigir um lançamento",
      description:
        "Altera um lançamento já registrado. Use list_transactions antes para achar o id certo.",
      inputSchema: z.object({
        id: z.string().describe("id do lançamento"),
        amount: z.number().positive().optional(),
        description: z.string().optional(),
        date: dateSchema.optional(),
        category: z.string().optional(),
        account: z.string().optional(),
        person: z.string().optional(),
        type: z.enum(["expense", "income"]).optional(),
      }),
    },
    safe((args) => fin.editTransaction(ctx, args))
  );

  server.registerTool(
    "delete_transaction",
    {
      title: "Apagar um lançamento",
      description:
        "Apaga um lançamento. Confirme com a pessoa antes de apagar — isso não tem volta.",
      inputSchema: z.object({ id: z.string() }),
    },
    safe(({ id }) => fin.deleteTransaction(ctx, id))
  );

  server.registerTool(
    "list_transactions",
    {
      title: "Ver extrato",
      description:
        "Lista lançamentos com filtros. Útil para responder 'quanto gastei com X', 'o que a Maria pagou esse mês', ou para achar o id de algo que a pessoa quer corrigir.",
      inputSchema: z.object({
        month: monthSchema.optional(),
        from: dateSchema.optional(),
        to: dateSchema.optional(),
        category: z.string().optional(),
        account: z.string().optional(),
        person: z.string().optional(),
        type: z.enum(["expense", "income"]).optional(),
        search: z.string().optional().describe("Busca por parte da descrição."),
        limit: z.number().int().min(1).max(500).optional(),
      }),
    },
    safe((args) => fin.listTransactions(ctx, args))
  );

  server.registerTool(
    "get_balance",
    {
      title: "Ver saldo",
      description:
        "Saldo de cada conta, dívida em aberto dos cartões e o total. Use para responder 'quanto temos?' ou 'quanto sobrou?'.",
      inputSchema: z.object({
        account: z.string().optional().describe("Deixe vazio para ver todas as contas."),
      }),
    },
    safe(({ account }) => fin.getBalance(ctx, account))
  );

  // -------------------------------------------------------------------
  // Renda
  // -------------------------------------------------------------------
  server.registerTool(
    "add_income",
    {
      title: "Registrar entrada de dinheiro",
      description: "Atalho para registrar receita (salário, freela, rendimento).",
      inputSchema: z.object({
        amount: z.number().positive(),
        description: z.string().min(1),
        date: dateSchema.optional(),
        category: z.string().optional(),
        account: z.string().optional(),
        person: z.string().optional().describe("Quem recebeu."),
      }),
    },
    safe((args) => fin.addTransaction(ctx, { ...args, type: "income" }))
  );

  server.registerTool(
    "list_income",
    {
      title: "Ver receitas",
      description: "Lista só as entradas de dinheiro do período.",
      inputSchema: z.object({
        month: monthSchema.optional(),
        person: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      }),
    },
    safe((args) => fin.listTransactions(ctx, { ...args, type: "income" }))
  );

  // -------------------------------------------------------------------
  // Contas e categorias
  // -------------------------------------------------------------------
  server.registerTool(
    "create_account",
    {
      title: "Criar conta ou cartão",
      description:
        "Cria uma conta corrente, poupança ou cartão de crédito. Para cartão, é obrigatório saber o dia que a fatura fecha e o dia que vence — pergunte se a pessoa não disser.",
      inputSchema: z.object({
        name: z.string().min(1).describe("Ex: 'Nubank', 'Conta conjunta'"),
        type: z.enum(["checking", "savings", "credit_card"]),
        owner: z
          .string()
          .optional()
          .describe("Nome da pessoa dona, ou 'conjunta' se for dos dois."),
        closing_day: z.number().int().min(1).max(31).optional().describe("Só para cartão."),
        due_day: z.number().int().min(1).max(31).optional().describe("Só para cartão."),
        opening_balance: z
          .number()
          .optional()
          .describe("Quanto já tem na conta hoje. Só para conta corrente/poupança."),
      }),
    },
    safe((args) => fin.createAccount(ctx, args))
  );

  server.registerTool(
    "list_accounts",
    {
      title: "Ver contas e cartões",
      description: "Lista todas as contas e cartões da casa.",
      inputSchema: z.object({}),
    },
    safe(() => fin.listAccounts(ctx))
  );

  server.registerTool(
    "create_category",
    {
      title: "Criar categoria",
      description:
        "Cria uma categoria nova. Normalmente não precisa: ao registrar um gasto com categoria inexistente, ela é criada sozinha.",
      inputSchema: z.object({
        name: z.string().min(1),
        kind: z.enum(["expense", "income", "both"]).default("expense"),
        emoji: z.string().optional(),
      }),
    },
    safe((args) => fin.createCategory(ctx, args))
  );

  server.registerTool(
    "list_categories",
    {
      title: "Ver categorias",
      description: "Lista as categorias cadastradas na casa.",
      inputSchema: z.object({}),
    },
    safe(() => fin.listCategories(ctx))
  );

  // -------------------------------------------------------------------
  // Recorrências
  // -------------------------------------------------------------------
  server.registerTool(
    "create_recurring_rule",
    {
      title: "Criar conta que repete todo mês",
      description:
        "Cria uma recorrência (aluguel, salário, assinatura). O dindi lança automaticamente todo mês no dia certo — a pessoa não precisa registrar de novo.",
      inputSchema: z.object({
        description: z.string().min(1).describe("Ex: 'Aluguel'"),
        amount: z.number().positive(),
        day_of_month: z.number().int().min(1).max(31).describe("Dia do mês em que cai."),
        type: z.enum(["expense", "income"]).default("expense"),
        account: z.string().optional(),
        category: z.string().optional(),
        person: z.string().optional(),
        start_date: dateSchema.optional(),
        end_date: dateSchema.optional().describe("Quando parar. Ex: última parcela do financiamento."),
      }),
    },
    safe((args) => fin.createRecurringRule(ctx, args))
  );

  server.registerTool(
    "list_recurring_rules",
    {
      title: "Ver contas que repetem",
      description: "Lista as recorrências cadastradas.",
      inputSchema: z.object({
        include_inactive: z.boolean().default(false),
      }),
    },
    safe(({ include_inactive }) => fin.listRecurringRules(ctx, !include_inactive))
  );

  server.registerTool(
    "deactivate_recurring_rule",
    {
      title: "Desativar recorrência",
      description: "Para de gerar lançamentos automáticos dessa recorrência.",
      inputSchema: z.object({ id: z.string() }),
    },
    safe(({ id }) => fin.deactivateRecurringRule(ctx, id))
  );

  // -------------------------------------------------------------------
  // Cartão de crédito
  // -------------------------------------------------------------------
  server.registerTool(
    "add_credit_card_purchase",
    {
      title: "Registrar compra no cartão (com parcelas)",
      description:
        "Registra uma compra no cartão, dividindo automaticamente nas faturas dos próximos meses. Use sempre que a pessoa falar 'parcelei', 'em Nx' ou 'dividi'. Para compra à vista no cartão, pode usar isto com installments=1.",
      inputSchema: z.object({
        description: z.string().min(1).describe("Ex: 'cadeira de escritório'"),
        total_amount: z.number().positive().describe("Valor TOTAL da compra, não o da parcela."),
        installments: z.number().int().min(1).max(72).describe("Número de parcelas."),
        card: z.string().optional().describe("Nome do cartão."),
        category: z.string().optional(),
        person: z.string().optional().describe("Quem comprou."),
        purchase_date: dateSchema.optional(),
      }),
    },
    safe((args) => fin.addCreditCardPurchase(ctx, args))
  );

  server.registerTool(
    "get_invoice",
    {
      title: "Ver fatura do cartão",
      description:
        "Mostra a fatura de um cartão: total, datas de fechamento e vencimento, gastos por categoria e a lista de compras.",
      inputSchema: z.object({
        card: z.string().optional(),
        month: monthSchema.optional().describe("Mês de referência da fatura."),
      }),
    },
    safe(({ card, month }) => fin.getInvoice(ctx, card, month))
  );

  server.registerTool(
    "pay_invoice",
    {
      title: "Marcar fatura como paga",
      description:
        "Registra o pagamento da fatura, descontando o valor da conta escolhida. Não crie um gasto separado para isso — as compras do cartão já foram contadas.",
      inputSchema: z.object({
        card: z.string().optional(),
        month: monthSchema.optional(),
        from_account: z.string().optional().describe("De qual conta saiu o dinheiro."),
      }),
    },
    safe((args) => fin.payInvoice(ctx, args))
  );

  // -------------------------------------------------------------------
  // Orçamento
  // -------------------------------------------------------------------
  server.registerTool(
    "set_budget",
    {
      title: "Definir orçamento de uma categoria",
      description: "Define quanto a casa quer gastar no máximo numa categoria neste mês.",
      inputSchema: z.object({
        category: z.string(),
        limit_amount: z.number().positive(),
        month: monthSchema.optional(),
      }),
    },
    safe((args) => fin.setBudget(ctx, args))
  );

  server.registerTool(
    "get_budget_status",
    {
      title: "Ver situação do orçamento",
      description:
        "Mostra quanto já foi gasto em cada categoria com orçamento, quanto sobra e o que está perto de estourar.",
      inputSchema: z.object({ month: monthSchema.optional() }),
    },
    safe(({ month }) => fin.getBudgetStatus(ctx, month))
  );

  // -------------------------------------------------------------------
  // Metas
  // -------------------------------------------------------------------
  server.registerTool(
    "create_goal",
    {
      title: "Criar meta de economia",
      description: "Cria uma meta, tipo reserva de emergência ou viagem.",
      inputSchema: z.object({
        name: z.string().min(1),
        target_amount: z.number().positive().describe("Quanto quer juntar."),
        target_date: dateSchema.optional().describe("Para quando."),
      }),
    },
    safe((args) => fin.createGoal(ctx, args))
  );

  server.registerTool(
    "contribute_to_goal",
    {
      title: "Guardar dinheiro numa meta",
      description:
        "Adiciona um aporte à meta. Use valor negativo se a pessoa precisou tirar dinheiro de lá.",
      inputSchema: z.object({
        goal: z.string().describe("Nome da meta."),
        amount: z.number().describe("Positivo para guardar, negativo para retirar."),
        date: dateSchema.optional(),
        person: z.string().optional(),
        note: z.string().optional(),
      }),
    },
    safe((args) => fin.contributeToGoal(ctx, args))
  );

  server.registerTool(
    "get_goal_progress",
    {
      title: "Ver progresso das metas",
      description:
        "Mostra quanto já foi juntado, quanto falta e quanto precisa guardar por mês para chegar na data alvo.",
      inputSchema: z.object({
        goal: z.string().optional().describe("Deixe vazio para ver todas."),
      }),
    },
    safe(({ goal }) => fin.getGoalProgress(ctx, goal))
  );

  // -------------------------------------------------------------------
  // Análise
  // -------------------------------------------------------------------
  server.registerTool(
    "get_financial_summary",
    {
      title: "Resumo financeiro para analisar",
      description:
        "Dados brutos para você analisar: totais por mês, gasto por categoria, gasto por pessoa, o que mais subiu em relação ao mês passado e os maiores gastos avulsos. Use isso para responder 'onde meu dinheiro está indo', 'o que subiu' ou 'onde dá para cortar' — e interprete, não devolva só números.",
      inputSchema: z.object({
        month: monthSchema.optional(),
        compare_months: z
          .number()
          .int()
          .min(1)
          .max(12)
          .default(3)
          .describe("Quantos meses trazer para comparação."),
      }),
    },
    safe((args) => fin.getFinancialSummary(ctx, args))
  );
}

/** Instruções que o Claude recebe ao conectar. Define o jeitão do dindi. */
export const DINDI_INSTRUCTIONS = `
Você está conectado ao dindi, o sistema de finanças de um casal.

Como se comportar:

1. Chame get_context uma vez no início da conversa para saber a data de hoje,
   quem são as pessoas da casa, quais contas/cartões existem e quais categorias
   já estão cadastradas. Não fique chamando isso a cada mensagem.

2. Fale como gente, não como planilha. "Prontinho, anotei!" em vez de
   "Transação registrada com sucesso (id: abc-123)". Nunca mostre ids na
   conversa, a não ser que a pessoa peça explicitamente.

3. Quando faltar informação essencial, pergunte ANTES de registrar:
   - Em qual conta ou cartão foi? (só pergunte se houver mais de uma opção)
   - Foi parcelado? (se o valor for alto e ela não disse)
   - Quem pagou? (só se houver dúvida real; por padrão é quem está falando)

4. Categoria: infira pelo contexto e diga qual escolheu ao confirmar
   ("anotei em Mercado"). Se a pessoa corrigir, use edit_transaction.
   Prefira categorias que já existem a criar novas.

5. Valores: a pessoa fala "80", "80 pila", "oitenta reais" — tudo é 80.
   "1,5k" ou "mil e quinhentos" é 1500.

6. Compra parcelada é add_credit_card_purchase com o valor TOTAL e o número
   de parcelas — não multiplique nem divida na mão. Se ela falar
   "5x de 300", o total é 1500.

7. Ao responder sobre dinheiro, interprete os números. Em vez de listar
   categorias, diga o que chama atenção: o que subiu, o que está perto de
   estourar o orçamento, quanto falta pra meta.

8. Antes de apagar qualquer coisa, confirme.

9. Se a pessoa parecer preocupada com dinheiro, seja gentil. Isso aqui é
   assunto sensível de casal, não é auditoria.
`.trim();
