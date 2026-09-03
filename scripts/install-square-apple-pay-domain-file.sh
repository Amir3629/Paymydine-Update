#!/usr/bin/env bash
set -Eeuo pipefail

: "${DOMAIN:?Set DOMAIN to the exact PayMyDine host, for example tomo.paymydine.com}"

ROOT="/var/www/paymydine"
DOMAIN="$(printf '%s' "$DOMAIN" | tr '[:upper:]' '[:lower:]')"
SOURCE_URL="https://app.squareup.com/digital-wallets/apple-pay/apple-developer-merchantid-domain-association"
TARGET_DIR="$ROOT/storage/app/pmd-wallets/apple-pay"
TARGET="$TARGET_DIR/$DOMAIN.bin"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-apple-domain-$DOMAIN-$STAMP.bin"
TMP="$(mktemp)"
SERVED="$(mktemp)"
trap 'rm -f "$TMP" "$SERVED"' EXIT

if [ ${#DOMAIN} -gt 253 ] || [[ "$DOMAIN" == *..* ]] || ! [[ "$DOMAIN" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]]; then
  echo "STOP: unsafe domain: $DOMAIN"
  exit 1
fi

curl --fail --location --silent --show-error "$SOURCE_URL" -o "$TMP"
BYTES="$(wc -c < "$TMP" | tr -d ' ')"
if [ "$BYTES" -lt 64 ] || [ "$BYTES" -gt 131072 ]; then
  echo "STOP: Square Apple Pay association file has unexpected size: $BYTES"
  exit 1
fi
if head -c 1024 "$TMP" | tr '[:upper:]' '[:lower:]' | grep -Eq '<html|<!doctype'; then
  echo "STOP: Square association download returned HTML"
  exit 1
fi

sudo mkdir -p "$TARGET_DIR"
if [ -f "$TARGET" ]; then
  sudo cp -a "$TARGET" "$BACKUP"
  echo "Previous tenant Apple Pay file backed up: $BACKUP"
fi
sudo install -m 0644 "$TMP" "$TARGET"

echo "Installed current Square Apple Pay association file: $TARGET"
echo "Source SHA256: $(sha256sum "$TMP" | awk '{print $1}')"

echo "Verifying public PayMyDine well-known endpoint..."
curl --fail --location --silent --show-error \
  "https://$DOMAIN/.well-known/apple-developer-merchantid-domain-association" \
  -o "$SERVED"

SOURCE_SHA="$(sha256sum "$TMP" | awk '{print $1}')"
SERVED_SHA="$(sha256sum "$SERVED" | awk '{print $1}')"
if [ "$SOURCE_SHA" != "$SERVED_SHA" ]; then
  echo "STOP: public well-known response does not match the Square association file"
  echo "Source: $SOURCE_SHA"
  echo "Served: $SERVED_SHA"
  exit 1
fi

echo "PASS: https://$DOMAIN/.well-known/apple-developer-merchantid-domain-association serves the exact current Square file"
echo "NEXT: Square Developer Console > Sandbox > Apple Pay > Add Sandbox Domain > $DOMAIN"
