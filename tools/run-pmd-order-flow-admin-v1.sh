#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_COMMIT="6e5bd8e474fffefa75acf8a02e7e91be9cc81ab5"
REPAIR_COMMIT="9f1d2b99eca323b3abd7a1db0e21fe15c706ade8"
REPO_RAW="https://raw.githubusercontent.com/Amir3629/Paymydine-Update"
TMP="$(mktemp -d /tmp/pmd-order-flow-runner.XXXXXX)"

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

DEPLOY="$TMP/deploy.sh"
REPAIR="$TMP/repair-order-1976.php"

echo "============================================================"
echo "PayMyDine — Complete Order Flow/Admin Runner V1.2"
echo "============================================================"

curl -fsSL --retry 3 --retry-delay 2 \
  "$REPO_RAW/$DEPLOY_COMMIT/tools/deploy-pmd-order-flow-admin-v1.sh" \
  -o "$DEPLOY"

curl -fsSL --retry 3 --retry-delay 2 \
  "$REPO_RAW/$REPAIR_COMMIT/tools/repair-mimoza-order-1976-tip-v1.php" \
  -o "$REPAIR"

# Fix the reviewed payload's incorrect JS marker assertion.
OLD_ASSERT="grep -q 'PMD_ORDER_EDIT_POLISH_V1' \"\$TMP/direct/app/admin/assets/js/pmd-order-edit-polish-v1.js\""
NEW_ASSERT="grep -q 'window.PMDOrderEditPolishV1' \"\$TMP/direct/app/admin/assets/js/pmd-order-edit-polish-v1.js\""

ASSERT_COUNT="$(grep -Fxc "$OLD_ASSERT" "$DEPLOY" || true)"
if [ "$ASSERT_COUNT" -ne 1 ]; then
  echo "ERROR: Expected exactly one obsolete JS validation assertion; found $ASSERT_COUNT."
  echo "Nothing was executed."
  exit 1
fi

# The live pmd_admin_i18n partial has legitimate local changes, so the original
# line-context patch 09 cannot safely match. Remove only that patch entry and
# install the same loader idempotently against the live file after all other
# guarded patches have succeeded.
PATCH09_ENTRY='  "tools/pmd-order-flow-admin-v1/09-admin-order-edit-polish-loader.patch"'
PATCH09_COUNT="$(grep -Fxc "$PATCH09_ENTRY" "$DEPLOY" || true)"
if [ "$PATCH09_COUNT" -ne 1 ]; then
  echo "ERROR: Expected exactly one patch-09 array entry; found $PATCH09_COUNT."
  echo "Nothing was executed."
  exit 1
fi

INSERT_BEFORE='echo
echo "Validating installed markers..."'

python3 - "$DEPLOY" "$OLD_ASSERT" "$NEW_ASSERT" "$PATCH09_ENTRY" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
old_assert = sys.argv[2]
new_assert = sys.argv[3]
patch09_entry = sys.argv[4]
text = path.read_text()

if text.count(old_assert) != 1:
    raise SystemExit("deploy assertion replacement guard failed")
if text.count(patch09_entry) != 1:
    raise SystemExit("patch-09 removal guard failed")

text = text.replace(old_assert, new_assert, 1)
text = text.replace(patch09_entry + "\n", "", 1)

needle = 'echo\necho "Validating installed markers..."'
if text.count(needle) != 1:
    raise SystemExit("loader injection anchor guard failed")

injection = r'''echo
echo "Installing resilient Admin Order Edit polish loader..."
PMD_I18N="$ROOT/app/admin/views/_partials/pmd_admin_i18n.blade.php"
PMD_I18N_STAGE="$TMP/pmd_admin_i18n.with-order-edit-loader.blade.php"

test -f "$PMD_I18N" || {
  echo "ERROR: Admin i18n partial is missing: $PMD_I18N"
  exit 1
}

if grep -q 'PMD_ORDER_EDIT_POLISH_LOADER_V1' "$PMD_I18N"; then
  echo "SKIP   Admin Order Edit polish loader (already installed)"
else
  cat "$PMD_I18N" > "$PMD_I18N_STAGE"

  if grep -q 'pmd-order-edit-polish-v1.js' "$PMD_I18N_STAGE"; then
    printf '\n{{-- PMD_ORDER_EDIT_POLISH_LOADER_V1 --}}\n' >> "$PMD_I18N_STAGE"
    echo "MARK   Existing Admin Order Edit polish loader"
  else
    cat >> "$PMD_I18N_STAGE" <<'BLADE'

{{-- PMD_ORDER_EDIT_POLISH_LOADER_V1 --}}
@if (function_exists('request') && preg_match('#^admin/orders/edit/\d+$#', trim(request()->path(), '/')))
<script
    src="/app/admin/assets/js/pmd-order-edit-polish-v1.js?v={{ is_file(base_path('app/admin/assets/js/pmd-order-edit-polish-v1.js')) ? filemtime(base_path('app/admin/assets/js/pmd-order-edit-polish-v1.js')) : '1' }}"
    defer
></script>
@endif
BLADE
    echo "ADD    Admin Order Edit polish loader"
  fi

  PMD_UID="$(stat -c '%u' "$PMD_I18N")"
  PMD_GID="$(stat -c '%g' "$PMD_I18N")"
  PMD_MODE="$(stat -c '%a' "$PMD_I18N")"
  sudo install -o "$PMD_UID" -g "$PMD_GID" -m "$PMD_MODE" "$PMD_I18N_STAGE" "$PMD_I18N"
fi

echo
echo "Validating installed markers..."'''

text = text.replace(needle, injection, 1)
path.write_text(text)
PY

bash -n "$DEPLOY"
php -l "$REPAIR" >/dev/null

grep -q "window.PMDOrderEditPolishV1" "$DEPLOY"
! grep -q "grep -q 'PMD_ORDER_EDIT_POLISH_V1'" "$DEPLOY"
! grep -Fq "$PATCH09_ENTRY" "$DEPLOY"
grep -q 'Installing resilient Admin Order Edit polish loader' "$DEPLOY"

echo "Runner payload syntax: PASSED"
echo "Incorrect JS marker assertion: CORRECTED"
echo "Divergent Admin loader patch: REPLACED WITH IDEMPOTENT INSTALL"

echo
echo "Step 1/2 — deploying guarded source fixes..."
bash "$DEPLOY"

echo
echo "Step 2/2 — repairing the known missing breakdown on order 1976..."
if php "$REPAIR"; then
  echo "Order 1976 repair: PASSED"
else
  echo "WARNING: Source deployment succeeded, but order 1976 did not match the strict repair guards."
  echo "No unguarded database change was made."
  exit 2
fi

echo
echo "============================================================"
echo "COMPLETE RUN FINISHED"
echo "============================================================"
echo "Source fixes: DEPLOYED"
echo "Frontend build: DEPLOYED"
echo "Admin caches: CLEARED"
echo "Order 1976 canonical tip/total: VERIFIED OR REPAIRED"
