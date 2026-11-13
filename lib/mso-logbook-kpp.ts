// Kamphaeng Phet baseline dataset extracted from public/templates/fragile/full_version_mso_unified_report_generator.html
// Source: MSO-Logbook (สสว. 8 จังหวัดกำแพงเพชร)

export interface MsoSubIssueStat {
  total: number;
  noplan: number;
  tracked: number;
  closed: number;
  ongoing: number;
}

export interface MsoHousingGroupStat {
  people: number;
  households: number;
  types: [number, number, number, number];
}

export interface MsoKppMainData {
  region: string;
  population: number;
  households: number;
  hh: number;
  people: number;
  lvls: [number, number, number, number];
  peopleWithProblems: number;
  problems: number;
  dims: Record<string, number>;
}

export interface MsoKppWelfareData {
  subsidy: {
    childpop: number;
    registered: number;
    eligible: number;
    received: number;
    notReceived: number;
  };
  single: {
    totalRegistered: number;
    motherRegistered: number;
    registered: number;
    eligible: number;
    received: number;
  };
  teen: {
    totalRegistered: number;
    motherRegistered: number;
    registered: number;
    eligible: number;
    received: number;
  };
  singleTeen: {
    totalRegistered: number;
    motherRegistered: number;
    registered: number;
    eligible: number;
    received: number;
  };
}

export interface MsoKppDataset {
  province: string;
  main: MsoKppMainData;
  forms: Record<string, Record<string, MsoSubIssueStat>>;
  housing: Record<string, MsoHousingGroupStat>;
  welfare: MsoKppWelfareData;
}

export const MSO_VULNERABILITY_LEVELS = [
  { level: 0, label: "ระดับ 0 (ไม่พบปัญหา / ปกติ)", tone: "emerald" },
  { level: 1, label: "ระดับ 1 (พออยู่ได้ / เฝ้าระวัง)", tone: "sky" },
  { level: 2, label: "ระดับ 2 (ยากลำบาก / ต้องการช่วยเหลือ)", tone: "amber" },
  { level: 3, label: "ระดับ 3 (วิกฤต / เร่งด่วนที่สุด)", tone: "rose" },
] as const;

export const MSO_HOUSING_TYPE_LABELS = [
  "บ้านตนเอง / มั่นคง",
  "บ้านเช่า / อาศัยชั่วคราว",
  "ไม่มั่นคงแข็งแรง / ทรุดโทรม",
  "ไม่มีที่อยู่อาศัย / เร่ร่อน",
] as const;

