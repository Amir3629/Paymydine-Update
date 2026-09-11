#!/usr/bin/env bash
set -Eeuo pipefail

# PMD_REPO_ONLY_PRESERVE_V2
# Run AFTER the VPS rsync and BEFORE git add/commit in the snapshot workflow.
# The VPS intentionally does not contain Desktop build/release source, so a
# clean VPS snapshot must restore repo-only paths from the GitHub base commit.

BASE_COMMIT="${BASE_COMMIT:-}"

if [[ -z "$BASE_COMMIT" ]]; then
  echo 'ERROR: BASE_COMMIT is required.' >&2
  exit 1
fi

if ! git cat-file -e "$BASE_COMMIT^{commit}" 2>/dev/null; then
  echo "ERROR: BASE_COMMIT is not available locally: $BASE_COMMIT" >&2
  exit 1
fi

REPO_ONLY_PATHS=(
  '.github'
  'apps/cashier-desktop'
)

for path in "${REPO_ONLY_PATHS[@]}"; do
  if git cat-file -e "$BASE_COMMIT:$path" 2>/dev/null; then
    git restore --source="$BASE_COMMIT" --staged --worktree -- "$path"
    echo "PRESERVED_REPO_ONLY=$path"
  else
    echo "REPO_ONLY_PATH_NOT_IN_BASE=$path"
  fi
done

for path in "${REPO_ONLY_PATHS[@]}"; do
  if git cat-file -e "$BASE_COMMIT:$path" 2>/dev/null && [[ ! -e "$path" ]]; then
    echo "ERROR: repo-only path disappeared after restore: $path" >&2
    exit 1
  fi
done

echo 'PMD_REPO_ONLY_PRESERVE_V2=PASS'
