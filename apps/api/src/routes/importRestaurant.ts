import { Router } from 'express';
import { createContext } from '../graphql/context.js';
import { parseMhtmlRestaurant } from '../services/mhtmlImport.js';

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — MHTML files can be large

export const importRestaurantRouter: ReturnType<typeof Router> = Router();

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
