@echo off
echo "%1"
echo "%2"
.\Elevate.exe -wait4exit cmd /c mklink /D %1 %2