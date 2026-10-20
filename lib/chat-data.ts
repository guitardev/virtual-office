import { AttachmentType, ChatGroup, ChatMessage, Member } from "./types";
import { INITIAL_MEMBERS } from "./rbac";

export const DEFAULT_CHAT_GROUPS: ChatGroup[] = [
  {
    id: "ch_all_staff",
    name: "ประกาศและประสานงานกลาง พมจ.",
    description: "ห้องสื่อสารและประสานงานภารกิจส่วนกลาง รวมข้าราชการและเจ้าหน้าที่ทุกกลุ่มงาน",
    icon: "🏢",
    type: "announcement",
    isOfficial: true,
    memberIds: [],
    createdAt: "1 ต.ค. 2569",
    createdBy: "system",
  },
  {
    id: "ch_executive",
    name: "คณะกรรมการบริหารสำนักงาน",
    description: "ห้องประชุมปรึกษาข้อราชการเร่งด่วนสำหรับ พมจ. และหัวหน้ากลุ่ม/ฝ่าย",
    icon: "👑",
    type: "division",
    division: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)",
    isOfficial: true,
    memberIds: [],
    createdAt: "1 ต.ค. 2569",
    createdBy: "system",
  },
  {
    id: "ch_general_admin",
    name: "ฝ่ายบริหารทั่วไป",
    description: "งานสารบรรณ การเงินและบัญชี ยานพาหนะ พัสดุ และการบริหารงานบุคคล",
    icon: "📁",
    type: "division",
    division: "ฝ่ายบริหารทั่วไป",
    isOfficial: true,
    memberIds: [],
    createdAt: "1 ต.ค. 2569",
    createdBy: "system",
  },
  {
    id: "ch_policy_planning",
    name: "กลุ่มนโยบายและวิชาการ",
    description: "จัดทำแผนยุทธศาสตร์ ข้อมูลสารสนเทศ สถิติสังคม และติดตามประเมินผลโครงการ",
    icon: "📊",
    type: "division",
    division: "กลุ่มนโยบายและวิชาการ",
    isOfficial: true,
    memberIds: [],
    createdAt: "1 ต.ค. 2569",
    createdBy: "system",
  },
  {
    id: "ch_social_dev",
    name: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    description: "การช่วยเหลือผู้ประสบปัญหาทางสังคม เด็ก สตรี ผู้สูงอายุ และกลุ่มเปราะบาง",
    icon: "🤝",
    type: "division",
    division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    isOfficial: true,
    memberIds: [],
    createdAt: "1 ต.ค. 2569",
    createdBy: "system",
  },
  {
    id: "ch_disability_center",
    name: "ศูนย์บริการคนพิการจังหวัด",
    description: "การออกบัตรประจำตัวคนพิการ กองทุนส่งเสริมและฟื้นฟูสมรรถภาพคนพิการ",
    icon: "♿",
    type: "division",
    division: "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
    isOfficial: true,
    memberIds: [],
    createdAt: "1 ต.ค. 2569",
    createdBy: "system",
  },
  {
    id: "ch_advisors",
    name: "คณะทำงานที่ปรึกษาและภาคีเครือข่าย",
    description: "ประสานงานร่วมกับผู้ทรงคุณวุฒิ คณะอนุกรรมการ และภาคประชาสังคม",
    icon: "🎓",
    type: "division",
    division: "คณะทำงานที่ปรึกษาและภาคีเครือข่ายภายนอก",
    isOfficial: true,
    memberIds: [],
    createdAt: "1 ต.ค. 2569",
    createdBy: "system",
  },
  {
    id: "ch_project_disability_day",
    name: "คณะทำงานจัดงานวันคนพิการสากล 2569",
    description: "กลุ่มโครงการเฉพาะกิจ: วางแผนจัดกิจกรรมมอบโล่ประกาศเกียรติคุณและนิทรรศการ",
    icon: "🌟",
    type: "custom",
    isOfficial: false,
    memberIds: [],
    createdAt: "5 ต.ค. 2569",
    createdBy: "system",
  },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

const CHAT_GROUPS_STORAGE_KEY = "smartmso_chat_groups_v3";
const LEGACY_CHAT_GROUPS_STORAGE_KEYS = [
  "smartmso_chat_groups_v2",
  "omnioffice_chat_groups_v2",
];
const CHAT_MESSAGES_STORAGE_KEY = "smartmso_chat_messages_v2";
const LEGACY_CHAT_MESSAGES_STORAGE_KEY = "omnioffice_chat_messages_v2";

/**
 * Filter out mock usr_ IDs (only usr_1 and usr_mock are legacy mock IDs)
 */
function isNotMockUserId(id: string): boolean {
  if (!id) return false;
  return id !== "usr_1" && id !== "usr_mock";
}

/**
 * Synchronize group members based on members' office division
 */
