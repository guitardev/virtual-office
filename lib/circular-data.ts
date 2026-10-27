import {
  CircularDocument,
  CircularTargetCriteria,
  CircularRecipientStatus,
  Member,
  PersonnelType,
} from "./types";
import { GOVERNMENT_DIVISIONS } from "./rbac";

export const CIRCULAR_STORAGE_KEY = "smartmso_circular_docs";

/**
 * Resolves a list of recipient members based on criteria
 */
export function resolveTargetRecipients(
  criteria: CircularTargetCriteria,
  availableMembers: Member[]
): CircularRecipientStatus[] {
  // Exclude Admin users from circular document recipients and statistics
  const activeMembers = availableMembers.filter(
    (m) => (m.status === "active" || m.status === undefined) && m.role !== "admin"
  );

  let targetMembers: Member[] = [];

  if (criteria.scope === "all") {
    targetMembers = [...activeMembers];
  } else {
    const memberIdSet = new Set<string>();

    activeMembers.forEach((member) => {
      let isMatch = false;

      // Match Division
      if (criteria.divisions && criteria.divisions.length > 0) {
        if (criteria.divisions.includes(member.division) || criteria.divisions.includes(member.department || "")) {
          isMatch = true;
        }
      }

      // Match Personnel Type
      if (criteria.personnelTypes && criteria.personnelTypes.length > 0) {
        if (member.personnelType && criteria.personnelTypes.includes(member.personnelType)) {
          isMatch = true;
        }
      }

      // Match Specific Member IDs (exclude Admin)
      if (criteria.specificMemberIds && criteria.specificMemberIds.includes(member.id)) {
        if (member.role !== "admin") {
          isMatch = true;
        }
      }

      if (isMatch && !memberIdSet.has(member.id)) {
        memberIdSet.add(member.id);
        targetMembers.push(member);
      }
    });
  }

  return targetMembers.map((m) => ({
    memberId: m.id,
    memberName: m.name,
    division: m.division,
    personnelType: m.personnelType || ("ข้าราชการ" as PersonnelType),
    position: m.position,
    isAcknowledged: false,
  }));
}

/**
 * Helper to get only non-admin recipients for accurate statistics calculation
 */
export function getNonAdminRecipients(
  recipients: CircularRecipientStatus[],
  availableMembers?: Member[]
): CircularRecipientStatus[] {
  if (!availableMembers || availableMembers.length === 0) {
    return recipients;
  }
  const adminIds = new Set(
    availableMembers.filter((m) => m.role === "admin").map((m) => m.id)
  );
  return recipients.filter((r) => !adminIds.has(r.memberId));
}

/**
 * Default Initial Circular Documents (Realistic Thai Government MSO Documents)
 */
export const INITIAL_CIRCULAR_DOCS: CircularDocument[] = [];

/**
 * Standard Government Circular Presets for Quick Document Importing & Demonstration
 */
export interface CircularPreset {
  id: string;
  name: string;
  docNumber: string;
  title: string;
  issuedDate: string;
  senderOrg: string;
  urgency: "normal" | "urgent" | "very_urgent" | "most_urgent";
  secretLevel: "normal" | "confidential" | "top_secret";
  summary: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  docType?: "memo" | "external" | "command" | "announcement";
  referenceDoc?: string;
  attachmentList?: string;
}

