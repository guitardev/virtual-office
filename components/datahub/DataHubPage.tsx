"use client";

import React, { useState, useMemo } from "react";
import { Member } from "@/lib/types";
import {
  KAMPHAENG_PHET_DISTRICTS,
  DistrictSocialStat,
  getSocialStatsByYear,
  calculateProvinceTotals,
  exportSocialStatsToCsv,
} from "@/lib/social-statistics";
import { SocialStatisticsReportModal } from "./SocialStatisticsReportModal";
import { OfficialOrdersPanel } from "./OfficialOrdersPanel";
import { isRealMember, isSystemServiceAccount } from "@/lib/supabase";
import {
  KPP_MSO_LOGBOOK,
  MSO_VULNERABILITY_LEVELS,
  getKppDimensionSummaries,
} from "@/lib/mso-logbook-kpp";

interface DataHubPageProps {
  currentUser: Member;
  showToast: (msg: string) => void;
  members?: Member[];
}

export interface MissionGroup {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  headName: string;
  headPosition: string;
  description: string;
  metrics: { label: string; value: string; change?: string; icon: string }[];
  documents: { id: string; title: string; category: string; type: string; size: string; date: string; url?: string }[];
  systems: { name: string; desc: string; url: string; badge: string; icon: string }[];
}

export const MISSION_GROUPS: MissionGroup[] = [
  {
    id: "admin",
    name: "ฝ่ายบริหารทั่วไป",
    shortName: "บริหารทั่วไป",
    icon: "🏛️",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    headName: "",
    headPosition: "",
    description: "รับผิดชอบงานสารบรรณ งานยานพาหนะ งานอาคารสถานที่ งานการเงิน บัญชี พัสดุ และงานประชาสัมพันธ์องค์กร",
    metrics: [
      { label: "หนังสือรับ-ส่งประจำปี", value: "3,420 ฉบับ", change: "+12% จากปีก่อน", icon: "📜" },
      { label: "การใช้ยานพาหนะราชการ", value: "185 ภารกิจ", change: "เฉลี่ย 1.8 เที่ยว/วัน", icon: "🚗" },
      { label: "การเบิกจ่ายงบประมาณ", value: "88.4%", change: "ตามเป้าหมาย Q4", icon: "💰" },
      { label: "ห้องประชุมและสถานที่", value: "6 ห้อง", change: "พร้อมใช้งาน 100%", icon: "🏢" },
    ],
    documents: [
      { id: "doc_1", title: "แบบฟอร์มขอใช้รถยนต์ราชการ (กพพ. 01)", category: "ยานพาหนะ", type: "DOCX", size: "145 KB", date: "4 พ.ย. 2569" },
      { id: "doc_2", title: "ระเบียบการเบิกจ่ายเงินค่าใช้จ่ายในการเดินทางไปราชการ", category: "การเงิน", type: "PDF", size: "2.4 MB", date: "15 ต.ค. 2569" },
      { id: "doc_3", title: "แบบคำขอหนังสือรับรองเงินเดือนและสิทธิการรักษาพยาบาล", category: "บุคคล", type: "PDF", size: "320 KB", date: "1 ต.ค. 2569" },
      { id: "doc_4", title: "แผนผังการบริหารอาคารและมาตรการประหยัดพลังงาน พ.ศ. 2569", category: "อาคาร", type: "PDF", size: "1.8 MB", date: "20 ส.ค. 2569" },
    ],
    systems: [
      { name: "ระบบ e-GP (กรมบัญชีกลาง)", desc: "ระบบการจัดซื้อจัดจ้างภาครัฐด้วยอิเล็กทรอนิกส์", url: "https://www.gprocurement.go.th", badge: "จัดซื้อจัดจ้าง", icon: "💼" },
      { name: "ระบบ GFMIS Web Online", desc: "ระบบบริหารการเงินการคลังภาครัฐแบบอิเล็กทรอนิกส์", url: "https://gfmis.mof.go.th", badge: "การเงิน/งบประมาณ", icon: "💳" },
      { name: "ระบบสารบรรณอิเล็กทรอนิกส์ พม.", desc: "ระบบรับส่งหนังสือราชการสารสนเทศ พม.", url: "https://edoc.m-society.go.th", badge: "สารบรรณ", icon: "📨" },
    ],
  },
  {
    id: "policy",
    name: "กลุ่มนโยบายและวิชาการ",
    shortName: "นโยบายและวิชาการ",
    icon: "📊",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    headName: "",
    headPosition: "",
    description: "จัดทำแผนปฏิบัติราชการ แผนพัฒนาสังคม ติดตามประเมินผลตัวชี้วัด และรวบรวมข้อมูลสถานการณ์ทางสังคมระดับจังหวัด",
    metrics: [
      { label: "ความสำเร็จตัวชี้วัด (KPI)", value: "94.2%", change: "ระดับดีเยี่ยม", icon: "🎯" },
      { label: "โครงการตามแผนปฏิบัติการ", value: "28 โครงการ", change: "ดำเนินการแล้ว 24", icon: "📋" },
      { label: "รายงานสถานการณ์ทางสังคม", value: "4 ไตรมาส", change: "เผยแพร่ครบถ้วน", icon: "📑" },
      { label: "ดัชนีความมั่นคงของมนุษย์ (HSI)", value: "0.784", change: "+0.03 ระดับสูง", icon: "📈" },
    ],
    documents: [
      { id: "doc_5", title: "แผนปฏิบัติการด้านการพัฒนาสังคมจังหวัดกำแพงเพชร พ.ศ. 2569-2570", category: "แผนงาน", type: "PDF", size: "8.6 MB", date: "28 ต.ค. 2569" },
      { id: "doc_6", title: "รายงานสถานการณ์ทางสังคมจังหวัดกำแพงเพชร ประจำปี 2569", category: "สถิติ/วิชาการ", type: "PDF", size: "12.4 MB", date: "15 ต.ค. 2569" },
      { id: "doc_7", title: "คู่มือตัวชี้วัดการประเมินผลการปฏิบัติราชการ (คำรับรองฯ)", category: "KPI", type: "PDF", size: "3.2 MB", date: "1 ต.ค. 2569" },
      { id: "doc_8", title: "แบบฟอร์มรายงานผลการดำเนินงานรายไตรมาส (e-Report)", category: "แบบฟอร์ม", type: "XLSX", size: "480 KB", date: "18 ก.ย. 2569" },
    ],
    systems: [
      { name: "ระบบ TPMAP (ศจพ.)", desc: "ระบบบริหารจัดการข้อมูลการพัฒนาคนแบบชี้เป้า", url: "https://www.tpmap.in.th", badge: "ยากจนชี้เป้า", icon: "🎯" },
      { name: "ศูนย์ข้อมูลสารสนเทศ พม. (MSOC)", desc: "สถิติและข้อมูลสารสนเทศด้านการพัฒนาสังคมแห่งชาติ", url: "https://msoc.m-society.go.th", badge: "คลังสถิติ", icon: "📈" },
      { name: "ระบบ e-Monitoring", desc: "ระบบติดตามและประเมินผลโครงการภาครัฐ", url: "https://emonitoring.m-society.go.th", badge: "ติดตามผล", icon: "⏱️" },
    ],
  },
  {
    id: "welfare",
    name: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    shortName: "สังคมและสวัสดิการ",
    icon: "🤝",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    headName: "",
    headPosition: "",
    description: "ขับเคลื่อนงานสวัสดิการสังคม กองทุนสวัสดิการชุมชน คุ้มครองเด็ก เยาวชน สตรี ผู้สูงอายุ และครอบครัวเปราะบาง",
    metrics: [
      { label: "กองทุนสวัสดิการชุมชน", value: "84 ตำบล", change: "ครอบคลุม 94.3%", icon: "🏘️" },
      { label: "ผู้ได้รับการสงเคราะห์", value: "2,150 ราย", change: "เบิกจ่ายงบครบ 100%", icon: "🤲" },
      { label: "สภาเด็กและเยาวชน", value: "11 อำเภอ", change: "มีกิจกรรมต่อเนื่อง", icon: "🌱" },
      { label: "ครอบครัวเปราะบางเป้าหมาย", value: "1,420 ครัวเรือน", change: "ช่วยเหลือแล้ว 92%", icon: "👨‍👩‍👧" },
    ],
    documents: [
      { id: "doc_9", title: "แนวทางการพิจารณาเงินสงเคราะห์ผู้มีรายได้น้อยและครอบครัวเปราะบาง", category: "ระเบียบ", type: "PDF", size: "1.9 MB", date: "30 ต.ค. 2569" },
      { id: "doc_10", title: "แบบคำขอรับการช่วยเหลือเงินสงเคราะห์ครอบครัว (แบบ พม. 01)", category: "แบบฟอร์ม", type: "DOCX", size: "210 KB", date: "22 ต.ค. 2569" },
      { id: "doc_11", title: "คู่มือการดำเนินงานสภาเด็กและเยาวชนจังหวัดกำแพงเพชร", category: "คู่มือ", type: "PDF", size: "4.1 MB", date: "10 ก.ย. 2569" },
      { id: "doc_12", title: "สารบบเครือข่ายศูนย์ช่วยเหลือสังคมตำบล 84 ตำบล", category: "เครือข่าย", type: "XLSX", size: "850 KB", date: "15 ส.ค. 2569" },
    ],
    systems: [
      { name: "ระบบ e-Social (ระบบเงินสงเคราะห์)", desc: "ระบบจ่ายเงินสงเคราะห์และสวัสดิการสังคมอิเล็กทรอนิกส์", url: "https://esocial.m-society.go.th", badge: "เงินสงเคราะห์", icon: "💳" },
      { name: "ระบบสมุดพกครอบครัวอิเล็กทรอนิกส์ (MSO-Logbook)", desc: "ระบบบันทึกและติดตามสภาพปัญหารายครัวเรือน", url: "https://logbook.m-society.go.th", badge: "ครอบครัวเปราะบาง", icon: "📖" },
      { name: "ศูนย์ช่วยเหลือสังคม สายด่วน 1300", desc: "ระบบรับเรื่องราวร้องทุกข์และให้ความช่วยเหลือเร่งด่วน 24 ชม.", url: "https://1300.m-society.go.th", badge: "สายด่วน 1300", icon: "📞" },
    ],
  },
  {
    id: "pwd",
    name: "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
    shortName: "ศูนย์คนพิการ (พก.)",
    icon: "♿",
    color: "text-teal-700",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    headName: "",
    headPosition: "",
    description: "ออกบัตรประจำตัวคนพิการ จัดสรรกายอุปกรณ์ บริหารกองทุนส่งเสริมและพัฒนาคุณภาพชีวิตคนพิการ และสนับสนุนศูนย์บริการทั่วไป",
    metrics: [
      { label: "คนพิการที่จดทะเบียน", value: "24,850 คน", change: "มีบัตรครบ 100%", icon: "🪪" },
      { label: "เงินกู้ยืมประกอบอาชีพ", value: "14.2 ลบ.", change: "อนุมัติ 285 ราย", icon: "💼" },
      { label: "กายอุปกรณ์และผู้ช่วย", value: "620 ชุด", change: "ส่งมอบแล้ว 100%", icon: "🦽" },
      { label: "ศูนย์บริการคนพิการชุมชน", value: "32 แห่ง", change: "ครอบคลุม 11 อำเภอ", icon: "🏛️" },
    ],
    documents: [
      { id: "doc_13", title: "คู่มือสิทธิและสวัสดิการคนพิการจังหวัดกำแพงเพชร ฉบับปรับปรุง 2569", category: "คู่มือ", type: "PDF", size: "5.4 MB", date: "1 พ.ย. 2569" },
      { id: "doc_14", title: "แบบคำขอกู้ยืมเงินทุนประกอบอาชีพสำหรับคนพิการและผู้ดูแล", category: "กองทุน พก.", type: "DOCX", size: "380 KB", date: "24 ต.ค. 2569" },
      { id: "doc_15", title: "แบบประเมินความต้องการกายอุปกรณ์และเครื่องช่วยความพิการ", category: "กายอุปกรณ์", type: "PDF", size: "420 KB", date: "12 ต.ค. 2569" },
      { id: "doc_16", title: "เกณฑ์การขอรับบริการผู้ช่วยคนพิการ (Personal Assistant)", category: "ระเบียบ", type: "PDF", size: "1.2 MB", date: "5 ก.ย. 2569" },
    ],
    systems: [
      { name: "ระบบ DEP Information System (พก.)", desc: "ฐานข้อมูลสารสนเทศคนพิการระดับชาติ กรมส่งเสริมและพัฒนาคุณภาพชีวิตคนพิการ", url: "https://dep.go.th", badge: "ฐานข้อมูลคนพิการ", icon: "♿" },
      { name: "ระบบกู้ยืมเงินกองทุน พก. ออนไลน์", desc: "ยื่นคำขอกู้ยืมเงินประกอบอาชีพสำหรับคนพิการและผู้ดูแล", url: "https://efund.dep.go.th", badge: "กองทุนกู้ยืม", icon: "💰" },
      { name: "ระบบบัตรประจำตัวคนพิการดิจิทัล (D-Card)", desc: "ระบบออกบัตรและตรวจสอบสถานะบัตรคนพิการทางอิเล็กทรอนิกส์", url: "https://d-card.dep.go.th", badge: "บัตรคนพิการ", icon: "🪪" },
    ],
  },
];