export function syncDivisionGroupMembers(
  groups: ChatGroup[],
  allMembers: Member[]
): ChatGroup[] {
  const validMemberIds = new Set(allMembers.filter((m) => isNotMockUserId(m.id)).map((m) => m.id));

  return groups.map((group) => {
    // Sanitize any existing members in the group by removing mock IDs
    const cleanExisting = (group.memberIds || []).filter((id) => isNotMockUserId(id) && validMemberIds.has(id));

    if (group.id === "ch_all_staff") {
      return {
        ...group,
        memberIds: Array.from(new Set([...Array.from(validMemberIds), ...cleanExisting])),
      };
    }

    if (group.id === "ch_executive") {
      const execIds = allMembers
        .filter((m) => isNotMockUserId(m.id) && (m.role === "admin" || m.role === "manager"))
        .map((m) => m.id);
      return {
        ...group,
        memberIds: Array.from(new Set([...execIds, ...cleanExisting])),
      };
    }

    if (group.type === "division" && group.division) {
      const targetDiv = group.division;
      const divisionMemberIds = allMembers
        .filter(
          (m) =>
            isNotMockUserId(m.id) &&
            Boolean(
              m.division &&
                (m.division === targetDiv ||
                  m.division.includes(targetDiv) ||
                  targetDiv.includes(m.division))
            )
        )
        .map((m) => m.id);

      return {
        ...group,
        memberIds: Array.from(new Set([...divisionMemberIds, ...cleanExisting])),
      };
    }

    return {
      ...group,
      memberIds: cleanExisting,
    };
  });
}

/**
 * Load stored groups from localStorage with auto-sync
 */
export function loadStoredChatGroups(allMembers: Member[] = INITIAL_MEMBERS): ChatGroup[] {
  if (typeof window === "undefined") {
    return syncDivisionGroupMembers(DEFAULT_CHAT_GROUPS, allMembers);
  }

  try {
    LEGACY_CHAT_GROUPS_STORAGE_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });

    const raw = localStorage.getItem(CHAT_GROUPS_STORAGE_KEY);
    let loaded: ChatGroup[] = DEFAULT_CHAT_GROUPS;

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existingIds = new Set(parsed.map((g: ChatGroup) => g.id));
        const missingDefaults = DEFAULT_CHAT_GROUPS.filter((d) => !existingIds.has(d.id));
        loaded = [...parsed, ...missingDefaults];
      }
    }

    const synced = syncDivisionGroupMembers(loaded, allMembers);
    localStorage.setItem(CHAT_GROUPS_STORAGE_KEY, JSON.stringify(synced));
    return synced;
  } catch (err) {
    console.error("Failed to load chat groups:", err);
    return syncDivisionGroupMembers(DEFAULT_CHAT_GROUPS, allMembers);
  }
}

/**
 * Save chat groups to localStorage
 */
export function saveStoredChatGroups(groups: ChatGroup[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch (err) {
    console.error("Failed to save chat groups:", err);
  }
}

/**
 * Load stored messages from localStorage
 */
export function loadStoredChatMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];

  try {
    const raw =
      localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_CHAT_MESSAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to load chat messages:", err);
    return [];
  }
}

/**
 * Save chat messages to localStorage
 */
export function saveStoredChatMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  } catch (err) {
    // If quota exceeded (e.g. large base64 attachments), sanitize and keep last 50 messages
    try {
      const sanitized = messages.slice(-50).map((m) => ({
        ...m,
        attachmentUrl: m.attachmentUrl?.startsWith("data:") ? undefined : m.attachmentUrl,
        attachments: m.attachments?.map((a) => ({
          ...a,
          dataUrl: undefined,
        })),
      }));
      localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // Non-fatal fallback
    }
  }
}

/**
 * Detect file type from filename and optional mimeType
 */
export function detectAttachmentType(fileName: string, mimeType?: string): AttachmentType {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp"].includes(ext) || mimeType?.startsWith("image/")) {
    return "image";
  }
  if (ext === "pdf" || mimeType === "application/pdf") {
    return "pdf";
  }
  if (
    ["doc", "docx", "odt", "rtf", "txt"].includes(ext) ||
    mimeType?.includes("word") ||
    mimeType?.includes("document")
  ) {
    return "doc";
  }
  if (
    ["xls", "xlsx", "csv", "ods"].includes(ext) ||
    mimeType?.includes("excel") ||
    mimeType?.includes("spreadsheet") ||
    mimeType?.includes("csv")
  ) {
    return "excel";
  }
  if (
    ["ppt", "pptx", "odp"].includes(ext) ||
    mimeType?.includes("presentation") ||
    mimeType?.includes("powerpoint")
  ) {
    return "powerpoint";
  }
  if (
    ["zip", "rar", "7z", "tar", "gz"].includes(ext) ||
    mimeType?.includes("zip") ||
    mimeType?.includes("archive") ||
    mimeType?.includes("compressed")
  ) {
    return "zip";
  }
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext) || mimeType?.startsWith("video/")) {
    return "video";
  }
  if (["mp3", "wav", "m4a", "ogg", "aac", "flac"].includes(ext) || mimeType?.startsWith("audio/")) {
    return "audio";
  }
  return "other";
}

/**
 * Format bytes to human readable string
 */
