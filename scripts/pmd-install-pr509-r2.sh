#!/usr/bin/env bash
# PMD_PR509_LOCAL_PRESERVING_INSTALL_R2
# Safe complete install of the PR509 restaurant service calendar.
# Requires pre-fetched origin/pmd-calendar-r1. Never checks out/reset/cleans git.
set -Eeuo pipefail
ROOT=/var/www/paymydine
BASE=f61a1613fbb8e6e7616d83972f61a56d43a5b68f
REF=refs/remotes/origin/pmd-calendar-r1
cd "$ROOT"
if [[ "${EUID}" -eq 0 ]]; then
  echo 'STOP: run as ubuntu/deployment account, not root.' >&2
  exit 2
fi
for cmd in git php node flock sha256sum cmp awk mktemp; do
  command -v "$cmd" >/dev/null || { echo "STOP: required command $cmd missing" >&2; exit 2; }
done
exec 9> /tmp/pmd-pr509-install.lock
flock -n 9 || { echo 'STOP: another PR509 installer or rollback is active.' >&2; exit 2; }
git cat-file -e "$BASE^{commit}" || { echo 'STOP: baseline commit absent.' >&2; exit 2; }
git cat-file -e "$REF^{commit}" || { echo 'STOP: fetch PR509 first.' >&2; exit 2; }

# Strict allowlist: no unrelated paths or deleted files may be installed.
allowed=(
  app/Http/Controllers/PmdPublicBookingController.php
  app/Services/PmdDevicePlatformService.php
  app/Services/Reservations/PmdRestaurantServiceCalendarR1.php
  app/admin/assets/css/pmd-settings-service-calendar-r1.css
  app/admin/assets/js/pmd-quick-reservations-v1.js
  app/admin/assets/js/pmd-reservation-composer-v1.js
  app/admin/assets/js/pmd-reservations-lab-schedule-v1.js
  app/admin/assets/js/pmd-reservations-schedule-v1.js
  app/admin/assets/js/pmd-settings-restaurant-v1.js
  app/admin/assets/js/pmd-settings-service-calendar-r1.js
  app/admin/controllers/PmdQuickPosV1.php
  app/admin/controllers/Pmdsettings.php
  app/admin/controllers/Reservations.php
  app/admin/views/_partials/pmd_reservations_lab_schedule_v1.blade.php
  app/admin/views/_partials/pmd_reservations_schedule_v1.blade.php
  app/admin/views/pmd_quick_pos_v1.blade.php
  app/admin/views/pmdsettings/restaurant.blade.php
  public/assets/pmd/public-booking-v1.js
  resources/views/pmd/public-booking.blade.php
  scripts/pmd-preflight-restaurant-calendar-r1.sh
  scripts/pmd-rollback-pr509-r2.sh
  scripts/pmd-install-pr509-r2.sh
  scripts/test-pmd-restaurant-calendar-contract-r1.js
  scripts/test-pmd-restaurant-service-calendar-r1.php
)
mapfile -t changed < <(git diff --name-only --diff-filter=ACMR "$BASE" "$REF")
mapfile -t all_changed < <(git diff --name-only "$BASE" "$REF")
if (( ${#changed[@]} != ${#allowed[@]} || ${#changed[@]} != ${#all_changed[@]} )); then
  echo "STOP: expected ${#allowed[@]} known files; PR contains ${#all_changed[@]} changed paths." >&2
  printf '%s\n' "${all_changed[@]}" >&2
  exit 2
fi
for p in "${changed[@]}"; do
  ok=0
  for expected in "${allowed[@]}"; do [[ "$p" == "$expected" ]] && ok=1 && break; done
  ((ok == 1)) || { echo "STOP: unexpected source path $p" >&2; exit 2; }
done
stage="$(mktemp -d /tmp/pmd-pr509-install-r2-XXXXXX)"
backup=''
applying=0
installed=0
cleanup() {
  status=$?
  if (( status != 0 && applying == 1 && installed == 0 )); then
    echo 'ERROR: installer failed during copy; restoring original files automatically.' >&2
    while IFS=$'\t' read -r kind file final_sha; do
      if [[ "$kind" == existing ]]; then
        cp -p "$backup/before/$file" "$ROOT/$file" || true
      else
        rm -f "$ROOT/$file" || true
      fi
    done < "$backup/manifest.tsv"
    php artisan view:clear >/dev/null 2>&1 || true
  fi
  rm -rf "$stage"
  if (( status != 0 )); then
    echo "STOP: install not completed. Backup location: ${backup:-none}; inspect errors above." >&2
  fi
}
trap cleanup EXIT
mkdir -p "$stage/base" "$stage/incoming" "$stage/merged"

printf '=== STAGE + THREE-WAY MERGE LOCAL FILES ===\n'
for p in "${allowed[@]}"; do
  mkdir -p "$stage/base/$(dirname "$p")" "$stage/incoming/$(dirname "$p")" "$stage/merged/$(dirname "$p")"
  git show "$REF:$p" > "$stage/incoming/$p" || { echo "STOP: ref missing $p" >&2; exit 2; }
  if [[ -L "$p" ]]; then echo "STOP: refusing symlink $p" >&2; exit 2; fi
  if [[ -e "$p" && ! -f "$p" ]]; then echo "STOP: not a regular file: $p" >&2; exit 2; fi
  if git cat-file -e "$BASE:$p" 2>/dev/null; then
    git show "$BASE:$p" > "$stage/base/$p"
    if [[ -e "$p" ]]; then
      if cmp -s "$p" "$stage/base/$p"; then
        cp "$stage/incoming/$p" "$stage/merged/$p"
      elif cmp -s "$p" "$stage/incoming/$p"; then
        cp "$p" "$stage/merged/$p"
      else
        # Current VPS content = ours, base commit = ancestor, PR509 = theirs.
        if ! git merge-file -p --diff3 "$p" "$stage/base/$p" "$stage/incoming/$p" > "$stage/merged/$p"; then
          echo "STOP: local changes conflict with PR509: $p" >&2
          echo 'NO LIVE FILES CHANGED. Preserve the conflict for manual review.' >&2
          exit 2
        fi
        echo "Preserved existing VPS modifications: $p"
      fi
    else
      echo "STOP: existing tracked file missing locally: $p" >&2
      exit 2
    fi
  else
    if [[ -e "$p" ]] && ! cmp -s "$p" "$stage/incoming/$p"; then
      echo "STOP: new PR509 file already differs locally: $p" >&2
      exit 2
    fi
    cp "$stage/incoming/$p" "$stage/merged/$p"
  fi
done

git diff --check "$BASE" "$REF"
printf '=== PRE-INSTALL SYNTAX, FIXTURE AND CONTRACT QA ===\n'
for p in "${allowed[@]}"; do
  case "$p" in
    *.blade.php) ;;
    *.php) php -l "$stage/merged/$p" >/dev/null || exit 2 ;;
    *.js) node --check "$stage/merged/$p" || exit 2 ;;
    *.sh) bash -n "$stage/merged/$p" || exit 2 ;;
  esac
