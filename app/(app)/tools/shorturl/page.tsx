"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { ShortUrlToolPage } from "@/components/tools/ShortUrlToolPage";

export default function ShortUrlRoute() {
  const { currentUser, showToast, addAuditLog } = useAppContext();

  if (!currentUser) return null;

  return (
    <ShortUrlToolPage
      currentUser={currentUser}
      showToast={showToast}
      onAddAuditLog={addAuditLog}
    />
  );
}

