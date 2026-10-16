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
  const activeMembers = availableMembers.filter(
    (m) => m.status === "active" || m.status === undefined
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

      // Match Specific Member IDs
      if (criteria.specificMemberIds && criteria.specificMemberIds.includes(member.id)) {
        isMatch = true;
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
 * Default Initial Circular Documents (Realistic Thai Government MSO Documents)
 */
export const INITIAL_CIRCULAR_DOCS: CircularDocument[] = [
  {
    id: "circ_2569_001",
    docNumber: "กพ ๐๐๓๒/ว ๔๕๒",
    title: "แนวทางการจัดสรรงบประมาณโครงการพัฒนาคุณภาพชีวิตผู้สูงอายุและคนพิการ ประจำปีงบประมาณ พ.ศ. ๒๕๖๙",
    issuedDate: "๑๐ ตุลาคม ๒๕๖๙",
    senderOrg: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    urgency: "urgent",
    secretLevel: "normal",
    summary:
      "แจ้งแนวทางปฏิบัติการเบิกจ่ายงบประมาณและหลักเกณฑ์การสนับสนุนเงินสงเคราะห์ครอบครัวคนพิการและผู้สูงอายุในภาวะยากลำบาก ประจำไตรมาสที่ ๑ ให้ทุกกลุ่มงานถือปฏิบัติโดยเคร่งครัด",
    fileUrl: "/virtual-office/circular_docs/budget_guideline_2569.pdf",
    fileName: "คำสั่งและแนวทางจัดสรรงบประมาณ_2569.pdf",
    fileSize: 1845000,
    totalPages: 3,
    createdBy: "usr_2",
    createdByName: "นายเสกพล ดิษฐโชติ",
    createdAt: "2026-10-10T08:30:00Z",
    deadline: "2026-10-25T16:30:00Z",
    targetCriteria: {
      scope: "all",
    },
    recipients: [
      {
        memberId: "usr_1",
        memberName: "นางสาวมะลิวัน สิทธิโยธี",
        division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
        personnelType: "ข้าราชการ",
        position: "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
        isAcknowledged: true,
        acknowledgedAt: "2026-10-10T09:15:20Z",
        endorsementNote: "รับทราบ มอบหมายฝ่ายบริหารทั่วไปและกลุ่มสวัสดิการฯ ประสานงานตามแผน",
      },
      {
        memberId: "usr_2",
        memberName: "นายเสกพล ดิษฐโชติ",
        division: "ฝ่ายบริหารทั่วไป",
        personnelType: "ข้าราชการ",
        position: "นักพัฒนาสังคมชำนาญการ",
        isAcknowledged: true,
        acknowledgedAt: "2026-10-10T08:35:10Z",
        endorsementNote: "รับทราบและดำเนินการเวียนแจ้งเจ้าหน้าที่",
      },
      {
        memberId: "usr_3",
        memberName: "นางอรวรรณ ศรีสุวรรณ",
        division: "กลุ่มนโยบายและวิชาการ",
        personnelType: "ข้าราชการ",
        position: "นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ",
        isAcknowledged: true,
        acknowledgedAt: "2026-10-11T10:45:00Z",
        endorsementNote: "รับทราบและเตรียมจัดทำกรอบตัวชี้วัด",
      },
      {
        memberId: "usr_4",
        memberName: "นายสมชาย เจริญสุข",
        division: "ศูนย์บริการคนพิการจังหวัด",
        personnelType: "พนักงานราชการ",
        position: "เจ้าพนักงานการเงินและบัญชีปฏิบัติงาน",
        isAcknowledged: false,
      },
      {
        memberId: "usr_5",
        memberName: "นางสาวกาญจนา สดใส",
        division: "ฝ่ายบริหารทั่วไป",
        personnelType: "พนักงานจ้างเหมาบริการ",
        position: "เจ้าหน้าที่ธุรการ",
        isAcknowledged: true,
        acknowledgedAt: "2026-10-12T13:20:11Z",
      },
      {
        memberId: "usr_6",
        memberName: "นายธีระศักดิ์ มณีโชติ",
        division: "กลุ่มการคุ้มครองคนไร้ที่พึ่ง",
        personnelType: "พนักงานกองทุน",
        position: "นักพัฒนาสังคม",
        isAcknowledged: false,
      },
    ],
    totalCount: 6,
    acknowledgedCount: 4,
    status: "active",
  },
  {
    id: "circ_2569_002",
    docNumber: "กพ ๐๐๓๒/ว ๔๙๘",
    title: "มาตรการความปลอดภัยการใช้งานระบบสารสนเทศและการคุ้มครองข้อมูลส่วนบุคคล (PDPA) สำนักงาน พมจ.กำแพงเพชร",
    issuedDate: "๑๔ ตุลาคม ๒๕๖๙",
    senderOrg: "กลุ่มนโยบายและวิชาการ (งานเทคโนโลยีสารสนเทศ)",
    urgency: "very_urgent",
    secretLevel: "normal",
    summary:
      "ขอให้ข้าราชการ พนักงานราชการ และเจ้าหน้าที่ทุกคน ปฏิบัติตามแนวทางการเข้าใช้งานเครือข่ายความปลอดภัย Zero Trust และห้ามส่งต่อข้อมูลส่วนบุคคลของกลุ่มเปราะบางออกภายนอกโดยไม่ได้รับอนุญาต",
    fileUrl: "/virtual-office/circular_docs/pdpa_policy_2569.pdf",
    fileName: "มาตรการความปลอดภัยและPDPA_พมจ_กพ.pdf",
    fileSize: 2420000,
    totalPages: 5,
    createdBy: "usr_1",
    createdByName: "นางสาวมะลิวัน สิทธิโยธี",
    createdAt: "2026-10-14T09:00:00Z",
    deadline: "2026-10-20T16:30:00Z",
    targetCriteria: {
      scope: "custom",
      personnelTypes: ["ข้าราชการ", "พนักงานราชการ"],
    },
    recipients: [
      {
        memberId: "usr_1",
        memberName: "นางสาวมะลิวัน สิทธิโยธี",
        division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
        personnelType: "ข้าราชการ",
        position: "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
        isAcknowledged: true,
        acknowledgedAt: "2026-10-14T09:10:00Z",
        endorsementNote: "รับทราบและอนุมัติประกาศใช้เป็นแนวปฏิบัติประจำสำนักงาน",
      },
      {
        memberId: "usr_2",
        memberName: "นายเสกพล ดิษฐโชติ",
        division: "ฝ่ายบริหารทั่วไป",
        personnelType: "ข้าราชการ",
        position: "นักพัฒนาสังคมชำนาญการ",
        isAcknowledged: true,
        acknowledgedAt: "2026-10-14T11:00:00Z",
        endorsementNote: "รับทราบและกำชับเจ้าหน้าที่ในกำกับดูแล",
      },
      {
        memberId: "usr_3",
        memberName: "นางอรวรรณ ศรีสุวรรณ",
        division: "กลุ่มนโยบายและวิชาการ",
        personnelType: "ข้าราชการ",
        position: "นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ",
        isAcknowledged: false,
      },
      {
        memberId: "usr_4",
        memberName: "นายสมชาย เจริญสุข",
        division: "ศูนย์บริการคนพิการจังหวัด",
        personnelType: "พนักงานราชการ",
        position: "เจ้าพนักงานการเงินและบัญชีปฏิบัติงาน",
        isAcknowledged: false,
      },
    ],
    totalCount: 4,
    acknowledgedCount: 2,
    status: "active",
  },
];

/**
 * Load circular documents from local cache or initial
 */
export function loadStoredCircularDocs(): CircularDocument[] {
  if (typeof window === "undefined") return INITIAL_CIRCULAR_DOCS;
  try {
    const raw = localStorage.getItem(CIRCULAR_STORAGE_KEY);
    if (!raw) return INITIAL_CIRCULAR_DOCS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_CIRCULAR_DOCS;
  } catch {
    return INITIAL_CIRCULAR_DOCS;
  }
}

/**
 * Save circular documents to local cache
 */
export function saveStoredCircularDocs(docs: CircularDocument[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CIRCULAR_STORAGE_KEY, JSON.stringify(docs));
  } catch (err) {
    console.error("Failed to save circular docs to storage:", err);
  }
}
