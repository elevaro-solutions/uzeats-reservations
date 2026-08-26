import { Router } from 'express';
import { downloadMagnificStockPhoto, isMagnificStockImageUrl } from '@reservations/shared';
import { createContext, requireAdmin } from '../graphql/context.js';
import { buildUploadKey, uploadObject } from '../services/spaces.js';

const MAX_BYTES = 5 * 1024 * 1024;

export const discoveryMagnificRouter: ReturnType<typeof Router> = Router();

function inferContentTypeFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

async function fetchRemoteImage(sourceUrl: string) {
  const remote = await fetch(sourceUrl, {
    headers: { 'User-Agent': 'reservations-discovery-bot/1.0' },
    redirect: 'follow',
  });

  if (!remote.ok) {
    return { error: `Could not download image (${remote.status})` as const };
  }

  const arrayBuffer = await remote.arrayBuffer();
  const body = Buffer.from(arrayBuffer);
  if (body.length === 0) {
    return { error: 'Downloaded image is empty' as const };
  }
  if (body.length > MAX_BYTES) {
    return { error: 'Image too large (max 5 MB)' as const };
  }

  const contentTypeHeader = remote.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  const contentType =
    contentTypeHeader && contentTypeHeader.startsWith('image/')
      ? contentTypeHeader
      : inferContentTypeFromUrl(sourceUrl);

  return { body, contentType };
}

/**
 * POST /api/discovery-magnific/upload-image
 *
 * Admin-only: downloads a Magnific stock photo and stores it in Spaces.
 * Prefer `resourceId` (licensed Magnific download). Falls back to `imageUrl`
 * when it points at a known Magnific/Freepik CDN host.
 */
discoveryMagnificRouter.post('/upload-image', async (req, res) => {
  const ctx = await createContext({ req, res });
  try {
    requireAdmin(ctx);
  } catch {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const body = req.body as {
    resourceId?: number | string;
    imageUrl?: string;
    filename?: string;
  };

  const resourceId = Number(body.resourceId);
  const imageUrl = body.imageUrl?.trim();
  const filenameHint = body.filename?.trim();

  let sourceUrl: string | undefined;
  let defaultFilename = filenameHint || 'discovery-taxonomy.jpg';

  const usePreviewUrl = () => {
    if (!imageUrl) return false;
    if (!isMagnificStockImageUrl(imageUrl)) {
      return false;
    }
    sourceUrl = imageUrl;
    return true;
  };

  if (Number.isFinite(resourceId) && resourceId > 0) {
    const download = await downloadMagnificStockPhoto(resourceId);
    if (download) {
      sourceUrl = download.downloadUrl;
      if (!filenameHint && download.filename) {
        defaultFilename = download.filename;
      }
    } else if (!usePreviewUrl()) {
      res.status(422).json({
        error: process.env.MAGNIFIC_API_KEY?.trim()
          ? 'Could not download photo from Magnific'
          : 'Could not download from Magnific and no valid preview imageUrl was provided',
      });
      return;
    }
  } else if (imageUrl) {
    if (!usePreviewUrl()) {
      res.status(400).json({ error: 'Only Magnific stock image URLs are allowed' });
      return;
    }
  } else {
    res.status(400).json({ error: 'resourceId or imageUrl is required' });
    return;
  }

  try {
    if (!sourceUrl) {
      res.status(422).json({ error: 'No image source resolved' });
      return;
    }

    const fetched = await fetchRemoteImage(sourceUrl);
    if ('error' in fetched) {
      const status = fetched.error.includes('too large') ? 413 : 422;
      res.status(status).json({ error: fetched.error });
      return;
    }

    const key = buildUploadKey(defaultFilename, fetched.contentType);
    const uploaded = await uploadObject({
      key,
      contentType: fetched.contentType,
      body: fetched.body,
    });
    res.json({ ok: true, ...uploaded });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Magnific upload failed' });
  }
});
