"use client";

import React from "react";

export type GarudaSize = "1.5cm" | "2cm" | "3cm" | "custom";

interface GarudaEmblemProps {
  size?: GarudaSize;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * ตราครุฑมาตรฐานทางราชการ (Thai Government Garuda Emblem - Version 7)
 *
 * แหล่งที่มาและประวัติ:
 * - สกัด (Extracted) จากเอกสารราชการจริง: "ระเบียบกระทรวงศึกษาธิการ ว่าด้วยปีการศึกษาฯ ๒๕๔๙"
 * - วิกิพีเดีย / วิกิมีเดียคอมมอนส์: File:Thai government Garuda emblem (Version 7).svg
 * - นำไปใช้ในแม่แบบทางการ: Template:Thai_government_note และ Template:Thai_court_document (Wikisource)
 *
 * สถานะทางกฎหมาย:
 * - สาธารณสมบัติ (Public Domain) เป็นงานอันไม่มีลิขสิทธิ์ตาม มาตรา ๗ (๓) แห่ง พระราชบัญญัติลิขสิทธิ์ พ.ศ. ๒๕๓๗
 *   (ระเบียบ ข้อบังคับ ประกาศ คำสั่ง คำชี้แจง และหนังสือโต้ตอบของหน่วยงานรัฐ)
 *
 * การใช้งานตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖:
 * - 1.5cm: หนังสือภายใน (บันทึกข้อความ) ตราครุฑสูง ๑.๕ ซม. วางมุมบนด้านซ้าย
 * - 3.0cm: หนังสือภายนอก ตราครุฑสูง ๓.๐ ซม. วางกึ่งกลางหน้ากระดาษ
 * - 2.0cm: ใบสรุปผลการเวียน / ใบนำส่ง / เอกสารรายงานราชการทั่วไป วางกึ่งกลาง
 */
export function GarudaEmblem({
  size = "1.5cm",
  className = "",
  style,
}: GarudaEmblemProps) {
  let sizeStyle: React.CSSProperties = {};

  if (size === "1.5cm") {
    // ระเบียบสารบรรณ: หนังสือภายใน ครุฑสูง 1.5 เซนติเมตร
    sizeStyle = {
      height: "1.5cm",
      width: "auto",
      maxHeight: "1.5cm",
    };
  } else if (size === "2cm") {
    sizeStyle = {
      height: "2cm",
      width: "auto",
      maxHeight: "2cm",
    };
  } else if (size === "3cm") {
    // ระเบียบสารบรรณ: หนังสือภายนอก ครุฑสูง 3.0 เซนติเมตร
    sizeStyle = {
      height: "3cm",
      width: "auto",
      maxHeight: "3cm",
    };
  }

  return (
    <img
      src="/images/garuda.svg"
      alt="ตราครุฑระเบียบงานสารบรรณ"
      title="ตราครุฑระเบียบงานสารบรรณ พ.ศ. ๒๕๒๖"
      style={{ ...sizeStyle, ...style }}
      className={`inline-block select-none object-contain print:brightness-0 ${className}`}
    />
  );
}
