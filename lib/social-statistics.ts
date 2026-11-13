/**
 * Kamphaeng Phet Social Development and Human Security Statistics
 * โครงสร้างรายอำเภอจังหวัดกำแพงเพชร (11 อำเภอ)
 * หมายเหตุ: แสดงเฉพาะข้อมูลที่มีอยู่จริงเท่านั้น หากไม่มีข้อมูลระดับอำเภอให้แสดง "NA" (ห้าม mock)
 */

export interface DistrictSocialStat {
  districtId: string;
  districtName: string;
  shortName: string;
  subdistrictCount: number | null;
  population: number | null;
  vulnerableHouseholds: number | null;
  helpedHouseholds: number | null;
  inProgressHouseholds: number | null;
  disabilityRegistered: number | null;
  elderlyDependent: number | null;
  childSupportBeneficiaries: number | null;
  emergencyCases1300: number | null;
  budgetDisbursedThb: number | null;
  povertyDimensions: {
    health: number | null;
    living: number | null;
    education: number | null;
    income: number | null;
    access: number | null;
  };
}

const EMPTY_POVERTY_DIMENSIONS = {
  health: null,
  living: null,
  education: null,
  income: null,
  access: null,
};

export const KAMPHAENG_PHET_DISTRICTS: DistrictSocialStat[] = [
  {
    districtId: "mueang",
    districtName: "อำเภอเมืองกำแพงเพชร",
    shortName: "เมืองกำแพงเพชร",
    subdistrictCount: 16,
    population: null,
    vulnerableHouseholds: null,
    helpedHouseholds: null,
    inProgressHouseholds: null,
    disabilityRegistered: null,
    elderlyDependent: null,
    childSupportBeneficiaries: null,
    emergencyCases1300: null,
    budgetDisbursedThb: null,
    povertyDimensions: { ...EMPTY_POVERTY_DIMENSIONS },
  },
  {
    districtId: "khlong_khlung",
    districtName: "อำเภอคลองขลุง",
    shortName: "คลองขลุง",
    subdistrictCount: 10,
    population: null,
    vulnerableHouseholds: null,
    helpedHouseholds: null,
    inProgressHouseholds: null,
    disabilityRegistered: null,
    elderlyDependent: null,
    childSupportBeneficiaries: null,
    emergencyCases1300: null,
    budgetDisbursedThb: null,
    povertyDimensions: { ...EMPTY_POVERTY_DIMENSIONS },
  },
  {
    districtId: "khanu_woralaksaburi",
    districtName: "อำเภอขาณุวรลักษบุรี",
    shortName: "ขาณุวรลักษบุรี",
    subdistrictCount: 11,
    population: null,
    vulnerableHouseholds: null,
    helpedHouseholds: null,
    inProgressHouseholds: null,
    disabilityRegistered: null,
    elderlyDependent: null,
    childSupportBeneficiaries: null,
    emergencyCases1300: null,
    budgetDisbursedThb: null,
    povertyDimensions: { ...EMPTY_POVERTY_DIMENSIONS },
  },
  {
    districtId: "phran_kratai",
    districtName: "อำเภอพรานกระต่าย",
    shortName: "พรานกระต่าย",
    subdistrictCount: 10,
    population: null,
    vulnerableHouseholds: null,
    helpedHouseholds: null,
    inProgressHouseholds: null,
    disabilityRegistered: null,
    elderlyDependent: null,
    childSupportBeneficiaries: null,
    emergencyCases1300: null,
    budgetDisbursedThb: null,
    povertyDimensions: { ...EMPTY_POVERTY_DIMENSIONS },
  },
  {
    districtId: "sai_ngam",
    districtName: "อำเภอไทรงาม",
    shortName: "ไทรงาม",
    subdistrictCount: 7,
    population: null,
    vulnerableHouseholds: null,
    helpedHouseholds: null,
    inProgressHouseholds: null,
    disabilityRegistered: null,
    elderlyDependent: null,
    childSupportBeneficiaries: null,
    emergencyCases1300: null,
    budgetDisbursedThb: null,
    povertyDimensions: { ...EMPTY_POVERTY_DIMENSIONS },
  },
  {
    districtId: "lan_krabue",
    districtName: "อำเภอลานกระบือ",
    shortName: "ลานกระบือ",
    subdistrictCount: 7,
    population: null,
    vulnerableHouseholds: null,
    helpedHouseholds: null,
    inProgressHouseholds: null,
    disabilityRegistered: null,
    elderlyDependent: null,
    childSupportBeneficiaries: null,
    emergencyCases1300: null,
    budgetDisbursedThb: null,
    povertyDimensions: { ...EMPTY_POVERTY_DIMENSIONS },
  },
  {
    districtId: "khlong_lan",
    districtName: "อำเภอคลองลาน",
    shortName: "คลองลาน",
    subdistrictCount: 4,
    population: null,
    vulnerableHouseholds: null,
    helpedHouseholds: null,
    inProgressHouseholds: null,
    disabilityRegistered: null,
    elderlyDependent: null,
    childSupportBeneficiaries: null,
    emergencyCases1300: null,
    budgetDisbursedThb: null,
    povertyDimensions: { ...EMPTY_POVERTY_DIMENSIONS },
  },
  {
    districtId: "pang_sila_thong",
    districtName: "อำเภอปางศิลาทอง",
    shortName: "ปางศิลาทอง",
    subdistrictCount: 3,
    population: null,
    vulnerableHouseholds: null,
    helpedHouseholds: null,
    inProgressHouseholds: null,
    disabilityRegistered: null,
    elderlyDependent: null,
    childSupportBeneficiaries: null,
    emergencyCases1300: null,
    budgetDisbursedThb: null,
    povertyDimensions: { ...EMPTY_POVERTY_DIMENSIONS },
  },
  {
    districtId: "bueng_samakkhi",
    districtName: "อำเภอบึงสามัคคี",
    shortName: "บึงสามัคคี",
    subdistrictCount: 4,
    population: null,
    vulnerableHouseholds: null,
    helpedHouseholds: null,
    inProgressHouseholds: null,
    disabilityRegistered: null,
    elderlyDependent: null,
    childSupportBeneficiaries: null,
    emergencyCases1300: null,
    budgetDisbursedThb: null,
    povertyDimensions: { ...EMPTY_POVERTY_DIMENSIONS },
  },
  {
    districtId: "sai_thong_watthana",
    districtName: "อำเภอทรายทองวัฒนา",
    shortName: "ทรายทองวัฒนา",
    subdistrictCount: 3,
    population: null,
    vulnerableHouseholds: null,
    helpedHouseholds: null,
    inProgressHouseholds: null,
    disabilityRegistered: null,
    elderlyDependent: null,
    childSupportBeneficiaries: null,
    emergencyCases1300: null,
    budgetDisbursedThb: null,
    povertyDimensions: { ...EMPTY_POVERTY_DIMENSIONS },
  },
  {
    districtId: "kosamphi_nakhon",
    districtName: "อำเภอโกสัมพีนคร",
    shortName: "โกสัมพีนคร",
    subdistrictCount: 3,
    population: null,
    vulnerableHouseholds: null,
    helpedHouseholds: null,
    inProgressHouseholds: null,
    disabilityRegistered: null,
    elderlyDependent: null,
    childSupportBeneficiaries: null,
    emergencyCases1300: null,
    budgetDisbursedThb: null,
    povertyDimensions: { ...EMPTY_POVERTY_DIMENSIONS },
  },
];

