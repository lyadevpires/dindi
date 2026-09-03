import {
  DindiError,
  type Account,
  type Bucket,
  type Category,
  type Ctx,
  type Member,
} from "./types";

/**
 * O Claude fala em nomes ("cartão nubank", "mercado", "a Maria"),
 * não em IDs. Estas funções traduzem nome → registro, e dão erros
 * úteis quando não acham (listando as opções disponíveis).
 */

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function pickByName<T extends { id: string; name: string }>(
  items: T[],
  query: string
): T | null {
  const q = normalize(query);
  if (!q) return null;

  const exact = items.find((i) => normalize(i.name) === q);
  if (exact) return exact;

  const starts = items.filter((i) => normalize(i.name).startsWith(q));
  if (starts.length === 1) return starts[0];

  const contains = items.filter(
    (i) => normalize(i.name).includes(q) || q.includes(normalize(i.name))
  );
  if (contains.length === 1) return contains[0];

  return null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------

export async function allAccounts(ctx: Ctx): Promise<Account[]> {
  const { data, error } = await ctx.db
    .from("accounts")
    .select("*")
    .eq("household_id", ctx.householdId)
    .order("name");
  if (error) throw new DindiError(error.message);
  return (data ?? []) as Account[];
}

export async function allCategories(ctx: Ctx): Promise<Category[]> {
  const { data, error } = await ctx.db
    .from("categories")
    .select("*")
    .eq("household_id", ctx.householdId)
    .order("name");
  if (error) throw new DindiError(error.message);
  return (data ?? []) as Category[];
}

export async function allMembers(ctx: Ctx): Promise<Member[]> {
  const { data, error } = await ctx.db
    .from("household_members")
    .select("*")
    .eq("household_id", ctx.householdId);
  if (error) throw new DindiError(error.message);
  return (data ?? []) as Member[];
}

// ---------------------------------------------------------------------

export async function resolveAccount(
  ctx: Ctx,
  query: string | undefined | null,
  opts: {
    type?: Account["type"];
    credito?: boolean;
    required?: boolean;
    /** Enxergar também as arquivadas — para desarquivar ou apagar de vez. */
    arquivadas?: boolean;
  } = {}
): Promise<Account | null> {
  const accounts = (await allAccounts(ctx)).filter((a) => opts.arquivadas || !a.archived);
  // `credito` filtra por capacidade (serve conta híbrida também); `type` ainda
  // filtra pelo sabor exato, quando alguém precisa disso.
  let pool = accounts;
  if (opts.credito) pool = pool.filter((a) => a.tem_credito);
  if (opts.type) pool = pool.filter((a) => a.type === opts.type);

  if (!query) {
    if (pool.length === 1) return pool[0];
    if (!opts.required) return null;
    throw new DindiError(
      `Preciso saber qual conta. Opções: ${pool.map((a) => a.name).join(", ") || "nenhuma cadastrada ainda"}.`
    );
  }

  if (UUID_RE.test(query)) {
    const byId = pool.find((a) => a.id === query);
    if (byId) return byId;
  }

  const found = pickByName(pool, query);
  if (found) return found;

  throw new DindiError(
    `Não achei a conta "${query}". Opções: ${pool.map((a) => a.name).join(", ") || "nenhuma cadastrada ainda"}.`
  );
}

export async function resolveCategory(
  ctx: Ctx,
  query: string | undefined | null,
  opts: {
    createIfMissing?: boolean;
    kind?: "expense" | "income";
    bucket?: Bucket;
    /** Enxergar também as arquivadas — para desarquivar. */
    arquivadas?: boolean;
  } = {}
): Promise<Category | null> {
  if (!query) return null;

  const categories = (await allCategories(ctx)).filter((c) => opts.arquivadas || !c.archived);

  if (UUID_RE.test(query)) {
    const byId = categories.find((c) => c.id === query);
    if (byId) return byId;
  }

  const found = pickByName(categories, query);
  if (found) return found;

  if (opts.createIfMissing) {
    const kind = opts.kind ?? "expense";
    const { data, error } = await ctx.db
      .from("categories")
      .insert({
        household_id: ctx.householdId,
        name: query.trim(),
        kind,
        bucket: opts.bucket ?? (kind === "income" ? "receita" : "dia_a_dia"),
      })
      .select("*")
      .single();
    if (error) throw new DindiError(error.message);
    return data as Category;
  }

  throw new DindiError(
    `Não achei a categoria "${query}". Existem: ${categories.map((c) => c.name).join(", ")}.`
  );
}

export async function resolvePerson(
  ctx: Ctx,
  query: string | undefined | null
): Promise<string | null> {
  if (!query) return ctx.userId;

  const members = await allMembers(ctx);

  if (UUID_RE.test(query)) {
    const byId = members.find((m) => m.user_id === query);
    if (byId) return byId.user_id;
  }

  const q = normalize(query);
  if (q === "eu" || q === "mim" || q === "meu" || q === "minha") return ctx.userId;

  const found = pickByName(
    members.map((m) => ({ id: m.user_id, name: m.display_name })),
    query
  );
  if (found) return found.id;

  throw new DindiError(
    `Não sei quem é "${query}". As pessoas são: ${members.map((m) => m.display_name).join(", ")}.`
  );
}
