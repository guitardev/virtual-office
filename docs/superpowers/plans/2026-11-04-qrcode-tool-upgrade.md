# Plan: Comprehensive Upgrade for QR Code Generator (/tools/qrcode)

**Goal:** Transform `/tools/qrcode` into an official government-grade QR Code & Signage Generation Suite for KPP-MSOC, featuring official MSO & Garuda emblems, A4 Print-Ready Signage, SVG vector export, call-to-action frames, and Thai civil service data types (vCard, LINE, EMVCo PromptPay).

---

## 1. Scope & Core Features

### 1.1 Official Emblem & Logo System
- **MSO Emblem (ตราพระประชาบดี):** Integrated from `public/images/mso-logo.png`
- **Garuda Emblem (ตราครุฑ):** Integrated from `public/images/garuda.svg`
- **Text Badge ("พม."):** Classical clean typography badge
- **Custom Logo Upload:** File input supporting PNG/JPG/SVG with high error correction (Level H 30%)
- **None:** Clean unbranded QR code

### 1.2 Thai Civil Service Data Types
- **🌐 Website / URL:** Documents, NAS files, Google Forms
- **🪪 Digital Government vCard:** Name, position, division, phone, email, office address (opens smartphone contact book)
- **💬 LINE Official & Groups:** LINE ID, OA URL, OpenChat URL
- **💳 PromptPay EMVCo Standard:** Standard Bank of Thailand EMVCo payload with optional amount
- **📧 Official Email (Mailto):** Recipient, subject, body
- **📶 Wi-Fi:** SSID, password, security
- **📞 Phone:** One-click dialer
- **📝 Plain Text:** Announcements, memos

### 1.3 Call-to-Action QR Frames
- Frame styles: None, Bottom Banner ("สแกนอ่านเอกสาร", "สแกนลงทะเบียน", "สแกนแบบประเมิน", "SCAN ME", or Custom Text)
- Embedded directly in Canvas so PNG and clipboard copy include the frame

### 1.4 Vector & Print Export
- **SVG Vector Export:** Infinite scaling for vinyl banners & stage backdrops without pixelation
- **High-res PNG:** 256px to 2048px (4K Print)
- **A4 Print-Ready Signage Template:**
  - Official header with MSO emblem & "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
  - Customizable title, instructions, and department
  - Print-specific CSS (`@media print`) and Instant Print button
  - A4 PNG download

---

## 2. Implementation Steps
1. Create PromptPay EMVCo & vCard helper functions in `lib/qrcode-utils.ts` or directly within `components/tools/QRCodeToolPage.tsx`.
2. Enhance `components/tools/QRCodeToolPage.tsx` with:
   - Data types tabs & input forms
   - Logo selector with MSO emblem, Garuda, text, custom upload
   - Frame selection and Canvas rendering with CTA banner
   - SVG string generation and download
   - A4 Signage Preview modal/tab with Print button and print styles
3. Test with `npx tsc --noEmit` and `npm run build`.
4. Commit and push to `origin/main`.