export function getSocialStatsByYear(
  _fiscalYear: string = "2569",
  districtFilter: string = "all"
): DistrictSocialStat[] {
  if (districtFilter === "all") return KAMPHAENG_PHET_DISTRICTS;
  return KAMPHAENG_PHET_DISTRICTS.filter((d) => d.districtId === districtFilter);
}

function sumNullable(values: Array<number | null>): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0);
}

export function calculateProvinceTotals(stats: DistrictSocialStat[]) {
  return {
    subdistrictCount: sumNullable(stats.map((s) => s.subdistrictCount)),
    population: sumNullable(stats.map((s) => s.population)),
    vulnerableHouseholds: sumNullable(stats.map((s) => s.vulnerableHouseholds)),
    helpedHouseholds: sumNullable(stats.map((s) => s.helpedHouseholds)),
    inProgressHouseholds: sumNullable(stats.map((s) => s.inProgressHouseholds)),
    disabilityRegistered: sumNullable(stats.map((s) => s.disabilityRegistered)),
    elderlyDependent: sumNullable(stats.map((s) => s.elderlyDependent)),
    childSupportBeneficiaries: sumNullable(stats.map((s) => s.childSupportBeneficiaries)),
    emergencyCases1300: sumNullable(stats.map((s) => s.emergencyCases1300)),
    budgetDisbursedThb: sumNullable(stats.map((s) => s.budgetDisbursedThb)),
    povertyDimensions: {
      health: sumNullable(stats.map((s) => s.povertyDimensions.health)),
      living: sumNullable(stats.map((s) => s.povertyDimensions.living)),
      education: sumNullable(stats.map((s) => s.povertyDimensions.education)),
      income: sumNullable(stats.map((s) => s.povertyDimensions.income)),
      access: sumNullable(stats.map((s) => s.povertyDimensions.access)),
    },
  };
}

