import * as SecureStore from "expo-secure-store";

import { API_URL } from "./config";

export type UploadResult = {
  publicUrl: string;
  key: string;
};

export type UploadFileOptions = {
  maxBytes?: number;
};

export class PhotoTooLargeError extends Error {
  constructor() {
    super("File too large");
    this.name = "PhotoTooLargeError";
  }
}

const UNSUPPORTED_IMAGE = "Unsupported file type. Allowed: JPEG, PNG, WebP, GIF";

function uploadsUrl() {
  return API_URL.replace(/\/graphql\/?$/, "") + "/api/uploads";
}

/** Header values must be Latin-1. Browser downloads often have other characters. */
function headerFilename(filename: string) {
  const ascii = filename
    .replace(/[^\t\x20-\x7E]/g, "_")
    .replace(/[\r\n]/g, "")
    .trim()
    .slice(0, 120);
  return ascii || "photo.jpg";
}

function sniffImageContentType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }
  const riff = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
  const webp = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  return null;
}

function readBlobPrefix(blob: Blob, length: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read photo"));
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error("Could not read photo"));
        return;
      }
      resolve(new Uint8Array(reader.result).slice(0, length));
    };
    reader.readAsArrayBuffer(blob.slice(0, length));
  });
}

async function inspectLocalImage(uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  if (!blob.size) throw new Error("Could not read photo");
  const contentType = sniffImageContentType(await readBlobPrefix(blob, 16));
  if (!contentType) throw new Error(UNSUPPORTED_IMAGE);
  return { contentType, size: blob.size };
}

function postLocalFile(input: {
  url: string;
  fileUri: string;
  filename: string;
  contentType: string;
  token: string;
}): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", input.url);
    xhr.setRequestHeader("Authorization", `Bearer ${input.token}`);
    xhr.setRequestHeader("Content-Type", input.contentType);
    xhr.setRequestHeader("X-Upload-Filename", headerFilename(input.filename));
    xhr.setRequestHeader("X-Client-App", "mobile");
    xhr.onload = () => {
      let payload: (UploadResult & { error?: string }) | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as UploadResult & { error?: string };
      } catch {
        payload = null;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(payload?.error || `Upload failed: ${xhr.status}`));
        return;
      }
      if (!payload?.publicUrl || !payload.key) {
        reject(new Error("Upload failed: invalid response"));
        return;
      }
      resolve({ publicUrl: payload.publicUrl, key: payload.key });
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    // fetch() stringifies a plain object. XHR hands `{ uri }` to native, which reads the file.
    xhr.send({ uri: input.fileUri } as unknown as XMLHttpRequestBodyInit);
  });
}

/** Upload a picker file. Content-Type comes from the file bytes, not the picker MIME. */
export async function uploadFile(
  fileUri: string,
  filename: string,
  options?: UploadFileOptions,
): Promise<UploadResult> {
  const token = await SecureStore.getItemAsync("accessToken");
  if (!token) {
    throw new Error("Sign in to upload photos");
  }

  const image = await inspectLocalImage(fileUri);
  if (options?.maxBytes != null && image.size > options.maxBytes) {
    throw new PhotoTooLargeError();
  }

  return postLocalFile({
    url: uploadsUrl(),
    fileUri,
    filename,
    contentType: image.contentType,
    token,
  });
}
