"use client";

import React from "react";
import { CarBookingRequest, BookingNotificationLog } from "@/lib/types";

interface NotificationLogsModalProps {
  booking: CarBookingRequest;
  onClose: () => void;
  onSendCustomNotification?: (bookingId: string, title: string, message: string, recipientRole: string) => void;
}

export function NotificationLogsModal({
  booking,
  onClose,
  onSendCustomNotification,
}: NotificationLogsModalProps) {
  const notifs = booking.notifications || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header - Fixed */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl backdrop-blur-xs">
              📲
            </div>
            <div>
              <h2 className="text-base font-bold">บันทึกประวัติการแจ้งเตือน (Notification Logs)</h2>
              <p className="text-xs text-emerald-100">
                Line Notify & System Alerts สำหรับคำขอ {booking.requestNo} ({booking.vehicleName})
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

        {/* Body - Scrollable */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Quick summary of stakeholders */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-400">ผู้ขอใช้รถ:</span>
              <div className="font-bold text-slate-800 truncate">{booking.requesterName}</div>
            </div>
            <div>
              <span className="text-slate-400">พนักงานขับรถ:</span>
              <div className="font-bold text-teal-700 truncate">
                {booking.assignedDriver || (booking.requireDriver ? "รอจัดสรร" : "ขับเอง")}
              </div>
            </div>
            <div>
              <span className="text-slate-400">ผู้อนุมัติ:</span>
              <div className="font-bold text-indigo-700 truncate">
                {booking.approverName ? "พมจ.กำแพงเพชร" : "รออนุมัติ"}
              </div>
            </div>
          </div>

          {/* List of Notification Events */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <span>🔔</span>
              <span>ประวัติการส่งข้อความแจ้งเตือนทั้งหมด ({notifs.length} รายการ)</span>
            </h3>

            {notifs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                ยังไม่มีประวัติการส่งการแจ้งเตือนสำหรับคำขอนี้
              </div>
            ) : (
              notifs.map((n: BookingNotificationLog, idx: number) => {
                const isLine = n.channel === "line_notify";
                return (
                  <div
                    key={n.id || idx}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-teal-300 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
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
                      <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
                    </div>

                    {/* Simulated Message Bubble */}
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-800 border border-slate-200/80 font-sans leading-relaxed">
                      {n.message}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">ส่งถึง:</span>
                        <span className="font-semibold text-slate-700">{n.recipientRole}</span>
                        <span>({n.recipientName})</span>
                      </div>
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <span>✓</span>
                        <span>ส่งสำเร็จ (Delivered)</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            ระบบเชื่อมโยง API กับบริการ Line Notify & Mobile Push Notification
          </span>
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
