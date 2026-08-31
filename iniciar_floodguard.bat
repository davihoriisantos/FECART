@echo off
title FloodGuard AI - Servidor Local
echo ===================================================
echo     Iniciando Servidor FloodGuard AI (FECART)
echo ===================================================
echo Abrindo o navegador em http://127.0.0.1:8000 ...
start http://127.0.0.1:8000
echo.
cd /d "%~dp0BackEnd"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
