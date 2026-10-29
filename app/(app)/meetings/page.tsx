"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { MeetingsPage } from "@/components/meetings/MeetingsPage";

export default function MeetingsRoute() {
  const {
    meetings,
    showToast,
    currentUser,
    setMeetings,
    members,
  } = useAppContext();

  if (!currentUser) return null;

  return (
    <MeetingsPage
      meetings={meetings}
      showToast={showToast}
      currentUser={currentUser}
      setMeetings={setMeetings}
      members={members}
    />
  );
}

