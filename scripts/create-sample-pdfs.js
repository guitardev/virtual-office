import fs from "fs";
import path from "path";

function createSimplePdf(title, textLines) {
  let streamText = "BT\n/F1 16 Tf\n50 740 Td\n(" + escapePdf(title) + ") Tj\nET\n";
  let y = 700;
  for (const line of textLines) {
    streamText += `BT\n/F1 11 Tf\n50 ${y} Td\n(${escapePdf(line)}) Tj\nET\n`;
    y -= 22;
  }

  const streamLength = Buffer.byteLength(streamText, "utf-8");

  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  const obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n";
  const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamText}\nendstream\nendobj\n`;
  const obj5 = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";

  let header = "%PDF-1.4\n";
  let offset = Buffer.byteLength(header, "utf-8");

  const offsets = [0];
  offsets.push(offset);
  offset += Buffer.byteLength(obj1, "utf-8");

  offsets.push(offset);
  offset += Buffer.byteLength(obj2, "utf-8");

  offsets.push(offset);
  offset += Buffer.byteLength(obj3, "utf-8");

  offsets.push(offset);
  offset += Buffer.byteLength(obj4, "utf-8");

  offsets.push(offset);
  offset += Buffer.byteLength(obj5, "utf-8");

  const startxref = offset;

  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }

  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  return Buffer.from(header + obj1 + obj2 + obj3 + obj4 + obj5 + xref + trailer, "utf-8");
}

function escapePdf(text) {
  return text.replace(/[()\\]/g, "\\$&");
}

const targetDir = path.resolve(process.cwd(), "public/virtual-office/circular_docs");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. sample.pdf
const sampleContent = [
  "Official Government Circular Document (Electronic Sample)",
  "Office of Social Development and Human Security, Kamphaeng Phet",
  "Ref No: KP 0032/W 100",
  "Date: October 2026",
  "Subject: Official Guidelines for Smart MSO Digital Operations",
  "To: All Government Officials and Personnel",
  "----------------------------------------------------------------------",
  "1. All divisions must observe electronic document circulation guidelines.",
  "2. Acknowledge and digital signatures are recorded in real-time.",
  "3. High security Zero Trust verification is strictly enforced.",
  "----------------------------------------------------------------------",
  "Signed: Permanent Secretary Office (Digital Verification Stamp Attached)"
];
fs.writeFileSync(path.join(targetDir, "sample.pdf"), createSimplePdf("Smart MSO - Government Circular Document", sampleContent));

// 2. budget_guideline_2569.pdf
const budgetContent = [
  "Budget Allocation Guidelines Fiscal Year 2026",
  "Office of Social Development and Human Security, Kamphaeng Phet",
  "Ref No: KP 0032/W 452",
  "----------------------------------------------------------------------",
  "Quarter 1 Financial Disbursal Regulations and Support Funds",
  "Special welfare grants for elderly and persons with disabilities.",
  "Strict adherence to official finance regulations is mandatory.",
  "----------------------------------------------------------------------",
  "Signed: Provincial Director of Social Development"
];
fs.writeFileSync(path.join(targetDir, "budget_guideline_2569.pdf"), createSimplePdf("Budget Allocation Guidelines 2026", budgetContent));

// 3. pdpa_policy_2569.pdf
const pdpaContent = [
  "Information Security and Personal Data Protection Policy (PDPA)",
  "Office of Social Development and Human Security, Kamphaeng Phet",
  "Ref No: KP 0032/W 498",
  "----------------------------------------------------------------------",
  "Strict regulations regarding sensitive vulnerable group data.",
  "External transmission of personal information is strictly prohibited.",
  "All personnel must authenticate via Zero Trust LAN/Tunnel.",
  "----------------------------------------------------------------------",
  "Signed: Chief Information Security Officer"
];
fs.writeFileSync(path.join(targetDir, "pdpa_policy_2569.pdf"), createSimplePdf("PDPA & IT Security Policy 2026", pdpaContent));

console.log("Successfully generated sample PDFs in public/virtual-office/circular_docs!");
