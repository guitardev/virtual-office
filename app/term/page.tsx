import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ข้อกำหนดและเงื่อนไขการใช้งาน (Terms of Service) — OmniOffice",
  description: "ข้อกำหนดและเงื่อนไขการเข้าใช้งานระบบสำนักงานเสมือน OmniOffice ข้อบังคับด้านความปลอดภัยและจริยธรรมการปฏิบัติงาน",
};

export default function TermsOfServicePage() {
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
              href="/policy"
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
            >
              นโยบายความเป็นส่วนตัว (Privacy)
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
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold">
            <span>📜 ข้อตกลงการใช้บริการระบบสำนักงานเสมือน</span>
            <span>· เวอร์ชันองค์กร</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
            ข้อกำหนดและเงื่อนไขการใช้งาน (Terms of Service)
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            กรุณาอ่านข้อกำหนดและเงื่อนไขนี้อย่างละเอียดก่อนเข้าสู่ระบบและเริ่มใช้งาน OmniOffice
            การเข้าสู่ระบบถือเป็นการยอมรับข้อผูกพันตามข้อกำหนดทั้งหมดนี้
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-400">
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80">
              📅 วันที่มีผลบังคับใช้: <strong>1 มกราคม 2567</strong>
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80">
              🔄 ปรับปรุงล่าสุด: <strong>8 ตุลาคม 2569</strong>
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-purple-300">
              🏛️ หน่วยงาน: <strong>พมจ. กำแพงเพชร</strong>
            </span>
          </div>
        </div>
      </section>

      {/* ─── Main Content Body ─── */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        {/* Core Principles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-2xl mb-2">⚖️</div>
            <div className="font-bold text-sm text-white">ความรับผิดชอบต่อหน้าที่</div>
            <div className="text-xs text-slate-400 mt-1">
              ผู้ใช้งานต้องรักษาความปลอดภัยของบัญชี ไม่เปิดเผยรหัสผ่าน หรือโอนสิทธิ์ให้ผู้อื่น
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-2xl mb-2">📁</div>
            <div className="font-bold text-sm text-white">การรักษาความลับทางราชการ</div>
            <div className="text-xs text-slate-400 mt-1">
              เอกสารและบทสนทนาภายในระบบถือเป็นข้อมูลความลับ ห้ามเผยแพร่สู่สาธารณะโดยมิได้รับอนุญาต
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="font-bold text-sm text-white">มาตรฐานการใช้งานที่ถูกต้อง</div>
            <div className="text-xs text-slate-400 mt-1">
              ใช้เพื่อประโยชน์ในการปฏิบัติงานราชการ และการทำงานร่วมกันอย่างมีประสิทธิภาพ
            </div>
          </div>
        </div>

        {/* Section 1: การยอมรับข้อกำหนด */}
        <section className="p-6 sm:p-8 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-sm border border-purple-500/30">
              1
            </div>
            <h2 className="text-xl font-bold font-heading text-white">
              การยอมรับข้อกำหนดการใช้งาน (Acceptance of Terms)
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            ข้อกำหนดนี้ใช้บังคับกับการเข้าถึงและการใช้งานแพลตฟอร์มสำนักงานเสมือน OmniOffice รวมถึงโมดูลแชททีม, กระดาน Kanban, ระบบจองรถยนต์สำนักงาน, ระบบจัดการประชุม, และเครื่องมือบริหารทรัพยากรทั้งหมด การเข้าสู่ระบบถือว่าท่านได้อ่าน ทำความเข้าใจ และตกลงที่จะปฏิบัติตามข้อกำหนดนี้อย่างเคร่งครัด
          </p>
        </section>

        {/* Section 2: สิทธิ์และหน้าที่ของบัญชีผู้ใช้งาน */}
        <section className="p-6 sm:p-8 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-sm border border-purple-500/30">
              2
            </div>
            <h2 className="text-xl font-bold font-heading text-white">
              การรักษาความปลอดภัยของบัญชีผู้ใช้ (Account & Credential Security)
            </h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-300 pl-4 list-disc marker:text-purple-400">
            <li>
              <strong>การเก็บรักษารหัสผ่าน:</strong> ผู้ใช้งานมีหน้าที่เก็บรักษารหัสผ่าน ข้อมูล Token หรือกุญแจยืนยันตัวตนไว้เป็นความลับ ห้ามยินยอมให้ผู้อื่นเข้าใช้งานบัญชีของตนเองโดยเด็ดขาด
            </li>
            <li>
              <strong>การรับผิดชอบต่อการใช้งาน:</strong> การกระทำใดๆ ที่เกิดขึ้นภายใต้บัญชีของผู้ใช้งาน ให้ถือเป็นการกระทำและความรับผิดชอบของเจ้าของบัญชีนั้น
            </li>
            <li>
              <strong>การแจ้งเหตุผิดปกติ:</strong> หากพบหรือสงสัยว่ามีบุคคลอื่นเข้าถึงบัญชีของท่านโดยไม่ได้รับอนุญาต ต้องแจ้งผู้ดูแลระบบ (Admin) หรือ DPO ทันที
            </li>
          </ul>
        </section>

        {/* Section 3: การควบคุมสิทธิ์ RBAC 4 ระดับ */}
        <section className="p-6 sm:p-8 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-sm border border-purple-500/30">
              3
            </div>
            <h2 className="text-xl font-bold font-heading text-white">
              การควบคุมสิทธิ์ตามบทบาท (Role-Based Access Control)
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            ผู้ใช้งานแต่ละระดับบทบาทต้องปฏิบัติงานอยู่ภายในขอบเขตสิทธิ์ที่ได้รับมอบหมาย:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
              <div className="font-bold text-amber-400">👑 ผู้ดูแลระบบ (Admin)</div>
              <div className="text-slate-400">มีสิทธิ์บริหารจัดการบัญชีผู้ใช้, อนุมัติคำขอสิทธิ์, เปิด-ปิดโมดูลระบบ, และตรวจสอบ Audit Logs ทั้งหมด</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
              <div className="font-bold text-blue-400">👔 ผู้อำนวยการ/ผู้จัดการ (Manager)</div>
              <div className="text-slate-400">มีสิทธิ์ดูรายงานสถิติ, อนุมัติการใช้ยานพาหนะและการประชุม, มอบหมายภารกิจในทีม</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
              <div className="font-bold text-indigo-400">👤 สมาชิก/เจ้าหน้าที่ (Member)</div>
              <div className="text-slate-400">มีสิทธิ์ใช้งานแชททีม, อัปเดตงานใน Kanban, จองรถยนต์สำนักงาน, และจัดการข้อมูลส่วนตัว</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
              <div className="font-bold text-emerald-400">🎟️ ผู้เยี่ยมชม/ภายนอก (Guest)</div>
              <div className="text-slate-400">มีสิทธิ์เข้าถึงเฉพาะโมดูลที่ได้รับเชิญชั่วคราว ไม่สามารถเข้าถึงข้อมูลลับหรือรายงานสถิติได้</div>
            </div>
          </div>
        </section>

        {/* Section 4: ข้อห้ามในการใช้งาน */}
        <section className="p-6 sm:p-8 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-sm border border-purple-500/30">
              4
            </div>
            <h2 className="text-xl font-bold font-heading text-white">
              ข้อห้ามและพฤติกรรมที่ไม่พึงประสงค์ (Prohibited Conduct)
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            ผู้ใช้งานตกลงว่าจะไม่กระทำการใดๆ ดังต่อไปนี้:
          </p>
          <ul className="space-y-2 text-sm text-slate-300 pl-4 list-disc marker:text-purple-400">
            <li>พยายามเจาะระบบ (Hacking), สแกนหาช่องโหว่, หรือแทรกแซงการทำงานของเซิร์ฟเวอร์และฐานข้อมูล Supabase</li>
            <li>อัปโหลดไฟล์ที่มีมัลแวร์ ไวรัส หรือโค้ดที่เป็นอันตรายต่อระบบคอมพิวเตอร์</li>
            <li>ใช้ระบบในการส่งข้อความสแปม โฆษณา หรือถ้อยคำคุกคาม ข่มขู่ หรือหมิ่นประมาทผู้อื่น</li>
            <li>คัดลอก ดัดแปลง หรือเผยแพร่ซอฟต์แวร์และข้อมูลทรัพย์สินทางปัญญาโดยไม่ได้รับความยินยอม</li>
          </ul>
        </section>

        {/* Section 5: การระงับสิทธิ์และการสิ้นสุดการใช้งาน */}
        <section className="p-6 sm:p-8 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-sm border border-purple-500/30">
              5
            </div>
            <h2 className="text-xl font-bold font-heading text-white">
              การระงับสิทธิ์การใช้งาน (Suspension & Termination)
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            ผู้ดูแลระบบขอสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีผู้ใช้งานทันทีโดยไม่ต้องแจ้งล่วงหน้า ในกรณีดังต่อไปนี้:
          </p>
          <ul className="space-y-1.5 text-sm text-slate-300 pl-4 list-disc marker:text-purple-400">
            <li>ผู้ใช้งานพ้นสภาพจากการเป็นบุคลากรของหน่วยงาน (ย้าย, ลาออก, เกษียณอายุ)</li>
            <li>ผู้ใช้งานฝ่าฝืนข้อกำหนดการใช้งาน หรือระเบียบว่าด้วยการรักษาความปลอดภัยระบบเทคโนโลยีสารสนเทศ</li>
            <li>ตรวจพบการใช้งานที่อาจก่อให้เกิดความเสียหายร้ายแรงต่อระบบหรือความมั่นคงขององค์กร</li>
          </ul>
        </section>

        {/* Bottom Navigation */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 text-xs text-slate-400">
          <div>
            © 2026 OmniOffice Enterprise Platform. สงวนลิขสิทธิ์ทั้งหมด
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/policy" className="text-indigo-400 hover:underline font-semibold">
              ดูนโยบายความเป็นส่วนตัว (Privacy Policy) →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
