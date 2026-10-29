"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { CircularPage } from "@/components/circular/CircularPage";
import { sendBrowserNotification } from "@/lib/notifications";

function CircularContent() {
  const searchParams = useSearchParams();
  const docIdFromUrl = searchParams.get("docId") || undefined;

  const {
    currentUser,
    members,
    showToast,
    setCircularDocs,
  } = useAppContext();

  if (!currentUser) return null;

  return (
    <CircularPage
      currentUser={currentUser}
      members={members}
      showToast={showToast}
      initialDocId={docIdFromUrl}
      onDocumentCreated={(newDoc) => {
        setCircularDocs((prev) => {
          if (prev.some((d) => d.id === newDoc.id)) return prev;
          return [newDoc, ...prev];
        });
        const urgencyPrefix =
          newDoc.urgency === "most_urgent"
            ? "🚨 [ด่วนที่สุด] "
            : newDoc.urgency === "very_urgent"
            ? "⚡ [ด่วนมาก] "
            : newDoc.urgency === "urgent"
            ? "⚡ [ด่วน] "
            : "";
        showToast(`📜 ${urgencyPrefix}ออกหนังสือเวียนใหม่: ${newDoc.docNumber} "${(newDoc.title || "").slice(0, 45)}"`);
        sendBrowserNotification(`📜 หนังสือเวียนใหม่: ${newDoc.docNumber}`, {
          body: `${newDoc.title} (${newDoc.senderOrg || "สป.พม."})`,
        });
      }}
    />
  );
}

export default function CircularRoute() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">กำลังโหลดหนังสือเวียน...</div>}>
      <CircularContent />
    </Suspense>
  );
}

