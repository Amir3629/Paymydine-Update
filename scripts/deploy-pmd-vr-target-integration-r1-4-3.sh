#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin/$BRANCH"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_vr_target_integration_r1_4_3_${STAMP}"
BACKUP="/var/backups/pmd_vr_target_integration_r1_4_3_${STAMP}"
PATCH="scripts/patch-pmd-vr-target-integration-r1-4-3.py"
CLIENT_REL="app/Services/Payments/VrPaymentApiClient.php"
SERVICE_REL="app/admin/classes/VRPaymentGatewayService.php"
INSTALL_STARTED=0

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP"

echo "============================================================"
echo " PAYMYDINE VR TARGET INTEGRATION R1.4.3"
echo " LIGHTBOX-FIRST METHOD DISCOVERY | NO SILENT REDIRECT"
echo "============================================================"

git fetch origin "$BRANCH"
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

echo "========== PRECHECK LIVE R1.4.2 =========="
for rel in "$CLIENT_REL" "$SERVICE_REL"; do
  [ -f "$ROOT/$rel" ] || { echo "ERROR: live file missing: $rel"; exit 2; }
done
grep -Fq 'PMD_VR_LIGHTBOX_CHECKOUT_R1_4' "$ROOT/$SERVICE_REL" || { echo "ERROR: R1.4 Lightbox service marker missing"; exit 3; }
grep -Fq 'PMD_VR_LIGHTBOX_METHOD_ID_MATCH_R1_4_2' "$ROOT/$SERVICE_REL" || { echo "ERROR: R1.4.2 method marker missing"; exit 4; }
echo "R1_4_2_LIVE_CONTRACT=OK"

echo "========== STAGE LIVE AUTHORITIES =========="
for rel in "$CLIENT_REL" "$SERVICE_REL"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  cp "$ROOT/$rel" "$STAGE/$rel"
done
git show "$REMOTE:$PATCH" > "$STAGE/patch.py"
chmod 755 "$STAGE/patch.py"
python3 -m py_compile "$STAGE/patch.py"
python3 "$STAGE/patch.py" "$STAGE/$CLIENT_REL" "$STAGE/$SERVICE_REL"

echo "========== STATIC PREFLIGHT =========="
php -l "$STAGE/$CLIENT_REL"
php -l "$STAGE/$SERVICE_REL"
grep -Fq 'PMD_VR_AVAILABLE_METHOD_EXPAND_R1_4_3' "$STAGE/$CLIENT_REL"
grep -Fq 'PMD_VR_TARGET_MODE_SELECTION_R1_4_3' "$STAGE/$SERVICE_REL"
grep -Fq 'PMD_VR_CONFIG_ID_INTERSECTION_R1_4_3' "$STAGE/$SERVICE_REL"
grep -Fq 'PMD_VR_LIGHTBOX_NO_REDIRECT_R1_4_3' "$STAGE/$SERVICE_REL"
echo "STATIC_PREFLIGHT=OK"

echo "========== BACKUP =========="
for rel in "$CLIENT_REL" "$SERVICE_REL"; do
  sudo mkdir -p "$BACKUP/$(dirname "$rel")"
  sudo cp -a "$ROOT/$rel" "$BACKUP/$rel"
done
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! VR R1.4.3 FAILED - RESTORING !!!!!"
  for rel in "$CLIENT_REL" "$SERVICE_REL"; do
    sudo cp -a "$BACKUP/$rel" "$ROOT/$rel" 2>/dev/null || true
  done
  sudo -u www-data php artisan optimize:clear >/dev/null 2>&1 || true
  echo "RESTORED_FROM=$BACKUP"
  exit "$rc"
}
trap 'rc=$?; if [ "$INSTALL_STARTED" = "1" ] && [ "$rc" != "0" ]; then rollback "$rc"; fi' EXIT
INSTALL_STARTED=1

echo "========== INSTALL R1.4.3 =========="
sudo install -m 0644 "$STAGE/$CLIENT_REL" "$ROOT/$CLIENT_REL"
sudo install -m 0644 "$STAGE/$SERVICE_REL" "$ROOT/$SERVICE_REL"
php -l "$ROOT/$CLIENT_REL"
php -l "$ROOT/$SERVICE_REL"
sudo -u www-data php artisan optimize:clear || true

echo "========== LIVE MARKERS =========="
grep -Fq 'PMD_VR_AVAILABLE_METHOD_EXPAND_R1_4_3' "$ROOT/$CLIENT_REL"
grep -Fq 'PMD_VR_TARGET_MODE_SELECTION_R1_4_3' "$ROOT/$SERVICE_REL"
grep -Fq 'PMD_VR_CONFIG_ID_INTERSECTION_R1_4_3' "$ROOT/$SERVICE_REL"
grep -Fq 'PMD_VR_LIGHTBOX_NO_REDIRECT_R1_4_3' "$ROOT/$SERVICE_REL"
echo "LIVE_MARKERS=OK"

trap - EXIT
echo "============================================================"
echo " SUCCESS - VR TARGET INTEGRATION R1.4.3 INSTALLED"
echo "============================================================"
echo "VR_METHOD_DISCOVERY=REQUESTED_INTEGRATION_MODE_FIRST"
echo "VR_METHOD_MATCH=CATALOGUE_ID_INTERSECTION"
echo "VR_CARD=LIGHTBOX_ONLY_FOR_FRONTEND_V2"
echo "VR_WERO=LIGHTBOX_ONLY_FOR_FRONTEND_V2"
echo "VR_HOSTED_PAGE=LEGACY_CALLERS_ONLY"
echo "REMOTE=$REMOTE_SHA"
echo "BACKUP=$BACKUP"
