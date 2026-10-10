#!/usr/bin/env bash
# PayMyDine R30 guarded dirty-worktree-aware VPS installation.
# Never reset/clean/stash/pull blindly. No database or Meta changes here.
set -euo pipefail
umask 077

die() { printf 'STOP: %s\n' "$*" >&2; exit 1; }
msg() { printf '%s\n' "$*"; }
[ "$#" -eq 2 ] || die "Usage: script TARGET_COMMIT_SHA --dry-run|--apply"
TARGET="$1"
MODE="$2"
APP=/var/www/paymydine
REQUIRED_R30=27a6b2aa5dc2263f8c6643c59ae41441d1727cdf
[[ "$TARGET" =~ ^[a-f0-9]{40}$ ]] || die "Target must be a full 40-character commit SHA."
[[ "$MODE" = --dry-run || "$MODE" = --apply ]] || die "Select --dry-run or --apply."
[ "$(id -un)" = ubuntu ] || die "Run as ubuntu, not root."
[ -d "$APP/.git" ] || die "Expected Git checkout does not exist."
cd "$APP" || exit 1
[ "$(git branch --show-current)" = main ] || die "VPS must be on main."
CURRENT="$(git rev-parse HEAD)"
git diff --cached --quiet || die "Index contains staged changes. Stop."
[ -z "$(git ls-files --unmerged)" ] || die "Index has unresolved conflicts."

exec 9>/tmp/pmd-r30-guarded-vps.lock
flock -n 9 || die "Another guarded install is running."
msg "=== PayMyDine guarded production code sync ==="
msg "VPS HEAD: $CURRENT"
msg "Expected GitHub main: $TARGET"
git fetch origin main || die "GitHub fetch failed."
[ "$(git rev-parse origin/main)" = "$TARGET" ] || die "GitHub main advanced unexpectedly; review first."
git merge-base --is-ancestor "$CURRENT" "$TARGET" || die "This VPS HEAD is not a target ancestor."
git merge-base --is-ancestor "$REQUIRED_R30" "$TARGET" || die "Target excludes reviewed R30 security work."

# Reject Git operations that delete/rename files or use special object types.
while IFS=$'\t' read -r change rel; do
    [ -n "$change" ] || continue
    case "$change" in
        A|M) ;;
        *) die "Unsupported Git change: $change $rel" ;;
    esac
done < <(git diff --name-status "$CURRENT" "$TARGET")

BACKUP_ROOT=/home/ubuntu/paymydine-vps-backups
mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"
BACKUP="$(mktemp -d "$BACKUP_ROOT/r30-XXXXXXXX")"
STAGE="$BACKUP/stage"
mkdir -p "$STAGE"
msg "Private backup directory: $BACKUP"
git status --porcelain=v1 --untracked-files=all > "$BACKUP/status-before.txt"
git diff --name-status "$CURRENT" "$TARGET" > "$BACKUP/target-diff.txt"
printf 'base=%s\ntarget=%s\n' "$CURRENT" "$TARGET" > "$BACKUP/commits.txt"
INDEX="$(git rev-parse --git-path index)"
[ -f "$INDEX" ] || die "Git index is missing."
cp -p "$INDEX" "$BACKUP/index-before"

CHANGED="$BACKUP/changed-paths.nul"
git diff --name-only --diff-filter=AM -z "$CURRENT" "$TARGET" > "$CHANGED"
[ -s "$CHANGED" ] || die "No files to update."

# Backup all user-edited/untracked files, not only files from this release.
# An unrelated Restaurant Groups edit is never discarded.
ARCHIVE_PATHS="$BACKUP/archive-paths.nul"
git ls-files -m -o --exclude-standard -z > "$ARCHIVE_PATHS"

