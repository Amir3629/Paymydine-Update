#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
CSS="$ROOT/app/admin/assets/css/pmd-side-menu2-v1.css"

if [ ! -f "$CSS" ]; then
  echo "ERROR: Missing $CSS"
  exit 1
fi

if [ ! -w "$CSS" ] && [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Production CSS is not writable by $(id -un). Re-running patch with sudo..."
  exec sudo PMD_ROOT="$ROOT" bash "$0"
fi

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/storage/pmd-patch-backups/sidebar-bottom-logout-r3-$TS"
mkdir -p "$BACKUP"
cp -a "$CSS" "$BACKUP/pmd-side-menu2-v1.css"

echo "Backup created: $BACKUP"

MARKER="PMD_SM2_BOTTOM_LOGOUT_LANGUAGE_SIZE_R3"

if grep -q "$MARKER" "$CSS"; then
  echo "R3 already applied. Nothing to do."
else
  cat >> "$CSS" <<'CSS'

/* ==========================================================
   PMD_SM2_BOTTOM_LOGOUT_LANGUAGE_SIZE_R3
   - Language code is slightly larger in collapsed Side Menu.
   - Logout remains a NORMAL nav item, but uses flex auto-margin
     to sit at the visual bottom when the viewport is tall.
   - On short viewports auto-margin collapses naturally and the
     whole nav remains scrollable.
   ========================================================== */

/* Keep the nav as the single scrollable flex column. */
#pmd-side-menu2 .pmd-sm2__nav {
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
}

/* Language code: larger/clearer without changing button geometry. */
#pmd-side-menu2 .pmd-sm2__language-code {
  flex: 0 0 30px !important;
  width: 30px !important;
  min-width: 30px !important;
  height: 30px !important;
  font-size: 15px !important;
  font-weight: 900 !important;
  line-height: 1 !important;
}

html.pmd-sm2-collapsed
#pmd-side-menu2 .pmd-sm2__language-code {
  margin-left: auto !important;
  margin-right: auto !important;
}

/*
 * Logout stays inside .pmd-sm2__nav (not a separate footer).
 * Positive free space on large screens is absorbed above it,
 * placing the final button at the bottom. On small screens there
 * is no free space, so it simply follows the previous nav item.
 */
#pmd-side-menu2 .pmd-sm2__nav > .pmd-sm2__logout-action {
  margin-top: auto !important;
  margin-bottom: 0 !important;
}
CSS
fi

cd "$ROOT"

if ! git diff --check -- app/admin/assets/css/pmd-side-menu2-v1.css; then
  echo "ERROR: git diff --check failed. Restoring backup."
  cp -a "$BACKUP/pmd-side-menu2-v1.css" "$CSS"
  exit 1
fi

php artisan view:clear >/dev/null 2>&1 || true

echo
echo "PMD sidebar R3 applied successfully."
echo "Changed file:"
echo "  app/admin/assets/css/pmd-side-menu2-v1.css"
echo
echo "Backup: $BACKUP"
echo "Rollback:"
echo "  sudo cp -a '$BACKUP/pmd-side-menu2-v1.css' '$CSS'"
echo "  cd '$ROOT' && sudo php artisan view:clear"
