import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว (Privacy Policy) — OmniOffice",
  description: "นโยบายการคุ้มครองข้อมูลส่วนบุคคลและมาตรฐานความปลอดภัยของแพลตฟอร์มสำนักงานเสมือน OmniOffice (PDPA Compliant)",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* ─── Top Navigation Bar ─── */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-3 group transition-transform hover:scale-102"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#818CF8] flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-500/25">
              Σ
            </div>
            <div>
              <span className="text-lg font-black text-white font-heading tracking-tight block leading-none">
                OmniOffice
              </span>
              <span className="text-[10px] text-indigo-400 font-semibold tracking-wider">
                VIRTUAL OFFICE
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              href="/term"
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
            >
              ข้อกำหนดการใช้งาน (Terms)
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all px-3.5 py-1.5 rounded-xl shadow-xs"
            >
              <span>← กลับสู่หน้าหลัก</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Header ─── */}
      <section className="relative overflow-hidden py-14 px-4 sm:px-6 border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        {/* Ambient glows */}
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>PDPA & ISO/IEC 27001 Compliant</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
            นโยบายความเป็นส่วนตัว (Privacy Policy)
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            ระบบสำนักงานเสมือน OmniOffice ให้ความสำคัญสูงสุดต่อการรักษาความมั่นคงปลอดภัย
            และการคุ้มครองข้อมูลส่วนบุคคลของบุคลากรตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-400">
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80">
              📅 วันที่มีผลบังคับใช้: <strong>1 มกราคม 2567</strong>
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80">
              🔄 ปรับปรุงล่าสุด: <strong>8 ตุลาคม 2569 (เวอร์ชัน 2.4)</strong>
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-indigo-300">
              🏛️ หน่วยงาน: <strong>พมจ. กำแพงเพชร</strong>
            </span>
          </div>
        </div>
      </section>

      {/* ─── Main Content Body ─── */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        {/* Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-2xl mb-2">🔒</div>
            <div className="font-bold text-sm text-white">การเข้ารหัสแบบครบวงจร</div>
            <div className="text-xs text-slate-400 mt-1">
              TLS 1.3 / SSL 256-bit และการเข้ารหัสข้อมูลขณะจัดเก็บ (Encryption at Rest)
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-2xl mb-2">🛡️</div>
            <div className="font-bold text-sm text-white">ควบคุมสิทธิ์ RBAC</div>
            <div className="text-xs text-slate-400 mt-1">
              แยกสิทธิ์ 4 ระดับ (Admin, Manager, Member, Guest) ป้องกันการเข้าถึงโดยมิชอบ
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-2xl mb-2">📜</div>
            <div className="font-bold text-sm text-white">บันทึก Audit Logs สด</div>
            <div className="text-xs text-slate-400 mt-1">
              บันทึกประวัติการกระทำและคำขอสิทธิ์ทุกรายการ ตรวจสอบย้อนหลังได้อย่างโปร่งใส
            </div>
          </div>
        </div>

        {/* Section 1: ข้อมูลที่จัดเก็บ */}
        <section className="p-6 sm:p-8 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
              1
            </div>
            <h2 className="text-xl font-bold font-heading text-white">
              ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม (Personal Data Collected)
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            ระบบ OmniOffice จัดเก็บข้อมูลเฉพาะเท่าที่จำเป็นต่อการปฏิบัติงานและการบริหารจัดการภายในองค์กร ดังนี้:
          </p>
          <ul className="space-y-2 text-sm text-slate-300 pl-4 list-disc marker:text-indigo-400">
            <li>
              <strong>ข้อมูลระบุตัวตนและข้อมูลบุคลากร:</strong> คำนำหน้า, ชื่อ-นามสกุล, ชื่อเล่น, ประเภทบุคลากร (ข้าราชการ, พนักงานราชการ, ลูกจ้างประจำ ฯลฯ), ตำแหน่ง, และสังกัดกลุ่มงาน/ฝ่าย
            </li>
            <li>
              <strong>ข้อมูลการติดต่อ:</strong> อีเมลองค์กร/อีเมลราชการ, หมายเลขโทรศัพท์ภายในสำนักงาน, และ Line ID
            </li>
            <li>
              <strong>ข้อมูลความปลอดภัยและบัญชีผู้ใช้:</strong> บันทึกรหัสผู้ใช้ (User ID), ประวัติการยืนยันตัวตนผ่าน Supabase Auth, และบทบาทสิทธิ์ (Role Assignment)
            </li>
            <li>
              <strong>ข้อมูลการปฏิบัติงานและบริการส่วนกลาง:</strong> รายการบันทึกข้อความสนทนาในห้องแชท, ไฟล์เอกสารที่อัปโหลด, บันทึกการจองรถยนต์ส่วนกลาง, รายการจองห้องประชุม, และข้อมูลสถานะงานบนกระดาน Kanban
            </li>
            <li>
              <strong>ข้อมูลทางเทคนิคและประวัติการใช้งาน (Audit Logs):</strong> หมายเลข IP Address, ชนิดเบราว์เซอร์, วันเวลาที่เข้าสู่ระบบ, และบันทึกประวัติการแก้ไขข้อมูลสำคัญ
            </li>
          </ul>
        </section>

        {/* Section 2: วัตถุประสงค์ในการประมวลผล */}
        <section className="p-6 sm:p-8 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
              2
            </div>
            <h2 className="text-xl font-bold font-heading text-white">
              วัตถุประสงค์ในการเก็บรวบรวมและการใช้งาน (Purposes of Processing)
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            เรานำข้อมูลส่วนบุคคลไปใช้เพื่อวัตถุประสงค์อันชอบด้วยกฎหมายตามภารกิจขององค์กร ได้แก่:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
              <div className="font-bold text-indigo-300">🔑 การยืนยันตัวตน & ตรวจสอบสิทธิ์</div>
              <div className="text-slate-400">เพื่อระบุตัวตนผู้ปฏิบัติงานและมอบหมายสิทธิ์การเข้าถึงโมดูลตามหน้าที่ความรับผิดชอบ (RBAC)</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
              <div className="font-bold text-indigo-300">🚗 การบริหารทรัพยากรส่วนกลาง</div>
              <div className="text-slate-400">เพื่อจัดการคิวจองรถยนต์ราชการ ห้องประชุม และการเบิกใช้ทรัพยากรอย่างมีประสิทธิภาพ</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
              <div className="font-bold text-indigo-300">💬 การสื่อสารและประสานงานภายใน</div>
              <div className="text-slate-400">เพื่ออำนวยความสะดวกในการติดต่อระหว่างกลุ่มงาน และแจ้งเตือนภารกิจสำคัญ</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
              <div className="font-bold text-indigo-300">🛡️ ความปลอดภัยและการตรวจสอบย้อนหลัง</div>
              <div className="text-slate-400">เพื่อเก็บบันทึกประวัติ (Audit Log) ตามระเบียบความมั่นคงปลอดภัยไซเบอร์แห่งชาติ</div>
            </div>
          </div>
        </section>

        {/* Section 3: การเปิดเผยและการเชื่อมต่อฐานข้อมูล */}
        <section className="p-6 sm:p-8 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
              3
            </div>
            <h2 className="text-xl font-bold font-heading text-white">
              การเชื่อมต่อระบบฐานข้อมูลและการเปิดเผยข้อมูล (Data Storage & Disclosure)
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            ระบบ OmniOffice มีการเชื่อมต่อกับระบบคลาวด์และฐานข้อมูลมาตรฐานระดับองค์กร:
          </p>
          <ul className="space-y-2 text-sm text-slate-300 pl-4 list-disc marker:text-indigo-400">
            <li>
              <strong>Supabase Live Cloud Database:</strong> มีการจัดเก็บข้อมูลโครงสร้างใน PostgreSQL ผ่านการเข้ารหัสและการกำหนด Row-Level Security (RLS) อย่างเข้มงวด
            </li>
            <li>
              <strong>ไม่มีการขายหรือเผยแพร่เชิงพาณิชย์:</strong> ข้อมูลทั้งหมดถูกจำกัดใช้งานเฉพาะภายในองค์กร และจะไม่มีการเปิดเผยต่อบุคคลภายนอก เว้นแต่กรณีที่ได้รับความยินยอมหรือมีหน้าที่ตามกฎหมาย
            </li>
          </ul>
        </section>

        {/* Section 4: สิทธิของเจ้าของข้อมูล (PDPA Rights) */}
        <section className="p-6 sm:p-8 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
              4
            </div>
            <h2 className="text-xl font-bold font-heading text-white">
              สิทธิของเจ้าของข้อมูลส่วนบุคคล (Your PDPA Rights)
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ผู้ใช้งานมีสิทธิดังต่อไปนี้:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="block font-bold text-slate-200 mb-1">สิทธิเข้าถึงข้อมูล</span>
              <span className="text-slate-400 text-[11px]">Right of Access</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="block font-bold text-slate-200 mb-1">สิทธิขอแก้ไขข้อมูล</span>
              <span className="text-slate-400 text-[11px]">Right to Rectification</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="block font-bold text-slate-200 mb-1">สิทธิขอลบข้อมูล</span>
              <span className="text-slate-400 text-[11px]">Right to Erasure</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="block font-bold text-slate-200 mb-1">สิทธิคัดค้านการประมวลผล</span>
              <span className="text-slate-400 text-[11px]">Right to Object</span>
            </div>
          </div>
        </section>

        {/* Section 5: ช่องทางการติดต่อ */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-900/40 border border-indigo-500/30 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
              5
            </div>
            <h2 className="text-xl font-bold font-heading text-white">
              ช่องทางการติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO Contact)
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            หากมีข้อสงสัยหรือประสงค์ใช้สิทธิเกี่ยวกับข้อมูลส่วนบุคคล สามารถติดต่อศูนย์ดูแลความปลอดภัยและข้อมูลส่วนบุคคลได้ที่:
          </p>
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/20 space-y-2 text-xs text-slate-300">
            <div><strong>หน่วยงาน:</strong> สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (พมจ. กำแพงเพชร)</div>
            <div><strong>ที่อยู่:</strong> ศาลากลางจังหวัดกำแพงเพชร ถนนพหลโยธิน ตำบลหนองปลิง อำเภอเมือง จังหวัดกำแพงเพชร 62000</div>
            <div><strong>โทรศัพท์:</strong> 055-705031 ต่อ 101, 112, 115</div>
            <div><strong>อีเมล DPO:</strong> <a href="mailto:dpo@m-society.go.th" className="text-indigo-400 hover:underline">dpo@m-society.go.th</a> หรือ <a href="mailto:privacy@omnioffice.internal" className="text-indigo-400 hover:underline">privacy@omnioffice.internal</a></div>
          </div>
        </section>

        {/* Bottom Navigation */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 text-xs text-slate-400">
          <div>
            © 2026 OmniOffice Enterprise Platform. สงวนลิขสิทธิ์ทั้งหมด
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/term" className="text-indigo-400 hover:underline font-semibold">
              ดูข้อกำหนดและเงื่อนไขการใช้งาน (Terms of Service) →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
