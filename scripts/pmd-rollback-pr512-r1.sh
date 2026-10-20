#!/usr/bin/env bash
# PMD_PR512_R1_VERIFIED_ROLLBACK — source-file rollback ONLY, no database changes.
set -Eeuo pipefail
backup="${1:-}"
if [[ -z "$backup" || ! -f "$backup/.pmd-pr512-r1" || ! -s "$backup/manifest.tsv" ]]; then
  echo "STOP: provide the exact PR512 backup directory." >&2
  exit 2
fi
backup="$(cd "$backup" && pwd -P)"
root="$(cat "$backup/root-path")"
if [[ "$root" != "/var/www/paymydine" || ! -d "$root/.git" ]]; then
  echo "STOP: backup does not belong to this project checkout." >&2
  exit 2
fi
if [[ "$EUID" -eq 0 ]]; then echo "STOP: run as the deployment user, not root." >&2; exit 2; fi
cd "$root"
exec 9>/tmp/pmd-pr512-r1.lock
flock -n 9 || { echo "STOP: concurrent PR512 installation/rollback." >&2; exit 2; }
echo "=== VERIFY ALL DEPLOYED FILES BEFORE ANY ROLLBACK ==="
while IFS=$'\t' read -r kind file digest; do
  [[ -n "$file" && "$file" != /* && "$file" != *'..'* && -f "$file" && ! -L "$file" ]] || {
    echo "STOP: unsafe/missing live file $file" >&2; exit 2;
  }
  actual="$(sha256sum "$file" | awk '{print $1}')"
  [[ "$actual" == "$digest" ]] || {
    echo "STOP: $file changed after PR512; refuse to overwrite later edits." >&2; exit 2;
  }
  case "$kind" in
    existing) [[ -f "$backup/before/$file" ]] || { echo "STOP: backup missing: $file" >&2; exit 2; };;
    new) ;;
    *) echo "STOP: corrupt backup manifest" >&2; exit 2;;
  esac
done < "$backup/manifest.tsv"
echo "=== RESTORE PR512 BACKUPS ==="
while IFS=$'\t' read -r kind file digest; do
  if [[ "$kind" == existing ]]; then
    cp -p "$backup/before/$file" "$file"
  else
    rm -f -- "$file"
  fi
done < "$backup/manifest.tsv"
php artisan view:clear
echo "SUCCESS: PR512 source files reverted (no data altered)."
echo "NOTE: If the Next frontend was separately built/restarted, use its separately captured build backup to revert that deployment too."
