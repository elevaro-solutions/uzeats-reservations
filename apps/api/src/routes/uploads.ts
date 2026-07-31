import { Router } from 'express';
import { createContext } from '../graphql/context.js';
import { buildUploadKey, uploadObject } from '../services/spaces.js';

const MAX_BYTES = 10 * 1024 * 1024;

export const uploadsRouter: ReturnType<typeof Router> = Router();

uploadsRouter.post('/', async (req, res) => {
  const ctx = await createContext({ req });
  if (!ctx.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const filename = req.headers['x-upload-filename'];
  if (!filename || typeof filename !== 'string') {
    res.status(400).json({ error: 'X-Upload-Filename header required' });
    return;
  }

  const contentType =
    typeof req.headers['content-type'] === 'string'
      ? req.headers['content-type']
      : 'application/octet-stream';
  const body = req.body as Buffer;

  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: 'Empty body' });
    return;
  }

  if (body.length > MAX_BYTES) {
    res.status(413).json({ error: 'File too large (max 10 MB)' });
    return;
  }

  try {
    const key = buildUploadKey(filename);
    const result = await uploadObject({ key, contentType, body });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Upload failed',
    });
  }
});
