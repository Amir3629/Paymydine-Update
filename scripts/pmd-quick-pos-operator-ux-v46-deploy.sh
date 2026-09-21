#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-feat/quick-pos-operator-ux-v46}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v46.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-operator-ux-v46-$STAMP"
DEPLOY_COMPLETE=0

FILES=(
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/Services/TerminalPayments/TerminalPaymentService.php"
  "app/Services/Payments/SquareRuntimeService.php"
  "app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php"
)

cleanup() {
  rm -rf "$STAGE" >/dev/null 2>&1 || true
}

rollback() {
  if [ "$DEPLOY_COMPLETE" -eq 0 ] && [ -d "$BACKUP" ]; then
    echo
    echo "===== ROLLBACK ====="
    for file in "${FILES[@]}"; do
      if [ -f "$BACKUP/$file" ]; then
        mkdir -p "$ROOT/$(dirname "$file")"
        cp -a "$BACKUP/$file" "$ROOT/$file"
        echo "RESTORED $file"
      fi
    done
  fi
}

trap 'rollback; cleanup' EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine QUICK POS OPERATOR UX V46"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== STAGE V46 FILES ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$REF:$file" > "$STAGE/$file"
  test -s "$STAGE/$file"
  echo "STAGED $file"
done

echo
echo "===== V46 POS CONTRACT ====="
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
echo "===== BACKUP LIVE FILES ====="
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$ROOT/$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done

echo
echo "===== DEPLOY V46 ====="
for file in "${FILES[@]}"; do
  cp -a "$STAGE/$file" "$ROOT/$file"
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
grep -q "pmd-quick-pos-v1.js?v=20260921-46" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS OPERATOR UX V46 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo " Check is on the left; menu is wider; tables are on the right."
echo " Left action is now labeled Cleaning."
echo " Map-selected tables return already centered in the table rail."
echo " Quick POS typography is larger across food, check, table and payment UI."
echo " Cash opens with Cash received selected; keypad Exact is replaced by Next field."
echo " Cashier tip controls are Cash-only."
echo " Terminal tips are read-only and shown/stored only when the provider reports them."
echo " V45 post-move selection and V44/V43 move behavior remain preserved."
echo "=============================================================="
