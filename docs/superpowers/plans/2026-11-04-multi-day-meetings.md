# Multi-Day Meetings (Continuous Span) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable multi-day continuous meetings in the Meetings system (`/meetings`), allowing users to schedule workshops, trainings, and conferences spanning multiple days with start and end dates/times, multi-day calendar visualization, room reservation locking, and export.

**Architecture:**
1. Extend `MeetingItem` in `lib/types.ts` with `isMultiDay?: boolean;` and `endDateStr?: string;`.
2. Enhance `lib/calendar.ts` with multi-day range evaluation and date spanning helpers.
3. Update `MeetingsPage.tsx` booking form with a multi-day toggle, start & end date-time pickers, conflict checking, and detail modal.
4. Update `MeetingCalendarView.tsx` to index and render meetings across all covered days with continuous indicators.
5. Update `RoomBookingView.tsx` so rooms remain locked on all days of a multi-day meeting.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, existing calendar utilities in `lib/calendar.ts`.

**Spec:** User-approved Design Document in conversation turn 2026-11-04T13:54:09+07:00 (Option B: Continuous Span).

## Global Constraints
- Preserve backward compatibility with existing single-day meetings.
- All Thai date formats must use Buddhist Era (พ.ศ. = AD + 543).
- Must seamlessly synchronize with Supabase Cloud and In-Memory state without `localStorage`.

---

### Task 1: Update Data Model and Calendar Helper Utilities

**Files:**
- Modify: `lib/types.ts:225-245`
- Modify: `lib/calendar.ts:6-45` and `lib/calendar.ts:335-370`

**Interfaces:**
- `MeetingItem`:
  ```typescript
  isMultiDay?: boolean;
  endDateStr?: string;
  ```
- Helpers in `lib/calendar.ts`:
  ```typescript
  export function isMeetingActiveOnDate(meeting: MeetingItem, targetIsoDate: string): boolean;
  export function getMeetingSpanInfo(meeting: MeetingItem, targetIsoDate: string): {
    isMultiDay: boolean;
    position: "first_day" | "middle_day" | "last_day" | "single_day";
    dayIndex: number;
    totalDays: number;
  };
  export function formatMeetingSpanText(meeting: MeetingItem): string;
  ```

- [ ] **Step 1: Add `isMultiDay` and `endDateStr` to `MeetingItem` in `lib/types.ts`**
- [ ] **Step 2: Implement multi-day helpers in `lib/calendar.ts`**
- [ ] **Step 3: Run `npx tsc --noEmit` to verify type safety**

---

### Task 2: Update Meetings Booking Form & UI in `MeetingsPage.tsx`

**Files:**
- Modify: `components/meetings/MeetingsPage.tsx`

**Interfaces:**
- Form State:
  - `isMultiDay`: boolean
  - `formDate`: string (Start Date)
  - `formEndDate`: string (End Date)
  - `formStartTime`: string
  - `formEndTime`: string
- Realtime Conflict Guard: Checks conflict between `startDateTime` and `endDateTime`.
- Modal UI:
  - Multi-day checkbox toggle
  - Start Date/Time & End Date/Time inputs
  - Duration preview badge
- Save Handler (`handleSaveMeeting`):
  - Formats multi-day `dateStr` (e.g. `4 - 6 พ.ย. 2569`) and `timeStr` (e.g. `09:30 น. (4 พ.ย.) - 16:30 น. (6 พ.ย.)`).
  - Sets `isMultiDay`, `endDateStr`, `startTime`, `endTime`.
- Card View & Detail Modal:
  - Displays multi-day badges and duration summaries.

- [ ] **Step 1: Add form states and conflict checking for multi-day span**
- [ ] **Step 2: Add multi-day toggle and inputs to Meeting Add/Edit modal**
- [ ] **Step 3: Update `handleSaveMeeting` and `handleOpenEditModal` to preserve and construct multi-day fields**
- [ ] **Step 4: Update Card View and Meeting Detail Modal to render multi-day badges**
- [ ] **Step 5: Run `npx tsc --noEmit`**

---

### Task 3: Update `MeetingCalendarView.tsx` & `RoomBookingView.tsx`

**Files:**
- Modify: `components/meetings/MeetingCalendarView.tsx`
- Modify: `components/meetings/RoomBookingView.tsx`

**Interfaces:**
- `MeetingCalendarView.tsx`:
  - `meetingsByDate`: iterate over every date from `startIso` to `endIso` and add meeting to that date cell.
  - Render chips with continuous icons: `▶` (start), `🔄` (middle), `⏹` (end).
  - Daily Agenda drawer: show multi-day badge with day index (e.g. `วันที่ 1/3`).
- `RoomBookingView.tsx`:
  - `meetingsOnSelectedDate`: filter using `isMeetingActiveOnDate(m, selectedDate)`.
  - Room status and timetable reflect occupancy across all days of the multi-day meeting.

- [ ] **Step 1: Update `MeetingCalendarView.tsx` date mapping and chip indicators**
- [ ] **Step 2: Update `RoomBookingView.tsx` active meeting filtering**
- [ ] **Step 3: Run `npx tsc --noEmit`**

---

### Task 4: Production Build, Verification, and Git Commit

- [ ] **Step 1: Run `npm run build`**
- [ ] **Step 2: Commit and push changes to `main`**
- [ ] **Step 3: Update Work Log artifact and reply to user**

