import { Router } from 'express';
import { createContext } from '../graphql/context.js';
import { parseMhtmlRestaurant } from '../services/mhtmlImport.js';
import { buildUploadKey, uploadObject } from '../services/spaces.js';

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — MHTML files can be large
const MAX_IMPORT_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMPORT_IMAGE_HOSTS = [
  'doordash.com',
  'cdn4dd.com',
  'ubereats.com',
  'uber.com',
  'cloudfront.net',
  'cdninstagram.com',
];

export const importRestaurantRouter: ReturnType<typeof Router> = Router();

function canImportImageFromHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_IMPORT_IMAGE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function inferContentTypeFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

/**
 * POST /api/import-restaurant/upload-image
 *
 * Accepts JSON body: { imageUrl: string, filename?: string }
 * Downloads a source image and uploads it to DigitalOcean Spaces.
 */
importRestaurantRouter.post('/upload-image', async (req, res) => {
  const ctx = await createContext({ req, res });
  if (!ctx.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  let payload: { imageUrl?: string; filename?: string } = {};
  try {
    payload = JSON.parse((req.body as Buffer).toString('utf-8')) as { imageUrl?: string; filename?: string };
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const imageUrl = payload.imageUrl?.trim();
  if (!imageUrl) {
    res.status(400).json({ error: 'imageUrl is required' });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    res.status(400).json({ error: 'Invalid imageUrl' });
    return;
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    res.status(400).json({ error: 'Only http/https image URLs are allowed' });
    return;
  }

  if (!canImportImageFromHost(parsedUrl.hostname)) {
    res.status(400).json({ error: 'Image host not allowed for import' });
    return;
  }

  try {
    const remote = await fetch(imageUrl, {
      headers: { 'User-Agent': 'reservations-import-bot/1.0' },
    });

    if (!remote.ok) {
      res.status(422).json({ error: `Could not download image (${remote.status})` });
      return;
    }

    const arrayBuffer = await remote.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    if (body.length === 0) {
      res.status(422).json({ error: 'Downloaded image is empty' });
      return;
    }
    if (body.length > MAX_IMPORT_IMAGE_BYTES) {
      res.status(413).json({ error: 'Image too large (max 5 MB)' });
      return;
    }

    const contentTypeHeader = remote.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    const contentType = contentTypeHeader && contentTypeHeader.startsWith('image/')
      ? contentTypeHeader
      : inferContentTypeFromUrl(imageUrl);
    const filename = payload.filename?.trim() || parsedUrl.pathname.split('/').pop() || 'imported-image';
    const key = buildUploadKey(filename, contentType);
    const uploaded = await uploadObject({ key, contentType, body });
    res.json({ ok: true, ...uploaded });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Image import upload failed' });
  }
});

/**
 * POST /api/import-restaurant
 *
 * Accepts a raw MHTML file body (Content-Type: application/octet-stream or text/html).
 * Returns structured restaurant data parsed from a DoorDash or Uber Eats page.
 *
 * Requires authentication (any logged-in user: admin or restaurant_owner).
 */
importRestaurantRouter.post('/', async (req, res) => {
  const ctx = await createContext({ req, res });
  if (!ctx.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const body = req.body as Buffer;

  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: 'Empty body — send the raw MHTML file as the request body' });
    return;
  }

  if (body.length > MAX_BYTES) {
    res.status(413).json({ error: 'File too large (max 50 MB)' });
    return;
  }

  try {
    const data = parseMhtmlRestaurant(body);

    if (data.source === 'unknown' && !data.name) {
      res.status(422).json({
        error: 'Could not extract restaurant data. Make sure the file is a saved DoorDash or Uber Eats restaurant page.',
        data,
      });
      return;
    }

    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Parse failed' });
  }
});
