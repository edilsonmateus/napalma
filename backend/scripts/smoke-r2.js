import dotenv from "dotenv";
import sharp from "sharp";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { uploadBufferToR2 } from "../src/services/r2Storage.service.js";

dotenv.config();

const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
const endpoint = String(process.env.R2_ENDPOINT || "").trim()
  || `https://${accountId}.r2.cloudflarestorage.com`;
const bucket = String(process.env.R2_BUCKET || "").trim();
let uploaded;
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
  uploaded = await uploadBufferToR2({
    buffer: body,
    mimeType: "image/webp",
    extension: "webp",
    keyPrefix: "temp/shared-smoke",
    cacheControl: "no-store",
    client
  });

  const response = await fetch(uploaded.url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Public URL returned HTTP ${response.status}`);
  const received = Buffer.from(await response.arrayBuffer());
  if (received.length !== body.length) throw new Error("Public object size mismatch");
  console.log("R2 smoke passed: upload, public read and integrity check succeeded.");
} finally {
  if (uploaded?.storageKey) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: uploaded.storageKey }));
  }
}
