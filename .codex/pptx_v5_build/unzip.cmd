@echo off
if "%~1"=="-Z1" powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "D:\GitHub\aviation-controls-simulink-training\.codex\pptx_v5_build\unzip-adapter.ps1" list "%~2"
if "%~1"=="-p" powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "D:\GitHub\aviation-controls-simulink-training\.codex\pptx_v5_build\unzip-adapter.ps1" pipe "%~2" "%~3"
