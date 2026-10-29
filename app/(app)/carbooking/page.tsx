"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { CarBookingPage } from "@/components/carbooking/CarBookingPage";

export default function CarBookingRoute() {
  const { currentUser, showToast, members } = useAppContext();

  if (!currentUser) return null;

  return (
    <CarBookingPage
      currentUser={currentUser}
      showToast={showToast}
      members={members}
    />
  );
}

