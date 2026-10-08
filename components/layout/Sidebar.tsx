import Link from "next/link";

const pages = [
  { id: "dashboard", label: "หน้าแรก", icon: "📊" },
  { id: "chat", label: "แชท", icon: "💬" },
  { id: "task", label: "งาน", icon: "📋" },
  { id: "meetings", label: "การประชุม", icon: "📹" },
  { id: "carbooking", label: "รถยนต์สำนักงาน", icon: "🚗" },
  { id: "user", label: "ผู้ใช้", icon: "👤" },
  { id: "admin", label: "ระบบจัดการ", icon: "⚙️" },
  { id: "reports", label: "รายงาน", icon: "📈" },
];

export function Sidebar({ open, onClose }) {
  return (
    <div className={`fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar text-sidebar-text transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
      <div className="flex items-center justify-center h-16 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold">Σ</div>
          <span className="text-lg font-bold text-white font-heading">OmniOffice</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {pages.map((p) => (
          <Link key={p.id} href={`/${p.id}`} className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors hover:bg-sidebar/50">
            <span className="text-lg">{p.icon}</span>
            <span className="font-medium">{p.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-white font-bold">AW</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">วรกร วิเชียรเกษม</div>
            <div className="text-xs text-white/60 truncate">Software Engineer</div>
          </div>
        </div>
      </div>
    </div>
  );
}