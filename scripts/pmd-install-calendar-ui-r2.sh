#!/usr/bin/env bash
# PMD_CALENDAR_UI_R2_SAFE_DEPLOY
# Stacked on installed PR509. No git checkout/reset, database writes or migrations.
set -Eeuo pipefail
cd /var/www/paymydine
if [[ "${EUID}" -eq 0 ]]; then echo "STOP: run as ubuntu/deployment user" >&2; exit 2; fi
for c in git php node sha256sum cmp mktemp flock; do
  command -v "$c" >/dev/null || { echo "STOP: missing tool $c" >&2; exit 2; }
done
exec 9>/tmp/pmd-calendar-ui-r2.lock
flock -n 9 || { echo "STOP: another Calendar UI deployment is active" >&2; exit 2; }

BASE=refs/remotes/origin/pmd-calendar-r1
REF=refs/remotes/origin/pmd-calendar-ui-r2
git cat-file -e "$BASE^{commit}" || { echo 'STOP: fetch PR509 first' >&2; exit 2; }
git cat-file -e "$REF^{commit}" || { echo 'STOP: fetch UI R2 first' >&2; exit 2; }
git merge-base --is-ancestor "$BASE" "$REF" || {
  echo 'STOP: UI hotfix no longer based on the fetched PR509. Review first.' >&2
  exit 2
}

files=(
  app/admin/assets/css/pmd-settings-service-calendar-r1.css
  app/admin/assets/js/pmd-settings-service-calendar-r1.js
  app/admin/views/pmdsettings/restaurant.blade.php
  scripts/pmd-install-calendar-ui-r2.sh
  scripts/pmd-rollback-calendar-ui-r2.sh
  scripts/test-pmd-service-calendar-ui-r2.js
)
mapfile -t diff_files < <(git diff --name-only "$BASE" "$REF")
if (( "${#files[@]}" != "${#diff_files[@]}" )); then
  echo "STOP: UI PR unexpected file count; inspect diff before deployment" >&2
  printf '%s\n' "${diff_files[@]}" >&2
  exit 2
fi
for path in "${diff_files[@]}"; do
  allowed=0
  for item in "${files[@]}"; do
    if [[ "$path" == "$item" ]]; then allowed=1; break; fi
  done
  if (( allowed == 0 )); then
    echo "STOP: file outside strict UI allowlist: $path" >&2; exit 2
  fi
done

stage="$(mktemp -d /tmp/pmd-calendar-ui-r2-XXXXXX)"
backup=''
applying=0
done_ok=0
cleanup() {
  code=$?
  if (( code != 0 && applying == 1 && done_ok == 0 )); then
    echo "INSTALL FAILED DURING COPY: restoring original files" >&2
    while IFS=$'\t' read -r kind path checksum; do
      if [[ "$kind" == existing ]]; then
        cp -p "$backup/before/$path" "$path" || true
      else
        rm -f "$path" || true
      fi
    done < "$backup/manifest.tsv"
    php artisan view:clear >/dev/null 2>&1 || true
  fi
  rm -rf "$stage"
  if (( code != 0 )); then
    echo "STOP: no successful install. Backup: ${backup:-not created}" >&2
  fi
}
trap cleanup EXIT
mkdir -p "$stage/base" "$stage/incoming" "$stage/merged"

