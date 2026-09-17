import * as SecureStore from "expo-secure-store";

import { API_URL } from "./config";

export type UploadResult = {
  publicUrl: string;
  key: string;
};

function uploadsUrl() {
  return API_URL.replace(/\/graphql\/?$/, "") + "/api/uploads";
}

/** Upload bytes via API proxy (Spaces / local fallback). */
export async function uploadFile(
  body: Blob,
  filename: string,
  contentType?: string,
): Promise<UploadResult> {
  const token = await SecureStore.getItemAsync("accessToken");
  if (!token) {
    throw new Error("Sign in to upload photos");
  }

  const res = await fetch(uploadsUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType || body.type || "application/octet-stream",
      "X-Upload-Filename": filename,
      "X-Client-App": "mobile",
    },
    body,
  });

  if (!res.ok) {
    let message = `Upload failed: ${res.status}`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      /* keep status message */
    }
    throw new Error(message);
  }

  const json = (await res.json()) as UploadResult;
  if (!json.publicUrl || !json.key) {
    throw new Error("Upload failed: invalid response");
  }
  return json;
}
