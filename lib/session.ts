export interface ActiveSession {
  id: string;
  userId: string;
  deviceType: "desktop" | "mobile" | "tablet";
  deviceName: string;
  os: string;
  browser: string;
  screenResolution: string;
  ip: string;
  loginTime: string;
  lastActive: string;
  lastActiveTimestamp: number;
  isCurrent: boolean;
  userAgent: string;
}

export interface ParsedDeviceInfo {
  deviceType: "desktop" | "mobile" | "tablet";
  deviceName: string;
  os: string;
  browser: string;
  screenResolution: string;
  icon: string;
}

const STORAGE_KEY_PREFIX = "smartmso_active_sessions_";
const LEGACY_STORAGE_KEY_PREFIX = "omnioffice_active_sessions_";
const CURRENT_SESSION_ID_KEY = "smartmso_current_session_id";
const CHANNEL_NAME = "smartmso_sessions_channel";

/**
 * Accurately parses user agent and screen resolution into clean device info
 */
export function parseClientDeviceInfo(customUA?: string): ParsedDeviceInfo {
  const ua =
    customUA || (typeof navigator !== "undefined" ? navigator.userAgent : "");

  let os = "ระบบปฏิบัติการไม่ระบุ";
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  let icon = "💻";

  // OS Detection
  if (/Windows NT 10.0/i.test(ua)) {
    os = "Windows 11 / 10";
  } else if (/Windows NT 6.3/i.test(ua)) {
    os = "Windows 8.1";
  } else if (/Windows NT 6.1/i.test(ua)) {
    os = "Windows 7";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = "macOS";
  } else if (/iPad/i.test(ua)) {
    os = "iPadOS";
    deviceType = "tablet";
    icon = "📟";
  } else if (/iPhone/i.test(ua)) {
    os = "iOS (iPhone)";
    deviceType = "mobile";
    icon = "📱";
  } else if (/Android/i.test(ua)) {
    const isTablet = !/Mobile/i.test(ua);
    os = isTablet ? "Android Tablet" : "Android";
    deviceType = isTablet ? "tablet" : "mobile";
    icon = isTablet ? "📟" : "📱";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
  }

  // Browser Detection
  let browser = "Web Browser";
  if (/Line\//i.test(ua)) {
    browser = "LINE In-App Browser";
  } else if (/Edg\//i.test(ua)) {
    const match = ua.match(/Edg\/([\d.]+)/);
    browser = `Microsoft Edge${match ? ` ${match[1].split(".")[0]}` : ""}`;
  } else if (/OPR\/|Opera\//i.test(ua)) {
    browser = "Opera";
  } else if (/Chrome\/([\d.]+)/i.test(ua)) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    browser = `Google Chrome${match ? ` ${match[1].split(".")[0]}` : ""}`;
  } else if (/Firefox\/([\d.]+)/i.test(ua)) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    browser = `Mozilla Firefox${match ? ` ${match[1].split(".")[0]}` : ""}`;
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = "Apple Safari";
  }

  // Screen resolution
  let screenResolution = "1920 × 1080 px";
  if (typeof window !== "undefined" && window.screen) {
    screenResolution = `${window.screen.width} × ${window.screen.height} px`;
  }

  const deviceName = `${os} · ${browser}`;

  return {
    deviceType,
    deviceName,
    os,
    browser,
    screenResolution,
    icon,
  };
}

/**
 * Returns the current session ID unique to this tab/window, creating one if not exists
 */
export function getCurrentSessionId(): string {
  if (typeof window === "undefined") return "sess_server";

  try {
    let sessId = sessionStorage.getItem(CURRENT_SESSION_ID_KEY);
    if (!sessId) {
      sessId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(CURRENT_SESSION_ID_KEY, sessId);
    }
    return sessId;
  } catch {
    return `sess_${Date.now()}`;
  }
}

/**
 * Retrieves all stored active sessions for the user
 */
