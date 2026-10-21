#!/usr/bin/env bash
# PMD_SHIFTS_NEW_PASSWORD_VISIBILITY_V1_SAFE_DEPLOY
# Deploys only the Shifts controller asset registration and two new assets.
# No git merge/reset/checkout, no Blade overwrite, no unrelated VPS changes.
set -Eeuo pipefail

if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then
  echo "Usage: bash scripts/pmd-shifts-password-eye-v1-deploy.sh --apply" >&2
  exit 2
fi

cd /var/www/paymydine || exit 1
rev="$(git rev-parse --verify FETCH_HEAD)"
case "$rev" in
  *[!0-9a-f]*|"") echo "STOP: Invalid fetched commit." >&2; exit 1;;
esac
if [ "${#rev}" -ne 40 ]; then
  echo "STOP: Expected a full fetched commit SHA." >&2
  exit 1
fi

controller=app/admin/controllers/Shifts.php
js=app/admin/assets/js/pmd-shifts-new-password-visibility-v1.js
css=app/admin/assets/css/pmd-shifts-new-password-visibility-v1.css

if grep -Fq 'PMD_SHIFTS_NEW_PASSWORD_VISIBILITY_V1' "$controller" &&
   [ -f "$js" ] && [ -f "$css" ]; then
  echo "Already installed. No changes made."
  exit 0
fi

if [ -e "$js" ] || [ -e "$css" ]; then
  echo "STOP: One or both new asset paths already exist. Inspect first." >&2
  exit 1
fi
if grep -Fq 'PMD_SHIFTS_NEW_PASSWORD_VISIBILITY_V1' "$controller"; then
  echo "STOP: Controller already contains the asset registration." >&2
  exit 1
fi

backup="$HOME/pmd-backups/shifts-eye-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup/stage"
cp "$controller" "$backup/Shifts.php"

git show "$rev:$js" > "$backup/stage/eye.js"
git show "$rev:$css" > "$backup/stage/eye.css"

python3 - "$controller" "$backup/stage/Shifts.php" <<'PY'
import sys
from pathlib import Path
src = Path(sys.argv[1]).read_text()
anchor = "        $this->addJs('js/pmd-shifts-inpage-day-nav-v18i.js');"
if src.count(anchor) != 1:
    raise SystemExit("STOP: Shifts asset insertion point differs on VPS.")
addition = (
    "\n        // PMD_SHIFTS_NEW_PASSWORD_VISIBILITY_V1\n"
    "        $this->addCss('css/pmd-shifts-new-password-visibility-v1.css');\n"
    "        $this->addJs('js/pmd-shifts-new-password-visibility-v1.js');"
)
Path(sys.argv[2]).write_text(src.replace(anchor, anchor + addition, 1))
PY

php -l "$backup/stage/Shifts.php"
node --check "$backup/stage/eye.js"

installed=0
rollback() {
  status=$?
  if [ "$status" -ne 0 ] && [ "$installed" -eq 1 ]; then
    echo "Install failed. Restoring original controller and removing only the new assets." >&2
    cp "$backup/Shifts.php" "$controller" || true
    rm -f "$js" "$css"
  fi
}
trap rollback EXIT

installed=1
cp "$backup/stage/Shifts.php" "$controller"
install -m 644 "$backup/stage/eye.js" "$js"
install -m 644 "$backup/stage/eye.css" "$css"
php artisan view:clear

installed=0
echo "SUCCESS: Shifts new-password eye installed."
echo "Backup: $backup"
git status --short -- "$controller" "$js" "$css"
