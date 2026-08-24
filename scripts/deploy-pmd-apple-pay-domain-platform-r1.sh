#!/usr/bin/env bash
set -Eeuo pipefail

cd /var/www/paymydine

BRANCH="sumup-inline-widget-r1"
FRONTEND_SERVICE="paymydine-frontend-v2"
SOURCE_PATH="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/public/.well-known/apple-developer-merchantid-domain-association"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_apple_pay_domain_platform_r1_${STAMP}"
BACKUP="/var/backups/pmd_apple_pay_domain_platform_r1_${STAMP}"

mkdir -p "$STAGE" "$BACKUP"

echo "============================================================"
echo " PAYMYDINE APPLE PAY DOMAIN PLATFORM R1"
echo " ONE PUBLIC ASSOCIATION FILE FOR ALL PMD TENANT DOMAINS"
echo "============================================================"

git fetch origin "$BRANCH"
REMOTE="$(git rev-parse "origin/$BRANCH")"
echo "REMOTE=$REMOTE"

FRONTEND_ROOT="$(pm2 jlist | node -e '
let data="";
process.stdin.on("data", c => data += c);
process.stdin.on("end", () => {
  const rows = JSON.parse(data || "[]");
  const row = rows.find(x => x && x.name === "paymydine-frontend-v2");
  if (row && row.pm2_env && row.pm2_env.pm_cwd) process.stdout.write(String(row.pm2_env.pm_cwd));
});
')"

if [ -z "$FRONTEND_ROOT" ] || [ ! -d "$FRONTEND_ROOT" ]; then
  echo "ERROR: could not resolve live frontend-v2 root"
  exit 1
fi

echo "FRONTEND_ROOT=$FRONTEND_ROOT"

ASSOCIATION_REL="public/.well-known/apple-developer-merchantid-domain-association"
LIVE_FILE="$FRONTEND_ROOT/$ASSOCIATION_REL"
STAGED_FILE="$STAGE/apple-developer-merchantid-domain-association"

git show "origin/$BRANCH:$SOURCE_PATH" > "$STAGED_FILE"

if [ ! -s "$STAGED_FILE" ]; then
  echo "ERROR: staged Apple Pay association file is empty"
  exit 1
fi

SIZE="$(wc -c < "$STAGED_FILE" | tr -d ' ')"
if [ "$SIZE" -lt 1000 ]; then
  echo "ERROR: staged Apple Pay association file is unexpectedly small ($SIZE bytes)"
  exit 1
fi

STAGED_SHA="$(sha256sum "$STAGED_FILE" | awk '{print $1}')"
echo "ASSOCIATION_BYTES=$SIZE"
echo "ASSOCIATION_SHA256=$STAGED_SHA"

HAD_LIVE=0
if [ -f "$LIVE_FILE" ]; then
  HAD_LIVE=1
  mkdir -p "$BACKUP/public/.well-known"
  cp -a "$LIVE_FILE" "$BACKUP/public/.well-known/apple-developer-merchantid-domain-association"
fi

rollback() {
  set +e
  echo "!!!!! APPLE PAY DOMAIN PLATFORM R1 FAILED - RESTORING !!!!!"
  if [ "$HAD_LIVE" -eq 1 ]; then
    mkdir -p "$(dirname "$LIVE_FILE")"
    cp -a "$BACKUP/public/.well-known/apple-developer-merchantid-domain-association" "$LIVE_FILE"
  else
    rm -f "$LIVE_FILE"
  fi
  pm2 restart "$FRONTEND_SERVICE" >/dev/null 2>&1 || true
  echo "RESTORED_FROM=$BACKUP"
}
trap rollback ERR

mkdir -p "$(dirname "$LIVE_FILE")"
install -m 0644 "$STAGED_FILE" "$LIVE_FILE"

LIVE_SHA="$(sha256sum "$LIVE_FILE" | awk '{print $1}')"
if [ "$LIVE_SHA" != "$STAGED_SHA" ]; then
  echo "ERROR: live Apple Pay association file hash mismatch"
  exit 1
fi

echo "INSTALLED=$LIVE_FILE"

echo "========== RESTART ONLY FRONTEND V2 =========="
pm2 restart "$FRONTEND_SERVICE"
sleep 3

check_host() {
  local host="$1"
  local url="https://${host}/.well-known/apple-developer-merchantid-domain-association"
  local tmp="$STAGE/${host}.body"
  local code
  code="$(curl -sS -L --max-time 20 -o "$tmp" -w '%{http_code}' "$url")"
  echo "${host}_HTTP=$code"
  if [ "$code" != "200" ]; then
    return 1
  fi
  local remote_sha
  remote_sha="$(sha256sum "$tmp" | awk '{print $1}')"
  echo "${host}_SHA256=$remote_sha"
  if [ "$remote_sha" != "$STAGED_SHA" ]; then
    echo "ERROR: ${host} served different Apple Pay association bytes"
    return 1
  fi
}

# test2 is the known V2 staging authority and is the hard deployment gate.
check_host "test2.paymydine.com"

# a.paymydine.com is currently a user-created test tenant. Validate it when DNS/HTTPS is reachable,
# but do not make an unrelated DNS/certificate problem roll back the platform file for every tenant.
if getent ahosts a.paymydine.com >/dev/null 2>&1; then
  if check_host "a.paymydine.com"; then
    echo "A_TENANT_APPLE_FILE=verified"
  else
    echo "A_TENANT_APPLE_FILE=not_verified_yet"
  fi
else
  echo "A_TENANT_APPLE_FILE=dns_not_ready"
fi

trap - ERR

echo "============================================================"
echo " SUCCESS - APPLE PAY DOMAIN FILE IS PLATFORM-MANAGED"
echo "============================================================"
echo "APPLE_FILE_OWNER_UPLOAD=not_required"
echo "APPLE_FILE_SOURCE=PayMyDine_frontend_v2_public"
echo "APPLE_FILE_PATH=/.well-known/apple-developer-merchantid-domain-association"
echo "NEW_V2_TENANTS=inherit_automatically"
echo "NGINX_CONFIG=untouched"
echo "DATABASE_MIGRATIONS=none"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE"
