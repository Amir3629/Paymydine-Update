#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin/$BRANCH"
FRONT_SERVICE="${PMD_FRONTEND_SERVICE:-paymydine-frontend-v2}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_vr_return_resume_r1_4_4_${STAMP}"
FRONT_STAGE="$STAGE/frontend-build"
BACKUP="/var/backups/pmd_vr_return_resume_r1_4_4_${STAMP}"
PATCH="scripts/patch-pmd-vr-return-resume-r1-4-4.py"
TARGET_REL="app/payment/return/PaymentReturnClient.tsx"
INSTALL_STARTED=0
FRONT_ACTIVATED=0

cd "$ROOT"
mkdir -p "$STAGE" "$FRONT_STAGE"
sudo mkdir -p "$BACKUP"

echo "============================================================"
echo " PAYMYDINE VR RETURN RESUME R1.4.4"
echo " VERIFY ON /payment/return | RESUME SAME TAB"
echo "============================================================"

git fetch origin "$BRANCH"
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

echo "========== DETECT LIVE FRONTEND V2 =========="
PM2_JSON="$(sudo -u ubuntu -H pm2 jlist 2>/dev/null || echo '[]')"
FRONT_ROOT="$(printf '%s' "$PM2_JSON" | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin)
name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("pm_cwd", "")))
        break
')"
FRONT_PORT="$(printf '%s' "$PM2_JSON" | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin)
name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        env=row.get("pm2_env", {}) or {}
        nested=env.get("env", {}) or {}
        value=env.get("PORT") or nested.get("PORT") or ""
        print(str(value))
        break
')"
case "$FRONT_PORT" in
  ''|*[!0-9]*) FRONT_PORT=3002 ;;
esac
LOCAL_HEALTH_URL="http://127.0.0.1:${FRONT_PORT}/api/health"

[ -n "$FRONT_ROOT" ] && [ -d "$FRONT_ROOT" ] || { echo "ERROR: PM2 frontend root not found"; exit 2; }
[ -f "$FRONT_ROOT/package.json" ] || { echo "ERROR: frontend package.json missing"; exit 3; }
[ -d "$FRONT_ROOT/node_modules" ] || { echo "ERROR: frontend node_modules missing"; exit 4; }
[ -f "$FRONT_ROOT/$TARGET_REL" ] || { echo "ERROR: PaymentReturnClient.tsx missing"; exit 5; }

echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "FRONTEND_ROOT=$FRONT_ROOT"
echo "FRONTEND_PORT=$FRONT_PORT"

echo "========== PRECHECK CURRENT RETURN AUTHORITY =========="
grep -Fq 'PayMyDine secure payment' "$FRONT_ROOT/$TARGET_REL" || { echo "ERROR: canonical payment return UI marker missing"; exit 6; }
grep -Fq 'verifyProviderPayment' "$FRONT_ROOT/$TARGET_REL" || { echo "ERROR: canonical provider verification authority missing"; exit 7; }
grep -Fq 'safeReturnPath' "$FRONT_ROOT/$TARGET_REL" || { echo "ERROR: safe return path authority missing"; exit 8; }
echo "RETURN_AUTHORITY=OK"

echo "========== STAGE LIVE RETURN CLIENT =========="
mkdir -p "$STAGE/$(dirname "$TARGET_REL")"
cp "$FRONT_ROOT/$TARGET_REL" "$STAGE/$TARGET_REL"
git show "$REMOTE:$PATCH" > "$STAGE/patch.py"
chmod 755 "$STAGE/patch.py"
python3 -m py_compile "$STAGE/patch.py"
python3 "$STAGE/patch.py" "$STAGE/$TARGET_REL"
grep -Fq 'PMD_VR_RETURN_RESUME_R1_4_4' "$STAGE/$TARGET_REL"
grep -Fq 'window.location.replace(returnTo)' "$STAGE/$TARGET_REL"
echo "STATIC_PREFLIGHT=OK"

