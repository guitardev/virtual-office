import {
  SystemNotification,
  ChatMessage,
  ChatGroup,
  CircularDocument,
  AccessRequest,
  CarBookingRequest,
  TaskItem,
  Member,
  Role,
} from "./types";
import { getGroupMembers } from "./chat-data";

export const NOTIFICATION_READ_IDS_KEY = "smartmso_read_notif_ids";
export const BROWSER_NOTIF_ENABLED_KEY = "smartmso_browser_notifs_enabled";

/**
 * Retrieve the set of read notification IDs from browser localStorage
 */
export function getReadNotificationIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(NOTIFICATION_READ_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Mark a specific notification ID as read
 */
export function markNotificationAsRead(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getReadNotificationIds();
    current.add(id);
    localStorage.setItem(
      NOTIFICATION_READ_IDS_KEY,
      JSON.stringify(Array.from(current).slice(-500))
    );
  } catch {
    // Non-fatal fallback
  }
}

/**
 * Mark multiple notification IDs as read
 */
export function markAllNotificationsAsRead(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  try {
    const current = getReadNotificationIds();
    ids.forEach((id) => current.add(id));
    localStorage.setItem(
      NOTIFICATION_READ_IDS_KEY,
      JSON.stringify(Array.from(current).slice(-500))
    );
  } catch {
    // Non-fatal fallback
  }
}

/**
 * Check if HTML5 Web Notification API is supported by the current browser
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get current browser notification permission
 */
export function getBrowserNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) return "denied";
  return Notification.permission;
}

/**
 * Request browser permission for native Web Notifications
 */
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!isBrowserNotificationSupported()) return false;
  try {
    const result = await Notification.requestPermission();
    if (typeof window !== "undefined") {
      localStorage.setItem(BROWSER_NOTIF_ENABLED_KEY, result === "granted" ? "true" : "false");
    }
    return result === "granted";
  } catch {
    return false;
  }
}

/**
 * Send a native browser desktop notification if permitted and appropriate
 */
export function sendBrowserNotification(
  title: string,
  options?: NotificationOptions & { sound?: boolean }
): void {
  if (!isBrowserNotificationSupported()) return;
  if (Notification.permission !== "granted") return;

  try {
    // Trigger desktop notification
    const n = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });

    // Auto close notification after 6 seconds
    setTimeout(() => {
      try {
        n.close();
      } catch {}
    }, 6000);
  } catch (err) {
    console.warn("Failed to dispatch browser notification:", err);
  }
}

/**
 * Aggregate all system notifications across Chat, Circular, Access Requests, and Car Bookings
 */
