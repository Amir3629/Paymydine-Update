#!/usr/bin/env bash
set -euo pipefail

export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"
export XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
export ELECTRON_OZONE_PLATFORM_HINT=auto

PMD_CONFIG_DIR="$XDG_CONFIG_HOME/paymydine"
DEV_MARKER="$PMD_CONFIG_DIR/developer-desktop-once"
mkdir -p "$PMD_CONFIG_DIR"
chmod 700 "$PMD_CONFIG_DIR" || true
rm -f "$DEV_MARKER"

# Keep the restaurant-facing session visually quiet and power-safe.
xset s off >/dev/null 2>&1 || true
xset -dpms >/dev/null 2>&1 || true
xset s noblank >/dev/null 2>&1 || true

openbox --config-file /etc/paymydine/openbox-rc.xml >/tmp/paymydine-openbox.log 2>&1 &
OPENBOX_PID=$!

cleanup() {
  kill "$OPENBOX_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

find_app() {
  if command -v paymydine >/dev/null 2>&1; then
    command -v paymydine
    return 0
  fi
  for candidate in /opt/PayMyDine/paymydine /opt/PayMyDine/PayMyDine /usr/lib/paymydine/paymydine; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

APP="$(find_app || true)"
if [[ -z "$APP" ]]; then
  echo "PayMyDine executable not found" >&2
  exec xfce4-terminal --hold -e 'bash -lc "echo PayMyDine executable not found; read -r"'
fi

while true; do
  rm -f "$DEV_MARKER"
  "$APP" --pmd-linux-appliance || true

  if [[ -f "$DEV_MARKER" ]]; then
    rm -f "$DEV_MARKER"
    cleanup
    trap - EXIT
    exec startxfce4
  fi

  sleep 1
 done