export function DataHubPage({ currentUser, showToast, members = [] }: DataHubPageProps) {
  // Main Tab Navigation: stats, divisions, personnel, documents, orders
  const [activeMainTab, setActiveMainTab] = useState<"stats" | "divisions" | "personnel" | "documents" | "orders">("stats");

  // Social Statistics Filters & Export State
  const [fiscalYear, setFiscalYear] = useState<string>("2569");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Division Groups State
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Personnel Directory State
  const [personnelSearch, setPersonnelSearch] = useState<string>("");
  const [personnelDivisionFilter, setPersonnelDivisionFilter] = useState<string>("all");

  // Social Stats Calculation
  const statsList = useMemo(() => {
    return getSocialStatsByYear(fiscalYear, districtFilter);
  }, [fiscalYear, districtFilter]);

  const provinceTotals = useMemo(() => {
    return calculateProvinceTotals(statsList);
  }, [statsList]);

  const msoDimensions = useMemo(() => getKppDimensionSummaries(), []);
  const msoNoplanTotal = useMemo(
    () => msoDimensions.reduce((sum, d) => sum + d.noplan, 0),
    [msoDimensions]
  );
  const msoLevel2Plus3 = KPP_MSO_LOGBOOK.main.lvls[2] + KPP_MSO_LOGBOOK.main.lvls[3];

  // Sanitized Contact Helpers (avoid showing placeholder "-", @nas.local synthetic accounts)
  const getDisplayNickname = (staff: Member): string | null => {
    const n = (staff.nickname || "").trim();
    return n && n !== "-" ? n : null;
  };

  const getDisplayPhone = (staff: Member): string | null => {
    const p = (staff.phone || "").trim();
    return p && p !== "-" ? p : null;
  };

  const getDisplayEmail = (staff: Member): string | null => {
    const e = (staff.email || "").trim();
    if (!e || e === "-" || e.toLowerCase().endsWith("@nas.local")) return null;
    return e;
  };

  const getDisplayLineId = (staff: Member): string | null => {
    const l = (staff.lineId || "").trim();
    return l && l !== "-" ? l : null;
  };

  // Real personnel directory sourced exclusively from Supabase `public.users`
  const directoryMembers = useMemo(() => {
    const divisionRank = (div?: string) => {
      if (!div) return 99;
      if (div.includes("ผู้บริหาร")) return 0;
      if (div.includes("ฝ่ายบริหารทั่วไป")) return 1;
      if (div.includes("กลุ่มนโยบายและวิชาการ")) return 2;
      if (div.includes("กลุ่มการพัฒนาสังคมและสวัสดิการ")) return 3;
      if (div.includes("ศูนย์บริการคนพิการ")) return 4;
      if (div.includes("รอกำหนดกลุ่มงาน")) return 98;
      return 50;
    };

    return (members || [])
      .filter((m) => isRealMember(m) && !isSystemServiceAccount(m) && m.status !== "inactive")
      .sort((a, b) => {
        const divDiff = divisionRank(a.division) - divisionRank(b.division);
        if (divDiff !== 0) return divDiff;
        const rankA = a.role === "manager" || a.position?.includes("หัวหน้า") ? 0 : 1;
        const rankB = b.role === "manager" || b.position?.includes("หัวหน้า") ? 0 : 1;
        if (rankA !== rankB) return rankA - rankB;
        return (a.name || "").localeCompare(b.name || "", "th");
      });
  }, [members]);

  // Dynamic Provincial Director from Supabase
  const provincialDirector = useMemo(() => {
    return (
      directoryMembers.find(
        (m) =>
          m.position?.includes("พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัด") ||
          m.division?.includes("ผู้บริหาร")
      ) || null
    );
  }, [directoryMembers]);

  // Mission Groups enriched dynamically with real staff & heads from Supabase
  const resolvedMissionGroups = useMemo(() => {
    return MISSION_GROUPS.map((group) => {
      const groupStaff = directoryMembers.filter(
        (m) =>
          m.division &&
          (m.division === group.name ||
            m.division.includes(group.name) ||
            group.name.includes(m.division))
      );
      const head =
        groupStaff.find((m) => m.role === "manager" || m.position?.includes("หัวหน้า")) ||
        groupStaff[0] ||
        null;
      return {
        ...group,
        headName: head?.name || "อยู่ระหว่างอัปเดตหัวหน้ากลุ่มงาน",
        headPosition: head?.position || group.name,
        staff: groupStaff,
      };
    });
  }, [directoryMembers]);

  // Active Division Group
  const activeGroup = useMemo(() => {
    return resolvedMissionGroups.find((g) => g.id === selectedGroup);
  }, [resolvedMissionGroups, selectedGroup]);

  // Active Division Staff from Supabase
  const activeDivisionStaff = useMemo(() => {
    return activeGroup?.staff || [];
  }, [activeGroup]);

  // Division Filter Chips for Personnel Tab
  const personnelDivisionFilters = useMemo(() => {
    const base = [
      { id: "all", label: "ทั้งหมด" },
      { id: "ผู้บริหาร", label: "ผู้บริหาร" },
      { id: "ฝ่ายบริหารทั่วไป", label: "บริหารทั่วไป" },
      { id: "กลุ่มนโยบายและวิชาการ", label: "นโยบายและวิชาการ" },
      { id: "กลุ่มการพัฒนาสังคมและสวัสดิการ", label: "สังคมและสวัสดิการ" },
      { id: "ศูนย์บริการคนพิการ", label: "ศูนย์คนพิการ" },
    ];
    if (directoryMembers.some((m) => m.division === "รอกำหนดกลุ่มงาน")) {
      base.push({ id: "รอกำหนดกลุ่มงาน", label: "รอกำหนดกลุ่มงาน" });
    }
    return base.map((item) => ({
      ...item,
      count:
        item.id === "all"
          ? directoryMembers.length
          : directoryMembers.filter((m) => (m.division || "").includes(item.id)).length,
    }));
  }, [directoryMembers]);

  // Filtered Personnel List for Personnel Tab
  const filteredPersonnel = useMemo(() => {
    return directoryMembers.filter((staff) => {
      if (personnelDivisionFilter !== "all" && !(staff.division || "").includes(personnelDivisionFilter)) {
        return false;
      }
      if (personnelSearch.trim()) {
        const q = personnelSearch.toLowerCase().trim();
        const nameMatch = (staff.name || "").toLowerCase().includes(q);
        const nicknameMatch = (getDisplayNickname(staff) || "").toLowerCase().includes(q);
        const posMatch = (staff.position || "").toLowerCase().includes(q);
        const divMatch = (staff.division || "").toLowerCase().includes(q);
        const typeMatch = (staff.personnelType || "").toLowerCase().includes(q);
        const phoneMatch = (getDisplayPhone(staff) || "").includes(q);
        const emailMatch = (getDisplayEmail(staff) || "").toLowerCase().includes(q);
        const lineMatch = (getDisplayLineId(staff) || "").toLowerCase().includes(q);
        return (
          nameMatch ||
          nicknameMatch ||
          posMatch ||
          divMatch ||
          typeMatch ||
          phoneMatch ||
          emailMatch ||
          lineMatch
        );
      }
      return true;
    });
  }, [directoryMembers, personnelSearch, personnelDivisionFilter]);

  // Combined documents for search
  const filteredDocuments = useMemo(() => {
    const list =
      selectedGroup === "all"
        ? MISSION_GROUPS.flatMap((g) =>
            g.documents.map((d) => ({ ...d, groupName: g.name, groupIcon: g.icon }))
          )
        : activeGroup?.documents.map((d) => ({
            ...d,
            groupName: activeGroup.name,
            groupIcon: activeGroup.icon,
          })) || [];

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (d) => d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
    );
  }, [selectedGroup, activeGroup, searchQuery]);

  const selectedDistrictObj = useMemo(() => {
    return KAMPHAENG_PHET_DISTRICTS.find((d) => d.districtId === districtFilter);
  }, [districtFilter]);

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`📋 คัดลอก${label}เรียบร้อยแล้ว: ${text}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. HEADER SECTION ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-indigo-900/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <span>🗃️</span>
              <span>ศูนย์รวมข้อมูลและสถิติตามกลุ่มภารกิจงาน พมจ.กำแพงเพชร</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              ศูนย์ข้อมูลและสถิติสังคม (Data Hub)
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              แดชบอร์ดสถานการณ์กลุ่มเปราะบางระดับจังหวัด (TPMAP &amp; ศรส. 1300) คลังตัวชี้วัด 4 กลุ่มงาน
              ทำเนียบบุคลากรและข้าราชการ สารบบแบบฟอร์มคำขอสวัสดิการ และการส่งออกรายงานทางการสำหรับการประชุม กบจ.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
              <div className="text-[10px] text-indigo-200 font-bold">อำเภอในกำแพงเพชร</div>
              <div className="text-xl font-extrabold text-white">11 อำเภอ</div>
            </div>
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
              <div className="text-[10px] text-indigo-200 font-bold">บุคลากรในระบบ</div>
              <div className="text-xl font-extrabold text-amber-300">
                {directoryMembers.length} ท่าน
              </div>
            </div>
          </div>
        </div>

        {/* Top-Level Module Tabs */}
        <div className="mt-6 pt-5 border-t border-indigo-800/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveMainTab("stats")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === "stats"
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-400/40"
                  : "bg-white/10 hover:bg-white/20 text-slate-200"
              }`}
            >
              <span>📊</span>
              <span>สถานการณ์กลุ่มเปราะบาง 11 อำเภอ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("divisions")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === "divisions"
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-400/40"
                  : "bg-white/10 hover:bg-white/20 text-slate-200"
              }`}
            >
              <span>🏛️</span>
              <span>ระบบงาน 4 กลุ่มภารกิจ พมจ.</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("personnel")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === "personnel"
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-400/40"
                  : "bg-white/10 hover:bg-white/20 text-slate-200"
              }`}
            >
              <span>👥</span>
              <span>ทำเนียบข้าราชการและเจ้าหน้าที่</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("documents")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === "documents"
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-400/40"
                  : "bg-white/10 hover:bg-white/20 text-slate-200"
              }`}
            >
              <span>📄</span>
              <span>คลังแบบฟอร์มและคู่มือปฏิบัติงาน</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("orders")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === "orders"
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-400/40"
                  : "bg-white/10 hover:bg-white/20 text-slate-200"
              }`}
            >
              <span>📜</span>
              <span>คำสั่ง / ประกาศ / ระเบียบ</span>
            </button>
          </div>

          <div className="text-xs text-indigo-300">
            ปีงบประมาณ พ.ศ. <strong>{fiscalYear}</strong>
          </div>
        </div>
      </div>

      {/* ─── 2. TAB 1: SOCIAL STATISTICS & TPMAP DASHBOARD ─── */}
      {activeMainTab === "stats" && (
        <div className="space-y-6">
          {/* Controls Bar: Fiscal Year & District Filter & Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left: Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Fiscal Year Chips */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">ปีงบประมาณ:</span>
                {["2570", "2569", "2568"].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setFiscalYear(yr)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      fiscalYear === yr
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    ปี {yr}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              {/* District Filter Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">พื้นที่:</span>
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">📍 ทุกอำเภอในกำแพงเพชร (11 อำเภอ)</option>
                  {KAMPHAENG_PHET_DISTRICTS.map((d) => (
                    <option key={d.districtId} value={d.districtId}>
                      {d.districtName} ({d.subdistrictCount} ตำบล)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: Export & Print Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  exportSocialStatsToCsv(statsList, fiscalYear);
                  showToast("📊 ส่งออกไฟล์สถิติ CSV สำหรับ Microsoft Excel เรียบร้อยแล้ว");
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="ส่งออกสถิติ 11 อำเภอ เป็นไฟล์ CSV (รองรับภาษาไทยใน Microsoft Excel)"
              >
                <span>📊</span>
                <span>ส่งออก Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="เปิดเอกสารรายงานราชการแบบทางการเพื่อสั่งพิมพ์หรือบันทึก PDF"
              >
                <span>🖨️</span>
                <span>พิมพ์รายงาน กบจ.</span>
              </button>
            </div>
          </div>

          {/* 5 Big MSO-Logbook KPI Metric Cards (Kamphaeng Phet Real Baseline) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-bold">ครัวเรือนเปราะบาง</span>
                <span className="text-base">👨‍👩‍👧</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-heading tabular-nums">
                {KPP_MSO_LOGBOOK.main.hh.toLocaleString("th-TH")}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {((KPP_MSO_LOGBOOK.main.hh / KPP_MSO_LOGBOOK.main.households) * 100).toFixed(1)}% จาก {KPP_MSO_LOGBOOK.main.households.toLocaleString("th-TH")} ครัวเรือน
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-sky-800 text-xs">
                <span className="font-bold">บุคคลเปราะบาง</span>
                <span className="text-base">👥</span>
              </div>
              <div className="text-2xl font-extrabold text-sky-700 font-heading tabular-nums">
                {KPP_MSO_LOGBOOK.main.people.toLocaleString("th-TH")}
              </div>
              <div className="text-[10px] text-sky-700 font-bold">
                พบปัญหาจริง {KPP_MSO_LOGBOOK.main.peopleWithProblems.toLocaleString("th-TH")} คน
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-rose-800 text-xs">
                <span className="font-bold">ปัญหา 9 มิติรวม</span>
                <span className="text-base">📋</span>
              </div>
              <div className="text-2xl font-extrabold text-rose-700 font-heading tabular-nums">
                {KPP_MSO_LOGBOOK.main.problems.toLocaleString("th-TH")}
              </div>
              <div className="text-[10px] text-rose-600 font-bold">
                ยังไม่มีแผน {msoNoplanTotal.toLocaleString("th-TH")} ครั้ง ({((msoNoplanTotal / KPP_MSO_LOGBOOK.main.problems) * 100).toFixed(1)}%)
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-amber-800 text-xs">
                <span className="font-bold">ระดับ 2–3 (เร่งด่วน)</span>
                <span className="text-base">🚨</span>
              </div>
              <div className="text-2xl font-extrabold text-amber-700 font-heading tabular-nums">
                {msoLevel2Plus3.toLocaleString("th-TH")}
              </div>
              <div className="text-[10px] text-amber-700 font-medium">
                ลำบาก {KPP_MSO_LOGBOOK.main.lvls[2].toLocaleString("th-TH")} • วิกฤต {KPP_MSO_LOGBOOK.main.lvls[3].toLocaleString("th-TH")} ครัวเรือน
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-emerald-800 text-xs">
                <span className="font-bold">อุดหนุนเด็กแรกเกิด</span>
                <span className="text-base">👶</span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 font-heading tabular-nums">
                {KPP_MSO_LOGBOOK.welfare.subsidy.received.toLocaleString("th-TH")}
              </div>
              <div className="text-[10px] text-emerald-700 font-bold">
                ได้รับแล้ว {((KPP_MSO_LOGBOOK.welfare.subsidy.received / KPP_MSO_LOGBOOK.welfare.subsidy.eligible) * 100).toFixed(1)}% ของผู้มีสิทธิ
              </div>
            </div>
          </div>

          {/* MSO-Logbook 9 Dimensions & Vulnerability Levels */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <span>🎯</span>
                  <span>ปัญหาความเดือดร้อน 9 มิติ (ฐานข้อมูล MSO-Logbook {KPP_MSO_LOGBOOK.main.region} จังหวัดกำแพงเพชร)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  จำแนกตาม 9 มิติความเดือดร้อน พร้อมสัดส่วนปัญหาที่ยังไม่มีแผนช่วยเหลือ (สีแดง) และประเด็นหลักที่พบสูงสุด
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200 transition-colors cursor-pointer"
              >
                📄 ดูรายงานฉบับเต็ม & ส่งออก Word (.docx)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {msoDimensions.map((dim, idx) => {
                const plannedOrDone = Math.max(0, dim.total - dim.noplan);
                const plannedPct = dim.total > 0 ? ((plannedOrDone / dim.total) * 100).toFixed(1) : "0.0";
                const topIssue = dim.topIssues[0];

                return (
                  <div
                    key={dim.dimension}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-sky-200 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2 text-xs font-bold">
                      <span className="text-slate-900 leading-snug">
                        {idx + 1}. {dim.dimension}
                      </span>
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] tabular-nums">
                        {dim.sharePct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-xl font-extrabold text-slate-900 font-heading tabular-nums">
                        {dim.total.toLocaleString("th-TH")}{" "}
                        <span className="text-[11px] font-medium text-slate-500">ครั้ง</span>
                      </div>
                      <div className="text-[11px] font-semibold text-rose-700 tabular-nums">
                        ยังไม่มีแผน {dim.noplan.toLocaleString("th-TH")} ({dim.noplanPct.toFixed(0)}%)
                      </div>
                    </div>

                    <div className="w-full bg-rose-200/80 rounded-full h-1.5 overflow-hidden" title={`มีแผน/ติดตาม/ปิดเคส ${plannedPct}%`}>
                      <div
                        className="bg-teal-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${plannedPct}%` }}
                      />
                    </div>

                    <div className="text-[10px] text-slate-500 truncate">
                      {topIssue
                        ? `พบมากสุด: ${topIssue.name} (${topIssue.total.toLocaleString("th-TH")} ครั้ง)`
                        : `ติดตาม ${dim.tracked.toLocaleString("th-TH")} • ปิดเคส ${dim.closed.toLocaleString("th-TH")}`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compact Vulnerability Levels 0-3 Bar */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {MSO_VULNERABILITY_LEVELS.map((lvl, idx) => {
                const count = KPP_MSO_LOGBOOK.main.lvls[idx] || 0;
                const pct = ((count / KPP_MSO_LOGBOOK.main.hh) * 100).toFixed(1);
                const toneClass =
                  lvl.tone === "emerald"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : lvl.tone === "sky"
                    ? "bg-sky-50 border-sky-200 text-sky-800"
                    : lvl.tone === "amber"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-rose-50 border-rose-200 text-rose-800";
                return (
                  <div key={lvl.level} className={`rounded-xl border px-3 py-2 ${toneClass}`}>
                    <div className="text-[10px] font-bold truncate">{lvl.label}</div>
                    <div className="flex items-baseline justify-between mt-0.5">
                      <span className="text-sm font-extrabold tabular-nums">
                        {count.toLocaleString("th-TH")} ครัวเรือน
                      </span>
                      <span className="text-[10px] font-bold tabular-nums">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive District Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <span>🏛️</span>
                  <span>ตารางสถิติจำแนกรายอำเภอในจังหวัดกำแพงเพชร ({statsList.length} อำเภอ)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  คลิกที่ชื่ออำเภอเพื่อดูรายละเอียดเฉพาะพื้นที่
                </p>
              </div>

              {districtFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setDistrictFilter("all")}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  ✕ แสดงทุกอำเภอ
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">อำเภอ</th>
                    <th className="py-2.5 px-2 text-center">ตำบล</th>
                    <th className="py-2.5 px-3 text-right">ประชากร</th>
                    <th className="py-2.5 px-3 text-right">เป้าหมาย (ครัวเรือน)</th>
                    <th className="py-2.5 px-3 text-right">ช่วยเหลือแล้ว</th>
                    <th className="py-2.5 px-3 text-center">ความก้าวหน้า</th>
                    <th className="py-2.5 px-3 text-right">คนพิการ</th>
                    <th className="py-2.5 px-3 text-right">เด็กแรกเกิด</th>
                    <th className="py-2.5 px-3 text-right">งบสงเคราะห์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statsList.map((d) => {
                    const pct =
                      d.vulnerableHouseholds > 0
                        ? ((d.helpedHouseholds / d.vulnerableHouseholds) * 100).toFixed(1)
                        : "0.0";
                    const isSelected = districtFilter === d.districtId;

                    return (
                      <tr
                        key={d.districtId}
                        onClick={() =>
                          setDistrictFilter(isSelected ? "all" : d.districtId)
                        }
                        className={`hover:bg-indigo-50/40 cursor-pointer transition-colors ${
                          isSelected ? "bg-indigo-50/70 font-semibold" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-base">📍</span>
                          <span>{d.districtName}</span>
                          {isSelected && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[9px]">
                              เลือกอยู่
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600">
                          {d.subdistrictCount}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                          {d.population.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          {d.vulnerableHouseholds.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-bold font-mono">
                          {d.helpedHouseholds.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-2 rounded-full"
                                style={{ width: `${Math.min(100, Number(pct))}%` }}
                              />
                            </div>
                            <span className="font-bold text-[11px] text-emerald-700">
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-blue-700 font-mono">
                          {d.disabilityRegistered.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-700 font-mono">
                          {d.childSupportBeneficiaries.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-800 font-mono">
                          {(d.budgetDisbursedThb / 1000000).toFixed(2)} ลบ.
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. TAB 2: DIVISION SYSTEMS & KPIS ─── */}
      {activeMainTab === "divisions" && (
        <div className="space-y-6">
          {/* Group Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedGroup("all")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                selectedGroup === "all"
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>🌐</span>
              <span>ภาพรวมทั้ง 4 กลุ่มงาน</span>
            </button>

            {MISSION_GROUPS.map((g) => {
              const isSelected = selectedGroup === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroup(g.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                    isSelected
                      ? "bg-indigo-700 text-white border-indigo-700 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{g.icon}</span>
                  <span>{g.shortName}</span>
                </button>
              );
            })}
          </div>

          {selectedGroup === "all" ? (
            /* Overview of All 4 Groups */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resolvedMissionGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer space-y-4 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl ${group.bgColor} border ${group.borderColor} flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform`}
                      >
                        {group.icon}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base group-hover:text-indigo-700 transition-colors">
                          {group.name}
                        </h3>
                        <div className="text-xs text-slate-500">
                          ผู้กำกับดูแล: <strong className="text-slate-800">{group.headName}</strong>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                          {group.headPosition}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-indigo-600 font-bold group-hover:translate-x-1 transition-transform">
                      ดูข้อมูล ➔
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {group.description}
                  </p>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    {group.metrics.slice(0, 2).map((m, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100"
                      >
                        <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                          <span>{m.icon}</span>
                          <span className="truncate">{m.label}</span>
                        </div>
                        <div className="text-sm font-extrabold text-slate-800 mt-0.5">
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : activeGroup ? (
            /* Selected Group Detail View */
            <div className="space-y-6">
              {/* Group Header Banner */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-2xl ${activeGroup.bgColor} border ${activeGroup.borderColor} flex items-center justify-center text-3xl shrink-0`}
                  >
                    {activeGroup.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {activeGroup.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ผู้กำกับดูแล: <strong className="text-slate-800">{activeGroup.headName}</strong> — {activeGroup.headPosition}
                    </p>
                    <p className="text-xs text-slate-600 mt-2 max-w-2xl leading-relaxed">
                      {activeGroup.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedGroup("all")}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 self-start md:self-center"
                >
                  ⬅ กลับหน้าภาพรวม
                </button>
              </div>

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {activeGroup.metrics.map((metric, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span className="font-bold truncate">{metric.label}</span>
                      <span className="text-base">{metric.icon}</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900 font-heading">
                      {metric.value}
                    </div>
                    {metric.change && (
                      <div className="text-[10px] text-teal-700 font-bold flex items-center gap-1">
                        <span>✓</span>
                        <span>{metric.change}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Official Staff in this Division */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <span>👥</span>
                    <span>ทำเนียบข้าราชการและเจ้าหน้าที่ประจำ {activeGroup.name}</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    {activeDivisionStaff.length} ท่าน
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeDivisionStaff.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-xs text-slate-400">
                      ยังไม่มีรายชื่อบุคลากรในกลุ่มงานนี้บนฐานข้อมูล Supabase
                    </div>
                  ) : (
                    activeDivisionStaff.map((staff) => {
                      const nickname = getDisplayNickname(staff);
                      const phone = getDisplayPhone(staff);
                      const email = getDisplayEmail(staff);
                      const lineId = getDisplayLineId(staff);
                      return (
                        <div
                          key={staff.id}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all flex items-start gap-3"
                        >
                          <div className="relative shrink-0">
                            {staff.avatarUrl ? (
                              <img
                                src={staff.avatarUrl}
                                alt={staff.name}
                                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shadow-2xs">
                                {staff.avatarText || staff.name.slice(0, 2)}
                              </div>
                            )}
                            {nickname && (
                              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-indigo-600 text-white text-[9px] font-bold">
                                {nickname}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <div className="font-extrabold text-xs text-slate-900 truncate">
                                {staff.name}
                              </div>
                              {staff.personnelType && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white text-slate-600 border border-slate-200 shrink-0">
                                  {staff.personnelType}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-600 leading-tight">
                              {staff.position}
                            </div>

                            {(phone || email || lineId) && (
                              <div className="pt-1.5 border-t border-slate-100 flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                                {phone && (
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(phone, "เบอร์โทรศัพท์")}
                                    className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 cursor-pointer"
                                    title="คลิกเพื่อคัดลอกเบอร์โทร"
                                  >
                                    <span>📞</span>
                                    <span>{phone}</span>
                                  </button>
                                )}
                                {email && (
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(email, "อีเมล")}
                                    className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 cursor-pointer truncate max-w-[170px]"
                                    title="คลิกเพื่อคัดลอกอีเมล"
                                  >
                                    <span>📧</span>
                                    <span className="truncate">{email}</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Connected External Systems */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <span>🌐</span>
                  <span>ระบบสารสนเทศและฐานข้อมูลออนไลน์ที่เชื่อมโยง</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {activeGroup.systems.map((sys, idx) => (
                    <a
                      key={idx}
                      href={sys.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-sm transition-all group flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-lg">{sys.icon}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {sys.badge}
                          </span>
                        </div>
                        <div className="font-extrabold text-xs text-slate-800 group-hover:text-indigo-700 transition-colors">
                          {sys.name}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {sys.desc}
                        </p>
                      </div>
                      <div className="text-[10px] text-indigo-600 font-bold mt-3 flex items-center gap-1">
                        <span>เปิดระบบ</span>
                        <span>↗</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ─── 4. TAB 3: COMPLETE OFFICIAL PERSONNEL DIRECTORY (LIVE SUPABASE) ─── */}
      {activeMainTab === "personnel" && (
        <div className="space-y-6">
          {/* Executive Highlight Banner */}
          {provincialDirector ? (
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 shadow-md text-white border border-purple-800/40 flex flex-col sm:flex-row items-center gap-5">
              <div className="relative shrink-0">
                {provincialDirector.avatarUrl ? (
                  <img
                    src={provincialDirector.avatarUrl}
                    alt={provincialDirector.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-white/20 shadow-xl"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold flex items-center justify-center text-2xl sm:text-3xl border-2 border-white/20 shadow-xl">
                    {provincialDirector.avatarText || provincialDirector.name.slice(0, 2)}
                  </div>
                )}
                <span className="absolute -bottom-2 -right-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-extrabold shadow-sm">
                  ผู้บริหาร พมจ.
                </span>
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-purple-200 text-[11px] font-bold border border-white/10">
                  <span>👑</span>
                  <span>ผู้บริหารสูงสุด สำนักงาน พมจ.กำแพงเพชร</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white font-heading">
                  {provincialDirector.name}
                </h2>
                <div className="text-xs sm:text-sm text-purple-200 font-medium">
                  {provincialDirector.position}
                </div>
                <div className="text-xs text-slate-300">
                  {provincialDirector.division}
                  {provincialDirector.personnelType ? ` · ${provincialDirector.personnelType}` : ""}
                </div>
                {(getDisplayPhone(provincialDirector) ||
                  getDisplayEmail(provincialDirector) ||
                  getDisplayLineId(provincialDirector)) && (
                  <div className="pt-2 flex items-center justify-center sm:justify-start gap-3 text-xs text-purple-200 flex-wrap">
                    {getDisplayPhone(provincialDirector) && (
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(getDisplayPhone(provincialDirector)!, "เบอร์โทรศัพท์")
                        }
                        className="flex items-center gap-1 hover:text-white cursor-pointer"
                      >
                        <span>📞</span>
                        <span>{getDisplayPhone(provincialDirector)}</span>
                      </button>
                    )}
                    {getDisplayEmail(provincialDirector) && (
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(getDisplayEmail(provincialDirector)!, "อีเมล")
                        }
                        className="flex items-center gap-1 hover:text-white cursor-pointer"
                      >
                        <span>📧</span>
                        <span>{getDisplayEmail(provincialDirector)}</span>
                      </button>
                    )}
                    {getDisplayLineId(provincialDirector) && (
                      <span className="flex items-center gap-1">
                        <span>💬</span>
                        <span>@{getDisplayLineId(provincialDirector)}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Controls Bar: Search & Division Filter */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-wrap">
                <span className="text-xs font-bold text-slate-500 shrink-0">กลุ่มงาน:</span>
                {personnelDivisionFilters.map((div) => (
                  <button
                    key={div.id}
                    type="button"
                    onClick={() => setPersonnelDivisionFilter(div.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      personnelDivisionFilter === div.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    <span>{div.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        personnelDivisionFilter === div.id
                          ? "bg-white/20 text-white"
                          : "bg-white text-slate-500"
                      }`}
                    >
                      {div.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64 shrink-0">
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, ชื่อเล่น, ตำแหน่ง..."
                  value={personnelSearch}
                  onChange={(e) => setPersonnelSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span>
                แสดง <strong>{filteredPersonnel.length}</strong> จาก{" "}
                <strong>{directoryMembers.length}</strong> ท่าน
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>ข้อมูลจริงจาก Supabase (public.users)</span>
              </span>
            </div>
          </div>

          {/* Personnel Grid */}
          {filteredPersonnel.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center space-y-2 text-slate-500">
              <div className="text-3xl">👥</div>
              <div className="text-sm font-bold text-slate-700">
                {directoryMembers.length === 0
                  ? "ไม่พบข้อมูลบุคลากรในฐานข้อมูล Supabase"
                  : "ไม่พบบุคลากรที่ตรงกับเงื่อนไขการค้นหา"}
              </div>
              {personnelSearch || personnelDivisionFilter !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setPersonnelSearch("");
                    setPersonnelDivisionFilter("all");
                  }}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 cursor-pointer"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="personnel-grid">
              {filteredPersonnel.map((staff) => {
                const nickname = getDisplayNickname(staff);
                const phone = getDisplayPhone(staff);
                const email = getDisplayEmail(staff);
                const lineId = getDisplayLineId(staff);
                return (
                  <div
                    key={staff.id}
                    data-testid="personnel-card"
                    className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between group space-y-3"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-3.5">
                        <div className="relative shrink-0">
                          {staff.avatarUrl ? (
                            <img
                              src={staff.avatarUrl}
                              alt={staff.name}
                              className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-2xs group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-base shadow-2xs">
                              {staff.avatarText || staff.name.slice(0, 2)}
                            </div>
                          )}
                          {nickname && (
                            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-indigo-600 text-white text-[9px] font-bold">
                              {nickname}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-700 transition-colors">
                              {staff.name}
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-indigo-700 mt-0.5">
                            {staff.position}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                            {staff.division}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">ประเภทบุคลากร:</span>
                        <span className="font-bold text-slate-700">
                          {staff.personnelType || "รอกำหนดประเภท"}
                        </span>
                      </div>

                      {phone && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">เบอร์โทรศัพท์:</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(phone, "เบอร์โทร")}
                            className="font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                            title="คลิกเพื่อคัดลอก"
                          >
                            <span>📞 {phone}</span>
                          </button>
                        </div>
                      )}

                      {email && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">อีเมลติดต่อ:</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(email, "อีเมล")}
                            className="font-mono text-[10px] text-slate-700 hover:text-indigo-600 hover:underline cursor-pointer truncate max-w-[160px]"
                            title="คลิกเพื่อคัดลอก"
                          >
                            {email}
                          </button>
                        </div>
                      )}

                      {lineId && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">LINE ID:</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            @{lineId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 5. TAB 4: DOCUMENTS & FORMS SECTION ─── */}
      {activeMainTab === "documents" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <span>📄</span>
                <span>สารบบแบบฟอร์มคำขอ และคู่มือปฏิบัติงาน</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ดาวน์โหลดแบบฟอร์มมาตรฐาน คู่มือ และแผนปฏิบัติราชการของ 4 กลุ่มภารกิจ พมจ.กำแพงเพชร
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveMainTab("orders")}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold cursor-pointer transition-colors"
              >
                📜 ค้นหาคำสั่ง / ประกาศ / ระเบียบ →
              </button>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="ค้นหาแบบฟอร์ม / คู่มือ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
              </div>
            </div>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              ไม่พบเอกสารที่ค้นหา
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredDocuments.map((doc) => {
                const badgeClass =
                  doc.type === "PDF"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : doc.type === "DOCX"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200";

                return (
                  <div
                    key={doc.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border ${badgeClass} shrink-0`}
                      >
                        {doc.type}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {doc.title}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="text-indigo-600 font-bold">{doc.category}</span>
                          <span>•</span>
                          <span>ขนาด {doc.size}</span>
                          <span>•</span>
                          <span>อัปเดต {doc.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => showToast(`📥 กำลังเริ่มดาวน์โหลด: ${doc.title}`)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span>📥</span>
                        <span>ดาวน์โหลด</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 5B. TAB 5: OFFICIAL ORDERS & ANNOUNCEMENTS REPOSITORY ─── */}
      {activeMainTab === "orders" && (
        <OfficialOrdersPanel currentUser={currentUser} showToast={showToast} />
      )}

      {/* ─── 6. OFFICIAL PRINTABLE REPORT MODAL ─── */}
      <SocialStatisticsReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        stats={statsList}
        fiscalYear={fiscalYear}
        currentUser={currentUser}
        selectedDistrictName={selectedDistrictObj?.districtName}
        director={provincialDirector}
      />
    </div>
  );
}
