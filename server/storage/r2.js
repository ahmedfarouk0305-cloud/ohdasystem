import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import path from "path"

const env = globalThis.process && globalThis.process.env ? globalThis.process.env : {}

export const R2_ACCOUNT_ID = String(env.R2_ACCOUNT_ID || "")
export const R2_ENDPOINT = String(env.R2_ENDPOINT || "")
export const R2_ACCESS_KEY_ID = String(env.R2_ACCESS_KEY_ID || "")
export const R2_SECRET_ACCESS_KEY = String(env.R2_SECRET_ACCESS_KEY || "")
export const R2_BUCKET_NAME = String(env.R2_BUCKET_NAME || env.R2_BUCKET || "")
export const R2_PUBLIC_BASE = String(env.R2_PUBLIC_BASE || "")

export const isR2Configured =
  Boolean(R2_BUCKET_NAME) &&
  Boolean(R2_ACCESS_KEY_ID) &&
  Boolean(R2_SECRET_ACCESS_KEY) &&
  (Boolean(R2_ENDPOINT) || Boolean(R2_ACCOUNT_ID))

let r2Client = null
function getR2Client() {
  if (r2Client) return r2Client
  if (!isR2Configured) return null
  const endpoint =
    R2_ENDPOINT ||
    (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "")
  r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })
  return r2Client
}

export async function uploadBufferToR2(buffer, key, contentType = "application/octet-stream") {
  const client = getR2Client()
  if (!client) {
    throw new Error("R2 is not configured")
  }
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })
  await client.send(command)
  let base = R2_PUBLIC_BASE
  if (base) {
    if (base.endsWith("/")) base = base.slice(0, -1)
    return `${base}/${key}`
  }
  const accountBase = R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : (R2_ENDPOINT || "")
  return `${accountBase}/${R2_BUCKET_NAME}/${encodeURIComponent(key)}`
}

export function buildSafeObjectKey(fileName, { odaId, invoiceId } = {}) {
  const ext = path.extname(fileName || "")
  const safeBase = String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .slice(0, 64)
  const parts = ["odas", String(odaId || "unknown"), "invoices", String(invoiceId || "file")]
  const finalName = `${safeBase}${ext || ""}`
  return parts.concat(finalName).join("/")
}
