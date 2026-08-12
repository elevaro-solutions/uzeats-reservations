export type UploadResult = {
  publicUrl: string;
  key: string;
};

function graphqlUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
}

async function createUploadUrl(
  filename: string,
  contentType: string,
): Promise<UploadResult & { uploadUrl: string }> {
  const res = await fetch(graphqlUrl(), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-App': 'dashboard',
    },
    body: JSON.stringify({
      query: `mutation CreateUploadUrl($filename: String!, $contentType: String!) {
        createUploadUrl(filename: $filename, contentType: $contentType) {
          uploadUrl publicUrl key
        }
      }`,
      variables: { filename, contentType },
    }),
  });

  const json = (await res.json()) as {
    data?: { createUploadUrl: UploadResult & { uploadUrl: string } };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'Failed to create upload URL');
  }

  const payload = json.data?.createUploadUrl;
  if (!payload?.uploadUrl) {
    throw new Error('Failed to create upload URL');
  }

  return payload;
}

function putToPresignedUrl(
  uploadUrl: string,
  file: Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`Upload failed: ${xhr.status}`));
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('x-amz-acl', 'public-read');
    xhr.send(file);
  });
}

/** Upload via DO Spaces presigned URL (GraphQL createUploadUrl → PUT). */
export async function uploadFile(
  file: Blob,
  filename: string,
  options?: { onProgress?: (percent: number) => void },
): Promise<UploadResult> {
  const contentType = file.type || 'application/octet-stream';

  const { uploadUrl, publicUrl, key } = await createUploadUrl(filename, contentType);
  await putToPresignedUrl(uploadUrl, file, contentType, options?.onProgress);

  return { publicUrl, key };
}
