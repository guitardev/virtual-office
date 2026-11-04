/**
 * QR Code Utilities for Government & Smart MSO Applications
 * Supports EMVCo PromptPay (Bank of Thailand standard), vCard 3.0, LINE, and Mailto
 */

/**
 * CRC16-CCITT (polynomial 0x1021, initial value 0xFFFF)
 * Used by EMVCo QR Code standard
 */
export function crc16Ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Format TLV (Tag-Length-Value) string for EMVCo
 */
export function formatTlv(tag: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${tag}${len}${value}`;
}

/**
 * Generates an official Bank of Thailand standard EMVCo PromptPay payload.
 * Supports:
 * - Mobile phone numbers (10 digits: e.g. 081-xxx-xxxx)
 * - Citizen ID / Tax ID (13 digits: e.g. 0-9940-00164-28-7)
 * - Optional amount in THB
 */
export function generatePromptPayPayload(idOrPhone: string, amount?: number): string {
  const cleanId = idOrPhone.replace(/[^0-9]/g, "");
  let tag29Value = formatTlv("00", "A000000677010111");

  if (cleanId.length === 10) {
    // Phone number: prefix with 0066 and drop leading 0
    const formattedPhone = `0066${cleanId.slice(1)}`;
    tag29Value += formatTlv("01", formattedPhone);
  } else if (cleanId.length === 13) {
    // National ID or Tax ID
    tag29Value += formatTlv("02", cleanId);
  } else {
    // Return raw input if length does not match PromptPay standards
    return idOrPhone.trim();
  }

  let payload = "";
  payload += formatTlv("00", "01"); // Payload Format Indicator
  payload += formatTlv("01", amount && amount > 0 ? "12" : "11"); // 11=Static, 12=Dynamic (with amount)
  payload += formatTlv("29", tag29Value); // Merchant Account Information
  payload += formatTlv("53", "764"); // Currency: THB (764)

  if (amount && amount > 0) {
    payload += formatTlv("54", amount.toFixed(2));
  }

  payload += formatTlv("58", "TH"); // Country Code: Thailand

  // Tag 63: CRC16 calculation
  const payloadWithTag63 = payload + "6304";
  const checksum = crc16Ccitt(payloadWithTag63);
  return payloadWithTag63 + checksum;
}

/**
 * Generates standard vCard 3.0 contact payload
 * Recognized by iOS and Android camera apps to import contacts directly
 */
export interface VCardContactInfo {
  fullName: string;
  position?: string;
  division?: string;
  org?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  url?: string;
  address?: string;
}

export function generateVCardPayload(data: VCardContactInfo): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];

  if (data.fullName?.trim()) {
    lines.push(`FN:${data.fullName.trim()}`);
    lines.push(`N:;${data.fullName.trim()};;;`);
  }

  const org = data.org?.trim() || "สนง.พมจ.กำแพงเพชร";
  const division = data.division?.trim() || "";
  lines.push(`ORG:${org}${division ? `;${division}` : ""}`);

  if (data.position?.trim()) {
    lines.push(`TITLE:${data.position.trim()}`);
  }

  if (data.mobile?.trim()) {
    lines.push(`TEL;TYPE=CELL,VOICE:${data.mobile.trim()}`);
  }

  if (data.phone?.trim()) {
    lines.push(`TEL;TYPE=WORK,VOICE:${data.phone.trim()}`);
  }

  if (data.email?.trim()) {
    lines.push(`EMAIL;TYPE=INTERNET:${data.email.trim()}`);
  }

  if (data.url?.trim()) {
    lines.push(`URL:${data.url.trim()}`);
  }

  if (data.address?.trim()) {
    lines.push(`ADR;TYPE=WORK:;;${data.address.trim()};;;;`);
  }

  lines.push("END:VCARD");
  return lines.join("\n");
}

/**
 * Generates LINE link payload (handles LINE ID, LINE OA, or existing URL)
 */
export function generateLinePayload(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("@")) {
    return `https://line.me/R/ti/p/${trimmed}`;
  }
  return `https://line.me/R/ti/p/~${trimmed}`;
}

/**
 * Generates mailto URI with optional subject and body
 */
export function generateMailtoPayload(email: string, subject?: string, body?: string): string {
  let uri = `mailto:${email.trim()}`;
  const params: string[] = [];
  if (subject?.trim()) params.push(`subject=${encodeURIComponent(subject.trim())}`);
  if (body?.trim()) params.push(`body=${encodeURIComponent(body.trim())}`);
  if (params.length > 0) {
    uri += `?${params.join("&")}`;
  }
  return uri;
}

