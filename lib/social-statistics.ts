/**
 * Kamphaeng Phet Social Development and Human Security Statistics & TPMAP Data Engine
 * สถิติสถานการณ์ทางสังคม ครอบครัวเปราะบาง และฐานข้อมูล TPMAP จังหวัดกำแพงเพชร
 */

export interface DistrictSocialStat {
  districtId: string;
  districtName: string;
  shortName: string;
  subdistrictCount: number;
  population: number;
  vulnerableHouseholds: number;
  helpedHouseholds: number;
  inProgressHouseholds: number;
  disabilityRegistered: number;
  elderlyDependent: number;
  childSupportBeneficiaries: number;
  emergencyCases1300: number;
  budgetDisbursedThb: number;
  povertyDimensions: {
    health: number; // มิติสุขภาพ (เจ็บป่วยเรื้อรัง/ติดเตียง)
    living: number; // มิติความเป็นอยู่ (สภาพบ้านทรุดโทรม)
    education: number; // มิติการศึกษา (เด็กหลุดระบบ)
    income: number; // มิติรายได้ (ต่ำกว่าเกณฑ์ จปฐ.)
    access: number; // มิติการเข้าถึงบริการรัฐ
  };
}

export const KAMPHAENG_PHET_DISTRICTS: DistrictSocialStat[] = [
  {
    districtId: "mueang",
    districtName: "อำเภอเมืองกำแพงเพชร",
    shortName: "เมืองกำแพงเพชร",
    subdistrictCount: 16,
    population: 215400,
    vulnerableHouseholds: 3120,
    helpedHouseholds: 2890,
    inProgressHouseholds: 230,
    disabilityRegistered: 7420,
    elderlyDependent: 3180,
    childSupportBeneficiaries: 4120,
    emergencyCases1300: 142,
    budgetDisbursedThb: 14500000,
    povertyDimensions: { health: 680, living: 540, education: 210, income: 1240, access: 450 },
  },
  {
    districtId: "khlong_khlung",
    districtName: "อำเภอคลองขลุง",
    shortName: "คลองขลุง",
    subdistrictCount: 10,
    population: 71200,
    vulnerableHouseholds: 1450,
    helpedHouseholds: 1330,
    inProgressHouseholds: 120,
    disabilityRegistered: 2840,
    elderlyDependent: 1120,
    childSupportBeneficiaries: 1650,
    emergencyCases1300: 48,
    budgetDisbursedThb: 6200000,
    povertyDimensions: { health: 310, living: 260, education: 95, income: 610, access: 175 },
  },
  {
    districtId: "khanu_woralaksaburi",
    districtName: "อำเภอขาณุวรลักษบุรี",
    shortName: "ขาณุวรลักษบุรี",
    subdistrictCount: 11,
    population: 112500,
    vulnerableHouseholds: 1820,
    helpedHouseholds: 1680,
    inProgressHouseholds: 140,
    disabilityRegistered: 3950,
    elderlyDependent: 1480,
    childSupportBeneficiaries: 2210,
    emergencyCases1300: 62,
    budgetDisbursedThb: 8400000,
    povertyDimensions: { health: 380, living: 310, education: 120, income: 780, access: 230 },
  },
  {
    districtId: "sai_ngam",
    districtName: "อำเภอไทรงาม",
    shortName: "ไทรงาม",
    subdistrictCount: 7,
    population: 51200,
    vulnerableHouseholds: 890,
    helpedHouseholds: 820,
    inProgressHouseholds: 70,
    disabilityRegistered: 1780,
    elderlyDependent: 690,
    childSupportBeneficiaries: 980,
    emergencyCases1300: 26,
    budgetDisbursedThb: 3800000,
    povertyDimensions: { health: 180, living: 150, education: 60, income: 390, access: 110 },
  },
  {
    districtId: "phran_kratai",
    districtName: "อำเภอพรานกระต่าย",
    shortName: "พรานกระต่าย",
    subdistrictCount: 10,
    population: 68400,
    vulnerableHouseholds: 1240,
    helpedHouseholds: 1140,
    inProgressHouseholds: 100,
    disabilityRegistered: 2410,
    elderlyDependent: 940,
    childSupportBeneficiaries: 1390,
    emergencyCases1300: 38,
    budgetDisbursedThb: 5400000,
    povertyDimensions: { health: 260, living: 210, education: 80, income: 540, access: 150 },
  },
  {
    districtId: "lan_krabue",
    districtName: "อำเภอลานกระบือ",
    shortName: "ลานกระบือ",
    subdistrictCount: 7,
    population: 43800,
    vulnerableHouseholds: 720,
    helpedHouseholds: 670,
    inProgressHouseholds: 50,
    disabilityRegistered: 1520,
    elderlyDependent: 580,
    childSupportBeneficiaries: 870,
    emergencyCases1300: 22,
    budgetDisbursedThb: 3200000,
    povertyDimensions: { health: 150, living: 120, education: 45, income: 310, access: 95 },
  },
  {
    districtId: "sai_thong_watthana",
    districtName: "อำเภอทรายทองวัฒนา",
    shortName: "ทรายทองวัฒนา",
    subdistrictCount: 3,
    population: 24600,
    vulnerableHouseholds: 480,
    helpedHouseholds: 445,
    inProgressHouseholds: 35,
    disabilityRegistered: 890,
    elderlyDependent: 350,
    childSupportBeneficiaries: 520,
    emergencyCases1300: 14,
    budgetDisbursedThb: 2100000,
    povertyDimensions: { health: 110, living: 85, education: 30, income: 200, access: 55 },
  },
  {
    districtId: "pang_sila_thong",
    districtName: "อำเภอปางศิลาทอง",
    shortName: "ปางศิลาทอง",
    subdistrictCount: 3,
    population: 32100,
    vulnerableHouseholds: 690,
    helpedHouseholds: 625,
    inProgressHouseholds: 65,
    disabilityRegistered: 1140,
    elderlyDependent: 420,
    childSupportBeneficiaries: 680,
    emergencyCases1300: 18,
    budgetDisbursedThb: 2900000,
    povertyDimensions: { health: 140, living: 130, education: 50, income: 290, access: 80 },
  },
  {
    districtId: "bueng_samakkhi",
    districtName: "อำเภอบึงสามัคคี",
    shortName: "บึงสามัคคี",
    subdistrictCount: 4,
    population: 27800,
    vulnerableHouseholds: 560,
    helpedHouseholds: 515,
    inProgressHouseholds: 45,
    disabilityRegistered: 980,
    elderlyDependent: 380,
    childSupportBeneficiaries: 590,
    emergencyCases1300: 16,
    budgetDisbursedThb: 2400000,
    povertyDimensions: { health: 120, living: 95, education: 35, income: 240, access: 70 },
  },
  {
    districtId: "kosamphi_nakhon",
    districtName: "อำเภอโกสัมพีนคร",
    shortName: "โกสัมพีนคร",
    subdistrictCount: 3,
    population: 29400,
    vulnerableHouseholds: 580,
    helpedHouseholds: 535,
    inProgressHouseholds: 45,
    disabilityRegistered: 1040,
    elderlyDependent: 410,
    childSupportBeneficiaries: 630,
    emergencyCases1300: 19,
    budgetDisbursedThb: 2500000,
    povertyDimensions: { health: 130, living: 105, education: 40, income: 245, access: 60 },
  },
  {
    districtId: "khlong_lan",
    districtName: "อำเภอคลองลาน",
    shortName: "คลองลาน",
    subdistrictCount: 4,
    population: 65200,
    vulnerableHouseholds: 1480,
    helpedHouseholds: 1345,
    inProgressHouseholds: 135,
    disabilityRegistered: 2420,
    elderlyDependent: 920,
    childSupportBeneficiaries: 1480,
    emergencyCases1300: 45,
    budgetDisbursedThb: 6100000,
    povertyDimensions: { health: 310, living: 280, education: 110, income: 620, access: 160 },
  },
];

