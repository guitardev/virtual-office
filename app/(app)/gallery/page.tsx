"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { NasPhotoGallery } from "@/components/gallery/NasPhotoGallery";

export default function GalleryRoute() {
  const { currentUser, showToast } = useAppContext();

  if (!currentUser) return null;

  return (
    <NasPhotoGallery
      currentUser={currentUser}
      showToast={showToast}
    />
  );
}