echo "=== STAGE UI-ONLY CHANGES AND PRESERVE LOCAL MODIFICATIONS ==="
for path in "${files[@]}"; do
  if [[ -L "$path" || ( -e "$path" && ! -f "$path" ) ]]; then
    echo "STOP: unsafe file type $path" >&2; exit 2
  fi
  mkdir -p "$stage/base/$(dirname "$path")" "$stage/incoming/$(dirname "$path")" "$stage/merged/$(dirname "$path")"
  git show "$REF:$path" > "$stage/incoming/$path"
  if git cat-file -e "$BASE:$path" 2>/dev/null; then
    [[ -f "$path" && -w "$path" ]] || { echo "STOP: missing or unwritable $path" >&2; exit 2; }
    git show "$BASE:$path" > "$stage/base/$path"
    if cmp -s "$path" "$stage/base/$path"; then
      cp "$stage/incoming/$path" "$stage/merged/$path"
    elif cmp -s "$path" "$stage/incoming/$path"; then
      cp "$path" "$stage/merged/$path"
    else
      if ! git merge-file -p --diff3 "$path" "$stage/base/$path" "$stage/incoming/$path" > "$stage/merged/$path"; then
        echo "STOP: local modifications conflict with UI hotfix: $path" >&2
        echo "No live files changed." >&2
        exit 2
      fi
      echo "Preserved nonconflicting local changes in $path"
    fi
  else
    if [[ -e "$path" && ! -w "$path" ]]; then
      echo "STOP: new file is unwritable: $path" >&2
      exit 2
    fi
    if [[ -e "$path" && ! -f "$path" ]]; then
      echo "STOP: cannot replace nonregular file $path" >&2
      exit 2
    fi
    if [[ -e "$path" && ! -s "$path" ]]; then
      echo "STOP: unexpected empty local file $path" >&2
      exit 2
    fi
    if [[ -e "$path" ]] && ! cmp -s "$path" "$stage/incoming/$path"; then
      echo "STOP: new hotfix path already contains different local content: $path" >&2
      exit 2
    fi
    cp "$stage/incoming/$path" "$stage/merged/$path"
  fi
done

echo "=== VALIDATE BEFORE CHANGING PRODUCTION ==="
git diff --check "$BASE" "$REF"
node --check "$stage/merged/app/admin/assets/js/pmd-settings-service-calendar-r1.js"
for item in scripts/pmd-install-calendar-ui-r2.sh scripts/pmd-rollback-calendar-ui-r2.sh; do
  bash -n "$stage/merged/$item"
done
node "$stage/merged/scripts/test-pmd-service-calendar-ui-r2.js"

backup="$HOME/pmd-calendar-ui-r2-$(date -u +%Y%m%d%H%M%S)-$$"
mkdir -m 700 "$backup"
mkdir -p "$backup/before"
printf '%s\n' /var/www/paymydine > "$backup/root-path"
printf 'pmd-calendar-ui-r2\n' > "$backup/.pmd-calendar-ui-r2"
: > "$backup/manifest.tsv"
for path in "${files[@]}"; do
  if [[ -f "$path" ]]; then
    mkdir -p "$backup/before/$(dirname "$path")"
    cp -p "$path" "$backup/before/$path"
    kind=existing
  else
    test -w "$(dirname "$path")" || { echo "STOP: directory not writable $path" >&2; exit 2; }
    kind=new
  fi
  sha="$(sha256sum "$stage/merged/$path" | cut -d ' ' -f1)"
  printf '%s\t%s\t%s\n' "$kind" "$path" "$sha" >> "$backup/manifest.tsv"
done
cp "$stage/merged/scripts/pmd-rollback-calendar-ui-r2.sh" "$backup/rollback.sh"
chmod 700 "$backup/rollback.sh"

echo "=== INSTALL CALENDAR UI R2 ==="
applying=1
for path in "${files[@]}"; do
  if [[ -f "$path" ]]; then
    cat "$stage/merged/$path" > "$path"
  else
    install -m 0644 "$stage/merged/$path" "$path"
  fi
done
for path in "${files[@]}"; do
  actual="$(sha256sum "$path" | cut -d ' ' -f1)"
  expected="$(sha256sum "$stage/merged/$path" | cut -d ' ' -f1)"
  [[ "$actual" == "$expected" ]] || { echo "STOP: incomplete write: $path" >&2; exit 2; }
done
php artisan view:clear
done_ok=1
applying=0
echo "SUCCESS: CALENDAR UI R2 INSTALLED"
echo "BACKUP: $backup"
printf 'ROLLBACK: bash %q %q\n' "$backup/rollback.sh" "$backup"
echo "No restaurant schedule, reservation, table, or tenant data was changed."
echo "Hard refresh Restaurant Profile and check multi-period inputs / closure dates."