export const CIRCULAR_OFFICIAL_PRESETS: CircularPreset[] = [
  {
    id: "preset_memo_budget",
    name: "📜 บันทึกข้อความ (ภายใน): แนวทางจัดสรรงบประมาณโครงการพัฒนาคุณภาพชีวิต (พ.ศ. ๒๕๖๙)",
    docType: "memo",
    docNumber: "พม ๐๐๐๕/ว ๔๕๒",
    title: "แนวทางการจัดสรรงบประมาณโครงการพัฒนาคุณภาพชีวิตผู้สูงอายุและคนพิการ ประจำปีงบประมาณ พ.ศ. ๒๕๖๙",
    issuedDate: "๑๐ ตุลาคม ๒๕๖๙",
    senderOrg: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร โทร. ๐-๕๕๗๐-๕๐๓๑",
    urgency: "urgent",
    secretLevel: "normal",
    summary:
      "แจ้งแนวทางปฏิบัติการเบิกจ่ายงบประมาณและหลักเกณฑ์การสนับสนุนเงินสงเคราะห์ครอบครัวคนพิการและผู้สูงอายุในภาวะยากลำบาก ประจำไตรมาสที่ ๑ ให้ทุกกลุ่มงานถือปฏิบัติโดยเคร่งครัด",
    fileName: "แนวทางจัดสรรงบประมาณ_2569.pdf",
    fileUrl: "/virtual-office/circular_docs/budget_guideline_2569.pdf",
    fileSize: 1845000,
  },
  {
    id: "preset_external_provincial",
    name: "🏛️ หนังสือภายนอก: การประสานแผนปฏิบัติการขับเคลื่อนศูนย์บริการคนพิการทั่วไป",
    docType: "external",
    docNumber: "พม ๐๐๐๕/๑๘๗๒",
    title: "ขอความอนุเคราะห์จัดส่งผู้แทนเข้าร่วมประชุมเชิงปฏิบัติการจัดทำแผนขับเคลื่อนศูนย์บริการคนพิการทั่วไป",
    issuedDate: "๑๕ ตุลาคม ๒๕๖๙",
    senderOrg: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร ศาลากลางจังหวัดกำแพงเพชร ๖๒๐๐๐",
    referenceDoc: "หนังสือจังหวัดกำแพงเพชร ด่วนที่สุด ที่ กพ ๐๐๓๒/ว ๑๔๒ ลงวันที่ ๒ ตุลาคม ๒๕๖๙",
    attachmentList: "๑. กำหนดการประชุมเชิงปฏิบัติการ จำนวน ๑ ฉบับ, ๒. แบบตอบรับการเข้าร่วมประชุม จำนวน ๑ ชุด",
    urgency: "urgent",
    secretLevel: "normal",
    summary:
      "ขอเชิญผู้แทนและเจ้าหน้าที่ที่เกี่ยวข้องเข้าร่วมการประชุมเชิงปฏิบัติการจัดทำแผนขับเคลื่อนศูนย์บริการคนพิการทั่วไป ประจำปีงบประมาณ พ.ศ. ๒๕๖๙ เพื่อบูรณาการการดูแลกลุ่มเปราะบางในระดับพื้นที่",
    fileName: "หนังสือภายนอก_ประสานงานแผนคนพิการ.pdf",
    fileUrl: "/virtual-office/circular_docs/sample.pdf",
    fileSize: 1920000,
  },
  {
    id: "preset_command_appoint",
    name: "⚖️ คำสั่งราชการ: แต่งตั้งคณะทำงานขับเคลื่อนระบบสารบรรณอิเล็กทรอนิกส์ (Smart MSO)",
    docType: "command",
    docNumber: "๑๒/๒๕๖๙",
    title: "แต่งตั้งคณะทำงานขับเคลื่อนและกำกับดูแลระบบสารบรรณและเวียนหนังสืออิเล็กทรอนิกส์ (Smart MSO)",
    issuedDate: "๑ ตุลาคม ๒๕๖๙",
    senderOrg: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    urgency: "normal",
    secretLevel: "normal",
    summary:
      "แต่งตั้งคณะทำงานขับเคลื่อนระบบสารบรรณอิเล็กทรอนิกส์ เพื่อยกระดับการบริหารจัดการเอกสารภาครัฐ มุ่งสู่ระบบราชการดิจิทัลตามระเบียบสำนักนายกรัฐมนตรีฯ และมาตรฐานความปลอดภัยสารสนเทศ",
    fileName: "คำสั่งแต่งตั้งคณะทำงานSmartMSO.pdf",
    fileUrl: "/virtual-office/circular_docs/sample.pdf",
    fileSize: 1650000,
  },
  {
    id: "preset_announcement_service",
    name: "📢 ประกาศราชการ: กำหนดการจัดหน่วยบริการเคลื่อนที่เพื่อการพัฒนาสังคมเชิงรุก",
    docType: "announcement",
    docNumber: "๕/๒๕๖๙",
    title: "กำหนดการจัดหน่วยบริการเคลื่อนที่เพื่อการพัฒนาสังคมและช่วยเหลือกลุ่มเปราะบางเชิงรุก ประจำเดือนพฤศจิกายน ๒๕๖๙",
    issuedDate: "๒๒ ตุลาคม ๒๕๖๙",
    senderOrg: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    urgency: "normal",
    secretLevel: "normal",
    summary:
      "ประกาศกำหนดการและสถานที่จัดหน่วยบริการเคลื่อนที่เพื่อออกบัตรประจำตัวคนพิการ ให้คำปรึกษาสวัสดิการสังคม และรับคำขอเงินสงเคราะห์ครอบครัวผู้มีรายได้น้อยในพื้นที่ห่างไกล",
    fileName: "ประกาศหน่วยบริการเคลื่อนที่พมจ.pdf",
    fileUrl: "/virtual-office/circular_docs/sample.pdf",
    fileSize: 1480000,
  },
  {
    id: "preset_pdpa_2569",
    name: "📜 บันทึกข้อความ (ภายใน): มาตรการความปลอดภัยสารสนเทศและการคุ้มครองข้อมูลส่วนบุคคล (PDPA)",
    docType: "memo",
    docNumber: "พม ๐๐๐๕/ว ๔๙๘",
    title: "มาตรการความปลอดภัยการใช้งานระบบสารสนเทศและการคุ้มครองข้อมูลส่วนบุคคล (PDPA) สำนักงาน พมจ.กำแพงเพชร",
    issuedDate: "๑๔ ตุลาคม ๒๕๖๙",
    senderOrg: "กลุ่มนโยบายและวิชาการ (งานเทคโนโลยีสารสนเทศ)",
    urgency: "very_urgent",
    secretLevel: "normal",
    summary:
      "ขอให้ข้าราชการ พนักงานราชการ และเจ้าหน้าที่ทุกคน ปฏิบัติตามแนวทางการเข้าใช้งานเครือข่ายความปลอดภัย Zero Trust และห้ามส่งต่อข้อมูลส่วนบุคคลของกลุ่มเปราะบางออกภายนอกโดยไม่ได้รับอนุญาต",
    fileName: "มาตรการความปลอดภัยและPDPA_พมจ_กพ.pdf",
    fileUrl: "/virtual-office/circular_docs/pdpa_policy_2569.pdf",
    fileSize: 2420000,
  },
  {
    id: "preset_smartmso_attend",
    name: "📜 บันทึกข้อความ (ภายใน): แนวทางการลงเวลาปฏิบัติราชการอิเล็กทรอนิกส์ (Smart MSO)",
    docType: "memo",
    docNumber: "พม ๐๐๐๕/ว ๕๑๑",
    title: "แนวทางการลงเวลาปฏิบัติราชการอิเล็กทรอนิกส์และการขออนุมัติปฏิบัติราชการนอกสถานที่ผ่านระบบ Smart MSO",
    issuedDate: "๑๘ ตุลาคม ๒๕๖๙",
    senderOrg: "ฝ่ายบริหารทั่วไป",
    urgency: "normal",
    secretLevel: "normal",
    summary:
      "กำหนดแนวทางปฏิบัติการบันทึกเวลาเข้า-ออกงานผ่านระบบ Smart MSO พร้อมการตรวจยืนยันพิกัดและการลงนามดิจิทัลเพื่อเพิ่มความโปร่งใสและคล่องตัวของบุคลากรทุกฝ่าย",
    fileName: "ระเบียบการลงเวลาอิเล็กทรอนิกส์_SmartMSO.pdf",
    fileUrl: "/virtual-office/circular_docs/sample.pdf",
    fileSize: 1680000,
  },
];