export const KPP_MSO_LOGBOOK: MsoKppDataset = {
  "province": "กำแพงเพชร",
  "main": {
    "region": "สสว. 8",
    "population": 693619,
    "households": 261213,
    "hh": 11735,
    "people": 17793,
    "lvls": [
      1077,
      3459,
      6656,
      543
    ],
    "peopleWithProblems": 14966,
    "problems": 37026,
    "dims": {
      "การมีงานทำและมีรายได้": 11129,
      "การศึกษา": 1276,
      "สุขภาพอนามัย": 1831,
      "ครอบครัว": 14208,
      "ความรุนแรงในครอบครัว/สังคม": 13,
      "การเป็นผู้เสียหายจากการค้ามนุษย์": 5,
      "การเข้าไม่ถึงสิทธิและความเป็นธรรมในสังคม": 5556,
      "ที่อยู่อาศัย": 2953,
      "สภาพปัญหาสังคมอื่นๆ": 55
    }
  },
  "forms": {
    "การมีงานทำและมีรายได้": {
      "ขอทาน": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ขาดทักษะในการประกอบอาชีพ": {
        "total": 65,
        "noplan": 38,
        "tracked": 24,
        "closed": 2,
        "ongoing": 1
      },
      "ถูกนายจ้างเอารัดเอาเปรียบ": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ถูกเลิกจ้าง/ว่างงาน": {
        "total": 3,
        "noplan": 3,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "มีหนี้สิน": {
        "total": 386,
        "noplan": 197,
        "tracked": 165,
        "closed": 5,
        "ongoing": 19
      },
      "ไม่มีการออม": {
        "total": 295,
        "noplan": 198,
        "tracked": 78,
        "closed": 2,
        "ongoing": 17
      },
      "ไม่มีงานทํา": {
        "total": 149,
        "noplan": 87,
        "tracked": 57,
        "closed": 0,
        "ongoing": 5
      },
      "ไม่มีที่ดินทํากิน": {
        "total": 65,
        "noplan": 36,
        "tracked": 24,
        "closed": 0,
        "ongoing": 5
      },
      "ไม่มีทุนประกอบอาชีพ": {
        "total": 99,
        "noplan": 37,
        "tracked": 56,
        "closed": 1,
        "ongoing": 5
      },
      "ไม่มีรายได้": {
        "total": 273,
        "noplan": 149,
        "tracked": 105,
        "closed": 2,
        "ongoing": 17
      },
      "ไม่มีอาชีพ": {
        "total": 140,
        "noplan": 87,
        "tracked": 46,
        "closed": 1,
        "ongoing": 6
      },
      "ยากจน/ไร้ที่พึ่ง": {
        "total": 938,
        "noplan": 352,
        "tracked": 498,
        "closed": 14,
        "ongoing": 74
      },
      "รายได้ไม่แน่นอน": {
        "total": 1297,
        "noplan": 515,
        "tracked": 667,
        "closed": 56,
        "ongoing": 59
      },
      "รายได้ไม่พอใช้จ่าย": {
        "total": 7416,
        "noplan": 2836,
        "tracked": 4237,
        "closed": 47,
        "ongoing": 296
      },
      "อื่นๆ": {
        "total": 3,
        "noplan": 2,
        "tracked": 1,
        "closed": 0,
        "ongoing": 0
      }
    },
    "การศึกษา": {
      "ขาดโอกาสทางการศึกษา": {
        "total": 74,
        "noplan": 41,
        "tracked": 24,
        "closed": 2,
        "ongoing": 7
      },
      "ไม่ได้เรียนหนังสือ": {
        "total": 41,
        "noplan": 26,
        "tracked": 14,
        "closed": 1,
        "ongoing": 0
      },
      "ไม่มีทุนการศึกษา": {
        "total": 1152,
        "noplan": 701,
        "tracked": 232,
        "closed": 4,
        "ongoing": 215
      },
      "ออกเรียนกลางคัน": {
        "total": 9,
        "noplan": 5,
        "tracked": 3,
        "closed": 0,
        "ongoing": 1
      }
    },
    "ครอบครัว": {
      "กำพร้า": {
        "total": 20,
        "noplan": 13,
        "tracked": 6,
        "closed": 0,
        "ongoing": 1
      },
      "ครอบครัวแตกแยก/พ่อแม่แยกทาง": {
        "total": 335,
        "noplan": 217,
        "tracked": 81,
        "closed": 1,
        "ongoing": 36
      },
      "ครอบครัวมีภาระเลี้ยงดูผู้ประสบปัญหา (อาทิ เด็กคนพิการ ผู้ติดเชื้อเอดส์ ผู้ติดยาเสพติด)": {
        "total": 1116,
        "noplan": 288,
        "tracked": 789,
        "closed": 3,
        "ongoing": 36
      },
      "ครอบครัวมีหนี้สิน": {
        "total": 635,
        "noplan": 416,
        "tracked": 190,
        "closed": 3,
        "ongoing": 26
      },
      "ครอบครัวยากจน": {
        "total": 9844,
        "noplan": 2522,
        "tracked": 6742,
        "closed": 146,
        "ongoing": 434
      },
      "ครอบครัวอุปถัมภ์": {
        "total": 27,
        "noplan": 13,
        "tracked": 8,
        "closed": 0,
        "ongoing": 6
      },
      "ได้รับการเลี้ยงดูไม่เหมาะสม": {
        "total": 3,
        "noplan": 2,
        "tracked": 1,
        "closed": 0,
        "ongoing": 0
      },
      "ได้รับผลกระทบจากการที่คนในครอบครัวต้องโทษจําคุก": {
        "total": 10,
        "noplan": 7,
        "tracked": 3,
        "closed": 0,
        "ongoing": 0
      },
      "ต้องดูแลบุคคลในครอบครัว": {
        "total": 1564,
        "noplan": 786,
        "tracked": 655,
        "closed": 12,
        "ongoing": 111
      },
      "ต้องรับภาระหน้าที่ในครอบครัวเกินวัย/เกินความสามารถสติปัญญา": {
        "total": 8,
        "noplan": 4,
        "tracked": 3,
        "closed": 0,
        "ongoing": 1
      },
      "ตั้งครรภ์นอกสมรส": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ตั้งครรภ์ในวัยรุ่นและไม่พร้อมในการเลี้ยงดูบุตร": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ถูกทอดทิ้ง": {
        "total": 7,
        "noplan": 4,
        "tracked": 3,
        "closed": 0,
        "ongoing": 0
      },
      "ประพฤติตนไม่เหมาะสม": {
        "total": 1,
        "noplan": 1,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ผู้ปกครองหรือผู้ดูแลมีพฤติกรรมไม่เหมาะสม": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ผู้ปกครองหรือผู้ดูแลไม่สามารถอุปการะเลี้ยงดูได้": {
        "total": 6,
        "noplan": 0,
        "tracked": 6,
        "closed": 0,
        "ongoing": 0
      },
      "ผู้อุปการะมีฐานะยากจน/ขาดแคลน": {
        "total": 296,
        "noplan": 219,
        "tracked": 29,
        "closed": 2,
        "ongoing": 46
      },
      "พ่อม่ายที่ต้องเลี้ยงดูบุตรตามลําพัง/พ่อเลี้ยงเดี่ยว": {
        "total": 16,
        "noplan": 8,
        "tracked": 6,
        "closed": 1,
        "ongoing": 1
      },
      "แม่ม่ายที่ต้องเลี้ยงดูบุตรตามลำพัง/แม่เลี้ยงเดี่ยว": {
        "total": 78,
        "noplan": 36,
        "tracked": 35,
        "closed": 0,
        "ongoing": 7
      },
      "ไม่ทราบวิธีการปฏิบัติตนหรือการปรับตัวที่เหมาะสม": {
        "total": 1,
        "noplan": 1,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ไม่มีผู้ดูแลในตอนกลางคืน ต้องออกไปทํางานนอกบ้าน": {
        "total": 3,
        "noplan": 2,
        "tracked": 1,
        "closed": 0,
        "ongoing": 0
      },
      "ไม่มีผู้ดูแลในตอนกลางวัน ผู้ดูแลต้องออกไปทํางานนอกบ้าน": {
        "total": 33,
        "noplan": 8,
        "tracked": 21,
        "closed": 1,
        "ongoing": 3
      },
      "ไม่สามารถเลี้ยงดูบุตรได้": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "เสี่ยงต่อการกระทําผิด": {
        "total": 2,
        "noplan": 1,
        "tracked": 1,
        "closed": 0,
        "ongoing": 0
      },
      "อยู่ตามลําพังไม่มีผู้ดูแล และมีปัญหาในการดํารงชีวิต": {
        "total": 203,
        "noplan": 96,
        "tracked": 102,
        "closed": 1,
        "ongoing": 4
      }
    },
    "ความรุนแรงในครอบครัว/สังคม": {
      "ถูกทารุณกรรมทางจิตใจ": {
        "total": 7,
        "noplan": 4,
        "tracked": 3,
        "closed": 0,
        "ongoing": 0
      },
      "ถูกทารุณกรรมทางเพศ": {
        "total": 1,
        "noplan": 1,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ถูกทารุณกรรมทางร่างกาย": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ถูกรังเกียจเหยียดหยาม": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ถูกละเมิดทางเพศ": {
        "total": 1,
        "noplan": 0,
        "tracked": 1,
        "closed": 0,
        "ongoing": 0
      },
      "เป็นผู้กระทำความรุนแรงต่อผู้อื่น": {
        "total": 4,
        "noplan": 2,
        "tracked": 1,
        "closed": 0,
        "ongoing": 1
      }
    },
    "การเป็นผู้เสียหายจากการค้ามนุษย์": {
      "ตกเป็นเครื่องมือแสวงหาผลประโยชน์อื่นๆ": {
        "total": 1,
        "noplan": 1,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ถูกทารุณกรรม/กักขัง/หน่วงเหนี่ยว": {
        "total": 2,
        "noplan": 1,
        "tracked": 1,
        "closed": 0,
        "ongoing": 0
      },
      "ถูกบังคับขอทาน": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ถูกบังคับค้าประเวณี": {
        "total": 2,
        "noplan": 1,
        "tracked": 1,
        "closed": 0,
        "ongoing": 0
      },
      "ถูกบังคับใช้แรงงาน": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ถูกบังคับให้ประพฤติผิดกฎหมาย": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ถูกล่อลวง": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ถูกแสวงหาประโยชน์ทางเพศ": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "เป็นผู้กระทําความรุนแรงต่อผู้อื่น": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      }
    },
    "ที่อยู่อาศัย": {
      "บ้านไม่มั่นคง": {
        "total": 286,
        "noplan": 133,
        "tracked": 137,
        "closed": 1,
        "ongoing": 15
      },
      "ไม่มีกรรมสิทธิ์ในที่อยู่อาศัย": {
        "total": 868,
        "noplan": 533,
        "tracked": 277,
        "closed": 7,
        "ongoing": 51
      },
      "ไม่มีที่อยู่อาศัย": {
        "total": 59,
        "noplan": 32,
        "tracked": 23,
        "closed": 3,
        "ongoing": 1
      },
      "เร่ร่อน": {
        "total": 4,
        "noplan": 2,
        "tracked": 1,
        "closed": 0,
        "ongoing": 1
      },
      "สภาพที่อยู่อาศัยไม่เหมาะสมต่อการพักอาศัย": {
        "total": 1736,
        "noplan": 696,
        "tracked": 689,
        "closed": 19,
        "ongoing": 332
      }
    },
    "สุขภาพอนามัย": {
      "ขาดแคลนกายอุปกรณ์/ไม่มีเครื่องช่วยความพิการ": {
        "total": 21,
        "noplan": 11,
        "tracked": 9,
        "closed": 0,
        "ongoing": 1
      },
      "เจ็บป่วยเรื้อรัง": {
        "total": 1432,
        "noplan": 747,
        "tracked": 608,
        "closed": 8,
        "ongoing": 69
      },
      "ได้รับผลกระทบจากเชื้อเอดส์/ป่วยด้วยโรคเอดส์": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ติดเชื้อเอดส์ (HIV)/ ป่วยด้วยโรคเอดส์": {
        "total": 11,
        "noplan": 6,
        "tracked": 3,
        "closed": 0,
        "ongoing": 2
      },
      "ติดยาเสพติด": {
        "total": 2,
        "noplan": 2,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ป่วยเป็นโรคร้ายแรง": {
        "total": 58,
        "noplan": 31,
        "tracked": 26,
        "closed": 0,
        "ongoing": 1
      },
      "ผู้ป่วยติดเตียง": {
        "total": 102,
        "noplan": 54,
        "tracked": 41,
        "closed": 1,
        "ongoing": 6
      },
      "ผู้ป่วยทางจิต": {
        "total": 16,
        "noplan": 9,
        "tracked": 6,
        "closed": 0,
        "ongoing": 1
      },
      "ไม่ได้รับการรักษาพยาบาลหรือการฟื้นฟูสมรรถภาพ": {
        "total": 2,
        "noplan": 0,
        "tracked": 2,
        "closed": 0,
        "ongoing": 0
      },
      "ไม่มีสิทธิรักษาพยาบาล": {
        "total": 2,
        "noplan": 1,
        "tracked": 1,
        "closed": 0,
        "ongoing": 0
      },
      "ไม่สามารถช่วยเหลือตัวเองได้ในชีวิตประจําวัน": {
        "total": 60,
        "noplan": 32,
        "tracked": 25,
        "closed": 0,
        "ongoing": 3
      },
      "โรคซึมเศร้า": {
        "total": 15,
        "noplan": 8,
        "tracked": 5,
        "closed": 0,
        "ongoing": 2
      },
      "หลงลืมชราภาพ": {
        "total": 110,
        "noplan": 62,
        "tracked": 45,
        "closed": 0,
        "ongoing": 3
      }
    },
    "สภาพปัญหาสังคมอื่นๆ": {
      "ได้รับผลกระทบจากแผ่นดินไหว": {
        "total": 3,
        "noplan": 1,
        "tracked": 1,
        "closed": 0,
        "ongoing": 1
      },
      "ได้รับผลกระทบจากภัยพิบัติภัยแล้ง/ภัยหนาว/วาตภัย/อุทกภัย/อัคคีภัย/แผ่นดินไหว": {
        "total": 12,
        "noplan": 7,
        "tracked": 5,
        "closed": 0,
        "ongoing": 0
      },
      "ได้รับผลกระทบจากภัยแล้ง": {
        "total": 2,
        "noplan": 1,
        "tracked": 1,
        "closed": 0,
        "ongoing": 0
      },
      "ได้รับผลกระทบจากภัยหนาว": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ได้รับผลกระทบจากมลภาวะ/สภาพแวดล้อม": {
        "total": 23,
        "noplan": 11,
        "tracked": 6,
        "closed": 2,
        "ongoing": 4
      },
      "ได้รับผลกระทบจากวาตภัย": {
        "total": 14,
        "noplan": 7,
        "tracked": 7,
        "closed": 0,
        "ongoing": 0
      },
      "ได้รับผลกระทบจากเหตุการณ์ความไม่สงบชายแดนภาคใต้": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ได้รับผลกระทบจากเหตุการณ์ความไม่สงบระหว่างประเทศ/สงคราม": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ได้รับผลกระทบจากเหตุการณ์ความรุนแรงทางการเมือง": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ได้รับผลกระทบจากอัคคีภัย": {
        "total": 1,
        "noplan": 0,
        "tracked": 1,
        "closed": 0,
        "ongoing": 0
      },
      "ได้รับผลกระทบจากอุทกภัย": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "ไม่มีค่าพาหนะเดินทางกลับภูมิลำเนา": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      }
    },
    "การเข้าไม่ถึงสิทธิและความเป็นธรรมในสังคม": {
      "การเลือกปฏิบัติโดยไม่เป็นธรรมระหว่างเพศ": {
        "total": 0,
        "noplan": 0,
        "tracked": 0,
        "closed": 0,
        "ongoing": 0
      },
      "เข้าไม่ถึงสิทธิ การจดทะเบียนรับเบี้ยยังชีพผู้สูงอายุ / เบี้ยความพิการ": {
        "total": 241,
        "noplan": 72,
        "tracked": 142,
        "closed": 6,
        "ongoing": 21
      },
      "เคยต้องโทษ ได้รับผลกระทบจากเหตุการณ์ความรุนแรงทางการเมือง": {
        "total": 3,
        "noplan": 2,
        "tracked": 1,
        "closed": 0,
        "ongoing": 0
      },
      "ไม่ได้ยืนคําขอมีบัตรประจําตัวคนพิการ": {
        "total": 43,
        "noplan": 9,
        "tracked": 33,
        "closed": 1,
        "ongoing": 0
      },
      "ไม่มีสถานะทางทะเบียนราษฎร์": {
        "total": 6,
        "noplan": 4,
        "tracked": 1,
        "closed": 0,
        "ongoing": 1
      },
      "ไม่สามารถเข้าถึงบริการของรัฐ": {
        "total": 5261,
        "noplan": 1341,
        "tracked": 3555,
        "closed": 70,
        "ongoing": 295
      },
      "อุปการะเด็กโดยไม่ได้ดําเนินการให้ถูกต้องตามกฎหมาย": {
        "total": 2,
        "noplan": 1,
        "tracked": 1,
        "closed": 0,
        "ongoing": 0
      }
    }
  },
  "housing": {
    "เด็กและเยาวชน": {
      "people": 1547,
      "households": 1125,
      "types": [
        945,
        104,
        56,
        20
      ]
    },
    "ผู้สูงอายุ": {
      "people": 6542,
      "households": 6155,
      "types": [
        5259,
        395,
        396,
        105
      ]
    },
    "คนพิการ": {
      "people": 705,
      "households": 653,
      "types": [
        418,
        98,
        103,
        34
      ]
    },
    "ผู้สูงอายุที่พิการ": {
      "people": 448,
      "households": 433,
      "types": [
        287,
        61,
        64,
        21
      ]
    }
  },
  "welfare": {
    "subsidy": {
      "childpop": 35678,
      "registered": 50690,
      "eligible": 25143,
      "received": 25117,
      "notReceived": 26
    },
    "single": {
      "totalRegistered": 50690,
      "motherRegistered": 36296,
      "registered": 2204,
      "eligible": 1091,
      "received": 1091
    },
    "teen": {
      "totalRegistered": 50690,
      "motherRegistered": 36296,
      "registered": 5857,
      "eligible": 2921,
      "received": 2916
    },
    "singleTeen": {
      "totalRegistered": 50690,
      "motherRegistered": 36296,
      "registered": 432,
      "eligible": 267,
      "received": 267
    }
  }
};

