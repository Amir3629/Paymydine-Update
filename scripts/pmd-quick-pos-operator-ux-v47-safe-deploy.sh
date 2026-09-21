#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-fix/quick-pos-operator-ux-v47-safe-deploy}"
REF="origin/${REMOTE_BRANCH}"
BASE_COMMIT="d4f7c2dbf0c1ff628dd336ed036a3ba7f5f9047b"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v47.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-operator-ux-v47-$STAMP"
DEPLOY_COMPLETE=0
BACKUP_READY=0

FILES=(
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/Services/TerminalPayments/TerminalPaymentService.php"
  "app/Services/Payments/SquareRuntimeService.php"
  "app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php"
)

declare -A BASE_BLOB=(
  ["app/admin/views/pmd_quick_pos_v1.blade.php"]="cd88ddf121c9337fa6abae2d401999e0d1efe23f"
  ["app/admin/assets/css/pmd-quick-pos-v1.css"]="9cf5b4f786c6c59d5b6660ec966d8655b7ddbeb6"
  ["app/admin/assets/js/pmd-quick-pos-v1.js"]="04209d6c963ac6fb1ac8fc2fdb3932c5c9fc9940"
  ["app/Services/TerminalPayments/TerminalPaymentService.php"]="208a7b097ab38630c43b75d188c1f98b05501fb2"
  ["app/Services/Payments/SquareRuntimeService.php"]="098f26e15ff334239964035f15f4e189c2e7e587"
  ["app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php"]="ff8df8461ca5c58aa447a8c52321a885420c1990"
)

declare -A NEEDS_DEPLOY=()

cleanup() {
  rm -rf "$STAGE" >/dev/null 2>&1 || true
}

copy_live() {
  local src="$1"
  local dst="$2"

  if [ -w "$dst" ]; then
    cp "$src" "$dst"
  else
    sudo cp "$src" "$dst"
  fi
}

rollback() {
  local failed=0
  local file

  [ "$BACKUP_READY" -eq 1 ] || return 0

  echo
  echo "===== ROLLBACK ====="
  set +e
  for file in "${FILES[@]}"; do
    if [ -f "$BACKUP/$file" ]; then
      if copy_live "$BACKUP/$file" "$ROOT/$file" && cmp -s "$BACKUP/$file" "$ROOT/$file"; then
        echo "RESTORED $file"
      else
        echo "ROLLBACK ERROR: could not restore $file" >&2
        failed=1
      fi
    fi
  done
  set -e

  if [ "$failed" -ne 0 ]; then
    echo "WARNING: rollback completed with one or more restore errors." >&2
  fi

  return 0
}

on_exit() {
  local status="$1"
  trap - EXIT

  if [ "$status" -ne 0 ] && [ "$DEPLOY_COMPLETE" -eq 0 ]; then
    rollback || true
  fi

  cleanup
  exit "$status"
}
trap 'on_exit $?' EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine QUICK POS OPERATOR UX V47 SAFE DEPLOY"
echo " Branch: $REF"
echo " Base:   $BASE_COMMIT"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== STAGE V47 FILES ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$REF:$file" > "$STAGE/$file"
  test -s "$STAGE/$file"
  echo "STAGED $file"
done

echo
echo "===== V47 / V46 FEATURE CONTRACT ====="
grep -q "PMD_QPOS_OPERATOR_UX_V46" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_MAP_RAIL_SCROLL_V46" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_CASH_AUTO_FOCUS_V46" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_KEYPAD_NEXT_FIELD_RUNTIME_V46" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_CASH_ONLY_TIP_V46" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_TERMINAL_TIP_RUNTIME_V46" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_CASH_FIRST_FIELD_V46" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_QPOS_KEYPAD_NEXT_FIELD_V46" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_QPOS_TERMINAL_TIP_DISPLAY_V46" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "data-qpos-table-cleaning>Cleaning</button>" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.css?v=20260921-46" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260921-46" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

echo
echo "===== KEYPAD DUPLICATE EXACT GUARD ====="
if grep -q "data-qpos-keypad-exact" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"; then
  echo "ERROR: duplicate keypad Exact control still exists" >&2
  exit 1
fi
if grep -Fq "key === 'exact'" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"; then
  echo "ERROR: old keypad Exact runtime still exists" >&2
  exit 1
fi
grep -q "data-qpos-keypad-next" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK keypad Exact duplicate removed; Next-field control present"

echo
echo "===== TERMINAL TIP CONTRACT ====="
grep -q "PMD_TERMINAL_TIP_EXTRACT_V46" "$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php"
grep -q "PMD_TERMINAL_TIP_SETTLEMENT_V46" "$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php"
grep -q "PMD_TERMINAL_TIP_REFRESH_V46" "$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php"
grep -q "PMD_TERMINAL_TIP_SQUARE_V46" "$STAGE/app/Services/Payments/SquareRuntimeService.php"
grep -q "PMD_QPOS_TERMINAL_TIP_RESPONSE_V46" "$STAGE/app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php"
echo "OK provider-reported terminal tip path present"