export function buildUnifiedNotifications({
  currentUser,
  currentUserRole,
  messages,
  groups,
  circularDocs,
  accessRequests,
  carBookings,
  tasks,
  allMembers,
}: {
  currentUser: Member | null;
  currentUserRole: Role;
  messages: ChatMessage[];
  groups: ChatGroup[];
  circularDocs: CircularDocument[];
  accessRequests: AccessRequest[];
  carBookings: CarBookingRequest[];
  tasks?: TaskItem[];
  allMembers: Member[];
}): SystemNotification[] {
  if (!currentUser) return [];

  const readIds = getReadNotificationIds();
  const notifs: SystemNotification[] = [];

  // ─── 1. CHAT NOTIFICATIONS ───
  // Map groups by ID for quick lookup
  const groupMap = new Map<string, ChatGroup>();
  groups.forEach((g) => groupMap.set(g.id, g));

  // Determine which groups currentUser is a member of
  const accessibleGroupIds = new Set<string>();
  groups.forEach((g) => {
    const members = getGroupMembers(g, allMembers);
    if (members.some((m) => m.id === currentUser.id)) {
      accessibleGroupIds.add(g.id);
    }
  });

  // Get messages from accessible groups where sender is not currentUser
  messages.forEach((msg) => {
    if (!accessibleGroupIds.has(msg.groupId)) return;
    if (msg.senderId && msg.senderId === currentUser.id) return;
    if (msg.senderName === currentUser.name) return;

    const notifId = `chat_${msg.id}`;
    const group = groupMap.get(msg.groupId);
    const groupName = group?.name || "ห้องสนทนากลุ่ม";

    let priority: "normal" | "urgent" | "emergency" = "normal";
    if (
      msg.tag === "ด่วนที่สุด" ||
      msg.tag === "ภารกิจเร่งด่วน" ||
      msg.tag === "ประกาศ" ||
      msg.isPinned
    ) {
      priority = "urgent";
    }

    const preview =
      msg.text ||
      (msg.attachments && msg.attachments.length > 0
        ? `📎 แนบไฟล์: ${msg.attachments[0].name}`
        : "ส่งข้อความใหม่");

    notifs.push({
      id: notifId,
      type: "chat",
      title: `${groupName}`,
      message: `${msg.senderName}: ${preview}`,
      timestamp: msg.timestamp || "เมื่อสักครู่",
      createdAt: msg.id.startsWith("msg_")
        ? new Date(parseInt(msg.id.slice(4), 10) || Date.now()).toISOString()
        : new Date().toISOString(),
      isRead: readIds.has(notifId),
      priority,
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar,
      link: {
        page: "chat",
        targetId: msg.groupId,
      },
    });
  });

  // ─── 2. GOVERNMENT CIRCULAR NOTIFICATIONS ───
  circularDocs.forEach((doc) => {
    // Check if currentUser is a target recipient:
    // 1. Direct recipient list by memberId, full name, or first name
    // 2. Or by target criteria: scope === "all", division match, or personnelType match
    // 3. Or if user is admin viewing all circulars
    const directRecipient = doc.recipients?.find(
      (r) =>
        r.memberId === currentUser.id ||
        (r.memberName && currentUser.name && r.memberName.trim() === currentUser.name.trim()) ||
        (currentUser.firstName && r.memberName && r.memberName.includes(currentUser.firstName))
    );

    const isScopeAll = doc.targetCriteria?.scope === "all";
    const isDivisionMatch =
      Boolean(currentUser.division) &&
      Boolean(doc.targetCriteria?.divisions?.includes(currentUser.division));
    const isPersonnelMatch =
      Boolean(currentUser.personnelType) &&
      Boolean(doc.targetCriteria?.personnelTypes?.includes(currentUser.personnelType!));
    const isAdmin = currentUserRole === "admin";

    const isTargeted = Boolean(directRecipient || isScopeAll || isDivisionMatch || isPersonnelMatch || isAdmin);
    if (!isTargeted) return;

    const notifId = `circ_${doc.id}`;
    const isAck = directRecipient ? directRecipient.isAcknowledged : false;

    let priority: "normal" | "urgent" | "emergency" = "normal";
    if (doc.urgency === "most_urgent") {
      priority = "emergency";
    } else if (doc.urgency === "very_urgent" || doc.urgency === "urgent") {
      priority = "urgent";
    }

    const urgencyLabel =
      doc.urgency === "most_urgent"
        ? " [ด่วนที่สุด]"
        : doc.urgency === "very_urgent"
        ? " [ด่วนมาก]"
        : doc.urgency === "urgent"
        ? " [ด่วน]"
        : "";

    notifs.push({
      id: notifId,
      type: "circular",
      title: `หนังสือเวียน${urgencyLabel}: ${doc.docNumber}`,
      message: `${doc.title} (${doc.senderOrg || "สป.พม."})`,
      timestamp: doc.issuedDate || "วันนี้",
      createdAt: doc.createdAt || new Date().toISOString(),
      isRead: isAck || readIds.has(notifId),
      priority,
      senderName: doc.createdByName || doc.senderOrg,
      link: {
        page: "circular",
        targetId: doc.id,
      },
    });
  });

  // ─── 3. ACCESS REQUEST NOTIFICATIONS (FOR ADMINS) ───
  if (currentUserRole === "admin") {
    accessRequests
      .filter((r) => r.status === "pending")
      .forEach((req) => {
        const notifId = `req_${req.id}`;
        notifs.push({
          id: notifId,
          type: "access_request",
          title: `คำขอเข้าใช้งานระบบใหม่: ${req.name}`,
          message: `${req.position} · ${req.division} (ขอสิทธิ์ ${req.requestedRole})`,
          timestamp: req.createdAt || "วันนี้",
          createdAt: req.createdAt ? new Date().toISOString() : new Date().toISOString(),
          isRead: readIds.has(notifId),
          priority: "urgent",
          senderName: req.name,
          link: {
            page: "admin",
            targetId: req.id,
            subTab: "requests",
          },
        });
      });
  }

  // ─── 4. CAR BOOKING NOTIFICATIONS (WEBAPP NOTIFICATION CENTER) ───
  carBookings.forEach((b) => {
    const myName = currentUser.name || "";
    const myDivision = currentUser.division || "";
    const myPosition = currentUser.position || "";
    const isRequester =
      b.requesterId === currentUser.id ||
      (b.requesterName && myName && b.requesterName.trim() === myName.trim());

    // Stage 1: Pending Division Head / Peer Official Review
    if (b.status === "pending_division_head") {
      const isDivReviewer =
        b.divisionReviewerId === currentUser.id ||
        (b.divisionReviewerName && myName && b.divisionReviewerName.includes(myName)) ||
        (myDivision && myDivision === b.requesterDivision && (currentUserRole === "manager" || myPosition.includes("หัวหน้า") || currentUser.personnelType === "ข้าราชการ")) ||
        currentUserRole === "admin";

      if (isDivReviewer) {
        const notifId = `car_stg1_${b.id}`;
        notifs.push({
          id: notifId,
          type: "carbooking",
          title: `รอความเห็นชอบ: คำขอใช้รถ ${b.requestNo} (${b.destination})`,
          message: `${b.requesterName} (${b.requesterDivision}) ขอใช้รถไป "${b.destination}" เพื่อ ${b.purpose} รอท่านพิจารณาชั้นต้น`,
          timestamp: b.createdAt || "วันนี้",
          createdAt: new Date().toISOString(),
          isRead: readIds.has(notifId),
          priority: "urgent",
          senderName: b.requesterName,
          link: { page: "carbooking", targetId: b.id },
        });
      }
    }

    // Stage 2: Pending Fleet & Driver Assignment
    if (b.status === "pending_fleet_assignment") {
      const isFleetDispatcher =
        b.fleetDispatcherId === currentUser.id ||
        (b.fleetDispatcherName && myName && b.fleetDispatcherName.includes(myName)) ||
        currentUser.id === "syno_ปภาวิน" ||
        currentUser.id === "syno_เสกพล" ||
        myName.includes("ปภาวิน") ||
        myName.includes("เสกพล") ||
        myDivision.includes("ฝ่ายบริหารทั่วไป") ||
        currentUserRole === "admin";

      if (isFleetDispatcher) {
        const notifId = `car_stg2_${b.id}`;
        notifs.push({
          id: notifId,
          type: "carbooking",
          title: `รอจัดสรรยานพาหนะ: คำขอ ${b.requestNo}`,
          message: `คำขอไป "${b.destination}" ผ่านความเห็นชอบชั้นต้นแล้ว รอฝ่ายบริหารจัดสรรรถและคนขับ`,
          timestamp: b.divisionReviewerActionAt || "วันนี้",
          createdAt: new Date().toISOString(),
          isRead: readIds.has(notifId),
          priority: "urgent",
          senderName: b.divisionReviewerName || "หัวหน้ากลุ่ม",
          link: { page: "carbooking", targetId: b.id },
        });
      }
    }

    // Stage 3: Pending Admin Head Endorsement
    if (b.status === "pending_admin_head") {
      const isAdminHead =
        currentUser.id === "syno_เสกพล" ||
        myName.includes("เสกพล") ||
        (myDivision.includes("ฝ่ายบริหารทั่วไป") && (currentUserRole === "manager" || myPosition.includes("หัวหน้า"))) ||
        currentUserRole === "admin";

      if (isAdminHead) {
        const notifId = `car_stg3_${b.id}`;
        notifs.push({
          id: notifId,
          type: "carbooking",
          title: `รอเสนอความเห็น: คำขอ ${b.requestNo} [${b.licensePlate || "-"}]`,
          message: `รถ ${b.vehicleName || "ส่วนกลาง"} จัดสรรแล้ว (คนขับ: ${b.assignedDriver || "-"}) รอ หน.ฝ่ายบริหาร เสนอความเห็นต่อ พมจ.`,
          timestamp: b.fleetDispatcherActionAt || "วันนี้",
          createdAt: new Date().toISOString(),
          isRead: readIds.has(notifId),
          priority: "urgent",
          senderName: b.fleetDispatcherName || "เจ้าหน้าที่จัดสรรรถ",
          link: { page: "carbooking", targetId: b.id },
        });
      }
    }

    // Stage 4: Pending Provincial Head Final Approval
    if (b.status === "pending_provincial" || b.status === "endorsed") {
      const isProvincialHead =
        myName.includes("มะลิวัน") ||
        myPosition.includes("พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัด") ||
        currentUserRole === "admin" ||
        (currentUserRole as string) === "director";

      if (isProvincialHead) {
        const notifId = `car_stg4_${b.id}`;
        notifs.push({
          id: notifId,
          type: "carbooking",
          title: `รอ พมจ. พิจารณาอนุมัติ: คำขอ ${b.requestNo}`,
          message: `หน.ฝ่ายบริหารเสนอความเห็นชอบแล้ว เพื่อโปรดพิจารณาอนุมัติใช้รถไป ${b.destination}`,
          timestamp: b.adminHeadActionAt || "วันนี้",
          createdAt: new Date().toISOString(),
          isRead: readIds.has(notifId),
          priority: "emergency",
          senderName: b.adminHeadName || "หน.ฝ่ายบริหารทั่วไป",
          link: { page: "carbooking", targetId: b.id },
        });
      }
    }

    // Stage 5: Approved (To Requester & Assigned Driver)
    if (b.status === "approved") {
      if (isRequester) {
        const notifId = `car_approved_${b.id}`;
        notifs.push({
          id: notifId,
          type: "carbooking",
          title: `อนุมัติคำขอใช้รถราชการแล้ว (${b.requestNo})`,
          message: `พมจ. อนุมัติคำขอไป ${b.destination} แล้ว รถ: ${b.vehicleName || "ส่วนกลาง"} [${b.licensePlate || "-"}] พลขับ: ${b.assignedDriver || "ผู้ขอขับขี่เอง"}`,
          timestamp: b.approverActionAt || "อนุมัติแล้ว",
          createdAt: new Date().toISOString(),
          isRead: readIds.has(notifId),
          priority: "normal",
          senderName: b.approverName || "พมจ.กำแพงเพชร",
          link: { page: "carbooking", targetId: b.id },
        });
      }

      const isDriver =
        b.assignedDriver &&
        myName &&
        (b.assignedDriver.includes(myName) || myName.includes(b.assignedDriver));
      if (isDriver) {
        const notifId = `car_driver_${b.id}`;
        notifs.push({
          id: notifId,
          type: "carbooking",
          title: `ภารกิจพนักงานขับรถ: คำขอ ${b.requestNo}`,
          message: `ท่านได้รับมอบหมายขับรถ ${b.vehicleName || ""} [${b.licensePlate || "-"}] ไป ${b.destination} กำหนดออกเดินทาง ${b.departureTime?.replace("T", " ") || ""} น.`,
          timestamp: b.departureTime?.replace("T", " ") || "ภารกิจใหม่",
          createdAt: new Date().toISOString(),
          isRead: readIds.has(notifId),
          priority: "urgent",
          senderName: "งานยานพาหนะ ฝ่ายบริหารทั่วไป",
          link: { page: "carbooking", targetId: b.id },
        });
      }
    }

    // Stage 6: Rejected (To Requester)
    if (b.status === "rejected" && isRequester) {
      const notifId = `car_rejected_${b.id}`;
      notifs.push({
        id: notifId,
        type: "carbooking",
        title: `คำขอใช้รถไม่ได้รับการอนุมัติ (${b.requestNo})`,
        message: `คำขอไป ${b.destination} ไม่ได้รับความเห็นชอบ/อนุมัติ: ${b.approverNotes || b.adminHeadNotes || b.divisionReviewerNotes || "ไม่ระบุเหตุผล"}`,
        timestamp: b.approverActionAt || b.adminHeadActionAt || b.divisionReviewerActionAt || "วันนี้",
        createdAt: new Date().toISOString(),
        isRead: readIds.has(notifId),
        priority: "urgent",
        senderName: b.approverName || b.adminHeadName || b.divisionReviewerName || "ผู้พิจารณา",
        link: { page: "carbooking", targetId: b.id },
      });
    }

    // Return Reminder
    const hasReminder = b.notifications?.some((n) => n.type === "return_reminder");
    if (hasReminder && isRequester) {
      const notifId = `car_reminder_${b.id}`;
      notifs.push({
        id: notifId,
        type: "carbooking",
        title: `แจ้งเตือนส่งคืนรถยนต์ราชการ: ${b.requestNo}`,
        message: `ถึงกำหนดส่งคืนรถ ${b.vehicleName || ""} [${b.licensePlate || "-"}] แล้ว กรุณาตรวจสภาพ เลขไมล์ และเกจน้ำมันเพื่อปิดภารกิจ`,
        timestamp: "ถึงกำหนดส่งคืน",
        createdAt: new Date().toISOString(),
        isRead: readIds.has(notifId),
        priority: "urgent",
        senderName: "งานยานพาหนะ ฝ่ายบริหารทั่วไป",
        link: { page: "carbooking", targetId: b.id },
      });
    }

    // Stage 7: Return Completed / Mission Closed
    if (b.status === "completed") {
      const isFleet =
        currentUser.id === "syno_ปภาวิน" ||
        currentUser.id === "syno_เสกพล" ||
        myName.includes("เสกพล") ||
        myDivision.includes("ฝ่ายบริหารทั่วไป");

      if (isRequester || isFleet) {
        const notifId = `car_returned_${b.id}`;
        notifs.push({
          id: notifId,
          type: "carbooking",
          title: `ส่งคืนยานพาหนะเรียบร้อย: ${b.requestNo}`,
          message: `ได้รับคืนรถยนต์ ${b.vehicleName || ""} [${b.licensePlate || "-"}] และกุญแจเรียบร้อย ปิดภารกิจสมบูรณ์`,
          timestamp: b.returnTime?.replace("T", " ") || "เสร็จสิ้น",
          createdAt: new Date().toISOString(),
          isRead: readIds.has(notifId),
          priority: "normal",
          senderName: "งานยานพาหนะ ฝ่ายบริหารทั่วไป",
          link: { page: "carbooking", targetId: b.id },
        });
      }
    }
  });

  // ─── 5. ASSIGNED TASK NOTIFICATIONS ───
  tasks?.forEach((task) => {
    if (task.status === "done") return;
    const isAssigned =
      task.assigneeId === currentUser.id ||
      (task.assignee && currentUser.name && task.assignee.trim() === currentUser.name.trim()) ||
      (currentUser.firstName && task.assignee && task.assignee.includes(currentUser.firstName));

    if (!isAssigned) return;

    const notifId = `task_${task.id}`;
    let priority: "normal" | "urgent" | "emergency" = "normal";
    if (task.priority === "high") {
      priority = "urgent";
    }

    notifs.push({
      id: notifId,
      type: "task",
      title: `งานมอบหมาย: ${task.title}`,
      message: `ฝ่าย${task.dept || currentUser.division || "งาน"} · กำหนดส่ง: ${task.due || "เร็วๆ นี้"} (${task.status === "in_progress" ? "กำลังทำ" : task.status === "review" ? "รอตรวจ" : "รอดำเนินการ"})`,
      timestamp: task.due || "เร็วๆ นี้",
      createdAt: task.createdAt || new Date().toISOString(),
      isRead: readIds.has(notifId),
      priority,
      senderName: task.createdByName || "ผู้มอบหมาย",
      link: {
        page: "task",
        targetId: String(task.id),
      },
    });
  });

  // Sort: Unread first, then by createdAt descending
  return notifs.sort((a, b) => {
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
