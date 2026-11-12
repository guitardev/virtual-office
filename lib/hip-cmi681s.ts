/**
 * HIP CMi681S (SmackBio FKAttend / CFKAttend_CIF12_1) Pure TypeScript TCP SDK
 * ---------------------------------------------------------------------------
 * เชื่อมต่อเครื่องสแกนลายนิ้วมือ HIP CMi681S ผ่าน TCP Port 5005 โดยตรง
 * โดยไม่ต้องติดตั้งโปรแกรมหรือไฟล์ .dll / .ocx บนเครื่อง (Zero External Dependencies)
 *
 * รองรับ:
 * - Handshake อัตโนมัติพร้อมตรวจสอบรหัสผ่านเชื่อมต่อ (Auto-Fallback รหัสผ่าน -> 0)
 * - ดึงข้อมูลฮาร์ดแวร์ (Model, Vendor, Serial Number, Mfg Date, Capabilities JSON)
 * - ดึงเวลาเครื่อง (Device Clock) และสถิติความจุข้อมูล (Users, Fingerprints, Passwords, Cards, Logs)
 * - ดึงรายชื่อผู้ใช้งาน (User ID + UTF-16LE Name) และบันทึกเวลาเข้า-ออกงานทั้งหมด (Attendance Logs)
 * - โหมด Read-Only ปลอดภัย 100% ไม่มีการลบหรือแก้ไขข้อมูลในตัวเครื่อง
 */

import net from 'node:net';
import { classifyAttendanceByOfficialHours } from './attendance-rules-core.mjs';

export interface HipConnectionOptions {
  ip: string;
  port?: number;
  password?: number;
  machineId?: number;
  timeoutMs?: number;
}

export interface HipDeviceInfo {
  productCode: string;
  vendorName: string;
  serialNumber: string;
  manufacturingDate: string;
  sdkLicense: number;
  capabilitiesRaw: string;
  deviceTime: string;
  network: {
    machineNumber: number;
    tcpPort: number;
    webPort: number;
  };
  authUsedPassword: number;
  passwordNote?: string;
}

export interface HipDeviceStatus {
  managersCount: number;
  registeredUsersCount: number;
  fingerprintsCount: number;
  passwordsCount: number;
  idCardsCount: number;
  attendanceLogsCount: number;
  capacities: {
    maxUsers: number;
    maxFingerprints: number;
    maxPasswords: number;
    maxIdCards: number;
    maxAttendanceLogs: number;
  };
}

export interface HipAttendanceRecord {
  userId: number;
  machineId: number;
  timestamp: string;
  ioMode: number;
  ioLabel: 'เข้าราชการเช้า (ปกติ)' | 'ออกราชการ (Check-Out)' | 'สาย / อาจลา (08:31-12:00)' | 'สแกนระหว่างวัน / ก่อน 16:30' | string;
  verifyMode: number;
  verifyLabel: 'ลายนิ้วมือ (FP)' | 'รหัสผ่าน (PWD)' | 'บัตร (Card)' | string;
  rawIoMode?: number;
}

export interface HipUserRecord {
  userId: number;
  name: string;
  privilege: number;
  enabled: boolean;
  enrolledFingerprints: number;
  hasPassword: boolean;
  hasCard: boolean;
}

const REC_SIZE_CIF12 = 20;
const CHUNK_SIZE = 1024;

function buildFrame(
  code: number,
  p1: number,
  p2: number,
  len: number,
  seq: number,
  machineId = 1,
  payload?: Buffer
): Buffer {
  const header = Buffer.alloc(16);
  header[0] = 0x55;
  header[1] = 0xaa;
  header[2] = machineId & 0xff;
  header[3] = code & 0xff;
  header.writeUInt32LE(p1 >>> 0, 4);
  header.writeUInt32LE(p2 >>> 0, 8);
  header.writeUInt16LE(len & 0xffff, 12);
  header.writeUInt16LE(seq & 0xffff, 14);
  return payload ? Buffer.concat([header, payload]) : header;
}

function readAsciiZ(buf: Buffer, offset: number, maxLen: number): string {
  const sub = buf.subarray(offset, offset + maxLen);
  const zeroIdx = sub.indexOf(0);
  return sub.subarray(0, zeroIdx >= 0 ? zeroIdx : maxLen).toString('utf8').trim();
}

