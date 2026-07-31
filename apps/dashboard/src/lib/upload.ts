export type UploadResult = {
  publicUrl: string;
  key: string;
};

function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql').replace(
    /\/graphql\/?$/,
    '',
  );
}

export function uploadFile(
  file: Blob,
  filename: string,
  options?: { onProgress?: (percent: number) => void },
): Promise<UploadResult> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('dashAccessToken') : null;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        options?.onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResult);
        } catch {
          reject(new Error('Upload failed'));
        }
        return;
      }

      let message = `Upload failed: ${xhr.status}`;
      try {
        const body = JSON.parse(xhr.responseText) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // ignore parse errors
      }
      reject(new Error(message));
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));

    xhr.open('POST', `${apiBaseUrl()}/api/uploads`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('X-Upload-Filename', filename);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}
