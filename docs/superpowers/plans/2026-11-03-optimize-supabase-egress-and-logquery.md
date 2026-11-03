# Optimize Supabase Egress & Log Query Quota Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drastically reduce Supabase Egress (Data Transfer Out) and Log Query/Ingestion consumption to keep project within Supabase Free Tier quotas (Egress < 5GB, Log Query < 100GB).

**Architecture:** 
1. Eliminate random Realtime channel names (`Math.random()`) and consolidate subscriptions into deterministic shared topics.
2. Upgrade Realtime handlers to use incremental payload merges (`payload.new` / `payload.old`) for high-frequency tables (especially `audit_logs` and `messages`) instead of refetching the entire table with `SELECT *`.
3. Fix the double-fetch in `AppContext.tsx` for `audit_logs`.
4. Separate heavy payloads (e.g. `scanned_pages` in `circular_documents`) from global list queries, fetching full scanned page arrays on demand only when viewing a specific document.
5. Limit list queries and reduce audit log verbosity.

**Tech Stack:** Next.js 15, TypeScript, Supabase JS Client (`@supabase/supabase-js`), React 19.

---

## Tasks

- [x] **Task 1: Deterministic Realtime Channel Naming & Duplicate Prevention**
  - Files to modify: `lib/supabase.ts`
  - Remove `Math.random().toString(36)...` suffixes from all Realtime channels.
  - Use deterministic topic names: `public:users`, `public:access_requests`, `public:audit_logs`, `public:vehicles`, `public:car_bookings`, `public:messages`, `public:chat_channels`, `public:tasks`, `public:meetings`, `public:circular_docs`.
  - Ensure `removeChannel` safely cleans up active channels.

- [x] **Task 2: Fix Audit Log Double Fetch & Enable Incremental Realtime Updates**
  - Files to modify: `lib/supabase.ts`, `context/AppContext.tsx`, `components/admin/AuditTab.tsx`
  - In `lib/supabase.ts`: Update `subscribeToAuditLogs` so that when `INSERT` fires, it parses `payload.new` with `mapRowToAuditLog(payload.new)` and passes the single new log to the callback, avoiding `fetchAuditLogs()` entirely.
  - In `context/AppContext.tsx`: Fix line 756 so it prepends the new log to `auditLogs` state without triggering a redundant `fetchAuditLogs()`.
  - In `components/admin/AuditTab.tsx`: Update subscription handler to prepend incoming log incrementally.
  - Reduce default audit logs limit from 500/200 to 50 for list views.

- [x] **Task 3: Lightweight Circular Documents List Query & On-Demand Detail Fetch**
  - Files to modify: `lib/supabase.ts`, `components/circular/CircularViewerModal.tsx`
  - In `lib/supabase.ts`: Update `fetchCircularDocs()` to explicitly select metadata fields without `scanned_pages`.
  - In `lib/supabase.ts`: Add `fetchCircularDocScannedPages(id: string): Promise<string[]>` to fetch `scanned_pages` on demand.
  - In `CircularViewerModal.tsx`: If `doc.scannedPages` is missing or empty, fetch it on-demand when the modal opens.

- [x] **Task 4: Incremental / Debounced Refetches for Key Tables**
  - Files to modify: `lib/supabase.ts`
  - Add basic debouncing (e.g. 300ms) or incremental updates for `subscribeToMembers`, `subscribeToTasks`, `subscribeToCarBookings`, `subscribeToVehicles`, `subscribeToAccessRequests`, `subscribeToMeetings` so that multiple rapid changes do not fire back-to-back full-table queries.

- [x] **Task 5: Verification & Build Check**
  - Run TypeScript compile check and `npm run build` to verify zero type regressions.
  - Verified: TypeScript passed with 0 errors, Next.js build completed successfully.
