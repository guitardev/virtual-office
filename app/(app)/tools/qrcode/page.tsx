"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { QRCodeToolPage } from "@/components/tools/QRCodeToolPage";

export default function QRCodeRoute() {
  const { currentUser, showToast } = useAppContext();

  if (!currentUser) return null;

  return (
    <QRCodeToolPage
      currentUser={currentUser}
      showToast={showToast}
    />
  );
}

