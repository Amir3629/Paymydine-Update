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
echo "PayMyDine — Complete Order Flow/Admin Runner V1"
echo "============================================================"

curl -fsSL --retry 3 --retry-delay 2 \
  "$REPO_RAW/$DEPLOY_COMMIT/tools/deploy-pmd-order-flow-admin-v1.sh" \
  -o "$DEPLOY"

curl -fsSL --retry 3 --retry-delay 2 \
  "$REPO_RAW/$REPAIR_COMMIT/tools/repair-mimoza-order-1976-tip-v1.php" \
  -o "$REPAIR"

bash -n "$DEPLOY"
php -l "$REPAIR" >/dev/null

echo "Runner payload syntax: PASSED"

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
