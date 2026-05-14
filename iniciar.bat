@echo off
:: 1. Limpieza total
taskkill /F /IM node.exe /T >nul 2>&1
powershell -Command "Get-Process powershell | Where-Object { $_.Id -ne $PID } | Stop-Process -Force" >nul 2>&1
timeout /t 1 /nobreak >nul

:: 2. Rutas
set P1=D:\_ReactU\ReactU\00_testpostgresql\backend\api-gateway
set P2=D:\_ReactU\ReactU\00_testpostgresql\backend\auth-service
set P3=D:\_ReactU\ReactU\00_testpostgresql\backend\usuarios-service
set P4=D:\_ReactU\ReactU\00_testpostgresql\frontend

:: 3. Lanzamiento (Usando 'mode' para el tamaño y coordenadas fijas para el salto)
:: NOTA: Para mover al Monitor 2 (Derecha), forzamos la posición X en 1920.

start powershell.exe -NoExit -Command "mode con cols=110 lines=28; $Host.UI.RawUI.WindowTitle='V1'; cd '%P1%'; function prompt { Write-Host '[API] ' -NoNewline -ForegroundColor Cyan; return (Get-Location).Path + '> ' }; cls; npm run dev"

start powershell.exe -NoExit -Command "mode con cols=110 lines=28; $Host.UI.RawUI.WindowTitle='V2'; cd '%P2%'; function prompt { Write-Host '[AUTH] ' -NoNewline -ForegroundColor Yellow; return (Get-Location).Path + '> ' }; cls; npm run dev"

start powershell.exe -NoExit -Command "mode con cols=110 lines=28; $Host.UI.RawUI.WindowTitle='V3'; cd '%P3%'; function prompt { Write-Host '[USERS] ' -NoNewline -ForegroundColor Green; return (Get-Location).Path + '> ' }; cls; npm run dev"

start powershell.exe -NoExit -Command "mode con cols=110 lines=28; $Host.UI.RawUI.WindowTitle='V4'; cd '%P4%'; function prompt { Write-Host '[FRONT] ' -NoNewline -ForegroundColor Magenta; return (Get-Location).Path + '> ' }; cls; npm run dev"

:: 4. Intentar el salto al monitor 2 usando un objeto COM de Shell (Más difícil de bloquear)
echo Intentando mover al monitor secundario...
timeout /t 2 /nobreak >nul
powershell -Command "$w=New-Object -ComObject Shell.Application; $w.Windows() | Where-Object { $_.Name -match 'PowerShell' } | ForEach-Object { $_.Left = 1920; $_.Top = 0 }"

exit
