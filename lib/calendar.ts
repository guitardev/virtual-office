import { MeetingItem, MeetingAttendee } from "./types";

/**
 * Helper to parse startDate and endDate safely from MeetingItem
 */
export function getMeetingDateRange(meeting: MeetingItem): { startDate: Date; endDate: Date } {
  // If ISO timestamps exist, use them
  if (meeting.startTime) {
    const start = new Date(meeting.startTime);
    let end: Date;
    if (meeting.endTime) {
      end = new Date(meeting.endTime);
    } else {
      end = new Date(start.getTime() + 2 * 3600 * 1000); // default 2 hours
    }
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return { startDate: start, endDate: end };
    }
  }

  // Fallback parsing from dateStr / timeStr
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date(now.getTime() + 2 * 3600 * 1000);

  if (meeting.timeStr) {
    const match = meeting.timeStr.match(/(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})/);
    if (match) {
      const startH = parseInt(match[1], 10);
      const startM = parseInt(match[2], 10);
      const endH = parseInt(match[3], 10);
      const endM = parseInt(match[4], 10);
      startDate.setHours(startH, startM, 0, 0);
      endDate.setHours(endH, endM, 0, 0);
      return { startDate, endDate };
    }
  }

  return { startDate, endDate };
}

/**
 * Format a Date to iCalendar / Google Calendar UTC format: YYYYMMDDTHHmmssZ
 */
