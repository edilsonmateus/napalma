import crypto from "node:crypto";
import dotenv from "dotenv";
import sharp from "sharp";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

dotenv.config();

const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
const endpoint = String(process.env.R2_ENDPOINT || "").trim()
  || `https://${accountId}.r2.cloudflarestorage.com`;
const bucket = String(process.env.R2_BUCKET || "").trim();
const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
const key = `temp/smoke-${crypto.randomUUID()}.webp`;
const client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: String(process.env.R2_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: String(process.env.R2_SECRET_ACCESS_KEY || "").trim()
  }
});

const body = await sharp({
  create: { width: 80, height: 30, channels: 3, background: "#111827" }
}).webp().toBuffer();

try {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: "image/webp",
    CacheControl: "no-store"
  }));

  const response = await fetch(`${publicBaseUrl}/${key}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Public URL returned HTTP ${response.status}`);
  const received = Buffer.from(await response.arrayBuffer());
  if (received.length !== body.length) throw new Error("Public object size mismatch");
  console.log("R2 smoke passed: upload, public read and integrity check succeeded.");
} finally {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
