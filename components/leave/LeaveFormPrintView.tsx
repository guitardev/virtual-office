"use client";

import React from "react";
import {
  formatThaiDateFull,
  formatThaiDateParts,
  formatThaiDateSlash,
  LEAVE_DAY_PERIOD_SHORT,
  LEAVE_TYPE_META,
  LeaveRequestItem,
  LeaveType,
} from "@/lib/leave-utils";

interface LeaveFormPrintViewProps {
  leave: LeaveRequestItem;
  printRef?: React.RefObject<HTMLDivElement | null>;
}

function formatWrittenAtShort(writtenAt?: string | null): string {
  const trimmed = (writtenAt || "").trim();
  if (
    !trimmed ||
    trimmed === "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร" ||
    trimmed === "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์ จังหวัดกำแพงเพชร"
  ) {
    return "สนง.พมจ.กำแพงเพชร";
  }
  return trimmed;
}

function formatActingPersonText(actingPersonName?: string | null): string {
  const trimmed = (actingPersonName || "").trim();
  if (trimmed) {
    return `${trimmed} ปฏิบัติหน้าที่แทน`;
  }
  return "นาย/นาง/นางสาว .................................. ปฏิบัติหน้าที่แทน";
}

function renderSplitPosition(position?: string | null): React.ReactNode {
  const raw = (position || "").trim();
  if (!raw) return null;
  if (raw.length > 35 && raw.includes("จังหวัด")) {
    const idx = raw.indexOf("จังหวัด");
    const before = raw.slice(0, idx).trimEnd();
    const after = raw.slice(idx);
    if (before && after) {
      return (
        <>
          {before}
          <br />
          {after}
        </>
      );
    }
  }
  return raw;
}

function CheckboxBox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 mr-4">
      <span className="inline-flex items-center justify-center w-4 h-4 border border-slate-800 text-[12px] leading-none font-bold">
        {checked ? "✓" : ""}
      </span>
      <span>{label}</span>
    </span>
  );
}

function SignatureBlock({
  signatureUrl,
  signed: _signed,
  signerName,
  position,
  dateStr,
  suffix,
  align = "center",
  positionPrefix = "ตำแหน่ง",
  slashDate = false,
  noDotsOnSignLine = false,
}: {
  signatureUrl?: string | null;
  signed?: boolean;
  signerName?: string | null;
  position?: string | null;
  dateStr?: string | null;
  suffix?: string;
  align?: "center" | "left";
  positionPrefix?: string;
  slashDate?: boolean;
  noDotsOnSignLine?: boolean;
}) {
  const dateParts = formatThaiDateParts(dateStr);
  const alignCls = align === "center" ? "text-center" : "text-left";
  const imgCls = align === "center" ? "mx-auto" : "ml-10";

  return (
    <div className={`space-y-1 ${alignCls}`}>
      {signatureUrl ? (
        <div className="pt-1">
          <img
            src={signatureUrl}
            alt="ลายเซ็น"
            className={`h-10 max-w-[155px] object-contain ${imgCls} -mb-1`}
          />
        </div>
      ) : null}
      <div>
        <span className="font-bold">(ลงชื่อ)</span>{" "}
        {noDotsOnSignLine ? (
          <span className="inline-block min-w-[128px]" />
        ) : (
          <span className="inline-block min-w-[140px] border-b border-dotted border-slate-600 text-center" />
        )}
        {suffix ? <span className="font-bold">{` ${suffix}`}</span> : null}
      </div>
      <div className={align === "left" ? "pl-10" : ""}>
        ({signerName || "................................................"})
      </div>
      {position !== undefined && (
        <div>
          <span className="font-bold">{positionPrefix}</span>{" "}
          <span className="inline-block min-w-[155px] px-1">
            {renderSplitPosition(position) || "...................................."}
          </span>
        </div>
      )}
      {dateStr !== undefined &&
        (slashDate ? (
          <div>
            <span className="font-bold">วันที่</span>{" "}
            <span className="inline-block min-w-[130px] text-center">
              {dateStr ? formatThaiDateSlash(dateStr) : "........ / ........ / ........"}
            </span>
          </div>
        ) : (
          <div>
            <span className="font-bold">วันที่</span>{" "}
            <span className="inline-block min-w-[28px] text-center">
              {dateParts.day || "...."}
            </span>{" "}
            <span className="font-bold">เดือน</span>{" "}
            <span className="inline-block min-w-[70px] text-center">
              {dateParts.month || "............"}
            </span>{" "}
            <span className="font-bold">พ.ศ.</span>{" "}
            <span className="inline-block min-w-[40px] text-center">
              {dateParts.yearBE || "......"}
            </span>
          </div>
        ))}
    </div>
  );
}