const csvVal = (v: number | null | undefined) => (v == null ? "NA" : String(v));

/**
 * Export district data to UTF-8 BOM CSV for Excel (displays NA where data does not exist)
 */
export function exportSocialStatsToCsv(
  data: DistrictSocialStat[],
  fiscalYear: string = "2569"
): void {
  const headers = [
    "ลำดับ",
    "อำเภอ",
    "จำนวนตำบล",
    "ประชากร (คน)",
    "ครัวเรือนเปราะบาง (ครัวเรือน)",
    "ช่วยเหลือแล้ว (ครัวเรือน)",
    "อยู่ระหว่างพัฒนา (ครัวเรือน)",
    "ร้อยละความสำเร็จ",
    "คนพิการมีบัตร (คน)",
    "ผู้สูงอายุภาวะพึ่งพิง (คน)",
    "เงินอุดหนุนเด็กแรกเกิด (คน)",
    "สถิติเคส ศรส. 1300 (เรื่อง)",
    "งบประมาณสงเคราะห์ (บาท)",
    "มิติสุขภาพ",
    "มิติความเป็นอยู่",
    "มิติการศึกษา",
    "มิติรายได้",
    "มิติเข้าถึงบริการรัฐ",
  ];

  const rows = data.map((d, index) => {
    const rate =
      d.vulnerableHouseholds != null &&
      d.vulnerableHouseholds > 0 &&
      d.helpedHouseholds != null
        ? ((d.helpedHouseholds / d.vulnerableHouseholds) * 100).toFixed(1) + "%"
        : "NA";
    return [
      String(index + 1),
      `"${d.districtName}"`,
      csvVal(d.subdistrictCount),
      csvVal(d.population),
      csvVal(d.vulnerableHouseholds),
      csvVal(d.helpedHouseholds),
      csvVal(d.inProgressHouseholds),
      `"${rate}"`,
      csvVal(d.disabilityRegistered),
      csvVal(d.elderlyDependent),
      csvVal(d.childSupportBeneficiaries),
      csvVal(d.emergencyCases1300),
      csvVal(d.budgetDisbursedThb),
      csvVal(d.povertyDimensions.health),
      csvVal(d.povertyDimensions.living),
      csvVal(d.povertyDimensions.education),
      csvVal(d.povertyDimensions.income),
      csvVal(d.povertyDimensions.access),
    ].join(",");
  });

  const totals = calculateProvinceTotals(data);
  const totalRate =
    totals.vulnerableHouseholds != null &&
    totals.vulnerableHouseholds > 0 &&
    totals.helpedHouseholds != null
      ? ((totals.helpedHouseholds / totals.vulnerableHouseholds) * 100).toFixed(1) + "%"
      : "NA";

  const totalRow = [
    "รวม",
    `"รวมทั้งจังหวัดกำแพงเพชร (${data.length} อำเภอ)"`,
    csvVal(totals.subdistrictCount),
    csvVal(totals.population),
    csvVal(totals.vulnerableHouseholds),
    csvVal(totals.helpedHouseholds),
    csvVal(totals.inProgressHouseholds),
    `"${totalRate}"`,
    csvVal(totals.disabilityRegistered),
    csvVal(totals.elderlyDependent),
    csvVal(totals.childSupportBeneficiaries),
    csvVal(totals.emergencyCases1300),
    csvVal(totals.budgetDisbursedThb),
    csvVal(totals.povertyDimensions.health),
    csvVal(totals.povertyDimensions.living),
    csvVal(totals.povertyDimensions.education),
    csvVal(totals.povertyDimensions.income),
    csvVal(totals.povertyDimensions.access),
  ].join(",");

  const csvContent = "\uFEFF" + [headers.join(","), ...rows, totalRow].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `รายงานสถิติสังคม_พมจ_กำแพงเพชร_ปีงบ_${fiscalYear}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
