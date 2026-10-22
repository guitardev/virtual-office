"use client";

import React, { useState, useMemo } from "react";
import { MeetingItem, Member } from "@/lib/types";
import { ROOM_PRESETS } from "@/lib/meeting-data";
import { recordAuditLog, saveMeeting } from "@/lib/supabase";

interface RoomsTabProps {
  currentUser: Member | null;
  meetings: MeetingItem[];
  setMeetings?: (meetings: MeetingItem[]) => void;
  showToast: (msg: string) => void;
}

export interface MeetingRoomMaster {
  id: string;
  name: string;
  building: string;
  capacity: number;
  equipment: string[];
  status: "available" | "maintenance";
  notes?: string;
}

const DEFAULT_ROOMS: MeetingRoomMaster[] = [
  {
    id: "room_1",
    name: "ห้องประชุม 1 (ศาลากลางจังหวัด ชั้น 2)",
    building: "ศาลากลางจังหวัดกำแพงเพชร (อาคารใหม่ ชั้น 2)",
    capacity: 40,
    equipment: ["จอโปรเจกเตอร์ 4K", "ไมโครโฟนไร้สาย 4 ตัว", "เครื่องเสียงห้องประชุม", "กล้อง Hybrid PTZ (Zoom/Meet)", "WiFi ความเร็วสูง"],
    status: "available",
    notes: "ห้องประชุมใหญ่สำหรับประชุมข้าราชการประจำเดือนและคณะทำงานจังหวัด",
  },
  {
    id: "room_2",
    name: "ห้องประชุม 2 (ศาลากลางจังหวัด ชั้น 4)",
    building: "ศาลากลางจังหวัดกำแพงเพชร (อาคารใหม่ ชั้น 4)",
    capacity: 25,
    equipment: ["Smart TV 75 นิ้ว", "Soundbar + ไมค์คอนเฟอเรนซ์", "กล้อง Web Conference", "ไวท์บอร์ด"],
    status: "available",
    notes: "ห้องประชุมขนาดกลาง เหมาะสำหรับการประชุมพิจารณาโครงการและติดตามงาน",
  },
  {
    id: "room_3",
    name: "ห้องประชุมกลุ่มนโยบายและวิชาการ",
    building: "สำนักงาน พมจ. กำแพงเพชร (ห้องกลุ่มนโยบาย)",
    capacity: 12,
    equipment: ["Smart TV 55 นิ้ว", "ลำโพงบลูทูธพกพา", "สาย HDMI / Wireless Cast"],
    status: "available",
    notes: "การประชุมภายในกลุ่มงานและวิเคราะห์ข้อมูลสถิติ",
  },
  {
    id: "room_4",
    name: "ห้องประชุมกลุ่มการพัฒนาสังคมและสวัสดิการ",
    building: "สำนักงาน พมจ. กำแพงเพชร (ห้องกลุ่มสวัสดิการ)",
    capacity: 15,
    equipment: ["จอ Monitor 65 นิ้ว", "ไมค์ห้องประชุม", "แท่นบรรยาย"],
    status: "available",
    notes: "ประชุมทีมช่วยเหลือผู้ประสบปัญหาทางสังคมและเครือข่าย พม.",
  },
  {
    id: "room_5",
    name: "ห้องประชุมฝ่ายบริหารทั่วไป",
    building: "สำนักงาน พมจ. กำแพงเพชร (ห้องฝ่ายบริหาร)",
    capacity: 10,
    equipment: ["จอ Monitor 43 นิ้ว", "สายเชื่อมต่อสารบรรณและบัญชี"],
    status: "available",
    notes: "ประชุมการเงิน พัสดุ และงานธุรการทั่วไป",
  },
  {
    id: "room_6",
    name: "ห้องประชุม War Room ศูนย์ปฏิบัติการ พมจ.",
    building: "สำนักงาน พมจ. กำแพงเพชร (War Room 1300)",
    capacity: 8,
    equipment: ["Multi-Screen Video Wall", "ระบบ Hotline 1300 บูรณาการ", "ไมค์ตั้งโต๊ะ", "บันทึกเสียงอัตโนมัติ"],
    status: "available",
    notes: "ศูนย์ประสานงานสถานการณ์ฉุกเฉินและช่วยเหลือรายกรณีเร่งด่วน",
  },
];

