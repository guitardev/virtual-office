"use client";

import React from "react";
import { CircularDocument } from "@/lib/types";

interface OfficialCircularSheetProps {
  document: CircularDocument;
  showVerificationSeal?: boolean;
}

export function OfficialCircularSheet({
  document: doc,
  showVerificationSeal = true,
}: OfficialCircularSheetProps) {
  const isUrgent = doc.urgency !== "normal";

  return (
    <div className="w-full max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-sm text-slate-900 font-serif relative">
      {/* Official Government Memorandum Header */}
      <div className="relative border-b-2 border-slate-900 pb-6 mb-6">
        {/* Garuda Crest Symbol */}
        <div className="flex flex-col items-center justify-center text-center mb-3">
          <div className="text-5xl select-none mb-1 leading-none" title="ตราครุฑระเบียบงานสารบรรณ">
            🦅
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-wide font-sans text-slate-900">
            บันทึกข้อความ (หนังสือเวียนราชการ)
          </h1>
          <p className="text-xs font-sans text-slate-600 mt-0.5">
            ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ (ฉบับอิเล็กทรอนิกส์)
          </p>
        </div>

        {/* Urgency and Secret Badges on Top-Left */}
        <div className="absolute top-0 left-0 flex flex-col gap-1 font-sans text-xs">
          {isUrgent && (
            <span className="px-2.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold">
              {doc.urgency === "most_urgent"
                ? "🚨 ด่วนที่สุด"
                : doc.urgency === "very_urgent"
                ? "⚡⚡ ด่วนมาก"
                : "⚡ ด่วน"}
            </span>
          )}
          {doc.secretLevel !== "normal" && (
            <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold">
              {doc.secretLevel === "top_secret" ? "🔐 ลับที่สุด" : "🔒 ลับ"}
            </span>
          )}
        </div>

        {/* Government Heading Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-sans pt-4">
          <div>
            <strong className="text-slate-900">ส่วนราชการ:</strong>{" "}
            <span className="text-slate-800">{doc.senderOrg || "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"}</span>
          </div>
          <div className="sm:text-right">
            <strong className="text-slate-900">โทรศัพท์/โทรสาร:</strong>{" "}
            <span className="text-slate-700">๐-๕๕๗๐-๕๐๓๑</span>
          </div>
          <div>
            <strong className="text-slate-900">ที่:</strong>{" "}
            <span className="font-mono font-bold text-indigo-900">{doc.docNumber}</span>
          </div>
          <div className="sm:text-right">
            <strong className="text-slate-900">วันที่:</strong>{" "}
            <span className="text-slate-800">{doc.issuedDate}</span>
          </div>
        </div>

        <div className="text-xs sm:text-sm font-sans pt-2">
          <strong className="text-slate-900">เรื่อง:</strong>{" "}
          <span className="font-bold text-slate-900 text-sm sm:text-base">{doc.title}</span>
        </div>
      </div>

      {/* Salutation (เรียน) */}
      <div className="text-xs sm:text-sm font-sans mb-4">
        <strong className="text-slate-900">เรียน:</strong>{" "}
        <span className="text-slate-800">
          {doc.targetCriteria.scope === "all"
            ? "ข้าราชการ พนักงานราชการ และเจ้าหน้าที่ในสังกัด พมจ.กำแพงเพชร ทุกคน"
            : `ข้าราชการและเจ้าหน้าที่ผู้เกี่ยวข้อง (${doc.totalCount} ท่าน)`}
        </span>
      </div>

      {/* Document Body Text */}
      <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-800 text-justify indent-8 font-sans">
        <p>
          ด้วย {doc.senderOrg || "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"}{" "}
          มีความประสงค์แจ้งเวียนแนวทางและข้อกำหนด เรื่อง <strong>“{doc.title}”</strong>{" "}
          เพื่อให้การปฏิบัติราชการของหน่วยงานและบุคลากรทุกกลุ่มงานดำเนินไปด้วยความเรียบร้อย ถูกต้องตามระเบียบของทางราชการ
          และบรรลุวัตถุประสงค์การยกระดับบริการประชาชนกลุ่มเปราะบางในพื้นที่จังหวัดกำแพงเพชร
        </p>

        {doc.summary ? (
          <div className="my-3 p-4 rounded-xl bg-slate-50 border border-slate-200 indent-0">
            <div className="font-bold text-slate-900 text-xs mb-1">📌 สาระสำคัญและแนวทางถือปฏิบัติ:</div>
            <p className="text-xs text-slate-700 leading-normal">{doc.summary}</p>
          </div>
        ) : (
          <p>
            ขอให้ผู้มีรายชื่อตามบัญชีผู้รับหนังสือเวียนฉบับนี้ ได้ศึกษาเนื้อหาข้อความในเอกสารแนบต้นฉบับอย่างละเอียด
            และถือปฏิบัติตามแนวทางที่กำหนดโดยเคร่งครัด
          </p>
        )}

        {doc.deadline && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs indent-0 font-medium">
            ⏰ <strong>กำหนดระยะเวลาดำเนินการ:</strong> ขอให้ลงนามรับทราบและถือปฏิบัติตามหนังสือเวียนฉบับนี้ภายในวันที่{" "}
            <strong>{doc.deadline.includes("T") ? new Date(doc.deadline).toLocaleDateString("th-TH") : doc.deadline}</strong>
          </div>
        )}

        <p className="indent-8 pt-2">
          จึงเรียนมาเพื่อโปรดทราบ และถือปฏิบัติต่อไป
        </p>
      </div>

      {/* Signatory Section */}
      <div className="mt-12 mb-6 flex flex-col items-end pr-8 text-xs sm:text-sm font-sans">
        <div className="text-center space-y-1">
          <div className="h-10 flex items-center justify-center italic text-slate-400 select-none">
            (ลงลายมือชื่อดิจิทัลรับรอง)
          </div>
          <div className="font-bold text-slate-900">({doc.createdByName})</div>
          <div className="text-xs text-slate-600">{doc.senderOrg}</div>
          <div className="text-[11px] text-slate-400">
            ลงนามเมื่อ {new Date(doc.createdAt).toLocaleDateString("th-TH")}
          </div>
        </div>
      </div>

      {/* Electronic Government Verification Footer / Seal */}
      {showVerificationSeal && (
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-500 font-sans bg-slate-50 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold text-sm">🔒</span>
            <div>
              <div className="font-bold text-slate-700">ระบบเอกสารราชการอิเล็กทรอนิกส์ Smart MSO (พมจ.กำแพงเพชร)</div>
              <div>รหัสเอกสารอ้างอิง: <span className="font-mono">{doc.id}</span> • วันที่ออกหนังสือ: {new Date(doc.createdAt).toLocaleString("th-TH")}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-right">
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
              ความปลอดภัย Zero Trust
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
