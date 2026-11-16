"use client";

import React from "react";
import {
  KPP_MSO_LOGBOOK,
  MSO_HOUSING_TYPE_LABELS,
} from "@/lib/mso-logbook-kpp";

export type SocialSubTabKey =
  | "population"
  | "vulnerable"
  | "children"
  | "women"
  | "elderly"
  | "disabled"
  | "homeless";

export const SOCIAL_SUB_TABS: Array<{
  key: SocialSubTabKey;
  label: string;
  icon: string;
}> = [
  { key: "population", label: "ประชากรและพื้นที่", icon: "🗺️" },
  { key: "vulnerable", label: "กลุ่มเปราะบาง", icon: "👨‍👩‍👧" },
  { key: "children", label: "เด็กและเยาวชน", icon: "👶" },
  { key: "women", label: "สตรี", icon: "👩" },
  { key: "elderly", label: "ผู้สูงอายุ", icon: "👴" },
  { key: "disabled", label: "พิการ", icon: "♿" },
  { key: "homeless", label: "คนไร้ที่พึ่ง", icon: "🏕️" },
];

const fmt = (n: number | null | undefined) =>
  n == null ? "NA" : Number(n).toLocaleString("th-TH");

function StatCard({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "slate" | "sky" | "emerald" | "amber" | "rose" | "indigo";
}) {
  const valueColor =
    tone === "sky"
      ? "text-sky-700"
      : tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
      ? "text-amber-700"
      : tone === "rose"
      ? "text-rose-700"
      : tone === "indigo"
      ? "text-indigo-700"
      : "text-slate-900";

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1">
      <div className="text-xs font-bold text-slate-600">{label}</div>
      <div className={`text-2xl font-extrabold font-heading tabular-nums ${valueColor}`}>
        {value}
      </div>
      <div className="text-[11px] text-slate-500">{sub}</div>
    </div>
  );
}

