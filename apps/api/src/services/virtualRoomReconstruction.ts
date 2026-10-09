import path from 'node:path';
import { Queue, Worker, type Job } from 'bullmq';
import { unzipSync } from 'fflate';
import {
  VIRTUAL_ROOM_MAX_CAPTURE_PHOTOS,
  VIRTUAL_ROOM_MIN_CAPTURE_PHOTOS,
} from '@reservations/shared';
import { env } from '../config/env.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { VirtualRoom } from '../models/VirtualRoom.js';
import { readOwnUpload, uploadModelObject } from './spaces.js';

const QUEUE_NAME = 'virtual-room';
const POLL_DELAY_MS = 60_000;
/** ~6 hours at one poll per minute. */
const MAX_POLLS = 360;

const connection = { url: env.REDIS_URL };
let queue: Queue | null = null;

/** Lazy so importing this module (tests, scene reads) never opens a Redis connection. */
function getQueue() {
  queue ??= new Queue(QUEUE_NAME, { connection });
  return queue;
}

export function isReconstructionProviderConfigured() {
  return Boolean(env.KIRI_ENGINE_API_KEY);
}

type CaptureMedia = { kind: string; role: string; url: string };

export type ReconstructionSource =
  | { kind: 'video'; urls: [string] }
  | { kind: 'photo'; urls: string[] };

/** A walkthrough video wins; otherwise a photo set large enough for photogrammetry. */
export function pickReconstructionSource(media: CaptureMedia[]): ReconstructionSource | null {
  const captures = media.filter((m) => m.role === 'capture');
  const video = captures.filter((m) => m.kind === 'video').at(-1);
  if (video) return { kind: 'video', urls: [video.url] };
  const photos = captures.filter((m) => m.kind === 'photo');
  if (photos.length >= VIRTUAL_ROOM_MIN_CAPTURE_PHOTOS) {
    return {
      kind: 'photo',
      urls: photos.slice(0, VIRTUAL_ROOM_MAX_CAPTURE_PHOTOS).map((m) => m.url),
    };
  }
  return null;
}

export async function startReconstruction(restaurantId: string) {
  if (!isReconstructionProviderConfigured()) {
    throw new ValidationError(
      '3D scanning is not configured on this platform yet. Your room still renders from the floor plan and photos.',
    );
  }
  const room = await VirtualRoom.findOne({ restaurantId });
  if (!room) throw new NotFoundError('Virtual room');
  const status = room.reconstruction?.status;
  if (status === 'queued' || status === 'processing') {
    throw new ConflictError('A 3D scan is already running for this room');
  }
  const source = pickReconstructionSource(room.media as unknown as CaptureMedia[]);
  if (!source) {
    throw new ValidationError(
      `Add a walkthrough video or at least ${VIRTUAL_ROOM_MIN_CAPTURE_PHOTOS} "3D scan capture" photos first`,
    );
  }

  room.set('reconstruction', {
    status: 'queued',
    provider: 'kiri',
    sourceKind: source.kind,
    sourceCount: source.urls.length,
    // Keep the previous model visible until the new scan finishes.
    modelUrl: room.reconstruction?.modelUrl,
    requestedAt: new Date(),
    pollCount: 0,
  });
  await room.save();
  await getQueue().add(
    'submit',
    { restaurantId },
    { removeOnComplete: true, removeOnFail: 100 },
  );
}

// ---------------------------------------------------------------------------
// KIRI Engine client — https://docs.kiriengine.app
// ---------------------------------------------------------------------------

type KiriResponse<T> = { code?: number; msg?: string; ok?: boolean; data?: T };

async function kiriRequest<T>(pathname: string, init?: RequestInit): Promise<T> {
  const base = env.KIRI_ENGINE_API_URL.replace(/\/$/, '');
  const res = await fetch(`${base}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.KIRI_ENGINE_API_KEY}`, ...(init?.headers ?? {}) },
  });
  const json = (await res.json().catch(() => null)) as KiriResponse<T> | null;
  if (!res.ok || !json || json.code !== 0 || json.data == null) {
    const reason =
      res.status === 403 ? 'Not enough KIRI Engine credits' : json?.msg || `HTTP ${res.status}`;
    throw new Error(`KIRI Engine: ${reason}`);
  }
  return json.data;
}

function fileNameFromUrl(url: string, fallback: string) {
  try {
    return path.basename(new URL(url).pathname) || fallback;
  } catch {
    return fallback;
  }
}

