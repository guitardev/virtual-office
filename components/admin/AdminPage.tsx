"use client";

import React from "react";
import { Member, Role, ModuleId, SystemModule, AccessRequest, AuditLog } from "@/lib/types";
import { MembersTab } from "./MembersTab";
import { RequestsTab } from "./RequestsTab";
import { MatrixTab } from "./MatrixTab";
import { AuditTab } from "./AuditTab";

interface AdminPageProps {
  members: Member[];
  currentUser: Member | null;
  accessRequests: AccessRequest[];
  systemModules: Record<ModuleId, SystemModule>;
  rolePermissions: Record<Role, Record<ModuleId, boolean>>;
  auditLogs: AuditLog[];
  setAuditLogs: (logs: AuditLog[]) => void;
  initialAuditLogs: AuditLog[];
  adminTab: "members" | "requests" | "matrix" | "audit";
  setAdminTab: (tab: "members" | "requests" | "matrix" | "audit") => void;
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
}: AdminPageProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-1">
            <span>🛡️ RBAC Control Center</span>
            <span>· Role-Based Access Control</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">
            ระบบจัดการสมาชิก & กำหนดสิทธิ์โมดูล
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            ควบคุมการเข้าถึง 8 โมดูลหลัก กำหนดบทบาทรายบุคคล และตรวจสอบประวัติ Audit Log
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddMemberModal(true)}
          className="px-4 py-2.5 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-colors shrink-0 cursor-pointer"
        >
          + เชิญสมาชิกใหม่
        </button>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">สมาชิกทั้งหมด</div>
          <div className="text-2xl font-bold font-heading text-slate-900 mt-1">{members.length} คน</div>
        </div>
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">ผู้ดูแล (Admins)</div>
          <div className="text-2xl font-bold font-heading text-indigo-600 mt-1">
            {members.filter((m) => m.role === "admin").length} คน
          </div>
        </div>
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">ผู้จัดการ (Managers)</div>
          <div className="text-2xl font-bold font-heading text-teal-600 mt-1">
            {members.filter((m) => m.role === "manager").length} คน
          </div>
        </div>
        <div
          onClick={() => setAdminTab("requests")}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer ${
            accessRequests.filter((r) => r.status === "pending").length > 0
              ? "bg-amber-50/80 border-amber-200 shadow-xs hover:border-amber-400"
              : "bg-white border-slate-200/80 shadow-xs hover:border-slate-300"
          }`}
          title="คลิกเพื่อไปที่หน้ารายการคำขอสิทธิ์เข้าใช้งาน"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>คำขอรออนุมัติ</span>
            {accessRequests.filter((r) => r.status === "pending").length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <div className="text-2xl font-bold font-heading text-amber-600 mt-1 flex items-baseline gap-1">
            <span>{accessRequests.filter((r) => r.status === "pending").length}</span>
            <span className="text-xs font-normal text-slate-500">คำขอ</span>
          </div>
        </div>
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">โมดูลในระบบ</div>
          <div className="text-2xl font-bold font-heading text-slate-900 mt-1">8 โมดูล</div>
        </div>
      </div>

      {/* Navigation Tabs for Admin */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 px-6 pt-3 gap-2 bg-slate-50/50 overflow-x-auto">
          {[
            { id: "members", label: "👥 รายชื่อสมาชิก & จัดการสิทธิ์", count: members.length },
            {
              id: "requests",
              label: "📬 คำขอสิทธิ์เข้าใช้งานใหม่ (Access Requests)",
              count: accessRequests.filter((r) => r.status === "pending").length,
              highlight: accessRequests.filter((r) => r.status === "pending").length > 0,
            },
            { id: "matrix", label: "🔒 ตารางกำหนดสิทธิ์รายโมดูล (RBAC Matrix)" },
            { id: "audit", label: "📜 ประวัติการเข้าถึง (Audit Logs)", count: auditLogs.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAdminTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                adminTab === tab.id
                  ? "border-[#4F46E5] text-[#4F46E5] bg-white rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-2 py-0.2 rounded-full text-xs font-bold ${
                    tab.highlight
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

          {adminTab === "audit" && (
            <AuditTab
              auditLogs={auditLogs}
              setAuditLogs={setAuditLogs}
              showToast={showToast}
              initialAuditLogs={initialAuditLogs}
            />
          )}
        </div>
      </div>
    </div>
  );
}
