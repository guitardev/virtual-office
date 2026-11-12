# Attendance Official Hours Classification & Thai Fiscal Year Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classify all attendance scan records (`HIP CMi681S`, CLI sync, Local JSON, Synology NAS MariaDB, Supabase Cloud, API, and `/attendance` UI) into 4 official Thai government working-hours modes (`io_mode` 1–4), backfill the existing 30,366 unedited device rows, and display/filter attendance dates by the Thai Fiscal Year calendar (`ต.ค.–ก.ย.`, `พ.ศ.`).

**Architecture:** Extract a pure client-and-server-safe module `lib/attendance-rules.ts` holding both `classifyAttendanceByOfficialHours()` and Thai Fiscal Calendar helpers (`getThaiFiscalPeriod`, `getFiscalYearDateRange`, `getMonthDateRange`, `groupMonthsByFiscalYear`). Wire `io_mode` `1..4` through the hardware decoder, `scripts/sync-attendance.mjs` (plus `--reclassify` 3-tier backfill), `lib/attendance-db.ts`, `lib/attendance-supabase.ts`, `app/api/attendance/route.ts`, and `app/(app)/attendance/page.tsx`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase JS (`@supabase/supabase-js`), `mysql2/promise`, Node.js ESM (`scripts/sync-attendance.mjs`), Playwright + `tsx`/`node --test`.

