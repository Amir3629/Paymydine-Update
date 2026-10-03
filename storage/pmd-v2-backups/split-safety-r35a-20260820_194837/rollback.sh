#!/usr/bin/env bash
set -Eeuo pipefail
ROOT='/var/www/paymydine'
V2='/var/www/paymydine/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815'
SERVICE='paymydine-frontend-v2'
BACKUP='/var/www/paymydine/storage/pmd-v2-backups/split-safety-r35a-20260820_194837'
FRONT_TARGETS=(
  "src/domain/model.ts" "src/server/normalize.ts" "src/server/bootstrap.ts" "src/server/mock-bootstrap.ts"
  "src/lib/client-api.ts" "src/runtime/components/RuntimeOverlays.tsx" "src/runtime/components/RuntimeOverlays.module.css"
  "src/runtime/components/PayPalButton.tsx" "app/payment/return/PaymentReturnClient.tsx" "scripts/feature-coverage-audit.mjs" "docs/BACKEND_CONTRACT.md"
)
for rel in "${FRONT_TARGETS[@]}"; do
  target="$V2/$rel"; src="$BACKUP/frontend/$rel"; [ -f "$src" ] || continue
  uid="$(sudo stat -c '%u' "$target" 2>/dev/null || echo 0)"; gid="$(sudo stat -c '%g' "$target" 2>/dev/null || echo 0)"; mode="$(sudo stat -c '%a' "$target" 2>/dev/null || echo 644)"
  sudo install -o "$uid" -g "$gid" -m "$mode" "$src" "$target"
done
for rel in routes/qr-pay.php app/main/routes/helpers.php app/admin/controllers/Pmdsettings.php app/admin/views/pmdsettings/frontend.blade.php; do
  target="$ROOT/$rel"; src="$BACKUP/backend/$rel"; [ -f "$src" ] || continue
  uid="$(sudo stat -c '%u' "$target" 2>/dev/null || echo 0)"; gid="$(sudo stat -c '%g' "$target" 2>/dev/null || echo 0)"; mode="$(sudo stat -c '%a' "$target" 2>/dev/null || echo 644)"
  sudo install -o "$uid" -g "$gid" -m "$mode" "$src" "$target"
done
if [ -d "$BACKUP/.next.previous" ]; then
  sudo rm -rf "$V2/.next"
  sudo cp -a "$BACKUP/.next.previous" "$V2/.next"
  sudo chown -R ubuntu:ubuntu "$V2/.next" 2>/dev/null || true
fi
sudo -u ubuntu -H pm2 restart "$SERVICE" --update-env
printf 'ROLLBACK_COMPLETE=%s\n' "$BACKUP"
