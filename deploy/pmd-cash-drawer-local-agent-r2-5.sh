#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="feature/cash-drawer-local-agent-r2-5"
BASE="$(mktemp /tmp/pmd-r24-base.XXXXXX.sh)"
OUT="$(mktemp /tmp/pmd-r25-live.XXXXXX.sh)"
trap 'rm -f "$BASE" "$OUT"' EXIT

[[ "$(id -u)" -eq 0 ]] || { echo "PMD R2.5: run with sudo/root" >&2; exit 1; }
[[ -d "$ROOT/.git" ]] || { echo "PMD R2.5: repository not found: $ROOT" >&2; exit 1; }

cd "$ROOT"
sudo -u ubuntu git -C "$ROOT" fetch origin "$BRANCH"
sudo -u ubuntu git -C "$ROOT" show FETCH_HEAD:deploy/pmd-cash-drawer-local-agent-r2-4.sh > "$BASE"

python3 - "$BASE" "$OUT" <<'PY'
from pathlib import Path
import sys

src = Path(sys.argv[1]).read_text()

src = src.replace(
    'BRANCH="feature/cash-drawer-local-agent-r2-4"',
    'BRANCH="feature/cash-drawer-local-agent-r2-5"'
)
src = src.replace('PMD CASH DRAWER R2.4 REFUSED:', 'PMD CASH DRAWER R2.5 REFUSED:')
src = src.replace('AUTOMATIC PMD CASH DRAWER R2.4 CODE ROLLBACK', 'AUTOMATIC PMD CASH DRAWER R2.5 CODE ROLLBACK')
src = src.replace('PMD CASH DRAWER R2.4 CODE ROLLBACK COMPLETE', 'PMD CASH DRAWER R2.5 CODE ROLLBACK COMPLETE')
src = src.replace('FETCH CASH-DRAWER R2.4', 'FETCH CASH-DRAWER R2.5')
src = src.replace('ACTIVATE CASH DRAWER R2.4', 'ACTIVATE CASH DRAWER R2.5')
src = src.replace('PMD CASH DRAWER + LOCAL POS AGENT R2.4 DEPLOYED', 'PMD CASH DRAWER + LOCAL POS AGENT R2.5 DEPLOYED')

# Patch the exact live System provider, not a repository copy.
src = src.replace(
    '  "app/admin/routes.php"\n',
    '  "app/admin/routes.php"\n  "app/system/ServiceProvider.php"\n'
)

needle = 'repo_git show "$FETCH_REF:deploy/pmd-cash-drawer-local-agent-r2-4-patch.py" > "$STAGE/r24-patch.py" || fail "R2.4 patcher missing"\n'
insert = needle + 'repo_git show "$FETCH_REF:deploy/pmd-cash-drawer-local-agent-r2-5-patch.py" > "$STAGE/r25-patch.py" || fail "R2.5 patcher missing"\n'
if needle not in src:
    raise SystemExit('R2.5 wrapper: R2.4 patcher extraction anchor missing')
src = src.replace(needle, insert, 1)

needle = 'python3 "$STAGE/r24-patch.py" "$STAGE/files" || fail "R2.4 route authority patch failed"\n'
insert = needle + 'python3 "$STAGE/r25-patch.py" "$STAGE/files" || fail "R2.5 global route authority patch failed"\n'
if needle not in src:
    raise SystemExit('R2.5 wrapper: R2.4 patch invocation anchor missing')
src = src.replace(needle, insert, 1)

old_compile = 'python3 -m py_compile "$STAGE/r2-patch.py" "$STAGE/r23-patch.py" "$STAGE/r24-patch.py" || fail "Python patcher syntax failed"'
new_compile = 'python3 -m py_compile "$STAGE/r2-patch.py" "$STAGE/r23-patch.py" "$STAGE/r24-patch.py" "$STAGE/r25-patch.py" || fail "Python patcher syntax failed"'
if old_compile not in src:
    raise SystemExit('R2.5 wrapper: py_compile anchor missing')
src = src.replace(old_compile, new_compile, 1)

old_contract = '''# One route owner only: Admin ServiceProvider -> app/admin/routes.php.
! grep -q "PMD_LOCAL_POS_AGENT_R1_ROUTE_LOADER" "$STAGE/files/routes/api.php" || fail "Old routes/api.php Agent loader is still active"
grep -q "PMD_LOCAL_POS_AGENT_ADMIN_ROUTE_LOADER_R24" "$STAGE/files/app/admin/routes.php" || fail "Admin Agent route loader missing"
'''
new_contract = '''# One global route owner only: System ServiceProvider.
! grep -q "PMD_LOCAL_POS_AGENT_R1_ROUTE_LOADER" "$STAGE/files/routes/api.php" || fail "Old routes/api.php Agent loader is still active"
! grep -q "PMD_LOCAL_POS_AGENT_ADMIN_ROUTE_LOADER_R24" "$STAGE/files/app/admin/routes.php" || fail "Old Admin Agent route loader is still active"
grep -q "PMD_LOCAL_POS_AGENT_SYSTEM_ROUTE_LOADER_R25" "$STAGE/files/app/system/ServiceProvider.php" || fail "Global System Agent route loader missing"
'''
if old_contract not in src:
    raise SystemExit('R2.5 wrapper: route contract anchor missing')
src = src.replace(old_contract, new_contract, 1)

old_post = 'grep -q \'PMD_LOCAL_POS_AGENT_ADMIN_ROUTE_LOADER_R24\' "$ROOT/app/admin/routes.php" || fail "Live Admin Agent route loader missing"'
new_post = 'grep -q \'PMD_LOCAL_POS_AGENT_SYSTEM_ROUTE_LOADER_R25\' "$ROOT/app/system/ServiceProvider.php" || fail "Live global System Agent route loader missing"'
if old_post not in src:
    raise SystemExit('R2.5 wrapper: post-deploy route marker anchor missing')
src = src.replace(old_post, new_post, 1)

src = src.replace(
    'Agent route authority: Admin ServiceProvider -> app/admin/routes.php -> /api/v1/pmd-pos-agent/*',
    'Agent route authority: System ServiceProvider -> /api/v1/pmd-pos-agent/*'
)

Path(sys.argv[2]).write_text(src)
PY

chmod 700 "$OUT"
bash -n "$OUT"

echo "============================================================"
echo "PMD CASH DRAWER + LOCAL POS AGENT R2.5"
echo "GLOBAL SYSTEM ROUTE AUTHORITY"
echo "============================================================"
exec bash "$OUT"
