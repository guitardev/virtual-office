import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/server-session";

export const dynamic = "force-dynamic";

const MAX_R2_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

function hmacSha256(key: crypto.BinaryLike, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function createR2PresignedPutUrl(opts: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  objectKey: string;
  expiresSeconds?: number;
}): string {
  const {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    objectKey,
    expiresSeconds = 300,
  } = opts;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(
    now.getUTCDate()
  )}`;
  const amzDate = `${dateStamp}T${pad(now.getUTCHours())}${pad(
    now.getUTCMinutes()
  )}${pad(now.getUTCSeconds())}Z`;

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const encodedKey = objectKey
    .split("/")
    .filter(Boolean)
    .map(encodeRfc3986)
    .join("/");
  const canonicalUri = `/${encodeRfc3986(bucketName)}/${encodedKey}`;

  const queryParams: Array<[string, string]> = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${accessKeyId}/${credentialScope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(expiresSeconds)],
    ["X-Amz-SignedHeaders", "host"],
  ];

  const canonicalQueryString = queryParams
    .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
    .join("&");

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, "auto");
  const kService = hmacSha256(kRegion, "s3");
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = crypto
    .createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (process.env.NODE_ENV === "production" && !session) {
      return NextResponse.json(
        {
          success: false,
          configured: true,
          error: "กรุณาเข้าสู่ระบบก่อนอัปโหลดไฟล์ (Unauthorized)",
        },
        { status: 401 }
      );
    }

    const accountId = (process.env.R2_ACCOUNT_ID || "").trim();
    const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
    const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
    const bucketName = (process.env.R2_BUCKET_NAME || "").trim();
    const publicBaseUrl = (process.env.R2_PUBLIC_URL || "").trim().replace(/\/+$/, "");

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicBaseUrl) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          error: "ยังไม่ได้ตั้งค่า Cloudflare R2 ใน Environment Variables ครบถ้วน",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const rawKey = String(body.objectKey || "").trim().replace(/^\/+/, "");
    const fileSize = Number(body.fileSize || 0);

    if (!rawKey || rawKey.includes("..")) {
      return NextResponse.json(
        { success: false, configured: true, error: "objectKey ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (fileSize > MAX_R2_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, configured: true, error: "ไฟล์มีขนาดเกิน 100 MB" },
        { status: 400 }
      );
    }

    const presignedUrl = createR2PresignedPutUrl({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      objectKey: rawKey,
      expiresSeconds: 300,
    });

    const encodedPublicKey = rawKey
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    const publicUrl = `${publicBaseUrl}/${encodedPublicKey}`;

    return NextResponse.json({
      success: true,
      configured: true,
      presignedUrl,
      publicUrl,
      objectKey: rawKey,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
