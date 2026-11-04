# Sidebar Tools & Data Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "เครื่องมือ & Tools" category to the sidebar with "QR Code" and "BG Remove" sub-systems, and add "ระบบรวมข้อมูล" as the first menu item under "คลังข้อมูล", complete with dedicated pages, components, and router configuration.

**Architecture:** 
1. Extend `lib/types.ts`, `lib/navigation.ts`, and `lib/rbac.ts` with new `ModuleId` entries: `datahub`, `qrcode`, and `bgremove`.
2. Implement 3 primary pages in `components/`: `DataHubPage.tsx` under `components/datahub/`, and `QRCodeToolPage.tsx`, `BgRemoveToolPage.tsx`, and `ToolsOverviewPage.tsx` under `components/tools/`.
3. Create App Router endpoints: `app/(app)/data-hub/page.tsx`, `app/(app)/tools/page.tsx`, `app/(app)/tools/qrcode/page.tsx`, and `app/(app)/tools/bgremove/page.tsx`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, `qrcode` library, HTML5 Canvas API for image segmentation.

**Spec:** User-approved specifications (menu labels without parentheses, "ระบบรวมข้อมูล" first in "คลังข้อมูล", functional preliminary pages).

## Global Constraints
- Menu labels must NOT contain parenthesized descriptions.
- `datahub` must be the first item in the `storage` group.
- BG Remove and QR Code tools must run client-side for data confidentiality and zero external API dependencies.
- Match Smart MSO theme styling (slate, teal, emerald, indigo).

---

### Task 1: Navigation & RBAC Configuration

**Files:**
- Modify: `lib/types.ts:14-26`
- Modify: `lib/navigation.ts:17-90`
- Modify: `lib/rbac.ts:34-80`

**Interfaces:**
- `ModuleId` extended with `"datahub" | "qrcode" | "bgremove"`
- `NAV_GROUPS` updated with:
  - `storage` group: `datahub` first, then `files`, then `gallery`
  - `tools` group: `qrcode` and `bgremove`
- Routes:
  - `/data-hub` -> `datahub`
  - `/tools/qrcode` -> `qrcode`
  - `/tools/bgremove` -> `bgremove`
  - `/tools` -> `tools` overview

- [x] **Step 1: Update `lib/types.ts` to add module IDs**
- [x] **Step 2: Update `lib/navigation.ts` with updated groups, routes, and clean labels**
- [x] **Step 3: Update `lib/rbac.ts` with module names and initial system modules**
- [x] **Step 4: Run `npx tsc --noEmit` to verify type safety**

---

### Task 2: Implement Component Pages

**Files:**
- Create: `components/datahub/DataHubPage.tsx`
- Create: `components/tools/QRCodeToolPage.tsx`
- Create: `components/tools/BgRemoveToolPage.tsx`
- Create: `components/tools/ToolsOverviewPage.tsx`

**Interfaces:**
- `DataHubPage`: Tabbed mission data view (ภาพรวม, ฝ่ายบริหารทั่วไป, กลุ่มนโยบายและวิชาการ, กลุ่มการพัฒนาสังคมและสวัสดิการ, ศูนย์บริการคนพิการ) with key metrics, documents, and external links.
- `QRCodeToolPage`: Permanent static QR generator with content types, color presets, size selection, logo overlay, preview, and download.
- `BgRemoveToolPage`: Client-side background removal with transparent, white, and official blue background options, before/after preview, and PNG download.
- `ToolsOverviewPage`: Directory page highlighting available tools.

- [x] **Step 1: Create `components/datahub/DataHubPage.tsx`**
- [x] **Step 2: Create `components/tools/QRCodeToolPage.tsx`**
- [x] **Step 3: Create `components/tools/BgRemoveToolPage.tsx`**
- [x] **Step 4: Create `components/tools/ToolsOverviewPage.tsx`**
- [x] **Step 5: Run `npx tsc --noEmit` to ensure components compile cleanly**

---

### Task 3: Create Next.js App Router Routes

**Files:**
- Create: `app/(app)/data-hub/page.tsx`
- Create: `app/(app)/tools/page.tsx`
- Create: `app/(app)/tools/qrcode/page.tsx`
- Create: `app/(app)/tools/bgremove/page.tsx`

- [x] **Step 1: Wire each route to its corresponding component with AppContext**
- [x] **Step 2: Run `npx tsc --noEmit`**

---

### Task 4: Production Build, Verification, and Git Commit

- [x] **Step 1: Run `npm run build`**
- [x] **Step 2: Commit and push changes to `main`**
- [x] **Step 3: Update Work Log artifact and reply to user**