echo
echo "===== PRESERVE V39-V45 ====="
grep -q "PMD_QPOS_GUIDE_POPOVER_V39" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_QPOS_CLEANING_LEFT_LOCK_V40" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_IMMEDIATE_TABLE_TAP_V42" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_DIRECT_MOVE_NO_BOOTSTRAP_V43" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_OPTIMISTIC_WHOLE_TABLE_MOVE_V44" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_POST_MOVE_SELECTION_FIX_V45" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
echo "OK V39-V45 preserved"

echo
echo "===== SERVER PERFORMANCE GUARD ====="
grep -q 'PMD_PERF_R20_WRITE_ONLY_SHIFT_AUDIT_CONTEXT' "$ROOT/app/admin/middleware/LogUserLastSeen.php"
grep -q 'PMD_PERF_R19_FLOOR_BOOTSTRAP_MICROCACHE' "$ROOT/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS' "$ROOT/app/admin/Services/PmdSharedFloorRegistryV1.php"
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA' "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi
echo "OK R17-R20 preserved"

echo
echo "===== SYNTAX CHECK ====="
php -l "$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php"
php -l "$STAGE/app/Services/Payments/SquareRuntimeService.php"
php -l "$STAGE/app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php"
if command -v node >/dev/null 2>&1; then
  node --check "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
fi

echo
echo "===== LIVE BASE / IDEMPOTENCY GUARD ====="
NEED_SUDO=0
for file in "${FILES[@]}"; do
  live_blob="$(git hash-object "$ROOT/$file")"
  target_blob="$(git hash-object "$STAGE/$file")"

  if [ "$live_blob" = "$target_blob" ]; then
    NEEDS_DEPLOY["$file"]=0
    echo "ALREADY TARGET $file"
    continue
  fi

  if [ "$live_blob" != "${BASE_BLOB[$file]}" ]; then
    echo "ERROR: live file changed since the clean V45 base: $file" >&2
    echo "Expected base blob: ${BASE_BLOB[$file]}" >&2
    echo "Live blob:          $live_blob" >&2
    echo "Target blob:        $target_blob" >&2
    echo "Nothing was deployed." >&2
    exit 1
  fi

  NEEDS_DEPLOY["$file"]=1
  echo "BASE OK $file"

  if [ ! -w "$ROOT/$file" ]; then
    NEED_SUDO=1
  fi
done

echo
echo "===== PERMISSION PREFLIGHT ====="
for file in "${FILES[@]}"; do
  stat -c '%U:%G %a %n' "$ROOT/$file" || true
done

if [ "$NEED_SUDO" -eq 1 ]; then
  if ! command -v sudo >/dev/null 2>&1; then
    echo "ERROR: at least one target file is not writable and sudo is unavailable." >&2
    exit 1
  fi
  echo "Protected live file detected. Validating sudo before any deployment..."
  sudo -v
  echo "OK sudo is ready"
else
  echo "OK all files that need deployment are writable by the current user"
fi

echo
echo "===== BACKUP LIVE FILES ====="
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$file")"
  if cat "$ROOT/$file" > "$BACKUP/$file"; then
    :
  else
    sudo cat "$ROOT/$file" > "$BACKUP/$file"
  fi
  cmp -s "$ROOT/$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done
BACKUP_READY=1

echo
echo "===== DEPLOY V47 ====="
for file in "${FILES[@]}"; do
  if [ "${NEEDS_DEPLOY[$file]:-1}" -eq 0 ]; then
    echo "SKIPPED ALREADY TARGET $file"
    continue
  fi

  copy_live "$STAGE/$file" "$ROOT/$file"
  cmp -s "$STAGE/$file" "$ROOT/$file"
  echo "DEPLOYED + VERIFIED $file"
done

if [ -f "$ROOT/artisan" ] && command -v php >/dev/null 2>&1; then
  php "$ROOT/artisan" view:clear >/dev/null 2>&1 || true
fi

echo
echo "===== LIVE VERIFY ====="
grep -q "PMD_QPOS_OPERATOR_UX_V46" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_MAP_RAIL_SCROLL_V46" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_KEYPAD_NEXT_FIELD_RUNTIME_V46" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_TERMINAL_TIP_SETTLEMENT_V46" "$ROOT/app/Services/TerminalPayments/TerminalPaymentService.php"
grep -q "PMD_TERMINAL_TIP_SQUARE_V46" "$ROOT/app/Services/Payments/SquareRuntimeService.php"
grep -q "PMD_QPOS_TERMINAL_TIP_RESPONSE_V46" "$ROOT/app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php"
grep -q "pmd-quick-pos-v1.js?v=20260921-46" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS OPERATOR UX V47 SAFE DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo " Check is on the left; menu is wider; tables are on the right."
echo " Left action is labeled Cleaning."
echo " Map-selected tables return already positioned in the table rail."
echo " Quick POS typography is larger across food, check, table and payment UI."
echo " Cash opens with Cash received selected; keypad Exact is replaced by Next field."
echo " Cashier tip controls are Cash-only."
echo " Terminal tips are read-only and stored only when the provider reports them."
echo " Protected files are deployed with sudo only when required."
echo " Rollback continues across all files instead of stopping on one protected file."
echo " V45/V44/V43 behavior and R17-R20 performance guards remain preserved."
echo "=============================================================="
