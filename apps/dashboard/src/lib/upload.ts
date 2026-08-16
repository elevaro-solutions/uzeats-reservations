export type UploadResult = {
  publicUrl: string;
  key: string;
};

function graphqlUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
}

function uploadsUrl() {
  return graphqlUrl().replace(/\/graphql\/?$/, '') + '/api/uploads';
}

/**
 * Upload via API proxy (server → DigitalOcean Spaces).
 * Prefer this over browser PUTs to Spaces — bucket CORS often blocks those.
 */
export async function uploadFile(
  file: Blob,
  filename: string,
  options?: { onProgress?: (percent: number) => void },
): Promise<UploadResult> {
  const contentType = file.type || 'application/octet-stream';
  const url = uploadsUrl();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && options?.onProgress) {
        options.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = `Upload failed: ${xhr.status}`;
        try {
          const json = JSON.parse(xhr.responseText) as { error?: string };
          if (json.error) message = json.error;
        } catch {
          /* keep status message */
        }
        reject(new Error(message));
        return;
      }

      try {
        const json = JSON.parse(xhr.responseText) as UploadResult;
        if (!json.publicUrl || !json.key) {
          reject(new Error('Upload failed: invalid response'));
          return;
        }
        resolve(json);
      } catch {
        reject(new Error('Upload failed: invalid response'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));

    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('X-Upload-Filename', filename);
    xhr.setRequestHeader('X-Client-App', 'dashboard');
    xhr.send(file);
  });
}
