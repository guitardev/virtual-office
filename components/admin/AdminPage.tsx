"use client";

import React, { useMemo } from "react";
import { Member, Role, ModuleId, SystemModule, AccessRequest, AuditLog, MeetingItem, CircularDocument } from "@/lib/types";
import { MembersTab } from "./MembersTab";
import { RequestsTab } from "./RequestsTab";
import { MatrixTab } from "./MatrixTab";
import { AuditTab } from "./AuditTab";
import { NasTab } from "./NasTab";
import { VehiclesTab } from "./VehiclesTab";
import { RoomsTab } from "./RoomsTab";
import { DivisionsTab } from "./DivisionsTab";
import { DocumentsTab } from "./DocumentsTab";
import { ChannelsTab } from "./ChannelsTab";
import { ChatGroup } from "@/lib/types";

export type AdminTabId =
  | "members"
  | "requests"
  | "matrix"
  | "channels"
  | "vehicles"
  | "rooms"
  | "divisions"
  | "documents"
  | "audit"
  | "nas";

interface AdminPageProps {
  members: Member[];
  currentUser: Member | null;
  accessRequests: AccessRequest[];
  systemModules: Record<ModuleId, SystemModule>;
  rolePermissions: Record<Role, Record<ModuleId, boolean>>;
  auditLogs: AuditLog[];
  setAuditLogs: (logs: AuditLog[]) => void;
  initialAuditLogs: AuditLog[];
  adminTab: AdminTabId;
  setAdminTab: (tab: AdminTabId) => void;
  memberSearch: string;
  setMemberSearch: (val: string) => void;
  requestSearch: string;
  setRequestSearch: (val: string) => void;
  requestStatusFilter: "all" | "pending" | "approved" | "rejected";
  setRequestStatusFilter: (val: "all" | "pending" | "approved" | "rejected") => void;
  setShowAddMemberModal: (val: boolean) => void;
  setViewingMember: (m: Member | null) => void;
  handleOpenAdminEdit: (m: Member) => void;
  setMemberToDelete: (m: Member | null) => void;
  handleChangeMemberRole: (memberId: string, newRole: Role) => void;
  handleToggleMemberStatus?: (member: Member) => void;
  setSelectedRequest: (req: AccessRequest | null) => void;
  setShowRequestDetailModal: (val: boolean) => void;
  handleOpenEditRequest: (req: AccessRequest) => void;
  handleApproveRequest: (req: AccessRequest) => void;
  setRejectReason: (val: string) => void;
  setShowRejectModal: (val: boolean) => void;
  handleToggleModuleStatus: (modId: ModuleId) => void;
  handleOpenEditModule: (modId: ModuleId) => void;
  handleTogglePermission: (role: Role, moduleId: ModuleId) => void;
  showToast: (msg: string) => void;
  meetings?: MeetingItem[];
  setMeetings?: (meetings: MeetingItem[]) => void;
  setMembers?: (members: Member[]) => void;
  circularDocs?: CircularDocument[];
  onOpenCircularDoc?: (docId: string) => void;
  onNavigatePage?: (page: string) => void;
  chatGroups?: ChatGroup[];
  setChatGroups?: (groups: ChatGroup[]) => void;
  onSelectChatGroup?: (groupId: string) => void;
}

