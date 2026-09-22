#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-fix/quick-pos-table-attention-v58}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v58.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-table-attention-v58-$STAMP"
DONE=0

FILES=(
  "app/admin/controllers/PmdQuickPosV1.php"
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
echo " PayMyDine QUICK POS V58 - INTEGRATED V56 + V57"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== REQUIRE STABLE PRE-V56 STACK ====="
grep -Fq "PMD_QPOS_ROUTE_STACK_SAFE_V55" "$ROOT/routes/admin-quick-mode.php"
grep -Fq "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "PMD_QPOS_HISTORY_TABLE_RAIL_RIGHT_V51" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
echo "OK V51/V52/V55 live base detected"

echo
echo "===== STAGE INTEGRATED V58 ====="
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
echo "OK all four V58 targets are writable"

echo
echo "===== V56 PAYMENT AUTHORITY CONTRACT - LITERAL ====="
CTRL="$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -Fq "PMD_QPOS_RAW_PAYMENT_AUTHORITY_V56" "$CTRL"
grep -Fq 'use Admin\Classes\PermissionManager;' "$CTRL"
grep -Fq 'getPermissions()' "$CTRL"
grep -Fq 'PermissionManager::instance()' "$CTRL"

V56_BLOCK="$(sed -n '/PMD_QPOS_RAW_PAYMENT_AUTHORITY_V56/,/return false;/p' "$CTRL")"
if printf '%s\n' "$V56_BLOCK" | grep -Fq -- '->hasPermission('; then
  echo "ERROR: route-aware hasPermission() remains inside V56 authority." >&2
  exit 1
fi

grep -Fq "PMD_QPOS_PAYMENT_AUTHORITY_V50" "$CTRL"
grep -Fq "PMD_QPOS_RESERVATION_BUSY_V53" "$CTRL"
echo "OK V56 raw payment authority is staged correctly"

echo
echo "===== V57 TABLE / ATTENTION CONTRACT ====="
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"

grep -Fq "PMD_QPOS_TABLE_SIGNAL_RULES_V57" "$VIEW"
grep -Fq "PMD_QPOS_PUSH_NOTIFICATIONS_V57" "$VIEW"
grep -Fq "PMD_QPOS_TABLE_ATTENTION_V57" "$CSS"
grep -Fq "PMD_QPOS_TABLE_ATTENTION_V57" "$JS"
grep -Fq "PMD_QPOS_PAYMENT_ICON_RULE_V57" "$JS"
grep -Fq "PMD_QPOS_GUIDE_AUTO_CLOSE_V57" "$JS"
grep -Fq "pmd:notification:new" "$JS"
grep -Fq "openTableAttentionV57" "$JS"
grep -Fq "cycleAttentionTablesV57" "$JS"

if grep -Fq '<span><b>€</b> Due</span>' "$VIEW"; then
  echo "ERROR: Due icon is still present in the Guide." >&2
  exit 1
fi

if grep -Fq "signals.push({kind: 'due'" "$JS"; then
  echo "ERROR: Due icon is still present in dynamic table rendering." >&2
  exit 1
fi

if grep -Fq "'<small>' + esc(tableStatusLabel(table.status))" "$JS"; then
  echo "ERROR: Busy/Free text renderer is still present on table cards." >&2
  exit 1
fi

grep -Fq "pmd-quick-pos-v1.css?v=20260922-57" "$VIEW"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-57" "$VIEW"
grep -Fq "push-notifications.js?v=20260922-qpos-v57" "$VIEW"
echo "OK V57 UI contract staged: color-only status, no Due icon, attention UX active"

echo
echo "===== PRESERVE LATEST MAIN / QUICK POS STACK ====="
grep -Fq "PMD_QPOS_ANDROID_LANDSCAPE_VIEWPORT_V47" "$CSS"
grep -Fq "PMD_QPOS_ANDROID_TOUCH_RAIL_FIT_V49" "$CSS"
grep -Fq "PMD_QPOS_POST_MOVE_SELECTION_FIX_V45" "$JS"
grep -Fq "PMD_QPOS_LAYOUT_PAY_TYPE_V49" "$CSS"
grep -Fq "PMD_QPOS_PAY_BACKEND_AUTHORITY_V50" "$JS"
grep -Fq "PMD_QPOS_HISTORY_TABLE_RAIL_RIGHT_V51" "$CSS"
grep -Fq "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$JS"
grep -Fq "PMD_QPOS_RESERVATION_BUSY_INLINE_OVERRIDE_V54" "$VIEW"
echo "OK latest main + V45-V55 UI behavior preserved"

echo
echo "===== SYNTAX CHECK ====="
php -l "$CTRL"
if command -v node >/dev/null 2>&1; then
  node --check "$JS"
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
echo "===== DEPLOY V58 ====="
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
grep -Fq "PMD_QPOS_RAW_PAYMENT_AUTHORITY_V56" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -Fq "PMD_QPOS_TABLE_SIGNAL_RULES_V57" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -Fq "PMD_QPOS_TABLE_ATTENTION_V57" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -Fq "PMD_QPOS_TABLE_ATTENTION_V57" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-57" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DONE=1

echo
echo "=============================================================="
echo " QUICK POS V58 DEPLOY COMPLETE"
echo " V56 payment authority deployed as part of this patch."
echo " Busy/Free text removed from table cards; table color remains status authority."
echo " Due icon removed. Part paid (½) and Paid (✓) remain."
echo " Waiter Call / Note tables pulse and rotate smoothly into view."
echo " Clicking ! opens Calls for that table; clicking N opens Notes."
echo " Canonical Admin push notification stream is loaded on Quick POS."
echo " Guide closes on the next click/tap anywhere away from its info toggle."
echo " No sudo was used."
echo " Backup: $BACKUP"
echo "=============================================================="
