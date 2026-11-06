type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const fromMeta = document.querySelector('meta[name="docs-api-url"]')?.getAttribute('content');
    if (fromMeta) return fromMeta;
  }
  return process.env.DOCS_API_URL ?? 'http://localhost:4000/graphql';
}

async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-App': 'docs',
    },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as GraphqlResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'Request failed');
  }
  if (!json.data) {
    throw new Error('Empty response');
  }
  return json.data;
}

export async function fetchDocsAccessSession() {
  const data = await graphqlRequest<{ docsAccessSession: { granted: boolean; email: string | null } }>(
    `query DocsAccessSession { docsAccessSession { granted email } }`,
  );
  return data.docsAccessSession;
}
