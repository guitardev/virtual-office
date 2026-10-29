"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { ChatPage } from "@/components/chat/ChatPage";

function ChatContent() {
  const searchParams = useSearchParams();
  const groupIdFromUrl = searchParams.get("groupId") || undefined;

  const {
    currentUser,
    showToast,
    members,
  } = useAppContext();

  if (!currentUser) return null;

  return (
    <ChatPage
      currentUser={currentUser}
      showToast={showToast}
      members={members}
      initialGroupId={groupIdFromUrl}
    />
  );
}

export default function ChatRoute() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">กำลังโหลดแชททีม...</div>}>
      <ChatContent />
    </Suspense>
  );
}

