::::#endregion@echo off
cd /d "%~dp0backend"
if not exist .env (echo FIRST create backend/.env from .env.example and add Supabase credentials.& pause & exit /b 1)
if not exist node_modules call npm install
if errorlevel 1 (echo npm install failed.& pause & exit /b 1)
call npm run dev
pause
