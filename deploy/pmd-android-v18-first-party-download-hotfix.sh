#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_HOST="${PMD_HOST:-}"
APK_NAME="PayMyDine-Android-0.3.3.apk"
RELEASE_NAME="PayMyDine-POS-Tablet-Preview-0.3.3.apk"
EXPECTED_SHA256="77c36e65c458a8b26c53f7802cf1c94e3eb08bc19ab088c3e542f993d80fb83a"
RELEASE_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${RELEASE_NAME}"

log(){ printf '\n[PMD V18.1 DOWNLOAD FIX] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.1 DOWNLOAD FIX][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT" ]] || fail "PayMyDine root missing: $PMD_ROOT"
[[ -f "$PMD_ROOT/index.php" ]] || fail "TastyIgniter entrypoint missing: $PMD_ROOT/index.php"

for cmd in curl sha256sum stat; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

SOURCE_PUBLIC="$PMD_ROOT/public/downloads/paymydine/$APK_NAME"
WEB_DIR="$PMD_ROOT/downloads/paymydine"
WEB_APK="$WEB_DIR/$APK_NAME"
WEB_SHA="$WEB_APK.sha256"
TMP_DIR="$PMD_ROOT/storage/pmd-v18-download-fix"
mkdir -p "$TMP_DIR" "$WEB_DIR"

if [[ -f "$SOURCE_PUBLIC" ]]; then
  log "Using the already verified V18 APK from the old public/ location."
  SOURCE="$SOURCE_PUBLIC"
else
  log "Old V18 APK copy not found; downloading immutable 0.3.3 release."
  SOURCE="$TMP_DIR/$RELEASE_NAME"
  curl -fL --retry 3 --retry-delay 2 "$RELEASE_URL" -o "$SOURCE"
fi

ACTUAL="$(sha256sum "$SOURCE" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
[[ "$ACTUAL" == "$EXPECTED_SHA256" ]] \
  || fail "Source APK hash mismatch: expected=$EXPECTED_SHA256 actual=$ACTUAL"

uid="$(stat -c '%u' "$PMD_ROOT")"
gid="$(stat -c '%g' "$PMD_ROOT")"

tmp="$WEB_APK.pmd-v181-new"
cp -f "$SOURCE" "$tmp"
chmod 0644 "$tmp"
chown "$uid:$gid" "$tmp" 2>/dev/null || true
mv -f "$tmp" "$WEB_APK"

printf '%s  %s\n' "$EXPECTED_SHA256" "$APK_NAME" > "$WEB_SHA"
chmod 0644 "$WEB_SHA"
chown "$uid:$gid" "$WEB_SHA" 2>/dev/null || true

INSTALLED="$(sha256sum "$WEB_APK" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
[[ "$INSTALLED" == "$EXPECTED_SHA256" ]] \
  || fail "Installed APK hash mismatch."

log "APK is now in the real TastyIgniter/Nginx document root:"
printf '  %s\n' "$WEB_APK"
printf '  SHA-256: %s\n' "$INSTALLED"

if [[ -n "$PMD_HOST" ]]; then
  URL="https://$PMD_HOST/downloads/paymydine/$APK_NAME"
  log "Checking public URL: $URL"
  HTTP_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' "$URL" || true)"
  [[ "$HTTP_CODE" == "200" ]] \
    || fail "Public URL still returned HTTP $HTTP_CODE"
  log "Public URL returned HTTP 200."
fi

cat <<EOF

============================================================
PayMyDine Android V18.1 download-path fix complete.

Correct filesystem path:
  $WEB_APK

Expected web path:
  /downloads/paymydine/$APK_NAME

SHA-256:
  $INSTALLED
============================================================
EOF
