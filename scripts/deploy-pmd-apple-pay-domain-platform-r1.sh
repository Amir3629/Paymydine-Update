#!/usr/bin/env bash
set -Eeuo pipefail

cd /var/www/paymydine

BRANCH="sumup-inline-widget-r1"
FRONTEND_SERVICE="paymydine-frontend-v2"
ROUTE_REL="app/.well-known/apple-developer-merchantid-domain-association/route.ts"
SOURCE_PATH="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/${ROUTE_REL}"
EXPECTED_ASSOCIATION_SHA256="8a333e6c0f02b6d3639325da1096b0ee1b4dbde4d33422441203eeb5c8c10735"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_apple_pay_domain_platform_r1_${STAMP}"
BACKUP="/var/backups/pmd_apple_pay_domain_platform_r1_${STAMP}"

mkdir -p "$STAGE" "$BACKUP"

echo "============================================================"
echo " PAYMYDINE APPLE PAY DOMAIN PLATFORM R1"
echo " ONE PLATFORM ROUTE FOR ALL PMD V2 TENANT DOMAINS"
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

STAGED_ROUTE="$STAGE/route.ts"
git show "origin/$BRANCH:$SOURCE_PATH" > "$STAGED_ROUTE"

if [ ! -s "$STAGED_ROUTE" ]; then
  echo "ERROR: staged Apple Pay route is empty"
  exit 1
fi

DECODED_SHA="$(node - "$STAGED_ROUTE" <<'NODE'
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');
const path = process.argv[2];
const src = fs.readFileSync(path, 'utf8');
const match = src.match(/ASSOCIATION_GZIP_BASE64\s*=\s*'([^']+)'/);
if (!match) process.exit(12);
const body = zlib.gunzipSync(Buffer.from(match[1], 'base64'));
process.stdout.write(crypto.createHash('sha256').update(body).digest('hex'));
NODE
)"

if [ "$DECODED_SHA" != "$EXPECTED_ASSOCIATION_SHA256" ]; then
  echo "ERROR: embedded Apple association file hash mismatch"
  echo "EXPECTED=$EXPECTED_ASSOCIATION_SHA256"
  echo "ACTUAL=$DECODED_SHA"
  exit 1
fi

echo "APPLE_ASSOCIATION_PAYLOAD_SHA256=$DECODED_SHA"
echo "APPLE_ROUTE_PAYLOAD=EXACT"

FRONTEND_STAGE="$STAGE/frontend-v2"
mkdir -p "$FRONTEND_STAGE"
rsync -a --delete --exclude='.next' --exclude='node_modules' "$FRONTEND_ROOT/" "$FRONTEND_STAGE/"
ln -s "$FRONTEND_ROOT/node_modules" "$FRONTEND_STAGE/node_modules"
mkdir -p "$FRONTEND_STAGE/$(dirname "$ROUTE_REL")"
cp "$STAGED_ROUTE" "$FRONTEND_STAGE/$ROUTE_REL"

if grep -R --fixed-strings "apple-developer-merchantid-domain-association" "$FRONTEND_STAGE/app" >/dev/null; then
  echo "APPLE_ROUTE_SOURCE=present"
else
  echo "ERROR: Apple domain route missing from staged frontend"
  exit 1
fi

echo "========== ISOLATED FRONTEND V2 BUILD =========="
(
  cd "$FRONTEND_STAGE"
  npm run build -- --webpack
)
echo "FRONTEND_BUILD=OK"

if ! find "$FRONTEND_STAGE/.next" -type f -maxdepth 8 -print0 | xargs -0 grep -l --fixed-strings "apple-pay-domain-platform-r1" >/dev/null 2>&1; then
  echo "ERROR: built Next output does not contain Apple domain authority marker"
  exit 1
fi

echo "BUILT_APPLE_ROUTE=present"

LIVE_ROUTE="$FRONTEND_ROOT/$ROUTE_REL"
HAD_LIVE_ROUTE=0
if [ -f "$LIVE_ROUTE" ]; then
  HAD_LIVE_ROUTE=1
  mkdir -p "$BACKUP/$(dirname "$ROUTE_REL")"
  cp -a "$LIVE_ROUTE" "$BACKUP/$ROUTE_REL"
fi

if [ -d "$FRONTEND_ROOT/.next" ]; then
  cp -a "$FRONTEND_ROOT/.next" "$BACKUP/.next"
fi

rollback() {
  set +e
  echo "!!!!! APPLE PAY DOMAIN PLATFORM R1 FAILED - RESTORING !!!!!"
  if [ "$HAD_LIVE_ROUTE" -eq 1 ]; then
    mkdir -p "$(dirname "$LIVE_ROUTE")"
    cp -a "$BACKUP/$ROUTE_REL" "$LIVE_ROUTE"
  else
    rm -f "$LIVE_ROUTE"
  fi
  if [ -d "$BACKUP/.next" ]; then
    rm -rf "$FRONTEND_ROOT/.next"
    cp -a "$BACKUP/.next" "$FRONTEND_ROOT/.next"
  fi
  pm2 restart "$FRONTEND_SERVICE" >/dev/null 2>&1 || true
  echo "RESTORED_FROM=$BACKUP"
}
trap rollback ERR

mkdir -p "$(dirname "$LIVE_ROUTE")"
install -m 0644 "$STAGED_ROUTE" "$LIVE_ROUTE"
rm -rf "$FRONTEND_ROOT/.next"
cp -a "$FRONTEND_STAGE/.next" "$FRONTEND_ROOT/.next"

echo "INSTALLED_ROUTE=$LIVE_ROUTE"

echo "========== RESTART ONLY FRONTEND V2 =========="
pm2 restart "$FRONTEND_SERVICE"
sleep 3

check_host() {
  local host="$1"
  local url="https://${host}/.well-known/apple-developer-merchantid-domain-association"
  local tmp="$STAGE/${host}.body"
  local headers="$STAGE/${host}.headers"
  local code
  code="$(curl -sS --max-time 20 -D "$headers" -o "$tmp" -w '%{http_code}' "$url")"
  echo "${host}_HTTP=$code"
  if [ "$code" != "200" ]; then
    return 1
  fi
  local remote_sha
  remote_sha="$(sha256sum "$tmp" | awk '{print $1}')"
  echo "${host}_SHA256=$remote_sha"
  if [ "$remote_sha" != "$EXPECTED_ASSOCIATION_SHA256" ]; then
    echo "ERROR: ${host} served different Apple Pay association bytes"
    return 1
  fi
  if ! grep -qi '^X-PMD-Wallet-Authority: apple-pay-domain-platform-r1' "$headers"; then
    echo "ERROR: ${host} did not serve the PMD Apple domain authority route"
    return 1
  fi
}

# Known active V2 tenant: hard deployment gate.
check_host "test2.paymydine.com"

# Current new test tenant. Its DNS/TLS readiness must not undo a valid platform deployment.
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
echo " SUCCESS - APPLE PAY DOMAIN VERIFICATION IS PLATFORM-MANAGED"
echo "============================================================"
echo "APPLE_FILE_OWNER_UPLOAD=not_required"
echo "APPLE_ROUTE=/.well-known/apple-developer-merchantid-domain-association"
echo "APPLE_ASSOCIATION_SHA256=$EXPECTED_ASSOCIATION_SHA256"
echo "NEW_V2_TENANTS=inherit_automatically"
echo "NGINX_CONFIG=untouched"
echo "DATABASE_MIGRATIONS=none"
echo "FRONTEND_SERVICE=$FRONTEND_SERVICE"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE"
