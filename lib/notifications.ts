import {
  SystemNotification,
  ChatMessage,
  ChatGroup,
  CircularDocument,
  AccessRequest,
  CarBookingRequest,
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
  allMembers,
}: {
  currentUser: Member | null;
  currentUserRole: Role;
  messages: ChatMessage[];
  groups: ChatGroup[];
  circularDocs: CircularDocument[];
  accessRequests: AccessRequest[];
  carBookings: CarBookingRequest[];
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
    // Check if currentUser is a target recipient
    const recipient = doc.recipients?.find((r) => r.memberId === currentUser.id);
    if (!recipient) return;

    const notifId = `circ_${doc.id}`;
    const isAck = recipient.isAcknowledged;

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

  // ─── 4. CAR BOOKING NOTIFICATIONS ───
  carBookings.forEach((b) => {
    // If Admin/Manager needs to review
    if (
      (currentUserRole === "admin" && b.status === "endorsed") ||
      (currentUserRole === "manager" && b.status === "pending_review")
    ) {
      const notifId = `car_review_${b.id}_${b.status}`;
      notifs.push({
        id: notifId,
        type: "carbooking",
        title: `คำขอจองรถราชการ: ${b.destination}`,
        message: `${b.requesterName} ขอใช้ยานพาหนะ วันที่ ${b.departureTime?.split("T")[0] || b.departureTime || ""}`,
        timestamp: b.departureTime || "วันนี้",
        createdAt: new Date().toISOString(),
        isRead: readIds.has(notifId),
        priority: "normal",
        senderName: b.requesterName,
        link: {
          page: "carbooking",
          targetId: b.id,
        },
      });
    }

    // If currentUser is requester and booking was approved
    if (b.requesterId === currentUser.id && b.status === "approved") {
      const notifId = `car_approved_${b.id}`;
      notifs.push({
        id: notifId,
        type: "carbooking",
        title: `อนุมัติการจองรถราชการแล้ว`,
        message: `เดินทางไป ${b.destination} วันที่ ${b.departureTime?.split("T")[0] || b.departureTime || ""} (พลขับ: ${b.assignedDriver || "จัดสรรแล้ว"})`,
        timestamp: "อนุมัติแล้ว",
        createdAt: new Date().toISOString(),
        isRead: readIds.has(notifId),
        priority: "urgent",
        senderName: "หัวหน้าฝ่ายบริหารทั่วไป",
        link: {
          page: "carbooking",
          targetId: b.id,
        },
      });
    }
  });

  // Sort: Unread first, then by createdAt descending
  return notifs.sort((a, b) => {
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
