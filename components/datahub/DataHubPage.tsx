"use client";

import React, { useState, useMemo } from "react";
import { Member } from "@/lib/types";

interface DataHubPageProps {
  currentUser: Member;
  showToast: (msg: string) => void;
  members?: Member[];
}

interface MissionGroup {
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

const MISSION_GROUPS: MissionGroup[] = [
  {
    id: "admin",
    name: "ฝ่ายบริหารทั่วไป",
    shortName: "บริหารทั่วไป",
    icon: "🏛️",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    headName: "นายเสกพล ดิษฐโชติ",
    headPosition: "หัวหน้าฝ่ายบริหารทั่วไป",
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
    headName: "นางสาวอังคณา ศรีเจริญ",
    headPosition: "หัวหน้ากลุ่มนโยบายและวิชาการ",
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
    headName: "นางจินตนา บุญเรือง",
    headPosition: "หัวหน้ากลุ่มการพัฒนาสังคมและสวัสดิการ",
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
    headName: "นายณัฐพล ชัยสิทธิ์",
    headPosition: "หัวหน้าศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
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
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const activeGroup = useMemo(() => {
    return MISSION_GROUPS.find((g) => g.id === selectedGroup);
  }, [selectedGroup]);

  // Combined documents for search
  const filteredDocuments = useMemo(() => {
    const list = selectedGroup === "all"
      ? MISSION_GROUPS.flatMap((g) => g.documents.map((d) => ({ ...d, groupName: g.name, groupIcon: g.icon })))
      : (activeGroup?.documents.map((d) => ({ ...d, groupName: activeGroup.name, groupIcon: activeGroup.icon })) || []);

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((d) => d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));
  }, [selectedGroup, activeGroup, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ─── 1. HEADER SECTION ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-indigo-900/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <span>🗃️</span>
              <span>ศูนย์รวมข้อมูลและสถิติตามกลุ่มภารกิจงาน</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              ระบบรวมข้อมูล (Data Hub)
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              ศูนย์รวมคลังข้อมูล สถิติ ตัวชี้วัดสำคัญ คลังเอกสารแบบฟอร์ม และระบบสารสนเทศ
              ตามโครงสร้าง 4 กลุ่มภารกิจงาน สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
              <div className="text-[10px] text-indigo-200 font-bold">กลุ่มภารกิจงาน</div>
              <div className="text-xl font-extrabold text-white">4 กลุ่มงาน</div>
            </div>
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
              <div className="text-[10px] text-indigo-200 font-bold">เอกสาร/แบบฟอร์ม</div>
              <div className="text-xl font-extrabold text-white">16 รายการ</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 pt-5 border-t border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="ค้นหาเอกสาร, แบบฟอร์ม, ระเบียบราชการ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-xs text-indigo-300">
            อัปเดตข้อมูลล่าสุด: <strong>พฤศจิกายน 2569</strong>
          </div>
        </div>
      </div>

      {/* ─── 2. GROUP SELECTOR TABS ─── */}
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
          <span>ภาพรวมทั้งสำนักงาน</span>
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

      {/* ─── 3. MISSION GROUP CONTENT ─── */}
      {selectedGroup === "all" ? (
        /* Overview of All 4 Groups */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MISSION_GROUPS.map((group) => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer space-y-4 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl ${group.bgColor} border ${group.borderColor} flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform`}>
                      {group.icon}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base group-hover:text-indigo-700 transition-colors">
                        {group.name}
                      </h3>
                      <div className="text-xs text-slate-500">
                        {group.headName} ({group.headPosition})
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
                    <div key={idx} className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
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
        </div>
      ) : activeGroup ? (
        /* Selected Group Detail View */
        <div className="space-y-6">
          {/* Group Header Banner */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl ${activeGroup.bgColor} border ${activeGroup.borderColor} flex items-center justify-center text-3xl shrink-0`}>
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
              <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1">
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

      {/* ─── 4. DOCUMENTS & FORMS SECTION ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <span>📄</span>
              <span>สารบบเอกสาร แบบฟอร์มคำขอ และระเบียบราชการ</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ดาวน์โหลดแบบฟอร์มมาตรฐาน ระเบียบแนวปฏิบัติราชการ
            </p>
          </div>
          <span className="text-xs text-slate-500 font-bold">
            {filteredDocuments.length} รายการ
          </span>
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
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border ${badgeClass} shrink-0`}>
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
    </div>
  );
}

