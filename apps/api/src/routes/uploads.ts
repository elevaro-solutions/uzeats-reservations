import { Router } from 'express';
import { VIRTUAL_ROOM_VIDEO_MAX_BYTES } from '@reservations/shared';
import { createContext } from '../graphql/context.js';
import { buildScopedObjectKey, resolveUploadImageContentType, uploadObject, uploadVideoObject } from '../services/spaces.js';
import { UploadTargetError, authorizeUploadPrefix, uploadTargetFromHeaders } from '../services/uploadTarget.js';

const MAX_BYTES = 10 * 1024 * 1024;

export const uploadsRouter: ReturnType<typeof Router> = Router();

/** Walkthrough videos for the virtual 3D room. Partner accounts only. */
export const videoUploadsRouter: ReturnType<typeof Router> = Router();

function uploadErrorStatus(err: unknown): { status: number; error: string } | null {
  if (err instanceof UploadTargetError) {
    return { status: err.status, error: err.message };
  }
  return null;
}

videoUploadsRouter.post('/', async (req, res) => {
  const ctx = await createContext({ req, res });
  if (!ctx.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (ctx.user.role === 'diner' || ctx.user.role === 'host') {
    res.status(403).json({ error: 'Only restaurant managers can upload videos' });
    return;
  }

  const filename = req.headers['x-upload-filename'];
  if (!filename || typeof filename !== 'string') {
    res.status(400).json({ error: 'X-Upload-Filename header required' });
    return;
  }

  const body = req.body as Buffer;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: 'Empty body' });
    return;
  }
  if (body.length > VIRTUAL_ROOM_VIDEO_MAX_BYTES) {
    res.status(413).json({ error: 'Video too large (max 250 MB)' });
    return;
  }

  try {
    const target = uploadTargetFromHeaders(req.headers);
    if (target.scope !== 'restaurant' || target.kind !== 'virtual-room') {
      res.status(400).json({ error: 'Videos are stored in the restaurant virtual-room folder' });
      return;
    }
    const prefix = await authorizeUploadPrefix(ctx.user, target);
    res.json(await uploadVideoObject({ prefix, filename, body }));
  } catch (err) {
    const known = uploadErrorStatus(err);
    if (known) {
      res.status(known.status).json({ error: known.error });
      return;
    }
    res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
  }
});

uploadsRouter.post('/', async (req, res) => {
  const ctx = await createContext({ req, res });
  if (!ctx.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const filename = req.headers['x-upload-filename'];
  if (!filename || typeof filename !== 'string') {
    res.status(400).json({ error: 'X-Upload-Filename header required' });
    return;
  }

  const body = req.body as Buffer;

  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: 'Empty body' });
    return;
  }

  if (body.length > MAX_BYTES) {
    res.status(413).json({ error: 'File too large (max 10 MB)' });
    return;
  }

  let contentType: string;
  try {
    contentType = resolveUploadImageContentType(body);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unsupported file type',
    });
    return;
  }

  try {
    const target = uploadTargetFromHeaders(req.headers);
    const prefix = await authorizeUploadPrefix(ctx.user, target);
    const key = buildScopedObjectKey(prefix, filename, contentType);
    const result = await uploadObject({ key, contentType, body });
    res.json(result);
  } catch (err) {
    const known = uploadErrorStatus(err);
    if (known) {
      res.status(known.status).json({ error: known.error });
      return;
    }
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Upload failed',
    });
  }
});
