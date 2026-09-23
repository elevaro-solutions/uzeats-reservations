import { Router } from 'express';
import { canImportRestaurant } from '@reservations/shared';
import { createContext } from '../graphql/context.js';
import { parseRestaurantFile } from '../services/mhtmlImport.js';
import { buildUploadKey, uploadObject } from '../services/spaces.js';
import {
  fetchAllowedImage,
  SafeRemoteImageError,
} from '../lib/safeRemoteImage.js';

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — MHTML files can be large
const MAX_IMPORT_IMAGE_BYTES = 5 * 1024 * 1024;
/** Suffix match only; each hop (including redirects) is re-checked. */
const ALLOWED_IMPORT_IMAGE_HOSTS = [
  'doordash.com',
  'cdn4dd.com',
  'ubereats.com',
  'uber.com',
  'cloudfront.net',
  'cdninstagram.com',
] as const;

export const importRestaurantRouter: ReturnType<typeof Router> = Router();

function isEmptyImport(data: { source: string; name?: string }) {
  return data.source === 'unknown' && !data.name;
}

function readJsonPayload(body: unknown): { imageUrl?: string; filename?: string } | null {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    return body as { imageUrl?: string; filename?: string };
  }
  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString('utf-8')) as { imageUrl?: string; filename?: string };
    } catch {
      return null;
    }
  }
  return null;
}

async function requireImporter(
  req: Parameters<typeof createContext>[0]['req'],
  res: Parameters<typeof createContext>[0]['res'],
) {
  const ctx = await createContext({ req, res });
  if (!ctx.user) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  if (!canImportRestaurant(ctx.user.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return ctx.user;
}

/**
 * POST /api/import-restaurant/upload-image
 *
 * Accepts JSON body: { imageUrl: string, filename?: string }
 * Downloads a source image and uploads it to DigitalOcean Spaces.
 */
importRestaurantRouter.post('/upload-image', async (req, res) => {
  const user = await requireImporter(req, res);
  if (!user) return;

  const payload = readJsonPayload(req.body);
  if (!payload) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const imageUrl = payload.imageUrl?.trim();
  if (!imageUrl) {
    res.status(400).json({ error: 'imageUrl is required' });
    return;
  }

  try {
    const fetched = await fetchAllowedImage({
      url: imageUrl,
      allowedHostSuffixes: ALLOWED_IMPORT_IMAGE_HOSTS,
      maxBytes: MAX_IMPORT_IMAGE_BYTES,
      userAgent: 'reservations-import-bot/1.0',
    });
    const parsedUrl = new URL(imageUrl);
    const filename =
      payload.filename?.trim() || parsedUrl.pathname.split('/').pop() || 'imported-image';
    const key = buildUploadKey(filename, fetched.contentType);
    const uploaded = await uploadObject({
      key,
      contentType: fetched.contentType,
      body: fetched.body,
    });
    res.json({ ok: true, ...uploaded });
  } catch (err) {
    if (err instanceof SafeRemoteImageError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : 'Image import upload failed' });
  }
});

/**
 * POST /api/import-restaurant
 *
 * Accepts raw MHTML/HTML file body (Content-Type: application/octet-stream or text/html).
 * URL import is not supported yet — clients should upload a saved .mhtml/.html file.
 *
 * Requires a partner or admin session (not diners).
 */
importRestaurantRouter.post('/', async (req, res) => {
  const user = await requireImporter(req, res);
  if (!user) return;

  const contentType = String(req.headers['content-type'] ?? '');

  if (contentType.includes('application/json')) {
    res.status(501).json({
      error:
        'Import from URL is not supported yet. Save the DoorDash or Uber Eats page as .mhtml/.html and upload the file instead.',
      code: 'url_import_unsupported',
    });
    return;
  }

  const body = req.body as Buffer;

  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({
      error: 'Empty body — upload an .mhtml/.html file',
    });
    return;
  }

  if (body.length > MAX_BYTES) {
    res.status(413).json({ error: 'File too large (max 50 MB)' });
    return;
  }

  try {
    const filename = String(req.headers['x-filename'] ?? '');
    const data = parseRestaurantFile(body, filename);

    if (isEmptyImport(data)) {
      res.status(422).json({
        error: 'Could not extract restaurant data. Save the DoorDash or Uber Eats restaurant page as .mhtml and try again.',
        data,
      });
      return;
    }

    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Parse failed' });
  }
});
