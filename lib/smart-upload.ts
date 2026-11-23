import { supabase } from "@/lib/supabase";
import { getUserNasSid, safeParseJsonResponse } from "@/lib/synology";

export const MAX_SERVERLESS_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB (Vercel Serverless limit)
export const MAX_LARGE_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB (Cloudflare R2 direct upload)
export const DATAHUB_STORAGE_BUCKET = "datahub-files";

export const STORAGE_BUCKET_MIGRATION_SQL = `INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('datahub-files', 'datahub-files', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

CREATE POLICY "Allow public read datahub-files" ON storage.objects FOR SELECT USING (bucket_id = 'datahub-files');
CREATE POLICY "Allow public insert datahub-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'datahub-files');
CREATE POLICY "Allow public update datahub-files" ON storage.objects FOR UPDATE USING (bucket_id = 'datahub-files');
CREATE POLICY "Allow public delete datahub-files" ON storage.objects FOR DELETE USING (bucket_id = 'datahub-files');`;

export interface SmartUploadResult {
  nasPath: string | null;
  fileUrl: string | null;
  fileName: string;
  fileSize: number;
  storage: "nas" | "r2" | "supabase";
}

function buildSafeStorageObjectKey(
  nasFolder: string,
  originalFileName: string
): string {
  const safeFolder =
    nasFolder
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .replace(/[^a-zA-Z0-9/_-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || "uploads";

  const dotIdx = originalFileName.lastIndexOf(".");
  const rawExt = dotIdx > 0 ? originalFileName.slice(dotIdx + 1) : "";
  const safeExt = rawExt.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const baseAscii = (
    dotIdx > 0 ? originalFileName.slice(0, dotIdx) : originalFileName
  )
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 8);
  const filePart = `${Date.now()}_${rand}${baseAscii ? `_${baseAscii}` : ""}${
    safeExt ? `.${safeExt}` : ""
  }`;
  return `${safeFolder}/${filePart}`;
}

async function tryUploadToR2(
  file: File,
  objectKey: string
): Promise<SmartUploadResult | null> {
  const presignRes = await fetch("/api/r2/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      objectKey,
      contentType: file.type || "application/octet-stream",
      fileSize: file.size,
    }),
  });

  const presignData = await safeParseJsonResponse(presignRes);
  if (presignRes.status === 503 && presignData?.configured === false) {
    // R2 not configured in this environment — allow fallback to Supabase Storage
    return null;
  }

  if (!presignRes.ok || !presignData?.success || !presignData?.presignedUrl) {
    throw new Error(
      String(presignData?.error || "ไม่สามารถสร้างลิงก์อัปโหลด Cloudflare R2 ได้")
    );
  }

  const putRes = await fetch(String(presignData.presignedUrl), {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(
      `อัปโหลดไฟล์ขึ้น Cloudflare R2 ไม่สำเร็จ (HTTP ${putRes.status}) — กรุณาตรวจสอบการตั้งค่า CORS Policy บน Bucket`
    );
  }

  return {
    nasPath: null,
    fileUrl: String(presignData.publicUrl),
    fileName: file.name,
    fileSize: file.size,
    storage: "r2",
  };
}

export async function compressImageForUpload(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/") || file.size <= 3.5 * 1024 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 2560;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            const cleanName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
            resolve(blob ? new File([blob], cleanName, { type: "image/jpeg" }) : file);
          },
          "image/jpeg",
          0.88
        );
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
  });
}

export interface SmartUploadOptions {
  allowCloudFallback?: boolean;
  compressImages?: boolean;
}

export async function uploadSmartFile(
  file: File,
  nasFolder: string,
  options?: SmartUploadOptions
): Promise<SmartUploadResult> {
  const preparedFile = options?.compressImages
    ? await compressImageForUpload(file)
    : file;

  if (preparedFile.size > MAX_LARGE_UPLOAD_BYTES) {
    throw new Error(
      "ไฟล์มีขนาดเกิน 100 MB กรุณาบีบอัดไฟล์หรือใส่ลิงก์ภายนอกแทน"
    );
  }

  const isVercelHost =
    typeof window !== "undefined" &&
    /\.vercel\.app$/i.test(window.location.hostname);

  // 1. Try Synology NAS via /api/nas/upload when <= 4 MB or running self-hosted
  if (preparedFile.size <= MAX_SERVERLESS_UPLOAD_BYTES || !isVercelHost) {
    try {
      const fd = new FormData();
      fd.append("file", preparedFile);
      fd.append("folder_path", nasFolder);
      const rawSid = getUserNasSid();
      if (
        rawSid &&
        !rawSid.startsWith("mock_") &&
        rawSid !== "system_chat_session"
      ) {
        fd.append("sid", rawSid);
      }

      const res = await fetch("/api/nas/upload", {
        method: "POST",
        body: fd,
      });

      if (res.status !== 413) {
        const parsed = await safeParseJsonResponse(res);
        if (res.ok && parsed?.success) {
          const uploadedPath =
            (parsed.file?.path as string) ||
            (parsed.path as string) ||
            `${nasFolder}/${preparedFile.name}`;
          return {
            nasPath: uploadedPath,
            fileUrl: null,
            fileName: preparedFile.name,
            fileSize: preparedFile.size,
            storage: "nas",
          };
        }
        if (
          preparedFile.size <= MAX_SERVERLESS_UPLOAD_BYTES &&
          !options?.allowCloudFallback
        ) {
          throw new Error(
            String(parsed?.error || "อัปโหลดไฟล์ขึ้น Synology NAS ไม่สำเร็จ")
          );
        }
      }
    } catch (err) {
      if (
        preparedFile.size <= MAX_SERVERLESS_UPLOAD_BYTES &&
        !options?.allowCloudFallback
      ) {
        throw err;
      }
      // For > 4 MB files or when cloud fallback is enabled, fall through to Cloudflare R2 / Supabase Storage
    }
  }

  const objectKey = buildSafeStorageObjectKey(nasFolder, preparedFile.name);

  // 2. Try Cloudflare R2 direct browser upload (10 GB free, 0 egress, up to 100 MB)
  const r2Result = await tryUploadToR2(preparedFile, objectKey);
  if (r2Result) {
    return r2Result;
  }

  // 3. Fallback to Supabase Storage if R2 is not configured
  if (!supabase) {
    throw new Error(
      "ไฟล์มีขนาดเกิน 4 MB และยังไม่ได้ตั้งค่า Cloudflare R2 หรือ Supabase Storage"
    );
  }

  const { error: uploadError } = await supabase.storage
    .from(DATAHUB_STORAGE_BUCKET)
    .upload(objectKey, preparedFile, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    if (/bucket not found|not found/i.test(uploadError.message)) {
      throw new Error(
        `ยังไม่ได้สร้าง Storage Bucket "${DATAHUB_STORAGE_BUCKET}" บน Supabase สำหรับไฟล์ขนาดเกิน 4 MB`
      );
    }
    throw new Error(`อัปโหลดไฟล์ขนาดใหญ่ไม่สำเร็จ: ${uploadError.message}`);
  }

  const { data: pub } = supabase.storage
    .from(DATAHUB_STORAGE_BUCKET)
    .getPublicUrl(objectKey);

  return {
    nasPath: null,
    fileUrl: pub.publicUrl,
    fileName: preparedFile.name,
    fileSize: preparedFile.size,
    storage: "supabase",
  };
}
