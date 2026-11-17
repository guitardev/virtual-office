"use client";

import React from "react";
import {
  formatThaiDateFull,
  formatThaiDateParts,
  formatThaiDateSlash,
  LeaveRequestItem,
} from "@/lib/leave-utils";

interface LeaveFormPrintViewProps {
  leave: LeaveRequestItem;
  printRef?: React.RefObject<HTMLDivElement | null>;
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

export default function LeaveFormPrintView({
  leave,
  printRef,
}: LeaveFormPrintViewProps) {
  const writtenParts = formatThaiDateParts(leave.writtenDate);
  const startParts = formatThaiDateParts(leave.startDate);
  const endParts = formatThaiDateParts(leave.endDate);
  const verifiedParts = formatThaiDateParts(leave.verifiedAt);
  const supParts = formatThaiDateParts(leave.supervisorReviewedAt);
  const ordParts = formatThaiDateParts(leave.orderedAt);

  if (leave.leaveType === "vacation_leave") {
    const totalEntitled =
      Number(leave.vacationAccumulatedDays || 0) +
      Number(leave.vacationAnnualDays || 0);
    const totalUsed =
      Number(leave.prevVacationDays || 0) + Number(leave.totalWorkingDays || 0);

    return (
      <div
        ref={printRef}
        className="bg-white text-slate-900 mx-auto p-8 border border-slate-200 shadow-sm text-[15px] leading-[1.7]"
        style={{
          width: "210mm",
          minHeight: "297mm",
          fontFamily: "'TH Sarabun New', 'Sarabun', sans-serif",
        }}
      >
        <h1 className="text-center text-[21px] font-bold mb-3">ใบลาพักผ่อน</h1>

        <div className="flex justify-end mb-2">
          <div className="w-[58%] text-[15px]">
            <div>
              เขียนที่{" "}
              <span className="border-b border-dotted border-slate-600 px-1">
                {leave.writtenAt ||
                  "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์ จังหวัดกำแพงเพชร"}
              </span>
            </div>
            <div className="mt-1">
              วันที่{" "}
              <span className="inline-block min-w-[28px] text-center border-b border-dotted border-slate-600">
                {writtenParts.day || "...."}
              </span>{" "}
              เดือน{" "}
              <span className="inline-block min-w-[85px] text-center border-b border-dotted border-slate-600">
                {writtenParts.month || "............"}
              </span>{" "}
              พ.ศ.{" "}
              <span className="inline-block min-w-[44px] text-center border-b border-dotted border-slate-600">
                {writtenParts.yearBE || "......"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 mt-2">
          <div>
            <span className="font-semibold">เรื่อง</span>{" "}
            <span className="ml-2">{leave.subject || "ขอลาพักผ่อน"}</span>
          </div>
          <div>
            <span className="font-semibold">เรียน</span>{" "}
            <span className="ml-2">
              {leave.toRecipient ||
                "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"}
            </span>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="indent-12">
            ข้าพเจ้า{" "}
            <span className="inline-block min-w-[180px] border-b border-dotted border-slate-600 px-2">
              {leave.applicantName}
            </span>{" "}
            ตำแหน่ง{" "}
            <span className="inline-block min-w-[180px] border-b border-dotted border-slate-600 px-2">
              {leave.applicantPosition || "-"}
            </span>
          </div>
          <div>
            กลุ่ม/ฝ่าย{" "}
            <span className="inline-block min-w-[170px] border-b border-dotted border-slate-600 px-2">
              {leave.applicantDivision || "-"}
            </span>{" "}
            สังกัด{" "}
            <span>สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</span>
          </div>
          <div>
            มีวันลาพักผ่อนสะสม{" "}
            <span className="inline-block min-w-[42px] text-center border-b border-dotted border-slate-600">
              {leave.vacationAccumulatedDays}
            </span>{" "}
            วันทำการ มีสิทธิลาพักผ่อนประจำปีอีก{" "}
            <span className="inline-block min-w-[42px] text-center border-b border-dotted border-slate-600">
              {leave.vacationAnnualDays}
            </span>{" "}
            วันทำการ รวมเป็น{" "}
            <span className="inline-block min-w-[42px] text-center border-b border-dotted border-slate-600">
              {totalEntitled}
            </span>{" "}
            วันทำการ
          </div>
          <div>
            ขอลาพักผ่อนตั้งแต่วันที่{" "}
            <span className="inline-block min-w-[26px] text-center border-b border-dotted border-slate-600">
              {startParts.day}
            </span>{" "}
            เดือน{" "}
            <span className="inline-block min-w-[72px] text-center border-b border-dotted border-slate-600">
              {startParts.month}
            </span>{" "}
            พ.ศ.{" "}
            <span className="inline-block min-w-[40px] text-center border-b border-dotted border-slate-600">
              {startParts.yearBE}
            </span>{" "}
            ถึงวันที่{" "}
            <span className="inline-block min-w-[26px] text-center border-b border-dotted border-slate-600">
              {endParts.day}
            </span>{" "}
            เดือน{" "}
            <span className="inline-block min-w-[72px] text-center border-b border-dotted border-slate-600">
              {endParts.month}
            </span>{" "}
            พ.ศ.{" "}
            <span className="inline-block min-w-[40px] text-center border-b border-dotted border-slate-600">
              {endParts.yearBE}
            </span>{" "}
            มีกำหนด{" "}
            <span className="inline-block min-w-[36px] text-center border-b border-dotted border-slate-600 font-semibold">
              {leave.totalWorkingDays}
            </span>{" "}
            วัน
          </div>
          <div>
            ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่{" "}
            <span className="inline-block min-w-[230px] border-b border-dotted border-slate-600 px-2">
              {leave.contactInfo || "-"}
            </span>{" "}
            หมายเลขโทรศัพท์{" "}
            <span className="inline-block min-w-[110px] border-b border-dotted border-slate-600 px-2">
              {leave.contactPhone || "-"}
            </span>
          </div>
        </div>

        <div className="flex justify-end mt-5 mb-5">
          <div className="w-[46%] text-center">
            <div className="mt-4">
              (ลงชื่อ)......................................................
            </div>
            <div>({leave.applicantName})</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mt-4 items-start">
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
                    <td className="border border-slate-800 px-2 py-2">
                      {leave.prevVacationDays}
                    </td>
                    <td className="border border-slate-800 px-2 py-2">
                      {leave.totalWorkingDays}
                    </td>
                    <td className="border border-slate-800 px-2 py-2 font-semibold">
                      {totalUsed}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2 space-y-1">
              <div>
                (ลงชื่อ){" "}
                <span className="inline-block min-w-[140px] border-b border-dotted border-slate-600 text-center">
                  {leave.verifierName || ""}
                </span>{" "}
                ผู้ตรวจสอบ
              </div>
              <div className="pl-12">
                ({leave.verifierName || "................................................"})
              </div>
              <div>
                (ตำแหน่ง){" "}
                <span className="inline-block min-w-[155px] border-b border-dotted border-slate-600 px-1">
                  {leave.verifierPosition || ""}
                </span>
              </div>
              <div>
                วันที่{" "}
                <span className="inline-block min-w-[140px] border-b border-dotted border-slate-600 text-center">
                  {leave.verifiedAt ? formatThaiDateSlash(leave.verifiedAt) : ""}
                </span>
              </div>
            </div>

            <div className="pt-3 space-y-2">
              <div>
                ในระหว่างที่ข้าพเจ้าลาพักผ่อนมอบหมายให้
                <br />
                นาย/นาง/นางสาว{" "}
                <span className="inline-block min-w-[165px] border-b border-dotted border-slate-600 px-1">
                  {leave.actingPersonName || "-"}
                </span>{" "}
                ปฏิบัติหน้าที่แทน
              </div>
              <div className="pt-1">
                <div>
                  (ลงชื่อ)........................................ ผู้มอบ
                </div>
                <div className="pl-12">({leave.applicantName})</div>
              </div>
              <div className="pt-1">
                <div>
                  (ลงชื่อ)........................................ ผู้ปฏิบัติหน้าที่แทน
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
              <div className="font-semibold text-center underline">
                ความเห็นผู้บังคับบัญชา
              </div>
              <div className="min-h-[42px] border-b border-dotted border-slate-600 px-1 flex items-end">
                {leave.supervisorComment || ""}
              </div>
              <div className="pt-2">
                (ลงชื่อ){" "}
                <span className="inline-block min-w-[155px] border-b border-dotted border-slate-600 text-center">
                  {leave.supervisorName || ""}
                </span>
              </div>
              <div className="pl-12">
                ({leave.supervisorName || "........................................"})
              </div>
              <div>
                (ตำแหน่ง){" "}
                <span className="inline-block min-w-[155px] border-b border-dotted border-slate-600 px-1">
                  {leave.supervisorPosition || ""}
                </span>
              </div>
              <div>
                วันที่{" "}
                <span className="inline-block min-w-[155px] border-b border-dotted border-slate-600 text-center">
                  {leave.supervisorReviewedAt
                    ? formatThaiDateSlash(leave.supervisorReviewedAt)
                    : ""}
                </span>
              </div>
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
              <div className="pt-4">
                (ลงชื่อ){" "}
                <span className="inline-block min-w-[155px] border-b border-dotted border-slate-600 text-center">
                  {leave.approverName || ""}
                </span>
              </div>
              <div className="pl-12">
                ({leave.approverName || "........................................"})
              </div>
              <div>
                (ตำแหน่ง){" "}
                <span className="inline-block min-w-[155px] border-b border-dotted border-slate-600 px-1">
                  {leave.approverPosition || ""}
                </span>
              </div>
              <div>
                วันที่{" "}
                <span className="inline-block min-w-[155px] border-b border-dotted border-slate-600 text-center">
                  {leave.orderedAt ? formatThaiDateSlash(leave.orderedAt) : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // แบบฟอร์ม 1: ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว
  const curSick = leave.leaveType === "sick_leave" ? leave.totalWorkingDays : 0;
  const curPersonal =
    leave.leaveType === "personal_leave" ? leave.totalWorkingDays : 0;
  const curMaternity =
    leave.leaveType === "maternity_leave" ? leave.totalWorkingDays : 0;

  return (
    <div
      ref={printRef}
      className="bg-white text-slate-900 mx-auto p-8 border border-slate-200 shadow-sm text-[15px] leading-[1.68]"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: "'TH Sarabun New', 'Sarabun', sans-serif",
      }}
    >
      <h1 className="text-center text-[21px] font-bold mb-3">
        ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว
      </h1>

      <div className="flex justify-end mb-2">
        <div className="w-[56%] text-[15px]">
          <div>
            เขียนที่{" "}
            <span className="border-b border-dotted border-slate-600 px-1">
              {leave.writtenAt ||
                "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"}
            </span>
          </div>
          <div className="mt-1">
            วันที่{" "}
            <span className="inline-block min-w-[28px] text-center border-b border-dotted border-slate-600">
              {writtenParts.day || "...."}
            </span>{" "}
            เดือน{" "}
            <span className="inline-block min-w-[85px] text-center border-b border-dotted border-slate-600">
              {writtenParts.month || "............"}
            </span>{" "}
            พ.ศ.{" "}
            <span className="inline-block min-w-[44px] text-center border-b border-dotted border-slate-600">
              {writtenParts.yearBE || "......"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 mt-2">
        <div>
          <span className="font-semibold">เรื่อง</span>{" "}
          <span className="ml-2">{leave.subject}</span>
        </div>
        <div>
          <span className="font-semibold">เรียน</span>{" "}
          <span className="ml-2">
            {leave.toRecipient ||
              "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="indent-12">
          ข้าพเจ้า{" "}
          <span className="inline-block min-w-[180px] border-b border-dotted border-slate-600 px-2">
            {leave.applicantName}
          </span>{" "}
          ตำแหน่ง{" "}
          <span className="inline-block min-w-[180px] border-b border-dotted border-slate-600 px-2">
            {leave.applicantPosition || "-"}
          </span>
        </div>
        <div>
          สังกัด{" "}
          <span className="inline-block min-w-[320px] border-b border-dotted border-slate-600 px-2">
            {leave.applicantDivision
              ? `${leave.applicantDivision} (สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร)`
              : "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"}
          </span>
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
          วัน
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
          <div className="mt-5">
            (ลงชื่อ)......................................................
          </div>
          <div>({leave.applicantName})</div>
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

          <div className="pt-2 space-y-1">
            <div>
              (ลงชื่อ){" "}
              <span className="inline-block min-w-[140px] border-b border-dotted border-slate-600 text-center">
                {leave.verifierName || ""}
              </span>{" "}
              ผู้ตรวจสอบ
            </div>
            <div className="pl-12">
              ({leave.verifierName || "................................................"})
            </div>
            <div>
              ตำแหน่ง{" "}
              <span className="inline-block min-w-[165px] border-b border-dotted border-slate-600 px-1">
                {leave.verifierPosition || ""}
              </span>
            </div>
            <div>
              วันที่{" "}
              <span className="inline-block min-w-[30px] text-center border-b border-dotted border-slate-600">
                {verifiedParts.day}
              </span>{" "}
              เดือน{" "}
              <span className="inline-block min-w-[70px] text-center border-b border-dotted border-slate-600">
                {verifiedParts.month}
              </span>{" "}
              พ.ศ.{" "}
              <span className="inline-block min-w-[40px] text-center border-b border-dotted border-slate-600">
                {verifiedParts.yearBE}
              </span>
            </div>
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
            <div className="pt-2">
              (ลงชื่อ){" "}
              <span className="inline-block min-w-[155px] border-b border-dotted border-slate-600 text-center">
                {leave.supervisorName || ""}
              </span>
            </div>
            <div>
              ตำแหน่ง{" "}
              <span className="inline-block min-w-[155px] border-b border-dotted border-slate-600 px-1">
                {leave.supervisorPosition || ""}
              </span>
            </div>
            <div>
              วันที่{" "}
              <span className="inline-block min-w-[30px] text-center border-b border-dotted border-slate-600">
                {supParts.day}
              </span>{" "}
              เดือน{" "}
              <span className="inline-block min-w-[70px] text-center border-b border-dotted border-slate-600">
                {supParts.month}
              </span>{" "}
              พ.ศ.{" "}
              <span className="inline-block min-w-[40px] text-center border-b border-dotted border-slate-600">
                {supParts.yearBE}
              </span>
            </div>
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
            <div className="pt-4">
              (ลงชื่อ){" "}
              <span className="inline-block min-w-[155px] border-b border-dotted border-slate-600 text-center">
                {leave.approverName || ""}
              </span>
            </div>
            <div>
              ตำแหน่ง{" "}
              <span className="inline-block min-w-[155px] border-b border-dotted border-slate-600 px-1">
                {leave.approverPosition || ""}
              </span>
            </div>
            <div>
              วันที่{" "}
              <span className="inline-block min-w-[30px] text-center border-b border-dotted border-slate-600">
                {ordParts.day}
              </span>{" "}
              เดือน{" "}
              <span className="inline-block min-w-[70px] text-center border-b border-dotted border-slate-600">
                {ordParts.month}
              </span>{" "}
              พ.ศ.{" "}
              <span className="inline-block min-w-[40px] text-center border-b border-dotted border-slate-600">
                {ordParts.yearBE}
              </span>
            </div>
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
