export type MagnificSearchResponse = {
  ok: boolean;
  term?: string;
  page?: number;
  id?: number;
  title?: string;
  imageUrl?: string;
  error?: string;
};

export type MagnificUploadResponse = {
  ok?: boolean;
  publicUrl?: string;
  key?: string;
  error?: string;
};

function apiBaseUrl() {
  const graphqlUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
  return graphqlUrl.replace(/\/graphql\/?$/, '');
}

export async function searchMagnificStockImage(input: {
  term: string;
  page?: number;
}): Promise<MagnificSearchResponse> {
  const page = Math.max(1, input.page ?? 1);
  const res = await fetch(
    `/api/discovery-magnific/search?term=${encodeURIComponent(input.term)}&page=${page}`,
    { cache: 'no-store' },
  );
  return (await res.json()) as MagnificSearchResponse;
}

export async function uploadMagnificStockImage(input: {
  resourceId?: number;
  imageUrl?: string;
  filenameHint: string;
}): Promise<string> {
  const res = await fetch(`${apiBaseUrl()}/api/discovery-magnific/upload-image`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-App': 'dashboard',
    },
    body: JSON.stringify({
      resourceId: input.resourceId,
      imageUrl: input.imageUrl,
      filename: input.filenameHint,
    }),
  });

  const json = (await res.json()) as MagnificUploadResponse;
  if (!res.ok || !json.publicUrl) {
    throw new Error(json.error || 'Magnific upload failed');
  }
  return json.publicUrl;
}
