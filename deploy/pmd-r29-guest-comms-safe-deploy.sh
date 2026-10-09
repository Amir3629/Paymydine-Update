#!/usr/bin/env bash
# PayMyDine R29: guarded deployment from reviewed GitHub main.
# Does not touch Kiosk, finance, database data, or .env.
set -euo pipefail
cd /var/www/paymydine || exit 1

BASE="d8e90fa1d246b01b1e0b4c7fa48fb3520f36ab49"
REQUIRED_R29="4d941dada67e3448cf33fd6af7fcc33bb0ea76c3"

echo "=== PayMyDine R29 guarded production installation ==="
if [ "$(git branch --show-current)" != "main" ]; then
    echo "STOP: VPS must be on main."
    exit 1
fi

CURRENT="$(git rev-parse HEAD)"
if [ "$CURRENT" != "$BASE" ]; then
    echo "STOP: VPS HEAD changed; no installation was attempted."
    echo "Expected $BASE"
    echo "Actual   $CURRENT"
    exit 1
fi

if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
    echo "STOP: VPS worktree has local changes; nothing overwritten."
    git status --short
    exit 1
fi

git fetch origin main
TARGET="$(git rev-parse origin/main)"
echo "VPS:     $CURRENT"
echo "GitHub:  $TARGET"

if ! git merge-base --is-ancestor "$CURRENT" "$TARGET"; then
    echo "STOP: Github main is not a safe fast-forward from VPS."
    exit 1
fi

if ! git merge-base --is-ancestor "$REQUIRED_R29" "$TARGET"; then
    echo "STOP: Github main does not contain the reviewed R29 implementation."
    exit 1
fi

ALLOWED_FILES=(
    ".github/workflows/r28-guest-communications-qa.yml"
    "app/Http/Controllers/PmdPublicBookingController.php"
    "app/Services/Reservations/PmdGuestCommunicationService.php"
    "app/admin/ServiceProvider.php"
    "app/admin/assets/css/pmd-settings-restaurant-v1.css"
    "app/admin/controllers/Pmdsettings.php"
    "app/admin/i18n/platform/ar.php"
    "app/admin/i18n/platform/de.php"
    "app/admin/i18n/platform/en.php"
    "app/admin/i18n/platform/tr.php"
    "app/admin/views/_mail/reservation_guest_message.blade.php"
    "app/admin/views/pmdsettings/restaurant.blade.php"
    "public/assets/pmd/public-booking-manage-v1.js"
    "resources/views/pmd/public-booking-manage.blade.php"
    "scripts/pmd-r28-guest-communications-qa.sh"
    "scripts/pmd-r29-communications-contract-qa.php"
    "deploy/pmd-r29-guest-comms-safe-deploy.sh"
)

declare -A APPROVED_PATHS
for file in "${ALLOWED_FILES[@]}"; do
    APPROVED_PATHS["$file"]=1
done

mapfile -d '' -t MODIFIED_PATHS < <(git diff --name-only -z "$CURRENT" "$TARGET")
if [ "${#MODIFIED_PATHS[@]}" -lt 1 ]; then
    echo "STOP: No reviewed changes found."
    exit 1
fi

for file in "${MODIFIED_PATHS[@]}"; do
    if [ -z "${APPROVED_PATHS[$file]+yes}" ]; then
        echo "STOP: Unreviewed file would change: $file"
        echo "Nothing installed; Kiosk/other modules are protected."
        exit 1
    fi
done
echo "PASS: Only approved R29 files change."

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/paymydine-vps-backups/r29-$STAMP"
mkdir -p "$BACKUP"
printf 'BASE=%s\nTARGET=%s\n' "$CURRENT" "$TARGET" > "$BACKUP/commits.txt"
git diff --name-status "$CURRENT" "$TARGET" > "$BACKUP/changed-files.txt"

for file in "${MODIFIED_PATHS[@]}"; do
    if [ -e "$file" ]; then
        if [ ! -f "$file" ]; then
            echo "STOP: Not a normal file: $file"
            exit 1
        fi
        mkdir -p "$BACKUP/$(dirname "$file")"
        cp -p "$file" "$BACKUP/$file"
    fi
done

echo "Backup: $BACKUP"
echo "Updating reviewed main by fast-forward only..."
git merge --ff-only "$TARGET"

echo "Checking R29 PHP/JS and communication source contracts..."
bash scripts/pmd-r28-guest-communications-qa.sh

echo "Refreshing compiled view and configuration caches..."
sudo -u www-data php artisan view:clear
sudo -u www-data php artisan config:clear

echo "=== R29 INSTALLED: source QA passed ==="
echo "Production HEAD:"
git rev-parse HEAD
echo "Expected origin/main:"
git rev-parse origin/main
echo "Worktree:"
git status --short
echo "Backup:"
echo "$BACKUP"
echo "NEXT: authenticated save and live email/WhatsApp test are still required."
