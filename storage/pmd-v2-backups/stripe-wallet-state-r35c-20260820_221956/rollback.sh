#!/usr/bin/env bash
set -Eeuo pipefail
V2='/var/www/paymydine/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815'
SERVICE='paymydine-frontend-v2'
BACKUP='/var/www/paymydine/storage/pmd-v2-backups/stripe-wallet-state-r35c-20260820_221956'
TARGETS=(
  "src/runtime/components/StripeInlinePayment.tsx"
  "src/runtime/components/RuntimeOverlays.tsx"
)
for rel in "${TARGETS[@]}"; do
  src="$BACKUP/frontend/$rel"
  target="$V2/$rel"
  uid="$(sudo stat -c '%u' "$target" 2>/dev/null || echo 0)"
  gid="$(sudo stat -c '%g' "$target" 2>/dev/null || echo 0)"
  mode="$(sudo stat -c '%a' "$target" 2>/dev/null || echo 644)"
  sudo install -o "$uid" -g "$gid" -m "$mode" "$src" "$target"
done
if [ -d "$BACKUP/.next.previous" ]; then
  sudo rm -rf "$V2/.next"
  sudo mv "$BACKUP/.next.previous" "$V2/.next"
  sudo chown -R ubuntu:ubuntu "$V2/.next" 2>/dev/null || true
fi
sudo -u ubuntu -H pm2 restart "$SERVICE" --update-env
curl -fsS http://127.0.0.1:3002/api/health
echo
echo "R35C_ROLLBACK_COMPLETE=$BACKUP"
