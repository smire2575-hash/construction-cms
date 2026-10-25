@echo off
cd /d "%~dp0"
echo ============================================
echo  CMS OFFLINE LOCALHOST PREVIEW
 echo  http://localhost:4173
 echo ============================================
start "CMS Preview Server" cmd /k "node preview\server.mjs"
timeout /t 2 /nobreak >nul
start "" http://localhost:4173
exit /b 0