**Spec:** [2026-11-12-attendance-official-hours-design.md](file:///c:/Users/GuitarDev/virtual-office/docs/superpowers/specs/2026-11-12-attendance-official-hours-design.md)

## Global Constraints
- Classification windows (`Asia/Bangkok` / `+07:00` `HH:mm:ss`): `05:00:00–08:30:59` = mode `1` (`เข้าราชการเช้า (ปกติ)`); `08:31:00–12:00:59` = mode `3` (`สาย / อาจลา (08:31-12:00)`); `16:30:00–23:59:59` = mode `2` (`ออกราชการ (Check-Out)`); `12:01:00–16:29:59` & `00:00:00–04:59:59` = mode `4` (`สแกนระหว่างวัน / ก่อน 16:30`).
- Zero database `ALTER TABLE` schema migrations: reuse existing `io_mode` (`SMALLINT`/`TINYINT`) and `io_label` (`TEXT`/`VARCHAR(64)`).
- Never overwrite records where `isEdited === true` or `source === "manual"` during backfill or device sync.
- Thai Fiscal Year formula: month `10..12` belongs to `yearBE + 1` (`Q1`), months `01..03` = `Q2`, `04..06` = `Q3`, `07..09` = `Q4`; months inside a fiscal year sort `10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9`.
- UI must work identically in both On-Premise LAN (`dataSource === "local"`) and Cloud Replica (`dataSource === "supabase"`) modes.

## Review Focus
- Cross-fiscal-year boundary: `"2026-09-30"` resolves to Fiscal Year `2569` (month `12/12`, `Q4`), whereas `"2026-10-01"` resolves to Fiscal Year `2570` (month `1/12`, `Q1`).
- Month-end date calculation in leap and non-leap years: `getMonthDateRange("2024-02")` returns `"2024-02-29"`, `getMonthDateRange("2026-02")` returns `"2026-02-28"`, and `getMonthDateRange("2026-11")` returns `"2026-11-30"`.
- Second-level classification boundaries: `"04:59:59"` -> mode `4`, `"05:00:00"` -> `1`, `"08:30:59"` -> `1`, `"08:31:00"` -> `3`, `"12:00:59"` -> `3`, `"12:01:00"` -> `4`, `"16:29:59"` -> `4`, `"16:30:00"` -> `2`.
- Manual edit preservation: a row with `isEdited: true` or `source: "manual"` and custom `ioMode` survives `reclassifyAttendanceStoreByOfficialHours()` and `mergeDeviceRecordsIntoStore()` untouched.
- Cloud fallback month discovery: when Supabase holds 24 scattered historical months across 30,366 rows (e.g., `2015-04`, `2015-08`, `2025-02..2026-11`), `availableMonths` returns all active months without false empty months (`2016..2024`) and without downloading all 30,366 rows.

---

### Task 1: Shared Official Hours Classifier & Thai Fiscal Calendar Utility

**Files:**
- Create: `lib/attendance-rules.ts`
- Modify: `lib/hip-cmi681s.ts:58-66,108-163`
- Test: `tests/attendance-rules.test.mjs`

**Interfaces:**
- Produces in `lib/attendance-rules.ts`:
  - `export type AttendanceIoMode = 1 | 2 | 3 | 4`
  - `export function classifyAttendanceByOfficialHours(timestamp: string): { ioMode: AttendanceIoMode; ioLabel: string }`
  - `export function getAttendanceIoLabel(ioMode: number): string`
  - `export const THAI_FISCAL_MONTH_ORDER: readonly number[]`
  - `export function getThaiFiscalPeriod(isoDateOrTimestamp: string): ThaiFiscalPeriod` (`{ fiscalYear, calendarYearBE, month, day, monthShort, monthFull, fiscalMonthOrder, quarter, yearMonth, monthYearLabel, fiscalLabel, dateShortBE, dateFiscalLabel }`)
  - `export function getFiscalYearDateRange(fiscalYearBE: number): { dateFrom: string; dateTo: string }`
  - `export function getMonthDateRange(yearMonth: string): { dateFrom: string; dateTo: string }`
  - `export function groupMonthsByFiscalYear(yearMonths: string[]): FiscalYearGroup[]`

- [ ] **Step 1: Write the failing unit tests in `tests/attendance-rules.test.mjs`**

Assert exact boundaries for `classifyAttendanceByOfficialHours`:
- `"2026-11-12 04:59:59"` -> `ioMode: 4`, `"2026-11-12 05:00:00"` -> `1`, `"2026-11-12 08:30:59"` -> `1`, `"2026-11-12 08:31:00"` -> `3`, `"2026-11-12 12:00:59"` -> `3`, `"2026-11-12 12:01:00"` -> `4`, `"2026-11-12 16:29:59"` -> `4`, `"2026-11-12 16:30:00"` -> `2`.
Assert fiscal boundaries & ranges:
- `"2026-09-30"` -> `fiscalYear: 2569, quarter: 4, fiscalMonthOrder: 12, yearMonth: "2026-09"`.
- `"2026-10-01"` -> `fiscalYear: 2570, quarter: 1, fiscalMonthOrder: 1, yearMonth: "2026-10", monthYearLabel: "ตุลาคม 2569"`.
- `getMonthDateRange("2024-02")` -> `{ dateFrom: "2024-02-01", dateTo: "2024-02-29" }`.
- `getMonthDateRange("2026-02")` -> `{ dateFrom: "2026-02-01", dateTo: "2026-02-28" }`.
- `getFiscalYearDateRange(2570)` -> `{ dateFrom: "2026-10-01", dateTo: "2027-09-30" }`.
- `groupMonthsByFiscalYear(["2026-09", "2026-10", "2026-11", "2025-10", "2026-01"])` groups `2570` (`["2026-10", "2026-11"]` in order) before `2569` (`["2025-10", "2026-01", "2026-09"]` in order).
Assert `decodeCif12AttendanceRecords` decodes a 20-byte synthetic evening record at `16:35:00` with raw `r[15] = 1` as `ioMode: 2` (`"ออกราชการ (Check-Out)"`).

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/attendance-rules.test.mjs`
Expected: FAIL (`Cannot find module '../lib/attendance-rules.ts'`).

- [ ] **Step 3: Implement `lib/attendance-rules.ts` and wire into `lib/hip-cmi681s.ts`**

Create `lib/attendance-rules.ts` reusing `THAI_MONTHS_SHORT` / Thai full months formatting conventions from `lib/thai-numerals.ts` (keeping zero Node-only deps so Client Components can import it safely). Update `decodeCif12AttendanceRecords` in `lib/hip-cmi681s.ts` to compute `ioMode` & `ioLabel` via `classifyAttendanceByOfficialHours(timestamp)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/attendance-rules.test.mjs`
Expected: PASS (all assertions green).

---

### Task 2: Hybrid Store, Supabase Stats & Month Discovery, and `/api/attendance`

**Files:**
- Modify: `lib/attendance-db.ts:1105-1198` (add `reclassifyAttendanceStoreByOfficialHours` + preserve `isEdited`/`manual` + reclassify unedited during sync)
- Modify: `lib/attendance-supabase.ts:380-498,524-640` (4-mode exact `summaryStats`, `availableMonths` skip-scan & telemetry caching)
- Modify: `app/api/attendance/route.ts:220-439,480-615,708-888`

**Interfaces:**
- Consumes: `classifyAttendanceByOfficialHours`, `getAttendanceIoLabel` from `lib/attendance-rules.ts`.
- Produces:
  - In `lib/attendance-db.ts`: `export function reclassifyAttendanceStoreByOfficialHours(store: AttendanceStoreData): { updatedCount: number; changedLogs: AttendanceLogItem[] }`
  - In `lib/attendance-supabase.ts`:
    - `AttendanceSummaryStats` with `{ checkInOnTime: number; checkOut: number; lateOrLeave: number; midDay: number; checkInTotal: number; edited: number; checkIn: number; lateCount: number; lateCountIsApprox: boolean }`
    - `export async function fetchAvailableMonthsFromSupabase(telemetryMonths?: string[]): Promise<string[]>`
    - `AttendanceSyncTelemetry.availableMonths?: string[]`
  - In `app/api/attendance/route.ts`: `GET` returns `availableMonths: string[]` and `summaryStats: AttendanceSummaryStats`; `POST` (`add_log`, `update_log`, `sync_device`) accepts `ioMode` `1..4` via `getAttendanceIoLabel` and includes `availableMonths` in `sync_device` telemetry.

- [ ] **Step 1: Add unit test cases for manual edit preservation & 4-mode reclassification in `tests/attendance-rules.test.mjs`**

Test `reclassifyAttendanceStoreByOfficialHours` on a mock store containing:
1. Unedited device log at `17:00:00` currently `ioMode: 1` -> updated to `ioMode: 2`, `updatedCount: 1`.
2. Edited device log (`isEdited: true`) at `17:00:00` intentionally overridden to `ioMode: 1` -> untouched.
3. Manual log (`source: "manual"`) at `08:40:00` -> untouched.

- [ ] **Step 2: Run test to verify new test fails**

Run: `node --experimental-strip-types --test tests/attendance-rules.test.mjs`
Expected: FAIL (`reclassifyAttendanceStoreByOfficialHours` not exported).

- [ ] **Step 3: Implement updates in `lib/attendance-db.ts`, `lib/attendance-supabase.ts`, and `app/api/attendance/route.ts`**

- In `lib/attendance-db.ts`: add `reclassifyAttendanceStoreByOfficialHours(store)` and inside `mergeDeviceRecordsIntoStore` also update `ioMode`/`ioLabel` when `!existing.isEdited && existing.source === "device"` if stale.
- In `lib/attendance-supabase.ts`:
  - Update `fetchSummaryStatsFromSupabase` to query counts for `io_mode = 1`, `io_mode = 2`, `io_mode = 3`, `io_mode = 4`, and `is_edited = true` cleanly (`lateCountIsApprox: false`). When `filter.ioMode` is specified (`1..4`), zero out the other mode promises cleanly.
  - Add `availableMonths` to `AttendanceSyncTelemetry`, include it in telemetry `metadata`, and implement `fetchAvailableMonthsFromSupabase(telemetryMonths)` using an indexed `.lt("scan_timestamp", monthStartIso).order("scan_timestamp", { ascending: false }).limit(1)` skip-scan (cached 60s) when `telemetryMonths` is empty.
- In `app/api/attendance/route.ts`:
  - Compute `summaryStats` with all 4 mode counters in `local` mode (`checkInOnTime`, `lateOrLeave`, `midDay`, `checkOut`, `checkInTotal`, `edited`, plus `checkIn: checkInTotal`, `lateCount: lateOrLeave`).
  - Compute sorted distinct `availableMonths` (`YYYY-MM[]`) in `local` mode and via `fetchAvailableMonthsFromSupabase(cloudTelemetry?.availableMonths)` in `supabase` mode.
  - Use `getAttendanceIoLabel(modeNum)` in `add_log` and `update_log`, and compute `availableMonths` in `sync_device` telemetry.

- [ ] **Step 4: Run unit tests & `npx tsc --noEmit` to verify compilation**

Run: `node --experimental-strip-types --test tests/attendance-rules.test.mjs && npx tsc --noEmit`
Expected: PASS (exit 0).

---

### Task 3: CLI Auto-Sync (`scripts/sync-attendance.mjs`) & 3-Tier Historical Backfill (`--reclassify`)

**Files:**
- Modify: `scripts/sync-attendance.mjs:25-35,175-225,580-1040`

**Interfaces:**
- Consumes: Classification rules and `io_mode` `1..4` spec matching `lib/attendance-rules.ts`.
- Produces: CLI flag `--reclassify` executing safe reclassification across Local JSON, Synology NAS MariaDB, and Supabase Cloud + updating `audit_logs` telemetry with `availableMonths`.

- [ ] **Step 1: Update `scripts/sync-attendance.mjs` classification & add `--reclassify` + `availableMonths` telemetry**

- Replace hardcoded `ioMode` decode in `decodeCif12AttendanceRecords` with `classifyAttendanceByOfficialHours(timestamp)` (also keeping unedited re-sync in step 4 in sync).
- Add `--reclassify` mode: load local store, update every row where `!l.isEdited && l.source === "device"` and `(l.ioMode !== classified.ioMode || l.ioLabel !== classified.ioLabel)`, save `data/attendance-store.json`, upsert updated rows in 500-row batches to Synology NAS MariaDB (`ON DUPLICATE KEY UPDATE io_mode, io_label`) and Supabase (`upsert(..., { onConflict: "record_uid" })`), and insert fresh `audit_logs` telemetry carrying `availableMonths`.
- Also ensure normal `sync_device` telemetry (`metadata.availableMonths`) includes all distinct `YYYY-MM` months from `store.logs`.

- [ ] **Step 2: Syntax check and run live `--reclassify --log` backfill**

Run: `node --check scripts/sync-attendance.mjs && node scripts/sync-attendance.mjs --reclassify --log`
Expected: Exits 0; JSON summary shows exact counts across Local JSON, NAS MariaDB, and Supabase (`mode 1 = 14,738`, `mode 3 = 349`, `mode 4 = 43`, `mode 2 = 15,236`, total `30,366`).

---

### Task 4: `/attendance` Page UI (4 Official Categories + Thai Fiscal Year Calendar & CSV Export)

**Files:**
- Modify: `app/(app)/attendance/page.tsx:73-130,190-370,602-665,940-1400,1530-1560`

**Interfaces:**
- Consumes: `classifyAttendanceByOfficialHours`, `getThaiFiscalPeriod`, `getFiscalYearDateRange`, `getMonthDateRange`, `groupMonthsByFiscalYear`, `getAttendanceIoLabel` from `lib/attendance-rules.ts`; `availableMonths` & 4-mode `summaryStats` from `/api/attendance`.

- [ ] **Step 1: Update state, filters, and Thai Fiscal Year helpers in `app/(app)/attendance/page.tsx`**

- Store `availableMonths` from `/api/attendance` response and compute `fiscalYearGroups` via `groupMonthsByFiscalYear`.
- Add `selectedFiscalYear` and `selectedFiscalMonth` filter controls:
  - **ปีงบประมาณ** dropdown: `ทุกปีงบประมาณ` + each fiscal year (`ปีงบ 2570 (ต.ค. 69 – ก.ย. 70)`, etc.). Choosing a fiscal year sets `dateFrom` / `dateTo` via `getFiscalYearDateRange`.
  - **เดือน (ปฏิทินปีงบประมาณ)** dropdown: ordered `ต.ค. → พ.ย. → ... → ก.ย.` inside the selected (or all) fiscal years, showing e.g. `พ.ย. 2569 (เดือน 2/12 • ปีงบ 2570)`. Choosing a month sets exact `dateFrom` / `dateTo` via `getMonthDateRange` + syncs `selectedFiscalYear`.
  - Clear/Reset button clears `selectedFiscalYear`, `selectedFiscalMonth`, `dateFrom`, `dateTo`, etc., and manual changes to `dateFrom`/`dateTo` clear incompatible dropdown state cleanly.
- Update Card 3 (`สถิติรายการตามตัวกรอง`) to show exact counts for: `เข้าเช้าปกติ`, `สาย / อาจลา (08:31-12:00)`, `ออกราชการ (16:30+)`, and `แก้ไขแล้ว` (plus inline indicator for `ระหว่างวัน 12:01-16:29` when > 0, no approximate `*` needed).
- Update `ประเภทการลงเวลา` dropdown to support: `all`, `1` (`เข้าราชการเช้า 05:00-08:30`), `3` (`สาย / อาจลา 08:31-12:00`), `4` (`ระหว่างวัน / ก่อน 16:30`), `2` (`ออกราชการ 16:30+`).
- Update quick-date pills, table date column (`12 พ.ย. 2569` + `ปีงบ 2570` badge), 4 color-coded `ioMode` badges (🟢 เข้าเช้าปกติ, 🔴 สาย / อาจลา, 🟠 สแกนระหว่างวัน, 🔵 ออกราชการ), Add/Edit Modal `ioMode` options (auto-suggest from `scanTime` on add when not editing), and CSV export (`เดือน/ปี (พ.ศ.)`, `ปีงบประมาณ` columns + `ioLabel`).

- [ ] **Step 2: Type-check the Next.js app**

Run: `npx tsc --noEmit`
Expected: PASS (exit 0).

---

### Task 5: End-to-End Verification (Playwright API + LAN & Cloud UI + Build Check)

**Files:**
- Modify: `tests/attendance-live-sync.spec.ts`

- [ ] **Step 1: Expand `tests/attendance-live-sync.spec.ts` to assert 4-mode stats, filters, and Thai Fiscal Year display**

- Verify `GET /api/attendance?page=1&pageSize=20`: `summaryStats.checkInOnTime + summaryStats.lateOrLeave + summaryStats.midDay + summaryStats.checkOut === filteredTotal`, `availableMonths` contains `"2026-11"` & `"2026-10"`, and `GET /api/attendance?ioMode=2` returns `16:30+` check-out logs cleanly (`ออกราชการ (Check-Out)`).
- Verify `/attendance` LAN UI shows 4 official category counts, renders `ปีงบ 2570` / Thai month labels in table rows and Fiscal Year dropdown (`ปีงบ 2570`, `ปีงบ 2569`), and selecting a fiscal month (`พ.ย. 2569`) filters rows to `2026-11` (`643 รายการ`).
- Verify mocked Vercel Cloud UI test still displays synced telemetry & fiscal month selector cleanly.

- [ ] **Step 2: Run full verification suite (`tests/attendance-rules.test.mjs`, Playwright `tests/attendance-live-sync.spec.ts`, `npx tsc --noEmit`, `npm run build`)**

Run:
- `node --experimental-strip-types --test tests/attendance-rules.test.mjs`
- `npx playwright test tests/attendance-live-sync.spec.ts`
- `npx tsc --noEmit && npm run build` (restore `next-env.d.ts` if modified by Next build)
Expected: All unit tests, Playwright tests, type checks, and production build PASS with zero errors.

