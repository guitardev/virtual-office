"use client";

import React from "react";
import Link from "next/link";
import { Member } from "@/lib/types";

interface ToolsOverviewPageProps {
  currentUser?: Member;
  showToast: (msg: string) => void;
}

export function ToolsOverviewPage({ currentUser }: ToolsOverviewPageProps) {
  const tools = [
    {
      id: "qrcode",
      title: "QR Code",
      subtitle: "สร้าง QR Code แบบถาวร (Static 2D Barcode)",
      description:
        "สร้าง QR Code คุณภาพสูงไม่มีวันหมดอายุ รองรับลิงก์เอกสาร เว็บไซต์ Wi-Fi ข้อความ และพร้อมเพย์ ปรับแต่งสี ฝังตราสัญลักษณ์ พม. และดาวน์โหลดไฟล์ความละเอียดสูงสำหรับงานพิมพ์/ป้ายไวนิล",
      icon: "📱",
      route: "/tools/qrcode",
      badge: "ถาวร 100%",
      badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
      gradient: "from-teal-600 to-emerald-600",
      features: [
        "ไม่มีวันหมดอายุตลอดชีพ (ไม่ล็อกรหัส)",
        "รองรับทั้ง URL, ข้อความ, Wi-Fi, เบอร์โทร",
        "ฝังตราสัญลักษณ์กระทรวง พม. ตรงกลาง",
        "ดาวน์โหลดความคมชัดสูงระดับ 4K สำหรับงานพิมพ์",
      ],
    },
    {
      id: "shorturl",
      title: "Short URL",
      subtitle: "ย่อลิงก์ราชการภายใต้โดเมน smso.site",
      description:
        "แปลงลิงก์ Google Forms, Google Drive หรือลิงก์ประชุมออนไลน์ที่ยาวให้อ่านง่ายและจำง่าย (/s/ชื่อย่อ) สามารถเปลี่ยน URL ปลายทางได้ภายหลังโดยไม่ต้องพิมพ์เอกสารหรือ QR Code ใหม่",
      icon: "🔗",
      route: "/tools/shorturl",
      badge: "smso.site/s/...",
      badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
      gradient: "from-indigo-600 to-cyan-600",
      features: [
        "กำหนดชื่อย่อเองได้ (เช่น /s/kpp-form) หรือสุ่มรหัสอ่านง่าย",
        "Dynamic Redirect แก้ไขลิงก์ปลายทางและวันหมดอายุได้ตลอด",
        "นับสถิติยอดคลิกใช้งานจริงแบบเรียลไทม์",
        "ส่งต่อเข้าเครื่องมือ QR Code ป้าย A4 ได้ในคลิกเดียว",
      ],
    },
    {
      id: "bgremove",
      title: "BG Remove",
      subtitle: "ลบและเปลี่ยนภาพพื้นหลังอัจฉริยะ",
      description:
        "เครื่องมือตัดและลบพื้นหลังภาพอย่างรวดเร็ว ปลอดภัย ประมวลผลบนเครื่องของคุณ 100% เหมาะสำหรับภาพถ่ายข้าราชการติดบัตร (ชุดปกติขาว/กากี) ตรายาง และภาพกิจกรรมราชการ",
      icon: "✂️",
      route: "/tools/bgremove",
      badge: "ออนดีไวซ์ ปลอดภัย",
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
      gradient: "from-indigo-600 to-blue-600",
      features: [
        "ประมวลผลบนเบราว์เซอร์ ข้อมูลไม่รั่วไหล",
        "เลือกพื้นหลังโปร่งใส ขาวบริสุทธิ์ หรือฟ้าทางการ",
        "เหมาะสำหรับทำภาพติดบัตรข้าราชการชุดปกติขาว",
        "ปรับระดับความไวในการตัดขอบได้ละเอียด",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-indigo-900/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <span>🛠️</span>
              <span>ศูนย์รวมเครื่องมือเพิ่มประสิทธิภาพ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              เครื่องมือ & Tools
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              ชุดเครื่องมือดิจิทัลอัจฉริยะสำหรับข้าราชการและเจ้าหน้าที่สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
              เพิ่มความคล่องตัวในการปฏิบัติงานโดยไม่ต้องพึ่งพาบริการภายนอก
            </p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center shrink-0">
            <div className="text-[10px] text-indigo-200 font-bold">เครื่องมือพร้อมใช้งาน</div>
            <div className="text-2xl font-extrabold text-white">{tools.length} เครื่องมือ</div>
          </div>
        </div>
      </div>

      {/* ─── TOOLS GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-lg hover:border-indigo-300 transition-all flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.gradient} text-white flex items-center justify-center text-3xl shadow-sm group-hover:scale-105 transition-transform shrink-0`}>
                    {tool.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                        {tool.title}
                      </h2>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tool.badgeColor}`}>
                        {tool.badge}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {tool.subtitle}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {tool.description}
              </p>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-700">คุณสมบัติเด่น:</div>
                <div className="grid grid-cols-1 gap-1">
                  {tool.features.map((feat, idx) => (
                    <div key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="text-teal-600 font-bold">✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href={tool.route}
              className={`w-full py-3 bg-gradient-to-r ${tool.gradient} hover:opacity-95 text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer`}
            >
              <span>เปิดใช้งาน {tool.title}</span>
              <span>➔</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
