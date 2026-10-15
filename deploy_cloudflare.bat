@echo off
chcp 65001 > nul
echo ========================================================
echo   future-curriculum Cloudflare Pages 배포를 시작합니다
echo ========================================================
echo.

set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

echo [1/2] Cloudflare Pages 배포를 진행합니다...
call npx.cmd wrangler pages deploy dist --project-name future-curriculum

echo.
echo ========================================================
echo 배포 작업이 완료되었습니다.
echo ========================================================
pause