async function submitToKiri(source: ReconstructionSource): Promise<string> {
  const form = new FormData();
  // Rooms are scenes, not single objects — object masking would crop the walls away.
  form.append('isMask', '0');
  form.append('modelQuality', '1');
  form.append('textureQuality', '1');
  form.append('textureSmoothing', '1');
  form.append('fileFormat', 'GLB');

  let endpoint: string;
  if (source.kind === 'video') {
    const body = await readOwnUpload(source.urls[0]);
    form.append('videoFile', new Blob([new Uint8Array(body)]), fileNameFromUrl(source.urls[0], 'room.mp4'));
    endpoint = '/v1/open/photo/video';
  } else {
    for (const [i, url] of source.urls.entries()) {
      const body = await readOwnUpload(url);
      form.append('imagesFiles', new Blob([new Uint8Array(body)]), fileNameFromUrl(url, `photo-${i}.jpg`));
    }
    endpoint = '/v1/open/photo/image';
  }

  const data = await kiriRequest<{ serialize: string }>(endpoint, { method: 'POST', body: form });
  return data.serialize;
}

/** KIRI status codes: -1 uploading, 0 processing, 1 failed, 2 success, 3 queuing, 4 expired. */
async function getKiriStatus(serialize: string) {
  const data = await kiriRequest<{ status: number }>(
    `/v1/open/model/getStatus?serialize=${encodeURIComponent(serialize)}`,
  );
  return data.status;
}

/** Download the zipped result, pull out the .glb, and re-host it (provider links expire in 60 min). */
async function rehostKiriModel(serialize: string, restaurantId: string) {
  const data = await kiriRequest<{ modelUrl: string }>(
    `/v1/open/model/getModelZip?serialize=${encodeURIComponent(serialize)}`,
  );
  const res = await fetch(data.modelUrl);
  if (!res.ok) throw new Error(`Could not download the 3D model (${res.status})`);
  const entries = unzipSync(new Uint8Array(await res.arrayBuffer()));
  const glb = Object.entries(entries)
    .filter(([name]) => name.toLowerCase().endsWith('.glb'))
    .sort((a, b) => b[1].length - a[1].length)[0];
  if (!glb) throw new Error('The 3D scan finished but contained no .glb model');
  const uploaded = await uploadModelObject({
    filename: `virtual-room-${restaurantId}.glb`,
    body: Buffer.from(glb[1]),
  });
  return uploaded.publicUrl;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

async function markFailed(restaurantId: string, error: string) {
  await VirtualRoom.updateOne(
    { restaurantId },
    {
      $set: {
        'reconstruction.status': 'failed',
        'reconstruction.error': error.slice(0, 500),
        'reconstruction.completedAt': new Date(),
      },
    },
  );
}

async function handleSubmit(restaurantId: string) {
  const room = await VirtualRoom.findOne({ restaurantId });
  if (!room || room.reconstruction?.status !== 'queued') return;
  const source = pickReconstructionSource(room.media as unknown as CaptureMedia[]);
  if (!source) {
    await markFailed(restaurantId, 'Capture media was removed before the scan started');
    return;
  }
  const serialize = await submitToKiri(source);
  await VirtualRoom.updateOne(
    { restaurantId },
    { $set: { 'reconstruction.status': 'processing', 'reconstruction.jobId': serialize } },
  );
  await getQueue().add('poll', { restaurantId }, { delay: POLL_DELAY_MS, removeOnComplete: true, removeOnFail: 100 });
}

async function handlePoll(restaurantId: string) {
  const room = await VirtualRoom.findOne({ restaurantId });
  const jobId = room?.reconstruction?.jobId;
  if (!room || room.reconstruction?.status !== 'processing' || !jobId) return;

  const status = await getKiriStatus(jobId);
  if (status === 2) {
    const modelUrl = await rehostKiriModel(jobId, restaurantId);
    await VirtualRoom.updateOne(
      { restaurantId },
      {
        $set: {
          'reconstruction.status': 'ready',
          'reconstruction.modelUrl': modelUrl,
          'reconstruction.completedAt': new Date(),
        },
        $unset: { 'reconstruction.error': 1 },
      },
    );
    return;
  }
  if (status === 1 || status === 4) {
    await markFailed(
      restaurantId,
      status === 4 ? 'The 3D scan expired at the provider' : 'The provider could not build a 3D model from this capture',
    );
    return;
  }

  const pollCount = (room.reconstruction?.pollCount ?? 0) + 1;
  if (pollCount > MAX_POLLS) {
    await markFailed(restaurantId, 'The 3D scan timed out');
    return;
  }
  await VirtualRoom.updateOne({ restaurantId }, { $set: { 'reconstruction.pollCount': pollCount } });
  await getQueue().add('poll', { restaurantId }, { delay: POLL_DELAY_MS, removeOnComplete: true, removeOnFail: 100 });
}

export function startVirtualRoomWorker() {
  if (process.env.NODE_ENV === 'test') return;
  new Worker(
    QUEUE_NAME,
    async (job: Job<{ restaurantId: string }>) => {
      const { restaurantId } = job.data;
      try {
        if (job.name === 'submit') await handleSubmit(restaurantId);
        else if (job.name === 'poll') await handlePoll(restaurantId);
      } catch (err) {
        logger.error({ err, restaurantId, job: job.name }, '[virtualRoom] reconstruction job failed');
        await markFailed(restaurantId, err instanceof Error ? err.message : 'Reconstruction failed');
      }
    },
    { connection },
  );
}
