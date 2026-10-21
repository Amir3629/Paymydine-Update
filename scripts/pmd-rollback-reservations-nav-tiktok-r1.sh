#!/usr/bin/env bash
# PMD_RES_SEARCH_NAV_TIKTOK_R1_ROLLBACK -- file-only, verifies no newer edits.
set -Eeuo pipefail
backup="${1:-}"
if [[ -z "$backup" || ! -f "$backup/.pmd-resnav-tiktok-r1" || ! -f "$backup/manifest.tsv" ]]; then
  echo 'STOP: provide the exact R1 backup folder' >&2; exit 2
fi
backup="$(cd "$backup" && pwd -P)"
root="$(cat "$backup/root-path")"
if [[ "$root" != /var/www/paymydine || ! -d "$root/.git" ]]; then
  echo 'STOP: backup not for this VPS directory' >&2; exit 2
fi
if [[ "${EUID}" -eq 0 ]]; then echo 'STOP: do not run as root' >&2; exit 2; fi
cd "$root"
exec 9>/tmp/pmd-resnav-tiktok-r1.lock
flock -n 9 || { echo 'STOP: deployment still in progress' >&2; exit 2; }
while IFS=$'\t' read -r kind path hash; do
  [[ "$path" != /* && "$path" != *'..'* && -f "$path" && ! -L "$path" ]] || {
    echo "STOP: suspicious or missing $path" >&2; exit 2;
  }
  actual="$(sha256sum "$path" | cut -d ' ' -f 1)"
  [[ "$hash" == "$actual" ]] || {
    echo "STOP: newer modifications found: $path; manual review required" >&2; exit 2;
  }
  if [[ "$kind" == existing ]]; then
    [[ -f "$backup/before/$path" ]] || { echo "STOP: backup missing $path" >&2; exit 2; }
  elif [[ "$kind" != new ]]; then
    echo 'STOP: manifest corrupted' >&2; exit 2
  fi
done < "$backup/manifest.tsv"
while IFS=$'\t' read -r kind path hash; do
  if [[ "$kind" == existing ]]; then
    cp -p "$backup/before/$path" "$path"
  else
    rm -f "$path"
  fi
done < "$backup/manifest.tsv"
php artisan view:clear
echo "SUCCESS: source files returned to pre-R1 versions."
echo 'NOTE: Next.js compiled build/process must be restored/rebuilt separately if restarted.'
echo 'NOTE: TikTok setting values saved AFTER install are not erased.'