export function getActiveSessions(userId: string): ActiveSession[] {
  if (typeof window === "undefined" || !userId) return [];

  const currentId = getCurrentSessionId();
  try {
    const raw =
      localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`) ||
      localStorage.getItem(`${LEGACY_STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return [];

    const sessions: ActiveSession[] = JSON.parse(raw);
    if (!Array.isArray(sessions)) return [];

    return sessions.map((s) => ({
      ...s,
      isCurrent: s.id === currentId,
    }));
  } catch (e) {
    console.error("Error reading active sessions:", e);
    return [];
  }
}

/**
 * Saves active sessions list to localStorage and triggers local event
 */
export function saveActiveSessions(userId: string, sessions: ActiveSession[]) {
  if (typeof window === "undefined" || !userId) return;

  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${userId}`,
      JSON.stringify(sessions)
    );
    window.dispatchEvent(
      new CustomEvent("smartmso-sessions-updated", { detail: { userId } })
    );
  } catch (e) {
    console.error("Error saving active sessions:", e);
  }
}

/**
 * Initializes or updates the current session in localStorage
 */
export async function initCurrentSession(
  userId: string,
  loginTimeStr?: string,
  ipOverride?: string
): Promise<ActiveSession> {
  const currentId = getCurrentSessionId();
  const info = parseClientDeviceInfo();
  const timeNow =
    loginTimeStr ||
    new Date().toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " น.";

  let detectedIp = ipOverride || "127.0.0.1 (Localhost)";

  // If no IP given, attempt to fetch from session endpoint
  if (!ipOverride && typeof window !== "undefined") {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      if (data?.ip) {
        detectedIp = data.ip;
      }
    } catch {
      // Fallback
    }
  }

  const existingSessions = getActiveSessions(userId);
  const now = Date.now();

  const currentSession: ActiveSession = {
    id: currentId,
    userId,
    deviceType: info.deviceType,
    deviceName: info.deviceName,
    os: info.os,
    browser: info.browser,
    screenResolution: info.screenResolution,
    ip: detectedIp,
    loginTime: timeNow,
    lastActive: "กำลังใช้งานอยู่ขณะนี้",
    lastActiveTimestamp: now,
    isCurrent: true,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };

  const otherSessions = existingSessions.filter((s) => s.id !== currentId);
  const updated = [currentSession, ...otherSessions];

  saveActiveSessions(userId, updated);
  return currentSession;
}

/**
 * Revokes a specific session by ID
 */
export function revokeSession(userId: string, sessionId: string): boolean {
  if (typeof window === "undefined" || !userId) return false;

  const sessions = getActiveSessions(userId);
  const filtered = sessions.filter((s) => s.id !== sessionId);
  saveActiveSessions(userId, filtered);

  // Broadcast to other tabs/windows
  broadcastSessionEvent({
    type: "REVOKE_SESSION",
    userId,
    sessionId,
  });

  return true;
}

/**
 * Revokes all other sessions except the current one
 */
export function revokeAllOtherSessions(userId: string): boolean {
  if (typeof window === "undefined" || !userId) return false;

  const currentId = getCurrentSessionId();
  const sessions = getActiveSessions(userId);
  const kept = sessions.filter((s) => s.id === currentId);
  saveActiveSessions(userId, kept);

  // Broadcast to other tabs/windows
  broadcastSessionEvent({
    type: "REVOKE_ALL_OTHERS",
    userId,
    keepSessionId: currentId,
  });

  return true;
}

/**
 * Adds a simulated session for testing / demonstration purposes
 */
export function addSimulatedSession(
  userId: string,
  preset: "iphone" | "ipad" | "macbook" | "android"
): ActiveSession {
  const currentSessions = getActiveSessions(userId);
  const id = `sess_sim_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();

  let newSession: ActiveSession;

  switch (preset) {
    case "iphone":
      newSession = {
        id,
        userId,
        deviceType: "mobile",
        deviceName: "iOS 18 · Safari Mobile (iPhone 16 Pro)",
        os: "iOS 18",
        browser: "Apple Safari",
        screenResolution: "393 × 852 px",
        ip: "192.168.162.45",
        loginTime: "วันนี้ 08:30 น.",
        lastActive: "15 นาทีที่แล้ว",
        lastActiveTimestamp: now - 15 * 60 * 1000,
        isCurrent: false,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
      };
      break;

    case "ipad":
      newSession = {
        id,
        userId,
        deviceType: "tablet",
        deviceName: "iPadOS 18 · Safari (iPad Air M2)",
        os: "iPadOS 18",
        browser: "Apple Safari",
        screenResolution: "820 × 1180 px",
        ip: "192.168.162.77",
        loginTime: "เมื่อวานนี้ 17:15 น.",
        lastActive: "1 ชั่วโมงที่แล้ว",
        lastActiveTimestamp: now - 60 * 60 * 1000,
        isCurrent: false,
        userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
      };
      break;

    case "macbook":
      newSession = {
        id,
        userId,
        deviceType: "desktop",
        deviceName: "macOS Sequoia · Google Chrome 129",
        os: "macOS Sequoia",
        browser: "Google Chrome",
        screenResolution: "1728 × 1117 px",
        ip: "192.168.162.90",
        loginTime: "วันนี้ 09:10 น.",
        lastActive: "35 นาทีที่แล้ว",
        lastActiveTimestamp: now - 35 * 60 * 1000,
        isCurrent: false,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      };
      break;

    case "android":
      newSession = {
        id,
        userId,
        deviceType: "mobile",
        deviceName: "Android 14 · Samsung Internet (Galaxy S24)",
        os: "Android 14",
        browser: "Samsung Internet",
        screenResolution: "412 × 915 px",
        ip: "171.100.82.15",
        loginTime: "เมื่อวานนี้ 20:45 น.",
        lastActive: "เมื่อวานนี้",
        lastActiveTimestamp: now - 24 * 60 * 60 * 1000,
        isCurrent: false,
        userAgent: "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S921B) AppleWebKit/537.36",
      };
      break;
  }

  const updated = [newSession, ...currentSessions];
  saveActiveSessions(userId, updated);
  return newSession;
}

/**
 * Broadcast event cross-tabs using BroadcastChannel or storage fallback
 */
function broadcastSessionEvent(data: any) {
  if (typeof window === "undefined") return;

  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage(data);
      channel.close();
    }
  } catch (e) {
    console.warn("BroadcastChannel error:", e);
  }
}

/**
 * Subscribes to session revocation events across tabs.
 * If this tab's session was revoked, calls onRevoked.
 */
export function listenSessionRevocation(
  onRevoked: () => void,
  onSessionsChange?: () => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const currentId = getCurrentSessionId();

  let channel: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;

        if (msg.type === "REVOKE_SESSION" && msg.sessionId === currentId) {
          onRevoked();
        } else if (
          msg.type === "REVOKE_ALL_OTHERS" &&
          msg.keepSessionId &&
          msg.keepSessionId !== currentId
        ) {
          onRevoked();
        } else if (onSessionsChange) {
          onSessionsChange();
        }
      };
    } catch (e) {
      console.warn("Could not create BroadcastChannel:", e);
    }
  }

  // Also listen to local window events
  const handleCustomEvent = () => {
    if (onSessionsChange) onSessionsChange();
  };
  window.addEventListener("smartmso-sessions-updated", handleCustomEvent);
  window.addEventListener("omnioffice-sessions-updated", handleCustomEvent);

  return () => {
    if (channel) {
      channel.close();
    }
    window.removeEventListener("smartmso-sessions-updated", handleCustomEvent);
    window.removeEventListener("omnioffice-sessions-updated", handleCustomEvent);
  };
}