function HousingGroupCard({ groupName }: { groupName: string }) {
  const row = KPP_MSO_LOGBOOK.housing[groupName];
  if (!row) return null;
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-extrabold text-sm text-slate-900">
            🏠 ความมั่นคงด้านที่อยู่อาศัย — กลุ่ม{groupName}
          </h4>
          <p className="text-xs text-slate-500">
            ข้อมูลจริงจากฐาน MSO-Logbook จังหวัดกำแพงเพชร ({KPP_MSO_LOGBOOK.main.region})
          </p>
        </div>
        <div className="text-xs font-bold text-slate-700 tabular-nums">
          รวม {fmt(row.people)} คน • {fmt(row.households)} ครัวเรือน
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MSO_HOUSING_TYPE_LABELS.map((label, idx) => {
          const val = row.types[idx] ?? 0;
          const pct = row.households > 0 ? ((val / row.households) * 100).toFixed(1) : "0.0";
          const isRisk = idx >= 2;
          return (
            <div
              key={label}
              className={`rounded-2xl border p-3.5 ${
                isRisk
                  ? "bg-rose-50/70 border-rose-200"
                  : "bg-slate-50/70 border-slate-200"
              }`}
            >
              <div className="text-[11px] font-bold text-slate-600">{label}</div>
              <div
                className={`text-xl font-extrabold mt-1 tabular-nums ${
                  isRisk ? "text-rose-700" : "text-slate-900"
                }`}
              >
                {fmt(val)} <span className="text-xs font-medium">ครัวเรือน</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                สัดส่วน {pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChildrenSubTabView() {
  const { subsidy } = KPP_MSO_LOGBOOK.welfare;
  const eduIssues = KPP_MSO_LOGBOOK.forms["การศึกษา"] || {};
  const childHousing = KPP_MSO_LOGBOOK.housing["เด็กและเยาวชน"];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="ประชากรเด็กแรกเกิด"
          value={fmt(subsidy.childpop)}
          sub="ฐานข้อมูลเงินอุดหนุนเด็กแรกเกิด"
          tone="sky"
        />
        <StatCard
          label="ลงทะเบียนขอรับสิทธิ"
          value={fmt(subsidy.registered)}
          sub={`มีสิทธิ ${fmt(subsidy.eligible)} คน`}
          tone="indigo"
        />
        <StatCard
          label="ได้รับเงินอุดหนุนแล้ว"
          value={fmt(subsidy.received)}
          sub={`ยังไม่ได้รับ ${fmt(subsidy.notReceived)} คน`}
          tone="emerald"
        />
        <StatCard
          label="เด็ก/เยาวชนเปราะบาง (ที่อยู่อาศัย)"
          value={fmt(childHousing?.people)}
          sub={`${fmt(childHousing?.households)} ครัวเรือน`}
          tone="amber"
        />
        <StatCard
          label="ครอบครัวอุปถัมภ์ / บุตรบุญธรรม"
          value="NA"
          sub="รอเชื่อมข้อมูลรายปี (SOSYS)"
        />
      </div>

      <HousingGroupCard groupName="เด็กและเยาวชน" />

      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h4 className="font-extrabold text-sm text-slate-900">
          📚 ประเด็นปัญหาด้านการศึกษาที่พบในกลุ่มเปราะบาง (MSO-Logbook)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="border border-slate-200 px-3 py-2 text-left">ประเด็นปัญหา</th>
                <th className="border border-slate-200 px-3 py-2 text-right">รวม (ครั้ง)</th>
                <th className="border border-slate-200 px-3 py-2 text-right text-rose-700">ยังไม่มีแผน</th>
                <th className="border border-slate-200 px-3 py-2 text-right">ติดตามอยู่</th>
                <th className="border border-slate-200 px-3 py-2 text-right">กำลังดำเนินการ</th>
                <th className="border border-slate-200 px-3 py-2 text-right">ปิดเคส</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(eduIssues).map(([name, st]) => (
                <tr key={name} className="even:bg-slate-50/60">
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">{name}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right font-bold tabular-nums">{fmt(st.total)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right font-semibold text-rose-700 tabular-nums">{fmt(st.noplan)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">{fmt(st.tracked)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">{fmt(st.ongoing)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-emerald-700 tabular-nums">{fmt(st.closed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function WomenSubTabView() {
  const { single, teen, singleTeen } = KPP_MSO_LOGBOOK.welfare;
  const violenceCount = KPP_MSO_LOGBOOK.main.dims["ความรุนแรงในครอบครัว/สังคม"] ?? 0;
  const traffickingCount = KPP_MSO_LOGBOOK.main.dims["การเป็นผู้เสียหายจากการค้ามนุษย์"] ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="แม่เลี้ยงเดี่ยว (ได้รับเงิน)"
          value={fmt(single.received)}
          sub={`ลงทะเบียน ${fmt(single.registered)} • มีสิทธิ ${fmt(single.eligible)}`}
          tone="indigo"
        />
        <StatCard
          label="แม่วัยรุ่น (ได้รับเงิน)"
          value={fmt(teen.received)}
          sub={`ลงทะเบียน ${fmt(teen.registered)} • มีสิทธิ ${fmt(teen.eligible)}`}
          tone="amber"
        />
        <StatCard
          label="แม่เลี้ยงเดี่ยววัยรุ่น (ได้รับเงิน)"
          value={fmt(singleTeen.received)}
          sub={`ลงทะเบียน ${fmt(singleTeen.registered)} • มีสิทธิ ${fmt(singleTeen.eligible)}`}
          tone="rose"
        />
        <StatCard
          label="ความรุนแรงในครอบครัว/สังคม"
          value={fmt(violenceCount)}
          sub="ครั้ง (ข้อมูล MSO-Logbook)"
          tone="rose"
        />
        <StatCard
          label="อัตราคลอดในวัยรุ่น (SOSYS)"
          value="NA"
          sub="รอเชื่อมตัวชี้วัด สธ./SOSYS"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h4 className="font-extrabold text-sm text-slate-900">
          👩 สถานการณ์กลุ่มมารดา 3 กลุ่ม และความรุนแรง/การค้ามนุษย์
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="border border-slate-200 px-3 py-2 text-left">กลุ่มเป้าหมาย</th>
                <th className="border border-slate-200 px-3 py-2 text-right">ลงทะเบียน (คน)</th>
                <th className="border border-slate-200 px-3 py-2 text-right">มีสิทธิรับเงิน</th>
                <th className="border border-slate-200 px-3 py-2 text-right">ได้รับเงินแล้ว</th>
                <th className="border border-slate-200 px-3 py-2 text-right">ความครอบคลุม</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "แม่เลี้ยงเดี่ยว (Single Mother)", d: single },
                { label: "แม่วัยรุ่น (Teen Mother)", d: teen },
                { label: "แม่เลี้ยงเดี่ยววัยรุ่น (Single Teen Mother)", d: singleTeen },
              ].map((row) => (
                <tr key={row.label} className="even:bg-slate-50/60">
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">{row.label}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">{fmt(row.d.registered)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">{fmt(row.d.eligible)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right font-bold text-emerald-700 tabular-nums">{fmt(row.d.received)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-sky-700 font-semibold tabular-nums">
                    {row.d.eligible > 0 ? `${((row.d.received / row.d.eligible) * 100).toFixed(1)}%` : "NA"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-slate-500">
          ข้อมูลเพิ่มเติมจาก MSO-Logbook: ผู้เสียหายจากการค้ามนุษย์ {fmt(traffickingCount)} ครั้ง • ความรุนแรงในครอบครัว/สังคม {fmt(violenceCount)} ครั้ง
        </div>
      </div>
    </div>
  );
}

export function ElderlySubTabView() {
  const elderly = KPP_MSO_LOGBOOK.housing["ผู้สูงอายุ"];
  const elderlyPwd = KPP_MSO_LOGBOOK.housing["ผู้สูงอายุที่พิการ"];
  const accessMap = KPP_MSO_LOGBOOK.forms["การเข้าไม่ถึงสิทธิและความเป็นธรรมในสังคม"] || {};
  const allowanceGap = accessMap["เข้าไม่ถึงสิทธิ การจดทะเบียนรับเบี้ยยังชีพผู้สูงอายุ / เบี้ยความพิการ"];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="ผู้สูงอายุเปราะบาง (ที่อยู่อาศัย)"
          value={fmt(elderly?.people)}
          sub={`${fmt(elderly?.households)} ครัวเรือน`}
          tone="sky"
        />
        <StatCard
          label="ผู้สูงอายุที่พิการ"
          value={fmt(elderlyPwd?.people)}
          sub={`${fmt(elderlyPwd?.households)} ครัวเรือน`}
          tone="amber"
        />
        <StatCard
          label="เข้าไม่ถึงสิทธิเบี้ยยังชีพฯ"
          value={fmt(allowanceGap?.total)}
          sub={`ยังไม่มีแผน ${fmt(allowanceGap?.noplan)} ครั้ง`}
          tone="rose"
        />
        <StatCard
          label="ประชากรผู้สูงอายุ 60+ ทั้งจังหวัด"
          value="NA"
          sub="รอเชื่อมข้อมูลกรมกิจการผู้สูงอายุ / SOSYS"
        />
      </div>

      <HousingGroupCard groupName="ผู้สูงอายุ" />
      <HousingGroupCard groupName="ผู้สูงอายุที่พิการ" />
    </div>
  );
}

export function DisabledSubTabView() {
  const pwd = KPP_MSO_LOGBOOK.housing["คนพิการ"];
  const elderlyPwd = KPP_MSO_LOGBOOK.housing["ผู้สูงอายุที่พิการ"];
  const accessMap = KPP_MSO_LOGBOOK.forms["การเข้าไม่ถึงสิทธิและความเป็นธรรมในสังคม"] || {};
  const noCardIssue = accessMap["ไม่ได้ยืนคําขอมีบัตรประจําตัวคนพิการ"];
  const allowanceGap = accessMap["เข้าไม่ถึงสิทธิ การจดทะเบียนรับเบี้ยยังชีพผู้สูงอายุ / เบี้ยความพิการ"];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="คนพิการเปราะบาง (ที่อยู่อาศัย)"
          value={fmt(pwd?.people)}
          sub={`${fmt(pwd?.households)} ครัวเรือน`}
          tone="indigo"
        />
        <StatCard
          label="ผู้สูงอายุที่พิการ"
          value={fmt(elderlyPwd?.people)}
          sub={`${fmt(elderlyPwd?.households)} ครัวเรือน`}
          tone="amber"
        />
        <StatCard
          label="ไม่ได้ยื่นคำขอมีบัตรคนพิการ"
          value={fmt(noCardIssue?.total)}
          sub={`ยังไม่มีแผน ${fmt(noCardIssue?.noplan)} • ติดตาม ${fmt(noCardIssue?.tracked)}`}
          tone="rose"
        />
        <StatCard
          label="คนพิการมีบัตรทั้งจังหวัด (พก.)"
          value="NA"
          sub={`เข้าไม่ถึงเบี้ยยังชีพ/พิการ ${fmt(allowanceGap?.total)} ครั้ง`}
        />
      </div>

      <HousingGroupCard groupName="คนพิการ" />
      <HousingGroupCard groupName="ผู้สูงอายุที่พิการ" />
    </div>
  );
}

export function HomelessSubTabView() {
  const groups = Object.entries(KPP_MSO_LOGBOOK.housing);
  const totalNoHome = groups.reduce((s, [, g]) => s + (g.types[3] || 0), 0);
  const totalFragileHome = groups.reduce((s, [, g]) => s + (g.types[2] || 0), 0);
  const incomeMap = KPP_MSO_LOGBOOK.forms["การมีงานทำและมีรายได้"] || {};
  const destituteIssue = incomeMap["ยากจน/ไร้ที่พึ่ง"];
  const beggingIssue = incomeMap["ขอทาน"];
  const housingDimTotal = KPP_MSO_LOGBOOK.main.dims["ที่อยู่อาศัย"] ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="ไม่มีที่อยู่อาศัย / เร่ร่อน"
          value={fmt(totalNoHome)}
          sub="ครัวเรือน (รวม 4 กลุ่มเป้าหมาย)"
          tone="rose"
        />
        <StatCard
          label="ที่อยู่อาศัยไม่มั่นคง / ทรุดโทรม"
          value={fmt(totalFragileHome)}
          sub="ครัวเรือน (รวม 4 กลุ่มเป้าหมาย)"
          tone="amber"
        />
        <StatCard
          label="ปัญหายากจน / ไร้ที่พึ่ง"
          value={fmt(destituteIssue?.total)}
          sub={`ยังไม่มีแผน ${fmt(destituteIssue?.noplan)} • ขอทาน ${fmt(beggingIssue?.total)}`}
          tone="indigo"
        />
        <StatCard
          label="ปัญหาด้านที่อยู่อาศัยรวม"
          value={fmt(housingDimTotal)}
          sub="ครั้ง (ข้อมูล MSO-Logbook)"
          tone="sky"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h4 className="font-extrabold text-sm text-slate-900">
          🏕️ จำแนกครัวเรือนที่ไม่มีที่อยู่อาศัย / ที่อยู่อาศัยไม่มั่นคง ตาม 4 กลุ่มเป้าหมาย
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="border border-slate-200 px-3 py-2 text-left">กลุ่มเป้าหมาย</th>
                <th className="border border-slate-200 px-3 py-2 text-right">คนทั้งหมด</th>
                <th className="border border-slate-200 px-3 py-2 text-right">ครัวเรือนทั้งหมด</th>
                <th className="border border-slate-200 px-3 py-2 text-right text-amber-800">ไม่มั่นคง/ทรุดโทรม</th>
                <th className="border border-slate-200 px-3 py-2 text-right text-rose-700">ไม่มีที่อยู่อาศัย/เร่ร่อน</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(([name, g]) => (
                <tr key={name} className="even:bg-slate-50/60">
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">{name}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">{fmt(g.people)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">{fmt(g.households)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right font-semibold text-amber-700 tabular-nums">{fmt(g.types[2])}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right font-bold text-rose-700 tabular-nums">{fmt(g.types[3])}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-sky-50 font-bold text-slate-900">
                <td className="border border-slate-200 px-3 py-2">รวม 4 กลุ่มเป้าหมาย</td>
                <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                  {fmt(groups.reduce((s, [, g]) => s + g.people, 0))}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                  {fmt(groups.reduce((s, [, g]) => s + g.households, 0))}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-right text-amber-800 tabular-nums">
                  {fmt(totalFragileHome)}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-right text-rose-800 tabular-nums">
                  {fmt(totalNoHome)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
