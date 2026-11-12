@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  py -3 -m venv .venv
  if errorlevel 1 goto error
)

".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto error

".venv\Scripts\python.exe" app.py
echo.
echo El servidor termino. Si aparecio un error, revisa la guia README.md.
pause
exit /b 0

:error
echo No se pudo iniciar la aplicacion. Revisa que Python 3.10 o superior este instalado y que haya conexion a internet durante la primera instalacion.
pause
exit /b 1
