/**
 * Shared helpers & types for Official Orders & Announcements (คำสั่ง / ประกาศ / ระเบียบ)
 * Used by both API routes and Data Hub UI.
 */

export type OfficialOrderCategory = "order" | "announcement" | "regulation";
export type OfficialOrderStatus = "active" | "amended" | "revoked";

export interface OfficialOrderItem {
  id: string;
  docCategory: OfficialOrderCategory;
  docNumberRaw: string;
  orderSeq: number | null;
  orderYearBe: number;
  issuedDate: string; // YYYY-MM-DD
  title: string;
  issuerOrg: string;
  division: string;
  summary: string;
  keywords: string[];
  status: OfficialOrderStatus;
  supersedesOrderId: string | null;
  nasPath: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfficialOrderYearCount {
  orderYearBe: number;
  totalCount: number;
  orderCount: number;
  announcementCount: number;
  regulationCount: number;
}

export const ORDER_CATEGORY_LABELS: Record<OfficialOrderCategory, string> = {
  order: "คำสั่ง",
  announcement: "ประกาศ",
  regulation: "ระเบียบ/ข้อบังคับ",
};

export const ORDER_STATUS_LABELS: Record<OfficialOrderStatus, string> = {
  active: "ยังมีผลบังคับใช้",
  amended: "แก้ไขเพิ่มเติม",
  revoked: "ยกเลิกแล้ว",
};

const THAI_DIGITS = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];

/**
 * แปลงเลขไทย (๐-๙) ให้เป็นเลขอารบิก (0-9) เพื่อใช้ค้นหาและเปรียบเทียบ
 */
export function normalizeThaiNumerals(input: string): string {
  if (!input) return "";
  let out = input;
  for (let i = 0; i < THAI_DIGITS.length; i++) {
    out = out.split(THAI_DIGITS[i]).join(String(i));
  }
  return out;
}

/**
 * แยกเลขที่คำสั่งและปี พ.ศ. ออกจากสตริงเลขที่ เช่น "125/2569", "๑๒๕/๒๕๖๙", "พมจ.กพ. 45/2569"
 */
export function parseOrderNumberParts(
  rawInput: string,
  issuedDate?: string
): {
  docNumberRaw: string;
  orderSeq: number | null;
  orderYearBe: number;
} {
  const normalized = normalizeThaiNumerals(rawInput || "")
    .replace(/\s+/g, " ")
    .trim();

  // Derive fallback BE year from issuedDate (YYYY-MM-DD) or current year
  let fallbackYearBe = new Date().getFullYear() + 543;
  if (issuedDate && /^\d{4}-\d{2}-\d{2}/.test(issuedDate)) {
    const adYear = Number(issuedDate.slice(0, 4));
    if (adYear >= 1900 && adYear <= 2200) {
      fallbackYearBe = adYear + 543;
    }
  }

  // Match pattern like "<seq>/<25xx>" anywhere in the string
  const slashMatch = normalized.match(/(\d{1,6})\s*\/\s*(25\d{2}|26\d{2})/);
  if (slashMatch) {
    return {
      docNumberRaw: normalized,
      orderSeq: Number(slashMatch[1]),
      orderYearBe: Number(slashMatch[2]),
    };
  }

  // Match standalone number (use last numeric token as sequence)
  const numTokens = normalized.match(/\d{1,6}/g);
  const lastNum = numTokens && numTokens.length > 0 ? Number(numTokens[numTokens.length - 1]) : null;

  return {
    docNumberRaw: normalized,
    orderSeq: lastNum !== null && Number.isFinite(lastNum) ? lastNum : null,
    orderYearBe: fallbackYearBe,
  };
}

/**
 * สร้างข้อความสำหรับค้นหา (normalize เลขไทย + lowercase)
 */
export function buildOrderSearchNormalized(parts: {
  docNumberRaw: string;
  orderSeq: number | null;
  orderYearBe: number;
  title: string;
  issuerOrg?: string;
  division?: string;
  summary?: string;
  keywords?: string[];
}): string {
  const raw = [
    parts.docNumberRaw,
    parts.orderSeq !== null ? String(parts.orderSeq) : "",
    String(parts.orderYearBe),
    parts.title,
    parts.issuerOrg || "",
    parts.division || "",
    parts.summary || "",
    ...(parts.keywords || []),
  ]
    .filter(Boolean)
    .join(" ");

  return normalizeThaiNumerals(raw).replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * สร้างโฟลเดอร์ปลายทางบน Synology NAS แยกตามปี พ.ศ. และประเภท
 */
export function buildOrderNasFolder(
  yearBe: number,
  category: OfficialOrderCategory
): string {
  const sub =
    category === "order"
      ? "คำสั่ง"
      : category === "announcement"
      ? "ประกาศ"
      : "ระเบียบ";
  return `/virtual-office/orders/${yearBe}/${sub}`;
}

/**
 * Format YYYY-MM-DD as Thai short date (เช่น 13 พ.ย. 2569)
 */
export function formatThaiOrderDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return isoDate || "-";
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const thaiMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  return `${d} ${thaiMonths[(m - 1) % 12] || ""} ${y + 543}`;
}
