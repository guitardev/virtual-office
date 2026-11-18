import JSZip from "jszip";
import {
  formatThaiDateFull,
  formatThaiDateParts,
  formatThaiDateSlash,
  LeaveRequestItem,
} from "./leave-utils";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const FONT = "TH Sarabun New";
const R_FONTS = `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}" w:cs="${FONT}"/>`;

function xmlEsc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeRun(
  text: string,
  opts: { bold?: boolean; underline?: boolean; size?: number } = {}
): string {
  const size = opts.size ?? 30; // 15pt
  return `<w:r><w:rPr>${R_FONTS}${
    opts.bold ? "<w:b/><w:bCs/>" : ""
  }${
    opts.underline ? '<w:u w:val="single"/>' : ""
  }<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${xmlEsc(
    text
  )}</w:t></w:r>`;
}

function makePara(
  runsXml: string,
  opts: {
    align?: "left" | "center" | "right";
    before?: number;
    after?: number;
    line?: number;
    leftIndent?: number;
    firstLine?: number;
  } = {}
): string {
  const align = opts.align ?? "left";
  const before = opts.before ?? 0;
  const after = opts.after ?? 40;
  const line = opts.line ?? 250;
  const indAttrs = [
    opts.leftIndent ? `w:left="${opts.leftIndent}"` : "",
    opts.firstLine ? `w:firstLine="${opts.firstLine}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const indXml = indAttrs ? `<w:ind ${indAttrs}/>` : "";
  return `<w:p><w:pPr><w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>${indXml}<w:jc w:val="${align}"/></w:pPr>${runsXml}</w:p>`;
}

function makeTableCell(
  innerXml: string,
  widthDxa: number,
  opts: { borders?: boolean; fill?: string; vAlign?: "top" | "center" } = {}
): string {
  const borderXml = opts.borders
    ? `<w:tcBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tcBorders>`
    : `<w:tcBorders>
        <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
      </w:tcBorders>`;
  const shdXml = opts.fill
    ? `<w:shd w:val="clear" w:color="auto" w:fill="${opts.fill}"/>`
    : "";
  return `<w:tc>
    <w:tcPr>
      <w:tcW w:w="${widthDxa}" w:type="dxa"/>
      ${borderXml}
      ${shdXml}
      <w:tcMar>
        <w:top w:w="40" w:type="dxa"/>
        <w:bottom w:w="40" w:type="dxa"/>
        <w:left w:w="60" w:type="dxa"/>
        <w:right w:w="60" w:type="dxa"/>
      </w:tcMar>
      <w:vAlign w:val="${opts.vAlign ?? "top"}"/>
    </w:tcPr>
    ${innerXml}
  </w:tc>`;
}

function chk(checked: boolean): string {
  return checked ? "☑" : "☐";
}

function buildVacationLeaveBody(leave: LeaveRequestItem): string {
  const writtenParts = formatThaiDateParts(leave.writtenDate);
  const startParts = formatThaiDateParts(leave.startDate);
  const endParts = formatThaiDateParts(leave.endDate);
  const totalEntitled =
    Number(leave.vacationAccumulatedDays || 0) +
    Number(leave.vacationAnnualDays || 0);
  const totalUsed =
    Number(leave.prevVacationDays || 0) + Number(leave.totalWorkingDays || 0);

  const parts: string[] = [];

  parts.push(
    makePara(makeRun("ใบลาพักผ่อน", { bold: true, size: 38 }), {
      align: "center",
      after: 100,
    })
  );

  parts.push(
    makePara(
      makeRun(
        `เขียนที่ ${
          leave.writtenAt ||
          "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์ จังหวัดกำแพงเพชร"
        }`
      ),
      { leftIndent: 4820, after: 20 }
    )
  );
  parts.push(
    makePara(
      makeRun(
        `วันที่ ${writtenParts.day || "...."} เดือน ${
          writtenParts.month || "............"
        } พ.ศ. ${writtenParts.yearBE || "......"}`
      ),
      { leftIndent: 4600, firstLine: 220, after: 100 }
    )
  );

  parts.push(
    makePara(
      makeRun("เรื่อง  ", { bold: true }) +
        makeRun(leave.subject || "ขอลาพักผ่อน"),
      { after: 40 }
    )
  );
  parts.push(
    makePara(
      makeRun("เรียน  ", { bold: true }) +
        makeRun(
          leave.toRecipient ||
            "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
        ),
      { after: 80 }
    )
  );

  parts.push(
    makePara(
      makeRun(
        `ข้าพเจ้า ${leave.applicantName}   ตำแหน่ง ${
          leave.applicantPosition || "-"
        }`
      ),
      { firstLine: 720, after: 40 }
    )
  );
  parts.push(
    makePara(
      makeRun(
        `กลุ่ม/ฝ่าย ${
          leave.applicantDivision || "-"
        }   สังกัด สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร`
      ),
      { after: 40 }
    )
  );
  parts.push(
    makePara(
      makeRun(
        `มีวันลาพักผ่อนสะสม ${leave.vacationAccumulatedDays} วันทำการ  มีสิทธิลาพักผ่อนประจำปีอีก ${leave.vacationAnnualDays} วันทำการ  รวมเป็น ${totalEntitled} วันทำการ`
      ),
      { after: 40 }
    )
  );
  parts.push(
    makePara(
      makeRun(
        `ขอลาพักผ่อนตั้งแต่วันที่ ${startParts.day} เดือน ${startParts.month} พ.ศ. ${startParts.yearBE} ถึงวันที่ ${endParts.day} เดือน ${endParts.month} พ.ศ. ${endParts.yearBE} มีกำหนด ${leave.totalWorkingDays} วัน`
      ),
      { after: 40 }
    )
  );
  parts.push(
    makePara(
      makeRun(
        `ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ ${
          leave.contactInfo || "-"
        }  หมายเลขโทรศัพท์ ${leave.contactPhone || "-"}`
      ),
      { after: 160 }
    )
  );

  parts.push(
    makePara(makeRun("(ลงชื่อ)......................................................"), {
      leftIndent: 4500,
      align: "center",
      after: 20,
    })
  );
  parts.push(
    makePara(makeRun(`(${leave.applicantName})`), {
      leftIndent: 4500,
      align: "center",
      after: 20,
    })
  );
  parts.push(
    makePara(makeRun(`ตำแหน่ง ${leave.applicantPosition || "-"}`), {
      leftIndent: 4500,
      align: "center",
      after: 180,
    })
  );

  // สถิติการลา 3 คอลัมน์
  const statsTable = `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="4380" w:type="dxa"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="1460"/><w:gridCol w:w="1460"/><w:gridCol w:w="1460"/></w:tblGrid>
    <w:tr>
      ${makeTableCell(
        makePara(makeRun("ลามาแล้ว\n(วันทำการ)", { bold: true, size: 26 }), {
          align: "center",
          after: 0,
        }),
        1460,
        { borders: true, vAlign: "center" }
      )}
      ${makeTableCell(
        makePara(makeRun("ลาครั้งนี้\n(วันทำการ)", { bold: true, size: 26 }), {
          align: "center",
          after: 0,
        }),
        1460,
        { borders: true, vAlign: "center" }
      )}
      ${makeTableCell(
        makePara(makeRun("รวมเป็น\n(วันทำการ)", { bold: true, size: 26 }), {
          align: "center",
          after: 0,
        }),
        1460,
        { borders: true, vAlign: "center" }
      )}
    </w:tr>
    <w:tr>
      ${makeTableCell(
        makePara(makeRun(String(leave.prevVacationDays), { size: 28 }), {
          align: "center",
          after: 0,
        }),
        1460,
        { borders: true, vAlign: "center" }
      )}
      ${makeTableCell(
        makePara(makeRun(String(leave.totalWorkingDays), { size: 28 }), {
          align: "center",
          after: 0,
        }),
        1460,
        { borders: true, vAlign: "center" }
      )}
      ${makeTableCell(
        makePara(
          makeRun(String(totalUsed), { bold: true, size: 28 }),
          { align: "center", after: 0 }
        ),
        1460,
        { borders: true, vAlign: "center" }
      )}
    </w:tr>
  </w:tbl>`;

  const leftColXml = [
    makePara(makeRun("สถิติการลาในปีงบประมาณนี้", { bold: true }), {
      align: "center",
      after: 60,
    }),
    statsTable,
    makePara(
      makeRun(
        `(ลงชื่อ) ${
          leave.verifiedAt && leave.verifierName
            ? leave.verifierName
            : "................................."
        } ผู้ตรวจสอบ`
      ),
      { before: 160, after: 20 }
    ),
    makePara(
      makeRun(
        `(${leave.verifierName || "................................................"})`
      ),
      { leftIndent: 700, after: 20 }
    ),
    makePara(
      makeRun(
        `(ตำแหน่ง) ${leave.verifierPosition || "...................................."}`
      ),
      { after: 20 }
    ),
    makePara(
      makeRun(
        `วันที่ ${
          leave.verifiedAt
            ? formatThaiDateSlash(leave.verifiedAt)
            : "........ / ........ / ........"
        }`
      ),
      { after: 180 }
    ),
    makePara(makeRun("ในระหว่างที่ข้าพเจ้าลาพักผ่อนมอบหมายให้"), { after: 20 }),
    makePara(
      makeRun(
        `นาย/นาง/นางสาว ${
          leave.actingPersonName || ".................................."
        } ปฏิบัติหน้าที่แทน`
      ),
      { after: 80 }
    ),
    makePara(makeRun("(ลงชื่อ)........................................ ผู้มอบ"), {
      after: 20,
    }),
    makePara(makeRun(`(${leave.applicantName})`), {
      leftIndent: 700,
      after: 80,
    }),
    makePara(
      makeRun("(ลงชื่อ)........................................ ผู้ปฏิบัติหน้าที่แทน"),
      { after: 20 }
    ),
    makePara(
      makeRun(
        `(${leave.actingPersonName || "........................................"})`
      ),
      { leftIndent: 700, after: 0 }
    ),
  ].join("");

  const rightColXml = [
    makePara(makeRun("ความเห็นผู้บังคับบัญชา", { bold: true, underline: true }), {
      align: "center",
      after: 60,
    }),
    makePara(
      makeRun(
        leave.supervisorComment ||
          "...................................................................................."
      ),
      { after: 100 }
    ),
    makePara(
      makeRun(
        `(ลงชื่อ) ${
          leave.supervisorReviewedAt && leave.supervisorName
            ? leave.supervisorName
            : "..............................................."
        }`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `(${leave.supervisorName || "........................................"})`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `(ตำแหน่ง) ${leave.supervisorPosition || "...................................."}`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `วันที่ ${
          leave.supervisorReviewedAt
            ? formatThaiDateSlash(leave.supervisorReviewedAt)
            : "........ / ........ / ........"
        }`
      ),
      { align: "center", after: 200 }
    ),
    makePara(
      makeRun("คำสั่ง   ", { bold: true }) +
        makeRun(
          `${chk(leave.orderDecision === "approved")} อนุญาต    ${chk(
            leave.orderDecision === "rejected"
          )} ไม่อนุญาต`
        ),
      { align: "center", after: 60 }
    ),
    leave.orderComment
      ? makePara(makeRun(leave.orderComment), { align: "center", after: 80 })
      : makePara(makeRun(""), { after: 80 }),
    makePara(
      makeRun(
        `(ลงชื่อ) ${
          leave.orderedAt && leave.approverName
            ? leave.approverName
            : "................................................."
        }`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `(${leave.approverName || "........................................"})`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `(ตำแหน่ง) ${leave.approverPosition || "...................................."}`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `วันที่ ${
          leave.orderedAt
            ? formatThaiDateSlash(leave.orderedAt)
            : "........ / ........ / ........"
        }`
      ),
      { align: "center", after: 0 }
    ),
  ].join("");

  parts.push(`<w:tbl>
    <w:tblPr>
      <w:tblW w:w="9355" w:type="dxa"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblBorders>
        <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="4600"/><w:gridCol w:w="355"/><w:gridCol w:w="4400"/></w:tblGrid>
    <w:tr>
      ${makeTableCell(leftColXml, 4600)}
      ${makeTableCell(makePara(makeRun("")), 355)}
      ${makeTableCell(rightColXml, 4400)}
    </w:tr>
  </w:tbl>`);

  return parts.join("");
}

function buildGeneralLeaveBody(leave: LeaveRequestItem): string {
  const writtenParts = formatThaiDateParts(leave.writtenDate);
  const verifiedParts = formatThaiDateParts(leave.verifiedAt);
  const supParts = formatThaiDateParts(leave.supervisorReviewedAt);
  const ordParts = formatThaiDateParts(leave.orderedAt);

  const curSick = leave.leaveType === "sick_leave" ? leave.totalWorkingDays : 0;
  const curPersonal =
    leave.leaveType === "personal_leave" ? leave.totalWorkingDays : 0;
  const curMaternity =
    leave.leaveType === "maternity_leave" ? leave.totalWorkingDays : 0;

  const parts: string[] = [];

  parts.push(
    makePara(
      makeRun("ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว", { bold: true, size: 38 }),
      { align: "center", after: 100 }
    )
  );

  parts.push(
    makePara(
      makeRun(
        `เขียนที่ ${
          leave.writtenAt ||
          "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
        }`
      ),
      { leftIndent: 4820, after: 20 }
    )
  );
  parts.push(
    makePara(
      makeRun(
        `วันที่ ${writtenParts.day || "...."} เดือน ${
          writtenParts.month || "............"
        } พ.ศ. ${writtenParts.yearBE || "......"}`
      ),
      { leftIndent: 4600, firstLine: 220, after: 100 }
    )
  );

  parts.push(
    makePara(makeRun("เรื่อง  ", { bold: true }) + makeRun(leave.subject), {
      after: 40,
    })
  );
  parts.push(
    makePara(
      makeRun("เรียน  ", { bold: true }) +
        makeRun(
          leave.toRecipient ||
            "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
        ),
      { after: 80 }
    )
  );

  parts.push(
    makePara(
      makeRun(
        `ข้าพเจ้า ${leave.applicantName}   ตำแหน่ง ${
          leave.applicantPosition || "-"
        }`
      ),
      { firstLine: 720, after: 40 }
    )
  );
  parts.push(
    makePara(
      makeRun(
        `กลุ่ม/ฝ่าย ${
          leave.applicantDivision || "-"
        } สังกัด สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร`
      ),
      { after: 60 }
    )
  );

  parts.push(
    makePara(
      makeRun(
        `${chk(leave.leaveType === "sick_leave")} ป่วย${
          leave.leaveType === "sick_leave" && leave.reason
            ? `  เนื่องจาก ${leave.reason}`
            : ""
        }`
      ),
      { leftIndent: 900, after: 20 }
    )
  );
  parts.push(
    makePara(
      makeRun(
        `ขอลา   ${chk(
          leave.leaveType === "personal_leave"
        )} กิจส่วนตัว   เนื่องจาก ${
          leave.leaveType === "personal_leave"
            ? leave.reason || "-"
            : "............................................................"
        }`
      ),
      { leftIndent: 260, after: 20 }
    )
  );
  parts.push(
    makePara(
      makeRun(
        `${chk(leave.leaveType === "maternity_leave")} คลอดบุตร${
          leave.leaveType === "maternity_leave" && leave.reason
            ? ` (${leave.reason})`
            : ""
        }`
      ),
      { leftIndent: 900, after: 60 }
    )
  );

  parts.push(
    makePara(
      makeRun(
        `ตั้งแต่วันที่ ${formatThaiDateFull(
          leave.startDate
        )} ถึงวันที่ ${formatThaiDateFull(leave.endDate)} มีกำหนด ${
          leave.totalWorkingDays
        } วัน`
      ),
      { after: 40 }
    )
  );

  parts.push(
    makePara(
      makeRun(
        `ข้าพเจ้าได้ลา  ${chk(leave.lastLeaveType === "sick_leave")} ป่วย  ${chk(
          leave.lastLeaveType === "personal_leave"
        )} กิจส่วนตัว  ${chk(
          leave.lastLeaveType === "maternity_leave"
        )} คลอดบุตร  ครั้งสุดท้ายตั้งแต่วันที่ ${
          leave.lastLeaveStartDate
            ? formatThaiDateFull(leave.lastLeaveStartDate)
            : "-"
        }`
      ),
      { after: 20 }
    )
  );

  const contactCombined =
    [leave.contactInfo, leave.contactPhone].filter(Boolean).join(" โทร. ") ||
    "-";
  parts.push(
    makePara(
      makeRun(
        `ถึงวันที่ ${
          leave.lastLeaveEndDate
            ? formatThaiDateFull(leave.lastLeaveEndDate)
            : "-"
        } มีกำหนด ${
          leave.lastLeaveDays ?? "-"
        } วัน  ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ ${contactCombined}`
      ),
      { after: 120 }
    )
  );

  parts.push(
    makePara(makeRun("(ลงชื่อ)......................................................"), {
      leftIndent: 4500,
      align: "center",
      after: 20,
    })
  );
  parts.push(
    makePara(makeRun(`(${leave.applicantName})`), {
      leftIndent: 4500,
      align: "center",
      after: 20,
    })
  );
  parts.push(
    makePara(makeRun(`ตำแหน่ง ${leave.applicantPosition || "-"}`), {
      leftIndent: 4500,
      align: "center",
      after: 140,
    })
  );

  const statRow = (
    label: string,
    prev: number,
    cur: number
  ) => `<w:tr>
    ${makeTableCell(makePara(makeRun(label, { size: 26 }), { after: 0 }), 1100, {
      borders: true,
      vAlign: "center",
    })}
    ${makeTableCell(
      makePara(makeRun(String(prev), { size: 26 }), {
        align: "center",
        after: 0,
      }),
      1100,
      { borders: true, vAlign: "center" }
    )}
    ${makeTableCell(
      makePara(makeRun(cur ? String(cur) : "", { size: 26 }), {
        align: "center",
        after: 0,
      }),
      1100,
      { borders: true, vAlign: "center" }
    )}
    ${makeTableCell(
      makePara(makeRun(String(prev + cur), { bold: true, size: 26 }), {
        align: "center",
        after: 0,
      }),
      1100,
      { borders: true, vAlign: "center" }
    )}
  </w:tr>`;

  const statsTable = `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="4400" w:type="dxa"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="1100"/><w:gridCol w:w="1100"/><w:gridCol w:w="1100"/><w:gridCol w:w="1100"/></w:tblGrid>
    <w:tr>
      ${makeTableCell(
        makePara(makeRun("ประเภทลา", { bold: true, size: 26 }), {
          align: "center",
          after: 0,
        }),
        1100,
        { borders: true, vAlign: "center" }
      )}
      ${makeTableCell(
        makePara(makeRun("ลามาแล้ว\n(วันทำการ)", { bold: true, size: 24 }), {
          align: "center",
          after: 0,
        }),
        1100,
        { borders: true, vAlign: "center" }
      )}
      ${makeTableCell(
        makePara(makeRun("ลาครั้งนี้\n(วันทำการ)", { bold: true, size: 24 }), {
          align: "center",
          after: 0,
        }),
        1100,
        { borders: true, vAlign: "center" }
      )}
      ${makeTableCell(
        makePara(makeRun("รวมเป็น\n(วันทำการ)", { bold: true, size: 24 }), {
          align: "center",
          after: 0,
        }),
        1100,
        { borders: true, vAlign: "center" }
      )}
    </w:tr>
    ${statRow("ป่วย", leave.prevSickDays, curSick)}
    ${statRow("กิจส่วนตัว", leave.prevPersonalDays, curPersonal)}
    ${statRow("คลอดบุตร", leave.prevMaternityDays, curMaternity)}
  </w:tbl>`;

  const leftColXml = [
    makePara(makeRun("สถิติการลาในปีงบประมาณนี้", { bold: true }), {
      align: "center",
      after: 60,
    }),
    statsTable,
    makePara(
      makeRun(
        `(ลงชื่อ) ${
          leave.verifiedAt && leave.verifierName
            ? leave.verifierName
            : "................................."
        } ผู้ตรวจสอบ`
      ),
      { before: 140, after: 20 }
    ),
    makePara(
      makeRun(
        `(${leave.verifierName || "................................................"})`
      ),
      { leftIndent: 700, after: 20 }
    ),
    makePara(
      makeRun(
        `ตำแหน่ง ${leave.verifierPosition || "...................................."}`
      ),
      { after: 20 }
    ),
    makePara(
      makeRun(
        `วันที่ ${verifiedParts.day || "...."} เดือน ${
          verifiedParts.month || "............"
        } พ.ศ. ${verifiedParts.yearBE || "......"}`
      ),
      { after: 0 }
    ),
  ].join("");

  const rightColXml = [
    makePara(makeRun("ความเห็นผู้บังคับบัญชา", { bold: true, underline: true }), {
      align: "center",
      after: 60,
    }),
    makePara(
      makeRun(
        leave.supervisorComment ||
          "...................................................................................."
      ),
      { after: 100 }
    ),
    makePara(
      makeRun(
        `(ลงชื่อ) ${
          leave.supervisorReviewedAt && leave.supervisorName
            ? leave.supervisorName
            : "..............................................."
        }`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `(${leave.supervisorName || "........................................"})`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `ตำแหน่ง ${leave.supervisorPosition || "...................................."}`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `วันที่ ${supParts.day || "...."} เดือน ${
          supParts.month || "............"
        } พ.ศ. ${supParts.yearBE || "......"}`
      ),
      { align: "center", after: 160 }
    ),
    makePara(
      makeRun("คำสั่ง   ", { bold: true }) +
        makeRun(
          `${chk(leave.orderDecision === "approved")} อนุญาต    ${chk(
            leave.orderDecision === "rejected"
          )} ไม่อนุญาต`
        ),
      { align: "center", after: 60 }
    ),
    leave.orderComment
      ? makePara(makeRun(leave.orderComment), { align: "center", after: 80 })
      : makePara(makeRun(""), { after: 80 }),
    makePara(
      makeRun(
        `(ลงชื่อ) ${
          leave.orderedAt && leave.approverName
            ? leave.approverName
            : "................................................."
        }`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `(${leave.approverName || "........................................"})`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `ตำแหน่ง ${leave.approverPosition || "...................................."}`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `วันที่ ${ordParts.day || "...."} เดือน ${
          ordParts.month || "............"
        } พ.ศ. ${ordParts.yearBE || "......"}`
      ),
      { align: "center", after: 0 }
    ),
  ].join("");

  parts.push(`<w:tbl>
    <w:tblPr>
      <w:tblW w:w="9355" w:type="dxa"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblBorders>
        <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="4600"/><w:gridCol w:w="355"/><w:gridCol w:w="4400"/></w:tblGrid>
    <w:tr>
      ${makeTableCell(leftColXml, 4600)}
      ${makeTableCell(makePara(makeRun("")), 355)}
      ${makeTableCell(rightColXml, 4400)}
    </w:tr>
  </w:tbl>`);

  parts.push(
    makePara(
      makeRun("หมายเหตุ :-  ", { bold: true, size: 28 }) +
        makeRun(
          "การลากิจ + ลาป่วย ต้องไม่เกิน 23 วันทำการ จึงมีสิทธิเลื่อนขั้นเงินเดือน/ค่าจ้าง\n                ในรอบ 6 เดือน คือ 1 ต.ค. – 31 มี.ค. , 1 เม.ย. – 30 ก.ย.",
          { size: 28 }
        ),
      { before: 140, after: 0 }
    )
  );

  return parts.join("");
}

export async function downloadLeaveDocx(leave: LeaveRequestItem): Promise<void> {
  const zip = new JSZip();

  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-officedocument.package.core-properties+xml"/></Types>`;
  const rel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const wordRel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const now = new Date().toISOString();
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEsc(
    `${leave.requestNo} ${leave.applicantName}`
  )}</dc:title><dc:creator>สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`;

  const body =
    leave.leaveType === "vacation_leave"
      ? buildVacationLeaveBody(leave)
      : buildGeneralLeaveBody(leave);

  const section = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="1134" w:bottom="720" w:left="1417" w:header="360" w:footer="360"/><w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}"><w:body>${body}${section}</w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W_NS}"><w:docDefaults><w:rPrDefault><w:rPr>${R_FONTS}<w:sz w:val="30"/><w:szCs w:val="30"/><w:lang w:val="th-TH" w:eastAsia="th-TH"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="40" w:line="250" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;

  zip.file("[Content_Types].xml", types);
  zip.file("_rels/.rels", rel);
  zip.file("word/_rels/document.xml.rels", wordRel);
  zip.file("word/styles.xml", stylesXml);
  zip.file("word/document.xml", documentXml);
  zip.file("docProps/core.xml", core);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${leave.requestNo}_${leave.applicantName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
