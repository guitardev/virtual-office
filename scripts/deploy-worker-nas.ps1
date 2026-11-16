param(
  [string]$NasHost = "192.168.162.23",
  [int]$SshPort = 222,
  [string]$SshUser = "guitardev",
  [string]$RemoteDir = "/volume1/docker/smart-mso-worker"
)

$ErrorActionPreference = "Stop"
$Target = "$SshUser@$NasHost"

Write-Host "==> 1. Packing worker files..." -ForegroundColor Cyan
$TempStage = Join-Path $env:TEMP "smart-mso-worker-stage"
if (Test-Path $TempStage) { Remove-Item $TempStage -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $TempStage "scripts") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $TempStage "lib") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $TempStage "data") -Force | Out-Null

Copy-Item "scripts/sync-attendance.mjs" (Join-Path $TempStage "scripts/")
Copy-Item "lib/attendance-rules-core.mjs" (Join-Path $TempStage "lib/")
Copy-Item "package.json" $TempStage
if (Test-Path "package-lock.json") { Copy-Item "package-lock.json" $TempStage }
Copy-Item "docker-compose.worker.yml" $TempStage
if (Test-Path ".env.local") { Copy-Item ".env.local" $TempStage }
elseif (Test-Path ".env") { Copy-Item ".env" (Join-Path $TempStage ".env.local") }

Write-Host "==> 2. Uploading bundle to ${Target} (enter SSH password if prompted)..." -ForegroundColor Cyan
$TarFile = Join-Path $env:TEMP "smart-mso-worker.tar.gz"
if (Test-Path $TarFile) { Remove-Item $TarFile -Force }
tar -czf $TarFile -C $TempStage .

scp -P $SshPort $TarFile "${Target}:/tmp/smart-mso-worker.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "SCP upload failed" }

Write-Host "==> 3. Extracting, starting & verifying worker on NAS..." -ForegroundColor Cyan
$RemoteCmd = @"
set -e
mkdir -p '$RemoteDir'
tar -xzf /tmp/smart-mso-worker.tar.gz -C '$RemoteDir'
rm -f /tmp/smart-mso-worker.tar.gz
cd '$RemoteDir'
if command -v docker >/dev/null 2>&1; then
  echo 'Using Docker...'
  if docker compose version >/dev/null 2>&1; then
    docker compose -f docker-compose.worker.yml up -d --force-recreate
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f docker-compose.worker.yml up -d --force-recreate
  else
    docker rm -f smart-mso-attendance-worker 2>/dev/null || true
    docker run -d --name smart-mso-attendance-worker --network host --restart unless-stopped -e TZ=Asia/Bangkok -v '$RemoteDir':/app -w /app node:20-alpine sh -c "[ -d node_modules ] || npm install --omit=dev; node scripts/sync-attendance.mjs --schedule --watch --log --run-now"
  fi
  sleep 4
  docker logs --tail 30 smart-mso-attendance-worker
elif command -v node >/dev/null 2>&1; then
  echo 'Using system Node...'
  [ -d node_modules ] || npm install --omit=dev
  node scripts/sync-attendance.mjs --check-only
  pkill -f 'scripts/sync-attendance.mjs' 2>/dev/null || true
  TZ=Asia/Bangkok nohup node scripts/sync-attendance.mjs --schedule --watch --log --run-now > data/worker-stdout.log 2>&1 &
  sleep 3
  tail -n 30 data/worker-stdout.log
else
  echo 'ERROR: Neither docker nor node found on NAS. Please install Container Manager or Node.js in Package Center.'
  exit 1
fi
"@

ssh -p $SshPort $Target $RemoteCmd
