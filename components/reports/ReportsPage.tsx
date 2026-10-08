"use client";

import React from "react";

interface ReportsPageProps {
  showToast: (msg: string) => void;
}

export function ReportsPage({ showToast }: ReportsPageProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">รายงานและสถิติ (Reports & Analytics)</h1>
          <p className="text-slate-500 text-sm mt-0.5">ข้อมูลสรุปประสิทธิภาพและการใช้งานทรัพยากรรายเดือน</p>
        </div>
        <button
          type="button"
          onClick={() => showToast("📥 กำลังดาวน์โหลดรายงาน PDF สรุปประจำเดือน...")}
          className="px-4 py-2 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-colors cursor-pointer"
        >
          📥 ส่งออกรายงาน PDF
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">อัตราความสำเร็จของงาน (Task Rate)</div>
          <div className="text-3xl font-bold font-heading text-emerald-600 mt-1">87.5%</div>
          <div className="text-xs text-slate-500 mt-1">↑ เพิ่มขึ้น 4.2% จากสัปดาห์ก่อน</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">ชั่วโมงการประชุมสะสม</div>
          <div className="text-3xl font-bold font-heading text-[#4F46E5] mt-1">14.5 ชม.</div>
          <div className="text-xs text-slate-500 mt-1">เฉลี่ย 1.8 ชม. / วัน</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">การใช้งานรถยนต์สำนักงาน</div>
          <div className="text-3xl font-bold font-heading text-amber-600 mt-1">6 ครั้ง</div>
          <div className="text-xs text-slate-500 mt-1">ประหยัดค่าเดินทาง 3,400 บาท</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h2 className="text-base font-bold font-heading text-slate-900 mb-4">สัดส่วนภารกิจตามสถานะ</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700">เสร็จสิ้นแล้ว (Done)</span>
                <span>55%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: "55%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-indigo-700">กำลังดำเนินการ (In Progress)</span>
                <span>30%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: "30%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700">รอเริ่มงาน (Todo)</span>
                <span>15%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: "15%" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h2 className="text-base font-bold font-heading text-slate-900 mb-4">รายงานที่ดาวน์โหลดล่าสุด</h2>
          <div className="space-y-3">
            {[
              { title: "รายงานการใช้รถยนต์ประจำเดือน ก.ย.", size: "1.4 MB", date: "1 ต.ค." },
              { title: "สรุปชั่วโมงประชุมและผู้เข้าร่วม Q3", size: "850 KB", date: "30 ก.ย." },
              { title: "รายงานภาพรวมภารกิจ Kanban ประจำสัปดาห์", size: "620 KB", date: "5 ต.ค." },
            ].map((rep) => (
              <div key={rep.title} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="text-xs font-semibold text-slate-800">{rep.title}</div>
                  <div className="text-[10px] text-slate-400">{rep.date} · {rep.size}</div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast(`📥 เริ่มดาวน์โหลด: ${rep.title}`)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 cursor-pointer"
                >
                  ดาวน์โหลด
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