export function formatUtcDateTime(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

/**
 * Format helper for attendee names
 */
export function getAttendeeName(att: string | MeetingAttendee): string {
  return typeof att === "string" ? att : att.name;
}

/**
 * Format helper for attendee email
 */
export function getAttendeeEmail(att: string | MeetingAttendee): string | undefined {
  return typeof att === "object" ? att.email : undefined;
}

/**
 * Build rich details text for calendar events (Agenda, Link, Attendees)
 */
export function buildCalendarDetails(meeting: MeetingItem): string {
  const lines: string[] = [];

  if (meeting.description) {
    lines.push(meeting.description);
    lines.push("");
  }

  if (meeting.meetingLink) {
    lines.push(`📹 ลิงก์ห้องประชุมออนไลน์: ${meeting.meetingLink}`);
    lines.push("");
  }

  if (meeting.location) {
    lines.push(`📍 สถานที่: ${meeting.location}`);
  }

  if (meeting.attendees && meeting.attendees.length > 0) {
    const names = meeting.attendees.map(getAttendeeName).join(", ");
    lines.push(`👥 ผู้เข้าร่วม: ${names}`);
  }

  if (meeting.organizer) {
    lines.push(`👤 ผู้จัด/ผู้ประสานงาน: ${meeting.organizer.name} (${meeting.organizer.division || "พมจ.กำแพงเพชร"})`);
  }

  lines.push("");
  lines.push("── นัดหมายผ่านระบบ Smart MSO Virtual Office (สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร) ──");

  return lines.join("\n");
}

/**
 * Generate Google Calendar Add Event URL
 * Standard URL pattern: https://calendar.google.com/calendar/render?action=TEMPLATE&...
 */
export function createGoogleCalendarUrl(meeting: MeetingItem): string {
  const { startDate, endDate } = getMeetingDateRange(meeting);
  const startStr = formatUtcDateTime(startDate);
  const endStr = formatUtcDateTime(endDate);

  const title = encodeURIComponent(meeting.title);
  const details = encodeURIComponent(buildCalendarDetails(meeting));
  const location = encodeURIComponent(
    meeting.type === "online" && meeting.meetingLink
      ? `${meeting.location} (${meeting.meetingLink})`
      : meeting.location
  );

  // Collect emails of attendees if available
  const emails = (meeting.attendees || [])
    .map(getAttendeeEmail)
    .filter((e): e is string => Boolean(e && e.includes("@")));

  let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;

  if (emails.length > 0) {
    url += `&add=${encodeURIComponent(emails.join(","))}`;
  }

  return url;
}

/**
 * Generate Outlook Web Calendar Add Event URL
 */
export function createOutlookCalendarUrl(meeting: MeetingItem): string {
  const { startDate, endDate } = getMeetingDateRange(meeting);
  const title = encodeURIComponent(meeting.title);
  const details = encodeURIComponent(buildCalendarDetails(meeting));
  const location = encodeURIComponent(meeting.location);
  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();

  return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${title}&startdt=${startStr}&enddt=${endStr}&body=${details}&location=${location}`;
}

/**
 * Generate Standard RFC 5545 iCalendar (.ics) string for a single meeting
 */
export function generateIcsContent(meeting: MeetingItem): string {
  const { startDate, endDate } = getMeetingDateRange(meeting);
  const dtStamp = formatUtcDateTime(new Date());
  const dtStart = formatUtcDateTime(startDate);
  const dtEnd = formatUtcDateTime(endDate);
  const uid = `mtg_${meeting.id || Date.now()}@smso.site`;

  // Escape special characters in iCalendar text
  const escapeIcs = (str: string) =>
    str
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");

  const summary = escapeIcs(meeting.title);
  const description = escapeIcs(buildCalendarDetails(meeting));
  const location = escapeIcs(meeting.location || "สำนักงาน พมจ.กำแพงเพชร");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Smart MSO//Virtual Office Meetings//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `STATUS:${meeting.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
  ];

  if (meeting.meetingLink) {
    lines.push(`URL:${meeting.meetingLink}`);
  }

  if (meeting.organizer) {
    const orgName = meeting.organizer.name;
    const orgEmail = meeting.organizer.email || "office@smso.site";
    lines.push(`ORGANIZER;CN=${escapeIcs(orgName)}:mailto:${orgEmail}`);
  }

  if (meeting.attendees && meeting.attendees.length > 0) {
    meeting.attendees.forEach((att) => {
      const name = getAttendeeName(att);
      const email = getAttendeeEmail(att) || `${encodeURIComponent(name)}@smso.site`;
      lines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${escapeIcs(name)}:mailto:${email}`);
    });
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Trigger download of single meeting .ics file
 */
export function downloadMeetingIcs(meeting: MeetingItem): void {
  const content = generateIcsContent(meeting);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeFilename = meeting.title.replace(/[^a-zA-Z0-9ก-๙_-]/g, "_").slice(0, 40);
  link.download = `meeting_${safeFilename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate multi-event .ics file for all office meetings
 */
export function generateAllMeetingsIcs(meetings: MeetingItem[]): string {
  const dtStamp = formatUtcDateTime(new Date());

  const escapeIcs = (str: string) =>
    str
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Smart MSO//Virtual Office Meetings//TH",
    "X-WR-CALNAME:ตารางการประชุมและนัดหมาย พมจ.กำแพงเพชร",
    "X-WR-TIMEZONE:Asia/Bangkok",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  meetings.forEach((meeting) => {
    const { startDate, endDate } = getMeetingDateRange(meeting);
    const dtStart = formatUtcDateTime(startDate);
    const dtEnd = formatUtcDateTime(endDate);
    const uid = `mtg_${meeting.id}@smso.site`;
    const summary = escapeIcs(meeting.title);
    const description = escapeIcs(buildCalendarDetails(meeting));
    const location = escapeIcs(meeting.location || "สำนักงาน พมจ.กำแพงเพชร");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`LOCATION:${location}`);
    lines.push(`STATUS:${meeting.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`);

    if (meeting.meetingLink) {
      lines.push(`URL:${meeting.meetingLink}`);
    }

    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Trigger download of full office calendar .ics
 */
export function downloadAllMeetingsIcs(meetings: MeetingItem[]): void {
  const content = generateAllMeetingsIcs(meetings);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `smartmso_all_meetings_${new Date().toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
