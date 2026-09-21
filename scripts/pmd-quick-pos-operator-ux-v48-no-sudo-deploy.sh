#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-fix/quick-pos-operator-ux-v48-no-sudo}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v48.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-operator-ux-v48-$STAMP"
DEPLOY_COMPLETE=0

FILES=(
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/Services/TerminalPayments/TerminalPaymentService.php"
  "app/Services/TerminalPayments/SquareTerminalProvider.php"
  "app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php"
)

cleanup() {
  rm -rf "$STAGE" >/dev/null 2>&1 || true
}

rollback() {
  [ "$DEPLOY_COMPLETE" -eq 0 ] || return 0
  [ -d "$BACKUP" ] || return 0

  echo
  echo "===== ROLLBACK ====="
  set +e
  for file in "${FILES[@]}"; do
    if [ -f "$BACKUP/$file" ]; then
      cp "$BACKUP/$file" "$ROOT/$file"
      if cmp -s "$BACKUP/$file" "$ROOT/$file"; then
        echo "RESTORED $file"
      else
        echo "ROLLBACK ERROR $file" >&2
      fi
    fi
  done
  set -e
}

on_exit() {
  local status="$1"
  trap - EXIT
  if [ "$status" -ne 0 ]; then
    rollback
  fi
  cleanup
  exit "$status"
}
trap 'on_exit $?' EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine QUICK POS OPERATOR UX V48 - NO SUDO"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== STAGE V48 FILES ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$REF:$file" > "$STAGE/$file"
  test -s "$STAGE/$file"
  echo "STAGED $file"
done

echo
echo "===== NO-SUDO PERMISSION GUARD ====="
for file in "${FILES[@]}"; do
  if [ ! -w "$ROOT/$file" ]; then
    echo "ERROR: target is not writable by $(id -un): $file" >&2
    stat -c '%U:%G %a %n' "$ROOT/$file" >&2 || true
    echo "Nothing was deployed." >&2
    exit 1
  fi
done
echo "OK all V48 target files are writable; sudo is not used"

echo
echo "===== PROTECTED SQUARE RUNTIME GUARD ====="
SQUARE_RUNTIME="app/Services/Payments/SquareRuntimeService.php"
EXPECTED_SQUARE_RUNTIME_BLOB="098f26e15ff334239964035f15f4e189c2e7e587"
LIVE_SQUARE_RUNTIME_BLOB="$(git hash-object "$ROOT/$SQUARE_RUNTIME")"
if [ "$LIVE_SQUARE_RUNTIME_BLOB" != "$EXPECTED_SQUARE_RUNTIME_BLOB" ]; then
  echo "ERROR: protected SquareRuntimeService.php differs from expected live base." >&2
  echo "Expected: $EXPECTED_SQUARE_RUNTIME_BLOB" >&2
  echo "Live:     $LIVE_SQUARE_RUNTIME_BLOB" >&2
  echo "Nothing was deployed." >&2
  exit 1
fi
echo "OK protected root-owned SquareRuntimeService.php is unchanged and will NOT be touched"

echo
echo "===== V48 FEATURE CONTRACT ====="
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
grep -q "pmd-quick-pos-v1.css?v=20260921-48" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260921-48" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_SQUARE_TERMINAL_TIP_V48" "$STAGE/app/Services/TerminalPayments/SquareTerminalProvider.php"
grep -q "PMD_SQUARE_TERMINAL_TIP_CAPTURE_V48" "$STAGE/app/Services/TerminalPayments/SquareTerminalProvider.php"
grep -q "'allow_tipping' => true" "$STAGE/app/Services/TerminalPayments/SquareTerminalProvider.php"
echo "OK V48 operator UX and terminal tipping contract present"

echo
echo "===== DUPLICATE EXACT GUARD ====="
if grep -q "data-qpos-keypad-exact" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"; then
  echo "ERROR: duplicate keypad Exact control exists" >&2
  exit 1
fi
grep -q "data-qpos-keypad-next" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK duplicate keypad Exact removed; Next-field present"

echo
echo "===== PRESERVE V39-V45 + PERFORMANCE ====="
grep -q "PMD_QPOS_GUIDE_POPOVER_V39" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_QPOS_CLEANING_LEFT_LOCK_V40" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_IMMEDIATE_TABLE_TAP_V42" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_DIRECT_MOVE_NO_BOOTSTRAP_V43" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_OPTIMISTIC_WHOLE_TABLE_MOVE_V44" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_POST_MOVE_SELECTION_FIX_V45" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q 'PMD_PERF_R20_WRITE_ONLY_SHIFT_AUDIT_CONTEXT' "$ROOT/app/admin/middleware/LogUserLastSeen.php"
grep -q 'PMD_PERF_R19_FLOOR_BOOTSTRAP_MICROCACHE' "$ROOT/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS' "$ROOT/app/admin/Services/PmdSharedFloorRegistryV1.php"
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA' "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi
echo "OK V39-V45 and R17-R20 preserved"

echo
echo "===== SYNTAX CHECK ====="
php -l "$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php"
php -l "$STAGE/app/Services/TerminalPayments/SquareTerminalProvider.php"
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
echo "===== DEPLOY V48 ====="
for file in "${FILES[@]}"; do
  cp "$STAGE/$file" "$ROOT/$file"
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
grep -q "PMD_SQUARE_TERMINAL_TIP_V48" "$ROOT/app/Services/TerminalPayments/SquareTerminalProvider.php"
grep -q "'allow_tipping' => true" "$ROOT/app/Services/TerminalPayments/SquareTerminalProvider.php"
grep -q "PMD_QPOS_TERMINAL_TIP_RESPONSE_V46" "$ROOT/app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php"
grep -q "pmd-quick-pos-v1.js?v=20260921-48" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS OPERATOR UX V48 DEPLOY COMPLETE"
echo " No sudo was used."
echo " Root-owned SquareRuntimeService.php was not touched."
echo " Check is left; tables are right; menu has more width."
echo " Cleaning replaces Left."
echo " Map-selected table returns already in the visible rail."
echo " Typography is larger across Quick POS."
echo " Cash received auto-focuses; keypad Exact is replaced by Next."
echo " Cash tip controls remain Cash-only."
echo " Square Terminal now lets the customer choose the tip on-device."
echo " Provider-reported terminal tip is stored and shown read-only in POS."
echo " V39-V45 and R17-R20 remain preserved."
echo " Backup: $BACKUP"
echo "=============================================================="
