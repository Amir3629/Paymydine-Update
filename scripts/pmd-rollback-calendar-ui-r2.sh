#!/usr/bin/env bash
# PMD_CALENDAR_UI_R2_ROLLBACK
# Revert only the UI files if they still match this install, preserving later edits.
set -Eeuo pipefail
backup="${1:-}"
if [[ -z "$backup" || ! -f "$backup/.pmd-calendar-ui-r2" || ! -f "$backup/manifest.tsv" ]]; then
  echo "STOP: supply the exact calendar UI R2 backup folder" >&2
  exit 2
fi
backup="$(cd "$backup" && pwd -P)"
root="$(cat "$backup/root-path")"
if [[ "$root" != /var/www/paymydine || ! -d "$root/.git" ]]; then
  echo "STOP: backup is not for this project root" >&2
  exit 2
fi
cd "$root"
if [[ "${EUID}" -eq 0 ]]; then echo "STOP: do not run as root" >&2; exit 2; fi
exec 9>/tmp/pmd-calendar-ui-r2.lock
flock -n 9 || { echo "STOP: concurrent installation" >&2; exit 2; }
while IFS=$'\t' read -r kind file checksum; do
  [[ "$file" != /* && "$file" != *'..'* && -f "$file" && ! -L "$file" ]] || {
    echo "STOP: deployed file changed or missing: $file" >&2; exit 2;
  }
  current="$(sha256sum "$file" | awk '{print $1}')"
  [[ "$checksum" == "$current" ]] || {
    echo "STOP: file changed after install: $file. Preserve its newer edits." >&2; exit 2;
  }
  if [[ "$kind" == existing ]]; then
    test -f "$backup/before/$file" || { echo "STOP: original backup missing $file" >&2; exit 2; }
  elif [[ "$kind" != new ]]; then
    echo "STOP: unexpected manifest entry" >&2; exit 2
  fi
done < "$backup/manifest.tsv"
while IFS=$'\t' read -r kind file checksum; do
  if [[ "$kind" == existing ]]; then
    cp -p "$backup/before/$file" "$file"
  else
    rm -f "$file"
  fi
done < "$backup/manifest.tsv"
php artisan view:clear
echo "SUCCESS: calendar UI R2 rolled back. Schedule data was not changed."
