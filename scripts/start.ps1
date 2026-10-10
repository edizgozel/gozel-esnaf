# Gozel Esnaf - Baslatici Betigi

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Gozel Esnaf - Yerel On Muhasebe Sistemi" -ForegroundColor White
Write-Host "  Gelistirici: Gozel Software" -ForegroundColor DarkGray
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Ortam Degiskenleri ve Dizinler
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $ProjectRoot
$env:PYTHONPATH = $ProjectRoot

# Node.js PATH kontrolu ve zenginlestirme
$NodeDefaultPaths = @(
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs"
)
foreach ($np in $NodeDefaultPaths) {
    if ((Test-Path $np) -and ($env:Path -notlike "*$np*")) {
        $env:Path = "$np;" + $env:Path
    }
}

# 2. Python Kontrolu
Write-Host ""
Write-Host "[1/6] Python kurulumu denetleniyor..." -ForegroundColor Yellow
$PythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $PythonCmd) {
    Write-Host "[HATA] Python bulunamadi! Lutfen Python 3.10 veya uzerini kurun." -ForegroundColor Red
    Exit 1
}
$PythonVersion = & python --version
Write-Host "      [Tamam] $PythonVersion bulundu." -ForegroundColor Green

# 3. Node.js Kontrolu
Write-Host "[2/6] Node.js kurulumu denetleniyor..." -ForegroundColor Yellow
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCmd) {
    Write-Host "[HATA] Node.js bulunamadi! Lutfen https://nodejs.org adresinden LTS surumunu kurun." -ForegroundColor Red
    Exit 1
}
$NodeVersion = & node --version
Write-Host "      [Tamam] Node.js $NodeVersion bulundu." -ForegroundColor Green

# 4. Port Cakisma Denetimi
Write-Host "[3/6] Port kullanilabilirligi denetleniyor..." -ForegroundColor Yellow
$activeConnections = netstat -ano
if ($activeConnections -match ":8000\s") {
    Write-Host "[HATA] 8000 portu baska bir program tarafindan kullaniliyor!" -ForegroundColor Red
    Write-Host "       Lutfen 8000 portunu kullanan uygulamayi kapatin." -ForegroundColor Red
    Exit 1
}
if ($activeConnections -match ":3000\s") {
    Write-Host "[HATA] 3000 portu baska bir program tarafindan kullaniliyor!" -ForegroundColor Red
    Write-Host "       Lutfen 3000 portunu kullanan uygulamayi kapatin." -ForegroundColor Red
    Exit 1
}
Write-Host "      [Tamam] Portlar (3000, 8000) musait." -ForegroundColor Green

# 5. Sanal Ortam ve Bagimliliklar
Write-Host "[4/6] Sanal ortam ve paketler kontrol ediliyor..." -ForegroundColor Yellow
$VenvPython = Join-Path $ProjectRoot "backend\venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Host "      Sanal ortam olusturuluyor (backend/venv)..." -ForegroundColor Gray
    & python -m venv (Join-Path $ProjectRoot "backend\venv")
}

$ReqFlag = Join-Path $ProjectRoot "backend\venv\.installed_deps"
if (-not (Test-Path $ReqFlag)) {
    Write-Host "      Backend bagimliliklari yukleniyor..." -ForegroundColor Gray
    & $VenvPython -m pip install --upgrade pip --quiet
    & $VenvPython -m pip install -r (Join-Path $ProjectRoot "backend\requirements.txt") --quiet
    New-Item -ItemType File -Path $ReqFlag -Force | Out-Null
}

$FrontendModules = Join-Path $ProjectRoot "frontend\node_modules"
if (-not (Test-Path $FrontendModules)) {
    Write-Host "      Frontend bagimliliklari yukleniyor (npm install)..." -ForegroundColor Gray
    $NpmCmd = "npm.cmd"
    if (Test-Path "C:\Program Files\nodejs\npm.cmd") { $NpmCmd = "C:\Program Files\nodejs\npm.cmd" }
    & $NpmCmd --prefix (Join-Path $ProjectRoot "frontend") install
}
Write-Host "      [Tamam] Bagimliliklar eksiksiz ve guncel." -ForegroundColor Green

# 6. SQLite Veritabani Ilklendirmesi
Write-Host "[5/6] Veritabani ve WAL modu hazirlaniyor..." -ForegroundColor Yellow
& $VenvPython (Join-Path $ProjectRoot "scripts\init_db.py")
Write-Host "      [Tamam] Veritabani hazir." -ForegroundColor Green

# 7. Servislerin Baslatilmasi
Write-Host "[6/6] Servisler baslatiliyor..." -ForegroundColor Yellow

# Backend Baslat (Yeni Bagimsiz Konsol)
$backendCmdArgs = "/c title Gozel Esnaf Backend && `"$VenvPython`" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"
$BackendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList $backendCmdArgs -WorkingDirectory $ProjectRoot -PassThru -WindowStyle Minimized
$BackendProcess.Id | Out-File -FilePath (Join-Path $ProjectRoot ".backend.pid") -Encoding ASCII -Force
Write-Host "      [Tamam] Backend baslatildi (PID: $($BackendProcess.Id))" -ForegroundColor Green

# Frontend Baslat (Yeni Bagimsiz Konsol)
$FrontendDir = Join-Path $ProjectRoot "frontend"
$frontendCmdArgs = "/c title Gozel Esnaf Frontend && npm.cmd run dev"
$FrontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList $frontendCmdArgs -WorkingDirectory $FrontendDir -PassThru -WindowStyle Minimized
$FrontendProcess.Id | Out-File -FilePath (Join-Path $ProjectRoot ".frontend.pid") -Encoding ASCII -Force
Write-Host "      [Tamam] Frontend baslatildi (PID: $($FrontendProcess.Id))" -ForegroundColor Green

# 8. Saglik Kontrolu ve Tarayici Acma
Write-Host ""
Write-Host "Servislerin hazir olmasi bekleniyor..." -ForegroundColor Cyan
$MaxAttempts = 30
$Ready = $false
for ($i = 1; $i -le $MaxAttempts; $i++) {
    Start-Sleep -Milliseconds 600
    try {
        $res = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health" -Method Get -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
        if ($res.status -eq "ok") {
            $Ready = $true
            break
        }
    } catch {}
}

if ($Ready) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "  Gozel Esnaf Basariyla Baslatildi!" -ForegroundColor Green
    Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "  Backend : http://127.0.0.1:8000" -ForegroundColor White
    Write-Host "  Durdurmak icin stop.bat dosyasini calistirin." -ForegroundColor Gray
    Write-Host "==================================================" -ForegroundColor Green
    Start-Process "http://localhost:3000"
} else {
    Write-Host "[UYARI] Backend servisi zamaninda yanit vermedi, yine de tarayici aciliyor..." -ForegroundColor Yellow
    Start-Process "http://localhost:3000"
}

