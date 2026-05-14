@echo off
:: 1. Detener procesos de Node (Equivale al Ctrl+C masivo)
taskkill /F /IM node.exe /T >nul 2>&1

:: 2. Pausa mínima para liberar puertos
timeout /t 1 /nobreak >nul

:: 3. Activar cada ventana, limpiar pantalla y ejecutar npm run dev
powershell -Command "$wshell = New-Object -ComObject wscript.shell; Get-Process powershell | Where-Object { $_.Id -ne $PID } | ForEach-Object { $wshell.AppActivate($_.Id); Start-Sleep -m 250; $wshell.SendKeys('cls{ENTER}'); Start-Sleep -m 100; $wshell.SendKeys('npm run dev{ENTER}') }"

:: 4. Salida automática
exit
