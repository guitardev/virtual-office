"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { BgRemoveToolPage } from "@/components/tools/BgRemoveToolPage";

export default function BgRemoveRoute() {
  const { currentUser, showToast } = useAppContext();

  if (!currentUser) return null;

  return (
    <BgRemoveToolPage
      currentUser={currentUser}
      showToast={showToast}
    />
  );
}