echo "========== ISOLATED FRONTEND BUILD =========="
tar -C "$FRONT_ROOT" --exclude='./node_modules' --exclude='./.next' -cf - . | tar -C "$FRONT_STAGE" -xf -
ln -s "$FRONT_ROOT/node_modules" "$FRONT_STAGE/node_modules"
mkdir -p "$FRONT_STAGE/$(dirname "$TARGET_REL")"
cp "$STAGE/$TARGET_REL" "$FRONT_STAGE/$TARGET_REL"
sudo -u ubuntu -H env FRONT_STAGE="$FRONT_STAGE" bash -c '
  set -e
  cd "$FRONT_STAGE"
  npm run build -- --webpack
'
[ -d "$FRONT_STAGE/.next" ] || { echo "ERROR: frontend build produced no .next"; exit 9; }
grep -Rsl --binary-files=text 'PMD_VR_RETURN_RESUME_R1_4_4' "$FRONT_STAGE/.next" >/dev/null 2>&1 || { echo "ERROR: compiled frontend missing R1.4.4 marker"; exit 10; }
echo "FRONTEND_BUILD=OK"

echo "========== BACKUP =========="
sudo mkdir -p "$BACKUP/$(dirname "$TARGET_REL")"
sudo cp -a "$FRONT_ROOT/$TARGET_REL" "$BACKUP/$TARGET_REL"
if [ -d "$FRONT_ROOT/.next" ]; then
  sudo cp -a "$FRONT_ROOT/.next" "$BACKUP/frontend-next.previous"
fi
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! VR RETURN R1.4.4 FAILED - RESTORING !!!!!"
  sudo cp -a "$BACKUP/$TARGET_REL" "$FRONT_ROOT/$TARGET_REL" 2>/dev/null || true
  if [ "$FRONT_ACTIVATED" = "1" ]; then
    sudo rm -rf "$FRONT_ROOT/.next"
    if [ -d "$BACKUP/frontend-next.previous" ]; then
      sudo cp -a "$BACKUP/frontend-next.previous" "$FRONT_ROOT/.next"
      sudo chown -R ubuntu:ubuntu "$FRONT_ROOT/.next"
    fi
    sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env >/dev/null 2>&1 || true
  fi
  echo "RESTORED_FROM=$BACKUP"
  exit "$rc"
}
trap 'rc=$?; if [ "$INSTALL_STARTED" = "1" ] && [ "$rc" != "0" ]; then rollback "$rc"; fi' EXIT
INSTALL_STARTED=1

echo "========== INSTALL FRONTEND RETURN RESUME =========="
sudo install -o ubuntu -g ubuntu -m 0644 "$STAGE/$TARGET_REL" "$FRONT_ROOT/$TARGET_REL"
sudo rm -rf "$FRONT_ROOT/.next"
sudo mv "$FRONT_STAGE/.next" "$FRONT_ROOT/.next"
sudo chown -R ubuntu:ubuntu "$FRONT_ROOT/.next"
FRONT_ACTIVATED=1

echo "========== RESTART + HEALTH =========="
sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env
sleep 3
STATUS="$(sudo -u ubuntu -H pm2 jlist | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin); name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("status", ""))); break
')"
[ "$STATUS" = "online" ] || { echo "ERROR: frontend status=$STATUS"; exit 11; }
HTTP="$(curl -sS --max-time 10 -o "$STAGE/health.json" -w '%{http_code}' "$LOCAL_HEALTH_URL" || true)"
[ "$HTTP" = "200" ] || { echo "ERROR: local frontend health HTTP=$HTTP"; exit 12; }
grep -Fq 'PMD_VR_RETURN_RESUME_R1_4_4' "$FRONT_ROOT/$TARGET_REL"

echo "FRONTEND_STATUS=$STATUS"
echo "FRONTEND_LOCAL_HEALTH_HTTP=$HTTP"
echo "LIVE_MARKER=OK"

trap - EXIT

echo "============================================================"
echo " SUCCESS - VR RETURN RESUME R1.4.4 INSTALLED"
echo "============================================================"
echo "VR_LIGHTBOX=UNCHANGED"
echo "VR_PROVIDER_VERIFICATION=UNCHANGED"
echo "VR_SETTLEMENT_AUTHORITY=UNCHANGED"
echo "VR_SUCCESS_RETURN=VERIFY_THEN_SAME_TAB_RESUME"
echo "CSP=UNCHANGED_PROVIDER_OWNED_WARNING"
echo "REMOTE=$REMOTE_SHA"
echo "BACKUP=$BACKUP"
