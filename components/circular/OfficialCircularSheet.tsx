"use client";

import React from "react";
import { CircularDocument } from "@/lib/types";
import { GarudaEmblem } from "./GarudaEmblem";
import { DocumentVerificationQR } from "./DocumentVerificationQR";
import { toThaiDigits, toThaiDate, toThaiDateTime } from "@/lib/thai-numerals";

interface OfficialCircularSheetProps {
  document: CircularDocument;
  showVerificationSeal?: boolean;
  className?: string;
}

/**
 * แบบฟอร์มบันทึกข้อความ (หนังสือเวียนราชการ) ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖
 * และที่แก้ไขเพิ่มเติม (ฉบับที่ ๔) พ.ศ. ๒๕๖๔ ว่าด้วยสารบรรณอิเล็กทรอนิกส์
 * - ครุฑขนาด ๑.๕ เซนติเมตร วางมุมบนซ้าย
 * - คำว่า "บันทึกข้อความ" กึ่งกลางหน้ากระดาษ ขนาด ๒๔ พอยท์ ตัวหนา
 * - บรรทัด "ที่" และ "วันที่": ตำแหน่ง "วันที่" เริ่มต้นจาก "กึ่งกลางหน้ากระดาษ (50%)" บรรทัดเดียวกับ "ที่"
 * - การใช้ตัวเลขไทย (๐-๙) ทั้งหมดตามมติ ครม. และระเบียบงานสารบรรณ
 * - ฟอนต์ TH Sarabun New / Sarabun ๑๖ พอยท์ ตัวปกติ (หัวเรื่อง ๒๐-๒๔ พอยท์ ตัวหนา)
 */
