#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
SHA="${SHA:-}"

if [ -z "$SHA" ]; then
  echo "STOP: set SHA to the exact GitHub commit to deploy."
  exit 1
fi

BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$SHA"
PATCHER_REL="scripts/pmd-terminal-market-ui-r9.py"
PATCHER="/tmp/pmd-terminal-market-ui-r9.py"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-terminal-market-ui-r9-$STAMP"

INDEX="app/admin/views/pmddevices/index.blade.php"
SUMUP_V1="app/admin/assets/js/pmd-sumup-self-service-v1.js"
SUMUP_V2="app/admin/assets/js/pmd-sumup-self-service-v2.js"
ASSETS="app/admin/views/_meta/assets.json"

cd "$ROOT"
mkdir -p "$BACKUP"

echo "=========================================="
echo "BACKUP CURRENT LIVE FILES"
echo "=========================================="
for rel in "$INDEX" "$SUMUP_V1" "$ASSETS"; do
  if [ ! -f "$ROOT/$rel" ]; then
    echo "STOP: missing live file: $rel"
    exit 1
  fi
  mkdir -p "$BACKUP/$(dirname "$rel")"
  sudo cp -a "$ROOT/$rel" "$BACKUP/$rel"
done

V2_EXISTED=0
if [ -f "$ROOT/$SUMUP_V2" ]; then
  V2_EXISTED=1
  mkdir -p "$BACKUP/$(dirname "$SUMUP_V2")"
  sudo cp -a "$ROOT/$SUMUP_V2" "$BACKUP/$SUMUP_V2"
fi

echo "Backup: $BACKUP"

rollback() {
  set +e
  echo
  echo "=========================================="
  echo "FAILED - RESTORING PRE-R9 SOURCE"
  echo "=========================================="
  for rel in "$INDEX" "$SUMUP_V1" "$ASSETS"; do
    if [ -f "$BACKUP/$rel" ]; then
      sudo cp -a "$BACKUP/$rel" "$ROOT/$rel"
    fi
  done
  if [ "$V2_EXISTED" = "1" ] && [ -f "$BACKUP/$SUMUP_V2" ]; then
    sudo cp -a "$BACKUP/$SUMUP_V2" "$ROOT/$SUMUP_V2"
  else
    sudo rm -f "$ROOT/$SUMUP_V2"
  fi
  if [ -f artisan ]; then php artisan view:clear >/dev/null 2>&1 || true; fi
  sudo systemctl reload php8.3-fpm >/dev/null 2>&1 || true
  echo "Rollback complete: $BACKUP"
}
trap rollback ERR

echo
echo "=========================================="
echo "DOWNLOAD TERMINAL MARKET UI R9 PATCHER"
echo "SHA: $SHA"
echo "=========================================="
curl -fsSL "$BASE/$PATCHER_REL" -o "$PATCHER"
test -s "$PATCHER"
python3 -m py_compile "$PATCHER"

echo
echo "=========================================="
echo "APPLY R9"
echo "=========================================="
sudo python3 "$PATCHER"

sudo chown ubuntu:ubuntu "$ROOT/$INDEX" "$ROOT/$SUMUP_V1" "$ROOT/$SUMUP_V2" "$ROOT/$ASSETS"

echo
echo "=========================================="
echo "VERIFY CACHE-PROOF SERVER MARKER"
echo "=========================================="
grep -n 'pmdLegacySumupOnly' "$INDEX"
grep -n 'data-pmd-sumup-self-service=' "$INDEX"

echo
echo "=========================================="
echo "VERIFY UNIQUE GUARDED JS ASSET"
echo "=========================================="
grep -n 'PMD_TERMINAL_MARKET_UI_CACHE_BUST_R9' "$SUMUP_V2"
COUNT="$(grep -c 'if (!legacySumupOwnsTerminalPage()) return;' "$SUMUP_V2")"
if [ "$COUNT" != "2" ]; then
  echo "STOP: expected 2 provider ownership guards in V2, found $COUNT"
  exit 1
fi
node --check "$SUMUP_V2"

echo
echo "=========================================="
echo "VERIFY ADMIN ASSET MANIFEST"
echo "=========================================="
python3 -m json.tool "$ASSETS" >/dev/null
grep -n 'pmd-sumup-self-service-v2.js' "$ASSETS"
if grep -q 'pmd-sumup-self-service-v1.js' "$ASSETS"; then
  echo "STOP: old SumUp V1 JS is still referenced by the admin asset manifest"
  exit 1
fi

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
echo "CLEAR ADMIN VIEW / PHP CACHE"
echo "=========================================="
if [ -f artisan ]; then
  php artisan view:clear >/dev/null 2>&1 || true
fi
sudo systemctl reload php8.3-fpm

trap - ERR

echo
echo "=========================================="
echo "TERMINAL MARKET UI R9 DEPLOYED"
echo "SHA: $SHA"
echo "BACKUP: $BACKUP"
echo "=========================================="
echo "R9 fixes both causes of the Square -> SumUp blink:"
echo "1) Canada server markup is immune to stale cached SumUp V1 auto-mount."
echo "2) New pages load a new V2 JS URL, so the browser cannot reuse pre-R8 JavaScript."
echo "Refresh /admin/settings/devices once after this deploy."
