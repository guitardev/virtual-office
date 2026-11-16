import { supabase } from "@/lib/supabase";
import { getUserNasSid, safeParseJsonResponse } from "@/lib/synology";

export const MAX_SERVERLESS_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB (Vercel Serverless limit)
export const MAX_LARGE_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB (Supabase Storage direct upload)
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
  storage: "nas" | "supabase";
}

function buildSafeStorageObjectKey(nasFolder: string, originalFileName: string): string {
  const safeFolder = nasFolder
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/[^a-zA-Z0-9/_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "uploads";

  const dotIdx = originalFileName.lastIndexOf(".");
  const rawExt = dotIdx > 0 ? originalFileName.slice(dotIdx + 1) : "";
  const safeExt = rawExt.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const baseAscii = (dotIdx > 0 ? originalFileName.slice(0, dotIdx) : originalFileName)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 8);
  const filePart = `${Date.now()}_${rand}${baseAscii ? `_${baseAscii}` : ""}${
    safeExt ? `.${safeExt}` : ""
  }`;
  return `${safeFolder}/${filePart}`;
}

export async function uploadSmartFile(
  file: File,
  nasFolder: string
): Promise<SmartUploadResult> {
  if (file.size > MAX_LARGE_UPLOAD_BYTES) {
    throw new Error("ไฟล์มีขนาดเกิน 50 MB กรุณาบีบอัดไฟล์หรือใส่ลิงก์ภายนอกแทน");
  }

  const isVercelHost =
    typeof window !== "undefined" &&
    /\.vercel\.app$/i.test(window.location.hostname);

  // 1. Try Synology NAS via /api/nas/upload when <= 4 MB or running self-hosted (not Vercel)
  if (file.size <= MAX_SERVERLESS_UPLOAD_BYTES || !isVercelHost) {
    try {
      const fd = new FormData();
      fd.append("file", file);
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
            (parsed.path as string) || `${nasFolder}/${file.name}`;
          return {
            nasPath: uploadedPath,
            fileUrl: null,
            fileName: file.name,
            fileSize: file.size,
            storage: "nas",
          };
        }
        // If NAS upload failed for small file, only fall back to Supabase Storage when > 4 MB
        if (file.size <= MAX_SERVERLESS_UPLOAD_BYTES) {
          throw new Error(
            String(parsed?.error || "อัปโหลดไฟล์ขึ้น Synology NAS ไม่สำเร็จ")
          );
        }
      }
    } catch (err) {
      if (file.size <= MAX_SERVERLESS_UPLOAD_BYTES) {
        throw err;
      }
      // For > 4 MB files, fall through to Supabase Storage direct browser upload
    }
  }

  // 2. Direct browser upload to Supabase Storage (bypasses Vercel 4.5 MB limit, up to 50 MB)
  if (!supabase) {
    throw new Error(
      "ไฟล์มีขนาดเกิน 4 MB และยังไม่ได้ตั้งค่า Supabase Storage สำหรับอัปโหลดไฟล์ขนาดใหญ่"
    );
  }

  const objectKey = buildSafeStorageObjectKey(nasFolder, file.name);

  const { error: uploadError } = await supabase.storage
    .from(DATAHUB_STORAGE_BUCKET)
    .upload(objectKey, file, {
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
    fileName: file.name,
    fileSize: file.size,
    storage: "supabase",
  };
}