/**
 * Adjust statistics dynamically based on fiscal year
 */
export function getSocialStatsByYear(
  fiscalYear: string = "2569",
  districtFilter: string = "all"
): DistrictSocialStat[] {
  // Base data is for fiscal year 2569
  let multiplier = 1.0;
  if (fiscalYear === "2570") multiplier = 1.04;
  else if (fiscalYear === "2568") multiplier = 0.95;
  else if (fiscalYear === "2567") multiplier = 0.91;

  const adjusted = KAMPHAENG_PHET_DISTRICTS.map((d) => {
    const vul = Math.round(d.vulnerableHouseholds * multiplier);
    const helped = Math.min(vul, Math.round(d.helpedHouseholds * multiplier));
    const inProg = vul - helped;

    return {
      ...d,
      vulnerableHouseholds: vul,
      helpedHouseholds: helped,
      inProgressHouseholds: inProg,
      disabilityRegistered: Math.round(d.disabilityRegistered * multiplier),
      elderlyDependent: Math.round(d.elderlyDependent * multiplier),
      childSupportBeneficiaries: Math.round(d.childSupportBeneficiaries * multiplier),
      emergencyCases1300: Math.round(d.emergencyCases1300 * multiplier),
      budgetDisbursedThb: Math.round(d.budgetDisbursedThb * multiplier),
      povertyDimensions: {
        health: Math.round(d.povertyDimensions.health * multiplier),
        living: Math.round(d.povertyDimensions.living * multiplier),
        education: Math.round(d.povertyDimensions.education * multiplier),
        income: Math.round(d.povertyDimensions.income * multiplier),
        access: Math.round(d.povertyDimensions.access * multiplier),
      },
    };
  });

  if (districtFilter === "all") return adjusted;
  return adjusted.filter((d) => d.districtId === districtFilter);
}

