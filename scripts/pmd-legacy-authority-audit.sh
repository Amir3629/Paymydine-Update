#!/usr/bin/env bash
set -eu

# PMD legacy authority inventory (READ ONLY).
# This is intentionally an inventory, not an automatic deletion tool.
# Retirement must happen in narrow PRs after route/runtime references are proven gone.

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

printf '== Tracked backup/recovery-looking files ==\n'
git ls-files | grep -E '(^|/)(\.pmd-hotfix-backups|storage/.*(backup|recovery|audit)|.*\.(bak|backup|old)$|.*before.*|.*broken.*|.*hotfix_bak.*)' | sed -n '1,300p' || true

printf '\n== Browser repair-layer signals in active frontend source ==\n'
for dir in frontend frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815; do
  [ -d "$dir" ] || continue
  grep -RInE 'MutationObserver|querySelector\(|style\.setProperty|requestAnimationFrame\(.*style|emergency|final2|V2[0-9]' "$dir" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude='*.map' 2>/dev/null | sed -n '1,300p' || true
done

printf '\n== Retired browser authority references ==\n'
git grep -n -E 'reservations2|reservations3|dashboardwaiternew|waiter-workstation|dashboardwaiterworkstation' -- \
  ':!storage/**' ':!.pmd-hotfix-backups/**' 2>/dev/null | sed -n '1,300p' || true

printf '\n== Policy ==\n'
printf '%s\n' 'Do not delete automatically.'
printf '%s\n' 'For each retirement PR: identify replacement authority, prove runtime references are gone, add regression coverage, then delete the narrow legacy set.'
