#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
SHA="${SHA:-}"

if [ -z "$SHA" ]; then
  echo "STOP: set SHA to the exact GitHub commit to deploy."
  exit 1
fi

BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$SHA"
PATCHER_REL="scripts/pmd-terminal-market-ui-r8.py"
PATCHER="/tmp/pmd-terminal-market-ui-r8.py"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-terminal-market-ui-r8-$STAMP"

TARGETS=(
  "app/admin/views/pmddevices/index.blade.php"
  "app/admin/assets/js/pmd-sumup-self-service-v1.js"
)

cd "$ROOT"
mkdir -p "$BACKUP"

echo "=========================================="
echo "BACKUP CURRENT LIVE FILES"
echo "=========================================="
for rel in "${TARGETS[@]}"; do
  if [ ! -f "$ROOT/$rel" ]; then
    echo "STOP: missing live file: $rel"
    exit 1
  fi
  mkdir -p "$BACKUP/$(dirname "$rel")"
  sudo cp -a "$ROOT/$rel" "$BACKUP/$rel"
done

echo "Backup: $BACKUP"

rollback() {
  set +e
  echo
  echo "=========================================="
  echo "FAILED - RESTORING PRE-R8 SOURCE"
  echo "=========================================="
  for rel in "${TARGETS[@]}"; do
    if [ -f "$BACKUP/$rel" ]; then
      sudo cp -a "$BACKUP/$rel" "$ROOT/$rel"
    fi
  done
  if [ -f artisan ]; then php artisan view:clear >/dev/null 2>&1 || true; fi
  echo "Rollback complete: $BACKUP"
}
trap rollback ERR

echo
echo "=========================================="
echo "DOWNLOAD TERMINAL MARKET UI R8 PATCHER"
echo "SHA: $SHA"
echo "=========================================="
curl -fsSL "$BASE/$PATCHER_REL" -o "$PATCHER"
test -s "$PATCHER"
python3 -m py_compile "$PATCHER"

echo
echo "=========================================="
echo "APPLY R8"
echo "=========================================="
sudo python3 "$PATCHER"

for rel in "${TARGETS[@]}"; do
  sudo chown ubuntu:ubuntu "$ROOT/$rel"
done

echo
echo "=========================================="
echo "VERIFY R8 MARKERS"
echo "=========================================="
grep -n 'data-pmd-terminal-market-ui="1"' app/admin/views/pmddevices/index.blade.php
grep -n 'PMD_TERMINAL_MARKET_UI_OWNERSHIP_R8' app/admin/assets/js/pmd-sumup-self-service-v1.js
COUNT="$(grep -c 'if (!legacySumupOwnsTerminalPage()) return;' app/admin/assets/js/pmd-sumup-self-service-v1.js)"
if [ "$COUNT" != "2" ]; then
  echo "STOP: expected 2 SumUp ownership guards, found $COUNT"
  exit 1
fi

echo
echo "=========================================="
echo "ADMIN JS SYNTAX"
echo "=========================================="
node --check app/admin/assets/js/pmd-sumup-self-service-v1.js

echo
echo "=========================================="
echo "SQUARE SECURITY GUARDS"
echo "=========================================="
if [ -f frontend/scripts/pmd-square-security-guard.sh ]; then
  bash frontend/scripts/pmd-square-security-guard.sh
fi
if [ -f frontend/scripts/pmd-square-canada-market-guard.sh ]; then
  bash frontend/scripts/pmd-square-canada-market-guard.sh
fi

echo
echo "=========================================="
echo "CLEAR COMPILED VIEWS"
echo "=========================================="
if [ -f artisan ]; then
  php artisan view:clear >/dev/null 2>&1 || true
fi

trap - ERR

echo
echo "=========================================="
echo "TERMINAL MARKET UI R8 DEPLOYED"
echo "SHA: $SHA"
echo "BACKUP: $BACKUP"
echo "=========================================="
echo "The legacy SumUp self-service can no longer replace the Canada Square terminal card after load."
echo "Hard-refresh /admin/settings/devices (or the canonical pmddevices URL) once."
