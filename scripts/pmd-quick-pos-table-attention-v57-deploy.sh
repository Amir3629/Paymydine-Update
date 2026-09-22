#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-feat/quick-pos-table-attention-v57}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v57.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-table-attention-v57-$STAMP"
DONE=0

FILES=(
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
)

cleanup() { rm -rf "$STAGE" >/dev/null 2>&1 || true; }

rollback() {
  [ "$DONE" -eq 0 ] || return 0
  [ -d "$BACKUP" ] || return 0
  echo
  echo "===== ROLLBACK ====="
  set +e
  for file in "${FILES[@]}"; do
    if [ -f "$BACKUP/$file" ]; then
      cp "$BACKUP/$file" "$ROOT/$file"
      cmp -s "$BACKUP/$file" "$ROOT/$file" && echo "RESTORED $file"
    fi
  done
  set -e
}

on_exit() {
  status="$1"
  trap - EXIT
  [ "$status" -eq 0 ] || rollback
  cleanup
  exit "$status"
}
trap 'on_exit $?' EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine QUICK POS V57 - TABLE ATTENTION UX"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== REQUIRE LIVE V56/V55/V52/V51 ====="
grep -q "PMD_QPOS_RAW_PAYMENT_AUTHORITY_V56" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_ROUTE_STACK_SAFE_V55" "$ROOT/routes/admin-quick-mode.php"
grep -q "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_HISTORY_TABLE_RAIL_RIGHT_V51" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
echo "OK V51-V56 stack is live"

echo
echo "===== STAGE V57 UI FILES ONLY ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$REF:$file" > "$STAGE/$file"
  test -s "$STAGE/$file"
  echo "STAGED $file"
done

echo
echo "===== WRITABLE CHECK - NO SUDO ====="
for file in "${FILES[@]}"; do
  if [ ! -w "$ROOT/$file" ]; then
    echo "ERROR: not writable: $file" >&2
    stat -c '%U:%G %a %n' "$ROOT/$file" >&2 || true
    echo "Nothing was deployed." >&2
    exit 1
  fi
done
echo "OK all V57 targets writable"

echo
echo "===== V57 TABLE CONTRACT ====="
grep -q "PMD_QPOS_TABLE_ATTENTION_V57" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_TABLE_ATTENTION_V57" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_TABLE_SIGNAL_RULES_V57" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_QPOS_PAYMENT_ICON_RULE_V57" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "data-qpos-attention-kind" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
if grep -Fq "signals.push({kind: 'due'" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"; then
  echo "ERROR: Due payment icon still exists in dynamic table renderer." >&2
  exit 1
fi
if grep -Fq '<span><b>€</b> Due</span>' "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"; then
  echo "ERROR: Due icon still exists in Guide." >&2
  exit 1
fi
echo "OK table status is color-first; Due icon removed; Part paid/Paid preserved"

echo
echo "===== V57 ATTENTION / PUSH CONTRACT ====="
grep -q "PMD_QPOS_PUSH_NOTIFICATIONS_V57" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "push-notifications.js?v=20260922-qpos-v57" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd:notification:new" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "cycleAttentionTablesV57" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "openTableAttentionV57" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_GUIDE_AUTO_CLOSE_V57" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
echo "OK existing push stream + pulse + smooth attention rail + clickable detail are connected"

echo
echo "===== CACHE + LATEST MAIN UI GUARD ====="
grep -q "pmd-quick-pos-v1.css?v=20260922-57" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260922-57" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_QPOS_ANDROID_LANDSCAPE_VIEWPORT_V47" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_ANDROID_TOUCH_RAIL_FIT_V49" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
echo "OK V57 cache-bust and latest Android/main UI fixes preserved"

echo
echo "===== PRESERVE QUICK POS STACK ====="
grep -q "PMD_QPOS_POST_MOVE_SELECTION_FIX_V45" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_OPERATOR_UX_V46" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_LAYOUT_PAY_TYPE_V49" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_PAY_BACKEND_AUTHORITY_V50" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_HISTORY_TABLE_RAIL_RIGHT_V51" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_RESERVATION_BUSY_INLINE_OVERRIDE_V54" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK V45-V55 UI behavior preserved"

echo
echo "===== PERFORMANCE GUARD ====="
grep -q 'PMD_PERF_R20_WRITE_ONLY_SHIFT_AUDIT_CONTEXT' "$ROOT/app/admin/middleware/LogUserLastSeen.php"
grep -q 'PMD_PERF_R19_FLOOR_BOOTSTRAP_MICROCACHE' "$ROOT/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS' "$ROOT/app/admin/Services/PmdSharedFloorRegistryV1.php"
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA' "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi
echo "OK R17-R20 preserved"

echo
echo "===== JS SYNTAX CHECK ====="
if command -v node >/dev/null 2>&1; then
  node --check "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
else
  echo "WARN node not available; skipping node --check"
fi

echo
echo "===== BACKUP ====="
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$ROOT/$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done

echo
echo "===== DEPLOY V57 ====="
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
grep -q "PMD_QPOS_TABLE_ATTENTION_V57" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_TABLE_ATTENTION_V57" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_PUSH_NOTIFICATIONS_V57" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260922-57" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DONE=1

echo
echo "=============================================================="
echo " QUICK POS V57 DEPLOY COMPLETE"
echo " Table cards no longer print Free/Busy status text; color remains authoritative."
echo " Due has no payment icon; Part paid and Paid still have payment icons."
echo " Waiter Call / Note tables pulse for attention."
echo " The right table rail smoothly rotates to attention tables every 7 seconds."
echo " Manual rail use pauses auto-attention scrolling for 8 seconds."
echo " Clicking ! opens Calls history for that table; clicking N opens Notes history."
echo " Canonical PayMyDine push notifications are reused; no second poller was added."
echo " Guide closes on the next click/tap anywhere outside its info toggle."
echo " V56 payment authority and V51-V55 behavior remain untouched."
echo " No sudo was used."
echo " Backup: $BACKUP"
echo "=============================================================="
