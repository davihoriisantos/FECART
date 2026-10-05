@echo off
title FloodGuard AI - Servidor Local
echo ===================================================
echo     Iniciando Servidor FloodGuard AI (FECART)
echo ===================================================
echo Abrindo o navegador em http://127.0.0.1:8000 ...
start http://127.0.0.1:8000
echo.

set "PYTHON_EXE=python"
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
) else if exist "%~dp0BackEnd\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0BackEnd\.venv\Scripts\python.exe"
)

"%PYTHON_EXE%" -c "import fastapi, uvicorn" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Iniciando backend completo FastAPI/Uvicorn...
    cd /d "%~dp0BackEnd"
    "%PYTHON_EXE%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
) else (
    echo Pacotes FastAPI nao encontrados no Python padrao.
    echo Iniciando servidor HTTP estatico FloodGuard AI na porta 8000...
    cd /d "%~dp0"
    "%PYTHON_EXE%" -m http.server 8000
)
pause
