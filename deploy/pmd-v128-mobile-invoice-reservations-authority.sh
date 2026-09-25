#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="cbcdc30878ffd9744ce48996e8c1ad6afd035a35"

FILES=(
  "app/admin/Services/PmdDefaultStaffRoleService.php"
  "app/admin/controllers/Reservations.php"
)

log(){ printf '\n[PayMyDine V128] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V128][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V128 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V128 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v128-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v128-mobile-invoice-reservations-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel"
done

ROLES="$STAGE/app/admin/Services/PmdDefaultStaffRoleService.php"
RESERVATIONS="$STAGE/app/admin/controllers/Reservations.php"

log "Validating V128 before touching live files"

grep -Fq 'PMD_QPOS_MOBILE_INVOICE_RESERVATIONS_AUTHORITY_V128' "$ROLES"   || fail "V128 role authority marker missing"

grep -Fq '#^admin/pmd-cashier-order-center/invoice/[0-9]+$#' "$ROLES"   || fail "Canonical mobile invoice route authority missing"

grep -Fq '$isCanonicalCashierInvoiceV128' "$ROLES"   || fail "Canonical invoice role guard missing"

grep -Fq '$isCashierReservationsV128' "$ROLES"   || fail "Cashier Reservations route authority missing"

grep -Fq "$is('reservations2')" "$ROLES"   || fail "Reservations2 route allowance missing"

grep -Fq "'Admin.Reservations' => 1" "$ROLES"   || fail "Future Cashier Reservations permission provisioning missing"

grep -Fq 'PMD_QPOS_MOBILE_INVOICE_RESERVATIONS_AUTHORITY_V128' "$RESERVATIONS"   || fail "Reservations controller V128 marker missing"

grep -Fq "'PMD.Workspace.Cashier'" "$RESERVATIONS"   || fail "Existing Cashier workspace permission bridge missing"

grep -Fq "'Admin.DeleteReservations'" "$RESERVATIONS"   || fail "Reservation delete protection was lost"

php -l "$ROLES" >/dev/null   || fail "PHP syntax failed: PmdDefaultStaffRoleService.php"

php -l "$RESERVATIONS" >/dev/null   || fail "PHP syntax failed: Reservations.php"

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done

if [[ "${#EXISTING[@]}" -gt 0 ]]; then
  sudo tar -czf "$BACKUP" "${EXISTING[@]}"
  sudo chmod 0640 "$BACKUP" || true
fi

log "Installing validated V128 files"
for rel in "${FILES[@]}"; do
  src="$STAGE/$rel"
  dst="$PMD_ROOT/$rel"
  parent_dir="$(dirname "$dst")"

  sudo mkdir -p "$parent_dir"

  if [[ -f "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    uid="$(stat -c '%u' "$parent_dir")"
    gid="$(stat -c '%g' "$parent_dir")"
    mode="644"
  fi

  sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

sudo -u www-data php artisan view:clear >/dev/null 2>&1   || php artisan view:clear >/dev/null 2>&1   || true
sudo -u www-data php artisan route:clear >/dev/null 2>&1   || php artisan route:clear >/dev/null 2>&1   || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1   || php artisan cache:clear >/dev/null 2>&1   || true

grep -Fq '$isCanonicalCashierInvoiceV128'   app/admin/Services/PmdDefaultStaffRoleService.php   || fail "Live invoice route authority verification failed"

grep -Fq '$isCashierReservationsV128'   app/admin/Services/PmdDefaultStaffRoleService.php   || fail "Live Reservations route authority verification failed"

grep -Fq "'PMD.Workspace.Cashier'"   app/admin/controllers/Reservations.php   || fail "Live Reservations controller permission verification failed"

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V128 MOBILE INVOICE + RESERVATIONS COMPLETE
============================================================

MOBILE INVOICE
  Cashier / Waiter paid-order invoice
    = canonical /admin/pmd-cashier-order-center/invoice/# route is allowed
    = same invoice document that already works for Owner/Admin on desktop
    = no role-boundary 403 before invoice rendering

RESERVATIONS SIDE MENU
  Cashier side-menu Reservations
    = /admin/reservations2 is a real authorized destination
    = existing Cashier roles work immediately through PMD.Workspace.Cashier
    = future Cashier role provisioning includes Admin.Reservations
    = reservation delete protection remains Admin.DeleteReservations

PRESERVED
  V127 combined History / combined invoice
  V127 mobile floating total behavior
  V127 shared Floor touch-scroll handoff
  V126 and earlier Quick POS behavior
  Waiter remains POS-only for Reservations

============================================================
EOF

if [[ -f "$BACKUP" ]]; then
  printf 'Backup: %s\n' "$BACKUP"
else
  printf 'Backup: no pre-existing files required backup\n'
fi
