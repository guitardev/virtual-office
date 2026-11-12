# Short URL Tool (`/tools/shorturl`) Design Specification

**Date:** 2026-11-12  
**Approved Approach:** Approach 1 — Self-hosted prefix redirect (`/s/<slug>`) + Next.js Route Handlers + Supabase PostgreSQL  

---

## 1. Intent & Goals
Provide an official internal URL shortener for Kamphaeng Phet Provincial Social Development and Human Security Office (`smso.site`) under `/tools/shorturl`:
- Generate trustworthy, ad-free short links on the agency's domain (`https://www.smso.site/s/<slug>`).
- Support both public redirects without login (`app/s/[slug]/route.ts` outside `(app)` auth wrapper) and authenticated staff management inside `/tools/shorturl` (`app/(app)/tools/shorturl/page.tsx`).
- Support dynamic destination updates (`target_url` editable without changing printed short URL / QR codes), expiry dates, active/disabled toggling, click statistics, and 1-click QR Code handoff to `/tools/qrcode`.

## 2. Constraints & Security
- **Public vs Authenticated Split:** Management UI sits under `app/(app)/tools/shorturl/page.tsx` gated by `AppShell` and RBAC (`ModuleId = "shorturl"`). Public resolution lives at `app/s/[slug]/route.ts` with `force-dynamic` and `Cache-Control: no-store` so dynamic updates and disable/expiry take effect immediately.
- **Open Redirect Prevention:** Only `http://` and `https://` destination URLs are permitted (both client validation, server API validation, and PostgreSQL `CHECK` constraint). Self-redirect loops to `/s/...` on the same host are blocked.
- **Slug Integrity:** Normalized lowercase `[a-z0-9][a-z0-9_-]{1,47}` with reserved path blocklist (`api`, `admin`, `tools`, `s`, etc.). Exact equality matching avoids `ILIKE` wildcard (`_`) bugs.
- **Permission Control:** `admin` can manage any link; standard users (`manager`, `member`, `guest`) can edit/toggle/delete links they created.

## 3. Database Schema (`public.short_links`)
- Table `public.short_links` with `uuid` primary key, unique lowercase `slug`, `target_url`, `title`, `division`, `click_count bigint`, `last_clicked_at timestamptz`, `expires_at timestamptz`, `is_active boolean`, `created_by`, `created_by_name`, `created_at`, `updated_at`.
- Atomic increment function `public.increment_short_link_click(link_slug text)` (`SECURITY INVOKER`) invoked non-blockingly via Next.js `after()` inside `/s/[slug]`.
- Graceful setup banner in `/tools/shorturl` with copyable SQL migration if `public.short_links` has not been created yet on Supabase.

