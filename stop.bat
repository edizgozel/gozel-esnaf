@echo off
chcp 65001 >nul
title Gozel Esnaf — Durdurucu
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File "scripts\stop.ps1"
pause

