# Smart MSO - ติดตั้ง Windows Scheduled Task สำหรับซิงก์เครื่องสแกนลายนิ้วมืออัตโนมัติ
# ตั้งเวลาเริ่มต้น: ดึงข้อมูลทุกวันเวลา 08:32 น. (หลังเข้างาน) และ 16:32 น. (หลังออกงาน)
# รันใน PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts\install-attendance-sync-task.ps1
# หรือกำหนดเวลาเอง:
#   powershell -ExecutionPolicy Bypass -File scripts\install-attendance-sync-task.ps1 -Times "08:32","16:32"

param(
  [string[]]$Times = @("08:32", "16:32"),
  [string]$TaskName = "SmartMSO-Attendance-AutoSync"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$NodePath = (Get-Command node).Source
$ScriptPath = Join-Path $ProjectRoot "scripts\sync-attendance.mjs"
$PowerShellPath = (Get-Command powershell.exe).Source

if (-not (Test-Path $ScriptPath)) {
  throw "ไม่พบไฟล์ $ScriptPath"
}

$Triggers = @()
$FormattedTimes = @()
foreach ($rawItem in $Times) {
  foreach ($rawTime in ($rawItem -split ",")) {
    $trimmed = $rawTime.Trim()
    if (-not $trimmed) { continue }
    if ($trimmed -notmatch "^(\d{1,2}):(\d{2})$") {
      throw "รูปแบบเวลาไม่ถูกต้อง: '$rawTime' (ต้องเป็น HH:mm เช่น 08:32)"
    }
    $hour = [int]$Matches[1]
    $minute = [int]$Matches[2]
    if ($hour -lt 0 -or $hour -gt 23 -or $minute -lt 0 -or $minute -gt 59) {
      throw "เวลาไม่อยู่ในช่วงที่ถูกต้อง: '$rawTime'"
    }
    $label = "{0:D2}:{1:D2}" -f $hour, $minute
    if ($FormattedTimes -notcontains $label) {
      $FormattedTimes += $label
      $atTime = ([datetime]::Today).AddHours($hour).AddMinutes($minute)
      $Triggers += New-ScheduledTaskTrigger -Daily -DaysInterval 1 -At $atTime
    }
  }
}

if ($Triggers.Count -eq 0) {
  throw "กรุณาระบุเวลาอย่างน้อย 1 ช่วงเวลา (เช่น 08:32, 16:32)"
}

$PsCommand = "& '$($NodePath.Replace("'", "''"))' '$($ScriptPath.Replace("'", "''"))' --quiet --log; if (`$null -ne `$LASTEXITCODE) { exit `$LASTEXITCODE } else { exit 1 }"
$Action = New-ScheduledTaskAction `
  -Execute $PowerShellPath `
  -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -Command `"$PsCommand`"" `
  -WorkingDirectory $ProjectRoot

$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -RestartCount 2 `
  -RestartInterval (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew

$TimesDisplay = ($FormattedTimes | ForEach-Object { "$_ น." }) -join " และ "
Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Triggers `
  -Settings $Settings `
  -Description "ซิงก์ข้อมูลลงเวลาปฏิบัติราชการจากเครื่องสแกน HIP CMi681S ขึ้น Synology MariaDB และ Supabase Cloud อัตโนมัติทุกวันเวลา $TimesDisplay" `
  -Force | Out-Null

Write-Host "✅ ติดตั้ง Task '$TaskName' เรียบร้อยแล้ว (ทำงานทุกวันเวลา $TimesDisplay)" -ForegroundColor Green
Write-Host "   บันทึก Log ที่: $(Join-Path $ProjectRoot 'data\attendance-sync.log')" -ForegroundColor Gray
Write-Host "   ทดสอบสั่งรันทันทีด้วย: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Cyan