export function RoomsTab({ currentUser, meetings, setMeetings, showToast }: RoomsTabProps) {
  const [rooms, setRooms] = useState<MeetingRoomMaster[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("smartmso_meeting_rooms_master");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_ROOMS;
  });

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoomMaster | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    building: "",
    capacity: 20,
    equipmentStr: "จอโปรเจกเตอร์, ไมโครโฟน, แอร์, กล้องออนไลน์",
    status: "available" as "available" | "maintenance",
    notes: "",
  });

  const saveRoomsToStorage = (updated: MeetingRoomMaster[]) => {
    setRooms(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("smartmso_meeting_rooms_master", JSON.stringify(updated));
      } catch {}
    }
  };

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setFormData({
      name: "",
      building: "สำนักงาน พมจ.กำแพงเพชร",
      capacity: 20,
      equipmentStr: "จอโปรเจกเตอร์, ไมโครโฟนไร้สาย, แอร์, กล้องออนไลน์",
      status: "available",
      notes: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (r: MeetingRoomMaster) => {
    setEditingRoom(r);
    setFormData({
      name: r.name,
      building: r.building,
      capacity: r.capacity,
      equipmentStr: r.equipment.join(", "),
      status: r.status,
      notes: r.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const eqList = formData.equipmentStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const roomObj: MeetingRoomMaster = {
      id: editingRoom ? editingRoom.id : `room_${Date.now()}`,
      name: formData.name.trim(),
      building: formData.building.trim(),
      capacity: Number(formData.capacity) || 10,
      equipment: eqList.length > 0 ? eqList : ["แอร์", "จอแสดงผล"],
      status: formData.status,
      notes: formData.notes.trim() || undefined,
    };

    const updated = editingRoom
      ? rooms.map((r) => (r.id === roomObj.id ? roomObj : r))
      : [...rooms, roomObj];

    saveRoomsToStorage(updated);
    await recordAuditLog(
      currentUser?.name || "Admin",
      editingRoom ? `แก้ไขข้อมูลห้องประชุม: ${roomObj.name}` : `เพิ่มห้องประชุมราชการใหม่: ${roomObj.name}`,
      "Meeting Rooms Master",
      "success"
    );

    showToast(editingRoom ? "✏️ บันทึกการแก้ไขข้อมูลห้องประชุมเรียบร้อย" : "🎉 เพิ่มห้องประชุมใหม่เรียบร้อยแล้ว");
    setShowModal(false);
  };

  const handleToggleStatus = async (r: MeetingRoomMaster) => {
    const nextStatus: "available" | "maintenance" = r.status === "available" ? "maintenance" : "available";
    const updated = rooms.map((item) => (item.id === r.id ? { ...item, status: nextStatus } : item));
    saveRoomsToStorage(updated);
    await recordAuditLog(
      currentUser?.name || "Admin",
      `${nextStatus === "available" ? "เปิดใช้งาน" : "ปิดปรับปรุง"} ห้องประชุม: ${r.name}`,
      "Meeting Rooms Master",
      "success"
    );
    showToast(nextStatus === "available" ? `🟢 เปิดใช้งาน ${r.name}` : `🔴 ปิดปรับปรุง ${r.name}`);
  };

  const handleDelete = async (r: MeetingRoomMaster) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบห้อง "${r.name}" ออกจากสารบบ?`)) return;
    const updated = rooms.filter((item) => item.id !== r.id);
    saveRoomsToStorage(updated);
    await recordAuditLog(
      currentUser?.name || "Admin",
      `ลบห้องประชุม: ${r.name}`,
      "Meeting Rooms Master",
      "success"
    );
    showToast(`🗑️ ลบห้องประชุม ${r.name} เรียบร้อยแล้ว`);
  };

  const handleCancelMeeting = async (m: MeetingItem) => {
    if (!window.confirm(`ยืนยันการยกเลิกการประชุม "${m.title}" โดยผู้ดูแลระบบ?`)) return;
    const updatedM: MeetingItem = { ...m, status: "cancelled" };
    if (setMeetings) {
      setMeetings(meetings.map((item) => (item.id === m.id ? updatedM : item)));
    }
    await saveMeeting(updatedM);
    await recordAuditLog(
      currentUser?.name || "Admin",
      `ยกเลิกการประชุม: ${m.title} (สถานที่: ${m.location})`,
      "Meeting Booking Control",
      "denied"
    );
    showToast(`⛔ ยกเลิกการประชุม "${m.title}" เรียบร้อยแล้ว`);
  };

  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((r) => r.status === "available").length;
    const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
    const activeMeetings = meetings.filter((m) => m.status !== "cancelled").length;
    return { totalRooms, availableRooms, totalCapacity, activeMeetings };
  }, [rooms, meetings]);

  const filteredRooms = useMemo(() => {
    if (!search.trim()) return rooms;
    const q = search.toLowerCase();
    return rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.building.toLowerCase().includes(q) ||
        r.equipment.some((e) => e.toLowerCase().includes(q))
    );
  }, [rooms, search]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">🏛️</span>
          <div className="text-xs leading-relaxed text-teal-900">
            <span className="font-bold block text-sm mb-0.5">
              ศูนย์บริหารจัดการห้องประชุม &amp; สถานที่ราชการ (Meeting Rooms &amp; Facilities)
            </span>
            ควบคุมสารบบห้องประชุมสำนักงาน ความจุ อุปกรณ์ประจำห้อง สถานะความพร้อม และภาพรวมการจองห้องประชุมทั้งองค์กร
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>+ เพิ่มห้องประชุมใหม่</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">ห้องประชุมทั้งหมด</div>
          <div className="text-2xl font-bold font-heading text-slate-900 mt-0.5">{stats.totalRooms}</div>
          <div className="text-[10px] text-slate-400">ห้องในสารบบ</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">พร้อมใช้งาน</div>
          <div className="text-2xl font-bold font-heading text-emerald-600 mt-0.5">{stats.availableRooms}</div>
          <div className="text-[10px] text-emerald-500">🟢 เปิดรับจอง</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">ความจุรวมทั้งหมด</div>
          <div className="text-2xl font-bold font-heading text-indigo-600 mt-0.5">{stats.totalCapacity}</div>
          <div className="text-[10px] text-indigo-500">👥 ที่นั่งรองรับ</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">การประชุมที่จัดไว้</div>
          <div className="text-2xl font-bold font-heading text-purple-600 mt-0.5">{stats.activeMeetings}</div>
          <div className="text-[10px] text-purple-500">📋 รายการประชุม</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อห้อง, อาคารสถานที่, อุปกรณ์..."
          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Rooms Master Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{r.name}</h4>
                  <div className="text-xs text-slate-500 mt-0.5">📍 {r.building}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                    r.status === "available"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {r.status === "available" ? "🟢 เปิดใช้งาน" : "🔴 ปิดปรับปรุง"}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">ความจุที่นั่ง:</span>
                <span className="font-bold text-slate-900">{r.capacity} คน</span>
              </div>

              {/* Equipment list */}
              <div className="mt-2.5">
                <span className="text-[10px] text-slate-400 block mb-1">อุปกรณ์ประจำห้อง:</span>
                <div className="flex flex-wrap gap-1">
                  {r.equipment.map((eq, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium"
                    >
                      {eq}
                    </span>
                  ))}
                </div>
              </div>

              {r.notes && (
                <p className="mt-2 text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                  {r.notes}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleToggleStatus(r)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  r.status === "available"
                    ? "text-amber-700 hover:bg-amber-50"
                    : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                {r.status === "available" ? "ปิดปรับปรุงชั่วคราว" : "เปิดใช้งานห้อง"}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(r)}
                  className="px-2.5 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r)}
                  className="px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  ลบ
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Meetings Schedule Overview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <h3 className="text-sm font-bold text-slate-900">
              ภาพรวมการใช้ห้องประชุมในสำนักงาน ({meetings.length} รายการ)
            </h3>
          </div>
          <span className="text-xs text-slate-400">ควบคุมและกำกับดูแลโดยผู้ดูแลระบบ</span>
        </div>

        {meetings.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            ยังไม่มีรายการประชุมในระบบ
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {meetings.slice(0, 10).map((m) => (
              <div
                key={m.id}
                className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{m.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        m.status === "cancelled"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {m.status === "cancelled" ? "ยกเลิกแล้ว" : "ยืนยันแล้ว"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700">
                      {m.type === "online" ? "🌐 ออนไลน์" : m.type === "hybrid" ? "🔄 ไฮบริด" : "🏢 ออนไซต์"}
                    </span>
                  </div>
                  <div className="text-slate-500">
                    📍 {m.location} · 📅 {m.dateStr} เวลา {m.timeStr}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    ผู้จัด: {m.organizer?.name || "ไม่ระบุ"} ({m.organizer?.division || "พมจ."}) · ผู้เข้าร่วม {m.attendees?.length || 0} คน
                  </div>
                </div>

                {m.status !== "cancelled" && (
                  <button
                    type="button"
                    onClick={() => handleCancelMeeting(m)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors shrink-0 self-start md:self-auto cursor-pointer"
                  >
                    ยกเลิกการประชุม
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Add/Edit Room */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingRoom ? "✏️ แก้ไขข้อมูลห้องประชุม" : "🏛️ เพิ่มห้องประชุมใหม่"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อห้องประชุม *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น ห้องประชุม 3 (อาคารเฉลิมพระเกียรติ)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">อาคาร / สถานที่</label>
                  <input
                    type="text"
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    placeholder="เช่น ศาลากลางจังหวัด ชั้น 3"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ความจุที่นั่ง (คน)</label>
                  <input
                    type="number"
                    min={2}
                    max={500}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">อุปกรณ์ประจำห้อง (คั่นด้วยจุลภาค ,)</label>
                <input
                  type="text"
                  value={formData.equipmentStr}
                  onChange={(e) => setFormData({ ...formData, equipmentStr: e.target.value })}
                  placeholder="เช่น จอโปรเจกเตอร์, ไมค์ 2 ตัว, กล้อง Hybrid, แอร์"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">สถานะเริ่มต้น</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="available">🟢 พร้อมใช้งาน (เปิดให้จอง)</option>
                  <option value="maintenance">🔴 ปิดปรับปรุง / ซ่อมแซม</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">หมายเหตุเพิ่มเติม</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ระบุข้อกำหนดการใช้งาน เช่น ต้องประสานงานฝ่ายบริหารล่วงหน้า 1 วัน..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-md shadow-teal-600/25"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
