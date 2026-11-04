"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { MeetingsPage } from "@/components/meetings/MeetingsPage";

export default function MeetingsRoute() {
  const router = useRouter();
  const {
    meetings,
    showToast,
    currentUser,
    setMeetings,
    members,
    setAdminTab,
    meetingRooms,
    setMeetingRooms,
  } = useAppContext();

  if (!currentUser) return null;

  return (
    <MeetingsPage
      meetings={meetings}
      showToast={showToast}
      currentUser={currentUser}
      setMeetings={setMeetings}
      members={members}
      rooms={meetingRooms}
      setRooms={setMeetingRooms}
      onNavigateToAdminRooms={() => {
        setAdminTab("rooms");
        router.push("/admin");
      }}
    />
  );
}