/**
 * Load circular documents from local cache or initial
 */
export function loadStoredCircularDocs(): CircularDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const cleared = localStorage.getItem("smartmso_circular_cleared");
    if (cleared === "true") return [];

    const raw = localStorage.getItem(CIRCULAR_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Purge obsolete mock documents permanently
      const cleaned = parsed.filter(
        (d) =>
          d &&
          d.id !== "circ_2569_001" &&
          d.id !== "circ_2569_002" &&
          d.id !== "circ_1792470539133" &&
          d.id !== "circ_1792470817460" &&
          d.title !== "ทดสอบเวียน" &&
          d.title !== "test"
      );
      if (cleaned.length !== parsed.length) {
        saveStoredCircularDocs(cleaned);
      }
      return cleaned;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Sanitize circular documents to ensure they fit safely into browser localStorage
 * without triggering QuotaExceededError while preserving all critical metadata.
 */
export function sanitizeCircularDocsForStorage(
  docs: CircularDocument[],
  aggressive = false
): CircularDocument[] {
  const maxBase64Len = aggressive ? 10000 : 80000;
  const maxDocs = aggressive ? 15 : 30;

  return docs.slice(0, maxDocs).map((d) => {
    const isDataUrl = typeof d.fileUrl === "string" && d.fileUrl.startsWith("data:");
    const isOverLengthUrl = isDataUrl && d.fileUrl.length > maxBase64Len;

    const sanitizedScannedPages = Array.isArray(d.scannedPages)
      ? d.scannedPages
          .map((p) => {
            if (typeof p === "string" && p.length > maxBase64Len) {
              return aggressive ? "" : p.slice(0, 1000);
            }
            return p;
          })
          .filter(Boolean)
      : d.scannedPages;

    return {
      ...d,
      fileUrl: isOverLengthUrl ? "/virtual-office/circular_docs/sample.pdf" : d.fileUrl,
      scannedPages: sanitizedScannedPages,
    };
  });
}

/**
 * Save circular documents to local cache safely without exceeding localStorage quota
 */
export function saveStoredCircularDocs(docs: CircularDocument[]) {
  if (typeof window === "undefined") return;
  try {
    // Tier 1: Sanitize oversized base64 data (> 80KB) while keeping up to 30 documents
    const sanitized = sanitizeCircularDocsForStorage(docs, false);
    localStorage.setItem(CIRCULAR_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    try {
      // Tier 2: Aggressive sanitization (keep 15 documents, strip heavy payloads > 10KB)
      const aggressive = sanitizeCircularDocsForStorage(docs, true);
      localStorage.setItem(CIRCULAR_STORAGE_KEY, JSON.stringify(aggressive));
    } catch {
      try {
        // Tier 3: Metadata only fallback (strip fileUrl and scannedPages completely)
        const metaOnly = docs.slice(0, 10).map((d) => ({
          ...d,
          fileUrl: "/virtual-office/circular_docs/sample.pdf",
          scannedPages: undefined,
        }));
        localStorage.setItem(CIRCULAR_STORAGE_KEY, JSON.stringify(metaOnly));
      } catch {
        // Safe non-fatal fallback if origin localStorage is totally exhausted
      }
    }
  }
}
