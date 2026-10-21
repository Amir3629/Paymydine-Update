#!/usr/bin/env bash
# PMD_PR509_ROLLBACK_R2 - preserves post-install edits by refusing stale restores.
set -Eeuo pipefail
backup="${1:-}"
if [[ -z "$backup" || ! -f "$backup/.pmd-pr509-backup-r2" || ! -f "$backup/manifest.tsv" ]]; then
  echo 'STOP: supply the exact PR509 backup directory.' >&2
  exit 2
fi
backup="$(cd "$backup" && pwd -P)"
root="$(cat "$backup/root-path")"
if [[ "$root" != /var/www/paymydine || ! -d "$root/.git" ]]; then
  echo 'STOP: unexpected application root.' >&2
  exit 2
fi
cd "$root"
if [[ "${EUID}" -eq 0 ]]; then
  echo 'STOP: run as the application deployment account, not root.' >&2
  exit 2
fi
exec 9> /tmp/pmd-pr509-install.lock
flock -n 9 || { echo 'STOP: another PR509 install/rollback is running.' >&2; exit 2; }
while IFS=$'\t' read -r kind path installed_sha; do
  [[ -n "$path" && "$path" != /* && "$path" != *'..'* && -f "$path" && ! -L "$path" ]] || {
    echo "STOP: missing, symlinked, or unsafe deployed file: $path" >&2; exit 2;
  }
  current_sha="$(sha256sum "$path" | awk '{print $1}')"
  [[ "$current_sha" == "$installed_sha" ]] || {
    echo "STOP: $path was changed after installation. Manual reconciliation required." >&2; exit 2;
  }
  if [[ "$kind" == existing ]]; then
    [[ -f "$backup/before/$path" ]] || { echo "STOP: backup missing $path" >&2; exit 2; }
  elif [[ "$kind" != new ]]; then
    echo "STOP: invalid manifest kind $kind" >&2; exit 2
  fi
done < "$backup/manifest.tsv"
while IFS=$'\t' read -r kind path installed_sha; do
  if [[ "$kind" == existing ]]; then
    cp -p "$backup/before/$path" "$path"
  else
    rm -f "$path"
  fi
done < "$backup/manifest.tsv"
php artisan view:clear
echo "PASS: PR509 file rollback completed; backup: $backup"
echo 'NOTE: restaurant schedule data entered AFTER install is not reverted automatically.'
