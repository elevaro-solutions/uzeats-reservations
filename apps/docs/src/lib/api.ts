const DOCS_TOKEN_KEY = 'tv_docs_access_token';
const DOCS_EMAIL_KEY = 'tv_docs_access_email';

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

export function getStoredDocsToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DOCS_TOKEN_KEY);
}

export function storeDocsToken(token: string) {
  localStorage.setItem(DOCS_TOKEN_KEY, token);
}

export function clearStoredDocsToken() {
  localStorage.removeItem(DOCS_TOKEN_KEY);
}

export function getStoredDocsEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DOCS_EMAIL_KEY);
}

export function storeDocsEmail(email: string) {
  localStorage.setItem(DOCS_EMAIL_KEY, email);
}

async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const token = getStoredDocsToken();
  const res = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-App': 'docs',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export async function checkDocsAccessEmail(email: string) {
  const data = await graphqlRequest<{
    checkDocsAccessEmail: { approved: boolean; pending: boolean; denied: boolean };
  }>(
    `query CheckDocsAccessEmail($email: String!) {
      checkDocsAccessEmail(email: $email) { approved pending denied }
    }`,
    { email },
  );
  return data.checkDocsAccessEmail;
}

export async function requestDocsAccess(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  reason?: string;
}) {
  const data = await graphqlRequest<{ requestDocsAccess: { success: boolean; message: string } }>(
    `mutation RequestDocsAccess($input: RequestDocsAccessInput!) {
      requestDocsAccess(input: $input) { success message }
    }`,
    { input },
  );
  return data.requestDocsAccess;
}

export async function requestDocsAccessOtp(email: string) {
  const data = await graphqlRequest<{ requestDocsAccessOtp: { success: boolean; message: string } }>(
    `mutation RequestDocsAccessOtp($email: String!) {
      requestDocsAccessOtp(email: $email) { success message }
    }`,
    { email },
  );
  return data.requestDocsAccessOtp;
}

export async function verifyDocsAccessOtp(email: string, code: string) {
  const data = await graphqlRequest<{
    verifyDocsAccessOtp: { granted: boolean; email: string; accessToken: string };
  }>(
    `mutation VerifyDocsAccessOtp($email: String!, $code: String!) {
      verifyDocsAccessOtp(email: $email, code: $code) {
        granted
        email
        accessToken
      }
    }`,
    { email, code },
  );
  const result = data.verifyDocsAccessOtp;
  if (result.accessToken) {
    storeDocsToken(result.accessToken);
    storeDocsEmail(result.email);
  }
  return result;
}
