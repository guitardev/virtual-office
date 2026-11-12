# Attendance Official Hours Classification (`io_mode` 1–4) & Thai Fiscal Year Display Design Specification

**Date:** 2026-11-12  
**Approved Approach:** Approach 1 — 4-code `io_mode` (`1, 2, 3, 4`) persisted in existing `io_mode` / `io_label` columns + full 3-tier DB backfill + Thai Fiscal Year (`ปฏิทินปีงบประมาณ ต.ค.–ก.ย.`) Month/Year filtering & display  

---

## 1. Intent & Why
Hardware scans pulled from `HIP CMi681S` return byte `r[15] = 1` (`เข้างาน`) for all 30,366 records because staff do not press hardware In/Out keys before scanning. As a result, evening check-outs (`16:30+`, 15,236 rows) and late/leave morning scans (`08:31–12:00`, 349 rows) are all mislabeled as `เข้างาน`, `ออกงาน` reads `0`, and Supabase multi-day `หลัง 08:30` statistics degrade to single-page approximations (`lateCountIsApprox = true`).

In addition, Thai government agencies organize reporting, auditing, and monthly attendance summaries by the **Thai Fiscal Year calendar (ปีงบประมาณไทย: `1 ตุลาคม – 30 กันยายน`)** with Buddhist Era years (`พ.ศ.`).

This change introduces deterministic time-of-day classification matching Thai civil-service hours (`08:30 – 16:30 น.`) and Thai Fiscal Year month/year display & filtering across decoding, CLI sync, hybrid storage, API filtering/statistics, and the `/attendance` UI.

---

## 2. Official Working Hours Classification Rules (`classifyAttendanceByOfficialHours`)
Given local scan timestamp `"YYYY-MM-DD HH:mm:ss"` (`HH:mm:ss` time slice in `Asia/Bangkok` / `+07:00`):

| Time Window (`HH:mm:ss`) | `io_mode` | `io_label` | Historical Count (of 30,366) | Meaning |
| --- | :---: | --- | :---: | --- |
| `05:00:00` – `08:30:59` | `1` | `เข้าราชการเช้า (ปกติ)` | `14,738` | เข้างานตรงเวลาตามระเบียบ |
| `08:31:00` – `12:00:59` | `3` | `สาย / อาจลา (08:31-12:00)` | `349` | เข้าหลัง 08:30 น. (สาย หรือ ลาครึ่งเช้า/ลาป่วย/ลากิจ) |
| `12:01:00` – `16:29:59` *(or `00:00:00` – `04:59:59`)* | `4` | `สแกนระหว่างวัน / ก่อน 16:30` | `43` | สแกนช่วงกลางวัน / ออกก่อนเวลา |
| `16:30:00` – `23:59:59` | `2` | `ออกราชการ (Check-Out)` | `15,236` | เลิกงานตั้งแต่ 16:30 น. เป็นต้นไป |

*(Note: `08:30:00–08:30:59` remains inclusive of `08:30` matching existing `> "08:30:59"`; `12:00:00–12:00:59` stays inclusive of `12 น.` as specified.)*

---

## 3. Thai Fiscal Year Calendar Display & Filtering (`ปฏิทินปีงบประมาณ`)
Using Thai government fiscal year rules (`lib/thai-fiscal.ts` / shared helper):
- **Fiscal Year Formula:** For any `"YYYY-MM-DD"`:
  - `yearBE = YYYY + 543`
  - `fiscalYear = (MM >= 10) ? yearBE + 1 : yearBE`  
    *(e.g. `2026-10` → ตุลาคม 2569, **ปีงบประมาณ 2570**; `2026-11` → พฤศจิกายน 2569, **ปีงบประมาณ 2570**; `2026-09` → กันยายน 2569, **ปีงบประมาณ 2569**)*
  - `fiscalMonthOrder`: `ต.ค. = 1`, `พ.ย. = 2`, `ธ.ค. = 3`, `ม.ค. = 4`, ..., `ก.ย. = 12` (Quarter `Q1..Q4`).
- **UI & Export Enhancements on `/attendance`:**
  - **Filter Bar:** Add **ปีงบประมาณ** selector (`ทุกปีงบประมาณ`, `ปีงบ 2570 (ต.ค. 69 – ก.ย. 70)`, `ปีงบ 2569`, `ปีงบ 2568`, etc.) and **เดือน (ปฏิทินปีงบประมาณ)** selector ordered in fiscal-year order (`ต.ค. → พ.ย. → ธ.ค. → ม.ค. → ... → ก.ย.`) such as `พ.ย. 2569 (เดือน 2/12 • ปีงบ 2570)`. Selecting either automatically populates `dateFrom` / `dateTo` accurately to exact calendar month/fiscal year boundaries.
  - **Active Fiscal Banner & Table Display:** Display Month/Year in Thai Buddhist Era + Fiscal Year badge (e.g., `พฤศจิกายน 2569 (ปีงบ 2570 • ไตรมาส 1)` on the active filter summary and in each row's date column `12 พ.ย. 2569 • ปีงบ 2570`), plus quick-date pills formatted with Thai month/BE year.
  - **CSV Export:** Include explicit `เดือน/ปี (พ.ศ.)` and `ปีงบประมาณ` columns and include the selected fiscal period in the exported filename when filtering by fiscal year/month.
- **API & Cloud Availability (`availableMonths`):**
  - Return sorted `availableMonths` (`YYYY-MM[]`) in `GET /api/attendance` from local store and, in Supabase Cloud mode, from sync telemetry (`audit_logs`) with an indexed month-skip scan fallback (`.lt(monthStart).limit(1)` using `idx_attendance_scan_time`) so Cloud Replica shows all 24 historical months cleanly without scanning all 30,366 rows.

---

## 4. Constraints & Manual Override Protection
- **No Schema Migration Required:** Both [attendance_schema.sql](file:///c:/Users/GuitarDev/virtual-office/supabase/attendance_schema.sql#L17-L18) (`io_mode SMALLINT`) and [attendance-db.ts](file:///c:/Users/GuitarDev/virtual-office/lib/attendance-db.ts#L311-L312) (`io_mode TINYINT`) already accept `1..4`.
- **Preserve Admin Manual Edits:** Backfill and device-sync reclassification **never overwrite** records where `isEdited === true` or `source === "manual"`. Manual add/edit modal supports all 4 `io_mode` options (`1..4`) and auto-suggests the matching `io_mode` when picking a time during creation while allowing full manual override.
- **Summary Card:** Card 3 (`สถิติรายการตามตัวกรอง`) displays exact 4-category counts across any filter range (`เข้าเช้าปกติ`, `สาย / อาจลา`, `ระหว่างวัน`, `ออกราชการ`, plus `แก้ไขแล้ว` pill/count).

---

## 5. Verification Targets
- Unit verification of `classifyAttendanceByOfficialHours` boundaries (`04:59:59`, `05:00:00`, `08:30:59`, `08:31:00`, `12:00:59`, `12:01:00`, `16:29:59`, `16:30:00`) and fiscal year helper (`2026-09-30` → ปีงบ 2569 Q4 vs `2026-10-01` → ปีงบ 2570 Q1).
- Backfill updates unedited `30,366` records across Local JSON, Synology NAS MariaDB, and Supabase Cloud (`14,738` mode 1 / `349` mode 3 / `43` mode 4 / `15,236` mode 2) while leaving `isEdited = true` rows untouched.
- Playwright E2E verification of `/api/attendance` filters/fiscal month-year queries and `/attendance` UI (badges, fiscal dropdowns, Cloud fallback), plus `npx tsc --noEmit` & `npm run build`.
