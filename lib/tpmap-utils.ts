export type TpmapDatasetGroup = "card" | "all" | "nocard";
export type TpmapAreaLevel = "amphur" | "tambol";

export interface TpmapRecord {
  id?: string;
  fiscalYear: number;
  provinceId: string;
  datasetGroup: TpmapDatasetGroup;
  areaLevel: TpmapAreaLevel;
  areaId: string;
  areaName: string;
  amphurId: string;
  amphurName: string;
  poorHouseholdCnt: number;
  poorJptCnt: number;
  poorMofregCnt: number;
  poorMofvalCnt: number;
  dimHealth: number;
  dimLiving: number;
  dimEducation: number;
  dimIncome: number;
  dimAccessibility: number;
  povRate: number;
  indicators: Record<string, number>;
  sourceUrl: string;
  syncedAt?: string;
}

export interface TpmapYearSummary {
  fiscalYear: number;
  totalHouseholds: number;
  totalJptPoor: number;
  totalTargetPoor: number;
  dimHealth: number;
  dimLiving: number;
  dimEducation: number;
  dimIncome: number;
  dimAccessibility: number;
  avgPovRate: number;
}

export const TPMAP_YEARS = [2565, 2566, 2567, 2568, 2569] as const;

export const TPMAP_GROUP_META: Record<
  TpmapDatasetGroup,
  { label: string; shortLabel: string; prefix: string; desc: string }
> = {
  card: {
    label: "คนจนเป้าหมาย (มีบัตรสวัสดิการฯ)",
    shortLabel: "คนจนเป้าหมาย",
    prefix: "",
    desc: "ตกเกณฑ์ จปฐ. และลงทะเบียนบัตรสวัสดิการแห่งรัฐที่ผ่านการตรวจสอบแล้ว",
  },
  all: {
    label: "คนจน จปฐ. ทั้งหมด",
    shortLabel: "จปฐ. ทั้งหมด",
    prefix: "all_",
    desc: "ผู้ที่ตกเกณฑ์ จปฐ. ทั้งหมดในจังหวัดกำแพงเพชร (ทั้งที่มีและไม่มีบัตรฯ)",
  },
  nocard: {
    label: "ตกเกณฑ์ จปฐ. (ไม่มีบัตรสวัสดิการฯ)",
    shortLabel: "ไม่มีบัตรฯ (เสี่ยงตกหล่น)",
    prefix: "nocard_",
    desc: "ผู้ที่ตกเกณฑ์ จปฐ. แต่ยังไม่มีบัตรสวัสดิการแห่งรัฐ",
  },
};

export const KPP_AMPHUR_NAMES: Record<string, string> = {
  "6201": "เมืองกำแพงเพชร",
  "6202": "ไทรงาม",
  "6203": "คลองลาน",
  "6204": "ขาณุวรลักษบุรี",
  "6205": "คลองขลุง",
  "6206": "พรานกระต่าย",
  "6207": "ลานกระบือ",
  "6208": "ทรายทองวัฒนา",
  "6209": "ปางศิลาทอง",
  "6210": "บึงสามัคคี",
  "6211": "โกสัมพีนคร",
};

export const PLAN13_INDICATOR_LABELS: Record<
  string,
  { dimension: string; label: string }
