#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="feature/cash-drawer-local-agent-r1"
TMP="$(mktemp /tmp/pmd-cash-drawer-local-agent-r1-base.XXXXXX.sh)"

cleanup() { rm -f "$TMP" 2>/dev/null || true; }
trap cleanup EXIT

[[ "$(id -u)" -eq 0 ]] || { echo "Run FINAL with sudo/root." >&2; exit 1; }
[[ -d "$ROOT/.git" ]] || { echo "PayMyDine Git repo not found: $ROOT" >&2; exit 1; }

# Repository operations always run as the production repo owner. Root is used
# only by the underlying deployer for exact file install/schema/service reload.
sudo -u ubuntu git -C "$ROOT" fetch origin "$BRANCH"
sudo -u ubuntu git -C "$ROOT" show FETCH_HEAD:deploy/pmd-cash-drawer-local-agent-r1.sh > "$TMP"

python3 - "$TMP" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

# R1 pairing controller: one-time per-device pairing token, never a shared
# bootstrap credential embedded in the downloaded Windows connector.
needle = '  "app/admin/controllers/Api/PosAgentController.php"\n'
addition = '  "app/admin/controllers/Api/PosAgentR1Controller.php"\n'
if addition not in s:
    count = s.count(needle)
    if count < 3:
        raise SystemExit(f'Expected PosAgentController array entries, found {count}')
    s = s.replace(needle, needle + addition)

# Run Git reads as ubuntu even though activation is root.
s = s.replace(
    'HEAD_BEFORE="$(git rev-parse HEAD)"',
    'HEAD_BEFORE="$(sudo -u ubuntu git -C "$ROOT" rev-parse HEAD)"'
)
s = s.replace(
    'BRANCH_BEFORE="$(git branch --show-current)"',
    'BRANCH_BEFORE="$(sudo -u ubuntu git -C "$ROOT" branch --show-current)"'
)
s = s.replace(
    'git fetch origin "$BRANCH" || fail "Unable to fetch $BRANCH"',
    'sudo -u ubuntu git -C "$ROOT" fetch origin "$BRANCH" || fail "Unable to fetch $BRANCH"'
)
s = s.replace(
    'git show "$FETCH_REF:$rel" > "$STAGE/files/$rel" || fail "Unable to stage $rel"',
    'sudo -u ubuntu git -C "$ROOT" show "$FETCH_REF:$rel" > "$STAGE/files/$rel" || fail "Unable to stage $rel"'
)
s = s.replace(
    'HEAD_AFTER="$(git rev-parse HEAD)"',
    'HEAD_AFTER="$(sudo -u ubuntu git -C "$ROOT" rev-parse HEAD)"'
)

# Never distribute the legacy/global POS_AGENT_TOKEN in the Windows BAT. R1
# uses only a random one-time pairing token, then a per-device credential.
anchor = 'log "4. SOURCE CONTRACT + SYNTAX"\n'
if 'PMD_R1_NO_SHARED_AGENT_SECRET_IN_INSTALLER' not in s:
    if anchor not in s:
        raise SystemExit('Source contract anchor missing')
    block = r'''# PMD_R1_NO_SHARED_AGENT_SECRET_IN_INSTALLER
python3 - "$STAGE/files/app/admin/controllers/CashDrawers.php" <<'PYR1SEC'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
old="$token = config('cashdrawer.agent_token');"
new="$token = ''; // PMD_R1_PER_DEVICE_PAIRING_ONLY"
if old in s:
    s=s.replace(old,new,1)
if new not in s:
    raise SystemExit('Unable to disable shared Agent token in Windows connector')
p.write_text(s)
PYR1SEC

'''
    s = s.replace(anchor, block + anchor, 1)

# Add explicit contract checks for the R1 pairing authority and installer.
contract_anchor = "grep -q 'agent_token_hash' \"$STAGE/files/app/admin/controllers/Api/PosAgentController.php\" || fail \"Per-device token authority missing\"\n"
if 'One-time R1 pairing authority missing' not in s:
    if contract_anchor not in s:
        raise SystemExit('Per-device token contract anchor missing')
    s = s.replace(
        contract_anchor,
        contract_anchor
        + "grep -q 'class PosAgentR1Controller' \"$STAGE/files/app/admin/controllers/Api/PosAgentR1Controller.php\" || fail \"One-time R1 pairing authority missing\"\n"
        + "grep -q 'PMD_R1_PER_DEVICE_PAIRING_ONLY' \"$STAGE/files/app/admin/controllers/CashDrawers.php\" || fail \"Windows installer still exposes shared Agent auth\"\n",
        1,
    )

p.write_text(s)
PY

bash -n "$TMP"

grep -q 'PosAgentR1Controller.php' "$TMP"
grep -q 'PMD_R1_NO_SHARED_AGENT_SECRET_IN_INSTALLER' "$TMP"
grep -q 'sudo -u ubuntu git -C' "$TMP"

echo "============================================================"
echo "PMD CASH DRAWER + LOCAL POS AGENT R1 FINAL"
echo "============================================================"
echo "Final safety overlay: OK"

env \
  PMD_ROOT="$ROOT" \
  TEST_HOST="${TEST_HOST:-a.paymydine.com}" \
  EXPECTED_HEAD="${EXPECTED_HEAD:-71750b33cc21b7ddcef24c946c5ccd01b2b83864}" \
  PHP_FPM="${PHP_FPM:-php8.3-fpm}" \
  bash "$TMP"
