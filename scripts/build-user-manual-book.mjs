/**
 * Smart MSO Virtual Office — Annotated & Enhanced Official User Manual Book Builder (v2.0)
 * Generates a print-ready 47-page A4 HTML manual with pixel-aligned SVG callout annotations
 * (numbered badges, highlight boxes/circles, pointer arrows), Paper-vs-Digital analyses,
 * Special Features, Pro Tips, Chapter 7 HRM & CRM Future Roadmap, Developer Credits,
 * and renders an official A4 PDF via Playwright Chromium with automated QA checks.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const HTML_OUT = path.join(ROOT_DIR, "docs", "user-manual", "Smart_MSO_User_Manual.html");
const PDF_OUT = path.join(ROOT_DIR, "docs", "Smart_MSO_User_Manual.pdf");
const ARTIFACT_DIR = "C:\\Users\\GuitarDev\\.gemini\\antigravity\\brain\\98990908-3347-427b-ae54-f2d6728edcc7";
const ARTIFACT_PDF_OUT = path.join(ARTIFACT_DIR, "Smart_MSO_User_Manual.pdf");
const PREVIEW_DIR = path.join(ARTIFACT_DIR, "scratch", "book-preview-v2");

const DEV_NAME = "นายธนวัฒน์ แกมขุนทด";
const DEV_POS = "ตำแหน่งนักพัฒนาสังคม · กลุ่มนโยบายและวิชาการ";
const DEV_ORG = "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร";

const ANNO_COLORS = {
  indigo: { stroke: "#4F46E5", fill: "rgba(79, 70, 229, 0.08)", badge: "#4F46E5" },
  pink: { stroke: "#DB2777", fill: "rgba(219, 39, 119, 0.08)", badge: "#DB2777" },
  teal: { stroke: "#0D9488", fill: "rgba(13, 148, 136, 0.08)", badge: "#0D9488" },
  amber: { stroke: "#D97706", fill: "rgba(217, 119, 6, 0.08)", badge: "#D97706" },
  crimson: { stroke: "#E11D48", fill: "rgba(225, 29, 72, 0.08)", badge: "#E11D48" },
};

const esc = (str) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function renderAnnotationsSvg(annos = []) {
  if (!annos.length) return "";

  const defs = `
    <defs>
      <filter id="badgeShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0F172A" flood-opacity="0.38" />
      </filter>
      ${Object.entries(ANNO_COLORS)
        .map(
          ([key, val]) => `
        <marker id="arrow-${key}" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,1 L7,4 L0,7 Z" fill="${val.stroke}" />
        </marker>`
        )
        .join("")}
    </defs>`;

  const layers = annos
    .map((a) => {
      const c = ANNO_COLORS[a.color || "indigo"] || ANNO_COLORS.indigo;
      const parts = [];

      if (a.shape === "rect") {
        parts.push(
          `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="12" fill="${c.fill}" stroke="#FFFFFF" stroke-width="7.5" opacity="0.92" />`,
          `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="12" fill="none" stroke="${c.stroke}" stroke-width="3.8" />`
        );
      } else if (a.shape === "circle") {
        parts.push(
          `<circle cx="${a.cx}" cy="${a.cy}" r="${a.r}" fill="${c.fill}" stroke="#FFFFFF" stroke-width="7.5" opacity="0.92" />`,
          `<circle cx="${a.cx}" cy="${a.cy}" r="${a.r}" fill="none" stroke="${c.stroke}" stroke-width="3.8" />`
        );
      }

      if (typeof a.px === "number" && typeof a.py === "number") {
        parts.push(
          `<line x1="${a.bx}" y1="${a.by}" x2="${a.px}" y2="${a.py}" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity="0.92" />`,
          `<line x1="${a.bx}" y1="${a.by}" x2="${a.px}" y2="${a.py}" stroke="${c.stroke}" stroke-width="3.4" stroke-linecap="round" marker-end="url(#arrow-${a.color || "indigo"})" />`
        );
      }

      parts.push(
        `<g filter="url(#badgeShadow)">
          <circle cx="${a.bx}" cy="${a.by}" r="20" fill="${c.badge}" stroke="#FFFFFF" stroke-width="4" />
          <text x="${a.bx}" y="${a.by + 1}" text-anchor="middle" dominant-baseline="central" fill="#FFFFFF" font-family="Kanit, Sarabun, sans-serif" font-size="22" font-weight="700">${a.n}</text>
        </g>`
      );

      return parts.join("\n");
    })
    .join("\n");

  return `<svg class="anno-svg" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">${defs}${layers}</svg>`;
}

function renderScreenshotFrame({ figId, figNum, imgFile, urlPath, caption, annos = [], size = "normal" }) {
  return `
    <figure id="${esc(figId)}" class="shot-figure size-${size}">
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="win-dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <div class="url-pill">
            <span class="lock-ico">🔒</span>
            <span>https://www.smso.site${esc(urlPath)}</span>
          </div>
          <div class="live-pill">1440×900 · Live UI Annotated</div>
        </div>
        <div class="shot-stage">
          <img src="./images/${esc(imgFile)}" alt="${esc(caption)}" />
          ${renderAnnotationsSvg(annos)}
        </div>
      </div>
      <figcaption class="shot-caption">
        <span class="fig-badge">ภาพที่ ${figNum}</span>
        <span>${esc(caption)}</span>
      </figcaption>
    </figure>
  `;
}

function renderSteps(steps, compact = false) {
  const badgeColors = ["indigo", "pink", "teal", "amber", "crimson"];
  return `
    <ol class="step-list ${compact ? "step-compact" : ""}">
      ${steps
        .map((s, idx) => {
          const colorCls = s.color || badgeColors[idx % badgeColors.length];
          return `
        <li>
          <span class="step-num bg-${colorCls}">${idx + 1}</span>
          <div class="step-txt">
            ${s.title ? `<strong>${esc(s.title)}:</strong> ` : ""}${s.html}
          </div>
        </li>`;
        })
        .join("")}
    </ol>
  `;
}

function renderCallout(type, icon, title, html) {
  return `
    <div class="callout callout-${type}">
      <div class="callout-ico">${icon}</div>
      <div class="callout-body">
        <div class="callout-title">${esc(title)}</div>
        <div class="callout-text">${html}</div>
      </div>
    </div>
  `;
}

function renderWorkflow(stages, color = "indigo") {
  return `
    <div class="workflow-bar theme-${color}">
      ${stages
        .map(
          (st, i) => `
        <div class="wf-node ${st.highlight ? "wf-highlight" : ""}">
          <div class="wf-step">${esc(st.step)}</div>
          <div class="wf-label">${esc(st.label)}</div>
          ${st.sub ? `<div class="wf-sub">${esc(st.sub)}</div>` : ""}
        </div>
        ${i < stages.length - 1 ? `<div class="wf-arrow">➔</div>` : ""}`
        )
        .join("")}
    </div>
  `;
}

function renderChapterBanner(chNum, title, subtitle, accent = "indigo") {
  return `
    <div class="chapter-banner accent-${accent}">
      <div class="ch-pill">บทที่ ${chNum}</div>
      <div class="ch-meta">
        <h2 class="ch-title">${esc(title)}</h2>
        <p class="ch-sub">${esc(subtitle)}</p>
      </div>
    </div>
  `;
}

function renderSectionHead(code, title, menuPath, compact = false) {
  return `
    <div class="sec-head ${compact ? "compact" : ""}">
      <div class="sec-title-row">
        <span class="sec-code">${esc(code)}</span>
        <h3 class="sec-title">${esc(title)}</h3>
      </div>
      ${menuPath ? `<div class="menu-crumb"><span>เส้นทางเมนู:</span> ${menuPath}</div>` : ""}
    </div>
  `;
}

function renderAnalysisPage({
  id,
  runningChapter,
  code,
  chLabel,
  comparisons, // [{ aspect, legacy, smart, benefit }]
  specialFeatures, // [{ icon, title, desc }]
  proTips, // [string]
  bottomHtml = "",
}) {
  return renderContentPage({
    id,
    runningChapter,
    bodyHtml: `
      ${renderSectionHead(code, `วิเคราะห์จุดเด่น ฟังก์ชันพิเศษ และคำแนะนำการใช้งาน (${chLabel})`, "สรุปเปรียบเทียบความคุ้มค่าเชิงระบบ · ระบบเดิม (กระดาษ/งานมือ) เทียบกับ Smart MSO Virtual Office", true)}

      <div class="ana-block">
        <div class="ana-heading">⚖️ วิเคราะห์จุดเด่น: ระบบงานเดิม (กระดาษ/แยกไฟล์) เทียบกับ Smart MSO และประโยชน์ต่อสำนักงาน</div>
        <table class="std-table ana-table">
          <thead>
            <tr>
              <th style="width: 19%;">ประเด็นเปรียบเทียบ</th>
              <th style="width: 26%;">ระบบเดิม (กระดาษ / งานมือ)</th>
              <th style="width: 28%;">ระบบ Smart MSO (ดิจิทัล)</th>
              <th style="width: 27%;">ประโยชน์หลักที่สำนักงานได้รับ</th>
            </tr>
          </thead>
          <tbody>
            ${comparisons
              .map(
                (c) => `
              <tr>
                <td><strong>${esc(c.aspect)}</strong></td>
                <td class="td-legacy">${c.legacy}</td>
                <td class="td-smart">${c.smart}</td>
                <td class="td-benefit">${c.benefit}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="ana-block">
        <div class="ana-heading">✨ ฟังก์ชันพิเศษที่พัฒนาขึ้นเฉพาะสำหรับ พมจ.กำแพงเพชร (Special Features)</div>
        <div class="sf-grid">
          ${specialFeatures
            .map(
              (sf) => `
            <div class="sf-card">
              <div class="sf-title">${sf.icon} ${esc(sf.title)}</div>
              <div class="sf-desc">${sf.desc}</div>
            </div>`
            )
            .join("")}
        </div>
      </div>

      <div class="ana-block">
        <div class="ana-heading">💡 คำแนะนำพิเศษเพื่อการใช้งานที่ลื่นไหลมากขึ้น (Pro Tips)</div>
        <ul class="protip-list">
          ${proTips.map((t) => `<li>${t}</li>`).join("")}
        </ul>
      </div>

      ${bottomHtml}
    `,
  });
}

function renderContentPage({ id, runningChapter, pageType = "body", bodyHtml }) {
  return `
    <section id="${esc(id)}" class="book-page content-page" data-page-type="${pageType}">
      <header class="page-header">
        <div class="ph-left">
          <span class="ph-mark"></span>
          <span>คู่มือการใช้งานระบบ <strong>Smart MSO Virtual Office</strong> <em class="v-tag">v2.0 Annotated</em></span>
        </div>
        <div class="ph-right">${esc(runningChapter)}</div>
      </header>
      <div class="page-body">
        ${bodyHtml}
      </div>
      <footer class="page-footer">
        <div class="pf-left">${esc(DEV_ORG)} · https://www.smso.site</div>
        <div class="pf-right"><span class="page-num-pill"></span></div>
      </footer>
    </section>
  `;
}

const TOC_ITEMS = [
  { level: 1, title: "ส่วนหน้า (Front Matter) — คำนำ เอกสารควบคุม และเครดิตผู้พัฒนาระบบ", href: "#preface" },
  { level: 1, title: "สารบัญเนื้อหา และ สารบัญภาพประกอบ (ภาพที่ 1 – 31)", href: "#toc" },
  { level: 1, title: "บทที่ 1: การเข้าสู่ระบบ โครงสร้างหน้าจอ และศูนย์การแจ้งเตือน", href: "#ch1" },
  { level: 2, title: "1.1 หน้าจอกรอก Username/Password และระบบป้องกัน Cloudflare Turnstile (ภาพที่ 1)", href: "#ch1" },
  { level: 2, title: "1.2 โครงสร้างเมนู 5 กลุ่ม & 1.3 หน้าแรกภาพรวมสำนักงาน Dashboard (ภาพที่ 2)", href: "#sec-1-2" },
  { level: 2, title: "1.4 ศูนย์การแจ้งเตือน Notifications Center (ภาพที่ 3)", href: "#sec-1-4" },
  { level: 2, title: "1.5 วิเคราะห์จุดเด่น ระบบเดิม vs Smart MSO, ฟังก์ชันพิเศษ & คำแนะนำพิเศษ", href: "#sec-1-5" },
  { level: 1, title: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสารองค์กร", href: "#ch2" },
  { level: 2, title: "2.1 ระบบหนังสือเวียนอิเล็กทรอนิกส์ และหน้าส่งหนังสือเวียน 3 ช่องทาง (ภาพที่ 4–5)", href: "#ch2" },
  { level: 2, title: "2.2 กระดานติดตามภารกิจงาน Kanban & การเพิ่มงานกำหนด Scope (ภาพที่ 6–7)", href: "#sec-2-2" },
  { level: 2, title: "2.3 ระบบการประชุม ปฏิทิน & ระบบจองห้องประชุม 5 ห้อง (ภาพที่ 8–9)", href: "#sec-2-3" },
  { level: 2, title: "2.4 ระบบแชทกลุ่มราชการ & จัดเก็บไฟล์แนบ Synology NAS (ภาพที่ 10)", href: "#sec-2-4" },
  { level: 2, title: "2.5 ระบบจองรถยนต์ราชการ 4 ขั้นตอนอนุมัติ & แบบ พมจ.กพ 02 (ภาพที่ 11–12)", href: "#sec-2-5" },
  { level: 2, title: "2.6 ระบบใบลาอิเล็กทรอนิกส์ 2 แบบฟอร์ม & แท็บใบลาของฉัน (ภาพที่ 13–15)", href: "#sec-2-6a" },
  { level: 2, title: "2.7 วิเคราะห์จุดเด่น ระบบกระดาษเดิม vs Smart MSO, ฟังก์ชันพิเศษ & คำแนะนำพิเศษ", href: "#sec-2-7" },
  { level: 1, title: "บทที่ 3: คลังข้อมูล สารบรรณ & บริการองค์กร", href: "#ch3" },
  { level: 2, title: "3.1 ศูนย์ข้อมูลและสถิติสังคม — สถานการณ์ทางสังคม & TPMAP อำเภอ/ตำบล (ภาพที่ 16–18)", href: "#ch3" },
  { level: 2, title: "3.1 (ต่อ) 4 กลุ่มภารกิจ, ทำเนียบบุคลากร, แบบฟอร์ม & คลังคำสั่ง/ประกาศ (ภาพที่ 19–22)", href: "#sec-3-1c" },
  { level: 2, title: "3.2 คลังเอกสาร Synology File Station — หน้าโฟลเดอร์ & การเปิดดูไฟล์ (ภาพที่ 23–24)", href: "#sec-3-2" },
  { level: 2, title: "3.3 คลังภาพและสื่อราชการ Synology Photos (ภาพที่ 25)", href: "#sec-3-3" },
  { level: 2, title: "3.4 วิเคราะห์จุดเด่น คลังเดิม vs Data Hub + NAS, ฟังก์ชันพิเศษ & คำแนะนำพิเศษ", href: "#sec-3-4" },
  { level: 1, title: "บทที่ 4: เครื่องมือช่วยปฏิบัติงาน & ข้อมูลส่วนตัว", href: "#ch4" },
  { level: 2, title: "4.1 โปรแกรมสร้าง Static QR Code & โหมดพิเศษป้าย A4 พร้อมพิมพ์ (ภาพที่ 26–27)", href: "#ch4" },
  { level: 2, title: "4.2 Short URL ย่อลิงก์ราชการ & 4.3 BG Remove 100% Client-side (ภาพที่ 28–30)", href: "#sec-4-2" },
  { level: 2, title: "4.4 ข้อมูลส่วนตัวและการตั้งค่าบัญชี Synology NAS (ภาพที่ 31)", href: "#sec-4-4" },
  { level: 2, title: "4.5 วิเคราะห์จุดเด่น เว็บภายนอก vs เครื่องมือในระบบ, ฟังก์ชันพิเศษ & คำแนะนำพิเศษ", href: "#sec-4-5" },
  { level: 1, title: "บทที่ 5: ระบบสิทธิ์การใช้งาน (RBAC) & โมดูลจำกัดสิทธิ์ (🔒)", href: "#ch5" },
  { level: 2, title: "5.1 ตาราง RBAC 17 โมดูล × 4 บทบาท & 5.2 โมดูล รายงาน / ลงเวลา / จัดการระบบ", href: "#ch5" },
  { level: 2, title: "5.3 วิเคราะห์จุดเด่น สมุดลงเวลาเดิม vs RBAC + Hybrid Attendance & คำแนะนำพิเศษ", href: "#sec-5-3" },
  { level: 1, title: "บทที่ 6: การแก้ไขปัญหาเบื้องต้น Checklist & สรุปความคุ้มค่าองค์กร", href: "#ch6" },
  { level: 2, title: "6.1 ตาราง FAQ · 6.2 Checklist รายวัน · 6.3 วิเคราะห์ภาพรวม & ฟังก์ชันเชื่อมข้ามโมดูล", href: "#ch6" },
  { level: 1, title: "บทที่ 7: แนวทางการพัฒนาระบบในอนาคต (HRM & CRM Roadmap) & เครดิตผู้พัฒนา", href: "#ch7" },
  { level: 2, title: "7.1 ระบบ CRM ประชาชน: เยี่ยมบ้าน Online, คลินิกทางสังคมออนไลน์ & 360° Welfare", href: "#ch7" },
  { level: 2, title: "7.2 ระบบ HRM ดิจิทัล · 7.3 แผนพัฒนา 3 ระยะ & เครดิตผู้พัฒนาระบบ", href: "#sec-7-2" },
];

const LOF_ITEMS = [
  { figNum: 1, title: "หน้าจอเข้าสู่ระบบ Database Auth & Cloudflare Turnstile", href: "#fig-1" },
  { figNum: 2, title: "หน้าแรกภาพรวมสำนักงาน (Dashboard) & เมนู 5 กลุ่ม", href: "#fig-2" },
  { figNum: 3, title: "ศูนย์การแจ้งเตือน (Notifications) แยก 5 หมวดหมู่", href: "#fig-3" },
  { figNum: 4, title: "หน้าหลักระบบเวียนหนังสือราชการอิเล็กทรอนิกส์", href: "#fig-4" },
  { figNum: 5, title: "หน้าต่างส่งหนังสือเวียนใหม่ เลขไทยอัตโนมัติ & 3 ช่องทาง", href: "#fig-5" },
  { figNum: 6, title: "กระดานติดตามงาน Kanban Board 4 สถานะ & RBAC Scope", href: "#fig-6" },
  { figNum: 7, title: "หน้าต่างเพิ่มภารกิจใหม่ & Visibility Scope", href: "#fig-7" },
  { figNum: 8, title: "หน้าหลักระบบการประชุม รายการนัดหมาย & Google Calendar", href: "#fig-8" },
  { figNum: 9, title: "ผังการตรวจสอบความพร้อมและจองห้องประชุม 5 ห้อง", href: "#fig-9" },
  { figNum: 10, title: "ระบบแชทกลุ่มราชการ & แนบไฟล์ตรงสู่ Synology NAS", href: "#fig-10" },
  { figNum: 11, title: "หน้าหลักระบบจองรถยนต์ราชการ 4 ขั้นตอนอนุมัติ", href: "#fig-11" },
  { figNum: 12, title: "แบบ พมจ.กพ 02: ยื่นคำขอใช้รถ & ปลายทางด่วน 11 อำเภอ", href: "#fig-12" },
  { figNum: 13, title: "ระบบใบลา — แบบฟอร์ม 1 (ป่วย / กิจส่วนตัว / คลอดบุตร)", href: "#fig-13" },
  { figNum: 14, title: "ระบบใบลา — แบบฟอร์ม 2 (ใบลาพักผ่อนประจำปี)", href: "#fig-14" },
  { figNum: 15, title: "แท็บใบลาของฉันและการตรวจสอบสถานะรายปีงบประมาณ", href: "#fig-15" },
  { figNum: 16, title: "Data Hub แท็บ 1: สถานการณ์ทางสังคม 11 อำเภอ 78 ตำบล", href: "#fig-16" },
  { figNum: 17, title: "Data Hub แท็บ 2: วิเคราะห์ TPMAP (ภาพรวม 11 อำเภอ)", href: "#fig-17" },
  { figNum: 18, title: "TPMAP ระดับตำบล (78 ตำบล) แนวโน้ม 5 ปี & 5 มิติ MPI", href: "#fig-18" },
  { figNum: 19, title: "Data Hub แท็บ 3: โครงสร้างระบบงาน 4 กลุ่มภารกิจ พมจ.", href: "#fig-19" },
  { figNum: 20, title: "Data Hub แท็บ 4: ทำเนียบข้าราชการและเจ้าหน้าที่ (40 ท่าน)", href: "#fig-20" },
  { figNum: 21, title: "Data Hub แท็บ 5: คลังแบบฟอร์มและคู่มือปฏิบัติงาน", href: "#fig-21" },
  { figNum: 22, title: "Data Hub แท็บ 6: คลังคำสั่ง / ประกาศ / ระเบียบราชการ", href: "#fig-22" },
  { figNum: 23, title: "Synology File Station หน้าโฟลเดอร์แชร์ตามสิทธิ์ DSM ACL", href: "#fig-23" },
  { figNum: 24, title: "การเปิดดูไฟล์ อัปโหลด และกรองเอกสารภายในโฟลเดอร์ NAS", href: "#fig-24" },
  { figNum: 25, title: "คลังภาพและสื่อราชการ Synology Photos (Shared & Personal)", href: "#fig-25" },
  { figNum: 26, title: "โปรแกรมสร้าง Static QR Code ถาวร พร้อมตรา พม. / ครุฑ", href: "#fig-26" },
  { figNum: 27, title: "โหมดพิเศษ: ป้ายประชาสัมพันธ์ขนาด A4 พร้อมพิมพ์ PDF", href: "#fig-27" },
  { figNum: 28, title: "ระบบย่อลิงก์ราชการอัจฉริยะ Short URL (/s/ชื่อย่อ)", href: "#fig-28" },
  { figNum: 29, title: "BG Remove: อัปโหลด สีพื้นหลัง และสัดส่วนรูปติดบัตร ก.พ.", href: "#fig-29" },
  { figNum: 30, title: "BG Remove Demo: ผลลัพธ์ตัดขอบอัตโนมัติ & สไลด์เปรียบเทียบ", href: "#fig-30" },
  { figNum: 31, title: "หน้าข้อมูลส่วนตัว การตั้งค่า และรหัสผ่าน Synology NAS", href: "#fig-31" },
];

const RBAC_ROWS = [
  { no: 1, icon: "📊", name: "หน้าแรก (Dashboard)", route: "/dashboard", admin: true, mgr: true, mem: true, guest: false },
  { no: 2, icon: "💬", name: "แชททีม (Chat)", route: "/chat", admin: true, mgr: true, mem: true, guest: true },
  { no: 3, icon: "📜", name: "หนังสือเวียน (Circular)", route: "/circular", admin: true, mgr: true, mem: true, guest: false },
  { no: 4, icon: "📋", name: "ภารกิจงาน (Tasks)", route: "/tasks", admin: true, mgr: true, mem: true, guest: false },
  { no: 5, icon: "📹", name: "การประชุม (Meetings)", route: "/meetings", admin: true, mgr: true, mem: true, guest: true },
  { no: 6, icon: "🚗", name: "รถราชการ (Car Booking)", route: "/carbooking", admin: true, mgr: true, mem: true, guest: false },
  { no: 7, icon: "📝", name: "ระบบใบลา (Leave)", route: "/leave", admin: true, mgr: true, mem: true, guest: false },
  { no: 8, icon: "🗃️", name: "ระบบรวมข้อมูล (Data Hub)", route: "/data-hub", admin: true, mgr: true, mem: true, guest: false },
  { no: 9, icon: "📁", name: "เอกสาร NAS (File Station)", route: "/files", admin: true, mgr: true, mem: true, guest: false },
  { no: 10, icon: "📸", name: "ภาพ & สื่อ (Synology Photos)", route: "/gallery", admin: true, mgr: true, mem: true, guest: false },
  { no: 11, icon: "📱", name: "QR Code ถาวร", route: "/tools/qrcode", admin: true, mgr: true, mem: true, guest: true },
  { no: 12, icon: "🔗", name: "Short URL ย่อลิงก์", route: "/tools/shorturl", admin: true, mgr: true, mem: true, guest: true },
  { no: 13, icon: "✂️", name: "BG Remove ลบพื้นหลัง", route: "/tools/bgremove", admin: true, mgr: true, mem: true, guest: true },
  { no: 14, icon: "👤", name: "ข้อมูลส่วนตัว (Profile)", route: "/user", admin: true, mgr: true, mem: true, guest: true },
  { no: 15, icon: "📈", name: "รายงาน (Reports)", route: "/reports", admin: true, mgr: true, mem: false, guest: false },
  { no: 16, icon: "⏱️", name: "ลงเวลาราชการ (Attendance)", route: "/attendance", admin: true, mgr: "cond", mem: false, guest: false },
  { no: 17, icon: "⚙️", name: "จัดการระบบ (Admin Panel)", route: "/admin", admin: true, mgr: false, mem: false, guest: false },
];

function buildPagesHtml() {
  const pages = [];

  // ================= PAGE 1: FRONT COVER =================
  pages.push(`
    <section id="cover" class="book-page cover-page cover-front" data-page-type="cover">
      <div class="cover-grid-bg"></div>
      <div class="cover-top-ribbon"></div>

      <div class="cover-inner">
        <div class="cover-org-header">
          <div class="cover-logo-pair">
            <div class="logo-card-white">
              <img src="../../public/images/mso-logo.png" alt="ตรากระทรวง พม." />
            </div>
            <div class="logo-card-white">
              <img src="../../public/smart-mso-logo.png" alt="Smart MSO Logo" />
            </div>
          </div>
          <div class="cover-org-text">
            <div class="org-kicker">MINISTRY OF SOCIAL DEVELOPMENT AND HUMAN SECURITY</div>
            <div class="org-name">${esc(DEV_ORG)}</div>
            <div class="org-sub">ศูนย์ข้อมูลและระบบสำนักงานดิจิทัลอัจฉริยะ · กลุ่มนโยบายและวิชาการ</div>
          </div>
        </div>

        <div class="cover-hero-block">
          <div class="doc-class-pill">📘 คู่มือมาตรฐานการใช้งานระบบฉบับสมบูรณ์ · ฉบับที่ 2.0 (Annotated Edition)</div>
          <h1 class="cover-main-title">
            คู่มือการใช้งานระบบ<br />
            <span class="cover-accent-text">Smart MSO Virtual Office</span>
          </h1>
          <p class="cover-subtitle">
            พร้อมสัญลักษณ์มาร์กจุดชี้ตำแหน่งบนหน้าจอจริง 31 ภาพ, วิเคราะห์ความแตกต่างจากระบบเดิม,<br />
            ฟังก์ชันพิเศษ เคล็ดลับใช้งานลื่นไหล และแนวทางการต่อยอดสู่ระบบ HRM &amp; CRM ในอนาคต
          </p>

          <div class="cover-pill-row">
            <span class="cov-pill">🌐 ระบบจริง: <strong>https://www.smso.site</strong></span>
            <span class="cov-pill">🎯 ภาพหน้าจอมาร์กจุด <strong>31 ภาพ</strong> (ครบขั้นตอนหลัก-ย่อย)</span>
            <span class="cov-pill">🚀 ครบ <strong>7 บท</strong> (รวมแผนพัฒนา HRM &amp; CRM)</span>
          </div>
        </div>

        <div class="cover-preview-strip">
          <div class="preview-card-mini">
            <div class="pc-head">🔐 Login &amp; Turnstile</div>
            <img src="./images/00-login.png" alt="Login Preview" />
          </div>
          <div class="preview-card-mini">
            <div class="pc-head">📊 Dashboard &amp; Workflow</div>
            <img src="./images/01-dashboard.png" alt="Dashboard Preview" />
          </div>
          <div class="preview-card-mini">
            <div class="pc-head">🎯 TPMAP กำแพงเพชร</div>
            <img src="./images/12-datahub-tpmap.png" alt="TPMAP Preview" />
          </div>
        </div>

        <div>
          <div class="cover-dev-strip">
            <span class="dev-badge">👨‍💻 พัฒนาและออกแบบระบบโดย</span>
            <span class="dev-info"><strong>${esc(DEV_NAME)}</strong> · ${esc(DEV_POS)}</span>
          </div>

          <div class="cover-footer-meta">
            <div class="meta-box">
              <span class="meta-lbl">รหัสเอกสาร</span>
              <span class="meta-val">MSO-KPP-UM-002</span>
            </div>
            <div class="meta-box">
              <span class="meta-lbl">ฉบับ / จำนวนหน้า</span>
              <span class="meta-val">ฉบับที่ 2.0 (47 หน้า A4)</span>
            </div>
            <div class="meta-box">
              <span class="meta-lbl">บทบาทอ้างอิง</span>
              <span class="meta-val">พนักงาน (14/17) &amp; RBAC</span>
            </div>
            <div class="meta-box">
              <span class="meta-lbl">วันที่ปรับปรุง</span>
              <span class="meta-val">20 พฤศจิกายน 2569</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `);

  // ================= PAGE 2 (ก): PREFACE, DOC CONTROL & DEVELOPER CREDIT =================
  pages.push(
    renderContentPage({
      id: "preface",
      runningChapter: "คำนำ เอกสารควบคุม และเครดิตผู้พัฒนาระบบ",
      pageType: "front",
      bodyHtml: `
        <div class="front-title-block">
          <div class="front-kicker">PREFACE, DOCUMENT CONTROL &amp; SYSTEM CREDIT</div>
          <h2 class="front-h2">คำนำ เอกสารควบคุม และเครดิตผู้พัฒนาระบบ</h2>
        </div>

        <div class="preface-card">
          <p>
            คู่มือการใช้งานระบบ <strong>Smart MSO Virtual Office (ฉบับที่ 2.0 — Annotated Edition)</strong> จัดทำขึ้นสำหรับบุคลากรของ <strong>${esc(DEV_ORG)}</strong> เพื่อใช้เป็นคู่มือปฏิบัติงานภาคสนามและสำนักงานแบบครบวงจร โดยในฉบับปรับปรุงนี้ได้เพิ่ม <strong>ภาพหน้าจอขั้นตอนละเอียดเป็น 31 ภาพ</strong> พร้อมระบบ <strong>มาร์กจุดชี้ตำแหน่งบนภาพ (กรอบสี่เหลี่ยม วงกลม ลูกศรชี้ และวงกลมเลขลำดับ ①②③)</strong> ตรงกับคำอธิบายทีละขั้น การวิเคราะห์เปรียบเทียบข้อดีเหนือระบบกระดาษเดิม ฟังก์ชันพิเศษ คำแนะนำเพื่อความลื่นไหล และแนวทางการต่อยอดด้าน HRM &amp; CRM ในอนาคต
          </p>
        </div>

        <div class="dev-credit-box">
          <div class="dcb-ico">🏛️</div>
          <div class="dcb-body">
            <div class="dcb-kicker">เกียรติคุณและเครดิตผู้พัฒนาระบบ (System Architect &amp; Developer Credit)</div>
            <div class="dcb-name">${esc(DEV_NAME)}</div>
            <div class="dcb-role">${esc(DEV_POS)} · ${esc(DEV_ORG)}</div>
          </div>
        </div>

        <h3 class="sub-h3">1. ข้อมูลควบคุมเอกสาร (Document Control)</h3>
        <table class="std-table compact-table">
          <thead>
            <tr>
              <th style="width: 28%;">รายการข้อมูล</th>
              <th>รายละเอียดเอกสารมาตรฐาน</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>รหัสเอกสาร / ฉบับที่</strong></td>
              <td><code>MSO-KPP-UM-002</code> · ฉบับที่ <strong>2.0 (Annotated &amp; Enhanced Edition)</strong></td>
            </tr>
            <tr>
              <td><strong>วันที่ปรับปรุง / เว็บแอป</strong></td>
              <td>20 พฤศจิกายน 2569 · <code>https://www.smso.site</code> (Next.js + Supabase Live + Synology NAS)</td>
            </tr>
            <tr>
              <td><strong>ผู้พัฒนาและเจ้าของระบบ</strong></td>
              <td>${esc(DEV_NAME)} (${esc(DEV_POS)}) · พมจ.กำแพงเพชร</td>
            </tr>
            <tr>
              <td><strong>ขอบเขตภาพและสิทธิ์อ้างอิง</strong></td>
              <td>บันทึกจากระบบจริงขนาด <code>1440 × 900 px</code> จำนวน 31 ภาพ ครอบคลุม 17 โมดูล และแผนอนาคตบทที่ 7</td>
            </tr>
          </tbody>
        </table>

        <h3 class="sub-h3">2. สัญลักษณ์และระบบมาร์กจุดบนภาพหน้าจอ</h3>
        <div class="legend-grid">
          <div class="legend-item">
            <span class="leg-badge indigo">① ② ③</span>
            <div><strong>เลขลำดับบนภาพ &amp; ขั้นตอน</strong><br />ตัวเลขในวงกลมบนภาพตรงกับเลขขั้นตอนด้านล่างแบบ 1 ต่อ 1</div>
          </div>
          <div class="legend-item">
            <span class="leg-badge pink">▢ / ◯ / ➔</span>
            <div><strong>กรอบสี่เหลี่ยม วงกลม และลูกศร</strong><br />เน้นขอบเขตปุ่ม แท็บ เมนู หรือจุดสำคัญบน UI ให้เห็นชัดทันที</div>
          </div>
          <div class="legend-item">
            <span class="leg-badge teal">✨ / 💡</span>
            <div><strong>ฟังก์ชันพิเศษ &amp; Pro Tips</strong><br />อธิบายฟีเจอร์เฉพาะสำนักงานและเทคนิคลัดลดขั้นตอนการทำงาน</div>
          </div>
          <div class="legend-item">
            <span class="leg-badge amber">⚖️ / 🔒</span>
            <div><strong>วิเคราะห์เทียบระบบเดิม &amp; RBAC</strong><br />สรุปจุดเด่นเทียบงานกระดาษ และแสดงไอคอน 🔒 สำหรับสิทธิ์จำกัด</div>
          </div>
        </div>
      `,
    })
  );

  // ================= PAGE 3 (ข): TABLE OF CONTENTS =================
  pages.push(
    renderContentPage({
      id: "toc",
      runningChapter: "สารบัญเนื้อหา (Table of Contents)",
      pageType: "front",
      bodyHtml: `
        <div class="front-title-block compact-front">
          <div class="front-kicker">TABLE OF CONTENTS</div>
          <h2 class="front-h2">สารบัญเนื้อหา (ครบทั้ง 7 บท)</h2>
        </div>

        <div class="toc-container toc-dense">
          ${TOC_ITEMS.map(
            (item) => `
            <a class="toc-row level-${item.level}" href="${esc(item.href)}">
              <span class="toc-label">${esc(item.title)}</span>
              <span class="toc-dots"></span>
              <span class="toc-pg" data-target="${esc(item.href)}">..</span>
            </a>`
          ).join("")}
        </div>
      `,
    })
  );

  // ================= PAGE 4 (ค): LIST OF FIGURES (31 ITEMS, 2 COLUMNS) =================
  pages.push(
    renderContentPage({
      id: "lof",
      runningChapter: "สารบัญภาพประกอบ (List of Figures)",
      pageType: "front",
      bodyHtml: `
        <div class="front-title-block compact-front">
          <div class="front-kicker">LIST OF FIGURES (ANNOTATED UI SCREENSHOTS)</div>
          <h2 class="front-h2">สารบัญภาพประกอบหน้าจอระบบจริง (ภาพที่ 1 – 31)</h2>
        </div>

        <p class="lof-lead">
          ภาพหน้าจอทั้งหมดบันทึกจากระบบจริงบน <code>https://www.smso.site</code> ที่ความละเอียด <code>1440 × 900 px</code> พร้อมมาร์กจุดชี้ตำแหน่งบน UI ทุกภาพ คลิกที่ชื่อภาพเพื่อข้ามไปยังหน้าที่แสดงภาพนั้นได้ทันที
        </p>

        <div class="lof-two-col">
          ${LOF_ITEMS.map(
            (fig) => `
            <a class="toc-row level-fig2" href="${esc(fig.href)}">
              <span class="toc-label"><strong>ภาพที่ ${fig.figNum}:</strong> ${esc(fig.title)}</span>
              <span class="toc-dots"></span>
              <span class="toc-pg" data-target="${esc(fig.href)}">..</span>
            </a>`
          ).join("")}
        </div>
      `,
    })
  );

  // =========================================================================
  // CHAPTER 1 (หน้า 1–4)
  // =========================================================================

  // Page 5 (หน้า 1): Ch 1 + 1.1 Login
  pages.push(
    renderContentPage({
      id: "ch1",
      runningChapter: "บทที่ 1: การเข้าสู่ระบบ โครงสร้างหน้าจอ & แจ้งเตือน",
      bodyHtml: `
        ${renderChapterBanner(
          1,
          "การเข้าสู่ระบบ โครงสร้างหน้าจอ และศูนย์การแจ้งเตือน",
          "ยืนยันตัวตน Database Auth, ระบบป้องกัน Cloudflare Turnstile, เมนู 5 กลุ่มหลัก, Dashboard และแจ้งเตือน",
          "indigo"
        )}
        ${renderSectionHead("1.1", "หน้าจอกรอก Username / Password และระบบป้องกันความปลอดภัย", "<code>https://www.smso.site</code> ➔ หน้าเข้าสู่ระบบ (Authentication)", true)}
        ${renderScreenshotFrame({
          figId: "fig-1",
          figNum: 1,
          imgFile: "00-login.png",
          urlPath: "/ (Login Page)",
          caption: "หน้าจอกรอก Username / Password พร้อมสถานะ Database Auth และเกราะป้องกัน Cloudflare Turnstile",
          size: "compact",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 855, y: 100, w: 465, h: 186, bx: 822, by: 160 },
            { n: 2, color: "teal", shape: "rect", x: 860, y: 314, w: 425, h: 36, bx: 822, by: 332 },
            { n: 3, color: "pink", shape: "rect", x: 860, y: 356, w: 425, h: 198, bx: 822, by: 455 },
            { n: 4, color: "amber", shape: "rect", x: 860, y: 564, w: 425, h: 80, bx: 822, by: 604 },
            { n: 5, color: "crimson", shape: "rect", x: 860, y: 650, w: 425, h: 52, bx: 822, by: 676 },
          ],
        })}
        ${renderSteps(
          [
            { title: "ตรวจสอบสถานะ Database Auth (Online) & SSL", html: `สังเกตป้าย <code>Database Auth (Online)</code> และ <code>SSL 256-Bit Encrypted</code> ด้านบนขวา ก่อนเริ่มกรอกข้อมูล` },
            { title: "เช็กสัญญาณพร้อมใช้งานฐานข้อมูล", html: `แถบ <code>Database Auth พร้อมใช้งาน • ออนไลน์</code> ยืนยันว่าระบบพร้อมตรวจสอบสิทธิ์กับเซิร์ฟเวอร์สำนักงาน` },
            { title: "กรอก Username / Password & สลับดูรหัสผ่าน (👁️)", html: `พิมพ์ชื่อบัญชีและรหัสผ่านประจำสำนักงาน กดไอคอนตา <code>👁️</code> เพื่อตรวจความถูกต้อง และติ๊ก <em>จดจำการเข้าสู่ระบบไว้</em> หากใช้เครื่องส่วนตัว` },
            { title: "เกราะป้องกัน Cloudflare Turnstile", html: `รอให้กรอบ <strong>Cloudflare Turnstile</strong> แสดง <code>Success!</code> อัตโนมัติ (ป้องกันบอทและสแปมเข้าสู่ระบบราชการ)` },
            { title: "กดปุ่มเข้าสู่ระบบ", html: `คลิกปุ่ม <strong>เข้าสู่ระบบ ➔</strong> เพื่อเปิดใช้งานระบบตามสิทธิ์ RBAC ของบัญชีตนเองทันที` },
          ],
          true
        )}
      `,
    })
  );

  // Page 6 (หน้า 2): 1.2 + 1.3 Dashboard
  pages.push(
    renderContentPage({
      id: "sec-1-2",
      runningChapter: "บทที่ 1: การเข้าสู่ระบบ โครงสร้างหน้าจอ & แจ้งเตือน",
      bodyHtml: `
        ${renderSectionHead("1.2–1.3", "โครงสร้างเมนู 5 กลุ่มหลัก และหน้าแรกภาพรวมสำนักงาน (Dashboard)", "แถบเมนูซ้าย <code>📊 ภาพรวม</code> ➔ <code>📊 หน้าแรก</code> (<code>/dashboard</code>)", true)}
        ${renderScreenshotFrame({
          figId: "fig-2",
          figNum: 2,
          imgFile: "01-dashboard.png",
          urlPath: "/dashboard",
          caption: "หน้าแรก Dashboard แสดงเมนูนำทาง 5 กลุ่ม แถบเครื่องมือด้านบน Quick Actions บัตร KPI และ 4 กลุ่มภารกิจ",
          size: "compact",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 8, y: 72, w: 212, h: 710, bx: 238, by: 155, px: 222, py: 155 },
            { n: 2, color: "teal", shape: "rect", x: 256, y: 8, w: 1148, h: 46, bx: 238, by: 31, px: 256, py: 31 },
            { n: 3, color: "pink", shape: "rect", x: 960, y: 152, w: 405, h: 58, bx: 924, by: 181 },
            { n: 4, color: "amber", shape: "rect", x: 268, y: 248, w: 1134, h: 332, bx: 250, by: 295 },
            { n: 5, color: "crimson", shape: "rect", x: 1038, y: 610, w: 364, h: 280, bx: 1020, by: 660 },
          ],
        })}
        ${renderSteps(
          [
            { title: "เมนูระบบราชการ 5 กลุ่ม (ซ้าย)", html: `รวมเมนูหลัก <code>ภาพรวม</code>, <code>งาน &amp; บริการ</code>, <code>คลังข้อมูล</code>, <code>เครื่องมือ &amp; Tools</code>, <code>การจัดการ</code> พร้อมปุ่มย่อเมนู <code>◀</code> และแสดงไอคอน 🔒 หน้าเมนูจำกัดสิทธิ์` },
            { title: "Top Bar เครื่องมือส่วนบน", html: `ช่องค้นหารวมทั้งระบบ, ปุ่ม <strong>🌙 โหมดกลางคืน</strong>, สถานะ <strong>🟢 Supabase Live</strong>, กระดิ่ง <strong>🔔 แจ้งเตือน</strong> และปุ่ม <strong>ออกจากระบบ</strong>` },
            { title: "ปุ่มทางลัดด่วน (Quick Actions)", html: `เข้าถึงงานด่วนจากหน้าแรกได้ทันที 3 ปุ่ม: <code>🚗 ขอใช้รถราชการ</code>, <code>📹 จองห้องประชุม</code>, และ <code>+ เพิ่มงานใหม่</code>` },
            { title: "ศูนย์บริการดิจิทัล 6 การ์ด & บัตร KPI สด 6 ใบ", html: `แสดงตัวเลข Realtime ทั้งจำนวนงานค้าง (<code>2 งาน</code>), หนังสือเวียน, นัดหมาย (<code>6 นัดหมาย</code>), รถว่าง (<code>10 / 10 คัน</code>), KPI และสมาชิก 41 ท่าน` },
            { title: "4 กลุ่มภารกิจ & กำหนดการวันนี้", html: `ดูภารกิจสำคัญของ 4 กลุ่มงาน พมจ. และตารางประชุมประจำวันพร้อมปุ่มเข้าสู่ปฏิทินได้ในคลิกเดียว` },
          ],
          true
        )}
      `,
    })
  );

  // Page 7 (หน้า 3): 1.4 Notifications
  pages.push(
    renderContentPage({
      id: "sec-1-4",
      runningChapter: "บทที่ 1: การเข้าสู่ระบบ โครงสร้างหน้าจอ & แจ้งเตือน",
      bodyHtml: `
        ${renderSectionHead("1.4", "ศูนย์การแจ้งเตือนแบบแยกหมวดหมู่ (Notifications Center)", "แถบ Header ด้านบนขวา ➔ คลิกไอคอนกระดิ่ง <code>🔔</code>")}
        ${renderScreenshotFrame({
          figId: "fig-3",
          figNum: 3,
          imgFile: "02-notifications.png",
          urlPath: "/ (Notifications Dropdown)",
          caption: "ศูนย์การแจ้งเตือน (Notifications) พร้อมปุ่มอ่านทั้งหมด แท็บ 5 หมวดหมู่ และปุ่มเปิดดูงานทันที",
          annos: [
            { n: 1, color: "crimson", shape: "circle", cx: 1204, cy: 34, r: 24, bx: 1160, by: 34 },
            { n: 2, color: "indigo", shape: "rect", x: 778, y: 66, w: 444, h: 100, bx: 744, by: 105 },
            { n: 3, color: "teal", shape: "rect", x: 778, y: 174, w: 444, h: 72, bx: 744, by: 205 },
            { n: 4, color: "amber", shape: "rect", x: 778, y: 250, w: 444, h: 350, bx: 744, by: 360 },
          ],
        })}
        ${renderSteps([
          { color: "crimson", title: "คลิกกระดิ่งแจ้งเตือน (🔔)", html: `ตัวเลขสีแดงบนกระดิ่งแสดงจำนวนรายการใหม่ที่ยังไม่อ่าน คลิกเพื่อเปิดหน้าต่างแจ้งเตือนแบบเรียลไทม์` },
          { color: "indigo", title: "จัดการสถานะอ่านทั้งหมด & แจ้งเตือนเบราว์เซอร์", html: `คลิก <strong>✓ อ่านทั้งหมด</strong> เพื่อล้างยอดค้างอ่าน หรือกด <strong>เปิดใช้งาน</strong> เพื่อรับแจ้งเตือนบนหน้าจอคอมพิวเตอร์` },
          { color: "teal", title: "กรองตามหมวดหมู่งาน 5 แท็บ", html: `แยกดูเฉพาะหมวด <code>ทั้งหมด</code>, <code>💬 แชท</code>, <code>📜 หนังสือเวียน</code>, <code>📅 ประชุม</code>, และ <code>📬 คำขอ/งาน</code> ได้อย่างเป็นระเบียบ` },
          { color: "amber", title: "กดเปิดดูรายการทันที (เปิดดู ➜)", html: `คลิกที่การ์ดรายการหรือปุ่ม <strong>เปิดดู ➜</strong> เพื่อกระโดดไปยังหน้าจองรถ นัดประชุม หรือภารกิจงานนั้นทันที` },
        ])}
      `,
    })
  );

  // Page 8 (หน้า 4): 1.5 Analysis + Special Features + Pro Tips
  pages.push(
    renderAnalysisPage({
      id: "sec-1-5",
      runningChapter: "บทที่ 1: การเข้าสู่ระบบ โครงสร้างหน้าจอ & แจ้งเตือน",
      code: "1.5",
      chLabel: "บทที่ 1 — ระบบยืนยันตัวตน, Dashboard & แจ้งเตือน",
      comparisons: [
        {
          aspect: "การเข้าถึงระบบงาน",
          legacy: "ต้องเปิดหลายโปรแกรม/หลายลิงก์ แยกแฟ้มหรือจำรหัสหลายชุด ไม่มีจุดรวมศูนย์",
          smart: "Single Portal ที่ <code>smso.site</code> ล็อกอินครั้งเดียวผ่านบัญชีสำนักงาน เข้าได้ครบ 17 โมดูล",
          benefit: "ลดเวลาเริ่มต้นทำงานประจำวัน และลดการลืมรหัสผ่านข้ามระบบ",
        },
        {
          aspect: "ติดตามงาน & นัดหมาย",
          legacy: "ต้องคอยถามปากเปล่า เช็กบอร์ดติดประกาศ หรือไล่อ่านในกลุ่มแชทยาว ๆ",
          smart: "หน้าแรก <code>Dashboard KPI</code> รวมยอดงานค้าง นัดวันนี้ รถว่าง 10/10 คัน และกระดิ่ง <code>🔔 แจ้งเตือน</code>",
          benefit: "ผู้บริหารและเจ้าหน้าที่เห็นภาพรวมสำนักงานแบบ Realtime ภายใน 3 วินาที",
        },
        {
          aspect: "ความปลอดภัยเข้าสู่ระบบ",
          legacy: "แชร์ไฟล์ในวงแลนหรือส่งลิงก์เปิดไม่มีระบบป้องกันบอทและบันทึกสิทธิ์ระดับบทบาท",
          smart: "ตรวจสอบ <code>Database Auth</code> + เกาะป้องกัน <strong>Cloudflare Turnstile</strong> + สิทธิ์ RBAC",
          benefit: "ป้องกันผู้ไม่หวังดีจากภายนอกและจำกัดการเห็นข้อมูลตามระดับหน้าที่",
        },
      ],
      specialFeatures: [
        {
          icon: "🛡️",
          title: "Database Auth + Fallback LAN อัตโนมัติ",
          desc: "ตรวจสอบสิทธิ์กับฐานข้อมูลสำนักงานร่วมกับ <strong>Cloudflare Turnstile</strong> และมีกลไกสลับเชื่อมเครือข่ายภายในอัตโนมัติหาก Tunnel ขัดข้อง",
        },
        {
          icon: "🔔",
          title: "ศูนย์แจ้งเตือน 5 หมวดเชื่อมทุกโมดูล",
          desc: "รวมแจ้งเตือนจากแชท หนังสือเวียน ประชุม งาน Kanban และสถานะจองรถ/คืนรถ ไว้ในกระดิ่งเดียวพร้อมลิงก์ <em>เปิดดู ➜</em>",
        },
        {
          icon: "⚡",
          title: "Quick Actions & Live KPI Cards",
          desc: "ปุ่มทางลัด 3 งานด่วนบน Hero Banner พร้อมป้าย <code>Supabase Live</code> และ <code>🌙 โหมดกลางคืน</code> ที่จดจำค่าผู้ใช้",
        },
      ],
      proTips: [
        "<strong>ใช้ปุ่มย่อเมนู ◀ (Collapse Sidebar)</strong> เมื่อใช้งานบนโน้ตบุ๊กจอเล็ก เพื่อขยายพื้นที่ตาราง Data Hub หรือกระดาน Kanban ให้กว้างเต็มตา",
        "<strong>กดเปิดรับ Browser Notifications</strong> ในหน้า <code>👤 ข้อมูลส่วนตัว</code> จะช่วยแจ้งเตือนเวลามีหนังสือเวียนด่วนหรือรถราชการอนุมัติแม้ย่อหน้าต่างอยู่",
        "<strong>ดูสัญลักษณ์ 🟢 Supabase Live</strong> มุมขวาบนก่อนกรอกข้อมูลสำคัญ เพื่อยืนยันว่าการเชื่อมต่อฐานข้อมูล Realtime ทำงานสมบูรณ์",
      ],
    })
  );

  // =========================================================================
  // CHAPTER 2 (หน้า 5–17)
  // =========================================================================

  // Page 9 (หน้า 5): Ch 2 Banner + 2.1 Circular Main
  pages.push(
    renderContentPage({
      id: "ch2",
      runningChapter: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสาร",
      bodyHtml: `
        ${renderChapterBanner(
          2,
          "งานและบริการ — การประสานงาน & สื่อสาร",
          "ระบบหนังสือเวียน กระดานภารกิจงาน Kanban การประชุมและห้องประชุม แชททีม รถราชการ และระบบใบลา 2 แบบฟอร์ม",
          "indigo"
        )}
        ${renderSectionHead("2.1", "ระบบหนังสือเวียนอิเล็กทรอนิกส์ (หน้าหลักและทะเบียนรับ-ส่ง)", "<code>💼 งาน &amp; บริการ</code> ➔ <code>📜 หนังสือเวียน</code> (<code>/circular</code>)", true)}
        ${renderScreenshotFrame({
          figId: "fig-4",
          figNum: 4,
          imgFile: "03-circular.png",
          urlPath: "/circular",
          caption: "ระบบเวียนหนังสือราชการอิเล็กทรอนิกส์ แสดงบัตร KPI 4 ใบ แท็บรับ-ส่ง และตัวกรองความเร่งด่วน",
          size: "compact",
          annos: [
            { n: 1, color: "pink", shape: "rect", x: 976, y: 108, w: 340, h: 108, bx: 940, by: 140 },
            { n: 2, color: "indigo", shape: "rect", x: 268, y: 252, w: 1134, h: 96, bx: 286, by: 252 },
            { n: 3, color: "teal", shape: "rect", x: 278, y: 378, w: 640, h: 52, bx: 610, by: 368 },
            { n: 4, color: "amber", shape: "rect", x: 278, y: 434, w: 1114, h: 78, bx: 286, by: 522, px: 350, py: 500 },
          ],
        })}
        ${renderSteps(
          [
            { color: "pink", title: "ปุ่มดำเนินการด้านบน", html: `กด <strong>🔄 รีเฟรช</strong> โหลดรายการล่าสุด, <strong>📷 สแกนหนังสือเข้าสู่ระบบ</strong> ผ่านกล้อง/เว็บแคม, หรือ <strong>📤 ส่งหนังสือเวียน</strong> เพื่อออกหนังสือใหม่` },
            { color: "indigo", title: "ตรวจสอบสถิติ KPI ทั้ง 4 กล่อง", html: `ดูยอด <code>หนังสือเวียนทั้งหมด</code>, <code>รอฉันลงนามรับทราบ</code>, <code>ฉันรับทราบแล้ว</code>, และ <code>อัตราการรับทราบเฉลี่ย</code> แบบ Realtime` },
            { color: "teal", title: "สลับ 3 แท็บงานสารบรรณ", html: `เลือกดู <strong>📥 หนังสือเวียนรับเข้า (ถึงฉัน)</strong>, <strong>📤 ทะเบียนส่งเวียนทั้งหมด</strong>, และ <strong>📊 รายงานผลการเวียนและสถิติ</strong>` },
            { color: "amber", title: "กรอง ค้นหา และตรวจสอบสถานะ", html: `กรองตามสถานะ <code>ทั้งหมด / ยังไม่เสร็จสิ้น / รับทราบครบแล้ว</code>, ค้นหาจากเลขที่-ชื่อเรื่อง, หรือเลือกชั้นความเร่งด่วน/กลุ่มงาน` },
          ],
          true
        )}
      `,
    })
  );

  // Page 10 (หน้า 6): 2.1 (ต่อ) Circular Send Modal
  pages.push(
    renderContentPage({
      id: "sec-2-1b",
      runningChapter: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสาร",
      bodyHtml: `
        ${renderSectionHead("2.1", "ระบบหนังสือเวียน (ต่อ) — ขั้นตอนการส่งหนังสือเวียนใหม่และช่องทางแนบไฟล์", "<code>📜 หนังสือเวียน</code> ➔ ปุ่ม <code>📤 ส่งหนังสือเวียน</code>")}
        ${renderScreenshotFrame({
          figId: "fig-5",
          figNum: 5,
          imgFile: "03b-circular-send-modal.png",
          urlPath: "/circular (Dispatch Circular)",
          caption: "แบบฟอร์มส่งหนังสือเวียนราชการ รองรับเลขไทยอัตโนมัติ กำหนดกลุ่มเป้าหมาย 40 ท่าน และแนบไฟล์ 3 ช่องทาง",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 418, y: 104, w: 830, h: 82, bx: 392, by: 145 },
            { n: 2, color: "pink", shape: "rect", x: 428, y: 272, w: 810, h: 168, bx: 392, by: 345 },
            { n: 3, color: "teal", shape: "rect", x: 428, y: 444, w: 810, h: 300, bx: 392, by: 560 },
            { n: 4, color: "amber", shape: "rect", x: 418, y: 768, w: 830, h: 126, bx: 392, by: 820 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "ส่วนหัวการออกหนังสือเวียน", html: `ตรวจสอบคำสั่ง <code>ส่งหนังสือเวียนราชการ</code> และใช้ปุ่ม <code>← ย้อนกลับ</code> หรือ <code>ยกเลิก</code> หากต้องการยกเลิกร่าง` },
          { color: "pink", title: "กรอกเลขที่หนังสือ ลงวันที่ & ✨ เลขไทยอัตโนมัติ", html: `ระบุเลขที่หนังสือ (เช่น <code>พม ๐๐๐๕/ว ๑๒๓๔</code>) เลือกวันที่จากปฏิทิน ระบบแปลงเป็น <strong>เลขไทยอัตโนมัติ</strong> (<code>๒๐ พฤศจิกายน ๒๕๖๙</code>) ทันที` },
          { color: "teal", title: "กำหนดชั้นความเร็ว ชั้นความลับ & สรุปสาระสำคัญ", html: `เลือกชั้นความเร็ว (<code>ปกติ / ⚡ ด่วน / ⚡⚡ ด่วนมาก / 🚨 ด่วนที่สุด</code>), ชั้นความลับ, อ้างถึง, สิ่งที่ส่งมาด้วย และสรุปประเด็นหลัก` },
          { color: "amber", title: "กำหนดกลุ่มเป้าหมาย & แนบไฟล์ 3 ช่องทาง", html: `เลือกเวียนทั้งสำนักงาน (<code>40 คน</code>) หรือเลือกเฉพาะกลุ่มงาน จากนั้นแนบไฟล์ได้ <strong>3 ช่องทาง</strong> (สแกนสด, อัปโหลดจากเครื่อง, หรือดึงจากคลัง Synology NAS) แล้วกดส่ง` },
        ])}
      `,
    })
  );

  // Page 11 (หน้า 7): 2.2 Tasks Kanban
  pages.push(
    renderContentPage({
      id: "sec-2-2",
      runningChapter: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสาร",
      bodyHtml: `
        ${renderSectionHead("2.2", "กระดานติดตามภารกิจงาน (Kanban Board)", "<code>💼 งาน &amp; บริการ</code> ➔ <code>📋 ภารกิจงาน</code> (<code>/tasks</code>)", true)}
        ${renderScreenshotFrame({
          figId: "fig-6",
          figNum: 6,
          imgFile: "04-tasks.png",
          urlPath: "/tasks",
          caption: "กระดานติดตามภารกิจงาน 4 สถานะ ปุ่มสลับมุมมองตาราง ตัวกรอง RBAC Scope และแถบความคืบหน้าเช็คลิสต์",
          size: "compact",
          annos: [
            { n: 1, color: "pink", shape: "rect", x: 976, y: 118, w: 405, h: 58, bx: 942, by: 147 },
            { n: 2, color: "indigo", shape: "rect", x: 268, y: 212, w: 1134, h: 94, bx: 286, by: 212 },
            { n: 3, color: "teal", shape: "rect", x: 268, y: 318, w: 1134, h: 145, bx: 286, by: 365 },
            { n: 4, color: "amber", shape: "rect", x: 268, y: 485, w: 1134, h: 402, bx: 286, by: 620 },
          ],
        })}
        ${renderWorkflow([
          { step: "ขั้นที่ 1", label: "รอดำเนินการ", sub: "Todo" },
          { step: "ขั้นที่ 2", label: "กำลังดำเนินการ", sub: "In Progress", highlight: true },
          { step: "ขั้นที่ 3", label: "รอตรวจทาน", sub: "Review" },
          { step: "ขั้นที่ 4", label: "เสร็จสิ้นแล้ว", sub: "Done" },
        ])}
        ${renderSteps(
          [
            { color: "pink", title: "สลับมุมมอง Kanban / ตาราง & เพิ่มงานใหม่", html: `สลับระหว่าง <strong>📊 กระดาน Kanban</strong> กับ <strong>📋 ตารางรายการ</strong> และกด <strong>➕ เพิ่มงานใหม่</strong> เพื่อสร้างภารกิจ` },
            { color: "indigo", title: "บัตรสรุปสถานะงาน 5 กล่อง", html: `แสดงจำนวนงานรวม, รอดำเนินการ, กำลังดำเนินการ, รอตรวจทาน, และเปอร์เซ็นต์งานเสร็จสิ้นแล้ว` },
            { color: "teal", title: "ตัวกรองขอบเขตสิทธิ์ (RBAC Granular Scope)", html: `คัดกรองตามสิทธิ์ <code>ทั้งหมดที่เห็นได้</code>, <code>งานของฉัน</code>, <code>กลุ่มงานของฉัน</code>, <code>งานส่วนกลางทั้ง สนง.</code> ร่วมกับภารกิจ/ความเร่งด่วน` },
            { color: "amber", title: "การ์ดภารกิจ & แถบเช็คลิสต์ย่อย + ส่งต่อ LINE", html: `แสดงความคืบหน้า Subtasks (<code>2/5 (40%)</code>), วันคงเหลือ, ปุ่ม <strong>📲 LINE</strong> แจ้งเตือน และปุ่มเลื่อนสถานะ <strong>⬅️ ย้อน / ถัดไป ➡️</strong>` },
          ],
          true
        )}
      `,
    })
  );

  // Page 12 (หน้า 8): 2.2 (ต่อ) Tasks New Modal
  pages.push(
    renderContentPage({
      id: "sec-2-2b",
      runningChapter: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสาร",
      bodyHtml: `
        ${renderSectionHead("2.2", "กระดานภารกิจงาน (ต่อ) — การเพิ่มภารกิจใหม่และกำหนดสิทธิ์ Visibility Scope", "<code>📋 ภารกิจงาน</code> ➔ ปุ่ม <code>➕ เพิ่มงานใหม่</code>")}
        ${renderScreenshotFrame({
          figId: "fig-7",
          figNum: 7,
          imgFile: "04b-tasks-new-modal.png",
          urlPath: "/tasks (New Task Modal)",
          caption: "หน้าต่างเพิ่มภารกิจใหม่ พร้อมระบบกำหนดสิทธิ์การมองเห็น (Visibility Scope) 3 ระดับและกลุ่มภารกิจ 8 ด้าน",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 444, y: 134, w: 526, h: 178, bx: 416, by: 195 },
            { n: 2, color: "pink", shape: "rect", x: 444, y: 326, w: 526, h: 126, bx: 416, by: 385 },
            { n: 3, color: "teal", shape: "rect", x: 444, y: 466, w: 526, h: 120, bx: 416, by: 525 },
            { n: 4, color: "amber", shape: "rect", x: 444, y: 594, w: 526, h: 224, bx: 416, by: 675 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "ระบุชื่องานและรายละเอียดสาระสำคัญ", html: `กรอกหัวข้อภารกิจ (<code>ชื่องาน / ภารกิจราชการ *</code>) และวัตถุประสงค์หรือแนวทางการดำเนินงานให้ชัดเจน` },
          { color: "pink", title: "เลือกสิทธิ์การมองเห็น (Visibility Scope) 3 ระดับ", html: `เลือกว่าให้เห็นเฉพาะ <strong>👥 กลุ่มงาน</strong> (Manager &amp; คนในฝ่าย), <strong>🔒 เฉพาะบุคคล</strong> (ฉันและผู้รับผิดชอบ), หรือ <strong>🏢 ทั้งสำนักงาน</strong>` },
          { color: "teal", title: "จัดหมวดหมู่ตามกลุ่มภารกิจ พมจ. (Mission Group)", html: `เชื่อมภารกิจเข้ากับหมวดหมู่หลัก เช่น <em>งานช่วยเหลือกลุ่มเปราะบาง (TPMAP / ศรส.)</em>, <em>เงินอุดหนุนเด็กแรกเกิด</em>, หรือ <em>ศูนย์บริการคนพิการ</em>` },
          { color: "amber", title: "มอบหมายผู้รับผิดชอบ กำหนดความเร่งด่วน & เช็คลิสต์", html: `ระบุกลุ่มงาน ผู้รับผิดชอบหลัก ระดับความเร่งด่วน กำหนดส่งงาน (Due Date) ป้ายกำกับ และเพิ่มรายการงานย่อย (Subtasks) ด้านล่าง` },
        ])}
      `,
    })
  );

  // Page 13 (หน้า 9): 2.3 Meetings Main
  pages.push(
    renderContentPage({
      id: "sec-2-3",
      runningChapter: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสาร",
      bodyHtml: `
        ${renderSectionHead("2.3", "ระบบการประชุมและนัดหมาย (ปฏิทิน & Google Calendar Sync)", "<code>💼 งาน &amp; บริการ</code> ➔ <code>📹 การประชุม</code> (<code>/meetings</code>)")}
        ${renderScreenshotFrame({
          figId: "fig-8",
          figNum: 8,
          imgFile: "05-meetings.png",
          urlPath: "/meetings",
          caption: "ระบบการประชุมและนัดหมาย พร้อมตัวกรองรูปแบบการประชุม ปุ่มเข้าห้อง Meet และส่งออกปฏิทิน .ics / Google Calendar",
          annos: [
            { n: 1, color: "pink", shape: "rect", x: 976, y: 108, w: 392, h: 64, bx: 942, by: 140 },
            { n: 2, color: "indigo", shape: "rect", x: 278, y: 222, w: 470, h: 56, bx: 286, by: 222 },
            { n: 3, color: "teal", shape: "rect", x: 268, y: 304, w: 1134, h: 184, bx: 286, by: 365 },
            { n: 4, color: "amber", shape: "rect", x: 268, y: 506, w: 916, h: 378, bx: 286, by: 675 },
          ],
        })}
        ${renderSteps([
          { color: "pink", title: "ส่งออกปฏิทิน (.ics) หรือสร้างการประชุมใหม่", html: `กด <strong>📥 ส่งออกปฏิทิน (.ics)</strong> เพื่อนำเข้าปฏิทินส่วนตัว (Outlook / Apple) หรือกด <strong>➕ จองห้อง / สร้างการประชุมใหม่</strong>` },
          { color: "indigo", title: "เลือกมุมมอง 3 แท็บหลัก", html: `สลับดู <code>📅 ปฏิทินการประชุม</code>, <code>🏛️ จองห้องประชุม (5 ห้อง)</code>, และ <code>📋 รายการนัดหมาย (6)</code>` },
          { color: "teal", title: "กรองตามเวลา หมวดหมู่ รูปแบบ & ห้องประชุม", html: `คัดกรองได้ละเอียดทั้ง <em>กำลังจะถึง / ที่ผ่านมาแล้ว</em>, ประเภทประชุม, รูปแบบ <code>🌐 ออนไลน์ / 🏢 ออนไซต์ / 🔄 ไฮบริด</code>, และห้องประชุมทั้ง 5 ห้อง` },
          { color: "amber", title: "จัดการการ์ดนัดหมาย & เพิ่มลง Google Calendar", html: `คลิก <strong>🏢 ดูสถานที่นัด</strong> หรือ <strong>📹 เข้าห้อง Meet</strong> (สำหรับประชุมออนไลน์/Hybrid), ดูรายละเอียด/แก้ไข (✏️), และ <strong>🔵 เพิ่มลง Google Calendar</strong>` },
        ])}
      `,
    })
  );

  // Page 14 (หน้า 10): 2.3 (ต่อ) Meeting Rooms
  pages.push(
    renderContentPage({
      id: "sec-2-3b",
      runningChapter: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสาร",
      bodyHtml: `
        ${renderSectionHead("2.3", "ระบบการประชุม (ต่อ) — การตรวจสอบความพร้อมและจองห้องประชุม 5 ห้อง", "<code>📹 การประชุม</code> ➔ แท็บ <code>🏛️ จองห้องประชุม 5 ห้อง</code>")}
        ${renderScreenshotFrame({
          figId: "fig-9",
          figNum: 9,
          imgFile: "05b-meetings-rooms.png",
          urlPath: "/meetings (Room Booking)",
          caption: "ผังตรวจสอบห้องประชุมทั้ง 5 ห้อง แสดงสถานะว่าง/ปิดปรับปรุง ความจุที่นั่ง และรายการอุปกรณ์โสตทัศนูปกรณ์ครบถ้วน",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 424, y: 220, w: 958, h: 60, bx: 392, by: 250 },
            { n: 2, color: "teal", shape: "rect", x: 984, y: 312, w: 398, h: 58, bx: 948, by: 341 },
            { n: 3, color: "amber", shape: "rect", x: 984, y: 378, w: 398, h: 46, bx: 948, by: 401 },
            { n: 4, color: "pink", shape: "rect", x: 268, y: 456, w: 1134, h: 415, bx: 286, by: 660 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "แท็บจองห้องประชุมและตัวเลขห้องว่างทันที", html: `แถบด้านบนแสดงสถานะรวม <code>🏛️ ห้องว่างพร้อมใช้ 4/5</code> ณ วันปัจจุบัน` },
          { color: "teal", title: "เลือกวันที่ต้องการใช้ห้องประชุม", html: `กดปุ่ม <code>◀ วันก่อน</code>, <code>วันนี้</code>, <code>วันถัดไป ▶</code> หรือเลือกวันที่ล่วงหน้าจากปฏิทินเพื่อเช็กผังการใช้ห้อง` },
          { color: "amber", title: "กรองตามสถานะห้องประชุม 5 ห้อง", html: `สลับกรอง <code>ทั้งหมด (5)</code>, <code>🟢 ว่างทั้งวัน</code>, <code>🟡 มีการจอง</code>, หรือ <code>🔴 ปิดปรับปรุง</code>` },
          { color: "pink", title: "ตรวจสอบอุปกรณ์ในห้องแล้วกดจองทันที", html: `ดูจำนวนที่นั่ง (เช่น <em>ห้องเพชรประชาบดี 40 ที่นั่ง / ซุ้มกอ 120 ที่นั่ง / กลีบจำปา 40 ที่นั่ง</em>) อุปกรณ์ (จอ 4K, กล้อง Hybrid PTZ) แล้วกดปุ่ม <strong>➕ จองห้องประชุมนี้</strong>` },
        ])}
      `,
    })
  );

  // Page 15 (หน้า 11): 2.4 Chat
  pages.push(
    renderContentPage({
      id: "sec-2-4",
      runningChapter: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสาร",
      bodyHtml: `
        ${renderSectionHead("2.4", "ระบบแชทกลุ่มราชการ และการแนบไฟล์ตรงสู่ Synology NAS", "<code>💼 งาน &amp; บริการ</code> ➔ <code>💬 แชททีม</code> (<code>/chat</code>)")}
        ${renderScreenshotFrame({
          figId: "fig-10",
          figNum: 10,
          imgFile: "06-chat.png",
          urlPath: "/chat",
          caption: "ระบบแชทกลุ่มราชการ พมจ.กำแพงเพชร พร้อมข้อความปักหมุด แท็กด่วน แบบฟอร์มราชการ และ NAS /chat_attachments",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 264, y: 102, w: 294, h: 405, bx: 280, by: 230 },
            { n: 2, color: "teal", shape: "rect", x: 572, y: 102, w: 828, h: 116, bx: 590, by: 145 },
            { n: 3, color: "amber", shape: "rect", x: 572, y: 224, w: 828, h: 220, bx: 590, by: 345 },
            { n: 4, color: "pink", shape: "rect", x: 572, y: 704, w: 828, h: 176, bx: 590, by: 785 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "เลือกรายการห้องแชทประจำกลุ่มงาน & โครงการเฉพาะกิจ", html: `เลือกห้องประจำสังกัด (เช่น <em>กลุ่มนโยบายและวิชาการ</em>) หรือห้องกลาง <code>ประกาศและประสานงานกลาง พมจ.</code> ค้นหาห้อง หรือคลิก <strong>➕ สร้างกลุ่ม</strong>` },
          { color: "teal", title: "ค้นหาในห้อง ดูประกาศปักหมุด สมาชิก & เปิดประชุมกลุ่ม", html: `แถบเครื่องมือบนห้องแสดงจำนวนสมาชิกออนไลน์ (<code>👥 สมาชิก 41 · 1 ออนไลน์</code>), รายการ <strong>📌 ปักหมุด</strong>, และปุ่ม <strong>📹 ประชุมกลุ่ม</strong>` },
          { color: "amber", title: "ข้อความปักหมุดโดยผู้บริหาร & ปลดหมุด/ปักหมุด", html: `ข้อความสั่งการสำคัญจะแสดงแถบปักหมุดด้านบน (กด <code>ดูทั้งหมด</code>) เพื่อไม่ให้ข้อสั่งการจมหายไปกับบทสนทนาประจำวัน` },
          { color: "pink", title: "ติดแท็กด่วน แนบไฟล์ขึ้น Synology NAS & แทรกแบบฟอร์มราชการ", html: `เลือกแท็ก <code>ด่วนที่สุด / หนังสือเวียน / รายงานการประชุม</code> แนบไฟล์/ภาพเข้าโฟลเดอร์ <code>💾 Synology NAS: /chat_attachments</code> และส่งเอกสารจาก <strong>📑 แบบฟอร์มราชการ ▾</strong>` },
        ])}
      `,
    })
  );

  // Page 16 (หน้า 12): 2.5 Car Booking Overview
  pages.push(
    renderContentPage({
      id: "sec-2-5",
      runningChapter: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสาร",
      bodyHtml: `
        ${renderSectionHead("2.5", "ระบบจองรถยนต์ราชการ พมจ.กำแพงเพชร (ติดตาม 4 ขั้นตอนอนุมัติ)", "<code>💼 งาน &amp; บริการ</code> ➔ <code>🚗 รถราชการ</code> (<code>/carbooking</code>)", true)}
        ${renderScreenshotFrame({
          figId: "fig-11",
          figNum: 11,
          imgFile: "07-carbooking.png",
          urlPath: "/carbooking",
          caption: "ระบบบริหารยานพาหนะราชการ แสดงสถานะ 4 ขั้นตอนอนุมัติ 5 มุมมอง ปฏิทิน Gantt และข้อมูลการจัดสรรรถ-คนขับ",
          size: "compact",
          annos: [
            { n: 1, color: "pink", shape: "rect", x: 998, y: 152, w: 375, h: 58, bx: 960, by: 181 },
            { n: 2, color: "indigo", shape: "rect", x: 268, y: 260, w: 1134, h: 106, bx: 286, by: 260 },
            { n: 3, color: "teal", shape: "rect", x: 268, y: 386, w: 1134, h: 62, bx: 286, by: 416 },
            { n: 4, color: "amber", shape: "rect", x: 268, y: 466, w: 1134, h: 420, bx: 286, by: 620 },
          ],
        })}
        ${renderWorkflow(
          [
            { step: "ขั้น 1", label: "รอ หน.กลุ่ม", sub: "เห็นชอบชั้นต้น" },
            { step: "ขั้น 2", label: "รอจัดสรรรถ", sub: "ฝ่ายบริหารจัดสรร" },
            { step: "ขั้น 3", label: "รอ หน.ฝ่ายบริหาร", sub: "เสนอความเห็น" },
            { step: "ขั้น 4", label: "รอ พมจ. อนุมัติ", sub: "พิจารณาอนุญาต" },
            { step: "อนุมัติ", label: "อนุมัติแล้ว", sub: "พร้อมเดินทาง", highlight: true },
            { step: "สิ้นสุด", label: "ส่งคืนแล้ว", sub: "บันทึกไมล์/น้ำมัน" },
          ],
          "teal"
        )}
        ${renderSteps(
          [
            { color: "pink", title: "ยื่นคำขอใหม่ & ศูนย์แจ้งเตือน 18 รายการ", html: `กด <strong>➕ ยื่นคำขอจองรถยนต์ใหม่</strong> หรือเช็กความคืบหน้าคำขอ/การคืนรถผ่าน <strong>🔔 ศูนย์การแจ้งเตือน</strong>` },
            { color: "indigo", title: "การ์ดติดตามขั้นตอนพิจารณา 6 ระยะ", html: `ดูจำนวนคำขอที่ค้างแต่ละขั้นตั้งแต่ <code>1. รอ หน.กลุ่ม</code> ➔ <code>ฝ่ายบริหารจัดสรร</code> ➔ <code>หน.ฝ่ายบริหาร</code> ➔ <code>พมจ. อนุมัติ</code> ➔ <code>ส่งคืนแล้ว</code>` },
            { color: "teal", title: "5 แท็บมุมมองบริหารยานพาหนะ", html: `สลับดูทะเบียนคำขอ, <strong>📅 ปฏิทินการใช้รถ</strong>, <strong>📊 Gantt View ไทม์ไลน์</strong> (เลี่ยงรถซ้อน), ข้อมูลรถ (สิทธิ์ Admin), และ <strong>➕ ยื่นคำขอใหม่</strong>` },
            { color: "amber", title: "การ์ดคำขอ & ประวัติแจ้งเตือนอัตโนมัติ", html: `แสดงเลขที่คำขอ (เช่น <code>คข-69/010</code>), ทะเบียนรถและพนักงานขับรถที่จัดสรรให้, ปลายทาง, จำนวนคนนั่ง และปุ่ม <strong>🔔 Notifications</strong> ดูข้อความแจ้งเตือนย้อนหลัง` },
          ],
          true
        )}
      `,
    })
  );

  // Page 17 (หน้า 13): 2.5 (ต่อ) Car Booking New Request Form
  pages.push(
    renderContentPage({
      id: "sec-2-5b",
      runningChapter: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสาร",
      bodyHtml: `
        ${renderSectionHead("2.5", "ระบบจองรถยนต์ (ต่อ) — แบบ พมจ.กพ 02: ยื่นคำขอใหม่ & ปลายทางด่วน 11 อำเภอ", "<code>🚗 รถราชการ</code> ➔ แท็บ <code>➕ ยื่นคำขอใหม่ (พร้อมค่าน้ำมัน)</code>")}
        ${renderScreenshotFrame({
          figId: "fig-12",
          figNum: 12,
          imgFile: "07b-carbooking-new.png",
          urlPath: "/carbooking (แบบ พมจ.กพ 02)",
          caption: "แบบขออนุญาตใช้รถยนต์ส่วนกลาง (แบบ พมจ.กพ 02) พร้อมดึงข้อมูลผู้ขออัตโนมัติและสายอนุมัติ 2 ขั้นแรก",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 1176, y: 388, w: 212, h: 62, bx: 1142, by: 419 },
            { n: 2, color: "teal", shape: "rect", x: 268, y: 476, w: 1134, h: 200, bx: 252, by: 520 },
            { n: 3, color: "pink", shape: "rect", x: 282, y: 692, w: 1106, h: 134, bx: 252, by: 755 },
            { n: 4, color: "amber", shape: "rect", x: 282, y: 834, w: 1106, h: 56, bx: 252, by: 862 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "แท็บ + ยื่นคำขอใหม่ (แบบ พมจ.กพ 02)", html: `คลิกแท็บ <strong>➕ ยื่นคำขอใหม่ (พร้อมค่าน้ำมัน)</strong> เพื่อเปิดแบบขออนุญาตใช้รถยนต์ส่วนกลาง (<strong>แบบ พมจ.กพ 02</strong>)` },
          { color: "teal", title: "ตรวจสอบข้อมูลผู้ยื่นคำขออัตโนมัติ (แบบ พมจ.กพ 02)", html: `ระบบดึงชื่อ ตำแหน่ง กลุ่ม/ฝ่าย และข้อมูลติดต่อของผู้ขอจากฐานข้อมูลให้อัตโนมัติ ลดการกรอกซ้ำ` },
          { color: "pink", title: "ขั้นตอนที่ 1: เลือกผู้เห็นชอบชั้นต้นในกลุ่ม/ฝ่าย", html: `ค่าเริ่มต้นจะระบุ <strong>หัวหน้ากลุ่ม/ฝ่ายที่สังกัด</strong> ให้อัตโนมัติ หรือเลือกสลับเป็นข้าราชการในกลุ่มพิจารณาแทนกรณีหัวหน้ากลุ่มติดราชการ` },
          { color: "amber", title: "ขั้นตอนที่ 2 จัดสรรรถ/คนขับ (10 คัน) & ปลายทางด่วน 11 อำเภอ", html: `ผู้ขอ <em>ไม่ต้องเลือกรถเอง</em> ฝ่ายบริหารทั่วไปจะจัดสรรรถราชการ 10 คันและคนขับในขั้นที่ 2 จากนั้นเลื่อนลงด้านล่างเพื่อกดปุ่ม <strong>🎯 ปลายทางด่วน</strong> ทั้ง 11 อำเภอ คำนวณระยะทางไป-กลับ (35–175 กม.) และค่าน้ำมันอัตโนมัติ` },
        ])}
      `,
    })
  );

  // Page 18 (หน้า 14): 2.6 Leave Form 1
  pages.push(
    renderContentPage({
      id: "sec-2-6a",
      runningChapter: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสาร",
      bodyHtml: `
        ${renderSectionHead("2.6", "ระบบใบลาอิเล็กทรอนิกส์ — ก. แบบฟอร์ม 1 (ลาป่วย / ลากิจส่วนตัว / ลาคลอดบุตร)", "<code>💼 งาน &amp; บริการ</code> ➔ <code>📝 ระบบใบลา</code> (<code>/leave</code>)")}
        ${renderScreenshotFrame({
          figId: "fig-13",
          figNum: 13,
          imgFile: "08-leave-form-general.png",
          urlPath: "/leave (Form 1)",
          caption: "แบบฟอร์ม 1 ใบลาป่วย/ลากิจส่วนตัว/ลาคลอดบุตร พร้อมป้ายเชื่อมเครื่องสแกนนิ้ว และโควตา 23 วันทำการ",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 644, y: 108, w: 636, h: 98, bx: 612, by: 155 },
            { n: 2, color: "teal", shape: "rect", x: 268, y: 224, w: 278, h: 52, bx: 582, by: 250, px: 548, py: 250 },
            { n: 3, color: "pink", shape: "rect", x: 282, y: 326, w: 540, h: 180, bx: 298, by: 365 },
            { n: 4, color: "amber", shape: "rect", x: 282, y: 524, w: 1104, h: 360, bx: 298, by: 665 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "เช็กสถานะเชื่อมเครื่องสแกนนิ้ว & โควตาลากิจ+ป่วย", html: `สังเกตป้าย <code>🔗 เชื่อมเครื่องสแกนนิ้วแล้ว</code>, กรอบแสดงวันลา <code>0 / 23 วันทำการ</code> (รอบ 6 เดือน), และตัวเลือกปีงบประมาณ (<code>2569–2571</code>)` },
          { color: "teal", title: "เลือกแท็บยื่นใบลาใหม่", html: `แท็บ <strong>✍️ ยื่นใบลาใหม่</strong> ใช้สร้างใบลา ส่วน <strong>📄 ใบลาของฉัน</strong> ใช้ติดตามสถานะย้อนหลัง` },
          { color: "pink", title: "เลือกแบบฟอร์ม 1 & ประเภทการขอลา 3 แบบ", html: `คลิกการ์ด <strong>🤒 แบบฟอร์ม 1</strong> แล้วเลือกปุ่ม <code>🤒 ลาป่วย</code>, <code>📋 ลากิจส่วนตัว</code>, หรือ <code>👶 ลาคลอดบุตร</code>` },
          { color: "amber", title: "กรอกเหตุผล ช่วงวันลา ประวัติลาล่าสุด & ส่งเข้าสายพิจารณา 3 ขั้น", html: `ตรวจสอบข้อมูลที่ระบบเติมให้อัตโนมัติ กรอก <strong>เหตุผลการลา *</strong> (ระบบดึงประวัติลาครั้งสุดท้ายให้) แล้วกด <strong>📨 ส่งใบลาเข้าสู่สายการพิจารณา</strong>` },
        ])}
      `,
    })
  );

  // Page 19 (หน้า 15): 2.6 Leave Form 2
  pages.push(
    renderContentPage({
      id: "sec-2-6b",
      runningChapter: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสาร",
      bodyHtml: `
        ${renderSectionHead("2.6", "ระบบใบลา (ต่อ) — ข. แบบฟอร์ม 2 (ใบลาพักผ่อนประจำปี)", "<code>📝 ระบบใบลา</code> ➔ แท็บ <code>✍️ ยื่นใบลาใหม่</code> ➔ <code>🌴 แบบฟอร์ม 2: ใบลาพักผ่อน</code>")}
        ${renderScreenshotFrame({
          figId: "fig-14",
          figNum: 14,
          imgFile: "09-leave-form-vacation.png",
          urlPath: "/leave (Form 2: ลาพักผ่อน)",
          caption: "แบบฟอร์ม 2 ใบลาพักผ่อน คำนวณสิทธิสะสม+สิทธิประจำปี คงเหลืออัตโนมัติ และระบุผู้ปฏิบัติหน้าที่แทน",
          annos: [
            { n: 1, color: "teal", shape: "rect", x: 828, y: 326, w: 558, h: 106, bx: 794, by: 375 },
            { n: 2, color: "indigo", shape: "rect", x: 282, y: 588, w: 1104, h: 200, bx: 298, by: 675 },
            { n: 3, color: "pink", shape: "rect", x: 282, y: 796, w: 1104, h: 78, bx: 298, by: 835 },
          ],
        })}
        ${renderSteps([
          { color: "teal", title: "คลิกเลือกแบบฟอร์ม 2: ใบลาพักผ่อน", html: `ระบบจะปรับหัวข้อเรื่องเป็น <code>ขอลาพักผ่อน</code> และแสดงกล่องคำนวณสิทธิวันลาพักผ่อนเฉพาะของแบบฟอร์มนี้โดยอัตโนมัติ` },
          { color: "indigo", title: "กำหนดวันที่ลาและจำนวนวันทำการ", html: `ระบุวันที่เขียน <code>ตั้งแต่วันที่ – ถึงวันที่</code> และจำนวนวันทำการในช่อง <code>มีกำหนด (วันทำการ)</code>` },
          { color: "pink", title: "คำนวณวันลาคงเหลืออัตโนมัติ & เลือกผู้ปฏิบัติหน้าที่แทน", html: `ตรวจสอบ <strong>วันลาพักผ่อนสะสม</strong> + <strong>สิทธิประจำปี</strong> ระบบแสดงยอด <code>รวมสิทธิทั้งหมด / คงเหลือหลังลา</code> ทันที และเลือกชื่อ <strong>ผู้ปฏิบัติหน้าที่แทน</strong> ด้านล่างก่อนกดส่ง` },
        ])}
      `,
    })
  );

  // Page 20 (หน้า 16): 2.6 Leave My List
  pages.push(
    renderContentPage({
      id: "sec-2-6c",
      runningChapter: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสาร",
      bodyHtml: `
        ${renderSectionHead("2.6", "ระบบใบลา (ต่อ) — ค. แท็บใบลาของฉันและการซิงก์ลงเวลาราชการอัตโนมัติ", "<code>📝 ระบบใบลา</code> ➔ แท็บ <code>📄 ใบลาของฉัน</code>")}
        ${renderScreenshotFrame({
          figId: "fig-15",
          figNum: 15,
          imgFile: "10-leave-my-list.png",
          urlPath: "/leave (My Leave Requests)",
          caption: "แท็บใบลาของฉันสำหรับติดตามสถานะคำขอแยกตามปีงบประมาณ และเชื่อมสายพิจารณา 3 ขั้นตอน",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 942, y: 112, w: 336, h: 90, bx: 908, by: 155 },
            { n: 2, color: "pink", shape: "rect", x: 390, y: 226, w: 148, h: 48, bx: 576, by: 250, px: 540, py: 250 },
            { n: 3, color: "teal", shape: "rect", x: 268, y: 294, w: 1134, h: 88, bx: 286, by: 338 },
          ],
        })}
        ${renderWorkflow([
          { step: "ขั้นตอน 1", label: "ผู้ตรวจสอบสถิติ", sub: "ธุรการตรวจวันลา" },
          { step: "ขั้นตอน 2", label: "ผู้บังคับบัญชา", sub: "Manager ในสังกัด" },
          { step: "ขั้นตอน 3", label: "ผู้มีอำนาจสั่งอนุญาต", sub: "พมจ. พิจารณา" },
          { step: "อัตโนมัติ", label: "ซิงก์ลงเวลาราชการ", sub: "บันทึกหมายเหตุวันลา", highlight: true },
        ])}
        ${renderSteps([
          { color: "indigo", title: "สลับดูประวัติและโควต้าตามปีงบประมาณ", html: `เลือก <code>ปีงบประมาณ 2569 / 2570 / 2571</code> เพื่อเรียกดูข้อมูลและสรุปวันลากิจ+ป่วยย้อนหลังของแต่ละปีงบประมาณได้ทันที` },
          { color: "pink", title: "กดแท็บ 📄 ใบลาของฉัน", html: `แสดงจำนวนใบลาที่ยื่นทั้งหมดในวงเล็บ พร้อมการ์ดติดตามความคืบหน้าของแต่ละขั้นตอนการพิจารณา` },
          { color: "teal", title: "ซิงก์เข้าสู่รายงานลงเวลาราชการอัตโนมัติเมื่ออนุมัติ", html: `เมื่อผ่านครบ 3 ขั้นตอนแล้ว วันลาจะถูกผูกเป็นหมายเหตุลงในรายงานลงเวลาปฏิบัติราชการประจำวันโดยไม่ต้องแจ้งซ้ำ` },
        ])}
      `,
    })
  );

  // Page 21 (หน้า 17): 2.7 Analysis Ch 2
  pages.push(
    renderAnalysisPage({
      id: "sec-2-7",
      runningChapter: "บทที่ 2: งานและบริการ — การประสานงาน & สื่อสาร",
      code: "2.7",
      chLabel: "บทที่ 2 — หนังสือเวียน, งาน Kanban, ประชุม, แชท, รถราชการ & ใบลา",
      comparisons: [
        {
          aspect: "งานสารบรรณหนังสือเวียน",
          legacy: "เดินแฟ้มเวียนกระดาษทีละโต๊ะ ช้า เสี่ยงแฟ้มค้างหรือเอกสารสูญหาย ไม่รู้ใครอ่านแล้ว",
          smart: "เวียนอิเล็กทรอนิกส์ 1 คลิก แนบได้ 3 ช่องทาง รู้อัตราลงนามรับทราบแบบ Realtime",
          benefit: "ลดกระดาษ 100% ลดเวลาเดินแฟ้มข้ามกลุ่มงานจากหลายวันเหลือหลักนาที",
        },
        {
          aspect: "การจองรถยนต์ส่วนกลาง",
          legacy: "เขียนใบขอ พมจ.กพ 02 ด้วยมือ เดินตามลายเซ็น 4 โต๊ะ ไม่รู้ตารางรถว่าง/ชนกันหรือไม่",
          smart: "แบบ <code>พมจ.กพ 02</code> ดิจิทัล ปุ่มปลายทางด่วน 11 อำเภอ Gantt View & แจ้งเตือนครบ 4 ขั้น",
          benefit: "ป้องกันจองรถซ้อน คาดการณ์งบน้ำมันแม่นยำ และเก็บประวัติคืนรถโปร่งใส",
        },
        {
          aspect: "การขออนุญาตลา",
          legacy: "เขียนใบลา นับวันลากิจ+ป่วยเอง ยื่นแฟ้มรอสถิติ-หน.ฝ่าย-พมจ. และคีย์วันลาลงรายงานเวลาซ้ำ",
          smart: "คำนวณวันลา+คงเหลืออัตโนมัติ ส่งผ่านสายอนุมัติ 3 ขั้น และซิงก์เข้า <code>ลงเวลาราชการ</code> ทันที",
          benefit: "ไม่ผิดพลาดเรื่องโควตา 23 วัน/ลาสะสม และลดงานซ้ำซ้อนของฝ่ายธุรการ",
        },
        {
          aspect: "ติดตามภารกิจ & ประชุม",
          legacy: "สั่งงานในแชทส่วนตัวข้อความเลื่อนหาย นัดประชุมต้องถามห้องว่างผ่านโทรศัพท์",
          smart: "Kanban 4 สถานะพร้อม RBAC Scope + ผังห้อง 5 ห้อง/อุปกรณ์ + Google Calendar <code>.ics</code>",
          benefit: "ติดตามความก้าวหน้า Subtasks ได้แม่นยำและไม่มีปัญหาจองห้องประชุมซ้ำซ้อน",
        },
      ],
      specialFeatures: [
        {
          icon: "🎯",
          title: "ปลายทางด่วน 11 อำเภอ + คำนวณค่าน้ำมันอัตโนมัติ",
          desc: "ในแบบ พมจ.กพ 02 กดปุ่มชื่ออำเภอ (เช่น <em>อ.คลองลาน 130 กม. / อ.ขาณุฯ 175 กม.</em>) ระบบกรอกระยะทางและคำนวณงบน้ำมันให้อัตโนมัติ",
        },
        {
          icon: "🇹🇭",
          title: "แปลงวันที่เป็นเลขไทยอัตโนมัติในหนังสือเวียน",
          desc: "ช่องลงวันที่หนังสือเวียนมีระบบ <strong>✨ เลขไทยอัตโนมัติ</strong> (<code>๒๐ พฤศจิกายน ๒๕๖๙</code>) ตรงตามระเบียบงานสารบรรณทันที",
        },
        {
          icon: "🔗",
          title: "ซิงก์ใบลาอนุมัติเข้าเครื่องสแกนนิ้ว & ไฟล์แนบ NAS",
          desc: "ใบลาที่อนุญาตแล้วเชื่อมเข้าหมายเหตุลงเวลาราชการอัตโนมัติ ส่วนไฟล์แชททั้งหมดจัดเก็บบน <code>Synology NAS: /chat_attachments</code>",
        },
      ],
      proTips: [
        "<strong>ดู Gantt View ก่อนขอใช้รถในช่วงภารกิจหนาแน่น</strong> ในเมนู <code>🚗 รถราชการ</code> เพื่อทราบช่วงเวลาที่รถและคนขับพร้อมให้บริการ",
        "<strong>ใช้ปุ่ม 🔵 เพิ่มลง Google Calendar บนการ์ดประชุม</strong> เพื่อรับแจ้งเตือนก่อนเวลาประชุม 15–30 นาทีบนสมาร์ตโฟนทันที",
        "<strong>ปักหมุดข้อความข้อสั่งการสำคัญในห้องแชทกลาง</strong> และใช้แท็ก <code>ด่วนที่สุด / หนังสือเวียน</code> เพื่อค้นหาย้อนหลังได้ในเสี้ยววินาที",
      ],
    })
  );

  // =========================================================================
  // CHAPTER 3 (หน้า 18–28)
  // =========================================================================

  // Page 22 (หน้า 18): Ch 3 + 3.1 DataHub Tab 1
  pages.push(
    renderContentPage({
      id: "ch3",
      runningChapter: "บทที่ 3: คลังข้อมูล สารบรรณ & บริการองค์กร",
      bodyHtml: `
        ${renderChapterBanner(
          3,
          "คลังข้อมูล สารบรรณ & บริการองค์กร",
          "ศูนย์ข้อมูลและสถิติสังคม (Data Hub 6 แท็บ), วิเคราะห์ TPMAP กำแพงเพชร, Synology File Station และ Photos",
          "teal"
        )}
        ${renderSectionHead("3.1", "ศูนย์ข้อมูลและสถิติสังคม (Data Hub) — แท็บที่ 1: สถานการณ์ทางสังคมฯ", "<code>🗄️ คลังข้อมูล</code> ➔ <code>🗃️ ระบบรวมข้อมูล</code> (<code>/data-hub</code>)", true)}
        ${renderScreenshotFrame({
          figId: "fig-16",
          figNum: 16,
          imgFile: "11-datahub-stats.png",
          urlPath: "/data-hub (Tab 1)",
          caption: "แท็บที่ 1 สถานการณ์ทางสังคมจังหวัดกำแพงเพชร 11 อำเภอ 78 ตำบล พร้อมปุ่มส่งออก Excel และพิมพ์รายงาน กบจ.",
          size: "compact",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 286, y: 272, w: 1094, h: 78, bx: 286, by: 268 },
            { n: 2, color: "pink", shape: "rect", x: 268, y: 422, w: 1134, h: 62, bx: 286, by: 452 },
            { n: 3, color: "teal", shape: "rect", x: 268, y: 514, w: 1134, h: 370, bx: 286, by: 640 },
          ],
        })}
        ${renderSteps(
          [
            { color: "indigo", title: "สลับใช้งาน 6 แท็บศูนย์ข้อมูล & ตัวเลขสรุปจังหวัด", html: `แถบนำทางสีน้ำเงินสลับได้ครบทั้ง 6 แท็บ ด้านบนขวาสรุปภาพรวม <code>11 อำเภอ</code> และ <code>บุคลากรในระบบ 40 ท่าน</code>` },
            { color: "pink", title: "เลือกปีงบประมาณ พื้นที่ 11 อำเภอ & ปุ่มส่งออกรายงาน กบจ.", html: `กรองรายปีงบ (<code>2570/2569/2568</code>) และเจาะจง 11 อำเภอ พร้อมปุ่ม <strong>📊 ส่งออก Excel</strong> และ <strong>🖨️ พิมพ์รายงาน กบจ.</strong>` },
            { color: "teal", title: "เจาะลึก 7 หมวดประชากร & กลุ่มเปราะบาง + ตารางรายอำเภอ", html: `สลับหมวด <code>ประชากร</code>, <code>กลุ่มเปราะบาง</code>, <code>เด็ก</code>, <code>สตรี</code>, <code>ผู้สูงอายุ</code>, <code>พิการ</code>, <code>คนไร้ที่พึ่ง</code> เพื่อดูตัวเลขจังหวัดและตาราง 11 อำเภอ` },
          ],
          true
        )}
      `,
    })
  );

  // Page 23 (หน้า 19): 3.1 Tab 2 TPMAP District
  pages.push(
    renderContentPage({
      id: "sec-3-1b",
      runningChapter: "บทที่ 3: คลังข้อมูล สารบรรณ & บริการองค์กร",
      bodyHtml: `
        ${renderSectionHead("3.1", "Data Hub (ต่อ) — แท็บที่ 2: วิเคราะห์ TPMAP กำแพงเพชร (ภาพรวม 11 อำเภอ)", "<code>🗃️ ระบบรวมข้อมูล</code> ➔ แท็บ <code>🎯 วิเคราะห์ TPMAP กำแพงเพชร</code>")}
        ${renderScreenshotFrame({
          figId: "fig-17",
          figNum: 17,
          imgFile: "12-datahub-tpmap.png",
          urlPath: "/data-hub (Tab 2: TPMAP)",
          caption: "แดชบอร์ดวิเคราะห์ความยากจนแบบชี้เป้า TPMAP จังหวัดกำแพงเพชร (รหัส 62) แคชข้อมูลจริงลงใน Supabase",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 514, y: 274, w: 212, h: 40, bx: 500, by: 245, px: 560, py: 274 },
            { n: 2, color: "pink", shape: "rect", x: 778, y: 466, w: 610, h: 82, bx: 744, by: 505 },
            { n: 3, color: "teal", shape: "rect", x: 278, y: 594, w: 1114, h: 215, bx: 294, by: 675 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "เปิดแท็บวิเคราะห์ TPMAP จังหวัดกำแพงเพชร (รหัส 62)", html: `เชื่อมโยงฐานข้อมูลจริงจาก <code>tpmap.in.th</code> ตามเกณฑ์ จปฐ. แผนพัฒนาฯ ฉบับที่ 13 พร้อมสถานะ <strong>💾 แคชใน Supabase</strong>` },
          { color: "pink", title: "ปุ่มซิงก์ข้อมูล & ดาวน์โหลดชุดข้อมูล CSV / คำอธิบาย", html: `กด <strong>🔄 ซิงก์ปี 2569 ล่าสุด</strong> หรือ <strong>⬇️ ซิงก์ 2565–2569 ลง Supabase</strong> และมีลิงก์ดาวน์โหลด <code>CSV</code>, <code>📘 คำอธิบายชุดข้อมูล (.xlsx)</code>, และเปิดเว็บ TPMAP` },
          { color: "teal", title: "ตัวกรองปี พ.ศ. 2565–2569, กลุ่มเป้าหมาย & ระดับอำเภอ/ตำบล", html: `สลับปี <strong>2565–2569</strong> กลุ่มเป้าหมาย 3 ประเภท และระดับพื้นที่ (<strong>ระดับอำเภอ 11</strong> / <strong>ระดับตำบล 78</strong>) ด้านล่างสรุป 4 KPI สำคัญทันที` },
        ])}
      `,
    })
  );

  // Page 24 (หน้า 20): 3.1 Tab 2 TPMAP Tambon Deep-Dive
  pages.push(
    renderContentPage({
      id: "sec-3-1b2",
      runningChapter: "บทที่ 3: คลังข้อมูล สารบรรณ & บริการองค์กร",
      bodyHtml: `
        ${renderSectionHead("3.1", "Data Hub (ต่อ) — เจาะลึก TPMAP ระดับตำบล (78 ตำบล), แนวโน้ม 5 ปี & 5 มิติ MPI", "แท็บ <code>🎯 วิเคราะห์ TPMAP</code> ➔ กดปุ่ม <code>ระดับตำบล (78)</code> แล้วเลื่อนลง")}
        ${renderScreenshotFrame({
          figId: "fig-18",
          figNum: 18,
          imgFile: "12b-datahub-tpmap-tambon.png",
          urlPath: "/data-hub (TPMAP 78 Tambons)",
          caption: "TPMAP ระดับตำบล 78 ตำบล กราฟแนวโน้ม 5 ปี (2565–2569) ตัวชี้วัด จปฐ. ตกเกณฑ์สูงสุด และตาราง 5 มิติ MPI",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 268, y: 128, w: 1134, h: 112, bx: 248, by: 175 },
            { n: 2, color: "teal", shape: "rect", x: 268, y: 256, w: 558, h: 520, bx: 248, by: 320 },
            { n: 3, color: "pink", shape: "rect", x: 844, y: 256, w: 558, h: 520, bx: 1368, by: 248 },
            { n: 4, color: "amber", shape: "rect", x: 268, y: 796, w: 1134, h: 96, bx: 248, by: 842 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "สรุปผลเป้าหมายระดับตำบล 78 แห่ง", html: `แสดงผลคำนวณเฉพาะพื้นที่ตำบล เช่น พื้นที่เป้าหมายสูงสุด <code>ต.โกสัมพี (2,060 คน · 20.72%)</code> และมิติปัญหาอันดับ 1` },
          { color: "teal", title: "กราฟแท่งแนวโน้ม 5 ปี (พ.ศ. 2565–2569) คลิกสลับปีได้", html: `เปรียบเทียบสัดส่วนคนจนเป้าหมายรายปี พร้อมแตกตัวเลข <strong>5 มิติ</strong> (สุขภาพ ความเป็นอยู่ ศึกษา เศรษฐกิจ คุ้มครองฯ) คลิกแท่งปีเพื่อดูข้อมูลปีนั้นทันที` },
          { color: "pink", title: "จัดอันดับ 8 ตัวชี้วัด จปฐ. ที่ตกเกณฑ์สูงสุด (แผนฯ 13)", html: `ชี้เป้าปัญหารายข้อที่พบบ่อยที่สุดในจังหวัด (เช่น <code>[ind12] ตรวจสุขภาพอายุ 35+ ปี</code>, <code>[ind21] ขนส่งสาธารณะ</code>, <code>[ind32] สวัสดิการรัฐ</code>)` },
          { color: "amber", title: "ตาราง 78 ตำบลเรียงลำดับตาม 5 มิติ MPI", html: `คลิกหัวตารางทุกคอลัมน์เพื่อจัดอันดับตำบลที่มีปัญหาเฉพาะมิติ (เช่น เศรษฐกิจ/การศึกษา) สำหรับวางแผนลงพื้นที่ช่วยเหลือ` },
        ])}
      `,
    })
  );

  // Page 25 (หน้า 21): 3.1 Tab 3 Divisions
  pages.push(
    renderContentPage({
      id: "sec-3-1c",
      runningChapter: "บทที่ 3: คลังข้อมูล สารบรรณ & บริการองค์กร",
      bodyHtml: `
        ${renderSectionHead("3.1", "Data Hub (ต่อ) — แท็บที่ 3: ระบบงาน 4 กลุ่มภารกิจ พมจ.", "<code>🗃️ ระบบรวมข้อมูล</code> ➔ แท็บ <code>🏛️ ระบบงาน 4 กลุ่มภารกิจ พมจ.</code>")}
        ${renderScreenshotFrame({
          figId: "fig-19",
          figNum: 19,
          imgFile: "13-datahub-divisions.png",
          urlPath: "/data-hub (Tab 3: 4 Divisions)",
          caption: "การ์ดข้อมูล 4 กลุ่มภารกิจ พมจ.กำแพงเพชร แสดงผู้กำกับดูแล ภารกิจ และ KPI หลักของแต่ละฝ่าย",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 734, y: 274, w: 200, h: 40, bx: 834, by: 245, px: 834, py: 274 },
            { n: 2, color: "teal", shape: "rect", x: 268, y: 424, w: 690, h: 52, bx: 286, by: 450 },
            { n: 3, color: "pink", shape: "rect", x: 268, y: 492, w: 1134, h: 396, bx: 286, by: 640 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "เข้าสู่แท็บระบบงาน 4 กลุ่มภารกิจ พมจ.", html: `แสดงโครงสร้างและภารกิจหลักของทุกกลุ่มงานภายในสำนักงาน พมจ.กำแพงเพชร` },
          { color: "teal", title: "กดกรองเฉพาะกลุ่มงานหรือดูภาพรวมทั้งหมด", html: `เลือกดู <code>🌐 ภาพรวมทั้ง 4 กลุ่มงาน</code> หรือเจาะจง <code>🏛️ บริหารทั่วไป</code>, <code>📊 นโยบายและวิชาการ</code>, <code>🤝 สังคมและสวัสดิการ</code>, <code>♿ ศูนย์คนพิการ (พก.)</code>` },
          { color: "pink", title: "ตรวจชื่อผู้กำกับดูแล KPI หลัก และกด ดูข้อมูล ➔", html: `แต่ละการ์ดระบุผู้กำกับดูแล ขอบเขตภารกิจ และตัวชี้วัดสำคัญ (เช่น KPI 94.2%, กองทุน 84 ตำบล, คนพิการจดทะเบียน 24,850 คน) พร้อมปุ่ม <strong>ดูข้อมูล ➔</strong>` },
        ])}
      `,
    })
  );

  // Page 26 (หน้า 22): 3.1 Tab 4 Personnel
  pages.push(
    renderContentPage({
      id: "sec-3-1d",
      runningChapter: "บทที่ 3: คลังข้อมูล สารบรรณ & บริการองค์กร",
      bodyHtml: `
        ${renderSectionHead("3.1", "Data Hub (ต่อ) — แท็บที่ 4: ทำเนียบข้าราชการและเจ้าหน้าที่ (40 ท่าน)", "<code>🗃️ ระบบรวมข้อมูล</code> ➔ แท็บ <code>👥 ทำเนียบข้าราชการและเจ้าหน้าที่</code>")}
        ${renderScreenshotFrame({
          figId: "fig-20",
          figNum: 20,
          imgFile: "14-datahub-personnel.png",
          urlPath: "/data-hub (Tab 4: Directory)",
          caption: "ทำเนียบบุคลากร พมจ.กำแพงเพชร เชื่อมข้อมูลจริงจาก Supabase public.users พร้อมตัวกรอง 5 สังกัด",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 268, y: 412, w: 1134, h: 146, bx: 286, by: 485 },
            { n: 2, color: "pink", shape: "rect", x: 268, y: 578, w: 1134, h: 154, bx: 286, by: 625 },
            { n: 3, color: "teal", shape: "rect", x: 268, y: 744, w: 1134, h: 146, bx: 286, by: 805 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "การ์ดผู้บริหารสูงสุดประจำสำนักงาน", html: `แสดงชื่อ ตำแหน่ง <em>พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</em> และประเภทบุคลากรอย่างเด่นชัด` },
          { color: "pink", title: "กรองตามกลุ่มงานทั้ง 5 กลุ่ม & ช่องค้นหาอัจฉริยะ", html: `แสดงยอดรายสังกัด (<code>ทั้งหมด 40</code>, <code>ผู้บริหาร 1</code>, <code>บริหาร 9</code>, <code>นโยบายฯ 6</code>, <code>สวัสดิการ 14</code>, <code>พก. 10</code>) และค้นหาจากชื่อ ชื่อเล่น หรือตำแหน่ง` },
          { color: "teal", title: "เรียกดูประเภทบุคลากรและช่องทางติดต่อ", html: `ดึงข้อมูลจริงจาก <code>public.users</code> แสดงประเภทบุคลากร (ข้าราชการ, พนักงานราชการ, จ้างเหมา) และเบอร์ติดต่อ/อีเมล/LINE ที่เปิดเผย` },
        ])}
      `,
    })
  );

  // Page 27 (หน้า 23): 3.1 Tab 5 Docs
  pages.push(
    renderContentPage({
      id: "sec-3-1e",
      runningChapter: "บทที่ 3: คลังข้อมูล สารบรรณ & บริการองค์กร",
      bodyHtml: `
        ${renderSectionHead("3.1", "Data Hub (ต่อ) — แท็บที่ 5: คลังแบบฟอร์มคำขอและคู่มือปฏิบัติงาน", "<code>🗃️ ระบบรวมข้อมูล</code> ➔ แท็บ <code>📄 คลังแบบฟอร์มและคู่มือปฏิบัติงาน</code>")}
        ${renderScreenshotFrame({
          figId: "fig-21",
          figNum: 21,
          imgFile: "15-datahub-docs.png",
          urlPath: "/data-hub (Tab 5: Forms & Manuals)",
          caption: "คลังแบบฟอร์มคำขอและคู่มือปฏิบัติงาน เชื่อมต่อ Synology NAS + Supabase พร้อมอัปโหลดและดาวน์โหลด",
          annos: [
            { n: 1, color: "pink", shape: "rect", x: 976, y: 444, w: 410, h: 50, bx: 942, by: 469 },
            { n: 2, color: "indigo", shape: "rect", x: 278, y: 514, w: 920, h: 96, bx: 294, by: 560 },
            { n: 3, color: "teal", shape: "rect", x: 278, y: 624, w: 1114, h: 265, bx: 294, by: 730 },
          ],
        })}
        ${renderSteps([
          { color: "pink", title: "สลับไปคำสั่งราชการ หรือเพิ่มเอกสาร/คู่มือใหม่", html: `กด <strong>📜 ค้นหาคำสั่ง / ประกาศ / ระเบียบ →</strong> เพื่อข้ามแท็บทันที หรือกด <strong>➕ เพิ่มเอกสาร / แบบฟอร์ม / คู่มือ</strong> เพื่อเผยแพร่เอกสาร` },
          { color: "indigo", title: "กรองตามหมวดหมู่เอกสาร กลุ่มงาน & ค้นหาชื่อ", html: `เลือกหมวดหมู่ <code>ทั้งหมด</code>, <code>📝 แบบฟอร์มคำขอ</code>, <code>📘 คู่มือปฏิบัติงาน</code>, <code>📌 แนวทางปฏิบัติ</code>, <code>📊 แผนงาน/รายงาน</code>, หรือกรองตามกลุ่มงาน` },
          { color: "teal", title: "ดาวน์โหลดไฟล์ / เปิดลิงก์ & แก้ไขเอกสารของตนเอง", html: `แสดงนามสกุล ขนาดไฟล์ วันที่อัปเดต และผู้อัปโหลด กด <strong>📥 ดาวน์โหลด</strong> หรือ <strong>🔗 เปิดลิงก์</strong> (ผู้สร้างมีปุ่ม ✏️/🗑️ แก้ไขและลบได้)` },
        ])}
      `,
    })
  );

  // Page 28 (หน้า 24): 3.1 Tab 6 Orders
  pages.push(
    renderContentPage({
      id: "sec-3-1f",
      runningChapter: "บทที่ 3: คลังข้อมูล สารบรรณ & บริการองค์กร",
      bodyHtml: `
        ${renderSectionHead("3.1", "Data Hub (ต่อ) — แท็บที่ 6: คลังหนังสือคำสั่ง / ประกาศ / ระเบียบราชการ", "<code>🗃️ ระบบรวมข้อมูล</code> ➔ แท็บ <code>📜 คำสั่ง / ประกาศ / ระเบียบ</code>")}
        ${renderScreenshotFrame({
          figId: "fig-22",
          figNum: 22,
          imgFile: "16-datahub-orders.png",
          urlPath: "/data-hub (Tab 6: Orders & Rules)",
          caption: "คลังคำสั่ง/ประกาศ 38 รายการ สืบค้นเลขไทยและอารบิกได้ พร้อมดูไฟล์และดาวน์โหลด PDF บน Synology NAS",
          annos: [
            { n: 1, color: "pink", shape: "rect", x: 1210, y: 434, w: 180, h: 50, bx: 1175, by: 459 },
            { n: 2, color: "indigo", shape: "rect", x: 278, y: 496, w: 1114, h: 126, bx: 294, by: 545 },
            { n: 3, color: "teal", shape: "rect", x: 278, y: 636, w: 1114, h: 250, bx: 294, by: 730 },
          ],
        })}
        ${renderSteps([
          { color: "pink", title: "บันทึกคำสั่ง / ประกาศ / ระเบียบใหม่", html: `คลิก <strong>➕ บันทึกคำสั่ง / ประกาศใหม่</strong> เพื่อเพิ่มเลขที่คำสั่ง ลงวันที่ และแนบไฟล์ PDF จัดเก็บบน Synology NAS` },
          { color: "indigo", title: "ค้นหารองรับทั้งเลขอารบิก & เลขไทย + ตัวกรองปี/สถานะ", html: `พิมพ์เช่น <code>125/2569</code> หรือ <code>๑๒๕</code> กรองตามสถานะผลบังคับใช้ (<code>🟢 มีผล / 🟡 แก้ไข / 🔴 ยกเลิก</code>) ประเภท และปี พ.ศ. (<code>ทุกปี 38</code>)` },
          { color: "teal", title: "ดูไฟล์ PDF ทันที (👁️ ดูไฟล์) หรือดาวน์โหลด", html: `คลิก <strong>👁️ ดูไฟล์</strong> เพื่อเปิดอ่าน PDF ออนไลน์, คลิก <strong>⬇️</strong> เพื่อดาวน์โหลด, หรือกดปุ่มคัดลอก/แก้ไข/ลบในคอลัมน์จัดการ` },
        ])}
      `,
    })
  );

  // Page 29 (หน้า 25): 3.2 NAS Files Overview
  pages.push(
    renderContentPage({
      id: "sec-3-2",
      runningChapter: "บทที่ 3: คลังข้อมูล สารบรรณ & บริการองค์กร",
      bodyHtml: `
        ${renderSectionHead("3.2", "คลังเอกสารราชการ Synology File Station (หน้าเลือกโฟลเดอร์ตามสิทธิ์)", "<code>🗄️ คลังข้อมูล</code> ➔ <code>📁 เอกสาร NAS</code> (<code>/files</code>)")}
        ${renderScreenshotFrame({
          figId: "fig-23",
          figNum: 23,
          imgFile: "17-nas-files.png",
          urlPath: "/files (Shared Folders)",
          caption: "หน้าหลัก File Station แสดงสถานะ On-Premise LAN พร้อมใช้งาน และโฟลเดอร์แชร์ 14 รายการตามสิทธิ์ DSM ACL",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 268, y: 92, w: 1134, h: 108, bx: 286, by: 145 },
            { n: 2, color: "teal", shape: "rect", x: 268, y: 212, w: 1134, h: 116, bx: 286, by: 265 },
            { n: 3, color: "pink", shape: "rect", x: 268, y: 360, w: 1134, h: 515, bx: 286, by: 525 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "ตรวจสอบสถานะการเชื่อมต่อ NAS & บัญชี DSM ที่ล็อกอิน", html: `ป้ายสีเขียว <strong>● On-Premise LAN พร้อมใช้งาน</strong> ยืนยันเชื่อมต่อ NAS สำเร็จ ด้านขวาแสดงชื่อผู้ใช้ DSM พร้อมปุ่ม <strong>สลับบัญชี</strong>` },
          { color: "teal", title: "ตัวกรองประเภทเอกสาร & ปีงบประมาณ", html: `กรองดู <code>PDF / เอกสาร</code>, <code>Excel</code>, <code>รูปภาพ / วิดีโอ</code>, <code>ZIP</code> และกรองตามปีงบประมาณ (<code>2570–2567</code>)` },
          { color: "pink", title: "เลือกเปิดโฟลเดอร์แชร์ที่ได้รับสิทธิ์ (DSM ACL)", html: `แสดงเฉพาะโฟลเดอร์ที่บัญชีผู้ใช้มีสิทธิ์บน Synology NAS (ตัวอย่าง 14 รายการ เช่น <em>กลุ่มนโยบายและวิชาการ, ฝ่ายบริหารงานทั่วไป, virtual-office</em>) คลิก <strong>เปิด ➔</strong> เพื่อเข้าไปดูไฟล์` },
        ])}
      `,
    })
  );

  // Page 30 (หน้า 26): 3.2 (ต่อ) NAS Browse Inside
  pages.push(
    renderContentPage({
      id: "sec-3-2b",
      runningChapter: "บทที่ 3: คลังข้อมูล สารบรรณ & บริการองค์กร",
      bodyHtml: `
        ${renderSectionHead("3.2", "คลังเอกสาร NAS (ต่อ) — การนำทางโฟลเดอร์ อัปโหลด สร้างโฟลเดอร์ & จัดการไฟล์", "<code>📁 เอกสาร NAS</code> ➔ คลิก <code>เปิด ➔</code> เข้าสู่โฟลเดอร์ (เช่น <code>/virtual-office</code>)")}
        ${renderScreenshotFrame({
          figId: "fig-24",
          figNum: 24,
          imgFile: "17b-nas-files-browse.png",
          urlPath: "/files (/virtual-office)",
          caption: "มุมมองภายในโฟลเดอร์ /virtual-office พร้อม Breadcrumb ปุ่มอัปโหลด สร้างโฟลเดอร์ และตัวกรอง",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 278, y: 212, w: 310, h: 44, bx: 286, by: 196, px: 350, py: 214 },
            { n: 2, color: "pink", shape: "rect", x: 846, y: 210, w: 540, h: 48, bx: 810, by: 234 },
            { n: 3, color: "teal", shape: "rect", x: 278, y: 272, w: 1114, h: 48, bx: 294, by: 296 },
            { n: 4, color: "amber", shape: "rect", x: 278, y: 336, w: 1114, h: 345, bx: 294, by: 465 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "แถบนำทาง Breadcrumb (🏠 โฟลเดอร์ที่ได้รับสิทธิ์ / virtual-office)", html: `คลิกชื่อโฟลเดอร์ต้นทางหรือ <code>🏠 โฟลเดอร์ที่ได้รับสิทธิ์</code> เพื่อกระโดดกลับหน้าแรกได้ทันที` },
          { color: "pink", title: "เครื่องมือจัดการไฟล์ (⬆️ ขึ้น 1 ระดับ / 📤 อัปโหลดไฟล์ / + สร้างโฟลเดอร์)", html: `ค้นหาไฟล์ภายในโฟลเดอร์ ย้อนกลับ 1 ระดับ อัปโหลดเอกสารจากเครื่องขึ้น NAS หรือสร้างโฟลเดอร์ใหม่ตามสิทธิ์ที่ได้รับ` },
          { color: "teal", title: "กรองตามนามสกุลไฟล์ & ปีงบประมาณ", html: `กดสลับ <code>PDF</code>, <code>Excel</code>, <code>รูปภาพ/วิดีโอ</code>, <code>ZIP</code> เพื่อหาไฟล์เป้าหมายได้ไวขึ้น` },
          { color: "amber", title: "ตารางรายชื่อไฟล์/โฟลเดอร์ & การควบคุมสิทธิ์ DSM ACL", html: `คลิกชื่อโฟลเดอร์ (เช่น <code>circular_docs</code>, <code>datahub</code>, <code>orders</code>) เพื่อเปิดดูไฟล์และดาวน์โหลด ภายใต้ระบบสิทธิ์ <strong>DSM ACL (Protected)</strong>` },
        ])}
      `,
    })
  );

  // Page 31 (หน้า 27): 3.3 Synology Photos Gallery
  pages.push(
    renderContentPage({
      id: "sec-3-3",
      runningChapter: "บทที่ 3: คลังข้อมูล สารบรรณ & บริการองค์กร",
      bodyHtml: `
        ${renderSectionHead("3.3", "คลังภาพและสื่อราชการ (Synology Photos)", "<code>🗄️ คลังข้อมูล</code> ➔ <code>📸 ภาพ &amp; สื่อ</code> (<code>/gallery</code>)")}
        ${renderScreenshotFrame({
          figId: "fig-25",
          figNum: 25,
          imgFile: "18-nas-gallery.png",
          urlPath: "/gallery",
          caption: "คลังภาพและสื่อ Synology Photos รองรับ Shared Space / Personal Space โฟลเดอร์กิจกรรม และค้นหา EXIF",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 278, y: 216, w: 1114, h: 52, bx: 294, by: 240 },
            { n: 2, color: "pink", shape: "rect", x: 278, y: 274, w: 1114, h: 128, bx: 294, by: 315 },
            { n: 3, color: "teal", shape: "rect", x: 268, y: 434, w: 1134, h: 420, bx: 286, by: 565 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "เลือกพื้นที่ภาพส่วนกลาง (Shared) / ส่วนตัว (Personal) & มุมมอง 6 แท็บ", html: `สลับพื้นที่ส่วนกลางของ พมจ. กับพื้นที่ส่วนตัว และเลือกมุมมอง <code>📁 โฟลเดอร์กิจกรรม</code>, <code>📅 ไทม์ไลน์</code>, <code>🖼️ ทั้งหมด</code>, <code>📸 รูปภาพ</code>, <code>🎥 วิดีโอ</code>, <code>🏷️ อัลบั้ม</code>` },
          { color: "pink", title: "อัปโหลด สร้างอัลบั้ม เรียงลำดับ ปรับขนาด S/M/L & ค้นหา EXIF", html: `ใช้ปุ่ม <strong>📤 อัปโหลดภาพ</strong>, <strong>📁+ สร้างโฟลเดอร์</strong>, <strong>🏷️+ สร้างอัลบั้ม</strong>, <strong>✓ เลือกหลายรูป</strong>, เรียงตามวันที่/ชื่อ/ขนาด และค้นหาชื่อไฟล์หรือค่ากล้อง EXIF` },
          { color: "teal", title: "กรองตามปีงบประมาณ & เปิดดูโฟลเดอร์กิจกรรมรายปี", html: `กรองปีงบ (<code>2570–2567</code>) แล้วคลิกเข้าโฟลเดอร์กิจกรรม (เช่น <code>/2569</code>, <code>/2570</code>, <code>/General</code>, <code>/PR_สื่อประชาสัมพันธ์</code>)` },
        ])}
      `,
    })
  );

  // Page 32 (หน้า 28): 3.4 Analysis Ch 3
  pages.push(
    renderAnalysisPage({
      id: "sec-3-4",
      runningChapter: "บทที่ 3: คลังข้อมูล สารบรรณ & บริการองค์กร",
      code: "3.4",
      chLabel: "บทที่ 3 — Data Hub (TPMAP 6 แท็บ), File Station & Synology Photos",
      comparisons: [
        {
          aspect: "ข้อมูลความยากจน TPMAP",
          legacy: "ต้องเปิดหลายไฟล์ Excel / ดาวน์โหลดทีละปี ทีละตำบล ยากต่อการเทียบแนวโน้ม 5 ปี",
          smart: "รวมข้อมูลปี <code>2565–2569</code> ครบ 11 อำเภอ 78 ตำบลไว้หน้าเดียว คลิกเทียบ 5 ปี &amp; เรียง 5 มิติ MPI ได้ทันที",
          benefit: "สนับสนุนการตัดสินใจเชิงนโยบายและวางแผนช่วยเหลือกลุ่มเปราะบางได้แม่นยำ",
        },
        {
          aspect: "คำสั่ง / ประกาศ / แบบฟอร์ม",
          legacy: "ค้นหาจากแฟ้มสันห่วงหรือจำไม่ได้ว่าเก็บไว้เครื่องใด พิมพ์เลขไทยไม่ตรงก็หาไม่เจอ",
          smart: "สารบบกลางค้นได้ทั้ง <strong>เลขอารบิก/เลขไทย</strong> (<code>125</code> หรือ <code>๑๒๕</code>) พร้อมไฟล์ PDF บน NAS",
          benefit: "ลดเวลาค้นหาคำสั่งเก่าหรือแบบฟอร์มราชการจากหลักสิบนาทีเหลือไม่กี่วินาที",
        },
        {
          aspect: "การจัดเก็บไฟล์และภาพถ่าย",
          legacy: "ส่งต่อผ่านแฟลชไดรฟ์/LINE (รูปหมดอายุ/ลดความละเอียด) และไม่มีสิทธิ์รายแผนก",
          smart: "เก็บตรงบน <code>Synology File Station</code> &amp; <code>Photos</code> ความละเอียดต้นฉบับ คุมสิทธิ์ตามบัญชี DSM ACL",
          benefit: "ข้อมูลอยู่ภายในเซิร์ฟเวอร์สำนักงาน ปลอดภัย สืบค้นระยะยาวได้ไม่หมดอายุ",
        },
      ],
      specialFeatures: [
        {
          icon: "🎯",
          title: "ซิงก์ TPMAP จ.กำแพงเพชร (62) + แคชใน Supabase",
          desc: "ดึงข้อมูลจริงจาก <code>tpmap.in.th</code> ทั้งระดับอำเภอ (11) และตำบล (78) พร้อมสรุป 8 ตัวชี้วัด จปฐ. แผนฯ 13 ตกเกณฑ์สูงสุดอัตโนมัติ",
        },
        {
          icon: "🔢",
          title: "สืบค้นเลขคำสั่งทั้งเลขไทยและเลขอารบิกอัจฉริยะ",
          desc: "พิมพ์เลขคำสั่งแบบ <code>125/2569</code> หรือ <code>๑๒๕</code> ระบบค้นเจอตรงกันทันที พร้อมป้ายบอกผลบังคับใช้ (มีผล/แก้ไข/ยกเลิก)",
        },
        {
          icon: "🛡️",
          title: "Synology DSM ACL Native Permission",
          desc: "สิทธิ์เข้าถึงโฟลเดอร์และการลบ/เขียนไฟล์ใน <code>/files</code> และ <code>/gallery</code> เชื่อมตรงกับสิทธิระดับ OS ของ Synology NAS",
        },
      ],
      proTips: [
        "<strong>ใช้ปุ่ม 🖨️ พิมพ์รายงาน กบจ. หรือ 📊 ส่งออก Excel ในแท็บที่ 1</strong> เพื่อนำไปประกอบสไลด์หรือเอกสารประชุมประจำเดือนจังหวัดได้ทันที",
        "<strong>คลิกหัวคอลัมน์ในตาราง TPMAP 78 ตำบล</strong> (เช่น <em>สุขภาพ / เศรษฐกิจ / การศึกษา</em>) เพื่อหาตำบลเป้าหมายอันดับ 1–5 ในด้านที่กลุ่มงานรับผิดชอบ",
        "<strong>อัปโหลดภาพกิจกรรมเข้าโฟลเดอร์แยกปีงบประมาณ (เช่น /2569, /2570)</strong> ใน <code>📸 ภาพ &amp; สื่อ</code> เพื่อให้ทีมประชาสัมพันธ์ค้นภาพต้นฉบับความคมชัดสูงได้ง่าย",
      ],
    })
  );

  // =========================================================================
  // CHAPTER 4 (หน้า 29–35)
  // =========================================================================

  // Page 33 (หน้า 29): Ch 4 + 4.1 QR Code
  pages.push(
    renderContentPage({
      id: "ch4",
      runningChapter: "บทที่ 4: เครื่องมือช่วยปฏิบัติงาน & ข้อมูลส่วนตัว",
      bodyHtml: `
        ${renderChapterBanner(
          4,
          "เครื่องมือช่วยปฏิบัติงาน & ข้อมูลส่วนตัว",
          "Static QR Code ถาวร ป้าย A4, ระบบย่อลิงก์ Short URL, ลบพื้นหลัง Client-side และจัดการโปรไฟล์ NAS",
          "amber"
        )}
        ${renderSectionHead("4.1", "โปรแกรมสร้าง QR Code ถาวร 100% (Static Barcode + โลโก้ราชการ)", "<code>🛠️ เครื่องมือ &amp; Tools</code> ➔ <code>📱 QR Code</code> (<code>/tools/qrcode</code>)", true)}
        ${renderScreenshotFrame({
          figId: "fig-26",
          figNum: 26,
          imgFile: "19-tools-qrcode.png",
          urlPath: "/tools/qrcode",
          caption: "เครื่องมือสร้าง Static QR Code ถาวร 8 รูปแบบ ใส่ตรากระทรวง พม./ครุฑ และส่งออก PNG / SVG เวกเตอร์",
          size: "compact",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 268, y: 330, w: 628, h: 335, bx: 286, by: 365 },
            { n: 2, color: "teal", shape: "rect", x: 268, y: 678, w: 628, h: 215, bx: 286, by: 720 },
            { n: 3, color: "pink", shape: "rect", x: 910, y: 330, w: 492, h: 562, bx: 928, by: 480 },
          ],
        })}
        ${renderSteps(
          [
            { color: "indigo", title: "เลือกประเภทข้อมูล 8 รูปแบบ & กรอกลิงก์/ข้อมูล", html: `รองรับ <code>เว็บไซต์/URL</code>, <code>นามบัตรข้าราชการ</code>, <code>LINE Official</code>, <code>พร้อมเพย์ EMVCo</code>, <code>Wi-Fi</code>, <code>เบอร์โทร</code>, <code>อีเมล</code>, และข้อความทั่วไป` },
            { color: "teal", title: "ใส่โลโก้ตรงกลาง สีทางการ ความละเอียด & Error Correction", html: `เลือก <strong>ตรากระทรวง พม.</strong>, <strong>ตราครุฑราชการ</strong>, ตัวอักษร พม., หรืออัปโหลดเอง ปรับชุดสีทางการ และขนาด Export สูงสุด <code>2048×2048 px</code>` },
            { color: "pink", title: "ส่งออก PNG, SVG เวกเตอร์ (ป้ายไวนิล) หรือเข้าโหมดป้าย A4", html: `ตรวจตัวอย่างทางขวา แล้วกด <strong>📥 ดาวน์โหลด PNG</strong>, <strong>🎨 ส่งออก SVG (Vector)</strong>, <strong>📋 คัดลอก</strong>, หรือ <strong>🖨️ ป้ายประชาสัมพันธ์ A4</strong>` },
          ],
          true
        )}
      `,
    })
  );

  // Page 34 (หน้า 30): 4.1 (ต่อ) QR Code A4 Signage Mode
  pages.push(
    renderContentPage({
      id: "sec-4-1b",
      runningChapter: "บทที่ 4: เครื่องมือช่วยปฏิบัติงาน & ข้อมูลส่วนตัว",
      bodyHtml: `
        ${renderSectionHead("4.1", "โปรแกรมสร้าง QR Code (ต่อ) — โหมดพิเศษ: ป้ายประชาสัมพันธ์ขนาด A4 ทางการ", "<code>📱 QR Code</code> ➔ คลิกปุ่ม <code>🖨️ โหมดพิเศษ ป้ายประชาสัมพันธ์ A4</code>")}
        ${renderScreenshotFrame({
          figId: "fig-27",
          figNum: 27,
          imgFile: "19b-tools-qrcode-a4.png",
          urlPath: "/tools/qrcode (A4 Signage Mode)",
          caption: "โหมดพิเศษออกแบบป้ายประชาสัมพันธ์ขนาด A4 ทางการ พร้อมตรากระทรวง พม. และปุ่มสร้าง PDF (A4) ทันที",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 294, y: 120, w: 274, h: 650, bx: 266, by: 235 },
            { n: 2, color: "teal", shape: "rect", x: 582, y: 120, w: 520, h: 742, bx: 556, by: 410 },
            { n: 3, color: "pink", shape: "rect", x: 960, y: 42, w: 152, h: 48, bx: 924, by: 66 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "แก้ไขข้อความและเลือกชื่อหน่วยงานผู้จัดฝั่งซ้าย", html: `กรอก <strong>หัวข้อเอกสาร / ป้ายประกาศ *</strong> (เช่น เอกสารประกอบการประชุม), <strong>คำชี้แจง</strong>, เลือก <strong>หน่วยงานผู้จัด</strong> และเบอร์โทรติดต่อสำนักงาน` },
          { color: "teal", title: "ตรวจความสวยงามบนกระดาษ A4 ตัวอย่าง (Print-Ready)", html: `ด้านขวาจัดวาง <strong>ตรากระทรวง พม.</strong> ชื่อกรม/จังหวัด คำเชิญสแกน และกรอบ QR Code ขนาดใหญ่ตามสัดส่วนมาตรฐานกระดาษ A4 โดยอัตโนมัติ` },
          { color: "pink", title: "กดสร้าง PDF (A4) เพื่อสั่งพิมพ์ตั้งโต๊ะหรือแปะหน้าห้องประชุม", html: `คลิกปุ่ม <strong>📄 สร้าง PDF (A4)</strong> ระบบจะส่งออกเป็นไฟล์/คำสั่งพิมพ์ขนาด A4 เฉพาะแผ่นป้ายอย่างสวยงามทันที` },
        ])}
      `,
    })
  );

  // Page 35 (หน้า 31): 4.2 Short URL
  pages.push(
    renderContentPage({
      id: "sec-4-2",
      runningChapter: "บทที่ 4: เครื่องมือช่วยปฏิบัติงาน & ข้อมูลส่วนตัว",
      bodyHtml: `
        ${renderSectionHead("4.2", "ระบบย่อลิงก์ราชการอัจฉริยะ (Short URL ภายใต้โดเมน smso.site/s/)", "<code>🛠️ เครื่องมือ &amp; Tools</code> ➔ <code>🔗 Short URL</code> (<code>/tools/shorturl</code>)")}
        ${renderScreenshotFrame({
          figId: "fig-28",
          figNum: 28,
          imgFile: "20-tools-shorturl.png",
          urlPath: "/tools/shorturl",
          caption: "ระบบย่อลิงก์ราชการ HTTP 307 Dynamic พร้อมสารบบลิงก์ นับยอดคลิก และเชื่อม QR ป้าย A4 ได้ทันที",
          annos: [
            { n: 1, color: "teal", shape: "rect", x: 964, y: 130, w: 412, h: 82, bx: 928, by: 170 },
            { n: 2, color: "indigo", shape: "rect", x: 268, y: 286, w: 444, h: 600, bx: 286, by: 455 },
            { n: 3, color: "pink", shape: "rect", x: 730, y: 286, w: 672, h: 600, bx: 748, by: 455 },
          ],
        })}
        ${renderSteps([
          { color: "teal", title: "สรุปยอดรวมลิงก์ย่อและยอดคลิกใช้งานจริง", html: `ดูจำนวน <code>ลิงก์ทั้งหมด</code>, <code>ใช้งานอยู่</code>, และ <code>ยอดคลิกรวม</code> ของทั้งสำนักงานแบบเรียลไทม์` },
          { color: "indigo", title: "สร้างลิงก์ย่อใหม่ (HTTP 307 Dynamic) ฝั่งซ้าย", html: `วางลิงก์ต้นทาง (Google Forms/Drive), กรอกชื่อเรื่องอ้างอิง, ตั้ง Custom Alias (เช่น <code>/s/onehome1</code>) หรือกด <strong>🎲 สุ่มรหัส 6 ตัว</strong> และระบุวันหมดอายุ` },
          { color: "pink", title: "จัดการสารบบลิงก์ แก้ไขปลายทาง & ส่งทำ QR Code ฝั่งขวา", html: `กรองสถานะ/เจ้าของ กด <strong>📋 คัดลอก</strong>, <strong>📱 QR ด่วน</strong>, <strong>🎨 แต่ง QR ป้าย A4</strong>, หรือ <strong>✏️ แก้ไข URL ปลายทาง</strong> ได้ภายหลังโดยไม่ต้องพิมพ์ QR ใหม่` },
        ])}
      `,
    })
  );

  // Page 36 (หน้า 32): 4.3 BG Remove (Setup)
  pages.push(
    renderContentPage({
      id: "sec-4-3",
      runningChapter: "บทที่ 4: เครื่องมือช่วยปฏิบัติงาน & ข้อมูลส่วนตัว",
      bodyHtml: `
        ${renderSectionHead("4.3", "ระบบลบพื้นหลัง & ปรับแต่งรูปติดบัตรข้าราชการ (ตั้งค่าและอัปโหลด)", "<code>🛠️ เครื่องมือ &amp; Tools</code> ➔ <code>✂️ BG Remove</code> (<code>/tools/bgremove</code>)")}
        ${renderScreenshotFrame({
          figId: "fig-29",
          figNum: 29,
          imgFile: "21-tools-bgremove.png",
          urlPath: "/tools/bgremove",
          caption: "เครื่องมือ BG Remove 100% Client-side รองรับสีพื้นหลังติดบัตร สัดส่วน 1/1.5/2 นิ้ว และมาตรฐานความปลอดภัยราชการ",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 268, y: 304, w: 476, h: 266, bx: 286, by: 365 },
            { n: 2, color: "teal", shape: "rect", x: 268, y: 582, w: 476, h: 178, bx: 286, by: 625 },
            { n: 3, color: "pink", shape: "rect", x: 268, y: 774, w: 476, h: 118, bx: 286, by: 810 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "1. อัปโหลดรูปภาพหรือเลือกภาพตัวอย่างราชการ", html: `คลิกหรือลากไฟล์ <code>PNG / JPG / WebP</code> ไม่จำกัดขนาดลงกล่องอัปโหลด หรือทดลองด้วยปุ่ม <code>🏛️ ตราสัญลักษณ์ พม.</code> / <code>🦅 ตราครุฑราชการ</code>` },
          { color: "teal", title: "2. เลือกสีพื้นหลังใหม่ 4 แบบ", html: `เลือกพื้นหลัง <code>โปร่งใส (PNG)</code> (สำหรับตรายาง/ลายเซ็น), <code>สีฟ้าทางการ (ติดบัตร)</code>, <code>สีขาวบริสุทธิ์</code>, หรือ <code>สีตามใจชอบ</code>` },
          { color: "pink", title: "3–5. สัดส่วนติดบัตร ก.พ., ปรับละเอียดขอบ & แปรงแต่งภาพ", html: `เลือกครอบสัดส่วน <code>1 นิ้ว</code>, <code>1.5 นิ้ว (มาตรฐาน ก.พ.)</code>, <code>2 นิ้ว</code> เลื่อนค่า <strong>Tolerance (5–80)</strong> / <strong>Feathering (0–5px)</strong> และประมวลผลบน GPU/Canvas เครื่องตัวเอง 100%` },
        ])}
      `,
    })
  );

  // Page 37 (หน้า 33): 4.3 (ต่อ) BG Remove Demo
  pages.push(
    renderContentPage({
      id: "sec-4-3b",
      runningChapter: "บทที่ 4: เครื่องมือช่วยปฏิบัติงาน & ข้อมูลส่วนตัว",
      bodyHtml: `
        ${renderSectionHead("4.3", "ระบบลบพื้นหลัง (ต่อ) — ตัวอย่างการตัดขอบอัตโนมัติ & สไลด์เปรียบเทียบ", "คลิกภาพตัวอย่างหรืออัปโหลดภาพ ➔ แสดงผลบน <code>Preview Workspace</code>")}
        ${renderScreenshotFrame({
          figId: "fig-30",
          figNum: 30,
          imgFile: "21b-tools-bgremove-demo.png",
          urlPath: "/tools/bgremove (Preview Slider)",
          caption: "ตัวอย่างผลลัพธ์หลังกด ตราสัญลักษณ์ พม. แสดงสไลด์เปรียบเทียบ ต้นฉบับ ↔ ตัดขอบแล้ว แบบโปร่งใส 100%",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 278, y: 514, w: 456, h: 48, bx: 294, by: 492, px: 350, py: 516 },
            { n: 2, color: "teal", shape: "rect", x: 964, y: 314, w: 412, h: 86, bx: 1170, by: 292, px: 1170, py: 314 },
            { n: 3, color: "pink", shape: "rect", x: 780, y: 412, w: 594, h: 480, bx: 752, by: 615 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "ประมวลผลตัดพื้นหลังทันทีในเสี้ยววินาที (⚡ 0.05s)", html: `เมื่อเลือกรูปหรือคลิกภาพตัวอย่าง <code>🏛️ ตราสัญลักษณ์ พม.</code> ระบบประมวลผลผ่าน Web Canvas บนเบราว์เซอร์ทันที` },
          { color: "teal", title: "สลับโหมดเปรียบเทียบ คัดลอก หรือดาวน์โหลด PNG", html: `เลือกดูแบบ <strong>↔️ สไลด์เปรียบเทียบ</strong>, <strong>ผลลัพธ์</strong>, หรือ <strong>ข้างๆ</strong> และคลิก <strong>📋 คัดลอก</strong> หรือ <strong>📥 ดาวน์โหลด PNG</strong> ไปใช้ต่อในเอกสารราชการได้ทันที` },
          { color: "pink", title: "เลื่อนแกนกลาง (↔) ตรวจความคมชัดของขอบภาพ", html: `ลากเส้นแบ่งซ้าย-ขวาเทียบ <code>ต้นฉบับ</code> กับ <code>ตัดขอบแล้ว</code> (พื้นหลังตารางหมากรุก = โปร่งใสพร้อมใช้งาน)` },
        ])}
      `,
    })
  );

  // Page 38 (หน้า 34): 4.4 User Profile
  pages.push(
    renderContentPage({
      id: "sec-4-4",
      runningChapter: "บทที่ 4: เครื่องมือช่วยปฏิบัติงาน & ข้อมูลส่วนตัว",
      bodyHtml: `
        ${renderSectionHead("4.4", "ข้อมูลส่วนตัว การตั้งค่าแจ้งเตือน ธีม และรหัสผ่าน Synology NAS", "<code>⚙️ การจัดการ</code> ➔ <code>👤 ข้อมูลส่วนตัว</code> (<code>/user</code>)")}
        ${renderScreenshotFrame({
          figId: "fig-31",
          figNum: 31,
          imgFile: "22-user-profile.png",
          urlPath: "/user",
          caption: "หน้าข้อมูลส่วนตัว Smart MSO Government Profile v1.0 การตั้งค่าเบราว์เซอร์ Active Sessions และเปลี่ยนรหัส NAS",
          annos: [
            { n: 1, color: "indigo", shape: "rect", x: 368, y: 86, w: 700, h: 128, bx: 334, by: 145 },
            { n: 2, color: "teal", shape: "rect", x: 368, y: 224, w: 700, h: 294, bx: 334, by: 360 },
            { n: 3, color: "pink", shape: "rect", x: 368, y: 526, w: 700, h: 360, bx: 334, by: 675 },
          ],
        })}
        ${renderSteps([
          { color: "indigo", title: "ตรวจสอบข้อมูลบัตรโปรไฟล์ & กดแก้ไขข้อมูลส่วนตัว", html: `แสดงรูปโปรไฟล์ ชื่อ-นามสกุล ชื่อเล่น ประเภทบุคลากร ตำแหน่ง กลุ่มงาน พร้อมปุ่ม <strong>✏️ แก้ไขข้อมูลส่วนตัว</strong> ด้านขวา` },
          { color: "teal", title: "ข้อมูลส่วนบุคคลราชการ (Government Profile v1.0)", html: `แสดงคำนำหน้า ชื่อ-นามสกุล บทบาทสิทธิ์ (RBAC) ตำแหน่ง กลุ่ม/ฝ่าย อีเมลราชการ เบอร์โทร และ Line ID ที่ใช้แสดงในทำเนียบองค์กร` },
          { color: "pink", title: "ตั้งค่าเบราว์เซอร์ โหมดกลางคืน ตรวจเซสชัน & เปลี่ยนรหัสผ่าน NAS", html: `ตั้งค่าแจ้งเตือน/โหมดมืด ตรวจรายการ <strong>🛡️ Active Sessions</strong> (อุปกรณ์ที่ล็อกอินอยู่) และเลื่อนลงด้านล่างเพื่อกด <strong>🔑 เปลี่ยนรหัสผ่าน NAS</strong> (<code>nas.smso.site</code>)` },
        ])}
      `,
    })
  );

  // Page 39 (หน้า 35): 4.5 Analysis Ch 4
  pages.push(
    renderAnalysisPage({
      id: "sec-4-5",
      runningChapter: "บทที่ 4: เครื่องมือช่วยปฏิบัติงาน & ข้อมูลส่วนตัว",
      code: "4.5",
      chLabel: "บทที่ 4 — QR Code, Short URL, BG Remove & ข้อมูลส่วนตัว",
      comparisons: [
        {
          aspect: "การสร้าง QR Code งานราชการ",
          legacy: "ใช้เว็บฟรีภายนอก มีโฆษณา ใส่ตรา พม./ครุฑยาก และอาจหมดอายุ (Dynamic Trial) จนสแกนไม่ได้",
          smart: "<strong>Static QR Code ถาวร 100%</strong> ใส่ตรา พม./ตราครุฑ พร้อมพิมพ์ <code>ป้ายประชาสัมพันธ์ A4</code> &amp; SVG ไวนิล",
          benefit: "เชื่อถือได้ตามมาตรฐานราชการ ไม่มีวันหมดอายุตลอดชีพ และลดค่าจ้างออกแบบภายนอก",
        },
        {
          aspect: "การจัดการลิงก์เอกสารยาว",
          legacy: "ลิงก์ Google Drive/Forms ยาวหลายบรรทัด จำไม่ได้ และถ้าแก้ไฟล์ใหม่ต้องพิมพ์ป้าย QR ใหม่ทั้งหมด",
          smart: "<code>Short URL (/s/ชื่อย่อ)</code> ภายใต้โดเมน <code>smso.site</code> แก้ไขปลายทางได้ตลอดพร้อมนับสถิติคลิก",
          benefit: "สื่อสารสั้นกระชับ น่าเชื่อถือในโดเมนหน่วยงาน และปรับลิงก์ได้โดยไม่ต้องทิ้งป้ายเดิม",
        },
        {
          aspect: "การแต่งภาพ/ลบพื้นหลังบัตร",
          legacy: "อัปโหลดรูปข้าราชการ ลายเซ็น หรือตรายางขึ้นเว็บต่างประเทศ (เสี่ยงด้านข้อมูลส่วนบุคคล/PDPA)",
          smart: "<code>BG Remove 100% Client-side</code> ประมวลผลบนเครื่องตัวเอง ไม่ส่งไฟล์ออกนอกเซิร์ฟเวอร์",
          benefit: "รักษาความปลอดภัยของภาพถ่ายบุคคล/ลายเซ็น 100% และทำรูปติดบัตร 1 / 1.5 นิ้ว ก.พ. ได้ทันที",
        },
      ],
      specialFeatures: [
        {
          icon: "🖨️",
          title: "โหมดพิเศษ ป้ายประชาสัมพันธ์ขนาด A4 ทางการ",
          desc: "สร้างป้ายตั้งโต๊ะ/หน้าห้องประชุมที่มี <strong>ตรากระทรวง พม.</strong> หัวเรื่อง วิธีสแกน ชื่อหน่วยงาน และ QR Code สั่งพิมพ์ A4 ได้ในคลิกเดียว",
        },
        {
          icon: "🔄",
          title: "Short URL เชื่อมตรงกับ QR Code (Dynamic Link + Static Print)",
          desc: "จากหน้า Short URL กด <em>🎨 แต่ง QR ป้าย A4</em> เพื่อผูก QR เข้ากับลิงก์ย่อ ทำให้แก้เอกสารปลายทางภายหลังได้โดย QR ป้ายเดิมยังใช้ได้",
        },
        {
          icon: "🔒",
          title: "BG Remove ทำงานผ่าน Web Canvas บนเครื่อง 100%",
          desc: "ประมวลผลตัดขอบภาพ ความไว (Tolerance), เกลี่ยขอบนุ่ม (Feathering) และแปรงกู้คืน/ลบในเบราว์เซอร์ภายใน ~0.05 วินาที",
        },
      ],
      proTips: [
        "<strong>ใช้สูตรคู่ “Short URL ➜ แต่ง QR ป้าย A4” เสมอ</strong> เมื่อทำแบบลงทะเบียนประชุมหรือคลังเอกสาร เพื่อให้เปลี่ยนลิงก์ปลายทางทีหลังได้แม้พิมพ์แจกไปแล้ว",
        "<strong>เลือก Level H (30%) เมื่อใส่ตราสัญลักษณ์ พม. หรือครุฑตรงกลาง QR</strong> เพื่อรับประกันว่ากล้องสมาร์ตโฟนสแกนติดง่ายแม้ป้ายมีความยับหรือแสงน้อย",
        "<strong>หลังลบพื้นหลังลายเซ็นหรือตราประทับใน BG Remove ให้เลือกพื้นหลัง “โปร่งใส (PNG)”</strong> แล้วนำไปวางบนเอกสาร Word/PDF ได้อย่างแนบเนียน",
      ],
    })
  );

  // =========================================================================
  // CHAPTER 5 (หน้า 36–38)
  // =========================================================================

  // Page 40 (หน้า 36): Ch 5 + 5.1 RBAC Matrix
  pages.push(
    renderContentPage({
      id: "ch5",
      runningChapter: "บทที่ 5: ระบบสิทธิ์การใช้งาน (RBAC) & โมดูลจำกัดสิทธิ์",
      bodyHtml: `
        ${renderChapterBanner(
          5,
          "ระบบสิทธิ์การใช้งาน (RBAC) และโมดูลจำกัดสิทธิ์ (🔒)",
          "เมทริกซ์สิทธิ์ทั้ง 17 โมดูล × 4 บทบาท (lib/rbac.ts) และโมดูลสำหรับผู้บริหารและผู้ดูแลระบบ",
          "indigo"
        )}
        ${renderSectionHead("5.1", "ตารางสิทธิ์การเข้าถึงตามบทบาท (RBAC Permission Matrix)", "อ้างอิงค่ากำหนดมาตรฐาน <code>INITIAL_ROLE_PERMISSIONS</code> ใน <code>lib/rbac.ts</code>", true)}

        <div class="role-summary-strip">
          <div class="rs-chip admin">👑 <strong>Admin:</strong> 17 / 17 โมดูล</div>
          <div class="rs-chip mgr">👔 <strong>Manager:</strong> 15 / 17 โมดูล</div>
          <div class="rs-chip mem">👤 <strong>Member:</strong> 14 / 17 โมดูล</div>
          <div class="rs-chip guest">🎟️ <strong>Guest:</strong> 6 / 17 โมดูล</div>
        </div>

        <table class="std-table rbac-table">
          <thead>
            <tr>
              <th style="width: 6%; text-align:center;">#</th>
              <th style="width: 40%;">โมดูลระบบ (Module)</th>
              <th style="width: 18%;">เส้นทาง (Route)</th>
              <th style="width: 9%; text-align:center;">Admin</th>
              <th style="width: 9%; text-align:center;">Manager</th>
              <th style="width: 9%; text-align:center;">Member</th>
              <th style="width: 9%; text-align:center;">Guest</th>
            </tr>
          </thead>
          <tbody>
            ${RBAC_ROWS.map((r) => {
              const mark = (v) =>
                v === true
                  ? `<span class="perm yes">✓</span>`
                  : v === "cond"
                  ? `<span class="perm cond" title="เฉพาะ Admin หรือผู้ได้รับสิทธิ์แก้ไขลงเวลา">⚠️*</span>`
                  : `<span class="perm no">🔒</span>`;
              const rowClass = !r.mem ? ' class="locked-row"' : "";
              return `
                <tr${rowClass}>
                  <td style="text-align:center;">${r.no}</td>
                  <td>${r.icon} <strong>${esc(r.name)}</strong></td>
                  <td><code>${esc(r.route)}</code></td>
                  <td style="text-align:center;">${mark(r.admin)}</td>
                  <td style="text-align:center;">${mark(r.mgr)}</td>
                  <td style="text-align:center;">${mark(r.mem)}</td>
                  <td style="text-align:center;">${mark(r.guest)}</td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>

        <p class="rbac-footnote">
          <strong>หมายเหตุ:</strong> ✓ = เข้าใช้งานได้ตามสิทธิ์มาตรฐาน · 🔒 = ไม่มีสิทธิ์เข้าถึงตามบทบาทเริ่มต้น · <code>⚠️*</code> (<code>ลงเวลาราชการ</code>) เข้าถึงได้เฉพาะ <code>Admin</code> หรือผู้ที่ได้รับการกำหนดสิทธิ์ในรายชื่อผู้แก้ไขลงเวลา (<code>Authorized Editors</code>) โดยตรง
        </p>
      `,
    })
  );

  // Page 41 (หน้า 37): 5.2 Locked Modules Detail
  pages.push(
    renderContentPage({
      id: "sec-5-2",
      runningChapter: "บทที่ 5: ระบบสิทธิ์การใช้งาน (RBAC) & โมดูลจำกัดสิทธิ์",
      bodyHtml: `
        ${renderSectionHead("5.2", "รายละเอียด 3 โมดูลที่แสดงสัญลักษณ์ 🔒 สำหรับบทบาทพนักงาน (Member)", "โมดูลเฉพาะบทบาท <code>Admin</code>, <code>Manager</code> และผู้ได้รับมอบหมายสิทธิ์")}

        <p class="lead-p">
          บัญชีระดับ <strong>👤 พนักงาน (Member)</strong> จะเห็นสัญลักษณ์ <strong>🔒</strong> (ไม่มีสิทธิ์เข้าถึงตามบทบาทปัจจุบัน) ที่เมนู 3 รายการต่อไปนี้ เพื่อความปลอดภัยและธรรมาภิบาลข้อมูลของสำนักงาน:
        </p>

        <div class="locked-card">
          <div class="lc-head">
            <div class="lc-badge indigo">📈 รายงาน (Reports &amp; Analytics) · <code>/reports</code></div>
            <div class="lc-role">สิทธิ์เข้าถึง: Admin &amp; Manager</div>
          </div>
          <ul class="bullet-tight">
            <li><strong>แดชบอร์ดคำนวณสด (Live Computed):</strong> สรุปสถิติจาก Supabase PostgreSQL Real-time ใน 4 มิติ ได้แก่ อัตราความสำเร็จของภารกิจ Kanban, สถิติการประชุม (ออนไลน์/ออนไซต์), คำขอใช้รถราชการ, และงบค่าน้ำมันขอใช้สะสม</li>
            <li><strong>การส่งออกรายงานทางราชการ:</strong> รองรับปุ่ม <strong>📊 ส่งออก CSV (สตง.)</strong> และ <strong>📑 ส่งออก PDF</strong> สำหรับจัดทำรายงานผลการดำเนินงานประจำเดือน</li>
          </ul>
        </div>

        <div class="locked-card">
          <div class="lc-head">
            <div class="lc-badge teal">⏱️ ลงเวลาราชการ (Attendance Management) · <code>/attendance</code></div>
            <div class="lc-role">สิทธิ์เข้าถึง: Admin หรือผู้ได้รับสิทธิ์แก้ไขลงเวลา</div>
          </div>
          <ul class="bullet-tight">
            <li><strong>สถาปัตยกรรม Hybrid 3 ฐานข้อมูล:</strong> เชื่อมเครื่องสแกนลายนิ้วมือ <code>HIP CMi681S</code> ↔ <code>MariaDB บน Synology NAS</code> ↔ <code>Supabase Cloud</code> รองรับโหมด <strong>☁️ Cloud Replica</strong> และคิวสั่งซิงก์ระยะไกล (Remote Sync Queue)</li>
            <li><strong>2 มุมมองหลัก:</strong> <strong>📋 รายการบันทึกเวลาทั้งหมด</strong> (กรองตามปฏิทินปีงบประมาณไทย ต.ค.–ก.ย.) และ <strong>📊 รายงานประจำวัน (ID 2–42)</strong> แยก 2 ชุดมาตรฐาน (<code>1. ขรก./พรก.</code> และ <code>2. พนง.กองทุน/จ้างเหมา</code>)</li>
            <li><strong>การส่งออกและจับคู่:</strong> ส่งออก <strong>📊 Excel 2 ชีท (.xlsx)</strong>, <strong>📝 Word (.docx)</strong>, <strong>📄 PDF (A4)</strong> พร้อมหน้าต่าง <strong>👥 จับคู่รหัสสแกน (User ID)</strong></li>
          </ul>
        </div>

        <div class="locked-card">
          <div class="lc-head">
            <div class="lc-badge amber">⚙️ จัดการระบบ (Admin Panel) · <code>/admin</code></div>
            <div class="lc-role">สิทธิ์เข้าถึง: Admin เท่านั้น</div>
          </div>
          <ul class="bullet-tight">
            <li><strong>ศูนย์ควบคุม 10 แท็บครบวงจร:</strong> <code>👥 สมาชิก &amp; สิทธิ์</code>, <code>📬 คำขอสิทธิ์ใหม่</code>, <code>🔒 กำหนดสิทธิ์ (RBAC Matrix)</code>, <code>💬 ห้องสื่อสารองค์กร</code>, <code>🚗 ยานพาหนะราชการ</code>, <code>🏛️ ห้องประชุม &amp; สถานที่</code>, <code>🏢 โครงสร้างกลุ่มงาน</code>, <code>📜 ทะเบียนหนังสือเวียน</code>, <code>📜 Audit Logs</code>, และ <code>💾 Synology NAS</code></li>
          </ul>
        </div>

        ${renderCallout(
          "warn",
          "⚠️",
          "การขอเปิดสิทธิ์โมดูลที่ล็อก 🔒",
          "หากเจ้าหน้าที่มีความจำเป็นต้องเข้าถึงโมดูลรายงานหรือจัดการลงเวลาราชการตามคำสั่งมอบหมายงาน ให้ประสานงาน <strong>ผู้ดูแลระบบ (Admin)</strong> เพื่อพิจารณากำหนดสิทธิ์ใน <code>RBAC Matrix</code> หรือรายชื่อผู้แก้ไขลงเวลา"
        )}
      `,
    })
  );

  // Page 42 (หน้า 38): 5.3 Analysis Ch 5
  pages.push(
    renderAnalysisPage({
      id: "sec-5-3",
      runningChapter: "บทที่ 5: ระบบสิทธิ์การใช้งาน (RBAC) & โมดูลจำกัดสิทธิ์",
      code: "5.3",
      chLabel: "บทที่ 5 — ระบบสิทธิ์ RBAC, รายงานผู้บริหาร, ลงเวลาราชการ & Admin Panel",
      comparisons: [
        {
          aspect: "การจัดเก็บเวลาสแกนนิ้ว",
          legacy: "ต้องไปดึงไฟล์จากเครื่องสแกนด้วยสาย LAN/USB แล้วนำมาจัดคอลัมน์ใน Excel ทุกเช้าทีละชุด",
          smart: "ซิงก์ตรงจากเครื่อง <code>HIP CMi681S</code> ลง <strong>MariaDB NAS + Supabase</strong> พร้อมออก Excel/Word/PDF 2 ชุดทันที",
          benefit: "ลดงานธุรการประจำวันลงกว่า 80% และรองรับดูย้อนหลังแบบ Cloud Replica",
        },
        {
          aspect: "การสรุปรายงานผู้บริหาร",
          legacy: "รวบรวมตัวเลขงาน ประชุม และค่าน้ำมันจากหลายไฟล์/หลายฝ่ายกว่าจะสรุปได้ใช้เวลาหลายวัน",
          smart: "หน้า <code>📈 รายงาน</code> คำนวณสดแบบ Realtime จากฐานข้อมูล พร้อมปุ่มส่งออก <strong>CSV (สตง.) / PDF</strong>",
          benefit: "ผู้บริหารเห็นตัวเลขจริงทันเหตุการณ์ ไม่มีข้อมูลตกหล่นหรือคลาดเคลื่อน",
        },
        {
          aspect: "การควบคุมสิทธิ์ & ตรวจสอบ",
          legacy: "ไม่มีระบบ Audit Log บันทึกว่าใครเปิดดู แก้ไข หรือปฏิเสธคำขอใด เมื่อไร",
          smart: "<code>RBAC Matrix 4 บทบาท</code> แยกสิทธิ์ 17 โมดูลชัดเจน พร้อม <code>Audit Logs</code> ตรวจสอบย้อนหลังได้",
          benefit: "ยกระดับธรรมาภิบาลและความปลอดภัยสารสนเทศตามมาตรฐานหน่วยงานรัฐ",
        },
      ],
      specialFeatures: [
        {
          icon: "⏱️",
          title: "Hybrid 3-DB Attendance + Remote Sync Queue",
          desc: "ผสานเครื่องสแกน <code>HIP CMi681S</code> + <code>Synology MariaDB</code> + <code>Supabase</code> สั่งซิงก์จากระยะไกลได้แม้เปิดระบบนอกสำนักงาน",
        },
        {
          icon: "📄",
          title: "ส่งออกรายงานเวลาประจำวัน 2 ชุด (ID 2–42) 3 ฟอร์แมต",
          desc: "สร้างไฟล์ราชการแยกชุด <em>1. ขรก./พรก.</em> และ <em>2. พนง.กองทุน/จ้างเหมา</em> ออกเป็น <strong>.xlsx / .docx / .pdf (A4)</strong> พร้อมหมายเหตุวันลาจากระบบใบลา",
        },
        {
          icon: "🎛️",
          title: "Admin Control Center 10 แท็บ & Dynamic RBAC Matrix",
          desc: "ผู้ดูแลระบบเปิด-ปิดโมดูล ปรับสิทธิ์ตามบทบาท และตั้งค่า Master Data (รถ ห้องประชุม กลุ่มงาน NAS) ได้จากหน้าเดียว",
        },
      ],
      proTips: [
        "<strong>เจ้าหน้าที่ใหม่ต้องแจ้งธุรการจับคู่รหัสสแกนนิ้ว (User ID) กับบัญชีระบบทันที</strong> เพื่อให้หน้า <code>📝 ระบบใบลา</code> ขึ้นสถานะ <code>🔗 เชื่อมเครื่องสแกนนิ้วแล้ว</code>",
        "<strong>เจ้าหน้าที่ฝ่ายบริหาร/ผู้ได้รับคำสั่งงานลงเวลา</strong> สามารถขอสิทธิ์ <code>Authorized Editor</code> เฉพาะหน้า <code>/attendance</code> ได้โดยไม่ต้องเปิดสิทธิ์ Admin ทั้งระบบ",
        "<strong>ผู้บริหารระดับ Manager สามารถส่งออกรายงาน CSV (สตง.) และ PDF</strong> ได้โดยตรงจากเมนู <code>📈 รายงาน</code> เพื่อสรุปผลการดำเนินงานรายเดือน",
      ],
    })
  );

  // =========================================================================
  // CHAPTER 6 (หน้า 39–40)
  // =========================================================================

  // Page 43 (หน้า 39): Ch 6 FAQ + Checklist
  pages.push(
    renderContentPage({
      id: "ch6",
      runningChapter: "บทที่ 6: การแก้ไขปัญหาเบื้องต้น & Checklist ปฏิบัติงาน",
      bodyHtml: `
        ${renderChapterBanner(
          6,
          "ข้อแนะนำการใช้งาน การแก้ไขปัญหาเบื้องต้น & Checklist",
          "ตารางตรวจสอบอาการที่พบบ่อย (FAQ) และแนวทางปฏิบัติงานดิจิทัลประจำวันของเจ้าหน้าที่",
          "teal"
        )}
        ${renderSectionHead("6.1", "ตารางอาการที่พบบ่อยและแนวทางแก้ไขเบื้องต้น (FAQ)", "ตรวจสอบและแก้ไขได้ด้วยตนเองก่อนประสานผู้ดูแลระบบ", true)}

        <table class="std-table faq-table">
          <thead>
            <tr>
              <th style="width: 36%;">อาการที่พบ / สถานการณ์</th>
              <th>สาเหตุและแนวทางแก้ไขเบื้องต้น</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>หน้าต่าง Cloudflare Turnstile ไม่ผ่านขณะเข้าสู่ระบบ</strong></td>
              <td>รีเฟรชหน้าเข้าสู่ระบบใหม่ ตรวจสอบวันที่และเวลาเครื่องให้ตรงตามเวลาประเทศไทย (UTC+7) และหลีกเลี่ยงการใช้ VPN/Proxy ระหว่างล็อกอิน</td>
            </tr>
            <tr>
              <td><strong>หน้า <code>/files</code> หรือ <code>/gallery</code> รอโหลดนานหรือแจ้งปัญหาเครือข่าย</strong></td>
              <td>ระบบกำลังเชื่อม Synology NAS ของสำนักงาน ให้คลิกปุ่ม <strong>🔄</strong> เพื่อโหลดใหม่ หรือกด <strong>สลับบัญชี</strong> และตรวจสอบรหัสผ่าน NAS ในหน้า <code>👤 ข้อมูลส่วนตัว</code></td>
            </tr>
            <tr>
              <td><strong>หน้า <code>/leave</code> แสดงป้าย ⚠️ ยังไม่จับคู่รหัสเครื่องสแกน</strong></td>
              <td>ประสานผู้ดูแลระบบหรือฝ่ายบริหารทั่วไปให้จับคู่รหัสสแกนนิ้ว (User ID) กับบัญชีผู้ใช้ เพื่อเปิดใช้การซิงก์ใบลาลงรายงานลงเวลาราชการอัตโนมัติ</td>
            </tr>
            <tr>
              <td><strong>หน้า <code>/data-hub</code> แท็บ TPMAP ต้องการอัปเดตข้อมูลปีล่าสุด</strong></td>
              <td>กดปุ่ม <strong>🔄 ซิงก์ปี 2569 ล่าสุด</strong> เพื่อดึงข้อมูลชุดล่าสุด หรืออ่านข้อมูลจากแคชมาตรฐาน <strong>💾 แคชใน Supabase</strong> ได้ทันที</td>
            </tr>
            <tr>
              <td><strong>สร้าง QR Code แล้วต้องการเปลี่ยน URL ปลายทางภายหลัง</strong></td>
              <td>ให้ย่อลิงก์ผ่าน <strong>🔗 Short URL</strong> ก่อน แล้วกดปุ่ม <strong>🎨 แต่ง QR ป้าย A4</strong> เพื่อผูก QR Code กับลิงก์ <code>/s/ชื่อย่อ</code> ซึ่งแก้ปลายทางได้ตลอดโดยไม่ต้องพิมพ์ป้ายใหม่</td>
            </tr>
            <tr>
              <td><strong>เมนูบางรายการแสดงสัญลักษณ์ 🔒</strong></td>
              <td>เป็นการควบคุมสิทธิ์ตามบทบาท (RBAC) ให้ประสาน <strong>ผู้ดูแลระบบ (Admin)</strong> เพื่อตรวจสอบและกำหนดสิทธิ์ตามบทบาทหน้าที่ที่ได้รับมอบหมาย</td>
            </tr>
          </tbody>
        </table>

        ${renderSectionHead("6.2", "Checklist ปฏิบัติงานดิจิทัลประจำวัน (Daily Workflow Checklist)", "", true)}
        <div class="checklist-grid">
          <div class="chk-box"><strong>1. ช่วงเช้า (08:30 น.):</strong> เปิด <code>Dashboard</code> และ <code>🔔 ศูนย์การแจ้งเตือน</code> เพื่อตรวจหนังสือเวียนเข้า งานค้าง และนัดประชุมวันนี้</div>
          <div class="chk-box"><strong>2. ระหว่างวัน:</strong> ประสานงานผ่าน <code>💬 แชททีม</code> อัปเดตสถานะ <code>📋 ภารกิจงาน</code> และยื่นจองรถ/ใบลาออนไลน์ล่วงหน้า</div>
          <div class="chk-box"><strong>3. สารบรรณ &amp; สื่อ:</strong> เก็บไฟล์ราชการบน <code>📁 เอกสาร NAS</code> ภาพกิจกรรมใน <code>📸 ภาพ &amp; สื่อ</code> และเผยแพร่ด้วย <code>Short URL + QR</code></div>
          <div class="chk-box"><strong>4. ก่อนเลิกงาน (16:30 น.):</strong> ตรวจสอบสถานะการส่งคืนรถ/ข้อสั่งการปักหมุด และคลิกปุ่ม <strong>ออกจากระบบ</strong> เมื่อใช้เครื่องส่วนกลาง</div>
        </div>
      `,
    })
  );

  // Page 44 (หน้า 40): 6.3 Cross-Module Synergy & Overall Value Analysis
  pages.push(
    renderAnalysisPage({
      id: "sec-6-3",
      runningChapter: "บทที่ 6: การแก้ไขปัญหาเบื้องต้น & Checklist ปฏิบัติงาน",
      code: "6.3",
      chLabel: "บทที่ 6 — ภาพรวมความคุ้มค่าทั้งระบบ (Paper Office vs Smart MSO)",
      comparisons: [
        {
          aspect: "ต้นทุนทรัพยากรสำนักงาน",
          legacy: "สิ้นเปลืองกระดาษ หมึกพิมพ์ แฟ้มเอกสาร และพื้นที่ตู้เก็บเอกสารจำนวนมากทุกปี",
          smart: "ลดงานกระดาษในหนังสือเวียน ใบลา คำขอรถ และการค้นหาคำสั่ง เก็บบนระบบ Hybrid Cloud + NAS",
          benefit: "ประหยัดงบวัสดุสำนักงานและลดระยะเวลาเดินเอกสารข้ามกลุ่มงานอย่างชัดเจน",
        },
        {
          aspect: "ความต่อเนื่องแม้ทำงานนอกพื้นที่",
          legacy: "หากอยู่นอกสำนักงาน (ลงพื้นที่ 11 อำเภอ/ราชการ) เข้าถึงไฟล์และอนุมัติเอกสารไม่ได้",
          smart: "ใช้งานได้ทุกที่ผ่าน <code>https://www.smso.site</code> ทั้งเดสก์ท็อปและมือถือ เชื่อม Synology NAS ปลอดภัย",
          benefit: "ผู้บริหารอนุมัติงานด่วนได้ทันเวลา และทีมลงพื้นที่เปิดดูข้อมูล TPMAP/แบบฟอร์มได้ทันที",
        },
        {
          aspect: "ความเชื่อมโยงระหว่างข้อมูล",
          legacy: "ข้อมูลแต่ละฝ่ายแยกส่วนเป็น Silo ไม่คุยกัน ต้องคีย์ซ้ำหลายรอบ",
          smart: "ข้อมูลเชื่อมโยงเป็นเครือข่ายเดียว (ใบลา ➜ ลงเวลา, แชท ➜ NAS/ประชุม, Short URL ➜ ป้าย QR A4)",
          benefit: "ข้อมูลชุดเดียวสอดคล้องกันทั้งสำนักงาน (Single Source of Truth)",
        },
      ],
      specialFeatures: [
        {
          icon: "🔄",
          title: "Cross-Module Integration เชื่อมการทำงานอัตโนมัติ",
          desc: "ออกแบบให้ทุกโมดูลส่งต่อข้อมูลถึงกัน เช่น <em>ใบลาอนุมัติ ➜ ลงเวลาราชการ</em>, <em>แชทกลุ่ม ➜ ประชุมกลุ่ม &amp; NAS</em>, และ <em>Short URL ➜ QR A4</em>",
        },
        {
          icon: "🏛️",
          title: "Hybrid Cloud + On-Premise Architecture",
          desc: "ผสานความเร็วของ <strong>Supabase Realtime Cloud</strong> เข้ากับความปลอดภัยและการควบคุมกรรมสิทธิ์ข้อมูลราชการบน <strong>Synology NAS</strong>",
        },
        {
          icon: "📋",
          title: "ปรับให้สอดคล้องระเบียบราชการ พมจ.กำแพงเพชร 100%",
          desc: "เลขไทยอัตโนมัติ ปีงบประมาณไทย (ต.ค.–ก.ย.) 4 กลุ่มภารกิจหลัก แบบฟอร์ม พมจ.กพ 02 และ 11 อำเภอ 78 ตำบลจริง",
        },
      ],
      proTips: [
        "<strong>ใช้ช่องค้นหาด้านบนสุดของ Header</strong> เมื่อจำไม่ได้ว่าเอกสารหรือเพื่อนร่วมงานอยู่ในเมนูใด ระบบช่วยค้นหาข้อมูลข้ามโมดูลได้ทันที",
        "<strong>จัดทำ Shortcut บนหน้าจอเดสก์ท็อปหรือติดตั้งเป็น PWA</strong> ผ่านเบราว์เซอร์ Chrome/Edge เพื่อให้เปิดใช้งาน Smart MSO ได้เหมือนโปรแกรมประยุกต์",
        "<strong>รายงานปัญหาหรือข้อเสนอแนะฟีเจอร์ใหม่</strong> ผ่านกลุ่มแชทกลางหรือผู้ดูแลระบบ เพื่อให้ระบบได้รับการพัฒนาต่อเนื่องตามภารกิจหน้างานจริง",
      ],
    })
  );

  // =========================================================================
  // CHAPTER 7 (หน้า 41–42) — FUTURE HRM & CRM ROADMAP + CREDITS
  // =========================================================================

  // Page 45 (หน้า 41): Ch 7 Banner + 7.1 CRM Modules (Home Visit Online & Online Social Clinic)
  pages.push(
    renderContentPage({
      id: "ch7",
      runningChapter: "บทที่ 7: แนวทางการพัฒนาระบบในอนาคต (HRM & CRM Roadmap)",
      bodyHtml: `
        ${renderChapterBanner(
          7,
          "แนวทางการพัฒนาระบบในอนาคต (HRM & CRM Roadmap)",
          "ทิศทางการต่อยอด Smart MSO สู่ระบบบริหารจัดการบุคลากร (HRM) และระบบดูแลประชาชนกลุ่มเปราะบาง (CRM)",
          "indigo"
        )}
        ${renderSectionHead("7.1", "แนวทางต่อยอดด้าน CRM เพื่อประชาชนและกลุ่มเปราะบาง (Citizen Relationship Management)", "ยกระดับงานบริการสังคมเชิงรุกของ พมจ.กำแพงเพชร ครบทั้ง 11 อำเภอ 78 ตำบล", true)}

        <div class="future-grid">
          <div class="future-card fc-pink">
            <div class="fc-head">
              <span class="fc-badge">CRM 1</span>
              <h4>🏡 ระบบเยี่ยมบ้านออนไลน์ (Home Visit Online)</h4>
            </div>
            <ul class="bullet-tight">
              <li><strong>แบบบันทึกเยี่ยมบ้านภาคสนาม (Mobile-Ready):</strong> นักพัฒนาสังคม/นักสังคมสงเคราะห์ บันทึกแบบประเมินสภาพความเป็นอยู่ ปัญหา 5 มิติ และความต้องการช่วยเหลือจากหน้างานผ่านมือถือได้ทันที</li>
              <li><strong>ปักหมุดพิกัด GPS &amp; ภาพถ่ายลงพื้นที่:</strong> ระบุตำแหน่งครัวเรือนเป้าหมายบนแผนที่จังหวัดกำแพงเพชร เก็บภาพ Before–After บน <code>Synology NAS</code> อัตโนมัติ พร้อมแผนที่ความร้อน 11 อำเภอ</li>
              <li><strong>เชื่อมข้อมูล TPMAP &amp; ศรส. 1300:</strong> ดึงรายชื่อตกเกณฑ์ จปฐ. จากระบบ TPMAP มาเปิดเคสติดตามเยี่ยมบ้านต่อเนื่องจนพ้นเกณฑ์ความเปราะบาง</li>
            </ul>
          </div>

          <div class="future-card fc-teal">
            <div class="fc-head">
              <span class="fc-badge teal">CRM 2</span>
              <h4>🩺 คลินิกทางสังคมออนไลน์ (Online Social Clinic)</h4>
            </div>
            <ul class="bullet-tight">
              <li><strong>นัดหมายคิว &amp; ให้คำปรึกษาทางไกล (Tele-Counseling):</strong> เปิดช่องทางให้ประชาชนหรือเครือข่าย อพม. จองเวลาขอรับคำปรึกษาปัญหาครอบครัว เด็ก สตรี ผู้สูงอายุ และคนพิการแบบวิดีโอคอล/แชท</li>
              <li><strong>ระบบส่งต่อเคสสหวิชาชีพ:</strong> ส่งต่อคำร้องระหว่าง <em>นักสังคมสงเคราะห์ — นิติกร — นักจิตวิทยา — ศูนย์บริการคนพิการ</em> พร้อมบันทึกความก้าวหน้าการช่วยเหลือแบบครบวงจร</li>
              <li><strong>คุ้มครองข้อมูลส่วนบุคคล (PDPA Consent):</strong> จัดเก็บบันทึกเคสอย่างปลอดภัย ควบคุมสิทธิ์การเข้าถึงข้อมูลเปราะบางตามบทบาทหน้าที่ (Confidential RBAC)</li>
            </ul>
          </div>
        </div>

        <div class="future-card fc-indigo" style="margin-top: 2.5mm;">
          <div class="fc-head">
            <span class="fc-badge indigo">CRM 3</span>
            <h4>🤝 ฐานข้อมูลสวัสดิการแบบ 360 องศา &amp; เครือข่าย อพม. 11 อำเภอ</h4>
          </div>
          <p class="fc-p">
            บูรณาการประวัติการรับสิทธิสวัสดิการทุกประเภท (เงินสงเคราะห์เด็กในครอบครัวยากจน, เบี้ย/บัตรคนพิการ, เงินกู้ยืมประกอบอาชีพ, เงินอุดหนุนซ่อมแซมบ้าน) เข้าด้วยกันในรหัสบัตรประชาชนเดียว พร้อมช่องทางให้ <strong>อาสาสมัครพัฒนาสังคมและความมั่นคงของมนุษย์ (อพม.)</strong> ทั้ง 78 ตำบลรายงานเคสเร่งด่วนเข้าสู่ศูนย์ปฏิบัติการ พมจ. ได้แบบเรียลไทม์
          </p>
        </div>

        ${renderCallout(
          "tip",
          "🚀",
          "ความพร้อมของโครงสร้างพื้นฐานเดิมในการต่อยอด CRM",
          "ระบบ Smart MSO มีรากฐาน <strong>TPMAP 78 ตำบล</strong>, <strong>Synology NAS จัดเก็บไฟล์/ภาพ</strong>, และ <strong>ระบบ Short URL + QR Code</strong> อยู่แล้ว จึงสามารถต่อยอดเปิดใช้งานระบบเยี่ยมบ้านและคลินิกออนไลน์ได้ทันทีโดยไม่ต้องเริ่มสร้างฐานระบบใหม่"
        )}
      `,
    })
  );

  // Page 46 (หน้า 42): 7.2 HRM + 7.3 Roadmap Phases + Comparison + Developer Credit
  pages.push(
    renderContentPage({
      id: "sec-7-2",
      runningChapter: "บทที่ 7: แนวทางการพัฒนาระบบในอนาคต (HRM & CRM Roadmap)",
      bodyHtml: `
        ${renderSectionHead("7.2", "แนวทางต่อยอดด้าน HRM (ระบบบริหารทรัพยากรบุคคลดิจิทัล)", "บูรณาการข้อมูลบุคลากร 40 ท่าน เวลาปฏิบัติราชการ การลา และ KPI ส่วนบุคคล", true)}

        <div class="hrm-3col">
          <div class="hrm-card">
            <div class="hc-t">🪪 แฟ้มประวัติบุคลากรดิจิทัล</div>
            <div class="hc-d">รวมคำสั่งบรรจุ เลื่อนระดับ ประวัติฝึกอบรม และข้อมูล ก.พ. 7 ออนไลน์ พร้อมแจ้งเตือนวันครบกำหนดสัญญาจ้าง</div>
          </div>
          <div class="hrm-card">
            <div class="hc-t">📚 แผนพัฒนาทักษะ (IDP / Training)</div>
            <div class="hc-d">บันทึกชั่วโมงอบรมรายปี เสนอขอไปราชการอบรม-สัมมนา และเก็บเกียรติบัตรดิจิทัลบน NAS ประจำตัวบุคคล</div>
          </div>
          <div class="hrm-card">
            <div class="hc-t">📊 ประเมินผลรอบ 6 เดือน (KPI)</div>
            <div class="hc-d">ดึงสถิติตรงจาก <code>ลงเวลาราชการ (HIP CMi681S)</code> + <code>วันลาที่อนุมัติ</code> + <code>ความสำเร็จงาน Kanban</code> มาสรุปผลประเมิน</div>
          </div>
        </div>

        ${renderSectionHead("7.3", "แผนการพัฒนา 3 ระยะ (Phase 1–3) & วิเคราะห์ความคุ้มค่าในอนาคต", "", true)}

        ${renderWorkflow(
          [
            { step: "Phase 1 (ปัจจุบัน)", label: "Smart Virtual Office", sub: "17 โมดูล + NAS + TPMAP", highlight: true },
            { step: "Phase 2 (ระยะกลาง)", label: "Field CRM & Clinic", sub: "เยี่ยมบ้าน Online + คลินิกสังคม" },
            { step: "Phase 3 (ระยะยาว)", label: "Unified HRM & AI Hub", sub: "ประเมินผลรอบ 6 ด. + วิเคราะห์เชิงพยากรณ์" },
          ],
          "indigo"
        )}

        <table class="std-table ana-table" style="margin-bottom: 2.2mm;">
          <thead>
            <tr>
              <th style="width: 24%;">มิติการต่อยอดอนาคต</th>
              <th style="width: 38%;">ข้อจำกัดแบบเดิม (ลงพื้นที่ / ประเมินคน)</th>
              <th style="width: 38%;">สิ่งที่ Smart MSO HRM &amp; CRM จะเข้ามายกระดับ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>เยี่ยมบ้าน &amp; คลินิกสังคม</strong></td>
              <td>จดแบบฟอร์มกระดาษหน้างาน กลับมาพิมพ์รายงานซ้ำที่สำนักงาน ไม่เห็นแผนที่ความช่วยเหลือซ้ำซ้อน</td>
              <td>บันทึกพิกัด GPS ภาพถ่าย &amp; ปรึกษาออนไลน์จากภาคสนาม/บ้านประชาชน เชื่อม TPMAP &amp; ศรส. 1300 ทันที</td>
            </tr>
            <tr>
              <td><strong>การบริหารงานบุคคล HRM</strong></td>
              <td>รวบรวมสถิติลา มาสาย อบรม และผลปฏิบัติงานรอบ 6 เดือนจากเอกสารหลายแฟ้ม</td>
              <td>ดึงข้อมูลเวลาเข้างาน + วันลา + ภารกิจ Kanban + IDP อัตโนมัติ ลดภาระงานบุคคลและเป็นธรรมโปร่งใส</td>
            </tr>
          </tbody>
        </table>

        <div class="dev-credit-footer-card">
          <div class="dcf-badge">👨‍💻 คณะผู้จัดทำและพัฒนาซอฟต์แวร์ (Developer Credit)</div>
          <div class="dcf-main">
            ระบบ <strong>Smart MSO Virtual Office</strong> และเอกสารคู่มือมาตรฐานฉบับนี้ พัฒนาและออกแบบโดย
            <strong>${esc(DEV_NAME)}</strong> · ${esc(DEV_POS)} · ${esc(DEV_ORG)}
          </div>
          <div class="dcf-sub">
            มุ่งมั่นขับเคลื่อนระบบราชการดิจิทัล 4.0 เพื่อประสิทธิภาพการทำงานของบุคลากรและการให้บริการประชาชนอย่างทั่วถึงและยั่งยืน
          </div>
        </div>
      `,
    })
  );

  // ================= PAGE 47: BACK COVER =================
  pages.push(`
    <section id="backcover" class="book-page cover-page cover-back" data-page-type="cover">
      <div class="cover-grid-bg"></div>

      <div class="back-inner">
        <div class="back-emblems">
          <div class="logo-card-white small">
            <img src="../../public/images/mso-logo.png" alt="ตรากระทรวง พม." />
          </div>
          <div class="logo-card-white small">
            <img src="../../public/smart-mso-logo.png" alt="Smart MSO Logo" />
          </div>
        </div>

        <h2 class="back-title">Smart MSO Virtual Office</h2>
        <p class="back-org">
          ${esc(DEV_ORG)}<br />
          กระทรวงการพัฒนาสังคมและความมั่นคงของมนุษย์
        </p>

        <div class="back-divider"></div>

        <div class="back-info-card">
          <div class="bi-row">
            <span class="bi-k">🌐 เว็บไซต์ระบบปฏิบัติงาน</span>
            <span class="bi-v">https://www.smso.site</span>
          </div>
          <div class="bi-row">
            <span class="bi-k">💾 ระบบจัดเก็บเอกสารภายใน</span>
            <span class="bi-v">Synology NAS On-Premise (DSM ACL &amp; Photos)</span>
          </div>
          <div class="bi-row">
            <span class="bi-k">📘 รหัสคู่มือมาตรฐาน</span>
            <span class="bi-v">MSO-KPP-UM-002 · ฉบับที่ 2.0 (Annotated Edition · 47 หน้า)</span>
          </div>
          <div class="bi-row">
            <span class="bi-k">👨‍💻 พัฒนาและออกแบบระบบโดย</span>
            <span class="bi-v">${esc(DEV_NAME)} · ${esc(DEV_POS)}</span>
          </div>
          <div class="bi-row">
            <span class="bi-k">🔐 สอบถามหรือขอปรับสิทธิ์ RBAC</span>
            <span class="bi-v">ติดต่อผู้ดูแลระบบ (Admin) ประจำสำนักงาน พมจ.กำแพงเพชร</span>
          </div>
        </div>

        <div class="back-bottom-note">
          เอกสารอิเล็กทรอนิกส์เพื่อการใช้ประโยชน์ในราชการ · สงวนสิทธิ์การใช้งานเฉพาะบุคลากรในสังกัด
        </div>
      </div>

      <div class="cover-bottom-ribbon"></div>
    </section>
  `);

  return pages.join("\n");
}

function buildHtmlDocument() {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>คู่มือการใช้งานระบบ Smart MSO Virtual Office (ฉบับที่ 2.0 — Annotated Edition)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }

    :root {
      --navy: #0F172A;
      --indigo: #4F46E5;
      --indigo-dark: #3730A3;
      --indigo-soft: #EEF2FF;
      --teal: #0D9488;
      --teal-soft: #F0FDFA;
      --pink: #DB2777;
      --amber: #D97706;
      --crimson: #E11D48;
      --slate: #334155;
      --muted: #64748B;
      --border: #E2E8F0;
      --surface: #FFFFFF;
      --bg-card: #F8FAFC;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Sarabun', 'TH Sarabun New', Tahoma, sans-serif;
      color: var(--navy);
      background: #CBD5E1;
      font-size: 10pt;
      line-height: 1.54;
    }

    h1, h2, h3, h4, .ch-pill, .sec-code, .fig-badge, .front-kicker, .fc-badge {
      font-family: 'Kanit', 'Sarabun', Tahoma, sans-serif;
    }

    code {
      font-family: Consolas, 'Sarabun', monospace;
      font-size: 0.87em;
      background: #F1F5F9;
      color: #312E81;
      padding: 0.5px 4px;
      border-radius: 3px;
      border: 0.5px solid #E2E8F0;
    }

    .screen-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 24px;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(8px);
      color: #F8FAFC;
      border-bottom: 1px solid rgba(148, 163, 184, 0.25);
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.25);
    }
    .st-left {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Kanit', 'Sarabun', sans-serif;
      font-size: 13.5px;
    }
    .st-badge {
      padding: 2px 9px;
      border-radius: 999px;
      background: rgba(219, 39, 119, 0.28);
      border: 1px solid rgba(244, 114, 182, 0.55);
      color: #FBCFE8;
      font-size: 11.5px;
    }
    .st-btn {
      font-family: 'Kanit', 'Sarabun', sans-serif;
      background: linear-gradient(135deg, #4F46E5, #0D9488);
      color: #fff;
      border: none;
      padding: 7px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .book-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      padding: 18px 0 36px;
    }

    /* Exact A4 sheet sizing */
    .book-page {
      width: 210mm;
      height: 296.6mm;
      max-height: 296.6mm;
      background: #FFFFFF;
      position: relative;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.2);
      break-after: page;
      page-break-after: always;
    }
    .book-page:last-of-type {
      break-after: auto;
      page-break-after: auto;
    }

    @media print {
      html, body {
        background: #FFFFFF !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print { display: none !important; }
      .book-wrapper { display: block; padding: 0; gap: 0; }
      .book-page { box-shadow: none !important; margin: 0 !important; }
    }

    /* ================= COVERS ================= */
    .cover-page {
      background: linear-gradient(145deg, #090F1E 0%, #17153B 50%, #0F172A 100%);
      color: #F8FAFC;
      display: flex;
      flex-direction: column;
    }
    .cover-grid-bg {
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(circle at 92% 8%, rgba(79, 70, 229, 0.34) 0%, rgba(79, 70, 229, 0) 48%),
        radial-gradient(circle at 8% 92%, rgba(13, 148, 136, 0.26) 0%, rgba(13, 148, 136, 0) 48%),
        linear-gradient(to right, rgba(148, 163, 184, 0.06) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(148, 163, 184, 0.06) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 12mm 12mm, 12mm 12mm;
      pointer-events: none;
    }
    .cover-top-ribbon {
      height: 3.5mm;
      width: 100%;
      background: linear-gradient(90deg, #DB2777 0%, #4F46E5 52%, #0D9488 100%);
      position: relative;
      z-index: 2;
    }
    .cover-bottom-ribbon {
      margin-top: auto;
      height: 3.5mm;
      width: 100%;
      background: linear-gradient(90deg, #0D9488 0%, #4F46E5 52%, #DB2777 100%);
      position: relative;
      z-index: 2;
    }
    .cover-inner {
      position: relative;
      z-index: 2;
      padding: 13mm 15.5mm 12mm;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .cover-org-header {
      display: flex;
      align-items: center;
      gap: 5.5mm;
      padding-bottom: 5mm;
      border-bottom: 1px solid rgba(148, 163, 184, 0.22);
    }
    .cover-logo-pair { display: flex; gap: 3mm; flex-shrink: 0; }
    .logo-card-white {
      width: 21mm;
      height: 21mm;
      background: #FFFFFF;
      border-radius: 4mm;
      padding: 2mm;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    }
    .logo-card-white.small { width: 19mm; height: 19mm; }
    .logo-card-white img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .org-kicker {
      font-family: 'Kanit', sans-serif;
      font-size: 8.2pt;
      letter-spacing: 0.9px;
      color: #F472B6;
      font-weight: 500;
    }
    .org-name {
      font-family: 'Kanit', sans-serif;
      font-size: 13pt;
      font-weight: 600;
      color: #FFFFFF;
      line-height: 1.35;
      margin-top: 1px;
    }
    .org-sub { font-size: 9.6pt; color: #94A3B8; margin-top: 1px; }
    .cover-hero-block { margin-top: 3mm; }
    .doc-class-pill {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(219, 39, 119, 0.22);
      border: 1px solid rgba(244, 114, 182, 0.5);
      color: #FBCFE8;
      font-family: 'Kanit', sans-serif;
      font-size: 9.3pt;
      margin-bottom: 4mm;
    }
    .cover-main-title {
      font-size: 26pt;
      font-weight: 700;
      line-height: 1.32;
      margin: 0 0 4mm;
      color: #FFFFFF;
      letter-spacing: -0.2px;
    }
    .cover-accent-text { color: #67E8F9; font-size: 30pt; }
    .cover-subtitle {
      font-size: 10.8pt;
      line-height: 1.65;
      color: #CBD5E1;
      margin: 0 0 5mm;
    }
    .cover-pill-row { display: flex; flex-wrap: wrap; gap: 2.5mm; }
    .cov-pill {
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.3);
      border-radius: 3mm;
      padding: 2mm 3.6mm;
      font-size: 9pt;
      color: #E2E8F0;
    }
    .cover-preview-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4mm;
      margin-top: 4mm;
    }
    .preview-card-mini {
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 3mm;
      overflow: hidden;
      padding: 2mm;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
    }
    .pc-head {
      font-family: 'Kanit', sans-serif;
      font-size: 8.3pt;
      color: #A5B4FC;
      margin-bottom: 1.5mm;
      padding-left: 1mm;
    }
    .preview-card-mini img {
      width: 100%;
      height: 30mm;
      object-fit: cover;
      object-position: top center;
      border-radius: 1.8mm;
      display: block;
    }
    .cover-dev-strip {
      background: rgba(79, 70, 229, 0.22);
      border: 1px solid rgba(129, 140, 248, 0.4);
      border-radius: 2.8mm;
      padding: 2.4mm 4mm;
      margin-bottom: 3.5mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 9.2pt;
    }
    .dev-badge { font-family: 'Kanit', sans-serif; color: #C7D2FE; font-weight: 500; }
    .dev-info { color: #FFFFFF; }
    .cover-footer-meta {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 3mm;
      padding-top: 4mm;
      border-top: 1px solid rgba(148, 163, 184, 0.24);
    }
    .meta-box {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 2.5mm;
      padding: 2.3mm 3mm;
    }
    .meta-lbl { display: block; font-size: 7.7pt; color: #94A3B8; line-height: 1.3; }
    .meta-val {
      display: block;
      font-family: 'Kanit', sans-serif;
      font-size: 8.7pt;
      font-weight: 500;
      color: #F8FAFC;
      margin-top: 1px;
    }

    /* Back cover */
    .back-inner {
      position: relative;
      z-index: 2;
      flex: 1;
      padding: 24mm 22mm 16mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .back-emblems { display: flex; gap: 4.5mm; margin-bottom: 6mm; }
    .back-title { font-size: 23pt; margin: 0 0 2.5mm; color: #FFFFFF; }
    .back-org { font-size: 11.2pt; color: #CBD5E1; line-height: 1.62; margin: 0; }
    .back-divider {
      width: 48mm;
      height: 1.2mm;
      background: linear-gradient(90deg, #DB2777, #4F46E5, #0D9488);
      border-radius: 99px;
      margin: 6mm 0;
    }
    .back-info-card {
      width: 100%;
      max-width: 152mm;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(148, 163, 184, 0.24);
      border-radius: 4mm;
      padding: 4.5mm 6mm;
      text-align: left;
    }
    .bi-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2.4mm 0;
      border-bottom: 1px dashed rgba(148, 163, 184, 0.2);
      gap: 4mm;
      font-size: 9.5pt;
    }
    .bi-row:last-child { border-bottom: none; }
    .bi-k { color: #A5B4FC; font-weight: 600; white-space: nowrap; }
    .bi-v { color: #F8FAFC; text-align: right; }
    .back-bottom-note { margin-top: 10mm; font-size: 9pt; color: #94A3B8; }

    /* ================= CONTENT PAGES ================= */
    .content-page {
      padding: 11mm 14.5mm 9.5mm 14.5mm;
      display: flex;
      flex-direction: column;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 2mm;
      margin-bottom: 3mm;
      border-bottom: 1.5px solid #E2E8F0;
      font-size: 8.2pt;
      color: var(--muted);
      flex-shrink: 0;
    }
    .ph-left { display: flex; align-items: center; gap: 2.2mm; }
    .v-tag {
      font-style: normal;
      font-family: 'Kanit', sans-serif;
      font-size: 7.4pt;
      color: #BE185D;
      background: #FCE7F3;
      padding: 0 5px;
      border-radius: 99px;
      margin-left: 3px;
    }
    .ph-mark {
      width: 2.5mm;
      height: 2.5mm;
      border-radius: 0.7mm;
      background: linear-gradient(135deg, #4F46E5, #0D9488);
      display: inline-block;
    }
    .ph-right {
      font-family: 'Kanit', sans-serif;
      color: #4F46E5;
      font-weight: 500;
      font-size: 8.3pt;
    }
    .page-body { flex: 0 1 auto; display: flex; flex-direction: column; }
    .page-footer {
      margin-top: auto;
      padding-top: 1.8mm;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.1pt;
      color: var(--muted);
      flex-shrink: 0;
    }
    .page-num-pill {
      font-family: 'Kanit', sans-serif;
      font-weight: 600;
      font-size: 8.5pt;
      background: #EEF2FF;
      color: #3730A3;
      border: 1px solid #C7D2FE;
      padding: 1px 10px;
      border-radius: 999px;
      display: inline-block;
    }

    /* Front Matter */
    .front-title-block {
      margin-bottom: 3.5mm;
      border-left: 4px solid var(--indigo);
      padding-left: 3.5mm;
    }
    .front-title-block.compact-front { margin-bottom: 2.6mm; }
    .front-kicker { font-size: 7.8pt; color: var(--indigo); letter-spacing: 1px; font-weight: 600; }
    .front-h2 { margin: 0.4mm 0 0; font-size: 15.2pt; color: var(--navy); line-height: 1.28; }
    .preface-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 3mm;
      padding: 3.2mm 4.4mm;
      margin-bottom: 3.2mm;
      font-size: 9.4pt;
      line-height: 1.62;
    }
    .preface-card p { margin: 0; text-align: justify; }
    .dev-credit-box {
      display: flex;
      align-items: center;
      gap: 3.5mm;
      background: linear-gradient(120deg, #EEF2FF 0%, #F0FDFA 100%);
      border: 1px solid #C7D2FE;
      border-left: 4.5px solid var(--indigo);
      border-radius: 2.8mm;
      padding: 2.8mm 4mm;
      margin-bottom: 3.2mm;
    }
    .dcb-ico { font-size: 20pt; line-height: 1; }
    .dcb-kicker { font-family: 'Kanit', sans-serif; font-size: 8pt; color: var(--indigo); font-weight: 600; }
    .dcb-name { font-family: 'Kanit', sans-serif; font-size: 11.8pt; color: var(--navy); font-weight: 600; line-height: 1.3; }
    .dcb-role { font-size: 9pt; color: var(--slate); }

    .sub-h3 { font-size: 10.6pt; color: var(--indigo-dark); margin: 2.5mm 0 1.8mm; }
    .legend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2.4mm; }
    .legend-item {
      display: flex;
      align-items: flex-start;
      gap: 2.5mm;
      padding: 2.2mm 2.8mm;
      border-radius: 2.3mm;
      background: #FFFFFF;
      border: 1px solid var(--border);
      font-size: 8.8pt;
      line-height: 1.44;
    }
    .leg-badge {
      font-family: 'Kanit', sans-serif;
      font-size: 8.1pt;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 5px;
      white-space: nowrap;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .leg-badge.indigo { background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE; }
    .leg-badge.pink { background: #FCE7F3; color: #9D174D; border: 1px solid #FBCFE8; }
    .leg-badge.teal { background: #F0FDFA; color: #0F766E; border: 1px solid #99F6E4; }
    .leg-badge.amber { background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A; }

    /* TOC & LOF */
    .lof-lead { margin: 0 0 2.8mm; font-size: 9pt; color: var(--slate); }
    .toc-container { display: flex; flex-direction: column; gap: 0.85mm; }
    .toc-container.toc-dense { gap: 0.6mm; }
    .toc-row {
      display: flex;
      align-items: baseline;
      text-decoration: none;
      color: var(--navy);
      line-height: 1.38;
    }
    .toc-row.level-1 {
      font-family: 'Kanit', sans-serif;
      font-weight: 600;
      font-size: 9pt;
      color: #1E1B4B;
      margin-top: 1.2mm;
      padding: 0.7mm 2mm;
      background: #F1F5F9;
      border-radius: 1.5mm;
    }
    .toc-row.level-2 {
      font-size: 8.5pt;
      color: var(--slate);
      padding-left: 4.5mm;
      padding-right: 2mm;
    }
    .lof-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 5.5mm;
      row-gap: 1.4mm;
    }
    .toc-row.level-fig2 {
      font-size: 8.3pt;
      color: var(--slate);
      padding: 1.15mm 1mm;
      border-bottom: 1px solid #F1F5F9;
      line-height: 1.35;
    }
    .toc-label { flex-shrink: 1; }
    .toc-dots {
      flex: 1;
      border-bottom: 1px dotted #94A3B8;
      margin: 0 2mm;
      min-width: 4mm;
      position: relative;
      top: -2px;
    }
    .toc-pg {
      font-family: 'Kanit', sans-serif;
      font-weight: 600;
      font-size: 8.5pt;
      color: var(--indigo);
      min-width: 5.5mm;
      text-align: right;
      flex-shrink: 0;
    }

    /* Chapter Banner */
    .chapter-banner {
      display: flex;
      align-items: center;
      gap: 3.2mm;
      padding: 2.7mm 4mm;
      border-radius: 2.8mm;
      color: #FFFFFF;
      margin-bottom: 2.6mm;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
    }
    .chapter-banner.accent-indigo { background: linear-gradient(125deg, #0F172A 0%, #3730A3 65%, #4F46E5 100%); }
    .chapter-banner.accent-teal { background: linear-gradient(125deg, #0F172A 0%, #0F766E 65%, #0D9488 100%); }
    .chapter-banner.accent-amber { background: linear-gradient(125deg, #0F172A 0%, #92400E 60%, #D97706 100%); }
    .ch-pill {
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.35);
      padding: 1.2mm 3.2mm;
      border-radius: 2mm;
      font-size: 9pt;
      font-weight: 600;
      white-space: nowrap;
    }
    .ch-title { margin: 0; font-size: 12.6pt; font-weight: 600; line-height: 1.28; }
    .ch-sub { margin: 0.4mm 0 0; font-size: 8.4pt; color: #E2E8F0; line-height: 1.35; }

    /* Section Header */
    .sec-head {
      margin-bottom: 2.3mm;
      padding-bottom: 1.5mm;
      border-bottom: 1px solid #E2E8F0;
    }
    .sec-head.compact { margin-bottom: 1.9mm; padding-bottom: 1.1mm; }
    .sec-title-row { display: flex; align-items: center; gap: 2.2mm; }
    .sec-code {
      background: var(--indigo);
      color: #FFFFFF;
      font-size: 8.6pt;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .sec-title { margin: 0; font-size: 11.4pt; font-weight: 600; color: var(--navy); line-height: 1.3; }
    .menu-crumb { margin-top: 0.8mm; font-size: 8.3pt; color: var(--muted); }
    .menu-crumb span { font-weight: 600; color: var(--teal); }

    /* Annotated Browser Screenshot Frame */
    .shot-figure { margin: 0 auto 2.5mm; width: 100%; }
    .shot-figure.size-normal { width: 170mm; }
    .shot-figure.size-compact { width: 148mm; }

    .browser-frame {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 2.8mm;
      overflow: hidden;
      box-shadow: 0 5px 15px rgba(15, 23, 42, 0.08);
    }
    .browser-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.2mm 2.8mm;
      background: #F1F5F9;
      border-bottom: 1px solid #E2E8F0;
      gap: 2.8mm;
    }
    .win-dots { display: flex; gap: 1.2mm; }
    .dot { width: 2mm; height: 2mm; border-radius: 99px; display: inline-block; }
    .dot.red { background: #F87171; }
    .dot.yellow { background: #FBBF24; }
    .dot.green { background: #34D399; }
    .url-pill {
      flex: 1;
      text-align: center;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 999px;
      padding: 0.3mm 2.5mm;
      font-size: 7.5pt;
      color: #475569;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .live-pill {
      font-family: 'Kanit', sans-serif;
      font-size: 7.1pt;
      color: #9D174D;
      background: #FCE7F3;
      padding: 0.3mm 2mm;
      border-radius: 999px;
      font-weight: 500;
      white-space: nowrap;
    }

    /* 1:1 Pixel-Aligned Stage for Image + Vector Callout Overlay */
    .shot-stage {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 10;
      background: #F8FAFC;
      overflow: hidden;
    }
    .shot-stage img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: fill;
    }
    .anno-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .shot-caption {
      margin-top: 1.4mm;
      text-align: center;
      font-size: 8.6pt;
      color: var(--slate);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.8mm;
      line-height: 1.35;
    }
    .fig-badge {
      background: #EEF2FF;
      color: #3730A3;
      border: 1px solid #C7D2FE;
      font-size: 7.8pt;
      font-weight: 600;
      padding: 0.5px 6.5px;
      border-radius: 99px;
      flex-shrink: 0;
    }

    /* Numbered Steps Matched to SVG Badge Colors */
    .step-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 1.8mm;
    }
    .step-list.step-compact { gap: 1.4mm; }
    .step-list li {
      display: flex;
      align-items: flex-start;
      gap: 2.3mm;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 2.2mm;
      padding: 1.9mm 2.8mm;
      font-size: 9pt;
      line-height: 1.48;
    }
    .step-list.step-compact li {
      padding: 1.45mm 2.5mm;
      font-size: 8.55pt;
      line-height: 1.42;
    }
    .step-num {
      width: 5.2mm;
      height: 5.2mm;
      border-radius: 999px;
      color: #FFFFFF;
      font-family: 'Kanit', sans-serif;
      font-size: 8.3pt;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 0.3mm;
    }
    .bg-indigo { background: var(--indigo); }
    .bg-pink { background: var(--pink); }
    .bg-teal { background: var(--teal); }
    .bg-amber { background: var(--amber); }
    .bg-crimson { background: var(--crimson); }
    .step-txt { flex: 1; }

    /* Callouts & Workflows */
    .callout {
      display: flex;
      align-items: flex-start;
      gap: 2.4mm;
      margin-top: 2.4mm;
      padding: 2.2mm 3.2mm;
      border-radius: 2.4mm;
      font-size: 8.8pt;
      line-height: 1.48;
    }
    .callout-tip { background: #F0FDFA; border: 1px solid #99F6E4; border-left: 4px solid #0D9488; }
    .callout-warn { background: #FFFBEB; border: 1px solid #FDE68A; border-left: 4px solid #D97706; }
    .callout-ico { font-size: 11.5pt; line-height: 1.3; flex-shrink: 0; }
    .callout-title { font-family: 'Kanit', sans-serif; font-weight: 600; font-size: 9pt; color: var(--navy); margin-bottom: 0.4mm; }
    .callout-text { color: var(--slate); }

    .workflow-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.4mm;
      margin: 0 0 2.2mm;
      padding: 1.9mm 2.4mm;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 2.4mm;
    }
    .wf-node {
      flex: 1;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 1.8mm;
      padding: 1.2mm 1.5mm;
      text-align: center;
    }
    .wf-node.wf-highlight { background: #EEF2FF; border-color: #818CF8; }
    .theme-teal .wf-node.wf-highlight { background: #F0FDFA; border-color: #2DD4BF; }
    .wf-step { font-family: 'Kanit', sans-serif; font-size: 7.2pt; color: var(--indigo); font-weight: 600; }
    .theme-teal .wf-step { color: var(--teal); }
    .wf-label { font-family: 'Kanit', sans-serif; font-size: 8.2pt; font-weight: 600; color: var(--navy); line-height: 1.24; }
    .wf-sub { font-size: 7.2pt; color: var(--muted); line-height: 1.24; }
    .wf-arrow { font-size: 8.6pt; color: #64748B; font-weight: 700; flex-shrink: 0; }

    /* Tables */
    .std-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.8pt;
      line-height: 1.45;
      margin-bottom: 2.3mm;
    }
    .std-table th {
      font-family: 'Kanit', sans-serif;
      background: #1E1B4B;
      color: #FFFFFF;
      font-weight: 500;
      text-align: left;
      padding: 1.8mm 2.5mm;
      border: 1px solid #312E81;
      font-size: 8.6pt;
    }
    .std-table td {
      padding: 1.6mm 2.5mm;
      border: 1px solid #CBD5E1;
      vertical-align: top;
    }
    .std-table tbody tr:nth-child(even) { background: #F8FAFC; }

    /* Analysis Pages (1.5, 2.7, 3.4, 4.5, 5.3, 6.3) */
    .ana-block { margin-bottom: 2.8mm; }
    .ana-heading {
      font-family: 'Kanit', sans-serif;
      font-size: 10pt;
      font-weight: 600;
      color: var(--indigo-dark);
      margin-bottom: 1.6mm;
      padding-left: 2.5mm;
      border-left: 3.5px solid var(--pink);
    }
    .ana-table { font-size: 8.45pt; line-height: 1.42; margin-bottom: 0; }
    .ana-table th { padding: 1.5mm 2.2mm; font-size: 8.3pt; }
    .ana-table td { padding: 1.45mm 2.2mm; }
    .td-legacy { color: #64748B; }
    .td-smart { color: #0F172A; background: #F0FDFA; }
    .td-benefit { color: #1E1B4B; font-weight: 500; }

    .sf-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2.4mm;
    }
    .sf-card {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-top: 3px solid var(--teal);
      border-radius: 2.4mm;
      padding: 2.2mm 2.6mm;
    }
    .sf-title {
      font-family: 'Kanit', sans-serif;
      font-size: 8.8pt;
      font-weight: 600;
      color: var(--navy);
      margin-bottom: 0.9mm;
      line-height: 1.3;
    }
    .sf-desc { font-size: 8.2pt; color: var(--slate); line-height: 1.42; }

    .protip-list {
      margin: 0;
      padding: 2.2mm 3.5mm 2.2mm 7mm;
      background: #F0FDFA;
      border: 1px solid #99F6E4;
      border-radius: 2.4mm;
      font-size: 8.55pt;
      line-height: 1.48;
      display: flex;
      flex-direction: column;
      gap: 1.1mm;
    }

    /* Ch 5 RBAC */
    .rbac-table { font-size: 8.35pt; line-height: 1.36; margin-bottom: 1.8mm; }
    .rbac-table th { padding: 1.5mm 2mm; font-size: 8.3pt; }
    .rbac-table td { padding: 1.28mm 2mm; vertical-align: middle; }
    .rbac-table tr.locked-row { background: #FFF1F2 !important; }
    .perm { font-weight: 700; font-size: 8.8pt; }
    .perm.yes { color: #059669; }
    .perm.no { color: #DC2626; }
    .perm.cond { color: #D97706; font-size: 8pt; }
    .role-summary-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.4mm; margin-bottom: 2.4mm; }
    .rs-chip {
      font-family: 'Kanit', sans-serif;
      font-size: 8.4pt;
      padding: 1.4mm 2.2mm;
      border-radius: 2mm;
      text-align: center;
      border: 1px solid var(--border);
    }
    .rs-chip.admin { background: #EEF2FF; color: #3730A3; border-color: #C7D2FE; }
    .rs-chip.mgr { background: #F0FDFA; color: #0F766E; border-color: #99F6E4; }
    .rs-chip.mem { background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }
    .rs-chip.guest { background: #FFFBEB; color: #B45309; border-color: #FDE68A; }
    .rbac-footnote {
      margin: 0;
      font-size: 8.2pt;
      color: var(--slate);
      background: #F8FAFC;
      padding: 1.8mm 2.8mm;
      border-radius: 2mm;
      border: 1px solid var(--border);
    }
    .lead-p { margin: 0 0 2.6mm; font-size: 9.3pt; color: var(--slate); }
    .locked-card {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 2.8mm;
      padding: 2.8mm 3.8mm;
      margin-bottom: 2.8mm;
    }
    .lc-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2mm;
      padding-bottom: 1.4mm;
      border-bottom: 1px solid #E2E8F0;
      gap: 2mm;
    }
    .lc-badge { font-family: 'Kanit', sans-serif; font-weight: 600; font-size: 9.5pt; padding: 0.9mm 2.8mm; border-radius: 2mm; }
    .lc-badge.indigo { background: #EEF2FF; color: #3730A3; }
    .lc-badge.teal { background: #F0FDFA; color: #0F766E; }
    .lc-badge.amber { background: #FFFBEB; color: #92400E; }
    .lc-role {
      font-family: 'Kanit', sans-serif;
      font-size: 8.1pt;
      font-weight: 600;
      color: #991B1B;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      padding: 0.5mm 2.5mm;
      border-radius: 99px;
      white-space: nowrap;
    }
    .bullet-tight {
      margin: 0;
      padding-left: 4.4mm;
      display: flex;
      flex-direction: column;
      gap: 1.2mm;
      font-size: 8.75pt;
      line-height: 1.46;
    }

    /* Ch 6 FAQ */
    .faq-table { font-size: 8.7pt; line-height: 1.45; margin-bottom: 2.8mm; }
    .faq-table td { padding: 1.8mm 2.5mm; }
    .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; }
    .chk-box {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-left: 3.5px solid var(--teal);
      border-radius: 2.2mm;
      padding: 2.2mm 2.8mm;
      font-size: 8.7pt;
      line-height: 1.46;
    }

    /* Ch 7 Future CRM & HRM */
    .future-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
    .future-card {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 2.8mm;
      padding: 3mm 3.4mm;
    }
    .future-card.fc-pink { border-top: 3.5px solid var(--pink); }
    .future-card.fc-teal { border-top: 3.5px solid var(--teal); }
    .future-card.fc-indigo { border-top: 3.5px solid var(--indigo); }
    .fc-head { display: flex; align-items: center; gap: 2mm; margin-bottom: 2mm; }
    .fc-head h4 { margin: 0; font-size: 9.8pt; color: var(--navy); line-height: 1.28; }
    .fc-badge {
      background: var(--pink);
      color: #fff;
      font-size: 7.5pt;
      padding: 1px 7px;
      border-radius: 99px;
      font-weight: 600;
      white-space: nowrap;
    }
    .fc-badge.teal { background: var(--teal); }
    .fc-badge.indigo { background: var(--indigo); }
    .fc-p { margin: 0; font-size: 8.8pt; color: var(--slate); line-height: 1.5; }

    .hrm-3col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.6mm; margin-bottom: 3mm; }
    .hrm-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-left: 3.5px solid var(--indigo);
      border-radius: 2.2mm;
      padding: 2.4mm 2.8mm;
    }
    .hc-t { font-family: 'Kanit', sans-serif; font-size: 9pt; font-weight: 600; color: var(--indigo-dark); margin-bottom: 0.8mm; }
    .hc-d { font-size: 8.3pt; color: var(--slate); line-height: 1.44; }

    .dev-credit-footer-card {
      background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%);
      color: #F8FAFC;
      border-radius: 2.8mm;
      padding: 3.4mm 4.4mm;
      border-left: 4.5px solid #DB2777;
    }
    .dcf-badge {
      font-family: 'Kanit', sans-serif;
      font-size: 8.5pt;
      color: #F9A8D4;
      font-weight: 500;
      margin-bottom: 1mm;
    }
    .dcf-main { font-size: 9.3pt; line-height: 1.5; }
    .dcf-sub { font-size: 8.2pt; color: #CBD5E1; margin-top: 1mm; }
  </style>
</head>
<body>
  <div class="screen-toolbar no-print">
    <div class="st-left">
      <strong>📘 คู่มือการใช้งานระบบ Smart MSO Virtual Office</strong>
      <span class="st-badge">v2.0 Annotated Edition · 47 หน้า (A4)</span>
    </div>
    <button class="st-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF (A4)</button>
  </div>

  <main class="book-wrapper">
    ${buildPagesHtml()}
  </main>
</body>
</html>`;
}

async function main() {
  fs.mkdirSync(path.dirname(HTML_OUT), { recursive: true });
  fs.mkdirSync(path.dirname(PDF_OUT), { recursive: true });
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  const initialHtml = buildHtmlDocument();
  fs.writeFileSync(HTML_OUT, initialHtml, "utf8");

  let browser;
  try {
    try {
      browser = await chromium.launch({ channel: "chrome", headless: true });
    } catch {
      browser = await chromium.launch({ headless: true });
    }

    const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
    const fileUrl = pathToFileURL(HTML_OUT).href;
    await page.goto(fileUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);

    const fontCheck = await page.evaluate(() => ({
      kanit: document.fonts.check("16px Kanit"),
      sarabun: document.fonts.check("16px Sarabun"),
    }));
    console.log(`Fonts loaded -> Kanit: ${fontCheck.kanit}, Sarabun: ${fontCheck.sarabun}`);

    const pageMeta = await page.evaluate(() => {
      const THAI_FRONT_LABELS = ["ก", "ข", "ค", "ง", "จ", "ฉ"];
      const sheets = Array.from(document.querySelectorAll(".book-page"));
      const idToLabel = new Map();
      let frontIdx = 0;
      let bodyNum = 0;

      for (const sec of sheets) {
        const type = sec.getAttribute("data-page-type");
        let label = "";
        if (type === "front") {
          label = THAI_FRONT_LABELS[frontIdx++] ?? String(frontIdx);
        } else if (type === "body") {
          bodyNum += 1;
          label = String(bodyNum);
        }

        if (label) {
          const pill = sec.querySelector(".page-num-pill");
          if (pill) pill.textContent = `หน้า ${label}`;
        }

        if (sec.id && label) idToLabel.set(`#${sec.id}`, label);
        for (const el of sec.querySelectorAll("[id]")) {
          if (el.id && label) idToLabel.set(`#${el.id}`, label);
        }
      }

      const missingTargets = [];
      for (const pgSpan of document.querySelectorAll(".toc-pg[data-target]")) {
        const target = pgSpan.getAttribute("data-target");
        const resolved = idToLabel.get(target);
        if (!resolved) {
          missingTargets.push(target);
        } else {
          pgSpan.textContent = resolved;
        }
      }

      return { totalPages: sheets.length, frontCount: frontIdx, bodyCount: bodyNum, missingTargets };
    });

    console.log(
      `Pagination Summary -> Total sheets: ${pageMeta.totalPages} (Covers: 2, Front: ${pageMeta.frontCount}, Body: ${pageMeta.bodyCount})`
    );
    if (pageMeta.missingTargets.length > 0) {
      throw new Error(`Unresolved TOC/LOF targets: ${pageMeta.missingTargets.join(", ")}`);
    }

    const finalizedHtml = await page.evaluate(() => "<!DOCTYPE html>\n" + document.documentElement.outerHTML);
    fs.writeFileSync(HTML_OUT, finalizedHtml, "utf8");

    const audit = await page.evaluate(() => {
      const brokenImgs = Array.from(document.querySelectorAll("img"))
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.getAttribute("src"));

      const pages = Array.from(document.querySelectorAll(".book-page"));
      const overflows = [];

      pages.forEach((p, idx) => {
        const pageNum = idx + 1;
        const overflowPx = Math.round(p.scrollHeight - p.clientHeight);
        let footerOverlapPx = 0;

        const body = p.querySelector(".page-body");
        const footer = p.querySelector(".page-footer");
        if (body && footer) {
          const br = body.getBoundingClientRect();
          const fr = footer.getBoundingClientRect();
          footerOverlapPx = Math.round(br.bottom - (fr.top - 4));
        }

        if (overflowPx > 2 || footerOverlapPx > 0) {
          overflows.push({
            pageNum,
            id: p.id,
            overflowPx,
            footerOverlapPx,
          });
        }
      });

      return {
        imgCount: document.querySelectorAll("img").length,
        svgOverlayCount: document.querySelectorAll("svg.anno-svg").length,
        brokenImgs,
        overflows,
      };
    });

    console.log(
      `Image & Callout Audit -> Total <img>: ${audit.imgCount}, Broken: ${audit.brokenImgs.length}, Annotated SVG Overlays: ${audit.svgOverlayCount}`
    );
    if (audit.brokenImgs.length > 0) {
      throw new Error(`Broken images detected: ${audit.brokenImgs.join(", ")}`);
    }
    if (audit.overflows.length > 0) {
      console.error("Page Overflow Audit FAILED:", JSON.stringify(audit.overflows, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log("Page Overflow Audit -> 0 overflowing pages, 0 footer overlaps!");

    // Capture preview PNGs of key structural + newly added/annotated pages
    const previewSpecs = [
      { idx: 0, file: "p01-cover.png" },
      { idx: 1, file: "p02-preface-credit.png" },
      { idx: 2, file: "p03-toc.png" },
      { idx: 3, file: "p04-lof.png" },
      { idx: 4, file: "p05-ch1-login-anno.png" },
      { idx: 5, file: "p06-dashboard-anno.png" },
      { idx: 7, file: "p08-ch1-analysis.png" },
      { idx: 9, file: "p10-circular-send-anno.png" },
      { idx: 11, file: "p12-tasks-modal-anno.png" },
      { idx: 16, file: "p17-carbooking-new-anno.png" },
      { idx: 20, file: "p21-ch2-analysis.png" },
      { idx: 23, file: "p24-tpmap-tambon-anno.png" },
      { idx: 29, file: "p30-nas-browse-anno.png" },
      { idx: 33, file: "p34-qrcode-a4-anno.png" },
      { idx: 36, file: "p37-bgremove-demo-anno.png" },
      { idx: 44, file: "p45-ch7-crm-roadmap.png" },
      { idx: 45, file: "p46-ch7-hrm-credit.png" },
      { idx: 46, file: "p47-backcover.png" },
    ];
    const pageLocators = page.locator(".book-page");
    for (const spec of previewSpecs) {
      await pageLocators.nth(spec.idx).screenshot({
        path: path.join(PREVIEW_DIR, spec.file),
        type: "png",
      });
    }
    console.log(`Saved ${previewSpecs.length} preview PNGs to ${PREVIEW_DIR}`);

    await page.pdf({
      path: PDF_OUT,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    const pdfBuffer = fs.readFileSync(PDF_OUT);
    const pdfLatin1 = pdfBuffer.toString("latin1");
    const pdfPageMatches = pdfLatin1.match(/\/Type\s*\/Page\b(?!s)/g) || [];
    const pdfSizeMB = (pdfBuffer.length / (1024 * 1024)).toFixed(2);
    console.log(
      `PDF Output -> ${PDF_OUT} | Size: ${pdfSizeMB} MB | PDF Page Count: ${pdfPageMatches.length}`
    );

    if (pdfPageMatches.length !== pageMeta.totalPages) {
      throw new Error(
        `PDF page count (${pdfPageMatches.length}) does not match expected HTML sheets (${pageMeta.totalPages})`
      );
    }

    fs.copyFileSync(PDF_OUT, ARTIFACT_PDF_OUT);
    console.log(`Copied PDF to Artifact folder -> ${ARTIFACT_PDF_OUT}`);
  } finally {
    if (browser) await browser.close();
  }
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