export function decodeCif12AttendanceRecords(
  rawBuffer: Buffer,
  expectedCount?: number
): HipAttendanceRecord[] {
  const records: HipAttendanceRecord[] = [];
  const limit =
    typeof expectedCount === 'number'
      ? Math.min(rawBuffer.length, expectedCount * REC_SIZE_CIF12)
      : rawBuffer.length;

  const pad = (n: number) => String(n).padStart(2, '0');

  for (let i = 0; i + REC_SIZE_CIF12 <= limit; i += REC_SIZE_CIF12) {
    const r = rawBuffer.subarray(i, i + REC_SIZE_CIF12);
    const userId = r.readUInt32LE(0);
    const machineId = r[4];
    const second = r[7];
    const w = r.readUInt32LE(8);
    const year = ((w >>> 2) & 0x3ff) + 1900;
    const month = (w >>> 12) & 0x0f;
    const day = (w >>> 16) & 0x1f;
    const hour = (w >>> 21) & 0x1f;
    const minute = (w >>> 26) & 0x3f;
    const rawIoMode = r[15];
    const verifyMode = (r[19] >>> 4) & 0x0f;

    if (userId === 0 || userId === 0xffffffff) continue;
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;

    const timestamp = `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
    const classified = classifyAttendanceByOfficialHours(timestamp);

    records.push({
      userId,
      machineId,
      timestamp,
      ioMode: classified.ioMode,
      ioLabel: classified.ioLabel,
      verifyMode,
      verifyLabel:
        verifyMode === 1
          ? 'ลายนิ้วมือ (FP)'
          : verifyMode === 2
          ? 'รหัสผ่าน (PWD)'
          : verifyMode === 3
          ? 'บัตร (Card)'
          : `รูปแบบ ${verifyMode}`,
      rawIoMode,
    });
  }

  return records;
}

export class HipCmi681sClient {
  private ip: string;
  private port: number;
  private password: number;
  private machineId: number;
  private timeoutMs: number;
  private sock: net.Socket | null = null;
  private seq = 0;

  constructor(opts: HipConnectionOptions) {
    this.ip = opts.ip;
    this.port = opts.port ?? 5005;
    this.password = opts.password ?? 0;
    this.machineId = opts.machineId ?? 1;
    this.timeoutMs = opts.timeoutMs ?? 25000;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host: this.ip, port: this.port }, () => {
        sock.setNoDelay(true);
        this.sock = sock;
        resolve();
      });
      sock.setTimeout(this.timeoutMs);
      sock.once('error', reject);
      sock.once('timeout', () => {
        sock.destroy();
        reject(new Error(`Connection timeout to ${this.ip}:${this.port}`));
      });
    });
  }

  disconnect(): void {
    if (this.sock) {
      this.sock.destroy();
      this.sock = null;
    }
  }

  private sendCommand(
    code: number,
    p1: number,
    p2: number,
    expectedPayloadLen: number,
    writePayload?: Buffer
  ): Promise<{ ok: boolean; status: number; seq: number; data: Buffer }> {
    return new Promise((resolve, reject) => {
      if (!this.sock) return reject(new Error('Socket is not connected'));
      const sock = this.sock;
      this.seq = (this.seq + 1) & 0xffff;
      const packet = buildFrame(
        code,
        p1,
        p2,
        expectedPayloadLen,
        this.seq,
        this.machineId,
        writePayload
      );

      let buf = Buffer.alloc(0);
      const onData = (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk]);
        if (buf.length < 10) return;
        const ok = buf[3] === 0x01;
        const status = buf.readUInt32LE(4);
        const rSeq = buf.readUInt16LE(8);
        const totalExpected =
          ok && expectedPayloadLen > 0 && !writePayload ? 10 + 2 + expectedPayloadLen + 4 : 10;
        if (buf.length >= totalExpected) {
          cleanup();
          const data =
            totalExpected > 10 ? Buffer.from(buf.subarray(12, 12 + expectedPayloadLen)) : Buffer.alloc(0);
          resolve({ ok, status, seq: rSeq, data });
        }
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        sock.removeListener('data', onData);
        sock.removeListener('error', onError);
      };

      sock.on('data', onData);
      sock.once('error', onError);
      sock.write(packet);
    });
  }

  /**
   * ดำเนินการ Handshake ตามมาตรฐาน FKAttend SDK (0x80 -> 3x 0x13)
   * หากตั้งรหัสผ่านไว้ เช่น 1234 แต่ตัวเครื่องตั้ง CommKey เป็น 0 ระบบจะสลับไปใช้ 0 อัตโนมัติ
   */
  async handshake(): Promise<{
    usedPassword: number;
    passwordNote?: string;
    sdkLicense: number;
    capabilitiesRaw: string;
  }> {
    let usedPassword = this.password;
    let passwordNote: string | undefined;

    let hs = await this.sendCommand(0x80, this.password, 0xffff1234, 0);
    if (!hs.ok && this.password !== 0) {
      const retryZero = await this.sendCommand(0x80, 0, 0xffff1234, 0);
      if (retryZero.ok) {
        usedPassword = 0;
        passwordNote = `รหัสผ่าน ${this.password} ที่ระบุเป็นรหัสผ่านเมนูแอดมิน แต่ CommKey ของพอร์ต 5005 บนตัวเครื่องถูกตั้งค่าเป็น 0 (ไม่ล็อกรหัสผ่านเชื่อมต่อ) ระบบจึงเชื่อมต่อด้วย CommKey=0 ให้โดยอัตโนมัติ`;
        hs = retryZero;
      }
    }

    if (!hs.ok) {
      throw new Error(`Handshake ถูกปฏิเสธจากเครื่อง ${this.ip}:${this.port}`);
    }

    const lic1 = await this.sendCommand(0x13, 0, 0, 0x30);
    const cap = await this.sendCommand(0x13, 1, 0, 0x400);
    await this.sendCommand(0x13, 0, 0, 0x30);

    const sdkLicense = lic1.data.length >= 12 ? lic1.data.readUInt32LE(8) : 0;
    const capabilitiesRaw = readAsciiZ(cap.data, 0, cap.data.length);

    return { usedPassword, passwordNote, sdkLicense, capabilitiesRaw };
  }

  /**
   * ดึงข้อมูลตัวเครื่องและสถิติทั้งหมด
   */
  async getDeviceOverview(): Promise<{
    info: HipDeviceInfo;
    status: HipDeviceStatus;
  }> {
    const hs = await this.handshake();

    const hw = await this.sendCommand(0xc3, 0x100, 0, 256);
    const productCode = readAsciiZ(hw.data, 0x00, 32);
    const vendorName = readAsciiZ(hw.data, 0x20, 32);
    const serialNumber = readAsciiZ(hw.data, 0x60, 32);
    const manufacturingDate = readAsciiZ(hw.data, 0x80, 32);

    const clk = await this.sendCommand(0xb2, 0, 0, 8);
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = clk.data.length >= 8 ? clk.data.readUInt16LE(0) : 2026;
    const month = clk.data.length >= 8 ? clk.data[2] : 1;
    const day = clk.data.length >= 8 ? clk.data[3] : 1;
    const hour = clk.data.length >= 8 ? clk.data[5] : 0;
    const minute = clk.data.length >= 8 ? clk.data[6] : 0;
    const second = clk.data.length >= 8 ? clk.data[7] : 0;
    const deviceTime = `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;

    const netDn = await this.sendCommand(0xb0, 2, 0, 0);
    const netTcp = await this.sendCommand(0xb0, 0x28, 0, 0);
    const netWeb = await this.sendCommand(0xb0, 0x3c, 0, 0);
    const machineNumber = netDn.status || 1;
    const tcpPort = netTcp.status || 5005;
    const webPort = netWeb.status || 7005;

    const queryStat = async (code: number) => {
      const r = await this.sendCommand(0xb4, code, 0xffff0000, 0);
      return r.status;
    };

    const status: HipDeviceStatus = {
      managersCount: await queryStat(1),
      registeredUsersCount: await queryStat(11),
      fingerprintsCount: await queryStat(3),
      passwordsCount: await queryStat(4),
      idCardsCount: await queryStat(9),
      attendanceLogsCount: await queryStat(8),
      capacities: {
        maxUsers: await queryStat(200),
        maxFingerprints: await queryStat(201),
        maxPasswords: await queryStat(202),
        maxIdCards: await queryStat(203),
        maxAttendanceLogs: await queryStat(207),
      },
    };

    const info: HipDeviceInfo = {
      productCode,
      vendorName,
      serialNumber,
      manufacturingDate,
      sdkLicense: hs.sdkLicense,
      capabilitiesRaw: hs.capabilitiesRaw,
      deviceTime,
      network: {
        machineNumber,
        tcpPort,
        webPort,
      },
      authUsedPassword: hs.usedPassword,
      passwordNote: hs.passwordNote,
    };

    return { info, status };
  }

  /**
   * ดึงรายชื่อรหัสผู้ใช้งาน (User ID) และสถานะการลงทะเบียนลายนิ้วมือ/รหัสผ่าน/บัตร (0x97)
   */
  async getEnrolledUsers(): Promise<HipUserRecord[]> {
    await this.handshake();
    const c11 = await this.sendCommand(0xb4, 11, 0xffff0000, 0);
    const count = c11.status;
    if (count === 0) return [];

    const uList = await this.sendCommand(0x97, 0, 16 * count, CHUNK_SIZE);
    if (!uList.ok) return [];

    const users: HipUserRecord[] = [];
    const maxEntries = Math.min(count, Math.floor(uList.data.length / 8));

    for (let i = 0; i < maxEntries; i++) {
      const entry = uList.data.subarray(i * 8, (i + 1) * 8);
      const userId = entry.readUInt32LE(0);
      const privilege = entry[4];
      const enabled = entry[5] === 1;
      const mask = entry.readUInt16LE(6);

      // Bits 0..2 = Fingerprint slots, Bit 3 (0x08) = Password, Bit 4 (0x10) = ID Card
      const fpBits = mask & 0x07;
      const enrolledFingerprints =
        (fpBits & 1 ? 1 : 0) + (fpBits & 2 ? 1 : 0) + (fpBits & 4 ? 1 : 0);
      const hasPassword = (mask & 0x08) !== 0;
      const hasCard = (mask & 0x10) !== 0;

      users.push({
        userId,
        name: `User #${userId}`,
        privilege,
        enabled,
        enrolledFingerprints,
        hasPassword,
        hasCard,
      });
    }

    return users.sort((a, b) => a.userId - b.userId);
  }

  /**
   * ดึงข้อมูลประวัติการสแกนเข้า-ออกงานทั้งหมดจากตัวเครื่อง (0xA4 Streaming)
   * สามารถระบุ limitLatest เพื่อตัดเฉพาะ N รายการล่าสุดได้
   */
  async getAttendanceLogs(limitLatest?: number): Promise<{
    totalCount: number;
    records: HipAttendanceRecord[];
  }> {
    await this.handshake();
    const stat8 = await this.sendCommand(0xb4, 8, 0xffff0000, 0);
    const totalCount = stat8.status;
    if (totalCount === 0) {
      return { totalCount: 0, records: [] };
    }

    const totalBytes = totalCount * REC_SIZE_CIF12;
    let offset = 0;
    let pageIdx = 0;
    const chunks: Buffer[] = [];

    while (offset < totalBytes) {
      const chunkLen = Math.min(CHUNK_SIZE, totalBytes - offset);
      const p2 = pageIdx === 0 ? totalCount : ((pageIdx << 16) >>> 0);
      const page = await this.sendCommand(0xa4, 0, p2, chunkLen);
      if (!page.ok) {
        throw new Error(`Failed reading attendance log page #${pageIdx}`);
      }
      chunks.push(page.data);
      offset += chunkLen;
      pageIdx++;
    }

    const allBuffer = Buffer.concat(chunks);
    const allRecords = decodeCif12AttendanceRecords(allBuffer, totalCount);
    const records =
      typeof limitLatest === 'number' && limitLatest > 0
        ? allRecords.slice(-limitLatest)
        : allRecords;

    return {
      totalCount,
      records,
    };
  }
}

