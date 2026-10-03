#!/usr/bin/env bash
set -Eeuo pipefail
ROOT='/var/www/paymydine'
V2='/var/www/paymydine/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815'
SERVICE='paymydine-frontend-v2'
BACKUP='/var/www/paymydine/storage/pmd-v2-backups/stripe-wallet-r35b-20260820_220955'
FRONT_EXISTING_TARGETS=(
  "src/lib/client-api.ts"
  "src/runtime/components/RuntimeOverlays.tsx"
  "src/runtime/components/RuntimeOverlays.module.css"
)
for rel in "${FRONT_EXISTING_TARGETS[@]}"; do
  target="$V2/$rel"; src="$BACKUP/frontend/$rel"; [ -f "$src" ] || continue
  uid="$(sudo stat -c '%u' "$target" 2>/dev/null || echo 0)"; gid="$(sudo stat -c '%g' "$target" 2>/dev/null || echo 0)"; mode="$(sudo stat -c '%a' "$target" 2>/dev/null || echo 644)"
  sudo install -o "$uid" -g "$gid" -m "$mode" "$src" "$target"
done
sudo rm -f "$V2/src/runtime/components/StripeInlinePayment.tsx"
if [ -f "$BACKUP/backend/routes/qr-pay.php" ]; then
  target="$ROOT/routes/qr-pay.php"; src="$BACKUP/backend/routes/qr-pay.php"
  uid="$(sudo stat -c '%u' "$target" 2>/dev/null || echo 0)"; gid="$(sudo stat -c '%g' "$target" 2>/dev/null || echo 0)"; mode="$(sudo stat -c '%a' "$target" 2>/dev/null || echo 644)"
  sudo install -o "$uid" -g "$gid" -m "$mode" "$src" "$target"
fi
if [ -d "$BACKUP/.next.previous" ]; then
  sudo rm -rf "$V2/.next"
  sudo cp -a "$BACKUP/.next.previous" "$V2/.next"
  sudo chown -R ubuntu:ubuntu "$V2/.next" 2>/dev/null || true
fi
sudo -u ubuntu -H pm2 restart "$SERVICE" --update-env
printf 'ROLLBACK_COMPLETE=%s\n' "$BACKUP"
