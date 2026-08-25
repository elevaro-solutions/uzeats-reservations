import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

/** Browser-safe image types only — reject HTML/SVG/JS that enable stored XSS on the CDN. */
export const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Local fallback when DO Spaces credentials are missing (dev). */
export const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), '.data', 'uploads');

export function assertAllowedUploadContentType(contentType: string) {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(normalized)) {
    throw new Error('Unsupported file type. Allowed: JPEG, PNG, WebP, GIF');
  }
  return normalized;
}

function getClient() {
  if (!env.DO_SPACES_KEY || !env.DO_SPACES_SECRET) return null;
  return new S3Client({
    endpoint: env.DO_SPACES_ENDPOINT,
    region: 'us-east-1',
    credentials: {
      accessKeyId: env.DO_SPACES_KEY,
      secretAccessKey: env.DO_SPACES_SECRET,
    },
    forcePathStyle: false,
  });
}

export function buildUploadKey(filename: string, contentType?: string) {
  const safeBase = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 80);
  const extFromType = contentType ? EXT_BY_TYPE[contentType] : undefined;
  const baseNoExt = safeBase.replace(/\.[^.]+$/, '') || 'upload';
  const ext = extFromType ?? 'bin';
  return `uploads/${Date.now()}-${baseNoExt}.${ext}`;
}

function publicUrlForKey(key: string) {
  const base = env.DO_SPACES_CDN || `${env.DO_SPACES_ENDPOINT}/${env.DO_SPACES_BUCKET}`;
  return `${base}/${key}`;
}

function apiPublicBase() {
  if (env.API_PUBLIC_URL?.trim()) return env.API_PUBLIC_URL.replace(/\/$/, '');
  return `http://localhost:${env.PORT}`;
}

function localPublicUrl(key: string) {
  // Serve via API: GET /api/uploads/local/<filename>
  const filename = key.replace(/^uploads\//, '');
  return `${apiPublicBase()}/api/uploads/local/${encodeURIComponent(filename)}`;
}

async function saveLocalObject(input: { key: string; body: Buffer }) {
  const filename = input.key.replace(/^uploads\//, '');
  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_UPLOAD_DIR, filename), input.body);
  return {
    publicUrl: localPublicUrl(input.key),
    key: input.key,
  };
}

export async function uploadObject(input: {
  key: string;
  contentType: string;
  body: Buffer;
}) {
  const contentType = assertAllowedUploadContentType(input.contentType);
  const client = getClient();
  if (!client) {
    return saveLocalObject({ key: input.key, body: input.body });
  }

  await client.send(
    new PutObjectCommand({
      Bucket: env.DO_SPACES_BUCKET,
      Key: input.key,
      ContentType: contentType,
      ACL: 'public-read',
      Body: input.body,
    }),
  );

  return {
    publicUrl: publicUrlForKey(input.key),
    key: input.key,
  };
}

export async function createUploadUrl(input: {
  key: string;
  contentType: string;
}) {
  const contentType = assertAllowedUploadContentType(input.contentType);
  const client = getClient();
  if (!client) {
    // Browser PUT to Spaces isn't available locally — clients should POST /api/uploads.
    return {
      uploadUrl: '',
      publicUrl: localPublicUrl(input.key),
      key: input.key,
    };
  }

  const command = new PutObjectCommand({
    Bucket: env.DO_SPACES_BUCKET,
    Key: input.key,
    ContentType: contentType,
    ACL: 'public-read',
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
  return {
    uploadUrl,
    publicUrl: publicUrlForKey(input.key),
    key: input.key,
  };
}
