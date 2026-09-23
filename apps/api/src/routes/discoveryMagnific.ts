import { Router } from 'express';
import { downloadMagnificStockPhoto, isMagnificStockImageUrl } from '@reservations/shared';
import { createContext, requireAdmin } from '../graphql/context.js';
import { buildUploadKey, uploadObject } from '../services/spaces.js';
import {
  fetchAllowedImage,
  SafeRemoteImageError,
} from '../lib/safeRemoteImage.js';

const MAX_BYTES = 5 * 1024 * 1024;
const MAGNIFIC_IMAGE_HOSTS = ['magnific.com', 'freepik.com', 'b2bpic.net'] as const;

export const discoveryMagnificRouter: ReturnType<typeof Router> = Router();

async function fetchRemoteImage(
  sourceUrl: string,
): Promise<{ error: string; status?: number } | { body: Buffer; contentType: string }> {
  try {
    return await fetchAllowedImage({
      url: sourceUrl,
      allowedHostSuffixes: MAGNIFIC_IMAGE_HOSTS,
      maxBytes: MAX_BYTES,
      userAgent: 'reservations-discovery-bot/1.0',
    });
  } catch (err) {
    if (err instanceof SafeRemoteImageError) {
      return { error: err.message, status: err.status };
    }
    return { error: 'Could not download image' };
  }
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
      const status = fetched.status ?? (fetched.error.includes('too large') ? 413 : 422);
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