export interface DimensionSummaryRow {
  dimension: string;
  total: number;
  noplan: number;
  tracked: number;
  closed: number;
  ongoing: number;
  sharePct: number;
  noplanPct: number;
  topIssues: Array<{ name: string } & MsoSubIssueStat>;
}

export function getKppDimensionSummaries(): DimensionSummaryRow[] {
  const { dims } = KPP_MSO_LOGBOOK.main;
  const totalProblems = KPP_MSO_LOGBOOK.main.problems || 1;
  return Object.entries(dims)
    .map(([dimension, dimCount]) => {
      const subMap = KPP_MSO_LOGBOOK.forms[dimension] || {};
      const issues = Object.entries(subMap)
        .map(([name, st]) => ({ name, ...st }))
        .filter((x) => x.total > 0)
        .sort((a, b) => b.total - a.total);
      const agg = issues.reduce(
        (acc, cur) => {
          acc.total += cur.total;
          acc.noplan += cur.noplan;
          acc.tracked += cur.tracked;
          acc.closed += cur.closed;
          acc.ongoing += cur.ongoing;
          return acc;
        },
        { total: 0, noplan: 0, tracked: 0, closed: 0, ongoing: 0 }
      );
      const effectiveTotal = agg.total || dimCount;
      return {
        dimension,
        total: effectiveTotal,
        noplan: agg.noplan,
        tracked: agg.tracked,
        closed: agg.closed,
        ongoing: agg.ongoing,
        sharePct: (effectiveTotal / totalProblems) * 100,
        noplanPct: effectiveTotal > 0 ? (agg.noplan / effectiveTotal) * 100 : 0,
        topIssues: issues.slice(0, 4),
      };
    })
    .sort((a, b) => b.total - a.total);
}
