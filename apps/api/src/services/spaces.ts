import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

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

export function buildUploadKey(filename: string) {
  return `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

function publicUrlForKey(key: string) {
  const base = env.DO_SPACES_CDN || `${env.DO_SPACES_ENDPOINT}/${env.DO_SPACES_BUCKET}`;
  return `${base}/${key}`;
}

export async function uploadObject(input: {
  key: string;
  contentType: string;
  body: Buffer;
}) {
  const client = getClient();
  if (!client) {
    return {
      publicUrl: `https://picsum.photos/seed/${encodeURIComponent(input.key)}/800/600`,
      key: input.key,
    };
  }

  await client.send(
    new PutObjectCommand({
      Bucket: env.DO_SPACES_BUCKET,
      Key: input.key,
      ContentType: input.contentType,
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
  const client = getClient();
  if (!client) {
    return {
      uploadUrl: `https://example.invalid/upload/${input.key}`,
      publicUrl: `https://picsum.photos/seed/${encodeURIComponent(input.key)}/800/600`,
      key: input.key,
    };
  }

  const command = new PutObjectCommand({
    Bucket: env.DO_SPACES_BUCKET,
    Key: input.key,
    ContentType: input.contentType,
    ACL: 'public-read',
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
  return {
    uploadUrl,
    publicUrl: publicUrlForKey(input.key),
    key: input.key,
  };
}
