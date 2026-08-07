#!/bin/sh

# AppRun for the Flashpoint Archive AppImage (executed by sharun).
# On first run the bundled fp archive is extracted into ~/Games/Flashpoint,
# then the launcher is started with the environment start-flashpoint.sh would set.

if [ "$APPRUN_DEBUG" = 1 ]; then
        set -x
fi

set -e

FP_DATA="${FLASHPOINT_PATH:-$HOME/Games/Flashpoint}"
if [ ! -f "$FP_DATA/.preferences.defaults.json" ]; then
        echo "Flashpoint Archive: first run detected, setting up data in '$FP_DATA'..."
        echo "  This may take a minute or two."
        mkdir -p "$FP_DATA"
        "$APPDIR/bin/7zz" x -y "$APPDIR/gamesdata/flashpoint.7z" -o"$FP_DATA" >/dev/null || {
                echo "ERROR: failed to extract Flashpoint data to '$FP_DATA'" >&2
                exit 1
        }
        echo "Flashpoint data ready."
fi

export WINEPREFIX="$FP_DATA/FPSoftware/Wine"
export FP_PATH="$FP_DATA"
if [ -f "$FP_DATA/Libraries/lib/x86_64-linux-gnu/libgtk-3.so.0" ]; then
        export GALLIUM_DRIVER="i915,i965,iris,nouveau,nouveau_vieux,r200,r300,r600,radeon,radeonsi,zink,swrast" \
               GDK_PIXBUF_MODULE_FILE="$FP_DATA/Libraries/lib/x86_64-linux-gnu/gdk-pixbuf-2.0/2.10.0/loaders.cache" \
               GSETTINGS_SCHEMA_DIR="$FP_DATA/Libraries/share/glib-2.0/schemas" \
               GTK_MODULES= \
               LD_LIBRARY_PATH="$FP_DATA/Libraries/lib/x86_64-linux-gnu" \
               LIBGL_DRIVERS_PATH="$FP_DATA/Libraries/lib/x86_64-linux-gnu/dri"
fi

export PATH=$APPDIR/bin:$PATH

exec "$APPDIR/bin/flashpoint-launcher" "$@"
