#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
HOST="${1:-tomo.paymydine.com}"
CONFIG="$ROOT/storage/framework/pmd-performance-live.json"
PERF_LOG="$ROOT/storage/logs/pmd-performance.log"
SYSTEM_LOG="$ROOT/storage/logs/system.log"
FORMATTER="$ROOT/scripts/pmd-performance-live-format.php"

if [ ! -d "$ROOT" ]; then
  echo "ERROR: PayMyDine root not found: $ROOT" >&2
  exit 1
fi

if [ ! -f "$FORMATTER" ]; then
  echo "ERROR: formatter not installed: $FORMATTER" >&2
  exit 1
fi

EXPIRES_AT="$(date -u -d '+2 hours' '+%Y-%m-%dT%H:%M:%SZ')"
TMP_CONFIG="$(mktemp)"

cat > "$TMP_CONFIG" <<EOF
{
  "enabled": true,
  "hosts": ["$HOST"],
  "expires_at": "$EXPIRES_AT"
}
EOF

sudo mkdir -p "$ROOT/storage/framework" "$ROOT/storage/logs"
sudo cp "$TMP_CONFIG" "$CONFIG"
rm -f "$TMP_CONFIG"
sudo chmod 0644 "$CONFIG"

sudo touch "$PERF_LOG"
sudo chmod 0664 "$PERF_LOG" || true

cleanup() {
  trap - EXIT INT TERM HUP
  sudo rm -f "$CONFIG" >/dev/null 2>&1 || true
  jobs -pr | xargs -r kill >/dev/null 2>&1 || true
  echo
  echo "PMD live performance profiler disabled."
}
trap cleanup EXIT INT TERM HUP

echo "=============================================================="
echo " PayMyDine LIVE PERFORMANCE MONITOR"
echo "=============================================================="
echo " Host:      $HOST"
echo " Expires:   $EXPIRES_AT"
echo " Perf log:  $PERF_LOG"
echo
echo "Profiler is ACTIVE only for this host."
echo "Use the platform normally now: open pages, tables, edit, save,"
echo "confirm orders and test payments."
echo
echo "Interpretation:"
echo "  OK        < 300ms"
echo "  WATCH     300-799ms"
echo "  SLOW      800-1999ms"
echo "  VERY-SLOW >= 2000ms"
echo
echo "Press Ctrl+C when the test session is finished."
echo "=============================================================="
echo

# Surface Laravel/system warnings in the same terminal without dumping every
# informational line.
if [ -f "$SYSTEM_LOG" ]; then
  (
    tail -n0 -F "$SYSTEM_LOG" 2>/dev/null       | grep --line-buffered -Ei 'error|critical|exception|sqlstate|timeout|stripe|deadlock|lock wait'       | sed -u 's/^/[SYSTEM] /'
  ) &
fi

# Light server-resource pulse. This distinguishes application latency from a
# VPS that is simply CPU/RAM/load constrained.
(
  while true; do
    sleep 5
    LOAD="$(cut -d' ' -f1-3 /proc/loadavg 2>/dev/null || echo '?')"
    MEM="$(free -m 2>/dev/null | awk '/^Mem:/ {printf "%s/%sMB", $3, $2}' || true)"
    PHP_COUNT="$(pgrep -c -f 'php-fpm: pool' 2>/dev/null || true)"
    NEXT_COUNT="$(pgrep -c -f 'next-server|next start' 2>/dev/null || true)"
    echo "[HOST] $(date '+%H:%M:%S') load=$LOAD mem=${MEM:-?} php_fpm=${PHP_COUNT:-0} next=${NEXT_COUNT:-0}"
  done
) &

tail -n0 -F "$PERF_LOG" 2>/dev/null | php "$FORMATTER"
