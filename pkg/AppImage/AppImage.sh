#!/bin/sh

# You might need to restart your pc if sharun doesn't create `AppDir` in this directory (It should create dirs on its own)

set -eu

# Always build in this script's directory regardless of the caller's cwd
cd "$(dirname "$0")"
unset APPDIR

ARCH="$(uname -m)"
SHARUN="https://raw.githubusercontent.com/pkgforge-dev/Anylinux-AppImages/main/useful-tools/quick-sharun.sh"

export MAIN_BIN=$HOME/Games/Flashpoint/Launcher/flashpoint-launcher
#export UPINFO="gh-releases-zsync|${GITHUB_REPOSITORY%/*}|${GITHUB_REPOSITORY#*/}|latest|*$ARCH.AppImage.zsync"
export OUTNAME=flashpoint-launcher-anylinux-"$ARCH".AppImage
export DESKTOP=/usr/share/applications/flashpoint-archive.desktop
export ICON=$HOME/Games/Flashpoint/Launcher/icon.svg
export OUTPATH=./dist

#Remove leftovers
rm -rf AppDir dist appinfo

# ADD LIBRARIES
wget --retry-connrefused --tries=30 "$SHARUN" -O ./quick-sharun
chmod +x ./quick-sharun

# Download the static 7zz used to seed ~/Games/Flashpoint from the bundled
# archive on first run. 7zzs is statically linked, so no library collection
# is needed for it.
wget --retry-connrefused --tries=30 "https://www.7-zip.org/a/7z2602-linux-x64.tar.xz" -O /tmp/7zz.tar.xz
tar -xf /tmp/7zz.tar.xz -C /tmp 7zzs 2>/dev/null || tar -xf /tmp/7zz.tar.xz -C /tmp 7zz

# The standalone Ruffle binary is not shipped in the fp archive; It's downloaded upon first boot.
# When HEADLESS=1, boot the launcher (headless) and wait until it shows up, matching a machine that has run once.
RUFFLE_DIR="$HOME/Games/Flashpoint/Data/Ruffle/standalone/latest"
if [ "$HEADLESS" = 1 ] && [ ! -x "$RUFFLE_DIR/ruffle" ]; then
	echo "Standalone Ruffle missing; booting launcher to trigger the core-ruffle extension download..."
	command -v xvfb-run >/dev/null || { echo "ERROR: xvfb-run not found (install 'xvfb')" >&2; exit 1; }
	(cd "$HOME/Games/Flashpoint/Launcher" && xvfb-run -a ./flashpoint-launcher) &
	LAUNCHER_PID=$!
	WAITED=0
	while [ ! -x "$RUFFLE_DIR/ruffle" ]; do
		sleep 2
		WAITED=$((WAITED+2))
		[ "$WAITED" -lt 120 ] || break
	done
	pkill -f flashpoint-launcher 2>/dev/null || true
	wait "$LAUNCHER_PID" 2>/dev/null || true
	[ -x "$RUFFLE_DIR/ruffle" ] || { echo "ERROR: standalone Ruffle not downloaded within ${WAITED}s" >&2; exit 1; }
	echo "Standalone Ruffle downloaded."
fi

mkdir -p AppDir
cp AppRun.sh AppDir/AppRun.sh
chmod +x AppDir/AppRun.sh

# Pre-create the desktop entry so the AppImage does not bundle a stale copy of
# the system-installed one. Exec routes through the seeded data root's
# start-flashpoint.sh (the .desktop spec cannot expand $HOME itself).
cp ../git/flashpoint-archive.desktop AppDir/flashpoint-archive.desktop

# Point to binaries
./quick-sharun \
  $HOME/Games/Flashpoint/Launcher/flashpoint-launcher \
  $HOME/Games/Flashpoint/Server/FlashpointGameServer \
  $HOME/Games/Flashpoint/Data/Ruffle/standalone/latest/ruffle \
  $HOME/Games/Flashpoint/FPSoftware/Wine/bin/wine \
  $HOME/Games/Flashpoint/FPSoftware/Wine/bin/wineserver

cp -a $HOME/Games/Flashpoint/Launcher/. AppDir/shared/bin/

# Copy the launcher's data files next to the sharun wrapper (Electron's DIR_EXE).
# Do NOT overwrite the `flashpoint-launcher` wrapper hardlink in bin/.
for f in icudtl.dat chrome_100_percent.pak chrome_200_percent.pak resources.pak \
         snapshot_blob.bin v8_context_snapshot.bin vk_swiftshader_icd.json \
         config.json ormconfig.json secret.dat LICENSE.electron.txt LICENSES.chromium.html \
         chrome_crashpad_handler chrome-sandbox \
         libEGL.so libGLESv2.so libvk_swiftshader.so libvulkan.so.1 libffmpeg.so; do
	cp -a "$HOME/Games/Flashpoint/Launcher/$f" AppDir/bin/
done
for d in locales resources lang licenses extern; do
	cp -a "$HOME/Games/Flashpoint/Launcher/$d" AppDir/bin/
done

# The launcher resolves config.flashpointPath relative to the working directory
# (e.g. path.join('..', 'Data') -> ../Data). Bake a per-user data root so the
# AppImage works no matter where it is launched from. `<home>` is resolved by a
# patched parseVarStr (see the asar patch below).
sed -i 's|"flashpointPath": ".."|"flashpointPath": "<home>/Games/Flashpoint"|' AppDir/bin/config.json

# On FUSE-mount runs $APPDIR is read-only, and the launcher always writes its log
# next to the exe (dirname(app.getPath('exe'))/launcher.log). A symlink redirects
# that write to a writable location so file logging survives mount runs.
ln -sf $HOME/Games/Flashpoint/Launcher/launcher.log AppDir/bin/launcher.log

# Remove this part once a new release is done that has the 1 line <home> edit in src/shared/Util.ts
# Patch the bundled asar so parseVarStr understands `<home>` (used by the baked
# flashpointPath above). Without this the literal `<home>` is left in the path.
npx --yes asar extract AppDir/bin/resources/app.asar /tmp/asar-patch
sed -i "/case 'cwd':/a\\                case 'home': return process.env.HOME || '';" /tmp/asar-patch/build/shared/Util.js
npx --yes asar pack /tmp/asar-patch AppDir/bin/resources/app.asar
rm -rf /tmp/asar-patch

# Bundle the static 7zz and the fp archive so AppRun.sh can seed
# ~/Games/Flashpoint on a fresh system.
mkdir -p AppDir/gamesdata
cp /tmp/7zzs AppDir/bin/7zz 2>/dev/null || cp /tmp/7zz AppDir/bin/7zz
FP_ARCHIVE=$(ls ../git/fp*_lin_*.7z | head -n 1)
[ -n "$FP_ARCHIVE" ] || { echo "ERROR: no fp archive found in ../git/" >&2; exit 1; }
cp "$FP_ARCHIVE" AppDir/gamesdata/flashpoint.7z

# Make AppImage
./quick-sharun --make-appimage

echo "All Done!"
