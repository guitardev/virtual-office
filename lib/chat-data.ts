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
    createdBy: "usr_1",
  },
  {
    id: "ch_executive",
    name: "คณะกรรมการบริหารสำนักงาน",
    description: "ห้องประชุมปรึกษาข้อราชการเร่งด่วนสำหรับ พมจ. และหัวหน้ากลุ่ม/ฝ่าย",
    icon: "👑",
    type: "division",
    division: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)",
    isOfficial: true,
    memberIds: ["usr_1", "usr_2", "usr_3", "usr_4"],
    createdAt: "1 ต.ค. 2569",
    createdBy: "usr_1",
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
    createdBy: "usr_1",
  },
  {
    id: "ch_advisors",
    name: "คณะทำงานที่ปรึกษาและภาคีเครือข่าย",
    description: "ประสานงานร่วมกับผู้ทรงคุณวุฒิ คณะอนุกรรมการ และภาคประชาสังคม",
    icon: "🎓",
    type: "division",
    division: "คณะทำงานที่ปรึกษาและภาคีเครือข่ายภายนอก",
    isOfficial: true,
    memberIds: ["usr_11", "usr_1", "usr_3"],
    createdAt: "1 ต.ค. 2569",
    createdBy: "usr_1",
  },
  {
    id: "ch_project_disability_day",
    name: "คณะทำงานจัดงานวันคนพิการสากล 2569",
    description: "กลุ่มโครงการเฉพาะกิจ: วางแผนจัดกิจกรรมมอบโล่ประกาศเกียรติคุณและนิทรรศการ",
    icon: "🌟",
    type: "custom",
    isOfficial: false,
    memberIds: ["usr_1", "usr_2", "usr_3", "usr_6", "usr_7"],
    createdAt: "5 ต.ค. 2569",
    createdBy: "usr_6",
  },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  // ─── ALL STAFF ANNOUNCEMENTS ───
  {
    id: "msg_all_1",
    groupId: "ch_all_staff",
    senderId: "usr_1",
    senderName: "นางสาวมะลิวัน สิทธิโยธี",
    senderRole: "admin",
    senderPosition: "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    senderDivision: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)",
    text: "เรียน ข้าราชการและเจ้าหน้าที่ทุกท่าน โปรดตรวจสอบคำสั่งจังหวัดเรื่องการมอบหมายภารกิจลงพื้นที่ตรวจราชการประจำเดือนตุลาคม และรายงานผลผ่านระบบ Virtual Office ครับ",
    timestamp: "วันนี้ 08:45 น.",
    isPinned: true,
    tag: "หนังสือเวียน",
    attachmentName: "คำสั่งจังหวัด_ที่_1422_2569_มอบหมายภารกิจ.pdf",
    attachmentType: "pdf",
    attachmentSize: "2.4 MB",
  },
  {
    id: "msg_all_2",
    groupId: "ch_all_staff",
    senderId: "usr_2",
    senderName: "นายเสกพล ดิษฐโชติ",
    senderRole: "manager",
    senderPosition: "หัวหน้าฝ่ายบริหารทั่วไป",
    senderDivision: "ฝ่ายบริหารทั่วไป",
    text: "ฝ่ายบริหารทั่วไปรับทราบครับ ได้ดำเนินการเวียนหนังสือและลงตารางการใช้ยานพาหนะส่วนกลางในระบบเรียบร้อยแล้วครับ",
    timestamp: "วันนี้ 09:10 น.",
  },
  {
    id: "msg_all_3",
    groupId: "ch_all_staff",
    senderId: "usr_4",
    senderName: "นายพนมศักย์ บริภัทรจิรากร",
    senderRole: "manager",
    senderPosition: "รักษาการหัวหน้ากลุ่มนโยบายและวิชาการ",
    senderDivision: "กลุ่มนโยบายและวิชาการ",
    text: "กลุ่มนโยบายฯ กำลังจัดเตรียมสรุปข้อมูลตัวชี้วัดความยากจนรายอำเภอเพื่อประกอบการลงพื้นที่ครับ",
    timestamp: "วันนี้ 09:25 น.",
  },

  // ─── GENERAL ADMIN CHAT ───
  {
    id: "msg_adm_1",
    groupId: "ch_general_admin",
    senderId: "usr_2",
    senderName: "นายเสกพล ดิษฐโชติ",
    senderRole: "manager",
    senderPosition: "หัวหน้าฝ่ายบริหารทั่วไป",
    senderDivision: "ฝ่ายบริหารทั่วไป",
    text: "คุณดาว (อารีวรรณ) เอกสารเบิกจ่ายค่าน้ำมันเชื้อเพลิงและเบี้ยเลี้ยงลงพื้นที่ของสัปดาห์ก่อน จัดทำฎีกาเบิกเรียบร้อยหรือยังครับ?",
    timestamp: "เมื่อวาน 14:10 น.",
  },
  {
    id: "msg_adm_2",
    groupId: "ch_general_admin",
    senderId: "usr_8",
    senderName: "นางสาวอารีวรรณ ประเสริฐอุดมศักดิ์",
    senderRole: "member",
    senderPosition: "เจ้าพนักงานการเงินและบัญชีชำนาญงาน",
    senderDivision: "ฝ่ายบริหารทั่วไป",
    text: "เรียบร้อยค่ะหัวหน้าเสก ได้ส่งให้ฝ่ายคลังตรวจสอบแล้ว คาดว่าจะได้รับโอนเงินตามรอบภายในวันศุกร์นี้ค่ะ",
    timestamp: "เมื่อวาน 14:25 น.",
    tag: "รายงานการเงิน",
  },
  {
    id: "msg_adm_3",
    groupId: "ch_general_admin",
    senderId: "usr_9",
    senderName: "นายสมหมาย มั่นคง",
    senderRole: "member",
    senderPosition: "พนักงานขับรถยนต์ ชำนาญงาน",
    senderDivision: "ฝ่ายบริหารทั่วไป",
    text: "รถตู้ นข 4589 กำแพงเพชร นำเข้าศูนย์เปลี่ยนถ่ายน้ำมันเครื่องและตรวจสภาพเบรกเรียบร้อย พร้อมใช้งานเต็มระบบครับ",
    timestamp: "วันนี้ 08:15 น.",
  },

  // ─── POLICY & PLANNING CHAT ───
  {
    id: "msg_pol_1",
    groupId: "ch_policy_planning",
    senderId: "usr_4",
    senderName: "นายพนมศักย์ บริภัทรจิรากร",
    senderRole: "manager",
    senderPosition: "รักษาการหัวหน้ากลุ่มนโยบายและวิชาการ",
    senderDivision: "กลุ่มนโยบายและวิชาการ",
    text: "น้องขวัญ ช่วยดึงข้อมูลสถิติผู้สูงอายุและคนพิการที่ลงทะเบียนในระบบ พม. Smart ของ อ.คลองลาน เพื่อนำมาพล็อตกราฟรายงานส่งกระทรวงหน่อยครับ",
    timestamp: "เมื่อวาน 10:30 น.",
  },
  {
    id: "msg_pol_2",
    groupId: "ch_policy_planning",
    senderId: "usr_5",
    senderName: "นางสาวขวัญนภา ศิริสมบัติ",
    senderRole: "member",
    senderPosition: "เจ้าหน้าที่ระบบงานคอมพิวเตอร์",
    senderDivision: "กลุ่มนโยบายและวิชาการ",
    text: "ดึงข้อมูลและคลีนข้อมูลเรียบร้อยแล้วค่ะพี่พนม ส่งไฟล์สรุป Excel ไว้ในระบบให้แล้วนะคะ",
    timestamp: "เมื่อวาน 11:45 น.",
    attachmentName: "สรุปสถิติกลุ่มเปราะบาง_คลองลาน_2569.xlsx",
    attachmentType: "doc",
    attachmentSize: "1.1 MB",
  },

  // ─── SOCIAL DEVELOPMENT CHAT ───
  {
    id: "msg_soc_1",
    groupId: "ch_social_dev",
    senderId: "usr_3",
    senderName: "นายวรวุฒิ พึ่งพัก",
    senderRole: "manager",
    senderPosition: "หัวหน้ากลุ่มการพัฒนาสังคมและสวัสดิการ",
    senderDivision: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    text: "คุณพิชชาภา เคสขอรับเงินสงเคราะห์ครอบครัวผู้มีรายได้น้อยและผู้ไร้ที่พึ่ง ต.สลกบาตร ดำเนินการลงพื้นที่เยี่ยมบ้านเสร็จเรียบร้อยหรือยังครับ?",
    timestamp: "วันนี้ 09:30 น.",
  },
  {
    id: "msg_soc_2",
    groupId: "ch_social_dev",
    senderId: "usr_7",
    senderName: "นางสาวพิชชาภา ห้าวหาญ",
    senderRole: "member",
    senderPosition: "นักสังคมสงเคราะห์ปฏิบัติการ",
    senderDivision: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    text: "ลงพื้นที่ร่วมกับ อพม. เรียบร้อยแล้วค่ะ สภาพบ้านทรุดโทรมและผู้สูงอายุมีภาวะติดเตียง กำลังเร่งทำรายงานเสนอคณะกรรมการพิจารณาเงินสงเคราะห์ค่ะ",
    timestamp: "วันนี้ 10:05 น.",
    tag: "เคสสังคมสงเคราะห์",
  },
];

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
      // All staff group contains everyone
      return {
        ...group,
        memberIds: Array.from(new Set([...allMembers.map((m) => m.id), ...group.memberIds])),
      };
    }

    if (group.id === "ch_executive") {
      // Executive group includes Admin and all Managers
      const execIds = allMembers
        .filter((m) => m.role === "admin" || m.role === "manager")
        .map((m) => m.id);
      return {
        ...group,
        memberIds: Array.from(new Set([...execIds, ...group.memberIds])),
      };
    }

    if (group.type === "division" && group.division) {
      // Find all members belonging to this division
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
        // Merge with any missing default official groups
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
  if (typeof window === "undefined") return INITIAL_CHAT_MESSAGES;

  try {
    const raw = localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(INITIAL_CHAT_MESSAGES));
      return INITIAL_CHAT_MESSAGES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CHAT_MESSAGES;
  } catch (err) {
    console.error("Failed to load chat messages:", err);
    return INITIAL_CHAT_MESSAGES;
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
