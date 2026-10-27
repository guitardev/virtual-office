"use client";

import React, { useState } from "react";
import { CircularDocument, OfficialDocumentType } from "@/lib/types";
import { GarudaEmblem } from "./GarudaEmblem";
import { DocumentVerificationQR } from "./DocumentVerificationQR";
import { toThaiDigits, toThaiDate, toThaiDateTime } from "@/lib/thai-numerals";

interface OfficialCircularSheetProps {
  document: CircularDocument;
  showVerificationSeal?: boolean;
  className?: string;
  forcedType?: OfficialDocumentType;
  allowTypeSwitching?: boolean;
}

/**
 * รวมแม่แบบหนังสือราชการมาตรฐาน ๔ รูปแบบ ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖
 * และที่แก้ไขเพิ่มเติม (ฉบับที่ ๔) พ.ศ. ๒๕๖๔ ว่าด้วยสารบรรณอิเล็กทรอนิกส์:
 * 1. "memo": หนังสือภายใน (บันทึกข้อความ) - ครุฑ ๑.๕ ซม. มุมซ้ายบน, วันที่กึ่งกลางหน้ากระดาษ
 * 2. "external": หนังสือภายนอก - ครุฑ ๓.๐ ซม. กึ่งกลางบนสุด, วันที่กึ่งกลาง, คำลงท้ายขอแสดงความนับถือ
 * 3. "command": หนังสือสั่งการ (คำสั่ง) - ครุฑ ๓.๐ ซม. กึ่งกลาง, คำสั่ง..., ที่..., เรื่อง..., สั่ง ณ วันที่
 * 4. "announcement": หนังสือประชาสัมพันธ์ (ประกาศ) - ครุฑ ๓.๐ ซม. กึ่งกลาง, ประกาศ..., เรื่อง..., ประกาศ ณ วันที่
 */