> = {
  ind1: { dimension: "สุขภาพ", label: "เด็กแรกเกิดน้ำหนัก 2,500 กรัมขึ้นไป" },
  ind2: { dimension: "สุขภาพ", label: "ทารกกินนมแม่อย่างเดียว 6 เดือน" },
  ind3: { dimension: "สุขภาพ", label: "เด็ก 0-12 ปี ได้รับวัคซีนครบ" },
  ind4: { dimension: "สุขภาพ", label: "บริโภคอาหารถูกสุขลักษณะปลอดภัย" },
  ind5: { dimension: "สุขภาพ", label: "ใช้ยาบำบัดอาการเจ็บป่วยเหมาะสม" },
  ind6: { dimension: "สุขภาพ", label: "ความรู้ป้องกันโรคติดต่อ/ไม่ติดต่อ" },
  ind7: { dimension: "สุขภาพ", label: "ออกกำลังกายสม่ำเสมอ" },
  ind8: { dimension: "สุขภาพ", label: "มีสวัสดิการรักษาพยาบาล" },
  ind9: { dimension: "สุขภาพ", label: "น้ำสะอาดสำหรับดื่มบริโภค" },
  ind10: { dimension: "สุขภาพ", label: "จัดการขยะ/สิ่งปฏิกูลถูกสุขลักษณะ" },
  ind11: { dimension: "สุขภาพ", label: "ไม่สูบบุหรี่/ดื่มสุราเกินเกณฑ์" },
  ind12: { dimension: "สุขภาพ", label: "คนอายุ 35 ปีขึ้นไป ตรวจสุขภาพประจำปี" },
  ind13: { dimension: "มาตรฐานความเป็นอยู่", label: "บ้านมีความมั่นคงคงทนถาวร" },
  ind14: { dimension: "มาตรฐานความเป็นอยู่", label: "จัดบ้านเรือนเป็นระเบียบถูกสุขลักษณะ" },
  ind15: { dimension: "มาตรฐานความเป็นอยู่", label: "ไม่ถูกรบกวนจากมลพิษ" },
  ind16: { dimension: "มาตรฐานความเป็นอยู่", label: "ป้องกันอุบัติเหตุ/เตรียมพร้อมภัยพิบัติ" },
  ind17: { dimension: "มาตรฐานความเป็นอยู่", label: "ความปลอดภัยในชีวิตและทรัพย์สิน" },
  ind18: { dimension: "มาตรฐานความเป็นอยู่", label: "มีน้ำบริโภคและอุปโภคเพียงพอตลอดปี" },
  ind19: { dimension: "มาตรฐานความเป็นอยู่", label: "เข้าถึงและใช้บริการไฟฟ้า" },
  ind20: { dimension: "มาตรฐานความเป็นอยู่", label: "เข้าถึงโทรศัพท์เคลื่อนที่และอินเทอร์เน็ต" },
  ind21: { dimension: "มาตรฐานความเป็นอยู่", label: "เข้าถึงบริการขนส่งสาธารณะ" },
  ind22: { dimension: "การศึกษา", label: "เด็ก 3-5 ปี ได้รับบริการเลี้ยงดู/เตรียมพร้อม" },
  ind23: { dimension: "การศึกษา", label: "เด็ก 6-15 ปี ได้รับการศึกษาภาคบังคับ 9 ปี" },
  ind24: { dimension: "การศึกษา", label: "จบ ม.3 ได้เรียนต่อ ม.ปลาย/ปวช." },
  ind25: { dimension: "การศึกษา", label: "คนอายุ 15-59 ปี อ่านออกเขียนได้" },
  ind26: { dimension: "การศึกษา", label: "การศึกษาต่อเนื่อง/ทักษะศตวรรษที่ 21" },
  ind27: { dimension: "เศรษฐกิจ", label: "คนอายุ 15-59 ปี มีอาชีพและรายได้" },
  ind28: { dimension: "เศรษฐกิจ", label: "คนอายุ 60 ปีขึ้นไป มีอาชีพและรายได้" },
  ind29: { dimension: "เศรษฐกิจ", label: "รายได้เฉลี่ยต่อคนในครัวเรือนต่อปี" },
  ind30: { dimension: "เศรษฐกิจ", label: "ครัวเรือนมีการเก็บออมเงิน" },
  ind31: { dimension: "คุ้มครองทางสังคม", label: "ผู้สูงอายุได้รับการดูแล" },
  ind32: { dimension: "คุ้มครองทางสังคม", label: "ผู้มีรายได้ไม่เกิน 100,000 บาท ได้รับสวัสดิการรัฐ" },
  ind33: { dimension: "คุ้มครองทางสังคม", label: "คนพิการได้รับการดูแล/สวัสดิการ" },
  ind34: { dimension: "คุ้มครองทางสังคม", label: "ผู้ป่วยเรื้อรัง/ติดเตียงได้รับการดูแล" },
  ind35: { dimension: "คุ้มครองทางสังคม", label: "ครอบครัวมีความอบอุ่น" },
  ind36: { dimension: "คุ้มครองทางสังคม", label: "มีส่วนร่วมทำกิจกรรมสาธารณะ/จิตอาสา" },
  ind37: { dimension: "คุ้มครองทางสังคม", label: "มีส่วนร่วมอนุรักษ์สิ่งแวดล้อม/วัฒนธรรม" },
  ind38: { dimension: "อื่นๆ", label: "ตัวชี้วัดเพิ่มเติมตามรอบสำรวจ" },
};

export function getTpmapCsvUrl(
  fiscalYear: number,
  group: TpmapDatasetGroup,
  level: TpmapAreaLevel
): string {
  const yy = String(fiscalYear).slice(-2);
  const prefix = TPMAP_GROUP_META[group].prefix;
  return `https://www.tpmap.in.th/public/data/${yy}/${prefix}${yy}_62_${level}_11111.csv`;
}

export function getTpmapDatadictUrl(fiscalYear: number): string {
  return fiscalYear >= 2567
    ? "https://www.tpmap.in.th/public/data/TPMAP_datadict_plan13.xlsx"
    : "https://www.tpmap.in.th/public/data/TPMAP_datadict.xlsx";
}

export function parseCsvRecords(csvText: string): Array<Record<string, string>> {
  const clean = csvText.replace(/^\uFEFF/, "").trim();
  if (!clean) return [];
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const headers = splitLine(lines[0]);
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitLine(lines[i]);
    const rec: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      rec[headers[j]] = vals[j] ?? "";
    }
    rows.push(rec);
  }
  return rows;
}