done
node "$stage/merged/scripts/test-pmd-restaurant-calendar-contract-r1.js"
PMD_CALENDAR_PROJECT_ROOT="$ROOT" \
PMD_CALENDAR_SERVICE_FILE="$stage/merged/app/Services/Reservations/PmdRestaurantServiceCalendarR1.php" \
  php "$stage/merged/scripts/test-pmd-restaurant-service-calendar-r1.php"

printf '=== BACK UP EVERY AFFECTED LIVE FILE ===\n'
backup="$HOME/pmd-pr509-preserved-$(date +%Y%m%d%H%M%S)-$$"
mkdir -m 700 "$backup"
mkdir -p "$backup/before"
printf '%s\n' "$ROOT" > "$backup/root-path"
printf 'pmd-pr509-backup-r2\n' > "$backup/.pmd-pr509-backup-r2"
: > "$backup/manifest.tsv"
for p in "${allowed[@]}"; do
  if [[ -f "$p" ]]; then
    mkdir -p "$backup/before/$(dirname "$p")"
    cp -p "$p" "$backup/before/$p"
    kind=existing
  else
    kind=new
  fi
  after="$(sha256sum "$stage/merged/$p" | awk '{print $1}')"
  printf '%s\t%s\t%s\n' "$kind" "$p" "$after" >> "$backup/manifest.tsv"
done
cp "$stage/merged/scripts/pmd-rollback-pr509-r2.sh" "$backup/rollback.sh"
chmod 700 "$backup/rollback.sh"
printf '%s\n' "$(git rev-parse "$REF")" > "$backup/pr509-commit.txt"

printf '=== APPLY PR509 (PRESERVE LOCAL FILE CONTENT) ===\n'
applying=1
for p in "${allowed[@]}"; do
  if [[ -f "$p" ]]; then
    cat "$stage/merged/$p" > "$p"
  else
    mkdir -p "$(dirname "$p")"
    install -m 0644 "$stage/merged/$p" "$p"
  fi
done
for p in "${allowed[@]}"; do
  actual="$(sha256sum "$p" | awk '{print $1}')"
  expected="$(sha256sum "$stage/merged/$p" | awk '{print $1}')"
  [[ "$actual" == "$expected" ]] || { echo "STOP: incomplete copy $p" >&2; exit 2; }
done
php artisan view:clear
# Public, unauthenticated smoke: best effort if this VPS can reach its vhost.
if command -v curl >/dev/null 2>&1; then
  status="$(curl --max-time 20 --connect-timeout 6 --silent --show-error --location --output "$backup/tomo-booking-smoke.html" --write-out '%{http_code}' https://tomo.paymydine.com/book 2>"$backup/curl-stderr" || true)"
  if [[ "$status" == 200 ]]; then
    if grep -Fq 'closedDates' "$backup/tomo-booking-smoke.html"; then
      echo 'PASS: Tomo public /book serves the updated calendar configuration.'
    else
      echo 'STOP: /book responded 200 but does not contain new calendar configuration.' >&2
      exit 2
    fi
  elif [[ "$status" == 5* ]]; then
    echo "STOP: Tomo /book returned HTTP $status after deployment." >&2
    exit 2
  else
    echo "NOTICE: remote Tomo HTTP smoke inconclusive (status: ${status:-no connection}). Verify via browser."
  fi
fi
installed=1
applying=0
printf 'SUCCESS: PR509 RESTAURANT CALENDAR INSTALLED (FILES ONLY)\n'
printf 'BACKUP: %s\n' "$backup"
printf 'ROLLBACK: bash %q %q\n' "$backup/rollback.sh" "$backup"
echo 'No schema migrations or tenant data modifications were performed.'
echo 'Next: verify Tomo /admin/pmdsettings/restaurant and public /book in browser.'
