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

$StartScript = @'
#!/bin/sh
set -e
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
for p in /var/packages/Node.js*/target/usr/local/bin /var/packages/ContainerManager/target/usr/bin /var/packages/Docker/target/usr/bin; do
  [ -d "$p" ] && export PATH="$p:$PATH"
done

cd "$(dirname "$0")"

if command -v docker >/dev/null 2>&1; then
  DOCKER_BIN="$(command -v docker)"
  echo "Using Docker: $DOCKER_BIN"
  if "$DOCKER_BIN" ps >/dev/null 2>&1; then
    "$DOCKER_BIN" compose -f docker-compose.worker.yml up -d --force-recreate || {
      "$DOCKER_BIN" rm -f smart-mso-attendance-worker 2>/dev/null || true
      "$DOCKER_BIN" run -d --name smart-mso-attendance-worker --network host --restart unless-stopped -e TZ=Asia/Bangkok -v "$(pwd):/app" -w /app node:22-alpine sh -c "[ -d node_modules ] || npm install --omit=dev; node scripts/sync-attendance.mjs --schedule --watch --log --run-now"
    }
    sleep 5
    "$DOCKER_BIN" logs --tail 35 smart-mso-attendance-worker
  else
    echo "Docker socket requires sudo (enter sudo password if prompted)..."
    sudo -E env "PATH=$PATH" "$DOCKER_BIN" compose -f docker-compose.worker.yml up -d --force-recreate || {
      sudo "$DOCKER_BIN" rm -f smart-mso-attendance-worker 2>/dev/null || true
      sudo "$DOCKER_BIN" run -d --name smart-mso-attendance-worker --network host --restart unless-stopped -e TZ=Asia/Bangkok -v "$(pwd):/app" -w /app node:22-alpine sh -c "[ -d node_modules ] || npm install --omit=dev; node scripts/sync-attendance.mjs --schedule --watch --log --run-now"
    }
    sleep 5
    sudo "$DOCKER_BIN" logs --tail 35 smart-mso-attendance-worker
  fi
elif command -v node >/dev/null 2>&1; then
  echo "Using Node: $(command -v node) $(node -v)"
  [ -d node_modules ] || npm install --omit=dev
  node scripts/sync-attendance.mjs --check-only
  pkill -f "scripts/sync-attendance.mjs" 2>/dev/null || true
  TZ=Asia/Bangkok nohup node scripts/sync-attendance.mjs --schedule --watch --log --run-now > data/worker-stdout.log 2>&1 &
  sleep 3
  tail -n 30 data/worker-stdout.log
else
  echo "ERROR: Neither docker nor node found in PATH on NAS."
  ls -1 /var/packages 2>/dev/null || true
  exit 1
fi
'@
$StartScriptLf = $StartScript -replace "`r`n", "`n"
[System.IO.File]::WriteAllText((Join-Path $TempStage "start-worker.sh"), $StartScriptLf, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "==> 2. Uploading bundle to ${Target} (enter SSH password if prompted)..." -ForegroundColor Cyan
$TarFile = Join-Path $env:TEMP "smart-mso-worker.tar.gz"
if (Test-Path $TarFile) { Remove-Item $TarFile -Force }
tar -czf $TarFile -C $TempStage .

scp -O -P $SshPort $TarFile "${Target}:/tmp/smart-mso-worker.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "SCP upload failed" }

Write-Host "==> 3. Extracting, starting & verifying worker on NAS..." -ForegroundColor Cyan
ssh -t -p $SshPort $Target "mkdir -p '$RemoteDir' && tar -xzf /tmp/smart-mso-worker.tar.gz -C '$RemoteDir' && rm -f /tmp/smart-mso-worker.tar.gz && sh '$RemoteDir/start-worker.sh'"
