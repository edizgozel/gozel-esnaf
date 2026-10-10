@echo off
chcp 65001 >nul
title Gozel Esnaf — Baslatici
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File "scripts\start.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Bir hata olustu. Cikmak icin bir tusa basin...
    pause >nul
)

