export type DataHubDocType = "form" | "manual" | "guideline" | "plan" | "other";

export interface DataHubDocItem {
  id: string;
  docType: DataHubDocType;
  title: string;
  division: string;
  description: string;
  keywords: string[];
  nasPath: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number;
  fileExt: string;
  updatedDate: string; // YYYY-MM-DD
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export const DATAHUB_DOC_TYPE_LABELS: Record<DataHubDocType, string> = {
  form: "แบบฟอร์มคำขอ",
  manual: "คู่มือปฏิบัติงาน",
  guideline: "แนวทางปฏิบัติ / หลักเกณฑ์",
  plan: "แผนงาน / รายงาน",
  other: "เอกสารอื่นๆ",
};

export function buildDataHubDocNasFolder(docType: DataHubDocType): string {
  const folderMap: Record<DataHubDocType, string> = {
    form: "forms",
    manual: "manuals",
    guideline: "guidelines",
    plan: "plans",
    other: "others",
  };
  return `/virtual-office/datahub/${folderMap[docType] || "others"}`;
}

export function extractFileExtension(fileName?: string | null, fileUrl?: string | null): string {
  const source = (fileName || fileUrl || "").split("?")[0].trim();
  const idx = source.lastIndexOf(".");
  if (idx > 0 && idx < source.length - 1) {
    const ext = source.slice(idx + 1).toUpperCase();
    if (ext.length <= 6) return ext;
  }
  return fileUrl && !fileName ? "LINK" : "FILE";
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const DATAHUB_DOCUMENTS_MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS public.datahub_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL DEFAULT 'form' CHECK (doc_type IN ('form', 'manual', 'guideline', 'plan', 'other')),
  title text NOT NULL,
  division text NOT NULL DEFAULT '',
  description text DEFAULT '',
  keywords text[] DEFAULT '{}',
  nas_path text,
  file_url text,
  file_name text,
  file_size bigint DEFAULT 0,
  file_ext text DEFAULT '',
  updated_date date DEFAULT CURRENT_DATE,
  created_by text,
  created_by_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.datahub_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read datahub_documents" ON public.datahub_documents FOR SELECT USING (true);
CREATE POLICY "Allow all write datahub_documents" ON public.datahub_documents FOR ALL USING (true) WITH CHECK (true);`;
