import { S3Client, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const BUCKET = process.env.R2_BUCKET || 'cinekube-images';
export const WEEKLY_PREFIX = 'weekly-releases/';

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// "Directories" directly under a prefix (e.g. the week dates).
export async function listCommonPrefixes(prefix) {
  const prefixes = [];
  let ContinuationToken;
  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      Delimiter: '/',
      ContinuationToken,
    }));
    for (const p of res.CommonPrefixes || []) prefixes.push(p.Prefix);
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return prefixes;
}

// All objects under a prefix, as { Key, Size }.
export async function listObjects(prefix) {
  const objects = [];
  let ContinuationToken;
  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken,
    }));
    for (const obj of res.Contents || []) objects.push(obj);
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return objects;
}

export async function objectExists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// Full object body as a Buffer (used to bundle files into a zip server-side).
export async function getObjectBuffer(key) {
  const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return Buffer.from(await res.Body.transformToByteArray());
}

// Temporary browser-facing URL; downloadName forces "save as" behavior.
export async function presignGet(key, { downloadName, expiresIn = 3600 } = {}) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ...(downloadName && { ResponseContentDisposition: `attachment; filename="${downloadName}"` }),
  });
  return getSignedUrl(client, command, { expiresIn });
}

export function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date || '');
}
