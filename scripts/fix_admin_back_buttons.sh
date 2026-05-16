#!/usr/bin/env bash
set -euo pipefail

# PayMyDine Admin Back Button Toolbar Maintenance
#
# This helper is intentionally idempotent. The Back-button behavior lives in the
# committed admin JS/CSS assets; this script only verifies those assets and, when
# requested, clears framework caches. It never appends CSS/JS fallbacks and never
# rewrites vendor/media/storage files.
#
# Run from the repository root:
#   bash scripts/fix_admin_back_buttons.sh
# Optional cache clear:
#   PMD_CLEAR_CACHES=1 bash scripts/fix_admin_back_buttons.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADMIN_JS="$ROOT/app/admin/assets/js/admin.js"
SRC_JS="$ROOT/app/admin/assets/src/js/app.js"
TOOLBAR_CSS="$ROOT/app/admin/assets/css/no-green-toolbar-buttons.css"
COMPONENT_TOOLBAR_CSS="$ROOT/app/admin/assets/css/pmd-admin/components/toolbar-buttons.css"

for file in "$ADMIN_JS" "$SRC_JS" "$TOOLBAR_CSS" "$COMPONENT_TOOLBAR_CSS"; do
  if [[ ! -f "$file" ]]; then
    echo "ERROR: required asset not found: $file" >&2
    exit 1
  fi
done

if [[ "$(grep -c "PayMyDine admin toolbar normalization" "$ADMIN_JS")" -ne 1 ]]; then
  echo "ERROR: admin.js must contain exactly one toolbar normalizer block." >&2
  exit 1
fi

if [[ "$(grep -c "PayMyDine admin toolbar normalization" "$SRC_JS")" -ne 1 ]]; then
  echo "ERROR: src app.js must contain exactly one toolbar normalizer block." >&2
  exit 1
fi

if grep -q "secondaryActions[.]length < 2" "$ADMIN_JS" "$SRC_JS"; then
  echo "ERROR: old bad one-secondary-action split guard is still present." >&2
  exit 1
fi

if grep -q "pmd-toolbar-split-runtime-style\|PMD_TOOLBAR_SPLIT_STYLE_ID" "$ADMIN_JS" "$SRC_JS"; then
  echo "ERROR: runtime toolbar CSS injection is still present; CSS must be file-owned." >&2
  exit 1
fi

if [[ "$(grep -c "PayMyDine admin button/toolbar system" "$TOOLBAR_CSS")" -ne 1 ]]; then
  echo "ERROR: canonical toolbar CSS marker must exist exactly once." >&2
  exit 1
fi

if ! grep -q "Back actions are left-side secondary actions" "$COMPONENT_TOOLBAR_CSS"; then
  echo "ERROR: component toolbar CSS is missing the Back-button source note." >&2
  exit 1
fi

python3 "$ROOT/scripts/repair_admin_assets.py"

if [[ "${PMD_CLEAR_CACHES:-0}" == "1" && -f "$ROOT/artisan" ]]; then
  (cd "$ROOT" && php artisan optimize:clear) || true
  (cd "$ROOT" && php artisan view:clear) || true
  (cd "$ROOT" && php artisan route:clear) || true
  (cd "$ROOT" && php artisan cache:clear) || true
  (cd "$ROOT" && php artisan config:clear) || true
fi

echo "Back-button toolbar assets verified. Hard refresh the admin panel (Ctrl+F5 / Cmd+Shift+R)."
