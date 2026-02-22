@echo off
echo Stopping all Node processes...
taskkill /F /IM node.exe 2>nul

timeout /t 2 /nobreak >nul

echo.
echo Starting Backend Server...
cd backend
start cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo Starting Frontend Server...
cd ..\frontend
start cmd /k "npm run dev"

echo.
echo ✅ Both servers are starting in separate windows!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
pause
