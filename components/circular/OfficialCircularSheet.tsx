"use client";

import React, { useState, useRef, useEffect } from "react";
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
 * 1. "memo": หนังสือภายใน (บันทึกข้อความ) - ครุฑ ๑.๕ ซม. มุมซ้ายบน, วันที่กึ่งกลางหน้ากระดาษ (50%)
 * 2. "external": หนังสือภายนอก - ครุฑ ๓.๐ ซม. กึ่งกลางบนสุด, วันที่กึ่งกลาง, คำลงท้ายขอแสดงความนับถือ
 * 3. "command": หนังสือสั่งการ (คำสั่ง) - ครุฑ ๓.๐ ซม. กึ่งกลาง, คำสั่ง..., ที่..., เรื่อง..., สั่ง ณ วันที่ (50%)
 * 4. "announcement": หนังสือประชาสัมพันธ์ (ประกาศ) - ครุฑ ๓.๐ ซม. กึ่งกลาง, ประกาศ..., เรื่อง..., ประกาศ ณ วันที่ (50%)
 *
 * การตั้งค่าหน้ากระดาษ A4 มาตรฐานราชการ:
 * - ขอบบน ๒.๕ ซม. | ขอบซ้าย ๓.๐ ซม. | ขอบขวา ๒.๐ ซม. | ขอบล่าง ๒.๐ ซม.
 * - แบบอักษรมาตรฐาน: TH Sarabun PSK / New / Sarabun ๑๖pt (หัวเรื่อง ๒๙pt, รายการ ๒๐pt)
 * - ย่อหน้ามาตรฐาน: ๒.๕ เซนติเมตร
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
  const [showMarginGuides, setShowMarginGuides] = useState<boolean>(false);
  const [zoomMode, setZoomMode] = useState<"fit" | "100" | "75">("fit");
  const [fitScale, setFitScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateFitScale = () => {
      if (!containerRef.current) return;
      const availableWidth = containerRef.current.clientWidth - 24;
      const a4WidthPx = 794; // approx 210mm in px at 96dpi
      if (availableWidth > 0 && availableWidth < a4WidthPx) {
        setFitScale(Math.max(0.35, Math.min(1, availableWidth / a4WidthPx)));
      } else {
        setFitScale(1);
      }
    };

    updateFitScale();
    window.addEventListener("resize", updateFitScale);
    return () => window.removeEventListener("resize", updateFitScale);
  }, []);

  const activeScale = zoomMode === "fit" ? fitScale : zoomMode === "75" ? 0.75 : 1;

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* ─── TEMPLATE & PRINT CONTROL TOOLBAR (ซ่อนเมื่อสั่งพิมพ์) ─── */}
      <div className="w-full max-w-[210mm] mb-4 space-y-2.5 print:hidden">
        {/* Top Control Bar */}
        <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          {allowTypeSwitching && !forcedType ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500 font-bold px-1.5 flex items-center gap-1">
                <span>📑</span>
                <span>รูปแบบหนังสือราชการ:</span>
              </span>
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
          ) : (
            <div className="flex items-center gap-2 font-bold text-slate-700 px-2">
              <span>📄</span>
              <span>
                {currentType === "memo"
                  ? "หนังสือภายใน (บันทึกข้อความ)"
                  : currentType === "external"
                  ? "หนังสือภายนอก"
                  : currentType === "command"
                  ? "คำสั่งราชการ"
                  : "ประกาศราชการ"}
              </span>
            </div>
          )}

          {/* Quick Actions: Zoom / Fit & Margins & Direct Print */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Viewport Zoom & Auto-Fit Controller */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 px-1.5 flex items-center gap-1">
                <span>🔍</span>
                <span className="hidden sm:inline">มุมมอง:</span>
              </span>
              <button
                type="button"
                onClick={() => setZoomMode("fit")}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  zoomMode === "fit"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="ปรับขนาดกระดาษให้พอดีกับหน้าจอมือถือ/แท็บเล็ตอัตโนมัติ"
              >
                พอดีจอ {fitScale < 0.98 ? `(${Math.round(fitScale * 100)}%)` : ""}
              </button>
              <button
                type="button"
                onClick={() => setZoomMode("75")}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  zoomMode === "75"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="ขนาด 75%"
              >
                ๗๕%
              </button>
              <button
                type="button"
                onClick={() => setZoomMode("100")}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  zoomMode === "100"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="ขนาดจริง 100% (A4 210mm)"
              >
                ๑๐๐%
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowMarginGuides(!showMarginGuides)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                showMarginGuides
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                  : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
              title="แสดง/ซ่อนเส้นจำลองระยะขอบกระดาษจริงตามระเบียบสารบรรณ"
            >
              <span>📐</span>
              <span className="hidden sm:inline">{showMarginGuides ? "ซ่อนเส้นขอบ A4" : "ตรวจระยะขอบ A4"}</span>
              <span className="sm:hidden">{showMarginGuides ? "ซ่อนขอบ" : "ขอบ A4"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5 active:scale-98"
            >
              <span>🖨️</span>
              <span>พิมพ์ / บันทึก PDF</span>
            </button>
          </div>
        </div>

        {/* Regulatory Compliance Guidance Banner */}
        <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚖️</span>
            <span className="font-bold text-slate-700">มาตรฐานงานสารบรรณ (A4):</span>
            <span className="text-slate-500">
              ขอบบน ๒.๕ ซม. • ขอบซ้าย ๓.๐ ซม. • ขอบขวา ๒.๐ ซม. • ขอบล่าง ๒.๐ ซม.
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span>ขนาดมาตรฐาน 16px (พิมพ์ ๑๖pt)</span>
            <span>•</span>
            <span>ย่อหน้า ๒.๕ ซม.</span>
          </div>
        </div>
      </div>

      {/* ─── RESPONSIVE SCROLL & VIEWPORT CONTAINER ─── */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto flex flex-col items-center py-2 px-1 min-w-0"
      >
        <div
          style={{
            width: activeScale < 1 ? `calc(210mm * ${activeScale})` : "210mm",
            height: activeScale < 1 ? `calc(297mm * ${activeScale} + 24px)` : "auto",
            overflow: "visible",
            transition: "width 0.2s ease-in-out, height 0.2s ease-in-out",
          }}
          className="flex justify-center print:!w-full print:!h-auto print:!overflow-visible"
        >
          {/* ─── OFFICIAL DOCUMENT PAPER (EXACT A4 ONLY: 210mm x 297mm) ─── */}
          <div
            style={{
              fontFamily: "'Sarabun', 'TH Sarabun New', 'TH Sarabun PSK', sans-serif",
              width: "210mm",
              minHeight: "297mm",
              transform: activeScale < 1 ? `scale(${activeScale})` : "none",
              transformOrigin: "top center",
              transition: "transform 0.2s ease-in-out",
            }}
            className={`gov-a4-sheet relative bg-white text-black rounded-lg border border-slate-300 shadow-xl print:!transform-none ${
              showMarginGuides ? "ring-2 ring-indigo-500/50" : ""
            } ${className}`}
          >
        {/* Visual Margins Overlay Guide (แสดงเฉพาะเมื่อเปิดโหมดตรวจระยะ) */}
        {showMarginGuides && (
          <div className="absolute inset-0 pointer-events-none print:hidden z-10">
            {/* Top margin guide 2.5cm */}
            <div className="absolute top-0 left-0 right-0 h-[25mm] border-b border-dashed border-indigo-400/80 bg-indigo-50/15 flex items-center justify-center">
              <span className="text-[10px] font-bold text-indigo-700 bg-white/95 px-2 py-0.5 rounded shadow-2xs">
                ขอบบน ๒.๕ ซม. (25 mm)
              </span>
            </div>
            {/* Left margin guide 3.0cm */}
            <div className="absolute top-0 bottom-0 left-0 w-[30mm] border-r border-dashed border-indigo-400/80 bg-indigo-50/15 flex items-center justify-center">
              <span className="text-[10px] font-bold text-indigo-700 bg-white/95 px-2 py-0.5 rounded shadow-2xs -rotate-90">
                ขอบซ้าย ๓.๐ ซม. (30 mm)
              </span>
            </div>
            {/* Right margin guide 2.0cm */}
            <div className="absolute top-0 bottom-0 right-0 w-[20mm] border-l border-dashed border-indigo-400/80 bg-indigo-50/15 flex items-center justify-center">
              <span className="text-[10px] font-bold text-indigo-700 bg-white/95 px-2 py-0.5 rounded shadow-2xs rotate-90">
                ขอบขวา ๒.๐ ซม. (20 mm)
              </span>
            </div>
            {/* Bottom margin guide 2.0cm */}
            <div className="absolute bottom-0 left-0 right-0 h-[20mm] border-t border-dashed border-indigo-400/80 bg-indigo-50/15 flex items-center justify-center">
              <span className="text-[10px] font-bold text-indigo-700 bg-white/95 px-2 py-0.5 rounded shadow-2xs">
                ขอบล่าง ๒.๐ ซม. (20 mm)
              </span>
            </div>
          </div>
        )}

        {/* ชั้นความลับ (ถ้ามี) กึ่งกลางบนสุด */}
        {doc.secretLevel !== "normal" && (
          <div className="text-center mb-3">
            <span className="gov-secret-badge">
              {doc.secretLevel === "top_secret" ? "ลับที่สุด" : "ลับ"}
            </span>
          </div>
        )}

        {/* =========================================================================
            แบบที่ ๑: หนังสือภายใน (บันทึกข้อความ)
           ========================================================================= */}
        {currentType === "memo" && (
          <div>
            {/* ส่วนหัว: ตราครุฑ 1.5 ซม. ซ้ายบน, ตราประทับด่วนระหว่างครุฑกับบันทึกข้อความ, คำว่า 'บันทึกข้อความ' 29pt กึ่งกลาง */}
            <div className="relative border-b-2 border-slate-900 pb-3 mb-4 print:border-black">
              <div className="relative flex items-center min-h-[48px] mb-2">
                {/* ฝั่งซ้าย: ตราครุฑ ๑.๕ ซม. พร้อมตราประทับชั้นความเร็วสีแดงอยู่ระหว่างครุฑกับบันทึกข้อความ */}
                <div className="flex items-center gap-3 z-10">
                  <div className="w-16 shrink-0 flex items-center">
                    <GarudaEmblem size="1.5cm" />
                  </div>
                  {isUrgent && (
                    <span className="gov-urgency-badge whitespace-nowrap">
                      {doc.urgency === "most_urgent"
                        ? "ด่วนที่สุด"
                        : doc.urgency === "very_urgent"
                        ? "ด่วนมาก"
                        : "ด่วน"}
                    </span>
                  )}
                </div>

                {/* คำว่า 'บันทึกข้อความ' กึ่งกลางหน้ากระดาษเป๊ะ */}
                <div className="absolute inset-x-0 text-center pointer-events-none">
                  <h1 className="gov-font-memo-title text-slate-900 print:text-black inline-block pointer-events-auto">
                    บันทึกข้อความ
                  </h1>
                </div>
              </div>

              {/* ตารางหัวเรื่อง: ส่วนราชการ, ที่, วันที่, เรื่อง */}
              <div className="space-y-1.5 pt-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <strong className="gov-font-field-label text-slate-900 print:text-black whitespace-nowrap">
                    ส่วนราชการ
                  </strong>
                  <span className="gov-font-field-value text-slate-900 print:text-black flex-1 border-b border-dotted border-slate-300 print:border-transparent pb-0.5">
                    {thaiSenderOrg}
                  </span>
                </div>

                {/* บรรทัด 'ที่' (ซ้าย) และ 'วันที่' (เริ่มกึ่งกลางหน้ากระดาษ 50% พอดี) */}
                <div className="gov-midpoint-grid gap-4 items-baseline">
                  <div className="flex items-baseline gap-2">
                    <strong className="gov-font-field-label text-slate-900 print:text-black whitespace-nowrap">
                      ที่
                    </strong>
                    <span className="gov-font-field-value font-bold text-slate-900 print:text-black flex-1 border-b border-dotted border-slate-300 print:border-transparent pb-0.5">
                      {thaiDocNumber}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <strong className="gov-font-field-label text-slate-900 print:text-black whitespace-nowrap">
                      วันที่
                    </strong>
                    <span className="gov-font-field-value text-slate-900 print:text-black flex-1 border-b border-dotted border-slate-300 print:border-transparent pb-0.5">
                      {thaiIssuedDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 pt-1">
                  <strong className="gov-font-subject-label text-slate-900 print:text-black whitespace-nowrap text-[16px]">
                    เรื่อง
                  </strong>
                  <span className="gov-font-subject-value font-bold text-slate-900 print:text-black flex-1 text-[16px]">
                    {thaiTitle}
                  </span>
                </div>
              </div>
            </div>

            {/* คำขึ้นต้น: เรียน */}
            <div className="mb-4 flex items-baseline gap-2">
              <strong className="font-bold text-slate-900 print:text-black whitespace-nowrap text-[16px] print:text-[16pt]">
                เรียน
              </strong>
              <span className="gov-body-text text-slate-900 print:text-black">
                {doc.targetCriteria.scope === "all"
                  ? "ข้าราชการ พนักงานราชการ และเจ้าหน้าที่ในสังกัด พมจ.กำแพงเพชร ทุกคน"
                  : `ข้าราชการและเจ้าหน้าที่ผู้เกี่ยวข้อง (${thaiTotalCount} ท่าน)`}
              </span>
            </div>

            {/* เนื้อความ */}
            <div className="space-y-4 gov-body-text text-slate-900 print:text-black">
              <p className="gov-indent-para">
                ด้วย {thaiSenderOrg.split(" โทร.")[0]}{" "}
                มีความประสงค์แจ้งเวียนแนวทางและข้อกำหนด เรื่อง <strong>“{thaiTitle}”</strong>{" "}
                เพื่อให้การปฏิบัติราชการของหน่วยงานและบุคลากรทุกกลุ่มงานดำเนินไปด้วยความเรียบร้อย
                ถูกต้องตามระเบียบของทางราชการ และบรรลุวัตถุประสงค์การยกระดับบริการประชาชนกลุ่มเปราะบางในพื้นที่จังหวัดกำแพงเพชร
              </p>

              {thaiSummary ? (
                <div className="my-3 p-4 rounded-xl bg-slate-50 border border-slate-200 indent-0 print:bg-transparent print:border-slate-400 print:p-2">
                  <div className="font-bold text-slate-900 print:text-black mb-1">
                    📌 สาระสำคัญและแนวทางถือปฏิบัติ:
                  </div>
                  <p className="text-slate-800 print:text-black leading-relaxed">
                    {thaiSummary}
                  </p>
                </div>
              ) : (
                <p className="gov-indent-para">
                  ขอให้ผู้มีรายชื่อตามบัญชีผู้รับหนังสือเวียนฉบับนี้ ได้ศึกษาเนื้อหาข้อความในเอกสารแนบต้นฉบับอย่างละเอียด
                  และถือปฏิบัติตามแนวทางที่กำหนดโดยเคร่งครัด
                </p>
              )}

              {thaiDeadline && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 print:bg-transparent print:text-black print:border-slate-400 indent-0 font-medium">
                  ⏰ <strong>กำหนดระยะเวลาดำเนินการ:</strong> ขอให้ลงนามรับทราบและถือปฏิบัติตามหนังสือเวียนฉบับนี้ภายในวันที่{" "}
                  <strong>{thaiDeadline}</strong>
                </div>
              )}

              <p className="gov-indent-para pt-2">
                จึงเรียนมาเพื่อโปรดทราบ และถือปฏิบัติต่อไป
              </p>
            </div>

            {/* บล็อกลงนาม: เริ่มต้นจากกึ่งกลางหน้ากระดาษ (50%) ไปทางขวา */}
            <div className="mt-12 mb-6 gov-midpoint-grid print-keep-together">
              <div />
              <div className="text-center space-y-1">
                <div className="h-12 flex items-center justify-center">
                  <span className="text-xs italic text-slate-400 border-b border-dotted border-slate-400 px-6 py-1 select-none print:text-black">
                    (ลงชื่อผ่านระบบสารบรรณอิเล็กทรอนิกส์)
                  </span>
                </div>
                <div className="font-bold text-slate-900 print:text-black pt-1 text-[16px] print:text-[16pt]">
                  ({doc.createdByName})
                </div>
                <div className="text-[14px] print:text-[14pt] text-slate-700 print:text-black">
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

            {/* แถวที่ 1: 'ที่' ด้านซ้าย (พร้อมตราประทับด่วนอยู่เหนือ 'ที่') และ ส่วนราชการ ด้านขวา (เริ่มกึ่งกลาง 50%) */}
            <div className="gov-midpoint-grid gap-4 items-start">
              <div>
                {/* ตราประทับชั้นความเร็ว: อยู่มุมซ้ายบน เหนือคำว่า 'ที่' */}
                {isUrgent && (
                  <div className="mb-1.5">
                    <span className="gov-urgency-badge">
                      {doc.urgency === "most_urgent"
                        ? "ด่วนที่สุด"
                        : doc.urgency === "very_urgent"
                        ? "ด่วนมาก"
                        : "ด่วน"}
                    </span>
                  </div>
                )}
                <div>
                  <span className="gov-font-field-label">ที่</span>{" "}
                  <span className="gov-font-field-value font-bold">{thaiDocNumber}</span>
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-[16px] print:text-[16pt]">{thaiSenderOrg.split(" โทร.")[0]}</div>
                <div className="text-[14px] print:text-[14pt] text-slate-700 print:text-black">
                  ศูนย์ราชการจังหวัดกำแพงเพชร ถนนกำแพงเพชร-สุโขทัย ๖๒๐๐๐
                </div>
              </div>
            </div>

            {/* แถวที่ 2: วันที่ เริ่มจากกึ่งกลางหน้ากระดาษ (50%) */}
            <div className="gov-midpoint-grid gap-4 items-baseline pt-2">
              <div />
              <div>
                <span className="font-bold text-[16px] print:text-[16pt]">{thaiIssuedDate}</span>
              </div>
            </div>

            {/* เรื่อง, เรียน */}
            <div className="space-y-2 pt-2 border-t border-slate-200 print:border-transparent">
              <div className="flex items-baseline gap-2">
                <strong className="gov-font-subject-label whitespace-nowrap text-[16px]">เรื่อง</strong>
                <span className="gov-font-subject-value font-bold text-[16px]">{thaiTitle}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <strong className="font-bold text-[16px] print:text-[16pt] whitespace-nowrap">เรียน</strong>
                <span className="text-[16px] print:text-[16pt]">
                  {doc.targetCriteria.scope === "all"
                    ? "หัวหน้าส่วนราชการ ข้าราชการ และเจ้าหน้าที่ผู้เกี่ยวข้อง"
                    : `ข้าราชการและเจ้าหน้าที่ในสังกัด (${thaiTotalCount} ท่าน)`}
                </span>
              </div>
              {doc.referenceDoc && (
                <div className="flex items-baseline gap-2 text-[14px] print:text-[14pt] text-slate-700 print:text-black">
                  <strong className="font-bold whitespace-nowrap">อ้างถึง</strong>
                  <span>{toThaiDigits(doc.referenceDoc)}</span>
                </div>
              )}
              {doc.attachmentList && (
                <div className="flex items-baseline gap-2 text-[14px] print:text-[14pt] text-slate-700 print:text-black">
                  <strong className="font-bold whitespace-nowrap">สิ่งที่ส่งมาด้วย</strong>
                  <span>{toThaiDigits(doc.attachmentList)}</span>
                </div>
              )}
            </div>

            {/* เนื้อความหนังสือภายนอก */}
            <div className="space-y-4 gov-body-text pt-2 text-slate-900 print:text-black">
              <p className="gov-indent-para">
                ด้วย {thaiSenderOrg.split(" โทร.")[0]}{" "}
                มีความประสงค์แจ้งเวียนมาตรการและข้อกำหนด เรื่อง <strong>“{thaiTitle}”</strong>{" "}
                เพื่อให้การดำเนินงานด้านการพัฒนาสังคมและการปฏิบัติราชการเป็นไปด้วยความเรียบร้อย
                ถูกต้องตามระเบียบของทางราชการ
              </p>

              {thaiSummary && (
                <p className="gov-indent-para">
                  {thaiSummary}
                </p>
              )}

              {thaiDeadline && (
                <p className="gov-indent-para">
                  ในการนี้ ขอความร่วมมือหน่วยงานและเจ้าหน้าที่ผู้เกี่ยวข้องได้โปรดพิจารณาถือปฏิบัติตามแนวทางดังกล่าว
                  และลงนามรับทราบภายในวันที่ <strong>{thaiDeadline}</strong>
                </p>
              )}

              <p className="gov-indent-para pt-2">
                จึงเรียนมาเพื่อโปรดทราบ และพิจารณาดำเนินการต่อไป
              </p>
            </div>

            {/* คำลงท้าย: ขอแสดงความนับถือ เริ่มกึ่งกลางหน้ากระดาษ (50%) */}
            <div className="gov-midpoint-grid pt-6 print-keep-together">
              <div />
              <div className="space-y-6">
                <div className="text-[16px] print:text-[16pt]">ขอแสดงความนับถือ</div>
                <div className="text-center space-y-1">
                  <div className="h-10 flex items-center justify-center italic text-slate-400 select-none print:text-black text-xs">
                    (ลงลายมือชื่อดิจิทัลรับรอง)
                  </div>
                  <div className="font-bold text-[16px] print:text-[16pt]">({doc.createdByName})</div>
                  <div className="text-[14px] print:text-[14pt] text-slate-600 print:text-black">
                    พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
                  </div>
                </div>
              </div>
            </div>

            {/* ส่วนราชการเจ้าของเรื่องและเบอร์โทรศัพท์ ด้านล่างซ้าย */}
            <div className="pt-8 border-t border-slate-100 print:border-transparent text-[13px] print:text-[13pt] text-slate-600 print:text-black space-y-0.5 print-keep-together">
              <div className="font-bold">{thaiSenderOrg}</div>
              <div>โทรศัพท์ ๐ ๕๕๗๐ ๕๐๒๙ โทรสาร ๐ ๕๕๗๐ ๕๐๓๐</div>
              <div>ไปรษณีย์อิเล็กทรอนิกส์: saraban_kamphaengphet@m-society.go.th</div>
            </div>
          </div>
        )}

        {/* =========================================================================
            แบบที่ ๓: หนังสือสั่งการ (คำสั่งราชการ)
           ========================================================================= */}
        {currentType === "command" && (
          <div className="space-y-4">
            {/* ตราครุฑ 3.0 ซม. กึ่งกลางบนสุด พร้อมตราประทับชั้นความเร็วมุมซ้ายบน */}
            <div className="relative text-center mb-3">
              {isUrgent && (
                <div className="absolute left-0 top-0 text-left">
                  <span className="gov-urgency-badge">
                    {doc.urgency === "most_urgent"
                      ? "ด่วนที่สุด"
                      : doc.urgency === "very_urgent"
                      ? "ด่วนมาก"
                      : "ด่วน"}
                  </span>
                </div>
              )}
              <div className="flex justify-center mb-1">
                <GarudaEmblem size="3cm" />
              </div>
              <h1 className="gov-font-memo-title text-slate-900 print:text-black mt-2">
                คำสั่ง{thaiSenderOrg.split(" โทร.")[0]}
              </h1>
              <div className="gov-font-field-label text-slate-800 print:text-black mt-1">
                ที่ {thaiDocNumber}
              </div>
              <div className="gov-font-subject-label text-slate-900 print:text-black mt-1 text-[16px]">
                เรื่อง {thaiTitle}
              </div>
            </div>

            {/* เนื้อหาคำสั่ง */}
            <div className="space-y-4 gov-body-text pt-4 border-t border-slate-200 print:border-transparent text-slate-900 print:text-black">
              <p className="gov-indent-para">
                เพื่อให้การปฏิบัติงานราชการและการขับเคลื่อนภารกิจของสำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
                เป็นไปด้วยความเรียบร้อย มีประสิทธิภาพ และบรรลุผลสัมฤทธิ์ตามนโยบายของทางราชการ
              </p>

              <p className="gov-indent-para">
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

              <p className="gov-indent-para pt-2">
                ทั้งนี้ ตั้งแต่บัดนี้เป็นต้นไป
              </p>
            </div>

            {/* สั่ง ณ วันที่ (เริ่มกึ่งกลางหน้ากระดาษ 50%) */}
            <div className="gov-midpoint-grid gap-4 pt-8 print-keep-together">
              <div />
              <div className="space-y-6">
                <div className="text-[16px] print:text-[16pt]">สั่ง ณ วันที่ {thaiIssuedDate}</div>
                <div className="text-center space-y-1">
                  <div className="h-10 flex items-center justify-center italic text-slate-400 select-none print:text-black text-xs">
                    (ลงลายมือชื่อดิจิทัลรับรอง)
                  </div>
                  <div className="font-bold text-[16px] print:text-[16pt]">({doc.createdByName})</div>
                  <div className="text-[14px] print:text-[14pt] text-slate-600 print:text-black">
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
            {/* ตราครุฑ 3.0 ซม. กึ่งกลางบนสุด พร้อมตราประทับชั้นความเร็วมุมซ้ายบน */}
            <div className="relative text-center mb-3">
              {isUrgent && (
                <div className="absolute left-0 top-0 text-left">
                  <span className="gov-urgency-badge">
                    {doc.urgency === "most_urgent"
                      ? "ด่วนที่สุด"
                      : doc.urgency === "very_urgent"
                      ? "ด่วนมาก"
                      : "ด่วน"}
                  </span>
                </div>
              )}
              <div className="flex justify-center mb-1">
                <GarudaEmblem size="3cm" />
              </div>
              <h1 className="gov-font-memo-title text-slate-900 print:text-black mt-2">
                ประกาศ{thaiSenderOrg.split(" โทร.")[0]}
              </h1>
              <div className="gov-font-subject-label text-slate-900 print:text-black mt-1 text-[16px]">
                เรื่อง {thaiTitle}
              </div>
            </div>

            {/* เนื้อหาประกาศ */}
            <div className="space-y-4 gov-body-text pt-4 border-t border-slate-200 print:border-transparent text-slate-900 print:text-black">
              <p className="gov-indent-para">
                ด้วย {thaiSenderOrg.split(" โทร.")[0]}{" "}
                มีความประสงค์แจ้งประกาศแนวทาง เรื่อง <strong>“{thaiTitle}”</strong>{" "}
                เพื่อให้บุคลากร เจ้าหน้าที่ และประชาชนผู้รับบริการได้รับทราบข้อมูลและถือปฏิบัติร่วมกัน
              </p>

              {thaiSummary && (
                <p className="gov-indent-para">
                  {thaiSummary}
                </p>
              )}

              {thaiDeadline && (
                <p className="gov-indent-para">
                  จึงขอประกาศให้ทราบโดยทั่วกัน และขอให้ผู้เกี่ยวข้องดำเนินการภายในวันที่{" "}
                  <strong>{thaiDeadline}</strong>
                </p>
              )}

              <p className="gov-indent-para pt-2">
                จึงประกาศให้ทราบโดยทั่วกัน
              </p>
            </div>

            {/* ประกาศ ณ วันที่ (เริ่มกึ่งกลางหน้ากระดาษ 50%) */}
            <div className="gov-midpoint-grid gap-4 pt-8 print-keep-together">
              <div />
              <div className="space-y-6">
                <div className="text-[16px] print:text-[16pt]">ประกาศ ณ วันที่ {thaiIssuedDate}</div>
                <div className="text-center space-y-1">
                  <div className="h-10 flex items-center justify-center italic text-slate-400 select-none print:text-black text-xs">
                    (ลงลายมือชื่อดิจิทัลรับรอง)
                  </div>
                  <div className="font-bold text-[16px] print:text-[16pt]">({doc.createdByName})</div>
                  <div className="text-[14px] print:text-[14pt] text-slate-600 print:text-black">
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
      </div>
    </div>
  );
}
