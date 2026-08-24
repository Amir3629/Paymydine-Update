#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="feature/cash-drawer-local-agent-r2-7"
BASE="$(mktemp /tmp/pmd-r27-base.XXXXXX.sh)"
OUT="$(mktemp /tmp/pmd-r27-final.XXXXXX.sh)"
trap 'rm -f "$BASE" "$OUT"' EXIT

[[ "$(id -u)" -eq 0 ]] || { echo "PMD R2.7 FINAL: run with sudo/root" >&2; exit 1; }
[[ -d "$ROOT/.git" ]] || { echo "PMD R2.7 FINAL: repository not found: $ROOT" >&2; exit 1; }

cd "$ROOT"
sudo -u ubuntu git -C "$ROOT" fetch origin "$BRANCH"
sudo -u ubuntu git -C "$ROOT" show FETCH_HEAD:deploy/pmd-cash-drawer-local-agent-r2-7.sh > "$BASE"

python3 - "$BASE" "$OUT" <<'PY'
from pathlib import Path
import sys

src = Path(sys.argv[1]).read_text()
lines = src.splitlines()
out = []
inserted_contract = False
inserted_agent_code = False
inserted_agent_assert = False

for line in lines:
    out.append(line)

    if (
        "PMD_CASH_DRAWER_DIRECT_AGENT_DOWNLOAD_R27" in line
        and "grep -q" in line
        and not inserted_contract
    ):
        out.append("grep -q 'pmd-pos-agent.php?action=agent' \"$STAGE/files/app/admin/controllers/CashDrawers.php\" || fail \"Windows connector is not using the direct Agent package gateway\"")
        out.append("grep -q 'PMD_CASH_DRAWER_WINDOWS_CLEAN_REINSTALL_R27' \"$STAGE/files/app/admin/controllers/CashDrawers.php\" || fail \"Windows connector clean reinstall guard missing\"")
        inserted_contract = True

    if (
        line.startswith('HEALTH_CODE=')
        and 'pmd-pos-agent.php?action=health' in line
        and not inserted_agent_code
    ):
        out.append('AGENT_CODE="$(curl -k -sS -o /tmp/pmd-r27-agent.out -w \'%{http_code}\' \"https://$TEST_HOST/pmd-pos-agent.php?action=agent&r27=$(date +%s)\")"')
        inserted_agent_code = True

    if line.startswith('echo "gateway_health=$HEALTH_CODE'):
        out[-1] = 'echo "gateway_health=$HEALTH_CODE agent_package=$AGENT_CODE unauth_pull=$PULL_CODE empty_pair=$PAIR_CODE"'

    if (
        line.strip() == '[[ "$HEALTH_CODE" == "200" ]] || fail "Direct Local POS gateway health is not 200"'
        and not inserted_agent_assert
    ):
        out.append('[[ "$AGENT_CODE" == "200" ]] || fail "Direct Local POS Agent package is not 200"')
        out.append("grep -q 'PayMyDine-LocalPosAgent' /tmp/pmd-r27-agent.out || fail \"Direct gateway Agent package body is invalid\"")
        out.append("grep -q 'pmd-pos-agent.php?action=pair' /tmp/pmd-r27-agent.out || fail \"Direct gateway Agent package is not using R2.7 pair transport\"")
        out.append("grep -q 'X-PMD-Device-Token' /tmp/pmd-r27-agent.out || fail \"Direct gateway Agent package lacks FastCGI token fallback\"")
        inserted_agent_assert = True

if not inserted_contract:
    raise SystemExit('R2.7 FINAL: direct Agent download contract insertion point missing')
if not inserted_agent_code:
    raise SystemExit('R2.7 FINAL: gateway health insertion point missing')
if not inserted_agent_assert:
    raise SystemExit('R2.7 FINAL: gateway health assertion insertion point missing')

Path(sys.argv[2]).write_text('\n'.join(out) + '\n')
PY

chmod 700 "$OUT"
bash -n "$OUT"

echo "============================================================"
echo "PMD CASH DRAWER + LOCAL POS AGENT R2.7 FINAL"
echo "DIRECT PHP GATEWAY + CLEAN WINDOWS REINSTALL"
echo "============================================================"

exec bash "$OUT"
