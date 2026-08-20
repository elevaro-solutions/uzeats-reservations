type UploadResponse = { ok?: boolean; publicUrl?: string; key?: string; error?: string };

function apiBaseUrl() {
  const graphqlUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
  return graphqlUrl.replace(/\/graphql\/?$/, '');
}

export async function uploadImportedMenuImageToSpaces(input: {
  imageUrl: string;
  filenameHint: string;
}): Promise<string | undefined> {
  const res = await fetch(`${apiBaseUrl()}/api/import-restaurant/upload-image`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-App': 'dashboard',
    },
    body: JSON.stringify({ imageUrl: input.imageUrl, filename: input.filenameHint }),
  });

  const json = (await res.json()) as UploadResponse;
  if (!res.ok || !json.publicUrl) return undefined;
  return json.publicUrl;
}
