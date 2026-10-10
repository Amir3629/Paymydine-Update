#!/usr/bin/env bash
# No VPS access required. Exercise guarded dry-run in an isolated fake Git repo.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
SOURCE="$TMP/checkout"
REMOTE="$TMP/remote.git"
mkdir -p "$SOURCE"
git init -q -b main "$SOURCE"
git -C "$SOURCE" config user.email test@example.invalid
git -C "$SOURCE" config user.name "R30 QA Fixture"
printf 'old\n' > "$SOURCE/a.txt"
git -C "$SOURCE" add a.txt
git -C "$SOURCE" commit -qm base
BASE="$(git -C "$SOURCE" rev-parse HEAD)"
git clone -q --bare "$SOURCE" "$REMOTE"
git -C "$SOURCE" remote add origin "$REMOTE"
printf 'new\n' > "$SOURCE/a.txt"
printf 'added\n' > "$SOURCE/b.txt"
git -C "$SOURCE" add a.txt b.txt
git -C "$SOURCE" commit -qm target
TARGET="$(git -C "$SOURCE" rev-parse HEAD)"
git -C "$SOURCE" push -q origin main
# All reset operations below are ONLY in the disposable fixture.
git -C "$SOURCE" reset -q --hard "$BASE"
cp "$ROOT/scripts/pmd-r30-guarded-vps-sync.sh" "$TMP/guarded.sh"
sed -i \
    -e "s@^APP=/var/www/paymydine\$@APP=$SOURCE@" \
    -e "s@^BACKUP_ROOT=/home/ubuntu/paymydine-vps-backups\$@BACKUP_ROOT=$TMP/backups@" \
    -e "s@^REQUIRED_R30=.*@REQUIRED_R30=$BASE@" \
    -e '/Run as ubuntu, not root/d' "$TMP/guarded.sh"

# Case 1: partially deployed file is exactly target; other file is old.
cp "$ROOT/scripts/pmd-r30-guarded-vps-sync.sh" "$TMP/reference.sh"
git -C "$SOURCE" show "$TARGET:a.txt" > "$SOURCE/a.txt"
echo "unrelated local workspace edit" > "$SOURCE/untouched.txt"
bash "$TMP/guarded.sh" "$TARGET" --dry-run > "$TMP/pass.log"
grep -Fq "DRY RUN: no application files" "$TMP/pass.log"
[ "$(cat "$SOURCE/untouched.txt")" = "unrelated local workspace edit" ]
[ "$(git -C "$SOURCE" rev-parse HEAD)" = "$BASE" ]
[ ! -e "$SOURCE/b.txt" ]
echo "PASS: dry-run tolerates exact target matches and preserves unrelated edits"

# Case 2: dirty tracked contents differ from old and target; reject.
printf 'unknown local edit\n' > "$SOURCE/a.txt"
if bash "$TMP/guarded.sh" "$TARGET" --dry-run > "$TMP/reject.log" 2>&1; then
    echo "FAIL: guarded installer accepted a conflicting local edit"
    exit 1
fi
grep -Fq "CONFLICT:" "$TMP/reject.log"
[ "$(cat "$SOURCE/a.txt")" = "unknown local edit" ]
[ "$(git -C "$SOURCE" rev-parse HEAD)" = "$BASE" ]
echo "PASS: conflicting edits abort without touching worktree or HEAD"

# Case 3: untracked new file with different data must not be overwritten.
printf 'old\n' > "$SOURCE/a.txt"
echo 'user-owned content' > "$SOURCE/b.txt"
if bash "$TMP/guarded.sh" "$TARGET" --dry-run > "$TMP/new-conflict.log" 2>&1; then
    echo "FAIL: installer accepted unknown untracked file"
    exit 1
fi
grep -Fq "CONFLICT:" "$TMP/new-conflict.log"
[ "$(cat "$SOURCE/b.txt")" = "user-owned content" ]
echo "PASS: untracked collisions abort"

echo "PASS: R30 guarded installer fake-repository regression checks."
