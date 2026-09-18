@echo off
setlocal
cd /d "%~dp0"
set "LEARNMAP_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%LEARNMAP_NODE%" goto ready
set "LEARNMAP_NODE=node.exe"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please ask for help with LearnMap startup.
  pause
  exit /b 1
)
:ready
if not exist "dist\index.html" (
  echo The LearnMap build is missing. Please ask for help rebuilding it.
  pause
  exit /b 1
)
set "PORT=3100"
set "HOST=127.0.0.1"
echo Starting LearnMap...
echo Open http://127.0.0.1:3100 in your browser after the server starts.
echo Keep this window open while using LearnMap. Press Ctrl+C to stop.
"%LEARNMAP_NODE%" --import tsx server/index.ts
if errorlevel 1 pause
