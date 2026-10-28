"use client";

import React, { useState, useMemo } from "react";
import { CarBookingRequest, BookingNotificationLog, Member } from "@/lib/types";

interface NotificationLogsModalProps {
  booking?: CarBookingRequest | null;
  allBookings?: CarBookingRequest[];
  currentUser?: Member;
  onClose: () => void;
  onSelectBooking?: (booking: CarBookingRequest) => void;
  onSendCustomNotification?: (bookingId: string, title: string, message: string, recipientRole: string) => void;
}

interface EnrichedNotification extends BookingNotificationLog {
  parentBooking: CarBookingRequest;
}

export function NotificationLogsModal({
  booking,
  allBookings = [],
  currentUser,
  onClose,
  onSelectBooking,
}: NotificationLogsModalProps) {
  const [filterTab, setFilterTab] = useState<"to_me" | "all">(booking ? "all" : "to_me");
  const [searchQuery, setSearchQuery] = useState("");

  // Aggregate all notifications
  const allNotifs = useMemo(() => {
    const list: EnrichedNotification[] = [];
    const targetBookings = booking ? [booking] : allBookings;

    for (const b of targetBookings) {
      if (Array.isArray(b.notifications)) {
        for (const n of b.notifications) {
          list.push({
            ...n,
            parentBooking: b,
          });
        }
      }
    }

    // Sort newest first
    return list.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
  }, [booking, allBookings]);

  // Notifications relevant to current user
  const myNotifs = useMemo(() => {
    if (!currentUser) return allNotifs;
    const myName = currentUser.name || "";
    const myDivision = currentUser.division || "";
    const myRole = currentUser.role || "";
    const myPosition = currentUser.position || "";

    return allNotifs.filter((n) => {
      // 1. Direct name match in recipient
      if (n.recipientName && myName && (n.recipientName.includes(myName) || myName.includes(n.recipientName))) {
        return true;
      }
      // 2. Division match for division reviewer
      if (n.recipientRole?.includes("หัวหน้ากลุ่ม") && (myPosition.includes("หัวหน้า") || myRole === "manager") && n.parentBooking.requesterDivision === myDivision) {
        return true;
      }
      // 3. Fleet staff match
      const isFleetUser = currentUser.id === "syno_ปภาวิน" || currentUser.id === "syno_เสกพล" || myName.includes("ปภาวิน") || myName.includes("เสกพล");
      if (isFleetUser && (n.recipientRole?.includes("ฝ่ายบริหาร") || n.recipientRole?.includes("จัดสรร"))) {
        return true;
      }
      // 4. Admin Head match
      const isAdminHead = currentUser.id === "syno_เสกพล" || myName.includes("เสกพล");
      if (isAdminHead && n.recipientRole?.includes("หัวหน้าฝ่ายบริหาร")) {
        return true;
      }
      // 5. Provincial head match
      const isProvincial = myPosition.includes("พัฒนาสังคม") || myName.includes("มะลิวัน");
      if (isProvincial && (n.recipientRole?.includes("พมจ") || n.recipientRole?.includes("พัฒนาสังคมและความมั่นคง"))) {
        return true;
      }
      // 6. Requester match
      if (n.parentBooking.requesterId === currentUser.id || n.parentBooking.requesterName === myName) {
        return true;
      }
      // 7. Assigned driver match
      if (n.parentBooking.assignedDriver && n.parentBooking.assignedDriver.includes(myName)) {
        return true;
      }
      return false;
    });
  }, [allNotifs, currentUser]);

  const displayedList = useMemo(() => {
    const base = filterTab === "to_me" ? myNotifs : allNotifs;
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q) ||
        n.recipientName?.toLowerCase().includes(q) ||
        n.recipientRole?.toLowerCase().includes(q) ||
        n.parentBooking.requestNo?.toLowerCase().includes(q)
    );
  }, [filterTab, myNotifs, allNotifs, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[92vh] flex flex-col animate-fade-in">
        
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-emerald-700 via-teal-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl backdrop-blur-xs">
              🔔
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>ศูนย์การแจ้งเตือนระบบจองรถราชการ (Notification Center)</span>
                {booking && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-900/60 text-emerald-200 text-xs font-mono">
                    {booking.requestNo}
                  </span>
                )}
              </h2>
              <p className="text-xs text-emerald-100">
                {booking
                  ? `ประวัติการส่ง Line Notify และ System Alerts สำหรับคำขอ ${booking.requestNo}`
                  : `บันทึกการส่งการแจ้งเตือนไปยังบุคคลที่เกี่ยวข้องในทุกขั้นตอนการขอใช้รถ`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab & Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {!booking && (
              <>
                <button
                  type="button"
                  onClick={() => setFilterTab("to_me")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterTab === "to_me"
                      ? "bg-teal-700 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>🔔</span>
                  <span>แจ้งเตือนถึงฉัน ({myNotifs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterTab === "all"
                      ? "bg-teal-700 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>📋</span>
                  <span>การแจ้งเตือนทั้งหมด ({allNotifs.length})</span>
                </button>
              </>
            )}
            {booking && (
              <span className="text-xs text-slate-600 font-medium">
                รายการแจ้งเตือนของคำขอนี้ ({allNotifs.length} รายการ)
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาข้อความ, ผู้รับ, เลขคำขอ..."
              className="w-full sm:w-60 pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-teal-500"
            />
            <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 bg-slate-100/40">
          {displayedList.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-3xl text-slate-400 text-xs space-y-2">
              <span className="text-3xl block">📭</span>
              <p className="font-bold text-slate-600">ไม่พบรายการแจ้งเตือนตามเงื่อนไขที่เลือก</p>
              <p className="text-slate-400">
                {filterTab === "to_me"
                  ? "ยังไม่มีการแจ้งเตือนที่ระบุชื่อหรือบทบาทของท่านในขณะนี้"
                  : "ยังไม่มีประวัติการส่งการแจ้งเตือนในระบบ"}
              </p>
            </div>
          ) : (
            displayedList.map((n, idx) => {
              const isLine = n.channel === "line_notify";
              return (
                <div
                  key={n.id || idx}
                  className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-teal-300 transition-all space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 pb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isLine
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-blue-100 text-blue-800 border border-blue-300"
                        }`}
                      >
                        <span>{isLine ? "🟢 Line Notify" : "🔵 System Alert"}</span>
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{n.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-md">
                        {n.parentBooking.requestNo}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
                    </div>
                  </div>

                  {/* Simulated Line Balloon Message */}
                  <div className="p-3 bg-[#E8F8F5] border border-[#A3E4D7] rounded-xl text-xs text-slate-800 font-body leading-relaxed space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-900">
                      <span>💬 ข้อความแจ้งเตือน:</span>
                    </div>
                    <p className="text-slate-900">{n.message}</p>
                  </div>

                  {/* Recipient & Action Info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">ส่งถึง:</span>
                      <span className="font-bold text-slate-800">{n.recipientName || "-"}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px]">
                        {n.recipientRole}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-emerald-700 font-medium flex items-center gap-1 text-[11px]">
                        <span>✓</span>
                        <span>ส่งแจ้งเตือนสำเร็จ (Delivered)</span>
                      </span>

                      {onSelectBooking && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectBooking(n.parentBooking);
                          }}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          เปิดดูคำขอนี้ ➔
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ระบบแจ้งเตือนอัตโนมัติ 4 ระดับ (ผู้ขอ ➔ หน.กลุ่ม ➔ ฝ่ายบริหาร ➔ พมจ.)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
