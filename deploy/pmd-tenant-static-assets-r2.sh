#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-a.paymydine.com}"
BRANCH="feature/cashier-desktop-universal-v1"
R1_REL="deploy/pmd-tenant-static-assets-r1.sh"
TMP_R1="$(mktemp /tmp/pmd-tenant-static-assets-r2.XXXXXX.sh)"

cleanup() { rm -f "$TMP_R1"; }
trap cleanup EXIT

cd "$ROOT"
git fetch origin "$BRANCH"
git show "FETCH_HEAD:$R1_REL" > "$TMP_R1"

python3 - "$TMP_R1" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')

old_pre = '''PRE_SETTINGS="$(http_code "https://$TEST_HOST/api/v1/settings?pmdstaticr1=$(date +%s)")"
PRE_MENU="$(http_code "https://$TEST_HOST/api/v1/menu?pmdstaticr1=$(date +%s)")"
PRE_ROOT="$(http_code "https://$TEST_HOST/?pmdstaticr1=$(date +%s)")"
echo "settings=$PRE_SETTINGS menu=$PRE_MENU root=$PRE_ROOT"
[[ "$PRE_SETTINGS" == "200" && "$PRE_MENU" == "200" && "$PRE_ROOT" == "200" ]] || fail "Production unhealthy before Nginx change"'''

new_pre = '''PRE_SETTINGS="$(http_code "https://$TEST_HOST/api/v1/settings?pmdstaticr2=$(date +%s)")"
PRE_MENU="$(http_code "https://$TEST_HOST/api/v1/menu?pmdstaticr2=$(date +%s)")"
PRE_ROOT="$(http_code "https://$TEST_HOST/?pmdstaticr2=$(date +%s)")"
echo "settings=$PRE_SETTINGS menu=$PRE_MENU root=$PRE_ROOT"
for code in "$PRE_SETTINGS" "$PRE_MENU" "$PRE_ROOT"; do
  [[ "$code" =~ ^[23][0-9][0-9]$ ]] || fail "Production returned non-2xx/3xx before Nginx change: $code"
done
echo "PRE_HEALTH_2XX_3XX=PASS"'''

old_post = '''POST_SETTINGS="$(http_code "https://$TEST_HOST/api/v1/settings?pmdstaticr1=$(date +%s)")"
POST_MENU="$(http_code "https://$TEST_HOST/api/v1/menu?pmdstaticr1=$(date +%s)")"
POST_ROOT="$(http_code "https://$TEST_HOST/?pmdstaticr1=$(date +%s)")"
echo "settings=$POST_SETTINGS menu=$POST_MENU root=$POST_ROOT"
[[ "$POST_SETTINGS" == "200" && "$POST_MENU" == "200" && "$POST_ROOT" == "200" ]] || fail "Production unhealthy after Nginx change"'''

new_post = '''POST_SETTINGS="$(http_code "https://$TEST_HOST/api/v1/settings?pmdstaticr2=$(date +%s)")"
POST_MENU="$(http_code "https://$TEST_HOST/api/v1/menu?pmdstaticr2=$(date +%s)")"
POST_ROOT="$(http_code "https://$TEST_HOST/?pmdstaticr2=$(date +%s)")"
echo "settings=$POST_SETTINGS menu=$POST_MENU root=$POST_ROOT"
for code in "$POST_SETTINGS" "$POST_MENU" "$POST_ROOT"; do
  [[ "$code" =~ ^[23][0-9][0-9]$ ]] || fail "Production returned non-2xx/3xx after Nginx change: $code"
done
echo "POST_HEALTH_2XX_3XX=PASS"'''

if old_pre not in text:
    raise SystemExit('R2 wrapper refused: R1 pre-health anchor missing')
if old_post not in text:
    raise SystemExit('R2 wrapper refused: R1 post-health anchor missing')

text = text.replace(old_pre, new_pre, 1)
text = text.replace(old_post, new_post, 1)
text = text.replace('PMD TENANT STATIC ASSET AUTHORITY R1', 'PMD TENANT STATIC ASSET AUTHORITY R2')
text = text.replace('PMD TENANT STATIC ASSET R1 REFUSED', 'PMD TENANT STATIC ASSET R2 REFUSED')
text = text.replace('AUTOMATIC TENANT STATIC ASSET R1 ROLLBACK', 'AUTOMATIC TENANT STATIC ASSET R2 ROLLBACK')
text = text.replace('TENANT STATIC ASSET R1 ROLLBACK COMPLETE', 'TENANT STATIC ASSET R2 ROLLBACK COMPLETE')
text = text.replace('PMD TENANT STATIC ASSET AUTHORITY R1 DEPLOYED', 'PMD TENANT STATIC ASSET AUTHORITY R2 DEPLOYED')

path.write_text(text, encoding='utf-8')
PY

bash -n "$TMP_R1"

echo "============================================================"
echo "PMD TENANT STATIC ASSET R2"
echo "302-aware health; static assets still require 200/no-redirect/hash-match"
echo "============================================================"

sudo env \
  PMD_ROOT="$ROOT" \
  TEST_HOST="$TEST_HOST" \
  bash "$TMP_R1"
