#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="fix/tenant-media-isolation-r1"
BASE="deploy/pmd-tenant-media-isolation-r1.sh"
TMP="/tmp/pmd-tenant-media-isolation-r1-final.sh"

cd "$ROOT"

echo "============================================"
echo "PMD TENANT MEDIA ISOLATION R1"
echo "============================================"

echo
echo "== FETCH REVIEWED BRANCH =="
git fetch origin "$BRANCH"
git show "FETCH_HEAD:$BASE" > "$TMP"

# Add a standalone rollback file to the already-reviewed base deployer.
python3 - "$TMP" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
marker = 'log "5. ACTIVATE ONLY REVIEWED PHP FILES"\n'
if marker not in text:
    raise SystemExit('REFUSED: activation marker missing')
if 'TENANT MEDIA R1 STANDALONE ROLLBACK' not in text:
    block = r'''cat > "$BACKUP/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="/var/www/paymydine"
BACKUP="$(cd "$(dirname "$0")" && pwd)"
HELPER="app/main/routes/tenant-media-guard.php"

echo "TENANT MEDIA R1 STANDALONE ROLLBACK"
cp -a "$BACKUP/files/." "$ROOT/"
if [[ -f "$BACKUP/helper-was-new" ]]; then
  rm -f "$ROOT/$HELPER"
fi
cd "$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
echo "TENANT MEDIA R1 CODE ROLLBACK COMPLETE"
echo "NOTE: tenant DB cleanup is not automatically reversed."
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

'''
    text = text.replace(marker, block + marker, 1)
path.write_text(text)
PY

echo
echo "== SHELL SYNTAX =="
bash -n "$TMP"

echo
echo "== VERIFY CONTRACT MARKERS =="
grep -n 'PMD_TENANT_MEDIA_NO_LEGACY_AUTOMATCH_R1' "$TMP"
grep -n 'PMD_TENANT_MEDIA_ROUTE_GUARD_R1' "$TMP"
grep -n 'PMD_NEW_TENANT_MEDIA_EMPTY_R1' "$TMP"
grep -n 'TENANT MEDIA R1 STANDALONE ROLLBACK' "$TMP"

echo
echo "== DEPLOY =="
sudo -E bash "$TMP"
