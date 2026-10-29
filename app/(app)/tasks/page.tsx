"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { TasksPage } from "@/components/tasks/TasksPage";

export default function TasksRoute() {
  const {
    tasks,
    currentUser,
    members,
    setTasks,
    toggleTaskStatus,
    showToast,
  } = useAppContext();

  if (!currentUser) return null;

  return (
    <TasksPage
      tasks={tasks}
      currentUser={currentUser}
      members={members}
      setTasks={setTasks}
      toggleTaskStatus={toggleTaskStatus}
      showToast={showToast}
    />
  );
}

