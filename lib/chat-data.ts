import { ChatGroup, ChatMessage, Member } from "./types";
import { INITIAL_MEMBERS } from "./rbac";

export const DEFAULT_CHAT_GROUPS: ChatGroup[] = [
  {
    id: "ch_all_staff",
    name: "ประกาศและประสานงานกลาง พมจ.",
    description: "ห้องสื่อสารและประสานงานภารกิจส่วนกลาง รวมข้าราชการและเจ้าหน้าที่ทุกกลุ่มงาน",
    icon: "🏢",
    type: "announcement",
    isOfficial: true,
    memberIds: INITIAL_MEMBERS.map((m) => m.id),
    createdAt: "1 ต.ค. 2569",
    createdBy: "usr_2",
  },
  {
    id: "ch_executive",
    name: "คณะกรรมการบริหารสำนักงาน",
    description: "ห้องประชุมปรึกษาข้อราชการเร่งด่วนสำหรับ พมจ. และหัวหน้ากลุ่ม/ฝ่าย",
    icon: "👑",
    type: "division",
    division: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)",
    isOfficial: true,
    memberIds: ["usr_2", "usr_3", "usr_4"],
    createdAt: "1 ต.ค. 2569",
    createdBy: "usr_2",
  },
  {
    id: "ch_general_admin",
    name: "ฝ่ายบริหารทั่วไป",
    description: "งานสารบรรณ การเงินและบัญชี ยานพาหนะ พัสดุ และการบริหารงานบุคคล",
    icon: "📁",
    type: "division",
    division: "ฝ่ายบริหารทั่วไป",
    isOfficial: true,
    memberIds: ["usr_2", "usr_8", "usr_9", "usr_10"],
    createdAt: "1 ต.ค. 2569",
    createdBy: "usr_2",
  },
  {
    id: "ch_policy_planning",
    name: "กลุ่มนโยบายและวิชาการ",
    description: "จัดทำแผนยุทธศาสตร์ ข้อมูลสารสนเทศ สถิติสังคม และติดตามประเมินผลโครงการ",
    icon: "📊",
    type: "division",
    division: "กลุ่มนโยบายและวิชาการ",
    isOfficial: true,
    memberIds: ["usr_4", "usr_5"],
    createdAt: "1 ต.ค. 2569",
    createdBy: "usr_4",
  },
  {
    id: "ch_social_dev",
    name: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    description: "การช่วยเหลือผู้ประสบปัญหาทางสังคม เด็ก สตรี ผู้สูงอายุ และกลุ่มเปราะบาง",
    icon: "🤝",
    type: "division",
    division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    isOfficial: true,
    memberIds: ["usr_3", "usr_7"],
    createdAt: "1 ต.ค. 2569",
    createdBy: "usr_3",
  },
  {
    id: "ch_disability_center",
    name: "ศูนย์บริการคนพิการจังหวัด",
    description: "การออกบัตรประจำตัวคนพิการ กองทุนส่งเสริมและฟื้นฟูสมรรถภาพคนพิการ",
    icon: "♿",
    type: "division",
    division: "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
    isOfficial: true,
    memberIds: ["usr_6"],
    createdAt: "1 ต.ค. 2569",
    createdBy: "usr_2",
  },
  {
    id: "ch_advisors",
    name: "คณะทำงานที่ปรึกษาและภาคีเครือข่าย",
    description: "ประสานงานร่วมกับผู้ทรงคุณวุฒิ คณะอนุกรรมการ และภาคประชาสังคม",
    icon: "🎓",
    type: "division",
    division: "คณะทำงานที่ปรึกษาและภาคีเครือข่ายภายนอก",
    isOfficial: true,
    memberIds: ["usr_11", "usr_3"],
    createdAt: "1 ต.ค. 2569",
    createdBy: "usr_2",
  },
  {
    id: "ch_project_disability_day",
    name: "คณะทำงานจัดงานวันคนพิการสากล 2569",
    description: "กลุ่มโครงการเฉพาะกิจ: วางแผนจัดกิจกรรมมอบโล่ประกาศเกียรติคุณและนิทรรศการ",
    icon: "🌟",
    type: "custom",
    isOfficial: false,
    memberIds: ["usr_2", "usr_3", "usr_6", "usr_7"],
    createdAt: "5 ต.ค. 2569",
    createdBy: "usr_6",
  },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

const CHAT_GROUPS_STORAGE_KEY = "omnioffice_chat_groups_v2";
const CHAT_MESSAGES_STORAGE_KEY = "omnioffice_chat_messages_v2";

/**
 * Synchronize group members based on members' office division
 */
export function syncDivisionGroupMembers(
  groups: ChatGroup[],
  allMembers: Member[]
): ChatGroup[] {
  return groups.map((group) => {
    if (group.id === "ch_all_staff") {
      return {
        ...group,
        memberIds: Array.from(new Set([...allMembers.map((m) => m.id), ...group.memberIds])),
      };
    }

    if (group.id === "ch_executive") {
      const execIds = allMembers
        .filter((m) => m.role === "admin" || m.role === "manager")
        .map((m) => m.id);
      return {
        ...group,
        memberIds: Array.from(new Set([...execIds, ...group.memberIds])),
      };
    }

    if (group.type === "division" && group.division) {
      const divisionMemberIds = allMembers
        .filter((m) => m.division === group.division)
        .map((m) => m.id);

      return {
        ...group,
        memberIds: Array.from(new Set([...divisionMemberIds, ...group.memberIds])),
      };
    }

    return group;
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
    const raw = localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);
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
    console.error("Failed to save chat messages:", err);
  }
}
