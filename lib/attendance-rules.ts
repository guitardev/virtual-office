/**
 * Smart MSO - Attendance Official Hours Classifier & Thai Fiscal Calendar Utility
 * -------------------------------------------------------------------------------
 * TypeScript wrapper & type definitions for Attendance Rules.
 * Pure runtime logic is implemented in `./attendance-rules-core.mjs` so that standalone
 * Node scripts (scripts/sync-attendance.mjs) and Next.js can share the exact same runtime code.
 */

import {
  THAI_MONTHS_FULL as _THAI_MONTHS_FULL,
  THAI_MONTHS_SHORT as _THAI_MONTHS_SHORT,
  THAI_FISCAL_MONTH_ORDER as _THAI_FISCAL_MONTH_ORDER,
  ATTENDANCE_IO_LABELS as _ATTENDANCE_IO_LABELS,
  getAttendanceIoLabel as _getAttendanceIoLabel,
  classifyAttendanceByOfficialHours as _classifyAttendanceByOfficialHours,
  getThaiFiscalPeriod as _getThaiFiscalPeriod,
  getMonthDateRange as _getMonthDateRange,
  getFiscalYearDateRange as _getFiscalYearDateRange,
  groupMonthsByFiscalYear as _groupMonthsByFiscalYear,
  collectAvailableMonths as _collectAvailableMonths,
} from './attendance-rules-core.mjs';

export type AttendanceIoMode = 1 | 2 | 3 | 4;

export interface AttendanceClassification {
  ioMode: AttendanceIoMode;
  ioLabel: string;
}

export interface ThaiFiscalPeriod {
  fiscalYear: number;
  calendarYearBE: number;
  month: number;
  day: number;
  monthShort: string;
  monthFull: string;
  fiscalMonthOrder: number;
  quarter: number;
  yearMonth: string;
  monthYearLabel: string;
  fiscalLabel: string;
  dateShortBE: string;
  dateFiscalLabel: string;
}

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

export interface FiscalYearGroup {
  fiscalYear: number;
  label: string;
  fiscalLabel: string;
  months: string[];
  dateFrom: string;
  dateTo: string;
}

export type MonthExtractionInput =
  | string
  | {
      scanTimestamp?: string;
      scan_timestamp?: string;
      timestamp?: string;
      originalTimestamp?: string;
      original_timestamp?: string;
      date?: string;
    };

export const THAI_MONTHS_FULL: readonly string[] = _THAI_MONTHS_FULL;
export const THAI_MONTHS_SHORT: readonly string[] = _THAI_MONTHS_SHORT;
export const THAI_FISCAL_MONTH_ORDER: readonly number[] = _THAI_FISCAL_MONTH_ORDER;
export const ATTENDANCE_IO_LABELS: Readonly<Record<AttendanceIoMode, string>> = _ATTENDANCE_IO_LABELS;

export function getAttendanceIoLabel(ioMode: number): string {
  return _getAttendanceIoLabel(ioMode);
}

export function classifyAttendanceByOfficialHours(timestamp: string): AttendanceClassification {
  return _classifyAttendanceByOfficialHours(timestamp) as AttendanceClassification;
}

export function getThaiFiscalPeriod(isoDateOrTimestamp: string): ThaiFiscalPeriod {
  return _getThaiFiscalPeriod(isoDateOrTimestamp) as ThaiFiscalPeriod;
}

export function getMonthDateRange(yearMonth: string): DateRange {
  return _getMonthDateRange(yearMonth);
}

export function getFiscalYearDateRange(fiscalYearBE: number): DateRange {
  return _getFiscalYearDateRange(fiscalYearBE);
}

export function groupMonthsByFiscalYear(yearMonths: string[]): FiscalYearGroup[] {
  return _groupMonthsByFiscalYear(yearMonths) as FiscalYearGroup[];
}

export function collectAvailableMonths(logsOrDates: MonthExtractionInput[]): string[] {
  return _collectAvailableMonths(logsOrDates);
}