count=0
need=0
while IFS= read -r -d '' rel; do
    count=$((count + 1))
    [[ "$rel" =~ ^[A-Za-z0-9_./+-]+$ ]] || die "Unsupported filename; review manually."
    case "$rel" in
        .env|.git/*|vendor/*) die "Protected path in GitHub diff: $rel" ;;
    esac

    # Never follow an unexpected filesystem symlink while copying.
    parent="$rel"
    while [ "$parent" != "." ] && [ "$parent" != "/" ]; do
        [ ! -L "$parent" ] || die "Unsafe symlink: $parent"
        parent="$(dirname "$parent")"
    done

    permission="$(git ls-tree "$TARGET" -- "$rel" | awk '{print $1}')"
    [[ "$permission" = 100644 || "$permission" = 100755 ]] \
        || die "Unsupported Git mode for $rel"

    mkdir -p "$STAGE/$(dirname "$rel")"
    git show "$TARGET:$rel" > "$STAGE/$rel"
    if [[ "$rel" = *.php ]]; then
        php -l "$STAGE/$rel" >/dev/null || die "PHP syntax error: $rel"
    fi
    if [[ "$rel" = *.sh ]]; then
        bash -n "$STAGE/$rel" || die "Shell syntax error: $rel"
    fi

    if [ -e "$rel" ]; then
        [ -f "$rel" ] || die "Existing path not a regular file: $rel"
        printf '%s\0' "$rel" >> "$ARCHIVE_PATHS"
        if cmp -s "$STAGE/$rel" "$rel"; then
            msg "PRESENT / TARGET MATCH: $rel"
            continue
        fi
        if git cat-file -e "$CURRENT:$rel" 2>/dev/null; then
            git show "$CURRENT:$rel" | cmp -s - "$rel" \
                || die "CONFLICT: $rel differs from both current HEAD and target; no changes made."
        else
            die "CONFLICT: untracked $rel differs from GitHub target; no changes made."
        fi
    else
        if git cat-file -e "$CURRENT:$rel" 2>/dev/null; then
            die "Tracked $rel is missing on VPS. No changes made."
        fi
    fi
    need=$((need + 1))
    msg "SAFE TO INSTALL: $rel"
done < "$CHANGED"

sort -zu "$ARCHIVE_PATHS" -o "$ARCHIVE_PATHS"
tar -C "$APP" -czpf "$BACKUP/files-before.tar.gz" --null -T "$ARCHIVE_PATHS" \
    || die "Backup failed; no files changed."
[ -s "$BACKUP/files-before.tar.gz" ] || die "Backup archive is empty."

msg "=== PRE-FLIGHT PASSED ==="
msg "Compared $count paths; $need require installation."
msg "Backup archive: $BACKUP/files-before.tar.gz"
if [ "$MODE" = --dry-run ]; then
    msg "DRY RUN: no application files or Git metadata changed."
    exit 0
fi

printf 'Type APPLY to install reviewed files (anything else cancels): '
IFS= read -r answer
[ "$answer" = APPLY ] || die "Cancelled. No application files changed."

# Re-validate source/tree and every target file against our preflight.
[ "$(git rev-parse HEAD)" = "$CURRENT" ] || die "HEAD changed during preflight."
[ "$(git rev-parse origin/main)" = "$TARGET" ] || die "Remote ref changed."
git diff --cached --quiet || die "Index changed during preflight."
while IFS= read -r -d '' rel; do
    if [ -e "$rel" ]; then
        if cmp -s "$STAGE/$rel" "$rel"; then continue; fi
        git cat-file -e "$CURRENT:$rel" 2>/dev/null \
            || die "Untracked file changed during preflight: $rel"
        git show "$CURRENT:$rel" | cmp -s - "$rel" \
            || die "Tracked file changed during preflight: $rel"
    else
        if git cat-file -e "$CURRENT:$rel" 2>/dev/null; then
            die "Tracked file vanished during preflight: $rel"
        fi
    fi
done < "$CHANGED"

# Write only previously validated regular files. Preserve existing file
# ownership; never change unrelated paths or manually edit other services.
while IFS= read -r -d '' rel; do
    if [ -f "$rel" ] && cmp -s "$STAGE/$rel" "$rel"; then continue; fi
    permission="$(git ls-tree "$TARGET" -- "$rel" | awk '{print $1}')"
    if [ "$permission" = 100755 ]; then mode=755; else mode=644; fi
    if [ -f "$rel" ]; then
        owner="$(stat -c %u "$rel")"
        group="$(stat -c %g "$rel")"
    else
        owner="$(id -u)"
        group="$(id -g)"
    fi
    sudo install -D -o "$owner" -g "$group" -m "$mode" \
        "$STAGE/$rel" "$APP/$rel" \
        || die "Install failed at $rel. Backup: $BACKUP"
    cmp -s "$STAGE/$rel" "$rel" \
        || die "Post-install checksum failed: $rel. Backup: $BACKUP"
done < "$CHANGED"

while IFS= read -r -d '' rel; do
    cmp -s "$STAGE/$rel" "$rel" \
        || die "Unexpected change after copy: $rel"
done < "$CHANGED"
[ "$(git rev-parse HEAD)" = "$CURRENT" ] || die "HEAD changed before metadata update."

# Reconcile Git INDEX and HEAD without touching any unrelated working files.
# A complete copy and original index are retained if this final step fails.
git read-tree "$TARGET" || die "Git index update failed. See saved index at $BACKUP."
git update-ref refs/heads/main "$TARGET" "$CURRENT" \
    || die "Branch update failed. Recover index using backup: $BACKUP/index-before"

msg "=== CODE SYNC COMPLETE ==="
git rev-parse HEAD
git status --short
msg "Private backup: $BACKUP"
msg "Meta webhook disabled by default; no database or .env or Nginx changes."
msg "Next: check staging, backup central DB, install WhatsApp tables and configure Meta."
