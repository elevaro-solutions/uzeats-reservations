import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

/**
 * Browser-safe image types. SVG is allowed only after sanitizeSvg() strips scripts /
 * event handlers — still prefer rendering via <img>, not inline HTML.
 */
export const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

/** Local fallback when DO Spaces credentials are missing (dev). */
export const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), '.data', 'uploads');

export function assertAllowedUploadContentType(contentType: string) {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(normalized)) {
    throw new Error('Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, SVG');
  }
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
}

/** Detect JPEG/PNG/WebP/GIF from magic bytes; ignore the declared Content-Type. */
export function sniffAllowedImageContentType(body: Buffer): string | null {
  if (body.length < 12) return null;
  if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return 'image/jpeg';
  if (
    body[0] === 0x89 &&
    body[1] === 0x50 &&
    body[2] === 0x4e &&
    body[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    body[0] === 0x47 &&
    body[1] === 0x49 &&
    body[2] === 0x46 &&
    body[3] === 0x38 &&
    (body[4] === 0x37 || body[4] === 0x39) &&
    body[5] === 0x61
  ) {
    return 'image/gif';
  }
  if (
    body.toString('ascii', 0, 4) === 'RIFF' &&
    body.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/** Detect SVG from UTF-8 text (optional XML prologue). Not a raster sniff. */
export function sniffSvgContentType(body: Buffer): string | null {
  if (body.length < 4 || body.length > 2 * 1024 * 1024) return null;
  // Reject if it looks like binary raster (already handled) or HTML shell.
  const head = body.toString('utf8', 0, Math.min(body.length, 8192)).replace(/^\uFEFF/, '').trimStart();
  if (/^<!DOCTYPE\s+html/i.test(head) || /^<html[\s>]/i.test(head)) return null;
  if (/^<\?xml\b/i.test(head) || /^<svg[\s>]/i.test(head) || /^<!DOCTYPE\s+svg/i.test(head)) {
    if (/<svg[\s>]/i.test(head) || /<svg[\s>]/i.test(body.toString('utf8'))) {
      return 'image/svg+xml';
    }
  }
  return null;
}

/**
 * Strip common XSS vectors from SVG before storing on the CDN.
 * Safe for <img src> usage; still not intended for untrusted inline HTML.
 */
export function sanitizeSvg(svg: string): string {
  let out = svg.replace(/^\uFEFF/, '');
  out = out.replace(/<(script|foreignObject|iframe|embed|object|link|meta|base)[\s\S]*?<\/\1>/gi, '');
  out = out.replace(/<(script|foreignObject|iframe|embed|object|link|meta|base)\b[^>]*\/?>/gi, '');
  out = out.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/(href|xlink:href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1=$2$2');
  out = out.replace(/<style\b[^>]*>[\s\S]*?@import[\s\S]*?<\/style>/gi, '');
  if (!/<svg[\s>]/i.test(out)) {
    throw new Error('Invalid SVG: missing <svg> root');
  }
  return out.trim();
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
  const sniffedRaster = sniffAllowedImageContentType(input.body);
  const sniffedSvg = sniffedRaster ? null : sniffSvgContentType(input.body);
  if (!sniffedRaster && !sniffedSvg) {
    throw new Error('Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, SVG');
  }

  let contentType = sniffedRaster ?? sniffedSvg!;
  let body = input.body;
  if (sniffedSvg) {
    body = Buffer.from(sanitizeSvg(body.toString('utf8')), 'utf8');
    contentType = 'image/svg+xml';
  }

  const client = getClient();
  if (!client) {
    return saveLocalObject({ key: input.key, body });
  }

  await client.send(
    new PutObjectCommand({
      Bucket: env.DO_SPACES_BUCKET,
      Key: input.key,
      ContentType: contentType,
      ACL: 'public-read',
      Body: body,
      // Discourage treating SVG as an active document when opened directly.
      ContentDisposition: sniffedSvg ? 'inline' : undefined,
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
