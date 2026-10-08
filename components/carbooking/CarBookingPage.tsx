"use client";

import React, { useState } from "react";
import { Member } from "@/lib/types";

interface CarBookingPageProps {
  currentUser: Member;
  showToast: (msg: string) => void;
}

export function CarBookingPage({ currentUser, showToast }: CarBookingPageProps) {
  const [selectedCar, setSelectedCar] = useState("Volvo XC60");
  const [bookingDestination, setBookingDestination] = useState("เดินทางไปศูนย์ประชุมสิริกิติ์ เพื่อพบลูกค้าโครงการใหม่");

  const handleBookCar = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`✅ บันทึกคำขอจองรถ ${selectedCar} สำเร็จ! เจ้าหน้าที่จะยืนยันผ่านแชท`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-slate-900">
          ระบบจองรถยนต์สำนักงาน (Car Booking)
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          บริการจองยานพาหนะส่วนกลางเพื่อปฏิบัติภารกิจนอกสถานที่
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "Volvo XC60", icon: "🚗", desc: "4 ที่นั่ง · Auto · แอร์แยกโซน", rate: "1,200 บาท / ชั่วโมง", status: "พร้อมใช้งาน" },
              { name: "Toyota Hilux 4WD", icon: "🚙", desc: "5 ที่นั่ง · ขับเคลื่อน 4 ล้อ · บรรทุกสัมภาระ", rate: "1,500 บาท / ชั่วโมง", status: "พร้อมใช้งาน" },
              { name: "Honda CR-V e:HEV", icon: "🚙", desc: "5 ที่นั่ง · ไฮบริดประหยัดพลังงาน", rate: "1,000 บาท / ชั่วโมง", status: "พร้อมใช้งาน" },
              { name: "Mitsubishi L200", icon: "🛻", desc: "2 ที่นั่ง · เกียร์ธรรมดา · กระบะบรรทุก", rate: "800 บาท / วัน", status: "งานขนส่ง" },
            ].map((car) => (
              <div
                key={car.name}
                onClick={() => setSelectedCar(car.name)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedCar === car.name
                    ? "border-[#4F46E5] bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-md"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{car.icon}</span>
                  <span className="text-xs px-2.5 py-1 bg-indigo-100 text-[#4F46E5] rounded-full font-bold">
                    {car.status}
                  </span>
                </div>
                <h3 className="font-bold font-heading text-base text-slate-900">{car.name}</h3>
                <div className="text-xs text-slate-500 mt-1">{car.desc}</div>
                <div className="mt-3 text-sm font-bold text-[#0D9488]">{car.rate}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <form onSubmit={handleBookCar} className="space-y-4">
            <h2 className="text-lg font-bold font-heading text-slate-900">แบบฟอร์มคำขอจอง</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">รถที่เลือก</label>
              <input
                type="text"
                readOnly
                value={selectedCar}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">วันที่และเวลาที่ต้องการใช้</label>
              <input
                type="datetime-local"
                defaultValue="2026-10-09T10:00"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อผู้ขอใช้งาน</label>
              <input
                type="text"
                readOnly
                value={`คุณ ${currentUser.name}`}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-800 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">วัตถุประสงค์การเดินทาง</label>
              <textarea
                rows={3}
                value={bookingDestination}
                onChange={(e) => setBookingDestination(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#0D9488] text-white rounded-xl text-sm font-bold shadow-md shadow-teal-700/20 hover:bg-[#0b7a6f] transition-colors cursor-pointer"
            >
              ✓ ยืนยันการจองรถ
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
