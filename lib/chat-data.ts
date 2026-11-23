import { AttachmentType, ChatGroup, Member } from "./types";

const LEGACY_CHAT_STORAGE_KEYS = [
  "smartmso_chat_groups_v3",
  "smartmso_chat_groups_v2",
  "omnioffice_chat_groups_v2",
  "smartmso_chat_messages_v2",
  "omnioffice_chat_messages_v2",
];

/**
 * Remove any legacy cached/mock chat data from browser localStorage so only live Supabase data is used
 */
export function clearLegacyChatLocalStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_CHAT_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore storage errors
    }
  }
}

/**
 * Filter out legacy mock usr_ IDs (usr_mock, usr_1..usr_9999, usr_head_*)
 */
function isNotMockUserId(id: string): boolean {
  if (!id) return false;
  return !/^usr_(\d{1,4}|mock|head_.*)$/.test(id);
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

/**
 * คำนวณรายชื่อสมาชิกจริงของกลุ่ม โดยรวมทั้ง explicit memberIds และสมาชิกตามกลุ่มงานราชการ
 */
export function getGroupMembers(group: ChatGroup, allMembers: Member[]): Member[] {
  return allMembers.filter((m) => {
    const isExplicit = Array.isArray(group.memberIds) && group.memberIds.includes(m.id);
    const isDivision = Boolean(
      group.isOfficial &&
      group.division &&
      m.division &&
      (m.division === group.division ||
        m.division.includes(group.division) ||
        group.division.includes(m.division))
    );
    const isAllStaff = group.id === "ch_all_staff";
    const isExecutive =
      group.id === "ch_executive" && (m.role === "admin" || m.role === "manager");
    return isExplicit || isDivision || isAllStaff || isExecutive;
  });
}

