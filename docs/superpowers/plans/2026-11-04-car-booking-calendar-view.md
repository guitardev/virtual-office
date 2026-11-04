# Car Booking Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy Gantt timeline view in the Car Booking system (`/carbooking`) with a full-featured, responsive, and executive-grade Calendar View Suite supporting Day, Week, and Month views with Thai Buddhist Era (พ.ศ.) headers, vehicle filtering, direct document review, and 1-click booking dispatch.

**Architecture:** Create a standalone, modular component `components/carbooking/CarBookingCalendarView.tsx` with unified state management for view modes (`day` | `week` | `month`), date navigation, and vehicle filtering. Integrate it cleanly into `components/carbooking/CarBookingPage.tsx` tab 2, connecting `onSelectBooking` to `CarBookingDocumentModal` and `onRequestVehicle` to the new booking form with auto-filled date/time.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide icons / Unicode, existing utilities in `lib/carbooking-data.ts` and `lib/calendar.ts`.

**Spec:** User-approved Design Document in conversation turn 2026-11-04T11:18:49+07:00.

## Global Constraints
- Preserve all existing Supabase Realtime synchronization patterns and In-Memory caching without introducing `localStorage` dependencies.
- Use Thai Buddhist Era (พ.ศ. = AD + 543) for all date headers and month labels.
- Follow Smart MSO government design system: Emerald / Teal / Indigo palette, rounded-2xl cards, clear typography, and accessible status badges.
- Ensure multi-day missions (cross-day departure and return) correctly render across all relevant dates in Month and Week views.

## Review Focus
1. **Multi-day booking span:** A booking starting on Monday and returning on Wednesday must be visible on Monday, Tuesday, and Wednesday in both Month and Week views.
2. **Cancelled/Rejected bookings:** Bookings with status `rejected` or `cancelled` should not clutter active schedules.
3. **Empty states:** Days or vehicles with zero bookings must display elegant empty indicators with an immediate "จองคันนี้" / "ขอใช้รถในวันนี้" action.
4. **Time parsing resilience:** Ensure ISO strings with and without seconds or timezone offsets (e.g. `2026-11-04T08:30` vs `2026-11-04T08:30:00Z`) are safely parsed without `NaN` or invalid dates.
5. **Mobile & tablet responsiveness:** Side agenda drawer in Month view and timetable in Day view must adapt gracefully on smaller screens without horizontal overflow breakage.

---

### Task 1: Create `CarBookingCalendarView.tsx`

**Files:**
- Create: `components/carbooking/CarBookingCalendarView.tsx`

**Interfaces:**
- Consumes:
  - `Vehicle`, `CarBookingRequest`, `BookingStatus` from `lib/types.ts`
  - Date helpers and time parsing from `lib/carbooking-data.ts`
- Produces:
  ```typescript
  export interface CarBookingCalendarViewProps {
    vehicles: Vehicle[];
    bookings: CarBookingRequest[];
    onSelectBooking?: (booking: CarBookingRequest) => void;
    onRequestVehicle?: (vehicleId: string, initialDate?: string) => void;
  }
  export function CarBookingCalendarView(props: CarBookingCalendarViewProps): React.JSX.Element;
  ```

- [x] **Step 1: Define types, helpers, and color config for vehicle categories and booking statuses**
- [x] **Step 2: Implement Executive Control Bar**
- [x] **Step 3: Implement Month View with Daily Agenda Drawer**
- [x] **Step 4: Implement Week View with Vertical Timetable**
- [x] **Step 5: Implement Day View (Fleet Timetable per Vehicle)**
- [x] **Step 6: Verify and check TypeScript definitions**

---

### Task 2: Integrate `CarBookingCalendarView` into `CarBookingPage.tsx`

**Files:**
- Modify: `components/carbooking/CarBookingPage.tsx`

**Interfaces:**
- Consumes: `CarBookingCalendarView` from `./CarBookingCalendarView`
- Updates Tab 2:
  - Tab Button: `<span>📅</span><span>ปฏิทินการใช้รถยนต์ (Calendar View)</span>`
  - Tab Content:
    ```tsx
    {activeTab === "timeline" && (
      <CarBookingCalendarView
        vehicles={vehicles}
        bookings={bookings}
        onSelectBooking={(b) => setSelectedDocBooking(b)}
        onRequestVehicle={(vehId, initialDate) => {
          setFormVehicleId(vehId);
          if (initialDate) {
            const dt = initialDate.includes("T") ? initialDate : `${initialDate}T08:30`;
            setFormDepartureTime(dt);
            const depDate = new Date(dt);
            depDate.setHours(depDate.getHours() + 8);
            const retY = depDate.getFullYear();
            const retM = String(depDate.getMonth() + 1).padStart(2, "0");
            const retD = String(depDate.getDate()).padStart(2, "0");
            const retH = String(depDate.getHours()).padStart(2, "0");
            const retMin = String(depDate.getMinutes()).padStart(2, "0");
            setFormReturnTime(`${retY}-${retM}-${retD}T${retH}:${retMin}`);
          }
          setActiveTab("new_request");
        }}
      />
    )}
    ```

- [x] **Step 1: Replace import and tab label in `CarBookingPage.tsx`**
- [x] **Step 2: Test TypeScript compilation**

---

### Task 3: Build Verification, System Integration, and Documentation

**Files:**
- Modify: `c:/Users/GuitarDev/virtual-office/docs/superpowers/plans/2026-11-04-car-booking-calendar-view.md` (check off steps)
- Update: `C:/Users/GuitarDev/.gemini/antigravity/brain/61511725-d259-4ed7-960a-fe7a5fe0eef5/work-log-2026-11-04.md`

- [x] **Step 1: Run production build check**
- [x] **Step 2: Commit and push changes**
- [x] **Step 3: Update Work Log artifact and conclude**

