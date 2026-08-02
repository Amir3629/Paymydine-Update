#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/../../.." && pwd)
backup=$(cd "$(dirname "$0")" && pwd)
cd "$repo"
while read -r _ file; do
  cp -a "$backup/$file" "$repo/$file"
done < "$backup/SHA256SUMS.before"
sha256sum -c "$backup/SHA256SUMS.before"
