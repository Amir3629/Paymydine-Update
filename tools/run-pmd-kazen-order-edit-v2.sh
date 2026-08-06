#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_COMMIT="cbb9c4238a5ef66763a5f8403ccb81ad9e40b812"
ASSET_COMMIT="097bc59f3467f1eaa86a0f1427a621a6ec274a1d"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update"
TMP="$(mktemp -d /tmp/pmd-kazen-order-edit-v2-runner.XXXXXX)"
DEPLOY="$TMP/deploy.sh"

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "============================================================"
echo "PayMyDine — Kazen + Order Edit V2 Runner"
echo "============================================================"

curl -fsSL --retry 3 --retry-delay 2 \
  "$RAW_BASE/$DEPLOY_COMMIT/tools/deploy-pmd-kazen-order-edit-v2.sh" \
  -o "$DEPLOY"

OLD='ASSET_COMMIT="e22f9ad067b90a2232724393c7d010afffda68fc"'
NEW="ASSET_COMMIT=\"$ASSET_COMMIT\""
COUNT="$(grep -Fxc "$OLD" "$DEPLOY" || true)"

if [ "$COUNT" -ne 1 ]; then
  echo "ERROR: Expected one reviewed asset commit declaration; found $COUNT."
  echo "Nothing was executed."
  exit 1
fi

python3 - "$DEPLOY" "$OLD" "$NEW" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
old = sys.argv[2]
new = sys.argv[3]
text = path.read_text()

if text.count(old) != 1:
    raise SystemExit("asset commit replacement guard failed")

path.write_text(text.replace(old, new, 1))
PY

bash -n "$DEPLOY"
grep -Fq "ASSET_COMMIT=\"$ASSET_COMMIT\"" "$DEPLOY"
grep -q 'PMD_KAZEN_MENU_ITEM_SELECTED_COUNT_STABLE_V2' "$DEPLOY"
grep -q 'PMD_ORDER_EDIT_V2_LOADER' "$DEPLOY"

echo "Runner syntax: PASSED"
echo "Stable frontend asset revision: PINNED"
echo "Production changes before guarded deploy: NONE"

echo
bash "$DEPLOY"
