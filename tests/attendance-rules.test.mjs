import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyAttendanceByOfficialHours,
  getAttendanceIoLabel,
  THAI_FISCAL_MONTH_ORDER,
  getThaiFiscalPeriod,
  getFiscalYearDateRange,
  getMonthDateRange,
  groupMonthsByFiscalYear,
  collectAvailableMonths,
} from '../lib/attendance-rules.ts';
import { decodeCif12AttendanceRecords } from '../lib/hip-cmi681s.ts';
import { reclassifyAttendanceStoreByOfficialHours } from '../lib/attendance-db.ts';

describe('Task 1: Shared Official Hours Classifier & Thai Fiscal Calendar Utility', () => {
  describe('classifyAttendanceByOfficialHours', () => {
    it('should classify exact working-hours boundaries correctly', () => {
      // 00:00:00 - 04:59:59 -> Mode 4 (สแกนระหว่างวัน / ก่อน 16:30)
      assert.deepEqual(classifyAttendanceByOfficialHours('2026-11-12 04:59:59'), {
        ioMode: 4,
        ioLabel: 'สแกนระหว่างวัน / ก่อน 16:30',
      });

      // 05:00:00 - 08:30:59 -> Mode 1 (เข้าราชการเช้า (ปกติ))
      assert.deepEqual(classifyAttendanceByOfficialHours('2026-11-12 05:00:00'), {
        ioMode: 1,
        ioLabel: 'เข้าราชการเช้า (ปกติ)',
      });
      assert.deepEqual(classifyAttendanceByOfficialHours('2026-11-12 08:30:59'), {
        ioMode: 1,
        ioLabel: 'เข้าราชการเช้า (ปกติ)',
      });

      // 08:31:00 - 12:00:59 -> Mode 3 (สาย / อาจลา (08:31-12:00))
      assert.deepEqual(classifyAttendanceByOfficialHours('2026-11-12 08:31:00'), {
        ioMode: 3,
        ioLabel: 'สาย / อาจลา (08:31-12:00)',
      });
      assert.deepEqual(classifyAttendanceByOfficialHours('2026-11-12 12:00:59'), {
        ioMode: 3,
        ioLabel: 'สาย / อาจลา (08:31-12:00)',
      });

      // 12:01:00 - 16:29:59 -> Mode 4 (สแกนระหว่างวัน / ก่อน 16:30)
      assert.deepEqual(classifyAttendanceByOfficialHours('2026-11-12 12:01:00'), {
        ioMode: 4,
        ioLabel: 'สแกนระหว่างวัน / ก่อน 16:30',
      });
      assert.deepEqual(classifyAttendanceByOfficialHours('2026-11-12 16:29:59'), {
        ioMode: 4,
        ioLabel: 'สแกนระหว่างวัน / ก่อน 16:30',
      });

      // 16:30:00 - 23:59:59 -> Mode 2 (ออกราชการ (Check-Out))
      assert.deepEqual(classifyAttendanceByOfficialHours('2026-11-12 16:30:00'), {
        ioMode: 2,
        ioLabel: 'ออกราชการ (Check-Out)',
      });
      assert.deepEqual(classifyAttendanceByOfficialHours('2026-11-12 23:59:59'), {
        ioMode: 2,
        ioLabel: 'ออกราชการ (Check-Out)',
      });
    });

    it('should support ISO timestamps and time-only strings', () => {
      assert.equal(classifyAttendanceByOfficialHours('2026-11-12T07:45:00.000Z').ioMode, 1);
      assert.equal(classifyAttendanceByOfficialHours('08:30:00').ioMode, 1);
      assert.equal(classifyAttendanceByOfficialHours('08:31:00').ioMode, 3);
      assert.equal(classifyAttendanceByOfficialHours('13:00:00').ioMode, 4);
      assert.equal(classifyAttendanceByOfficialHours('17:15:00').ioMode, 2);
    });
  });

  describe('getAttendanceIoLabel', () => {
    it('should return matching Thai labels for all valid modes and fallback for unknown', () => {
      assert.equal(getAttendanceIoLabel(1), 'เข้าราชการเช้า (ปกติ)');
      assert.equal(getAttendanceIoLabel(2), 'ออกราชการ (Check-Out)');
      assert.equal(getAttendanceIoLabel(3), 'สาย / อาจลา (08:31-12:00)');
      assert.equal(getAttendanceIoLabel(4), 'สแกนระหว่างวัน / ก่อน 16:30');
      assert.equal(getAttendanceIoLabel(99), 'โหมด 99');
    });
  });

  describe('THAI_FISCAL_MONTH_ORDER', () => {
    it('should order months starting with October (10) through September (9)', () => {
      assert.deepEqual([...THAI_FISCAL_MONTH_ORDER], [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });

  describe('getThaiFiscalPeriod', () => {
    it('should correctly resolve cross-fiscal-year boundary for 2026-09-30 (FY 2569 Q4)', () => {
      const period = getThaiFiscalPeriod('2026-09-30');
      assert.equal(period.fiscalYear, 2569);
      assert.equal(period.calendarYearBE, 2569);
      assert.equal(period.month, 9);
      assert.equal(period.day, 30);
      assert.equal(period.monthShort, 'ก.ย.');
      assert.equal(period.monthFull, 'กันยายน');
      assert.equal(period.fiscalMonthOrder, 12);
      assert.equal(period.quarter, 4);
      assert.equal(period.yearMonth, '2026-09');
      assert.equal(period.monthYearLabel, 'กันยายน 2569');
      assert.equal(period.fiscalLabel, 'ปีงบประมาณ 2569');
      assert.equal(period.dateShortBE, '30 ก.ย. 2569');
      assert.equal(period.dateFiscalLabel, '30 ก.ย. 2569 • ปีงบ 2569');
    });

    it('should correctly resolve cross-fiscal-year boundary for 2026-10-01 (FY 2570 Q1)', () => {
      const period = getThaiFiscalPeriod('2026-10-01');
      assert.equal(period.fiscalYear, 2570);
      assert.equal(period.calendarYearBE, 2569);
      assert.equal(period.month, 10);
      assert.equal(period.day, 1);
      assert.equal(period.monthShort, 'ต.ค.');
      assert.equal(period.monthFull, 'ตุลาคม');
      assert.equal(period.fiscalMonthOrder, 1);
      assert.equal(period.quarter, 1);
      assert.equal(period.yearMonth, '2026-10');
      assert.equal(period.monthYearLabel, 'ตุลาคม 2569');
      assert.equal(period.fiscalLabel, 'ปีงบประมาณ 2570');
      assert.equal(period.dateShortBE, '1 ต.ค. 2569');
      assert.equal(period.dateFiscalLabel, '1 ต.ค. 2569 • ปีงบ 2570');
    });

    it('should format full date timestamps like 2026-11-12 16:35:00', () => {
      const period = getThaiFiscalPeriod('2026-11-12 16:35:00');
      assert.equal(period.fiscalYear, 2570);
      assert.equal(period.calendarYearBE, 2569);
      assert.equal(period.month, 11);
      assert.equal(period.day, 12);
      assert.equal(period.fiscalMonthOrder, 2);
      assert.equal(period.quarter, 1);
      assert.equal(period.dateShortBE, '12 พ.ย. 2569');
      assert.equal(period.dateFiscalLabel, '12 พ.ย. 2569 • ปีงบ 2570');
    });
  });

  describe('getMonthDateRange', () => {
    it('should return correct ranges for leap and non-leap years', () => {
      assert.deepEqual(getMonthDateRange('2024-02'), {
        dateFrom: '2024-02-01',
        dateTo: '2024-02-29',
      });
      assert.deepEqual(getMonthDateRange('2026-02'), {
        dateFrom: '2026-02-01',
        dateTo: '2026-02-28',
      });
      assert.deepEqual(getMonthDateRange('2026-11'), {
        dateFrom: '2026-11-01',
        dateTo: '2026-11-30',
      });
    });
  });

  describe('getFiscalYearDateRange', () => {
    it('should return October 1 to September 30 date range for given fiscal year', () => {
      assert.deepEqual(getFiscalYearDateRange(2570), {
        dateFrom: '2026-10-01',
        dateTo: '2027-09-30',
      });
      assert.deepEqual(getFiscalYearDateRange(2569), {
        dateFrom: '2025-10-01',
        dateTo: '2026-09-30',
      });
    });
  });

  describe('groupMonthsByFiscalYear', () => {
    it('should group and sort fiscal years descending and months in fiscal order', () => {
      const input = ['2026-09', '2026-10', '2026-11', '2025-10', '2026-01'];
      const grouped = groupMonthsByFiscalYear(input);

      assert.equal(grouped.length, 2);
      assert.equal(grouped[0].fiscalYear, 2570);
      assert.deepEqual(grouped[0].months, ['2026-10', '2026-11']);

      assert.equal(grouped[1].fiscalYear, 2569);
      assert.deepEqual(grouped[1].months, ['2025-10', '2026-01', '2026-09']);
    });
  });

  describe('collectAvailableMonths', () => {
    it('should extract unique descending YYYY-MM strings from mixed inputs', () => {
      const inputs = [
        '2026-10-01',
        '2026-11-12 16:35:00',
        { scanTimestamp: '2026-09-30 08:00:00' },
        { scan_timestamp: '2026-11-01 08:00:00' },
        { timestamp: '2025-10-15' },
        '2026-10-15',
      ];
      const months = collectAvailableMonths(inputs);
      assert.deepEqual(months, ['2026-11', '2026-10', '2026-09', '2025-10']);
    });
  });

  describe('decodeCif12AttendanceRecords', () => {
    it('should decode synthetic evening record at 16:35:00 with raw r[15] = 1 as ioMode 2', () => {
      // Build 20-byte CIF12 record for 2026-11-12 16:35:00, userId = 101, raw ioMode = 1
      const buf = Buffer.alloc(20);
      buf.writeUInt32LE(101, 0); // userId
      buf[4] = 1; // machineId
      buf[7] = 0; // second
      const year = 2026;
      const month = 11;
      const day = 12;
      const hour = 16;
      const minute = 35;
      const w =
        ((year - 1900) << 2) |
        (month << 12) |
        (day << 16) |
        (hour << 21) |
        (minute << 26);
      buf.writeUInt32LE(w >>> 0, 8);
      buf[15] = 1; // raw r[15] = 1 (hardware default)
      buf[19] = (1 << 4); // verifyMode = 1 (FP)

      const records = decodeCif12AttendanceRecords(buf);
      assert.equal(records.length, 1);
      assert.equal(records[0].userId, 101);
      assert.equal(records[0].timestamp, '2026-11-12 16:35:00');
      assert.equal(records[0].ioMode, 2);
      assert.equal(records[0].ioLabel, 'ออกราชการ (Check-Out)');
    });
  });
});

describe('Task 2: reclassifyAttendanceStoreByOfficialHours', () => {
  it('should reclassify unedited device logs while preserving edited device logs and manual logs', () => {
    const mockStore = {
      mysqlConfig: {
        host: '127.0.0.1',
        port: 3308,
        user: 'smartmso',
        database: 'smart_mso_attendance',
        scannerIp: '192.168.162.15',
        scannerPort: 5005,
      },
      lastSyncedAt: null,
      lastMysqlSyncedAt: null,
      deviceTotalRecords: 3,
      mappings: {},
      authorizedEditors: [],
      logs: [
        {
          id: 'log_unedited_evening',
          recordUid: 'dev_1_10_2026-11-12 17:00:00',
          scannerUserId: 10,
          memberId: 'm_10',
          memberName: 'เจ้าหน้าที่ ทดสอบ 1',
          division: 'ฝ่ายบริหารทั่วไป',
          position: 'นักวิชาการ',
          scanTimestamp: '2026-11-12 17:00:00',
          originalTimestamp: '2026-11-12 17:00:00',
          ioMode: 1,
          ioLabel: 'เข้างาน (Check-In)',
          verifyMode: 1,
          verifyLabel: 'ลายนิ้วมือ (FP)',
          machineId: 1,
          source: 'device',
          isEdited: false,
          isDeleted: false,
        },
        {
          id: 'log_edited_evening',
          recordUid: 'dev_1_11_2026-11-12 17:00:00',
          scannerUserId: 11,
          memberId: 'm_11',
          memberName: 'เจ้าหน้าที่ ทดสอบ 2',
          division: 'ฝ่ายบริหารทั่วไป',
          position: 'นักวิชาการ',
          scanTimestamp: '2026-11-12 17:00:00',
          originalTimestamp: '2026-11-12 17:00:00',
          ioMode: 1,
          ioLabel: 'เข้างาน (Check-In)',
          verifyMode: 1,
          verifyLabel: 'ลายนิ้วมือ (FP)',
          machineId: 1,
          source: 'device',
          isEdited: true,
          editedBy: 'ผู้ดูแลระบบ',
          editNote: 'ตั้งใจบันทึกเป็นเข้างานกะพิเศษ',
          isDeleted: false,
        },
        {
          id: 'log_manual_late',
          recordUid: 'manual_12_2026-11-12 08:40:00_1',
          scannerUserId: 12,
          memberId: 'm_12',
          memberName: 'เจ้าหน้าที่ ทดสอบ 3',
          division: 'ฝ่ายบริหารทั่วไป',
          position: 'นักวิชาการ',
          scanTimestamp: '2026-11-12 08:40:00',
          originalTimestamp: '2026-11-12 08:40:00',
          ioMode: 1,
          ioLabel: 'เข้างาน (Check-In)',
          verifyMode: 9,
          verifyLabel: 'บันทึกโดยผู้ดูแล (Manual)',
          machineId: 1,
          source: 'manual',
          isEdited: false,
          isDeleted: false,
        },
      ],
    };

    const result = reclassifyAttendanceStoreByOfficialHours(mockStore);

    assert.equal(result.updatedCount, 1);
    assert.equal(result.changedLogs.length, 1);
    assert.equal(result.changedLogs[0].id, 'log_unedited_evening');

    // 1. Unedited device log at 17:00:00 updated to ioMode 2
    assert.equal(mockStore.logs[0].ioMode, 2);
    assert.equal(mockStore.logs[0].ioLabel, 'ออกราชการ (Check-Out)');

    // 2. Edited device log (isEdited: true) untouched
    assert.equal(mockStore.logs[1].ioMode, 1);
    assert.equal(mockStore.logs[1].ioLabel, 'เข้างาน (Check-In)');

    // 3. Manual log (source: "manual") untouched
    assert.equal(mockStore.logs[2].ioMode, 1);
    assert.equal(mockStore.logs[2].ioLabel, 'เข้างาน (Check-In)');
  });
});

