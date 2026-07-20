export type PaginationArgs = {
  limit?: number | null;
  offset?: number | null;
};

export function normalizePagination(
  args: PaginationArgs,
  defaults: { limit?: number; max?: number } = {},
) {
  const defaultLimit = defaults.limit ?? 20;
  const max = defaults.max ?? 100;
  const limit = Math.min(Math.max(args.limit ?? defaultLimit, 1), max);
  const offset = Math.max(args.offset ?? 0, 0);
  return { limit, offset };
}

type Findable = {
  find: (filter: Record<string, unknown>) => {
    sort: (sort: Record<string, 1 | -1>) => {
      skip: (n: number) => { limit: (n: number) => Promise<unknown[]> };
    };
  };
  countDocuments: (filter: Record<string, unknown>) => Promise<number>;
};

export async function paginateQuery<T>(
  model: Findable,
  filter: Record<string, unknown>,
  opts: {
    sort?: Record<string, 1 | -1>;
    limit?: number | null;
    offset?: number | null;
    defaultLimit?: number;
    maxLimit?: number;
    map: (doc: any) => T;
  },
) {
  const { limit, offset } = normalizePagination(
    { limit: opts.limit, offset: opts.offset },
    { limit: opts.defaultLimit ?? 20, max: opts.maxLimit ?? 100 },
  );
  const sort = opts.sort ?? { createdAt: -1 };
  const [docs, total] = await Promise.all([
    model.find(filter).sort(sort).skip(offset).limit(limit),
    model.countDocuments(filter),
  ]);
  return {
    items: (docs as any[]).map(opts.map),
    total,
    limit,
    offset,
  };
}
