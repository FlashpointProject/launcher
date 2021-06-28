@echo off
cd /d %~dp0
cmd /c bluezip.exe %1 -co ..\..\Games --htdocs ..\..\Legacy\htdocs
pause
