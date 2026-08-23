#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_environment_contract_${STAMP}"
BACKUP="/var/backups/pmd_sumup_environment_contract_${STAMP}"
INSTALL_STARTED=0

FILES=(
  "app/Services/TerminalPayments/SumupMerchantEnvironmentGuard.php"
  "app/admin/controllers/SumupTerminalSettings.php"
)

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/files"

printf '%s\n' \
  "============================================================" \
  " PAYMYDINE SUMUP ENVIRONMENT CONTRACT FINAL" \
  " TEST=SANDBOX / PRODUCTION=LIVE" \
  "============================================================"

git fetch origin sumup-terminal-e2e
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

echo
echo "========== STAGE =========="
for f in "${FILES[@]}"; do
  git cat-file -e "$REMOTE:$f"
  mkdir -p "$STAGE/$(dirname "$f")"
  git show "$REMOTE:$f" > "$STAGE/$f"
  echo "STAGED: $f"
done

echo
echo "========== PREFLIGHT =========="
php -l "$STAGE/app/Services/TerminalPayments/SumupMerchantEnvironmentGuard.php"
php -l "$STAGE/app/admin/controllers/SumupTerminalSettings.php"
grep -Fq "Test is connected to a LIVE SumUp merchant" "$STAGE/app/Services/TerminalPayments/SumupMerchantEnvironmentGuard.php"
grep -Fq "Production is connected to a SumUp Sandbox Merchant" "$STAGE/app/Services/TerminalPayments/SumupMerchantEnvironmentGuard.php"
grep -Fq "SumUp Sandbox connection verified" "$STAGE/app/admin/controllers/SumupTerminalSettings.php"
echo "PREFLIGHT=OK"

echo
echo "========== BACKUP =========="
for f in "${FILES[@]}"; do
  if [ -e "$ROOT/$f" ]; then
    sudo mkdir -p "$BACKUP/files/$(dirname "$f")"
    sudo cp -a "$ROOT/$f" "$BACKUP/files/$f"
  fi
done
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "DEPLOY FAILED - RESTORING"
  for f in "${FILES[@]}"; do
    if [ -e "$BACKUP/files/$f" ]; then
      sudo mkdir -p "$ROOT/$(dirname "$f")"
      sudo cp -a "$BACKUP/files/$f" "$ROOT/$f"
    fi
  done
  cd "$ROOT"
  sudo -u www-data php artisan optimize:clear >/dev/null 2>&1 || true
  echo "RESTORED_FROM=$BACKUP"
  exit "$rc"
}

trap 'rc=$?; if [ "$INSTALL_STARTED" = "1" ] && [ "$rc" != "0" ]; then rollback "$rc"; fi' EXIT
INSTALL_STARTED=1

echo
echo "========== INSTALL =========="
for f in "${FILES[@]}"; do
  sudo mkdir -p "$ROOT/$(dirname "$f")"
  sudo install -m 0644 "$STAGE/$f" "$ROOT/$f"
  echo "INSTALLED: $f"
done

php -l "$ROOT/app/Services/TerminalPayments/SumupMerchantEnvironmentGuard.php"
php -l "$ROOT/app/admin/controllers/SumupTerminalSettings.php"

echo
echo "========== CLEAR CACHE =========="
cd "$ROOT"
sudo -u www-data php artisan optimize:clear

INSTALL_STARTED=0
trap - EXIT

echo
echo "============================================================"
echo " SUCCESS - SUMUP ENVIRONMENT CONTRACT INSTALLED"
echo "============================================================"
echo "TEST_REQUIRES_SANDBOX=yes"
echo "PRODUCTION_REQUIRES_LIVE=yes"
echo "INVALID_ENVIRONMENT_CAN_BE_ACTIVE=no"
echo "DATABASE_MIGRATIONS=none"
echo "NEXT_FRONTEND=untouched"
echo "PM2=untouched"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