export function OfficialCircularSheet({
  document: doc,
  showVerificationSeal = true,
  className = "",
}: OfficialCircularSheetProps) {
  const isUrgent = doc.urgency !== "normal";

  // แปลงตัวเลขในข้อมูลเอกสารให้เป็นเลขไทยทั้งหมด
  const thaiDocNumber = toThaiDigits(doc.docNumber);
  const thaiIssuedDate = toThaiDate(doc.issuedDate);
  const thaiSenderOrg = toThaiDigits(
    doc.senderOrg ||
      "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร โทร. ๐-๕๕๗๐-๕๐๓๑"
  );
  const thaiTitle = toThaiDigits(doc.title);
  const thaiSummary = doc.summary ? toThaiDigits(doc.summary) : "";
  const thaiDeadline = doc.deadline ? toThaiDate(doc.deadline) : "";
  const thaiTotalCount = toThaiDigits(doc.totalCount);
  const thaiSignDate = toThaiDate(doc.createdAt);
  const thaiCreatedAt = toThaiDateTime(doc.createdAt);

  return (
    <div
      style={{ fontFamily: "'Sarabun', 'TH Sarabun New', 'TH Sarabun PSK', sans-serif" }}
      className={`w-full max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-sm text-slate-900 relative print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:text-black leading-relaxed ${className}`}
    >
      {/* ─── OFFICIAL HEADER: บันทึกข้อความ ─── */}
      <div className="relative border-b-2 border-slate-900 pb-5 mb-6 print:border-black">
        {/* ชั้นความลับ (ถ้ามี) กึ่งกลางบนสุด */}
        {doc.secretLevel !== "normal" && (
          <div className="text-center mb-2">
            <span className="px-3 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider print:bg-transparent print:border-black print:text-black">
              {doc.secretLevel === "top_secret" ? "ลับที่สุด" : "ลับ"}
            </span>
          </div>
        )}

        {/* แถวหัวกระดาษ: ตราครุฑ 1.5 ซม. ด้านซ้ายบน และ คำว่า 'บันทึกข้อความ' กึ่งกลาง */}
        <div className="flex items-start justify-between relative min-h-[50px] mb-4">
          <div className="w-24 shrink-0 flex items-start pt-1">
            <GarudaEmblem size="1.5cm" />
          </div>

          <div className="flex-1 text-center pr-24">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-slate-900 print:text-black leading-none">
              บันทึกข้อความ
            </h1>
            <p className="text-[12px] text-slate-500 print:text-slate-600 mt-1">
              (หนังสือเวียนราชการอิเล็กทรอนิกส์)
            </p>
          </div>
        </div>

        {/* ชั้นความเร็ว (ด่วนที่สุด / ด่วนมาก / ด่วน) สีแดงเด่นชัดเหนือ 'ที่' */}
        {isUrgent && (
          <div className="mb-2">
            <span className="inline-block px-2.5 py-0.5 text-xs font-extrabold text-rose-700 bg-rose-50 border border-rose-300 rounded print:text-black print:border-black print:bg-transparent">
              {doc.urgency === "most_urgent"
                ? "ด่วนที่สุด"
                : doc.urgency === "very_urgent"
                ? "ด่วนมาก"
                : "ด่วน"}
            </span>
          </div>
        )}

        {/* ตารางหัวเรื่องสารบรรณ: ส่วนราชการ, ที่, วันที่, เรื่อง */}
        <div className="space-y-2 text-sm sm:text-base pt-1">
          {/* บรรทัด ส่วนราชการ */}
          <div className="flex flex-wrap items-baseline gap-2">
            <strong className="font-bold text-slate-900 print:text-black whitespace-nowrap text-base">
              ส่วนราชการ
            </strong>
            <span className="text-slate-800 print:text-black flex-1 border-b border-dotted border-slate-300 print:border-transparent pb-0.5">
              {thaiSenderOrg}
            </span>
          </div>

          {/* บรรทัด 'ที่' (ซ้าย) และ 'วันที่' (เริ่มกึ่งกลางหน้ากระดาษ 50% พอดี) */}
          <div className="grid grid-cols-2 gap-4 items-baseline">
            {/* ซ้าย (0% - 50%): ที่ */}
            <div className="flex items-baseline gap-2">
              <strong className="font-bold text-slate-900 print:text-black whitespace-nowrap text-base">
                ที่
              </strong>
              <span className="font-bold text-slate-900 print:text-black flex-1 border-b border-dotted border-slate-300 print:border-transparent pb-0.5">
                {thaiDocNumber}
              </span>
            </div>

            {/* ขวา (เริ่มที่กึ่งกลางหน้ากระดาษ 50% เป๊ะ): วันที่ */}
            <div className="flex items-baseline gap-2">
              <strong className="font-bold text-slate-900 print:text-black whitespace-nowrap text-base">
                วันที่
              </strong>
              <span className="text-slate-800 print:text-black flex-1 border-b border-dotted border-slate-300 print:border-transparent pb-0.5">
                {thaiIssuedDate}
              </span>
            </div>
          </div>

          {/* บรรทัด เรื่อง */}
          <div className="flex items-baseline gap-2 pt-1">
            <strong className="font-bold text-slate-900 print:text-black whitespace-nowrap text-base">
              เรื่อง
            </strong>
            <span className="font-bold text-slate-900 print:text-black text-base sm:text-lg flex-1">
              {thaiTitle}
            </span>
          </div>
        </div>
      </div>

      {/* คำขึ้นต้น: เรียน */}
      <div className="text-sm sm:text-base mb-4 flex items-baseline gap-2">
        <strong className="font-bold text-slate-900 print:text-black whitespace-nowrap text-base">
          เรียน
        </strong>
        <span className="text-slate-800 print:text-black">
          {doc.targetCriteria.scope === "all"
            ? "ข้าราชการ พนักงานราชการ และเจ้าหน้าที่ในสังกัด พมจ.กำแพงเพชร ทุกคน"
            : `ข้าราชการและเจ้าหน้าที่ผู้เกี่ยวข้อง (${thaiTotalCount} ท่าน)`}
        </span>
      </div>

      {/* ─── เนื้อความหนังสือราชการ (BODY) ─── */}
      <div className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-800 print:text-black text-justify">
        <p className="indent-10">
          ด้วย {thaiSenderOrg.split(" โทร.")[0]}{" "}
          มีความประสงค์แจ้งเวียนแนวทางและข้อกำหนด เรื่อง <strong>“{thaiTitle}”</strong>{" "}
          เพื่อให้การปฏิบัติราชการของหน่วยงานและบุคลากรทุกกลุ่มงานดำเนินไปด้วยความเรียบร้อย
          ถูกต้องตามระเบียบของทางราชการ และบรรลุวัตถุประสงค์การยกระดับบริการประชาชนกลุ่มเปราะบางในพื้นที่จังหวัดกำแพงเพชร
        </p>

        {thaiSummary ? (
          <div className="my-3 p-4 rounded-xl bg-slate-50 border border-slate-200 indent-0 print:bg-transparent print:border-slate-400 print:p-2">
            <div className="font-bold text-slate-900 print:text-black text-sm mb-1">
              📌 สาระสำคัญและแนวทางถือปฏิบัติ:
            </div>
            <p className="text-sm text-slate-700 print:text-black leading-normal">
              {thaiSummary}
            </p>
          </div>
        ) : (
          <p className="indent-10">
            ขอให้ผู้มีรายชื่อตามบัญชีผู้รับหนังสือเวียนฉบับนี้ ได้ศึกษาเนื้อหาข้อความในเอกสารแนบต้นฉบับอย่างละเอียด
            และถือปฏิบัติตามแนวทางที่กำหนดโดยเคร่งครัด
          </p>
        )}

        {thaiDeadline && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 print:bg-transparent print:text-black print:border-slate-400 text-sm indent-0 font-medium">
            ⏰ <strong>กำหนดระยะเวลาดำเนินการ:</strong> ขอให้ลงนามรับทราบและถือปฏิบัติตามหนังสือเวียนฉบับนี้ภายในวันที่{" "}
            <strong>{thaiDeadline}</strong>
          </div>
        )}

        <p className="indent-10 pt-2">
          จึงเรียนมาเพื่อโปรดทราบ และถือปฏิบัติต่อไป
        </p>
      </div>

      {/* ─── ลายมือชื่อผู้บริหาร / ผู้สั่งการ (SIGNATURE BLOCK) ─── */}
      <div className="mt-12 mb-8 flex flex-col items-end pr-6 text-sm sm:text-base print-keep-together">
        <div className="text-center space-y-1 min-w-[240px]">
          {/* ลายมือชื่อดิจิทัล */}
          <div className="h-12 flex items-center justify-center">
            <span className="text-xs italic text-slate-400 border-b border-dotted border-slate-400 px-6 py-1 select-none print:text-black">
              (ลงชื่อผ่านระบบสารบรรณอิเล็กทรอนิกส์)
            </span>
          </div>
          <div className="font-bold text-slate-900 print:text-black pt-1">
            ({doc.createdByName})
          </div>
          <div className="text-xs sm:text-sm text-slate-600 print:text-black">
            {doc.senderOrg || "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"}
          </div>
          <div className="text-xs text-slate-400 print:text-black">
            {thaiSignDate}
          </div>
        </div>
      </div>

      {/* ─── ท้ายกระดาษรับรองอิเล็กทรอนิกส์ & QR CODE VERIFICATION ─── */}
      {showVerificationSeal && (
        <div className="mt-8 pt-4 border-t border-slate-300 print:border-black flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 print:text-black bg-slate-50 print:bg-transparent p-3 rounded-xl print-keep-together">
          {/* QR Code สำหรับสแกนตรวจสอบเอกสารจริงบนระบบ */}
          <DocumentVerificationQR
            docId={doc.id}
            docNumber={thaiDocNumber}
            issuedDate={thaiIssuedDate}
            size={60}
          />

          <div className="flex-1 text-right sm:text-right min-w-[220px]">
            <div className="font-bold text-slate-800 print:text-black">
              ระบบสารบรรณและเวียนหนังสืออิเล็กทรอนิกส์ Smart MSO
            </div>
            <div className="text-[11px] text-slate-500 print:text-black leading-tight mt-0.5">
              รับรองตาม พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. ๒๕๔๔ และระเบียบสำนักนายกรัฐมนตรีฯ พ.ศ. ๒๕๖๔
            </div>
            <div className="text-[10px] text-slate-400 print:text-black mt-0.5">
              ออกเอกสาร: {thaiCreatedAt}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
