@echo off
cd /d "%~dp0frontend"
echo CMS React setup - Requires Node.js, npm and internet for first install.
if not exist node_modules call npm install
if errorlevel 1 (echo npm install failed. Check Node.js and your internet.& pause & exit /b 1)
start "" http://localhost:5173
call npm run dev
pause