export function formatAttachmentSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export const ATTACHMENT_TYPE_CONFIG: Record<
  AttachmentType,
  {
    icon: string;
    label: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    bubbleBgMe: string;
    bubbleBgOther: string;
  }
> = {
  pdf: {
    icon: "📕",
    label: "PDF",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-700",
    border: "border-rose-200",
    bubbleBgMe: "bg-rose-950/40 border-rose-400/30",
    bubbleBgOther: "bg-rose-50/80 border-rose-200",
  },
  doc: {
    icon: "📘",
    label: "Word",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    border: "border-blue-200",
    bubbleBgMe: "bg-blue-950/40 border-blue-400/30",
    bubbleBgOther: "bg-blue-50/80 border-blue-200",
  },
  excel: {
    icon: "📊",
    label: "Excel",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    border: "border-emerald-200",
    bubbleBgMe: "bg-emerald-950/40 border-emerald-400/30",
    bubbleBgOther: "bg-emerald-50/80 border-emerald-200",
  },
  powerpoint: {
    icon: "📙",
    label: "PowerPoint",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    border: "border-amber-200",
    bubbleBgMe: "bg-amber-950/40 border-amber-400/30",
    bubbleBgOther: "bg-amber-50/80 border-amber-200",
  },
  image: {
    icon: "🖼️",
    label: "รูปภาพ",
    badgeBg: "bg-cyan-100",
    badgeText: "text-cyan-700",
    border: "border-cyan-200",
    bubbleBgMe: "bg-cyan-950/40 border-cyan-400/30",
    bubbleBgOther: "bg-cyan-50/80 border-cyan-200",
  },
  zip: {
    icon: "🗜️",
    label: "ZIP Archive",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    border: "border-purple-200",
    bubbleBgMe: "bg-purple-950/40 border-purple-400/30",
    bubbleBgOther: "bg-purple-50/80 border-purple-200",
  },
  video: {
    icon: "🎥",
    label: "Video",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-700",
    border: "border-violet-200",
    bubbleBgMe: "bg-violet-950/40 border-violet-400/30",
    bubbleBgOther: "bg-violet-50/80 border-violet-200",
  },
  audio: {
    icon: "🎵",
    label: "Audio",
    badgeBg: "bg-fuchsia-100",
    badgeText: "text-fuchsia-700",
    border: "border-fuchsia-200",
    bubbleBgMe: "bg-fuchsia-950/40 border-fuchsia-400/30",
    bubbleBgOther: "bg-fuchsia-50/80 border-fuchsia-200",
  },
  other: {
    icon: "📄",
    label: "ไฟล์แนบ",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
    border: "border-slate-200",
    bubbleBgMe: "bg-slate-800/40 border-slate-500/30",
    bubbleBgOther: "bg-slate-50 border-slate-200",
  },
};

export const GOVERNMENT_DOCUMENT_TEMPLATES = [
  {
    name: "บันทึกข้อความ_ขออนุมัติจัดโครงการสัมมนา2569.pdf",
    type: "pdf" as AttachmentType,
    size: "1.8 MB",
    category: "หนังสือราชการ / บันทึกข้อความ",
    description: "แบบฟอร์มบันทึกข้อความราชการมาตรฐาน พมจ.กำแพงเพชร",
  },
  {
    name: "ร่างคำสั่งจังหวัดกำแพงเพชร_แต่งตั้งคณะทำงาน.docx",
    type: "doc" as AttachmentType,
    size: "840 KB",
    category: "คำสั่ง / ระเบียบ",
    description: "เอกสาร Word ต้นแบบคำสั่งจังหวัดพร้อมตราครุฑ",
  },
  {
    name: "รายงานแผนงบประมาณและตัวชี้วัด_Q1_2569.xlsx",
    type: "excel" as AttachmentType,
    size: "620 KB",
    category: "งบประมาณ / สถิติ",
    description: "ตารางคำนวณสรุปการเบิกจ่ายงบประมาณรายไตรมาส",
  },
  {
    name: "สไลด์นำเสนอผลการดำเนินงาน_ตรวจราชการ.pptx",
    type: "powerpoint" as AttachmentType,
    size: "4.5 MB",
    category: "สไลด์นำเสนอ",
    description: "ชุดสไลด์สรุปผลงานสำคัญรอบ 6 เดือน",
  },
  {
    name: "ภาพถ่ายลงพื้นที่มอบถุงยังชีพผู้ประสบภัย.jpg",
    type: "image" as AttachmentType,
    size: "2.4 MB",
    category: "ภาพถ่ายกิจกรรม",
    description: "ภาพถ่ายความละเอียดสูงสำหรับงานประชาสัมพันธ์",
  },
  {
    name: "ชุดเอกสารหลักฐานประกอบการเบิกจ่าย_งวดที่1.zip",
    type: "zip" as AttachmentType,
    size: "5.8 MB",
    category: "แฟ้มรวบรวมหลักฐาน",
    description: "ไฟล์บีบอัดใบเสร็จและใบสำคัญรับเงินโครงการ",
  },
];

