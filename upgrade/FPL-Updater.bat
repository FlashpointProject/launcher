@ECHO OFF
REM Flashpoint Launcher Updater by nosamu
REM Version 1.0 - 2019-11-10
SET FolderToCopyFrom=%1
SET FolderToCopyTo=%2
CD /D %~dp0

ECHO Waiting for Flashpoint Launcher to close...
REM Check if Flashpoint Launcher is running. Pipe a filtered tasklist to FIND.
REM If the launcher is not found in the tasklist the ErrorLevel will be 1.
:WaitForClose
TASKLIST /FI "IMAGENAME eq FlashpointLauncher.exe" 2>NUL | find /I /N "FlashpointLauncher.exe">NUL
IF "%ERRORLEVEL%"=="0" (GOTO WaitForClose)

ECHO Updating Flashpoint Launcher. Please wait...
ROBOCOPY %FolderToCopyFrom% %FolderToCopyTo% /S /MOVE

IF %ERRORLEVEL% == 16 (
	ECHO Failed to update Flashpoint Launcher!
	ECHO Could not access source or destination folder.
	EXIT /B
)
IF %ERRORLEVEL% GTR 7 (
	ECHO Failed to update Flashpoint Launcher!
	ECHO Some files failed to copy.
	EXIT /B
)
IF %ERRORLEVEL% GEQ 4 (
	ECHO Source and destination folders were mismatched.
	ECHO Please check whether Flashpoint Launcher was successfully updated.
	EXIT /B
)
IF %ERRORLEVEL% GEQ 1 (
	ECHO Finished updating Flashpoint Launcher!
	EXIT /B
)
IF %ERRORLEVEL% == 0 (
	ECHO Flashpoint Launcher is already up to date!
	EXIT /B
)