/**
 * Calculate grand totals for province
 */
export function calculateProvinceTotals(stats: DistrictSocialStat[]) {
  return stats.reduce(
    (acc, curr) => ({
      population: acc.population + curr.population,
      vulnerableHouseholds: acc.vulnerableHouseholds + curr.vulnerableHouseholds,
      helpedHouseholds: acc.helpedHouseholds + curr.helpedHouseholds,
      inProgressHouseholds: acc.inProgressHouseholds + curr.inProgressHouseholds,
      disabilityRegistered: acc.disabilityRegistered + curr.disabilityRegistered,
      elderlyDependent: acc.elderlyDependent + curr.elderlyDependent,
      childSupportBeneficiaries: acc.childSupportBeneficiaries + curr.childSupportBeneficiaries,
      emergencyCases1300: acc.emergencyCases1300 + curr.emergencyCases1300,
      budgetDisbursedThb: acc.budgetDisbursedThb + curr.budgetDisbursedThb,
      povertyDimensions: {
        health: acc.povertyDimensions.health + curr.povertyDimensions.health,
        living: acc.povertyDimensions.living + curr.povertyDimensions.living,
        education: acc.povertyDimensions.education + curr.povertyDimensions.education,
        income: acc.povertyDimensions.income + curr.povertyDimensions.income,
        access: acc.povertyDimensions.access + curr.povertyDimensions.access,
      },
    }),
    {
      population: 0,
      vulnerableHouseholds: 0,
      helpedHouseholds: 0,
      inProgressHouseholds: 0,
      disabilityRegistered: 0,
      elderlyDependent: 0,
      childSupportBeneficiaries: 0,
      emergencyCases1300: 0,
      budgetDisbursedThb: 0,
      povertyDimensions: { health: 0, living: 0, education: 0, income: 0, access: 0 },
    }
  );
}

/**
 * Export data to UTF-8 BOM CSV for Excel
 */
export function exportSocialStatsToCsv(data: DistrictSocialStat[], fiscalYear: string = "2569"): void {
  const headers = [
    "ลำดับ",
    "อำเภอ",
    "จำนวนตำบล",
    "ประชากร (คน)",
    "ครัวเรือนเปราะบาง TPMAP (ครัวเรือน)",
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
    const rate = d.vulnerableHouseholds > 0 ? ((d.helpedHouseholds / d.vulnerableHouseholds) * 100).toFixed(1) + "%" : "0%";
    return [
      String(index + 1),
      `"${d.districtName}"`,
      String(d.subdistrictCount),
      String(d.population),
      String(d.vulnerableHouseholds),
      String(d.helpedHouseholds),
      String(d.inProgressHouseholds),
      `"${rate}"`,
      String(d.disabilityRegistered),
      String(d.elderlyDependent),
      String(d.childSupportBeneficiaries),
      String(d.emergencyCases1300),
      String(d.budgetDisbursedThb),
      String(d.povertyDimensions.health),
      String(d.povertyDimensions.living),
      String(d.povertyDimensions.education),
      String(d.povertyDimensions.income),
      String(d.povertyDimensions.access),
    ].join(",");
  });

  const totals = calculateProvinceTotals(data);
  const totalRate = totals.vulnerableHouseholds > 0 ? ((totals.helpedHouseholds / totals.vulnerableHouseholds) * 100).toFixed(1) + "%" : "0%";
  const totalRow = [
    "รวม",
    `"รวมทั้งจังหวัดกำแพงเพชร (${data.length} อำเภอ)"`,
    String(data.reduce((s, i) => s + i.subdistrictCount, 0)),
    String(totals.population),
    String(totals.vulnerableHouseholds),
    String(totals.helpedHouseholds),
    String(totals.inProgressHouseholds),
    `"${totalRate}"`,
    String(totals.disabilityRegistered),
    String(totals.elderlyDependent),
    String(totals.childSupportBeneficiaries),
    String(totals.emergencyCases1300),
    String(totals.budgetDisbursedThb),
    String(totals.povertyDimensions.health),
    String(totals.povertyDimensions.living),
    String(totals.povertyDimensions.education),
    String(totals.povertyDimensions.income),
    String(totals.povertyDimensions.access),
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

