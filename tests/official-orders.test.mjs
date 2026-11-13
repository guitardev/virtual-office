import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeThaiNumerals,
  parseOrderNumberParts,
  buildOrderSearchNormalized,
  buildOrderNasFolder,
  formatThaiOrderDate,
} from "../lib/official-orders.ts";

test("normalizeThaiNumerals converts Thai digits to Arabic digits", () => {
  assert.equal(normalizeThaiNumerals("๑๒๕/๒๕๖๙"), "125/2569");
  assert.equal(normalizeThaiNumerals("ที่ กพ ๐๐๑๘.๑/๔๕"), "ที่ กพ 0018.1/45");
});

test("parseOrderNumberParts extracts orderSeq and orderYearBe from Arabic and Thai inputs", () => {
  const a = parseOrderNumberParts("125/2569", "2026-11-13");
  assert.equal(a.docNumberRaw, "125/2569");
  assert.equal(a.orderSeq, 125);
  assert.equal(a.orderYearBe, 2569);

  const b = parseOrderNumberParts("๑๒๕/๒๕๖๙", "2026-11-13");
  assert.equal(b.docNumberRaw, "125/2569");
  assert.equal(b.orderSeq, 125);
  assert.equal(b.orderYearBe, 2569);

  const c = parseOrderNumberParts("45", "2025-05-01");
  assert.equal(c.orderSeq, 45);
  assert.equal(c.orderYearBe, 2568);
});

test("buildOrderSearchNormalized normalizes numerals and combines searchable text", () => {
  const s = buildOrderSearchNormalized({
    docNumberRaw: "125/2569",
    orderSeq: 125,
    orderYearBe: 2569,
    title: "แต่งตั้งคณะทำงาน ศูนย์ข้อมูลฯ ปี ๒๕๖๙",
    division: "กลุ่มนโยบายและวิชาการ",
    keywords: ["Data Hub", "TPMAP"],
  });
  assert.ok(s.includes("125/2569"));
  assert.ok(s.includes("2569"));
  assert.ok(s.includes("data hub"));
  assert.ok(s.includes("แต่งตั้งคณะทำงาน"));
});

test("buildOrderNasFolder and formatThaiOrderDate format paths and Thai dates correctly", () => {
  assert.equal(
    buildOrderNasFolder(2569, "order"),
    "/virtual-office/orders/2569/คำสั่ง"
  );
  assert.equal(
    buildOrderNasFolder(2569, "announcement"),
    "/virtual-office/orders/2569/ประกาศ"
  );
  assert.equal(formatThaiOrderDate("2026-11-13"), "13 พ.ย. 2569");
});
