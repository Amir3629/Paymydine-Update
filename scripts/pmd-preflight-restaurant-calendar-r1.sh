#!/usr/bin/env bash
# PMD_RESTAURANT_CALENDAR_PREFLIGHT_R1
# Stages the exact GitHub branch in /tmp and checks syntax/contracts.
# READ ONLY on /var/www/paymydine. No merge, checkout or DB changes.
set -Eeuo pipefail
cd /var/www/paymydine
BASE="f61a1613fbb8e6e7616d83972f61a56d43a5b68f"
REF="origin/pmd-calendar-r1"
git cat-file -e "$BASE^{commit}"
git cat-file -e "$REF^{commit}"

ROOT="$(mktemp -d /tmp/pmd-calendar-r1-XXXXXX)"
trap 'rm -rf "$ROOT"' EXIT
echo "=== STAGING CHANGED FILES (NO LIVE MODIFICATIONS) ==="
mapfile -t paths < <(git diff --name-only "$BASE" "$REF")
test "${#paths[@]}" -ge 15 || {
  echo "STOP: calendar ref missing expected changed files"
  exit 2
}
for p in "${paths[@]}"; do
  case "$p" in
    app/*|public/*|resources/*|scripts/*) ;;
    *) echo "STOP: unexpected path: $p"; exit 2 ;;
  esac
  mkdir -p "$ROOT/$(dirname "$p")"
  git show "$REF:$p" > "$ROOT/$p"
done

echo "=== CHECK PHP (INCLUDING NEW CALENDAR SERVICE) ==="
for p in "${paths[@]}"; do
  case "$p" in
    *.blade.php) ;;
    *.php)
      php -l "$ROOT/$p"
      ;;
  esac
done

echo "=== CHECK JS SYNTAX ==="
for p in "${paths[@]}"; do
  case "$p" in
    *.js) node --check "$ROOT/$p" ;;
  esac
done

echo "=== RUN STATIC CALENDAR CONTRACT TEST ==="
node "$ROOT/scripts/test-pmd-restaurant-calendar-contract-r1.js"

echo "=== GIT PATCH WHITESPACE ==="
git diff --check "$BASE" "$REF"

echo "PASS: CALENDAR R1 PREFLIGHT (NO PRODUCTION FILES OR DATABASES CHANGED)"
echo "NEXT: run PHP fixture and end-to-end booking QA before any rollout."
