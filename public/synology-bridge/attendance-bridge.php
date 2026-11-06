<?php
/**
 * Smart MSO - Cloudflare HTTPS to Synology MariaDB (Port 3308) Bridge
 * -------------------------------------------------------------------
 * วิธีใช้งาน:
 * 1. นำไฟล์นี้ไปวางไว้ในโฟลเดอร์ Shared Folder `/web/attendance-bridge.php` บน Synology NAS (เปิดใช้งาน Web Station + PHP 8)
 * 2. ใน Cloudflare Zero Trust -> Tunnels:
 *    ตั้งค่า Public Hostname เช่น `db.smso.site` ชี้ไปที่ `http://localhost:80` (หรือพอร์ต Web Station ของ NAS)
 * 3. เนื่องจากสคริปต์นี้รันอยู่บนตัวเครื่อง Synology NAS เอง จึงสามารถเชื่อมต่อเข้า MariaDB ที่ `127.0.0.1:3308`
 *    ในฐานะ `localhost` ได้ทันทีผ่าน HTTPS ของ Cloudflare โดยไม่ต้องเปิดพอร์ต 3308 ออกอินเทอร์เน็ต!
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Bridge-Secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// กำหนด Token ความปลอดภัยตรงนี้ให้ตรงกับ NAS_MYSQL_BRIDGE_SECRET ใน .env.local
$EXPECTED_SECRET = getenv('NAS_MYSQL_BRIDGE_SECRET') ?: 'SmartMsoBridge_CHANGE_THIS_SECRET_TOKEN';
$headers = function_exists('getallheaders') ? getallheaders() : [];
$providedSecret = $headers['X-Bridge-Secret'] ?? $headers['x-bridge-secret'] ?? ($_SERVER['HTTP_X_BRIDGE_SECRET'] ?? '');

if ($providedSecret !== $EXPECTED_SECRET) {
    http_response_code(401);
    echo json_encode(['connected' => false, 'synced' => false, 'error' => 'Invalid X-Bridge-Secret']);
    exit;
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);
if (!$payload) {
    http_response_code(400);
    echo json_encode(['connected' => false, 'synced' => false, 'error' => 'Invalid JSON payload']);
    exit;
}

$action = $payload['action'] ?? 'init_and_status';
$dbCfg = $payload['dbConfig'] ?? [];
$dbHost = $dbCfg['host'] ?? '127.0.0.1';
$dbPort = intval($dbCfg['port'] ?? 3308);
$dbUser = $dbCfg['user'] ?? 'root';
$dbPass = $dbCfg['password'] ?? '';
$dbName = preg_replace('/[^a-zA-Z0-9_]/', '', $dbCfg['database'] ?? 'smart_mso_attendance');

try {
    $dsn = "mysql:host={$dbHost};port={$dbPort};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5,
    ]);

    // 1. สร้างฐานข้อมูลและตารางอัตโนมัติ
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `{$dbName}`");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS attendance_logs (
          id VARCHAR(64) PRIMARY KEY,
          record_uid VARCHAR(128) NOT NULL UNIQUE,
          scanner_user_id INT NOT NULL,
          member_id VARCHAR(64) NOT NULL,
          member_name VARCHAR(255) NOT NULL,
          division VARCHAR(255) DEFAULT '',
          position VARCHAR(255) DEFAULT '',
          scan_timestamp DATETIME NOT NULL,
          original_timestamp DATETIME NOT NULL,
          io_mode TINYINT NOT NULL DEFAULT 1,
          io_label VARCHAR(64) NOT NULL,
          verify_mode TINYINT NOT NULL DEFAULT 1,
          verify_label VARCHAR(64) NOT NULL,
          machine_id INT NOT NULL DEFAULT 1,
          source ENUM('device', 'manual') NOT NULL DEFAULT 'device',
          is_edited TINYINT(1) NOT NULL DEFAULT 0,
          edited_by VARCHAR(255) DEFAULT NULL,
          edited_at DATETIME DEFAULT NULL,
          edit_note TEXT DEFAULT NULL,
          is_deleted TINYINT(1) NOT NULL DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_scan_timestamp (scan_timestamp),
          INDEX idx_scanner_user (scanner_user_id),
          INDEX idx_member_id (member_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS attendance_user_mappings (
          scanner_user_id INT PRIMARY KEY,
          member_id VARCHAR(64) NOT NULL,
          member_name VARCHAR(255) NOT NULL,
          division VARCHAR(255) DEFAULT '',
          position VARCHAR(255) DEFAULT '',
          updated_by VARCHAR(255) DEFAULT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS attendance_authorized_editors (
          member_id VARCHAR(64) PRIMARY KEY,
          member_name VARCHAR(255) NOT NULL,
          division VARCHAR(255) DEFAULT '',
          role VARCHAR(64) DEFAULT 'member',
          granted_by VARCHAR(255) DEFAULT NULL,
          granted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    if ($action === 'init_and_status') {
        $ver = $pdo->query("SELECT VERSION() AS v")->fetch()['v'] ?? 'MariaDB 10';
        $cnt = $pdo->query("SELECT COUNT(*) AS c FROM attendance_logs WHERE is_deleted = 0")->fetch()['c'] ?? 0;
        echo json_encode([
            'connected' => true,
            'mysqlVersion' => $ver,
            'rowCount' => intval($cnt),
        ]);
        exit;
    }

    if ($action === 'sync_store') {
        $pdo->beginTransaction();

        // Sync mappings
        $mappings = $payload['mappings'] ?? [];
        $stmtMap = $pdo->prepare("
            INSERT INTO attendance_user_mappings (scanner_user_id, member_id, member_name, division, position, updated_by)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              member_id = VALUES(member_id),
              member_name = VALUES(member_name),
              division = VALUES(division),
              position = VALUES(position),
              updated_by = VALUES(updated_by)
        ");
        foreach ($mappings as $m) {
            $stmtMap->execute([
                intval($m['scannerUserId'] ?? 0),
                $m['memberId'] ?? '',
                $m['memberName'] ?? '',
                $m['division'] ?? '',
                $m['position'] ?? '',
                $m['updatedBy'] ?? 'system',
            ]);
        }

        // Sync logs
        $logs = $payload['logs'] ?? [];
        $stmtLog = $pdo->prepare("
            INSERT INTO attendance_logs (
              id, record_uid, scanner_user_id, member_id, member_name, division, position,
              scan_timestamp, original_timestamp, io_mode, io_label, verify_mode, verify_label,
              machine_id, source, is_edited, edited_by, edited_at, edit_note, is_deleted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              scanner_user_id = VALUES(scanner_user_id),
              member_id = VALUES(member_id),
              member_name = VALUES(member_name),
              division = VALUES(division),
              position = VALUES(position),
              scan_timestamp = VALUES(scan_timestamp),
              io_mode = VALUES(io_mode),
              io_label = VALUES(io_label),
              verify_mode = VALUES(verify_mode),
              verify_label = VALUES(verify_label),
              is_edited = VALUES(is_edited),
              edited_by = VALUES(edited_by),
              edited_at = VALUES(edited_at),
              edit_note = VALUES(edit_note),
              is_deleted = VALUES(is_deleted)
        ");

        $upserted = 0;
        foreach ($logs as $l) {
            $editedAt = !empty($l['editedAt']) ? substr(str_replace('T', ' ', $l['editedAt']), 0, 19) : null;
            $stmtLog->execute([
                $l['id'],
                $l['recordUid'],
                intval($l['scannerUserId'] ?? 1),
                $l['memberId'] ?? '',
                $l['memberName'] ?? '',
                $l['division'] ?? '',
                $l['position'] ?? '',
                $l['scanTimestamp'],
                $l['originalTimestamp'],
                intval($l['ioMode'] ?? 1),
                $l['ioLabel'] ?? '',
                intval($l['verifyMode'] ?? 1),
                $l['verifyLabel'] ?? '',
                intval($l['machineId'] ?? 1),
                $l['source'] ?? 'device',
                !empty($l['isEdited']) ? 1 : 0,
                $l['editedBy'] ?? null,
                $editedAt,
                $l['editNote'] ?? null,
                !empty($l['isDeleted']) ? 1 : 0,
            ]);
            $upserted++;
        }

        $pdo->commit();
        echo json_encode(['synced' => true, 'upsertedLogs' => $upserted]);
        exit;
    }

    echo json_encode(['connected' => false, 'error' => 'Unknown action']);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode([
        'connected' => false,
        'synced' => false,
        'error' => $e->getMessage(),
    ]);
}

