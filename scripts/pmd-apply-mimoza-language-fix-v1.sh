#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
RUNTIME_REF="origin/i18n/language-foundation-runtime"
MW_REL="app/Http/Middleware/TenantDatabaseMiddleware.php"
REPAIR_REL="scripts/pmd-repair-mimoza-language-foundation-v2.php"
EXPECTED_LIVE_MW_SHA="63b93720d31537135a2056c089089406be2da9fbfd0f4e639fc835ee53666873"

cd "$ROOT"

stamp="$(date -u +%Y%m%d_%H%M%S)"
backup="$HOME/pmd-language-fix-backups/$stamp"
tmp="$(mktemp -d)"
mkdir -p "$backup"

cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT

echo "============================================================"
echo " PMD MIMOZA LANGUAGE FIX V1"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$backup"

echo
echo "[1/7] Refreshing read-only GitHub branch..."
git fetch origin i18n/language-foundation-runtime

git show "$RUNTIME_REF:$MW_REL" > "$tmp/TenantDatabaseMiddleware.php"
git show "$RUNTIME_REF:$REPAIR_REL" > "$tmp/repair.php"

php -l "$tmp/TenantDatabaseMiddleware.php"
php -l "$tmp/repair.php"

current_sha="$(sha256sum "$MW_REL" | awk '{print $1}')"
candidate_sha="$(sha256sum "$tmp/TenantDatabaseMiddleware.php" | awk '{print $1}')"

echo "LIVE_MIDDLEWARE_SHA=$current_sha"
echo "CANDIDATE_MIDDLEWARE_SHA=$candidate_sha"

if [[ "$current_sha" != "$EXPECTED_LIVE_MW_SHA" && "$current_sha" != "$candidate_sha" ]]; then
  echo "ERROR=Live middleware changed since the audited version. Nothing changed." >&2
  exit 10
fi

echo
echo "[2/7] Saving targeted rollback files..."
cp -a "$MW_REL" "$backup/TenantDatabaseMiddleware.php.before"
sha256sum "$backup/TenantDatabaseMiddleware.php.before" > "$backup/middleware-before.sha256"
git diff --no-index -- "$MW_REL" "$tmp/TenantDatabaseMiddleware.php" > "$backup/middleware-proposed.diff" || true

echo
echo "[3/7] Running guarded DB dry-run..."
PMD_ROOT="$ROOT" php "$tmp/repair.php" | tee "$backup/db-dry-run.txt"

grep -q '^DRY_RUN_OK=1$' "$backup/db-dry-run.txt"
grep -q '^CANONICAL_DE_ID=4$' "$backup/db-dry-run.txt"

echo
echo "[4/7] Applying transactional Mimoza EN/DE metadata repair..."
PMD_ROOT="$ROOT" php "$tmp/repair.php" --apply | tee "$backup/db-apply.txt"

grep -q '^VERIFY_OK=1$' "$backup/db-apply.txt"

echo
echo "[5/7] Installing tenant-scoped settings runtime patch..."
if [[ "$current_sha" != "$candidate_sha" ]]; then
  cat "$tmp/TenantDatabaseMiddleware.php" > "$MW_REL"
fi

php -l "$MW_REL"
installed_sha="$(sha256sum "$MW_REL" | awk '{print $1}')"

if [[ "$installed_sha" != "$candidate_sha" ]]; then
  cp -a "$backup/TenantDatabaseMiddleware.php.before" "$MW_REL"
  echo "ERROR=Installed middleware hash mismatch; original middleware restored." >&2
  exit 11
fi

echo "INSTALLED_MIDDLEWARE_SHA=$installed_sha"

echo
echo "[6/7] HTTP smoke test..."
set +e
http_code="$(curl -sS --max-time 20 -o "$backup/http-smoke-body.html" -w '%{http_code}' https://mimoza.paymydine.com/admin)"
curl_rc=$?
set -e

echo "HTTP_SMOKE_CODE=$http_code"
echo "CURL_EXIT_CODE=$curl_rc"

if [[ "$http_code" =~ ^5 ]]; then
  cp -a "$backup/TenantDatabaseMiddleware.php.before" "$MW_REL"
  php -l "$MW_REL"
  echo "ERROR=Admin returned HTTP $http_code; middleware restored. DB metadata repair remains committed and verified." >&2
  exit 12
fi

echo
echo "[7/7] Final local checks..."
php -l "$MW_REL"
sha256sum "$MW_REL" | tee "$backup/middleware-after.sha256"

echo
echo "============================================================"
echo " FIX COMPLETE"
echo "============================================================"
echo "DB_VERIFY_OK=1"
echo "MIDDLEWARE_SHA=$installed_sha"
echo "BACKUP=$backup"
echo "NEXT=Open Mimoza admin, hard refresh, then switch EN -> DE -> EN."
echo "ROLLBACK_MIDDLEWARE=cp -a '$backup/TenantDatabaseMiddleware.php.before' '$ROOT/$MW_REL'"