export function AdminPage({
  members,
  currentUser,
  accessRequests,
  systemModules,
  rolePermissions,
  auditLogs,
  setAuditLogs,
  initialAuditLogs,
  adminTab,
  setAdminTab,
  memberSearch,
  setMemberSearch,
  requestSearch,
  setRequestSearch,
  requestStatusFilter,
  setRequestStatusFilter,
  setShowAddMemberModal,
  setViewingMember,
  handleOpenAdminEdit,
  setMemberToDelete,
  handleChangeMemberRole,
  handleToggleMemberStatus,
  setSelectedRequest,
  setShowRequestDetailModal,
  handleOpenEditRequest,
  handleApproveRequest,
  setRejectReason,
  setShowRejectModal,
  handleToggleModuleStatus,
  handleOpenEditModule,
  handleTogglePermission,
  showToast,
  meetings,
  setMeetings,
  setMembers,
  circularDocs,
  onOpenCircularDoc,
  onNavigatePage,
  chatGroups,
  setChatGroups,
  onSelectChatGroup,
}: AdminPageProps) {
  // Compute stats
  const stats = useMemo(() => {
    const activeMembers = members.filter((m) => m.status === "active").length;
    const inactiveMembers = members.filter((m) => m.status === "inactive").length;
    const adminCount = members.filter((m) => m.role === "admin").length;
    const managerCount = members.filter((m) => m.role === "manager").length;
    const pendingRequests = accessRequests.filter((r) => r.status === "pending").length;
    const enabledModules = Object.values(systemModules).filter((m) => m.enabled).length;
    const totalModules = Object.keys(systemModules).length;
    const deniedAuditCount = auditLogs.filter((l) => l.status === "denied").length;
    return { activeMembers, inactiveMembers, adminCount, managerCount, pendingRequests, enabledModules, totalModules, deniedAuditCount };
  }, [members, accessRequests, systemModules, auditLogs]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-1">
            <span>🛡️ RBAC Control Center</span>
            <span>· Role-Based Access Control</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">
            ระบบจัดการสมาชิก &amp; กำหนดสิทธิ์โมดูล
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            ควบคุมการเข้าถึง {stats.totalModules} โมดูลหลัก กำหนดบทบาทรายบุคคล และตรวจสอบประวัติ Audit Log
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                const keysToRemove = [
                  "smartmso_access_requests_cache_v1",
                  "smartmso_access_requests",
                  "omnioffice_access_requests",
                  "smartmso_purged_mock_requests_v2",
                ];
                keysToRemove.forEach((k) => localStorage.removeItem(k));
                showToast("🧹 ล้างแคชคำขอสิทธิ์ในเบราว์เซอร์เรียบร้อยแล้ว กำลังรีโหลด...");
                setTimeout(() => window.location.reload(), 500);
              }
            }}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 border border-slate-200 shadow-xs"
            title="ล้างแคชคำขอสิทธิ์และประวัติเก่าในเบราว์เซอร์"
          >
            <span>🧹</span>
            <span>ล้างแคชเบราว์เซอร์</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddMemberModal(true)}
            className="px-4 py-2.5 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-colors shrink-0 cursor-pointer"
          >
            + เชิญสมาชิกใหม่
          </button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Members */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs col-span-1">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">สมาชิกทั้งหมด</div>
          <div className="text-2xl font-bold font-heading text-slate-900 mt-1">{members.length}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">🟢 Active {stats.activeMembers}</div>
        </div>

        {/* Admins */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Admin</div>
          <div className="text-2xl font-bold font-heading text-indigo-600 mt-1">{stats.adminCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">👑 ผู้ดูแลระบบ</div>
        </div>

        {/* Managers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Manager</div>
          <div className="text-2xl font-bold font-heading text-teal-600 mt-1">{stats.managerCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">👔 ผู้จัดการ</div>
        </div>

        {/* Inactive */}
        {stats.inactiveMembers > 0 ? (
          <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 shadow-xs">
            <div className="text-[10px] text-amber-700 font-medium uppercase tracking-wide">ระงับ</div>
            <div className="text-2xl font-bold font-heading text-amber-700 mt-1">{stats.inactiveMembers}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">⚪ Inactive</div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Inactive</div>
            <div className="text-2xl font-bold font-heading text-slate-400 mt-1">0</div>
            <div className="text-[10px] text-slate-400 mt-0.5">⚪ ไม่มี</div>
          </div>
        )}

        {/* Pending Requests */}
        <div
          onClick={() => setAdminTab("requests")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            stats.pendingRequests > 0
              ? "bg-amber-50/80 border-amber-200 shadow-xs hover:border-amber-400"
              : "bg-white border-slate-200/80 shadow-xs hover:border-slate-300"
          }`}
          title="คลิกเพื่อไปที่หน้ารายการคำขอสิทธิ์เข้าใช้งาน"
        >
          <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            <span>คำขอรออนุมัติ</span>
            {stats.pendingRequests > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <div className="text-2xl font-bold font-heading text-amber-600 mt-1">{stats.pendingRequests}</div>
          <div className="text-[10px] text-amber-500 mt-0.5">📬 คำขอ</div>
        </div>

        {/* Modules */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">โมดูล</div>
          <div className="text-2xl font-bold font-heading text-slate-900 mt-1">
            {stats.enabledModules}/{stats.totalModules}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">🟢 เปิดใช้งาน</div>
        </div>

        {/* Denied Audit */}
        <div
          onClick={() => setAdminTab("audit")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            stats.deniedAuditCount > 0
              ? "bg-red-50/60 border-red-200 shadow-xs hover:border-red-300"
              : "bg-white border-slate-200/80 shadow-xs hover:border-slate-300"
          }`}
          title="คลิกเพื่อดู Audit Log ที่ถูกปฏิเสธ"
        >
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">ปฏิเสธ (403)</div>
          <div className={`text-2xl font-bold font-heading mt-1 ${stats.deniedAuditCount > 0 ? "text-red-600" : "text-slate-400"}`}>
            {stats.deniedAuditCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">📜 Audit Log</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 px-6 pt-3 gap-2 bg-slate-50/50 overflow-x-auto">
          {[
            { id: "members", label: "👥 สมาชิก & สิทธิ์", count: members.length },
            {
              id: "requests",
              label: "📬 คำขอสิทธิ์ใหม่",
              count: accessRequests.filter((r) => r.status === "pending").length,
              highlight: accessRequests.filter((r) => r.status === "pending").length > 0,
            },
            { id: "matrix", label: "🔒 กำหนดสิทธิ์ (RBAC Matrix)" },
            { id: "channels", label: "💬 ห้องสื่อสารองค์กร", count: chatGroups?.length },
            { id: "vehicles", label: "🚗 ยานพาหนะราชการ" },
            { id: "rooms", label: "🏛️ ห้องประชุม & สถานที่" },
            { id: "divisions", label: "🏢 โครงสร้างกลุ่มงาน" },
            { id: "documents", label: "📜 ทะเบียนหนังสือเวียน", count: circularDocs?.length },
            { id: "audit", label: "📜 Audit Logs", count: auditLogs.length },
            { id: "nas", label: "💾 Synology NAS" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAdminTab(tab.id as AdminTabId)}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                adminTab === tab.id
                  ? "border-[#4F46E5] text-[#4F46E5] bg-white rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    (tab as any).highlight
                      ? "bg-amber-500 text-white animate-pulse"
                      : "bg-slate-200/70 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {adminTab === "members" && (
            <MembersTab
              members={members}
              currentUser={currentUser}
              memberSearch={memberSearch}
              setMemberSearch={setMemberSearch}
              setShowAddMemberModal={setShowAddMemberModal}
              setViewingMember={setViewingMember}
              handleOpenAdminEdit={handleOpenAdminEdit}
              setMemberToDelete={setMemberToDelete}
              handleChangeMemberRole={handleChangeMemberRole}
              handleToggleMemberStatus={handleToggleMemberStatus}
            />
          )}

          {adminTab === "requests" && (
            <RequestsTab
              accessRequests={accessRequests}
              requestSearch={requestSearch}
              setRequestSearch={setRequestSearch}
              requestStatusFilter={requestStatusFilter}
              setRequestStatusFilter={setRequestStatusFilter}
              setSelectedRequest={setSelectedRequest}
              setShowRequestDetailModal={setShowRequestDetailModal}
              handleOpenEditRequest={handleOpenEditRequest}
              handleApproveRequest={handleApproveRequest}
              setRejectReason={setRejectReason}
              setShowRejectModal={setShowRejectModal}
            />
          )}

          {adminTab === "matrix" && (
            <MatrixTab
              systemModules={systemModules}
              rolePermissions={rolePermissions}
              handleToggleModuleStatus={handleToggleModuleStatus}
              handleOpenEditModule={handleOpenEditModule}
              handleTogglePermission={handleTogglePermission}
            />
          )}

          {adminTab === "channels" && (
            <ChannelsTab
              currentUser={currentUser}
              members={members}
              chatGroups={chatGroups || []}
              setChatGroups={setChatGroups}
              showToast={showToast}
              onNavigatePage={onNavigatePage}
              onSelectGroup={onSelectChatGroup}
            />
          )}

          {adminTab === "vehicles" && (
            <VehiclesTab
              currentUser={currentUser}
              showToast={showToast}
              members={members}
            />
          )}

          {adminTab === "rooms" && (
            <RoomsTab
              currentUser={currentUser}
              meetings={meetings || []}
              setMeetings={setMeetings}
              showToast={showToast}
            />
          )}

          {adminTab === "divisions" && (
            <DivisionsTab
              currentUser={currentUser}
              members={members}
              setMembers={setMembers}
              showToast={showToast}
              onNavigatePage={onNavigatePage}
            />
          )}

          {adminTab === "documents" && (
            <DocumentsTab
              currentUser={currentUser}
              circularDocs={circularDocs}
              showToast={showToast}
              onOpenCircularDoc={onOpenCircularDoc}
            />
          )}

          {adminTab === "audit" && (
            <AuditTab
              auditLogs={auditLogs}
              setAuditLogs={setAuditLogs}
              showToast={showToast}
              initialAuditLogs={initialAuditLogs}
            />
          )}

          {adminTab === "nas" && <NasTab showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}
