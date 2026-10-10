# Gozel Esnaf - Durdurucu Betigi

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Gozel Esnaf Servisleri Durduruluyor..." -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BackendPidFile = Join-Path $ProjectRoot ".backend.pid"
$FrontendPidFile = Join-Path $ProjectRoot ".frontend.pid"

$stoppedCount = 0

if (Test-Path $BackendPidFile) {
    $rawB = Get-Content $BackendPidFile -Raw -ErrorAction SilentlyContinue
    if ($rawB) {
        $bPid = $rawB.Trim()
        if ($bPid) {
            try {
                taskkill /PID $bPid /T /F 2>$null | Out-Null
                Write-Host "[Tamam] Backend servisi durduruldu (PID: $bPid)" -ForegroundColor Green
                $stoppedCount++
            } catch {
                Write-Host "[Bilgi] Backend servisi zaten durmus (PID: $bPid)" -ForegroundColor Gray
            }
        }
    }
    Remove-Item $BackendPidFile -Force -ErrorAction SilentlyContinue
}

if (Test-Path $FrontendPidFile) {
    $rawF = Get-Content $FrontendPidFile -Raw -ErrorAction SilentlyContinue
    if ($rawF) {
        $fPid = $rawF.Trim()
        if ($fPid) {
            try {
                taskkill /PID $fPid /T /F 2>$null | Out-Null
                Write-Host "[Tamam] Frontend servisi durduruldu (PID: $fPid)" -ForegroundColor Green
                $stoppedCount++
            } catch {
                Write-Host "[Bilgi] Frontend servisi zaten durmus (PID: $fPid)" -ForegroundColor Gray
            }
        }
    }
    Remove-Item $FrontendPidFile -Force -ErrorAction SilentlyContinue
}

# Port kontrolu: 8000 veya 3000 portunda kalan servis varsa sonlandir
$bListening = netstat -ano | Select-String ":8000\s.*LISTENING" | Select-Object -First 1
if ($bListening -match "LISTENING\s+(\d+)") {
    $portPid = $matches[1]
    taskkill /PID $portPid /T /F 2>$null | Out-Null
    Write-Host "[Tamam] 8000 portundaki dinleyici sonlandirildi (PID: $portPid)" -ForegroundColor Green
    $stoppedCount++
}

$fListening = netstat -ano | Select-String ":3000\s.*LISTENING" | Select-Object -First 1
if ($fListening -match "LISTENING\s+(\d+)") {
    $portPid = $matches[1]
    taskkill /PID $portPid /T /F 2>$null | Out-Null
    Write-Host "[Tamam] 3000 portundaki dinleyici sonlandirildi (PID: $portPid)" -ForegroundColor Green
    $stoppedCount++
}

if ($stoppedCount -eq 0) {
    Write-Host "Calisan aktif Gozel Esnaf sureci bulunamadi." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Gozel Esnaf servisleri guvenle sonlandirildi." -ForegroundColor Green
}