export function OfficialCircularSheet({
  document: doc,
  showVerificationSeal = true,
  className = "",
  forcedType,
  allowTypeSwitching = true,
}: OfficialCircularSheetProps) {
  const [currentType, setCurrentType] = useState<OfficialDocumentType>(
    forcedType || doc.docType || "memo"
  );

  const isUrgent = doc.urgency !== "normal";

  // แปลงข้อมูลและตัวเลขทั้งหมดเป็นเลขไทยตามระเบียบงานสารบรรณ
  const thaiDocNumber = toThaiDigits(doc.docNumber);
  const thaiIssuedDate = toThaiDate(doc.issuedDate);
  const thaiSenderOrg = toThaiDigits(
    doc.senderOrg || "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
  );
  const thaiTitle = toThaiDigits(doc.title);
  const thaiSummary = doc.summary ? toThaiDigits(doc.summary) : "";
  const thaiDeadline = doc.deadline ? toThaiDate(doc.deadline) : "";
  const thaiTotalCount = toThaiDigits(doc.totalCount);
  const thaiSignDate = toThaiDate(doc.createdAt);
  const thaiCreatedAt = toThaiDateTime(doc.createdAt);

  return (
    <div className="w-full flex flex-col items-center">
      {/* ─── TEMPLATE SELECTOR TABS (ซ่อนเมื่อสั่งพิมพ์) ─── */}
      {allowTypeSwitching && !forcedType && (
        <div className="w-full max-w-3xl mb-4 p-2 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 print:hidden text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold px-2">
            <span>📑 รูปแบบหนังสือราชการ:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setCurrentType("memo")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentType === "memo"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📜</span>
              <span>บันทึกข้อความ (ภายใน)</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentType("external")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentType === "external"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🏛️</span>
              <span>หนังสือภายนอก</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentType("command")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentType === "command"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>⚖️</span>
              <span>คำสั่งราชการ</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentType("announcement")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentType === "announcement"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📢</span>
              <span>ประกาศราชการ</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── OFFICIAL DOCUMENT PAPER (A4 RATIO) ─── */}
      <div
        style={{ fontFamily: "'Sarabun', 'TH Sarabun New', 'TH Sarabun PSK', sans-serif" }}
        className={`w-full max-w-3xl bg-white p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-sm text-slate-900 relative print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:text-black leading-relaxed ${className}`}
      >
        {/* ชั้นความลับ (ถ้ามี) กึ่งกลางบนสุด */}
        {doc.secretLevel !== "normal" && (
          <div className="text-center mb-3">
            <span className="px-3 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider print:bg-transparent print:border-black print:text-black">
              {doc.secretLevel === "top_secret" ? "ลับที่สุด" : "ลับ"}
            </span>
          </div>
        )}

        {/* =========================================================================
            แบบที่ ๑: หนังสือภายใน (บันทึกข้อความ)
           ========================================================================= */}
        {currentType === "memo" && (
          <div>
            {/* ส่วนหัว: ตราครุฑ 1.5 ซม. ซ้ายบน, คำว่า 'บันทึกข้อความ' กึ่งกลาง */}
            <div className="relative border-b-2 border-slate-900 pb-5 mb-6 print:border-black">
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

              {/* ชั้นความเร็ว */}
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

              {/* ตารางหัวเรื่อง: ส่วนราชการ, ที่, วันที่, เรื่อง */}
              <div className="space-y-2 text-sm sm:text-base pt-1">
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
                  <div className="flex items-baseline gap-2">
                    <strong className="font-bold text-slate-900 print:text-black whitespace-nowrap text-base">
                      ที่
                    </strong>
                    <span className="font-bold text-slate-900 print:text-black flex-1 border-b border-dotted border-slate-300 print:border-transparent pb-0.5">
                      {thaiDocNumber}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <strong className="font-bold text-slate-900 print:text-black whitespace-nowrap text-base">
                      วันที่
                    </strong>
                    <span className="text-slate-800 print:text-black flex-1 border-b border-dotted border-slate-300 print:border-transparent pb-0.5">
                      {thaiIssuedDate}
                    </span>
                  </div>
                </div>

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

            {/* เนื้อความ */}
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

            {/* บล็อกลงนาม */}
            <div className="mt-12 mb-8 flex flex-col items-end pr-6 text-sm sm:text-base print-keep-together">
              <div className="text-center space-y-1 min-w-[240px]">
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
          </div>
        )}

        {/* =========================================================================
            แบบที่ ๒: หนังสือภายนอก (External Official Letter)
           ========================================================================= */}
        {currentType === "external" && (
          <div className="space-y-4">
            {/* ตราครุฑ 3.0 ซม. กึ่งกลางบนสุด */}
            <div className="text-center mb-4">
              <div className="flex justify-center mb-1">
                <GarudaEmblem size="3cm" />
              </div>
            </div>

            {/* แถวที่ 1: 'ที่' ด้านซ้าย และ ส่วนราชการเจ้าของหนังสือ ด้านขวา */}
            <div className="grid grid-cols-2 gap-4 items-start text-sm sm:text-base">
              <div>
                <strong className="font-bold">ที่</strong>{" "}
                <span className="font-bold">{thaiDocNumber}</span>
                {isUrgent && (
                  <div className="mt-1">
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded print:text-black print:border-black print:bg-transparent">
                      {doc.urgency === "most_urgent"
                        ? "ด่วนที่สุด"
                        : doc.urgency === "very_urgent"
                        ? "ด่วนมาก"
                        : "ด่วน"}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-0.5">
                <div className="font-bold">{thaiSenderOrg.split(" โทร.")[0]}</div>
                <div className="text-xs sm:text-sm text-slate-700 print:text-black">
                  ศูนย์ราชการจังหวัดกำแพงเพชร ถนนกำแพงเพชร-สุโขทัย ๖๒๐๐๐
                </div>
              </div>
            </div>

            {/* แถวที่ 2: วันที่ เริ่มจากกึ่งกลางหน้ากระดาษ (50%) */}
            <div className="grid grid-cols-2 gap-4 items-baseline text-sm sm:text-base pt-2">
              <div />
              <div>
                <span className="font-bold">{thaiIssuedDate}</span>
              </div>
            </div>

            {/* เรื่อง, เรียน */}
            <div className="space-y-2 text-sm sm:text-base pt-2 border-t border-slate-200 print:border-transparent">
              <div className="flex items-baseline gap-2">
                <strong className="font-bold whitespace-nowrap">เรื่อง</strong>
                <span className="font-bold">{thaiTitle}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <strong className="font-bold whitespace-nowrap">เรียน</strong>
                <span>
                  {doc.targetCriteria.scope === "all"
                    ? "หัวหน้าส่วนราชการ ข้าราชการ และเจ้าหน้าที่ผู้เกี่ยวข้อง"
                    : `ข้าราชการและเจ้าหน้าที่ในสังกัด (${thaiTotalCount} ท่าน)`}
                </span>
              </div>
              {doc.referenceDoc && (
                <div className="flex items-baseline gap-2 text-xs sm:text-sm text-slate-700 print:text-black">
                  <strong className="font-bold whitespace-nowrap">อ้างถึง</strong>
                  <span>{toThaiDigits(doc.referenceDoc)}</span>
                </div>
              )}
              {doc.attachmentList && (
                <div className="flex items-baseline gap-2 text-xs sm:text-sm text-slate-700 print:text-black">
                  <strong className="font-bold whitespace-nowrap">สิ่งที่ส่งมาด้วย</strong>
                  <span>{toThaiDigits(doc.attachmentList)}</span>
                </div>
              )}
            </div>

            {/* เนื้อความหนังสือภายนอก */}
            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-justify pt-2">
              <p className="indent-10">
                ด้วย {thaiSenderOrg.split(" โทร.")[0]}{" "}
                มีความประสงค์แจ้งเวียนมาตรการและข้อกำหนด เรื่อง <strong>“{thaiTitle}”</strong>{" "}
                เพื่อให้การดำเนินงานด้านการพัฒนาสังคมและการปฏิบัติราชการเป็นไปด้วยความเรียบร้อย
                ถูกต้องตามระเบียบของทางราชการ
              </p>

              {thaiSummary && (
                <p className="indent-10">
                  {thaiSummary}
                </p>
              )}

              {thaiDeadline && (
                <p className="indent-10">
                  ในการนี้ ขอความร่วมมือหน่วยงานและเจ้าหน้าที่ผู้เกี่ยวข้องได้โปรดพิจารณาถือปฏิบัติตามแนวทางดังกล่าว
                  และลงนามรับทราบภายในวันที่ <strong>{thaiDeadline}</strong>
                </p>
              )}

              <p className="indent-10">
                จึงเรียนมาเพื่อโปรดทราบ และพิจารณาดำเนินการต่อไป
              </p>
            </div>

            {/* คำลงท้าย: ขอแสดงความนับถือ เริ่มกึ่งกลางหน้ากระดาษ (50%) */}
            <div className="grid grid-cols-2 gap-4 pt-8 print-keep-together">
              <div />
              <div className="space-y-6">
                <div>ขอแสดงความนับถือ</div>
                <div className="text-center space-y-1">
                  <div className="h-10 flex items-center justify-center italic text-slate-400 select-none print:text-black text-xs">
                    (ลงลายมือชื่อดิจิทัลรับรอง)
                  </div>
                  <div className="font-bold">({doc.createdByName})</div>
                  <div className="text-xs sm:text-sm text-slate-600 print:text-black">
                    พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
                  </div>
                </div>
              </div>
            </div>

            {/* ส่วนราชการเจ้าของเรื่อง (มุมล่างซ้าย) */}
            <div className="pt-8 border-t border-slate-200 print:border-black text-xs text-slate-600 print:text-black space-y-0.5 print-keep-together">
              <div>ฝ่ายบริหารทั่วไป / งานสารบรรณและประสานงาน</div>
              <div>โทรศัพท์ ๐-๕๕๗๐-๕๐๓๑ โทรสาร ๐-๕๕๗๐-๕๐๓๑</div>
              <div>ไปรษณีย์อิเล็กทรอนิกส์: saraban_kamphaengphet@m-society.go.th</div>
            </div>
          </div>
        )}

        {/* =========================================================================
            แบบที่ ๓: หนังสือสั่งการ (คำสั่งราชการ)
           ========================================================================= */}
        {currentType === "command" && (
          <div className="space-y-4">
            {/* ตราครุฑ 3.0 ซม. กึ่งกลางบนสุด */}
            <div className="text-center mb-3">
              <div className="flex justify-center mb-1">
                <GarudaEmblem size="3cm" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 print:text-black mt-2">
                คำสั่ง{thaiSenderOrg.split(" โทร.")[0]}
              </h1>
              <div className="text-sm sm:text-base font-bold text-slate-800 print:text-black mt-1">
                ที่ {thaiDocNumber}
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 print:text-black mt-1">
                เรื่อง {thaiTitle}
              </div>
            </div>

            {/* เนื้อหาคำสั่ง */}
            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-justify pt-4 border-t border-slate-200 print:border-transparent">
              <p className="indent-10">
                เพื่อให้การปฏิบัติงานราชการและการขับเคลื่อนภารกิจของสำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
                เป็นไปด้วยความเรียบร้อย มีประสิทธิภาพ และบรรลุผลสัมฤทธิ์ตามนโยบายของทางราชการ
              </p>

              <p className="indent-10">
                อาศัยอำนาจตามความในพระราชบัญญัติระเบียบบริหารราชการแผ่นดิน พ.ศ. ๒๕๓๔ และที่แก้ไขเพิ่มเติม
                จึงมีคำสั่งกำหนดแนวทางและมอบหมายให้ข้าราชการ พนักงานราชการ และเจ้าหน้าที่ผู้เกี่ยวข้องถือปฏิบัติดังนี้:
              </p>

              {thaiSummary ? (
                <div className="space-y-2 pl-6">
                  <p><strong>ข้อ ๑</strong> {thaiSummary}</p>
                  <p><strong>ข้อ ๒</strong> ให้บุคลากรในสังกัดทุกคนลงนามรับทราบและถือปฏิบัติตามคำสั่งนี้โดยเคร่งครัด</p>
                </div>
              ) : (
                <div className="space-y-2 pl-6">
                  <p><strong>ข้อ ๑</strong> ให้ถือปฏิบัติตามแนวทางและมาตรการตามเอกสารแนบท้ายคำสั่งนี้</p>
                  <p><strong>ข้อ ๒</strong> ให้หัวหน้ากลุ่มงานและผู้รับผิดชอบกำกับดูแลการปฏิบัติงานให้เป็นไปตามเป้าหมาย</p>
                </div>
              )}

              <p className="indent-10 pt-2">
                ทั้งนี้ ตั้งแต่บัดนี้เป็นต้นไป
              </p>
            </div>

            {/* สั่ง ณ วันที่ (เริ่มกึ่งกลางหน้ากระดาษ 50%) */}
            <div className="grid grid-cols-2 gap-4 pt-8 print-keep-together">
              <div />
              <div className="space-y-6">
                <div>สั่ง ณ วันที่ {thaiIssuedDate}</div>
                <div className="text-center space-y-1">
                  <div className="h-10 flex items-center justify-center italic text-slate-400 select-none print:text-black text-xs">
                    (ลงลายมือชื่อดิจิทัลรับรอง)
                  </div>
                  <div className="font-bold">({doc.createdByName})</div>
                  <div className="text-xs sm:text-sm text-slate-600 print:text-black">
                    พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            แบบที่ ๔: หนังสือประชาสัมพันธ์ (ประกาศราชการ)
           ========================================================================= */}
        {currentType === "announcement" && (
          <div className="space-y-4">
            {/* ตราครุฑ 3.0 ซม. กึ่งกลางบนสุด */}
            <div className="text-center mb-3">
              <div className="flex justify-center mb-1">
                <GarudaEmblem size="3cm" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 print:text-black mt-2">
                ประกาศ{thaiSenderOrg.split(" โทร.")[0]}
              </h1>
              <div className="text-base sm:text-lg font-bold text-slate-900 print:text-black mt-1">
                เรื่อง {thaiTitle}
              </div>
            </div>

            {/* เนื้อหาประกาศ */}
            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-justify pt-4 border-t border-slate-200 print:border-transparent">
              <p className="indent-10">
                ด้วย {thaiSenderOrg.split(" โทร.")[0]}{" "}
                มีความประสงค์แจ้งประกาศแนวทาง เรื่อง <strong>“{thaiTitle}”</strong>{" "}
                เพื่อให้บุคลากร เจ้าหน้าที่ และประชาชนผู้รับบริการได้รับทราบข้อมูลและถือปฏิบัติร่วมกัน
              </p>

              {thaiSummary && (
                <p className="indent-10">
                  {thaiSummary}
                </p>
              )}

              {thaiDeadline && (
                <p className="indent-10">
                  จึงขอประกาศให้ทราบโดยทั่วกัน และขอให้ผู้เกี่ยวข้องดำเนินการภายในวันที่{" "}
                  <strong>{thaiDeadline}</strong>
                </p>
              )}

              <p className="indent-10 pt-2">
                จึงประกาศให้ทราบโดยทั่วกัน
              </p>
            </div>

            {/* ประกาศ ณ วันที่ (เริ่มกึ่งกลางหน้ากระดาษ 50%) */}
            <div className="grid grid-cols-2 gap-4 pt-8 print-keep-together">
              <div />
              <div className="space-y-6">
                <div>ประกาศ ณ วันที่ {thaiIssuedDate}</div>
                <div className="text-center space-y-1">
                  <div className="h-10 flex items-center justify-center italic text-slate-400 select-none print:text-black text-xs">
                    (ลงลายมือชื่อดิจิทัลรับรอง)
                  </div>
                  <div className="font-bold">({doc.createdByName})</div>
                  <div className="text-xs sm:text-sm text-slate-600 print:text-black">
                    พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── ท้ายกระดาษรับรองอิเล็กทรอนิกส์ & QR CODE VERIFICATION ─── */}
        {showVerificationSeal && (
          <div className="mt-8 pt-4 border-t border-slate-300 print:border-black flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 print:text-black bg-slate-50 print:bg-transparent p-3 rounded-xl print-keep-together">
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
    </div>
  );
}