export default function LeaveFormPrintView({
  leave,
  printRef,
}: LeaveFormPrintViewProps) {
  const writtenParts = formatThaiDateParts(leave.writtenDate);
  const startParts = formatThaiDateParts(leave.startDate);
  const endParts = formatThaiDateParts(leave.endDate);
  const periodSuffix =
    leave.leaveDayPeriod && leave.leaveDayPeriod !== "full"
      ? ` (${LEAVE_DAY_PERIOD_SHORT[leave.leaveDayPeriod]})`
      : "";

  // ---------------------------------------------------------------------------
  // แบบฟอร์ม 3: ใบขอยกเลิกวันลา
  // ---------------------------------------------------------------------------
  if (leave.leaveType === "cancel_leave") {
    const targetLabel =
      leave.cancelTargetLeaveType &&
      LEAVE_TYPE_META[leave.cancelTargetLeaveType as LeaveType]
        ? LEAVE_TYPE_META[leave.cancelTargetLeaveType as LeaveType].label
        : "ลา";

    return (
      <div
        id="leave-print-sheet"
        ref={printRef}
        className="bg-white text-slate-900 mx-auto p-8 border border-slate-200 shadow-sm text-[16px] leading-[1.72]"
        style={{
          width: "210mm",
          minHeight: "297mm",
          fontFamily: "'TH Sarabun New', 'Sarabun', sans-serif",
        }}
      >
        <h1 className="text-center text-[22px] font-bold mb-4">
          แบบใบขอยกเลิกวันลา
        </h1>

        <div className="flex justify-end mb-3">
          <div className="w-[54%] text-[16px]">
            <div>
              <span className="font-bold">เขียนที่</span>{" "}
              <span className="px-1">{formatWrittenAtShort(leave.writtenAt)}</span>
            </div>
            <div className="mt-1">
              <span className="font-bold">วันที่</span>{" "}
              <span className="inline-block min-w-[26px] text-center">
                {writtenParts.day || "...."}
              </span>{" "}
              <span className="font-bold">เดือน</span>{" "}
              <span className="inline-block min-w-[78px] text-center">
                {writtenParts.month || "............"}
              </span>{" "}
              <span className="font-bold">พ.ศ.</span>{" "}
              <span className="inline-block min-w-[40px] text-center">
                {writtenParts.yearBE || "......"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 mt-2">
          <div>
            <span className="font-bold">เรื่อง</span>{" "}
            <span className="ml-2">{leave.subject || "ขอยกเลิกวันลา"}</span>
          </div>
          <div>
            <span className="font-bold">เรียน</span>{" "}
            <span className="ml-2">
              {leave.toRecipient ||
                "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="indent-12">
            <span className="font-bold">ข้าพเจ้า</span>{" "}
            <span className="px-1">{leave.applicantName}</span>{" "}
            <span className="font-bold ml-2">ตำแหน่ง</span>{" "}
            <span className="px-1">{leave.applicantPosition || "-"}</span>{" "}
            <span className="font-bold ml-2">กลุ่ม/ฝ่าย</span>{" "}
            <span className="px-1">{leave.applicantDivision || "-"}</span>{" "}
            <span className="font-bold ml-2">สังกัด</span>{" "}
            <span>สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</span>
          </div>
          <div className="indent-12">
            ได้รับอนุญาตให้{" "}
            <span className="border-b border-dotted border-slate-600 px-2 font-semibold">
              {targetLabel}
            </span>{" "}
            (เลขที่ใบลาเดิม{" "}
            <span className="border-b border-dotted border-slate-600 px-1.5">
              {leave.cancelTargetRequestNo || "-"}
            </span>
            ) ตั้งแต่วันที่{" "}
            <span className="border-b border-dotted border-slate-600 px-2">
              {leave.cancelTargetStartDate
                ? formatThaiDateFull(leave.cancelTargetStartDate)
                : "-"}
            </span>{" "}
            ถึงวันที่{" "}
            <span className="border-b border-dotted border-slate-600 px-2">
              {leave.cancelTargetEndDate
                ? formatThaiDateFull(leave.cancelTargetEndDate)
                : "-"}
            </span>{" "}
            รวม{" "}
            <span className="inline-block min-w-[34px] text-center border-b border-dotted border-slate-600 font-semibold">
              {leave.cancelTargetDays ?? "-"}
            </span>{" "}
            วัน นั้น
          </div>
          <div className="indent-12">
            เนื่องจาก{" "}
            <span className="inline-block min-w-[340px] border-b border-dotted border-slate-600 px-2">
              {leave.reason || "-"}
            </span>{" "}
            จึงขอยกเลิกวันลา{" "}
            <span className="border-b border-dotted border-slate-600 px-2 font-semibold">
              {targetLabel}
            </span>{" "}
            ตั้งแต่วันที่{" "}
            <span className="border-b border-dotted border-slate-600 px-2">
              {formatThaiDateFull(leave.startDate)}
            </span>{" "}
            ถึงวันที่{" "}
            <span className="border-b border-dotted border-slate-600 px-2">
              {formatThaiDateFull(leave.endDate)}
            </span>{" "}
            จำนวน{" "}
            <span className="inline-block min-w-[38px] text-center border-b border-dotted border-slate-600 font-semibold">
              {leave.totalWorkingDays}
            </span>{" "}
            วันทำการ{periodSuffix}
          </div>
        </div>

        <div className="flex justify-end mt-8 mb-8">
          <div className="w-[46%] text-center">
            <div>ขอแสดงความนับถือ</div>
            <SignatureBlock
              signatureUrl={leave.applicantSignature}
              signed={Boolean(leave.applicantSignature)}
              signerName={leave.applicantName}
              position={leave.applicantPosition || "-"}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 mt-6 items-start">
          <div className="space-y-2">
            <div className="font-bold text-center underline">
              ความเห็นผู้บังคับบัญชา
            </div>
            <div className="min-h-[48px] px-1 flex items-end justify-center">
              {leave.supervisorComment ||
                ".................................................................................."}
            </div>
            <SignatureBlock
              signatureUrl={leave.supervisorSignature}
              signed={Boolean(leave.supervisorReviewedAt)}
              signerName={leave.supervisorName}
              position={leave.supervisorPosition}
              dateStr={leave.supervisorReviewedAt}
              positionPrefix="(ตำแหน่ง)"
              slashDate
            />
          </div>

          <div className="space-y-2">
            <div className="font-bold text-center">
              คำสั่ง{" "}
              <span className="ml-4 font-normal">
                <CheckboxBox
                  checked={leave.orderDecision === "approved"}
                  label="อนุญาต"
                />
                <CheckboxBox
                  checked={leave.orderDecision === "rejected"}
                  label="ไม่อนุญาต"
                />
              </span>
            </div>
            {leave.orderComment && (
              <div className="text-[15px] text-slate-700 text-center">
                {leave.orderComment}
              </div>
            )}
            <SignatureBlock
              signatureUrl={leave.approverSignature}
              signed={Boolean(leave.orderedAt)}
              signerName={leave.approverName}
              position={leave.approverPosition}
              dateStr={leave.orderedAt}
              positionPrefix="(ตำแหน่ง)"
              slashDate
            />
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // แบบฟอร์ม 2: ใบลาพักผ่อน
  // ---------------------------------------------------------------------------
  if (leave.leaveType === "vacation_leave") {
    const totalEntitled =
      Number(leave.vacationAccumulatedDays || 0) +
      Number(leave.vacationAnnualDays || 0);
    const totalUsed =
      Number(leave.prevVacationDays || 0) + Number(leave.totalWorkingDays || 0);

    return (
      <div
        id="leave-print-sheet"
        ref={printRef}
        className="bg-white text-slate-900 mx-auto p-8 border border-slate-200 shadow-sm text-[16px] leading-[1.68]"
        style={{
          width: "210mm",
          minHeight: "297mm",
          fontFamily: "'TH Sarabun New', 'Sarabun', sans-serif",
        }}
      >
        <h1 className="text-center text-[22px] font-bold mb-3">ใบลาพักผ่อน</h1>

        <div className="flex justify-end mb-2">
          <div className="w-[52%] text-[16px]">
            <div>
              <span className="font-bold">เขียนที่</span>{" "}
              <span className="px-1">{formatWrittenAtShort(leave.writtenAt)}</span>
            </div>
            <div className="mt-1">
              <span className="font-bold">วันที่</span>{" "}
              <span className="inline-block min-w-[26px] text-center">
                {writtenParts.day || "...."}
              </span>{" "}
              <span className="font-bold">เดือน</span>{" "}
              <span className="inline-block min-w-[78px] text-center">
                {writtenParts.month || "............"}
              </span>{" "}
              <span className="font-bold">พ.ศ.</span>{" "}
              <span className="inline-block min-w-[40px] text-center">
                {writtenParts.yearBE || "......"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 mt-2">
          <div>
            <span className="font-bold">เรื่อง</span>{" "}
            <span className="ml-2">{leave.subject || "ขอลาพักผ่อน"}</span>
          </div>
          <div>
            <span className="font-bold">เรียน</span>{" "}
            <span className="ml-2">
              {leave.toRecipient ||
                "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"}
            </span>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="indent-12">
            <span className="font-bold">ข้าพเจ้า</span>{" "}
            <span className="px-1">{leave.applicantName}</span>{" "}
            <span className="font-bold ml-2">ตำแหน่ง</span>{" "}
            <span className="px-1">{leave.applicantPosition || "-"}</span>{" "}
            <span className="font-bold ml-2">กลุ่ม/ฝ่าย</span>{" "}
            <span className="px-1">{leave.applicantDivision || "-"}</span>{" "}
            <span className="font-bold ml-2">สังกัด</span>{" "}
            <span>สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</span>
          </div>
          <div>
            <span className="font-bold">มีวันลาพักผ่อนสะสม</span>{" "}
            <span className="px-1">{leave.vacationAccumulatedDays}</span>{" "}
            <span className="font-bold">วันทำการ</span>{" "}
            <span className="font-bold ml-2">มีสิทธิลาพักผ่อนประจำปีอีก</span>{" "}
            <span className="px-1">{leave.vacationAnnualDays}</span>{" "}
            <span className="font-bold">วันทำการ</span>{" "}
            <span className="font-bold ml-2">รวมเป็น</span>{" "}
            <span className="px-1">{totalEntitled}</span>{" "}
            <span className="font-bold">วันทำการ</span>
          </div>
          <div>
            <span className="font-bold">ขอลาพักผ่อนตั้งแต่วันที่</span>{" "}
            <span className="px-1">{startParts.day}</span>{" "}
            <span className="font-bold">เดือน</span>{" "}
            <span className="px-1">{startParts.month}</span>{" "}
            <span className="font-bold">พ.ศ.</span>{" "}
            <span className="px-1">{startParts.yearBE}</span>{" "}
            <span className="font-bold">ถึงวันที่</span>{" "}
            <span className="px-1">{endParts.day}</span>{" "}
            <span className="font-bold">เดือน</span>{" "}
            <span className="px-1">{endParts.month}</span>{" "}
            <span className="font-bold">พ.ศ.</span>{" "}
            <span className="px-1">{endParts.yearBE}</span>
            <br />
            <span className="font-bold">มีกำหนด</span>{" "}
            <span className="px-1">{leave.totalWorkingDays}</span>{" "}
            <span className="font-bold">วัน</span>
            {periodSuffix}{" "}
            <span className="font-bold ml-2">
              ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่
            </span>{" "}
            <span className="px-1">{leave.contactInfo || "-"}</span>{" "}
            <span className="ml-2">
              หมายเลขโทรศัพท์ {leave.contactPhone || "-"}
            </span>
          </div>
        </div>

        <div className="flex justify-end mt-5 mb-5">
          <div className="w-[46%] text-center">
            <SignatureBlock
              signatureUrl={leave.applicantSignature}
              signed={Boolean(leave.applicantSignature)}
              signerName={leave.applicantName}
              position={leave.applicantPosition || "-"}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mt-4 items-start">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <div className="font-bold text-center mb-1.5">
                สถิติการลาในปีงบประมาณนี้
              </div>
              <table className="w-full border-collapse border border-slate-800 text-center text-[15px]">
                <thead>
                  <tr>
                    <th className="border border-slate-800 px-2 py-2 font-bold">
                      ลามาแล้ว (วันทำการ)
                    </th>
                    <th className="border border-slate-800 px-2 py-2 font-bold">
                      ลาครั้งนี้ (วันทำการ)
                    </th>
                    <th className="border border-slate-800 px-2 py-2 font-bold">
                      รวมเป็น (วันทำการ)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-800 px-2 py-2">
                      {leave.prevVacationDays}
                    </td>
                    <td className="border border-slate-800 px-2 py-2">
                      {leave.totalWorkingDays}
                    </td>
                    <td className="border border-slate-800 px-2 py-2 font-bold">
                      {totalUsed}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2">
              <SignatureBlock
                signatureUrl={leave.verifierSignature}
                signed={Boolean(leave.verifiedAt)}
                signerName={leave.verifierName}
                position={leave.verifierPosition}
                dateStr={leave.verifiedAt}
                suffix="ผู้ตรวจสอบ"
                align="left"
                positionPrefix="(ตำแหน่ง)"
                slashDate
                noDotsOnSignLine
              />
            </div>

            <div className="pt-3 space-y-2">
              <div>
                ในระหว่างที่ข้าพเจ้าลาพักผ่อนมอบหมายให้
                <br />
                <span>{formatActingPersonText(leave.actingPersonName)}</span>
              </div>
              <div className="pt-1">
                {leave.applicantSignature && (
                  <img
                    src={leave.applicantSignature}
                    alt="ลายเซ็นผู้มอบ"
                    className="h-9 max-w-[130px] object-contain ml-8 -mb-1"
                  />
                )}
                <div>
                  <span className="font-bold">(ลงชื่อ)</span>
                  ..........................................{" "}
                  <span className="font-bold">ผู้มอบ</span>
                </div>
                <div className="pl-12">({leave.applicantName})</div>
              </div>
              <div className="pt-1">
                {leave.actingPersonSignature && (
                  <img
                    src={leave.actingPersonSignature}
                    alt="ลายเซ็นผู้ปฏิบัติหน้าที่แทน"
                    className="h-9 max-w-[130px] object-contain ml-8 -mb-1"
                  />
                )}
                <div>
                  <span className="font-bold">(ลงชื่อ)</span>
                  ...........................................{" "}
                  <span className="font-bold">ผู้ปฏิบัติหน้าที่แทน</span>
                </div>
                <div className="pl-12">
                  ({leave.actingPersonName || "........................................"})
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="font-bold text-center underline">
                ความเห็นผู้บังคับบัญชา
              </div>
              <div className="min-h-[42px] px-1 flex items-end justify-center">
                {leave.supervisorComment ||
                  ".................................................................................."}
              </div>
              <SignatureBlock
                signatureUrl={leave.supervisorSignature}
                signed={Boolean(leave.supervisorReviewedAt)}
                signerName={leave.supervisorName}
                position={leave.supervisorPosition}
                dateStr={leave.supervisorReviewedAt}
                positionPrefix="(ตำแหน่ง)"
                slashDate
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="font-bold text-center">
                คำสั่ง{" "}
                <span className="ml-4 font-normal">
                  <CheckboxBox
                    checked={leave.orderDecision === "approved"}
                    label="อนุญาต"
                  />
                  <CheckboxBox
                    checked={leave.orderDecision === "rejected"}
                    label="ไม่อนุญาต"
                  />
                </span>
              </div>
              {leave.orderComment && (
                <div className="text-[15px] text-slate-700 text-center">
                  {leave.orderComment}
                </div>
              )}
              <SignatureBlock
                signatureUrl={leave.approverSignature}
                signed={Boolean(leave.orderedAt)}
                signerName={leave.approverName}
                position={leave.approverPosition}
                dateStr={leave.orderedAt}
                positionPrefix="(ตำแหน่ง)"
                slashDate
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // แบบฟอร์ม 1: ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว
  // ---------------------------------------------------------------------------
  const curSick = leave.leaveType === "sick_leave" ? leave.totalWorkingDays : 0;
  const curPersonal =
    leave.leaveType === "personal_leave" ? leave.totalWorkingDays : 0;
  const curMaternity =
    leave.leaveType === "maternity_leave" ? leave.totalWorkingDays : 0;

  return (
    <div
      id="leave-print-sheet"
      ref={printRef}
      className="bg-white text-slate-900 mx-auto p-8 border border-slate-200 shadow-sm text-[16px] leading-[1.66]"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: "'TH Sarabun New', 'Sarabun', sans-serif",
      }}
    >
      <h1 className="text-center text-[22px] font-bold mb-3">
        ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว
      </h1>

      <div className="flex justify-end mb-2">
        <div className="w-[54%] text-[16px]">
          <div>
            <span className="font-bold">เขียนที่</span>{" "}
            <span className="px-1">{formatWrittenAtShort(leave.writtenAt)}</span>
          </div>
          <div className="mt-1">
            <span className="font-bold">วันที่</span>{" "}
            <span className="inline-block min-w-[28px] text-center">
              {writtenParts.day || "...."}
            </span>{" "}
            <span className="font-bold">เดือน</span>{" "}
            <span className="inline-block min-w-[85px] text-center">
              {writtenParts.month || "............"}
            </span>{" "}
            <span className="font-bold">พ.ศ.</span>{" "}
            <span className="inline-block min-w-[44px] text-center">
              {writtenParts.yearBE || "......"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 mt-2">
        <div>
          <span className="font-bold">เรื่อง</span>{" "}
          <span className="ml-2">{leave.subject}</span>
        </div>
        <div>
          <span className="font-bold">เรียน</span>{" "}
          <span className="ml-2">
            {leave.toRecipient ||
              "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="indent-12">
          <span className="font-bold">ข้าพเจ้า</span>{" "}
          <span className="px-1">{leave.applicantName}</span>{" "}
          <span className="font-bold ml-2">ตำแหน่ง</span>{" "}
          <span className="px-1">{leave.applicantPosition || "-"}</span>{" "}
          <span className="font-bold ml-2">กลุ่ม/ฝ่าย</span>{" "}
          <span className="px-1">{leave.applicantDivision || "-"}</span>{" "}
          <span className="font-bold ml-2">สังกัด</span>{" "}
          <span>สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</span>
        </div>

        <div className="pl-6 space-y-1 py-1">
          <div>
            <CheckboxBox checked={leave.leaveType === "sick_leave"} label="ป่วย" />
            {leave.leaveType === "sick_leave" && leave.reason && (
              <span className="border-b border-dotted border-slate-600 px-2">
                เนื่องจาก {leave.reason}
              </span>
            )}
          </div>
          <div>
            <span className="inline-block -ml-6 mr-2 font-medium">ขอลา</span>
            <CheckboxBox
              checked={leave.leaveType === "personal_leave"}
              label="กิจส่วนตัว"
            />
            <span>
              เนื่องจาก{" "}
              <span className="inline-block min-w-[260px] border-b border-dotted border-slate-600 px-2">
                {leave.leaveType === "personal_leave" ? leave.reason || "-" : ""}
              </span>
            </span>
          </div>
          <div>
            <CheckboxBox
              checked={leave.leaveType === "maternity_leave"}
              label="คลอดบุตร"
            />
            {leave.leaveType === "maternity_leave" && leave.reason && (
              <span className="border-b border-dotted border-slate-600 px-2">
                ({leave.reason})
              </span>
            )}
          </div>
        </div>

        <div>
          ตั้งแต่วันที่{" "}
          <span className="inline-block min-w-[140px] border-b border-dotted border-slate-600 px-2 text-center">
            {formatThaiDateFull(leave.startDate)}
          </span>{" "}
          ถึงวันที่{" "}
          <span className="inline-block min-w-[140px] border-b border-dotted border-slate-600 px-2 text-center">
            {formatThaiDateFull(leave.endDate)}
          </span>{" "}
          มีกำหนด{" "}
          <span className="inline-block min-w-[40px] border-b border-dotted border-slate-600 text-center font-semibold">
            {leave.totalWorkingDays}
          </span>{" "}
          วัน{periodSuffix}
        </div>

        <div>
          ข้าพเจ้าได้ลา{" "}
          <CheckboxBox
            checked={leave.lastLeaveType === "sick_leave"}
            label="ป่วย"
          />
          <CheckboxBox
            checked={leave.lastLeaveType === "personal_leave"}
            label="กิจส่วนตัว"
          />
          <CheckboxBox
            checked={leave.lastLeaveType === "maternity_leave"}
            label="คลอดบุตร"
          />
          ครั้งสุดท้ายตั้งแต่วันที่{" "}
          <span className="inline-block min-w-[115px] border-b border-dotted border-slate-600 px-1 text-center">
            {leave.lastLeaveStartDate
              ? formatThaiDateFull(leave.lastLeaveStartDate)
              : "-"}
          </span>
        </div>
        <div>
          ถึงวันที่{" "}
          <span className="inline-block min-w-[115px] border-b border-dotted border-slate-600 px-1 text-center">
            {leave.lastLeaveEndDate
              ? formatThaiDateFull(leave.lastLeaveEndDate)
              : "-"}
          </span>{" "}
          มีกำหนด{" "}
          <span className="inline-block min-w-[36px] border-b border-dotted border-slate-600 text-center">
            {leave.lastLeaveDays ?? "-"}
          </span>{" "}
          วัน ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่{" "}
          <span className="inline-block min-w-[180px] border-b border-dotted border-slate-600 px-2">
            {[leave.contactInfo, leave.contactPhone].filter(Boolean).join(" โทร. ") || "-"}
          </span>
        </div>
      </div>

      <div className="flex justify-end mt-4 mb-4">
        <div className="w-[46%] text-center">
          <div>ขอแสดงความนับถือ</div>
          <SignatureBlock
            signatureUrl={leave.applicantSignature}
            signed={Boolean(leave.applicantSignature)}
            signerName={leave.applicantName}
            position={leave.applicantPosition || "-"}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mt-3 items-start">
        {/* Left column */}
        <div className="space-y-4">
          <div>
            <div className="font-semibold text-center mb-1">
              สถิติการลาในปีงบประมาณนี้
            </div>
            <table className="w-full border-collapse border border-slate-800 text-center text-[14px]">
              <thead>
                <tr>
                  <th className="border border-slate-800 px-2 py-1 font-semibold">
                    ประเภทลา
                  </th>
                  <th className="border border-slate-800 px-2 py-1 font-semibold">
                    ลามาแล้ว
                    <br />
                    (วันทำการ)
                  </th>
                  <th className="border border-slate-800 px-2 py-1 font-semibold">
                    ลาครั้งนี้
                    <br />
                    (วันทำการ)
                  </th>
                  <th className="border border-slate-800 px-2 py-1 font-semibold">
                    รวมเป็น
                    <br />
                    (วันทำการ)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-800 px-2 py-1.5">ป่วย</td>
                  <td className="border border-slate-800 px-2 py-1.5">
                    {leave.prevSickDays}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5">
                    {curSick || ""}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 font-semibold">
                    {leave.prevSickDays + curSick}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-800 px-2 py-1.5">
                    กิจส่วนตัว
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5">
                    {leave.prevPersonalDays}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5">
                    {curPersonal || ""}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 font-semibold">
                    {leave.prevPersonalDays + curPersonal}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-800 px-2 py-1.5">
                    คลอดบุตร
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5">
                    {leave.prevMaternityDays}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5">
                    {curMaternity || ""}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 font-semibold">
                    {leave.prevMaternityDays + curMaternity}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pt-2">
            <SignatureBlock
              signatureUrl={leave.verifierSignature}
              signed={Boolean(leave.verifiedAt)}
              signerName={leave.verifierName}
              position={leave.verifierPosition}
              dateStr={leave.verifiedAt}
              suffix="ผู้ตรวจสอบ"
              align="left"
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="space-y-1.5">
            <div className="font-semibold text-center underline">
              ความเห็นผู้บังคับบัญชา
            </div>
            <div className="min-h-[42px] border-b border-dotted border-slate-600 px-1 flex items-end">
              {leave.supervisorComment || ""}
            </div>
            <SignatureBlock
              signatureUrl={leave.supervisorSignature}
              signed={Boolean(leave.supervisorReviewedAt)}
              signerName={leave.supervisorName}
              position={leave.supervisorPosition}
              dateStr={leave.supervisorReviewedAt}
            />
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="font-semibold">
              คำสั่ง{" "}
              <span className="ml-4">
                <CheckboxBox
                  checked={leave.orderDecision === "approved"}
                  label="อนุญาต"
                />
                <CheckboxBox
                  checked={leave.orderDecision === "rejected"}
                  label="ไม่อนุญาต"
                />
              </span>
            </div>
            {leave.orderComment && (
              <div className="text-[14px] text-slate-700 border-b border-dotted border-slate-500">
                {leave.orderComment}
              </div>
            )}
            <SignatureBlock
              signatureUrl={leave.approverSignature}
              signed={Boolean(leave.orderedAt)}
              signerName={leave.approverName}
              position={leave.approverPosition}
              dateStr={leave.orderedAt}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 pt-2 text-[14px]">
        <span className="font-semibold">หมายเหตุ :-</span>
        <span className="ml-4">
          การลากิจ + ลาป่วย ต้องไม่เกิน 23 วันทำการ จึงมีสิทธิเลื่อนขั้นเงินเดือน/ค่าจ้าง
          <br />
          <span className="ml-16">
            ในรอบ 6 เดือน คือ 1 ต.ค. – 31 มี.ค. , 1 เม.ย. – 30 ก.ย.
          </span>
        </span>
      </div>
    </div>
  );
}
