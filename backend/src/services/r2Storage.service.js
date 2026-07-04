import crypto from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function clean(value) {
  return String(value || "").trim();
}

export function getR2Config() {
  const accountId = clean(process.env.R2_ACCOUNT_ID);
  const endpoint = clean(process.env.R2_ENDPOINT) || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  return {
    endpoint,
    accessKeyId: clean(process.env.R2_ACCESS_KEY_ID),
    secretAccessKey: clean(process.env.R2_SECRET_ACCESS_KEY),
    bucket: clean(process.env.R2_BUCKET),
    publicBaseUrl: clean(process.env.R2_PUBLIC_BASE_URL).replace(/\/$/, "")
  };
}

export function isR2Configured(config = getR2Config()) {
  return Boolean(config.endpoint && config.accessKeyId && config.secretAccessKey && config.bucket && config.publicBaseUrl);
}

export async function uploadBufferToR2({
  buffer,
  mimeType,
  extension,
  keyPrefix,
  metadata = {},
  cacheControl = "public, max-age=31536000, immutable",
  client,
  config = getR2Config()
}) {
  if (!isR2Configured(config)) {
    const error = new Error("Cloudflare R2 nao configurado.");
    error.code = "r2_not_configured";
    throw error;
  }

  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const normalizedPrefix = String(keyPrefix || "temp").replace(/^\/+|\/+$/g, "");
  const storageKey = `${normalizedPrefix}/${crypto.randomUUID()}.${extension}`;
  const r2Client = client || new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
  });

  await r2Client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: storageKey,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: cacheControl,
    Metadata: { ...metadata, sha256: checksum }
  }));

  return {
    url: `${config.publicBaseUrl}/${storageKey}`,
    storageProvider: "cloudflare_r2",
    storageKey,
    mimeType,
    fileSizeBytes: buffer.length,
    checksum,
    assetVersion: 1
  };
}

export function uploadCreativeToR2({ campaignId, ...options }) {
  return uploadBufferToR2({
    ...options,
    keyPrefix: `ads/creatives/${campaignId}`,
    metadata: { ...(options.metadata || {}), campaignid: campaignId }
  });
}
