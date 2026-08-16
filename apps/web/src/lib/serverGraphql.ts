const API_URI = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';

type ServerGraphqlOptions = {
  /** Seconds to cache the response. Use `false` to opt out of caching. Default 3600. */
  revalidate?: number | false;
  tags?: string[];
};

export async function serverGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: ServerGraphqlOptions,
): Promise<T> {
  const revalidate = options?.revalidate ?? 3600;
  const res = await fetch(API_URI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    ...(revalidate === false
      ? { cache: 'no-store' as const }
      : { next: { revalidate, tags: options?.tags } }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  }
  return json.data as T;
}
