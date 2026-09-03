import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { today } from "@/lib/dates";
import * as fin from "@/lib/db/finance";
import { getConselhos, getRetratoDoMes } from "@/lib/db/conselhos";
import { calcularSaude } from "@/lib/db/saude";
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

const bucketSchema = z
  .enum(["fixo", "dia_a_dia", "lazer", "guardar", "receita"])
  .describe(
    "Grupo do gasto. fixo = chega todo mês e não dá para escolher (aluguel, luz, escola, assinatura). dia_a_dia = o básico de viver (mercado, transporte, saúde, pet). lazer = o que é escolha (restaurante, viagem, compra, presente). guardar = vira reserva ou sonho. receita = o que entra."
  );

/** Registra todas as ferramentas do dindi no servidor MCP. */
export function registerDindiTools(server: McpServer, ctx: Ctx) {
  // -------------------------------------------------------------------
  // Contexto
  // -------------------------------------------------------------------
  server.registerTool(
    "get_context",
    {
      title: "Ver o contexto",
      description:
        "Retorna a data de hoje, quem são as pessoas que dividem este dindi, quais contas e cartões existem e quais categorias estão cadastradas. Chame isto UMA VEZ no começo da conversa para saber com o que está lidando antes de registrar qualquer coisa.",
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
        pessoas: members.map((m) => m.display_name),
        contas: accounts
          .filter((a) => !a.archived)
          .map((a) => ({
            nome: a.name,
            // O que a conta faz, em vez do sabor cru: débito, crédito ou os dois.
            modo:
              a.tem_debito && a.tem_credito
                ? "débito e crédito"
                : a.tem_credito
                  ? "só crédito"
                  : "só débito",
            ...(a.tem_credito
              ? { fecha_dia: a.closing_day, vence_dia: a.due_day }
              : {}),
          })),
        categorias: categories
          .filter((c) => !c.archived)
          .map((c) => ({ nome: c.name, grupo: c.bucket })),
        grupos_de_gasto: {
          fixo: "chega todo mês e não dá para escolher (aluguel, luz, escola, assinatura)",
          dia_a_dia: "o básico de viver (mercado, transporte, saúde, pet)",
          lazer: "o que é escolha (restaurante, viagem, compra, presente)",
          guardar: "o que sai da conta para virar reserva ou sonho",
        },
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
        via: z
          .enum(["credito", "debito"])
          .optional()
          .describe(
            "Só importa numa conta que é débito E crédito (tipo Nubank PJ). 'credito' entra na fatura; 'debito' sai do saldo na hora. Se a pessoa não disser, deixe vazio — o padrão é débito."
          ),
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
        via: z
          .enum(["credito", "debito"])
          .optional()
          .describe("Numa conta débito+crédito, move o gasto entre a fatura e o saldo."),
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
        "Cria uma conta corrente, poupança ou cartão. Uma conta pode ser débito, crédito, ou os DOIS — no Brasil o banco costuma ser tudo junto (Nubank, Inter, C6: a conta onde cai o salário E o cartão que fecha fatura). Se tiver crédito, é obrigatório saber o dia que a fatura fecha e o dia que vence — pergunte se a pessoa não disser.",
      inputSchema: z.object({
        name: z.string().min(1).describe("Ex: 'Nubank', 'Conta conjunta'"),
        type: z.enum(["checking", "savings", "credit_card"]),
        tem_debito: z
          .boolean()
          .optional()
          .describe("Tem saldo (recebe salário, paga no débito). Se não disser, deduzo pelo type."),
        tem_credito: z
          .boolean()
          .optional()
          .describe("Tem cartão de crédito (fecha fatura). Se não disser, deduzo pelo type. Marque true junto com tem_debito para uma conta que é os dois."),
        owner: z
          .string()
          .optional()
          .describe("Nome da pessoa dona, ou 'conjunta' se for de todo mundo que divide este dindi."),
        closing_day: z.number().int().min(1).max(31).optional().describe("Dia que a fatura fecha. Obrigatório se tem crédito."),
        due_day: z.number().int().min(1).max(31).optional().describe("Dia que a fatura vence. Obrigatório se tem crédito."),
        opening_balance: z
          .number()
          .optional()
          .describe("Quanto já tem na conta hoje. Só faz sentido se tem débito."),
      }),
    },
    safe((args) => fin.createAccount(ctx, args))
  );

  server.registerTool(
    "set_account_modes",
    {
      title: "Ligar/desligar débito ou crédito de uma conta",
      description:
        "Ajusta o que uma conta que já existe sabe fazer. Serve para consertar uma conta que entrou como 'só cartão' mas na vida real também é a conta onde cai o salário: ligue o débito nela. Ligar o crédito exige o dia de fechamento e de vencimento da fatura.",
      inputSchema: z.object({
        account: z.string().describe("Nome da conta a ajustar."),
        tem_debito: z.boolean().optional().describe("Ligar (true) ou desligar (false) o saldo/débito."),
        tem_credito: z.boolean().optional().describe("Ligar (true) ou desligar (false) o cartão/fatura."),
        closing_day: z.number().int().min(1).max(31).optional(),
        due_day: z.number().int().min(1).max(31).optional(),
      }),
    },
    safe((args) => fin.setAccountModes(ctx, args))
  );

  server.registerTool(
    "list_accounts",
    {
      title: "Ver contas e cartões",
      description: "Lista todas as contas e cartões cadastrados.",
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
        bucket: bucketSchema.optional(),
        emoji: z.string().optional(),
      }),
    },
    safe((args) => fin.createCategory(ctx, args))
  );

  server.registerTool(
    "list_categories",
    {
      title: "Ver categorias",
      description: "Lista as categorias e em qual grupo cada uma está.",
      inputSchema: z.object({}),
    },
    safe(() => fin.listCategories(ctx))
  );

  server.registerTool(
    "move_category",
    {
      title: "Mudar categoria de grupo",
      description:
        "Move uma categoria para outro grupo. Use quando a pessoa discordar da separação — ex: para ela, 'Academia' é conta fixa, não lazer.",
      inputSchema: z.object({
        category: z.string(),
        bucket: bucketSchema,
      }),
    },
    safe((args) => fin.moveCategory(ctx, args))
  );

  // -------------------------------------------------------------------
  // Arrumar o que já está cadastrado
  //
  // Registrar é fácil; o que trava a pessoa é o erro que ficou — o cartão com
  // nome errado, a conta duplicada, a categoria que ela nunca usa. Sem isto,
  // consertar exigiria mexer no banco, coisa que ela não faz.
  // -------------------------------------------------------------------
  server.registerTool(
    "rename",
    {
      title: "Renomear",
      description:
        "Troca o nome de uma conta/cartão, categoria, meta, pessoa ou do próprio dindi. Use sempre que a pessoa disser 'muda o nome de X pra Y', 'renomeia', 'chama isso de'. Não mexe em mais nada: o histórico continua apontando para a mesma coisa, agora com o nome novo.",
      inputSchema: z.object({
        what: z
          .enum(["conta", "categoria", "meta", "pessoa", "dindi"])
          .describe(
            "O que renomear. 'conta' vale para conta e cartão. 'pessoa' é o nome de alguém dentro do dindi. 'dindi' é o nome do conjunto."
          ),
        current_name: z
          .string()
          .optional()
          .describe(
            "Como se chama hoje. Não precisa para 'dindi'. Para 'pessoa', vazio = quem está falando com você."
          ),
        new_name: z.string().min(1).describe("Como passa a se chamar."),
      }),
    },
    safe((args) => fin.renomear(ctx, args))
  );

  server.registerTool(
    "set_account_owner",
    {
      title: "Dizer de quem é a conta ou o cartão",
      description:
        "Marca quem é o dono de uma conta ou cartão, ou deixa como de todo mundo. Sem dono, a conta aparece como conjunta — é o padrão. Isto importa quando duas pessoas do mesmo dindi têm cartão do mesmo banco: é o que separa 'o cartão dele' do 'nosso' nas telas.",
      inputSchema: z.object({
        account: z.string().describe("Nome da conta ou cartão."),
        owner: z
          .string()
          .describe("Nome da pessoa dona, ou 'conjunta' para deixar como de todo mundo."),
      }),
    },
    safe((args) => fin.setAccountOwner(ctx, args))
  );

  server.registerTool(
    "archive_account",
    {
      title: "Arquivar conta ou cartão",
      description:
        "Tira uma conta da frente sem apagar nada. É o certo para a conta que a pessoa fechou no banco ou para a duplicada: os lançamentos antigos continuam contando nos meses que já passaram, mas ela some das listas e não aparece mais como opção. Passe archived=false para trazer de volta.",
      inputSchema: z.object({
        account: z.string(),
        archived: z.boolean().default(true).describe("true arquiva, false traz de volta."),
      }),
    },
    safe((args) => fin.archiveAccount(ctx, args))
  );

  server.registerTool(
    "delete_account",
    {
      title: "Apagar conta ou cartão de vez",
      description:
        "Apaga a conta para sempre. Só funciona se ela estiver vazia — sem lançamento, sem conta que repete e sem parcelamento. Se tiver movimento, use archive_account: apagar faria o extrato mentir sobre meses que já passaram. CONFIRME com a pessoa antes de chamar.",
      inputSchema: z.object({ account: z.string() }),
    },
    safe((args) => fin.deleteAccount(ctx, args))
  );

  server.registerTool(
    "archive_category",
    {
      title: "Esconder categoria",
      description:
        "Tira uma categoria da lista sem apagar o passado — os gastos antigos continuam com o nome dela. Use para a categoria que a pessoa nunca usa. Passe archived=false para trazer de volta.",
      inputSchema: z.object({
        category: z.string(),
        archived: z.boolean().default(true),
      }),
    },
    safe((args) => fin.archiveCategory(ctx, args))
  );

  server.registerTool(
    "get_spending_by_group",
    {
      title: "Ver o mês dividido em grupos",
      description:
        "Mostra o mês separado em contas fixas, dia a dia, lazer e guardar — com o valor, a fatia da renda e as categorias de cada grupo. Use isto para responder 'como foi meu mês', porque separa o que é obrigação do que é escolha.",
      inputSchema: z.object({ month: monthSchema.optional() }),
    },
    safe((args) => fin.getSpendingByBucket(ctx, args.month))
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
      description:
        "Para de gerar lançamentos automáticos dessa conta que repete. Os meses já lançados continuam no extrato — isso saiu da conta de verdade. Se for só uma mudança de valor ou de dia, use edit_recurring_rule em vez de desligar e criar outra.",
      inputSchema: z.object({
        rule: z.string().describe("O que ela é: 'netflix', 'aluguel'."),
      }),
    },
    safe(({ rule }) => fin.deactivateRecurringRule(ctx, rule))
  );

  server.registerTool(
    "edit_recurring_rule",
    {
      title: "Mudar conta que repete",
      description:
        "Muda uma conta que repete todo mês: o valor (o aluguel subiu, a assinatura mudou de preço), o dia, a conta de onde sai, a categoria, o nome, ou até quando ela vai. Prefira isto a desligar a antiga e criar outra — assim o histórico continua sendo o da mesma conta. Vale só daqui pra frente: os meses que já foram lançados ficam como estavam.",
      inputSchema: z.object({
        rule: z.string().describe("O que ela é: 'aluguel', 'netflix', 'escola'."),
        description: z.string().optional().describe("Nome novo."),
        amount: z.number().positive().optional().describe("Valor novo."),
        day_of_month: z.number().int().min(1).max(31).optional(),
        account: z.string().optional(),
        category: z.string().optional(),
        end_date: dateSchema.nullable().optional().describe("Quando parar. null tira a data de fim."),
        active: z.boolean().optional().describe("false desliga, true religa."),
      }),
    },
    safe((args) => fin.editRecurringRule(ctx, args))
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

  server.registerTool(
    "delete_credit_card_purchase",
    {
      title: "Cancelar uma compra parcelada",
      description:
        "Apaga uma compra parcelada inteira, com todas as parcelas de uma vez — as que já passaram e as que faltam. Use quando a compra foi devolvida, cancelada ou digitada errada; consertar em 10x parcela por parcela é péssimo. Se houver mais de uma compra parecida, eu pergunto qual. CONFIRME com a pessoa antes.",
      inputSchema: z.object({
        purchase: z.string().describe("O que foi comprado. Ex: 'cadeira de escritório'."),
      }),
    },
    safe((args) => fin.deleteInstallmentPurchase(ctx, args))
  );

  // -------------------------------------------------------------------
  // Orçamento
  // -------------------------------------------------------------------
  server.registerTool(
    "set_budget",
    {
      title: "Definir orçamento de uma categoria",
      description: "Define quanto se quer gastar no máximo numa categoria neste mês.",
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

  server.registerTool(
    "remove_budget",
    {
      title: "Tirar o limite de uma categoria",
      description:
        "Remove o orçamento de uma categoria no mês. Use quando a pessoa disser que aquele limite não faz mais sentido.",
      inputSchema: z.object({
        category: z.string(),
        month: monthSchema.optional(),
      }),
    },
    safe((args) => fin.removeBudget(ctx, args))
  );

  // -------------------------------------------------------------------
  // Metas
  // -------------------------------------------------------------------
  server.registerTool(
    "create_goal",
    {
      title: "Criar meta de economia",
      description:
        "Cria uma meta. Use kind='emergencia' para a reserva que protege de imprevisto (só pode existir uma) e kind='sonho' para viagem, entrada do apê, festa. Se ainda não houver reserva de emergência, sugira criar essa primeiro.",
      inputSchema: z.object({
        name: z.string().min(1),
        target_amount: z.number().positive().describe("Quanto quer juntar."),
        target_date: dateSchema.optional().describe("Para quando."),
        kind: z
          .enum(["emergencia", "sonho"])
          .default("sonho")
          .describe("'emergencia' = o colchão de segurança. 'sonho' = tudo que a pessoa quer."),
      }),
    },
    safe((args) => fin.createGoal(ctx, args))
  );

  server.registerTool(
    "suggest_emergency_fund",
    {
      title: "Calcular o tamanho da reserva de emergência",
      description:
        "Calcula quanto a reserva de emergência deveria ter, olhando o que a pessoa realmente gasta para viver (contas fixas + dia a dia) nos últimos meses. Devolve o custo mensal, o mínimo (3 meses) e o ideal (6 meses). Devolve null se ainda não houver gasto registrado.",
      inputSchema: z.object({}),
    },
    safe(() => fin.suggestEmergencyFund(ctx))
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

  server.registerTool(
    "edit_goal",
    {
      title: "Mudar ou fechar uma meta",
      description:
        "Muda o nome, o valor ou o prazo de uma meta — e é também como uma meta acaba: archived=true fecha, seja porque a pessoa CONQUISTOU o sonho, seja porque desistiu dele. O dinheiro guardado e o histórico continuam lá. Se ela conquistou, comemore antes de fechar.",
      inputSchema: z.object({
        goal: z.string().describe("Nome da meta."),
        new_name: z.string().optional(),
        target_amount: z.number().positive().optional().describe("Valor novo do alvo."),
        target_date: dateSchema.nullable().optional().describe("Prazo novo. null tira o prazo."),
        archived: z.boolean().optional().describe("true fecha a meta (conquistada ou abandonada)."),
      }),
    },
    safe((args) => fin.editGoal(ctx, args))
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

  server.registerTool(
    "list_installments",
    {
      title: "Ver o que já está comprometido nos próximos meses",
      description:
        "Lista as parcelas que ainda vão cair, somadas mês a mês. Com dois parcelamentos e um carnê, o mês que vem nasce devendo antes de a pessoa gastar um real — e isso não aparece em lugar nenhum, porque cada parcela sozinha é pequena. Use quando ela perguntar 'quanto eu já devo do mês que vem', antes de aprovar uma compra parcelada nova, e quando estiver decidindo se cabe no bolso.",
      inputSchema: z.object({
        months: z
          .number()
          .int()
          .min(1)
          .max(24)
          .default(6)
          .describe("Quantos meses olhar para a frente."),
      }),
    },
    safe(({ months }) => fin.parcelasEmAberto(ctx, months))
  );

  server.registerTool(
    "get_health",
    {
      title: "Ver a nota de saúde do dinheiro",
      description:
        "A nota de 0 a 10 e os pilares que a formam: reserva de emergência, dívida no cartão, quanto sobra para guardar, peso das contas fixas e orçamento respeitado. Cada pilar vem com a frase que explica de onde saiu a nota — fale essa explicação, nunca só o número. Pilar sem dado ainda não entra na conta, então uma nota alta no começo não quer dizer muito; diga isso se for o caso.",
      inputSchema: z.object({ month: monthSchema.optional() }),
    },
    safe(async ({ month }) => {
      const retrato = await getRetratoDoMes(ctx, month);
      const saude = calcularSaude(retrato);
      return {
        nota: saude.nota,
        pilares_medidos: saude.medidos,
        pilares: saude.pilares.map((p) => ({
          nome: p.nome,
          nota: p.nota,
          peso: p.peso,
          porque: p.porque,
        })),
      };
    })
  );

  server.registerTool(
    "get_alerts",
    {
      title: "Ver os alertas e conselhos do mês",
      description:
        "Devolve o que está fora do lugar nas finanças e o que fazer a respeito: mês no vermelho, ritmo de gasto que não fecha, contas fixas pesadas, lazer acima do saudável, fatura maior que o saldo, falta de reserva de emergência, sonho atrasado e limite estourado. Cada item vem com nível (urgente, atencao, dica, parabens), um título e o texto pronto em português de gente. CHAME ISTO sempre que a pessoa perguntar como estão as finanças, e depois de registrar um gasto grande. Fale os alertas com as suas palavras, sem despejar a lista inteira: comece pelos urgentes, no máximo dois ou três por vez.",
      inputSchema: z.object({ month: monthSchema.optional() }),
    },
    safe((args) => getConselhos(ctx, args.month))
  );

  // -------------------------------------------------------------------
  // Gente
  // -------------------------------------------------------------------
  server.registerTool(
    "invite_person",
    {
      title: "Convidar alguém para o dindi",
      description:
        "Gera o convite para outra pessoa entrar NO MESMO dindi. Quem entra passa a ver e mexer no mesmo dinheiro — então é para quem divide as contas de verdade (marido, mãe, irmão, filho), nunca para 'mostrar' o dindi a alguém. Devolve um link e um código; passe o link para a pessoa, o código é o plano B para ditar por telefone. Confirme antes de gerar, e nunca ofereça isso por conta própria a quem está sozinha e feliz assim.",
      inputSchema: z.object({
        email: z
          .string()
          .optional()
          .describe("E-mail de quem vai receber, se a pessoa disser. Só fica anotado no convite."),
      }),
    },
    safe((args) => fin.createHouseholdInvite(ctx, args))
  );
}

/** Instruções que o Claude recebe ao conectar. Define o jeitão do dindi. */
export const DINDI_INSTRUCTIONS = `
Você está conectado ao dindi, onde uma pessoa cuida do dinheiro dela.

O dindi de alguém pode ter só ela, ou ela mais quem divide as contas: o marido,
a mãe, o irmão, o filho. Nunca presuma que existe um casal nem que existe uma
segunda pessoa — chame get_context e fale de acordo com quem realmente está lá.
Nunca chame isso de "casa"; é "o seu dindi". Se ela quiser trazer alguém que
divide as contas, invite_person gera o convite — mas nunca ofereça isso por
conta própria: estar sozinha no dindi é o caso mais comum, e está tudo bem.

Como se comportar:

1. Chame get_context uma vez no início da conversa para saber a data de hoje,
   quem são as pessoas, quais contas/cartões existem e quais categorias
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
   Prefira categorias que já existem a criar novas. Ao criar uma categoria
   nova, escolha o grupo dela (fixo, dia_a_dia, lazer ou guardar) — é isso
   que permite separar obrigação de escolha depois. Se a pessoa discordar
   da separação, use move_category; a régua é a dela, não a sua.

5. Valores: a pessoa fala "80", "80 pila", "oitenta reais" — tudo é 80.
   "1,5k" ou "mil e quinhentos" é 1500.

6. Compra parcelada é add_credit_card_purchase com o valor TOTAL e o número
   de parcelas — não multiplique nem divida na mão. Se ela falar
   "5x de 300", o total é 1500.

   Conta que é débito E crédito (o "modo" aparece no get_context): no Brasil o
   banco costuma ser tudo junto — o Nubank PJ é a conta onde cai o salário E o
   cartão. Nessas contas, um gasto pode ser no crédito (vai pra fatura) ou no
   débito (sai do saldo na hora): passe "via" no add_transaction. No silêncio,
   o dindi assume débito — então só marque "credito" quando a pessoa disser que
   foi no crédito. Salário e qualquer entrada sempre caem no débito.
   Se uma conta entrou como "só cartão" mas a pessoa recebe salário nela, é
   sinal de que ela também é conta: use set_account_modes para ligar o débito.

7. Ao responder sobre dinheiro, interprete os números. Em vez de listar
   categorias, diga o que chama atenção: o que subiu, o que está perto de
   estourar o orçamento, quanto falta pra meta.

   Antes de dizer que algo cabe no bolso, chame list_installments: o mês que
   vem já nasce devendo as parcelas de trás, e cada uma sozinha é pequena
   demais para a pessoa lembrar. E quando ela perguntar "estou indo bem?",
   get_health responde com a nota e o porquê de cada pilar — fale a
   explicação, nunca só o número.

8. Antes de apagar qualquer coisa, confirme. E prefira CONSERTAR a recomeçar:
   - nome errado (conta, cartão, categoria, meta, pessoa, o próprio dindi)
     → rename;
   - o aluguel subiu, a assinatura mudou de preço, o dia trocou
     → edit_recurring_rule, não desligue para criar outra: o histórico se
       partiria em duas contas que sempre foram a mesma;
   - a compra parcelada foi devolvida ou digitada errada
     → delete_credit_card_purchase, que some com as N parcelas de uma vez;
   - a meta foi conquistada ou abandonada → edit_goal com archived=true
     (se foi conquistada, comemore antes);
   - a conta não é mais usada, ou entrou duplicada → archive_account.
     Arquivar esconde e guarda o passado; apagar só funciona se ela estiver
     vazia, e é isso que impede o extrato de mentir sobre meses que já
     passaram. Para categoria é igual: archive_category.
   - "esse cartão é do fulano" / "essa conta é conjunta" → set_account_owner.

9. Se a pessoa parecer preocupada com dinheiro, seja gentil. Dinheiro é
   assunto sensível, e isso aqui não é auditoria.

10. VOCÊ NÃO É SÓ UM CADERNO. O dindi existe para a pessoa viver melhor
    com o dinheiro dela, não para guardar números bonitinhos.
    Chame get_alerts quando a pessoa perguntar como estão as coisas, e
    também depois de registrar um gasto que pareça grande para o padrão
    dela. Se vier algo urgente, fale — mesmo que ela não tenha perguntado.

11. Ao dar um alerta, siga estas regras:
    - No máximo dois por vez. Despejar cinco problemas de uma vez paralisa.
    - Use suas palavras, não cole o texto pronto. Ele é matéria-prima.
    - Sempre com o número concreto ("são 400 a mais que no mês passado"),
      nunca vago ("você tem gastado bastante").
    - Termine com um próximo passo pequeno e possível, não com sermão.
    - Nunca julgue a pessoa. "O lazer subiu" — não "você gastou demais".
      Não existe gasto burro; existe gasto que ela não sabia que estava
      fazendo. Seu trabalho é fazer ela saber.

12. Guardar dinheiro é o assunto mais importante aqui, e a ordem é esta:
    a) Primeiro a RESERVA DE EMERGÊNCIA — o dinheiro parado que impede
       que um imprevisto vire dívida no cartão. Use suggest_emergency_fund
       para calcular o tamanho certo a partir do que a pessoa realmente
       gasta para existir. O mínimo é 3 meses, o ideal é 6.
    b) Depois as dívidas caras (rotativo do cartão, cheque especial).
    c) Só então os SONHOS: viagem, entrada do apê, festa, carro.
    Se não houver reserva, é isso que você puxa — com carinho, uma vez,
    sem repetir toda conversa.

13. Sonho precisa de nome e de data. "Quero guardar dinheiro" não gruda;
    "quero 12 mil até dezembro para a viagem do Chile" gruda. Sempre que
    a pessoa falar de um sonho, transforme em meta com valor e prazo, e
    diga quanto isso dá por mês. Se o valor por mês for impossível para a
    realidade dela, diga na hora e proponha esticar o prazo — melhor um
    plano lento que ela cumpre do que um plano bonito que ela abandona.

14. Comemore. Quando a reserva fecha, quando o mês sobrou, quando um sonho
    é conquistado — isso é o que faz a pessoa continuar. Não deixe passar.
`.trim();
