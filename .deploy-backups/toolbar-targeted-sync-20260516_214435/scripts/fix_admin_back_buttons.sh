#!/usr/bin/env bash
set -euo pipefail

# PayMyDine Admin Back Button Toolbar Maintenance
#
# The Back-button fix now lives in the committed admin assets instead of being
# appended to production files at deploy time. This script is intentionally
# conservative: it creates deploy backups, verifies the assets contain the
# stable Toolbar Splitter/Back-button code, clears Laravel caches, and refreshes
# common permissions. It does not append duplicate MutationObserver fallbacks,
# which previously could reprocess generated form toolbars repeatedly.
#
# Run from the repository root:
#   bash scripts/fix_admin_back_buttons.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADMIN_JS="$ROOT/app/admin/assets/js/admin.js"
TOOLBAR_CSS="$ROOT/app/admin/assets/css/pmd-admin/components/toolbar-buttons.css"
BACKUP_DIR="$ROOT/.deploy-backups/$(date +%Y%m%d_%H%M%S)_back_button_assets"

for file in "$ADMIN_JS" "$TOOLBAR_CSS"; do
  if [[ ! -f "$file" ]]; then
    echo "ERROR: required asset not found: $file" >&2
    exit 1
  fi
done

mkdir -p "$BACKUP_DIR"
cp -p "$ADMIN_JS" "$BACKUP_DIR/admin.js"
cp -p "$TOOLBAR_CSS" "$BACKUP_DIR/toolbar-buttons.css"
echo "Backed up admin toolbar assets to $BACKUP_DIR"

if ! grep -q "toolbar normalization" "$ADMIN_JS"; then
  echo "ERROR: admin.js does not contain the committed toolbar normalization block." >&2
  echo "Pull/deploy the latest repository changes instead of appending a runtime fallback." >&2
  exit 1
fi

if ! grep -q "Back actions are left-side secondary actions" "$TOOLBAR_CSS"; then
  echo "ERROR: toolbar-buttons.css does not contain the committed Back-button CSS block." >&2
  echo "Pull/deploy the latest repository changes instead of appending CSS overrides." >&2
  exit 1
fi

# Best-effort Laravel cache clearing. These commands are intentionally allowed
# to fail so the script can run on staging copies without a complete .env.
if [[ -f "$ROOT/artisan" ]]; then
  (cd "$ROOT" && php artisan optimize:clear) || true
  (cd "$ROOT" && php artisan view:clear) || true
  (cd "$ROOT" && php artisan route:clear) || true
  (cd "$ROOT" && php artisan cache:clear) || true
  (cd "$ROOT" && php artisan config:clear) || true
else
  echo "artisan not found; skipped Laravel cache clearing"
fi

# Keep asset files web-readable without recursively changing the whole app.
chmod 0644 "$ADMIN_JS" "$TOOLBAR_CSS" || true
find "$ROOT/app/admin/assets" -type d -exec chmod 0755 {} \; || true
find "$ROOT/app/admin/assets" -type f -exec chmod 0644 {} \; || true
[[ -d "$ROOT/storage" ]] && chmod -R u+rwX "$ROOT/storage" || true
[[ -d "$ROOT/bootstrap/cache" ]] && chmod -R u+rwX "$ROOT/bootstrap/cache" || true

echo "Back-button toolbar assets verified. Hard refresh the admin panel (Ctrl+F5 / Cmd+Shift+R)."
