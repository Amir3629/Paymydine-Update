#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="agent/waiter-final-playwright-qa-v1"
REF="origin/$BRANCH"
TARGET="$LIVE/qa/waiter-final-playwright"

TS="$(date +%Y%m%d_%H%M%S)"
TMP="/tmp/pmd-waiter-final-playwright-qa-v1-$TS"
BACKUP="/var/backups/pmd-waiter-final-playwright-qa-v1-$TS"
INSTALLED=0

FILES=(
  qa/waiter-final-playwright/package.json
  qa/waiter-final-playwright/.gitignore
  qa/waiter-final-playwright/.env.example
  qa/waiter-final-playwright/playwright.config.js
  qa/waiter-final-playwright/README.md
  qa/waiter-final-playwright/src/config.js
  qa/waiter-final-playwright/src/auth.js
  qa/waiter-final-playwright/src/telemetry.js
  qa/waiter-final-playwright/src/fixtures.js
  qa/waiter-final-playwright/src/waiter.js
  qa/waiter-final-playwright/tests/auth.setup.js
  qa/waiter-final-playwright/tests/smoke.spec.js
  qa/waiter-final-playwright/tests/launcher.spec.js
  qa/waiter-final-playwright/tests/ordering.spec.js
  qa/waiter-final-playwright/tests/payment.spec.js
  qa/waiter-final-playwright/tests/visual-responsive.spec.js
  qa/waiter-final-playwright/tests/stability.spec.js
  qa/waiter-final-playwright/tests/operations.spec.js
  qa/waiter-final-playwright/scripts/run-waiter-final-qa.sh
)

cleanup() {
  rm -rf "$TMP"
}

rollback_on_error() {
  local code="$?"
  if [[ "$code" -ne 0 && "$INSTALLED" -eq 1 ]]; then
    echo
    echo "ERROR after installation. Restoring previous QA directory..."
    sudo rm -rf "$TARGET"
    if [[ -d "$BACKUP/waiter-final-playwright.before" ]]; then
      sudo cp -a "$BACKUP/waiter-final-playwright.before" "$TARGET"
    fi
    echo "Previous QA directory restored. Production waiter files were never touched."
  fi
  cleanup
  exit "$code"
}
trap rollback_on_error EXIT

cd "$LIVE"

printf '%s\n' \
  '========================================================' \
  'PMD Waiter Final Playwright QA V1 — isolated deployment' \
  '========================================================'

echo
echo "== Fetching isolated QA branch =="
git fetch --no-tags origin \
  "$BRANCH:refs/remotes/origin/$BRANCH"

echo "Branch commit:"
git rev-parse "$REF"

mkdir -p "$TMP"

for file in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$file")"
  git show "$REF:$file" > "$TMP/$file"
  echo "Extracted: $file"
done

echo
echo "== Validating staged QA sources =="

while IFS= read -r file; do
  node --check "$file"
done < <(find "$TMP/qa/waiter-final-playwright" -type f -name '*.js' | sort)

bash -n "$TMP/qa/waiter-final-playwright/scripts/run-waiter-final-qa.sh"

grep -Fq 'pmd-waiter-final-v1' \
  "$TMP/qa/waiter-final-playwright/tests/smoke.spec.js"
grep -Fq 'PMD_ALLOW_MUTATIONS' \
  "$TMP/qa/waiter-final-playwright/tests/operations.spec.js"
grep -Fq 'layoutShiftScore' \
  "$TMP/qa/waiter-final-playwright/src/telemetry.js"
grep -Fq 'dashboardwaiternewfinal' \
  "$TMP/qa/waiter-final-playwright/.env.example"

echo "PMD_WAITER_FINAL_PLAYWRIGHT_SOURCE_OK"

echo
echo "== Creating rollback backup =="
sudo mkdir -p "$BACKUP"
if [[ -d "$TARGET" ]]; then
  sudo cp -a "$TARGET" "$BACKUP/waiter-final-playwright.before"
fi
echo "Backup: $BACKUP"

echo
echo "== Installing only the isolated QA project =="
sudo mkdir -p "$TARGET"

# Preserve local runtime state and secrets across source updates.
ENV_BACKUP=""
if [[ -f "$TARGET/.env" ]]; then
  ENV_BACKUP="/tmp/pmd-waiter-final-qa-env-$TS"
  sudo cp -a "$TARGET/.env" "$ENV_BACKUP"
fi

NODE_MODULES_BACKUP=""
if [[ -d "$TARGET/node_modules" ]]; then
  NODE_MODULES_BACKUP="/tmp/pmd-waiter-final-qa-node_modules-$TS"
  sudo mv "$TARGET/node_modules" "$NODE_MODULES_BACKUP"
fi

sudo find "$TARGET" -mindepth 1 -maxdepth 1 \
  ! -name '.env' \
  ! -name 'playwright-report' \
  ! -name 'test-results' \
  -exec rm -rf {} +

sudo cp -a "$TMP/qa/waiter-final-playwright/." "$TARGET/"

if [[ -n "$ENV_BACKUP" && -f "$ENV_BACKUP" ]]; then
  sudo cp -a "$ENV_BACKUP" "$TARGET/.env"
  sudo rm -f "$ENV_BACKUP"
fi

if [[ -n "$NODE_MODULES_BACKUP" && -d "$NODE_MODULES_BACKUP" ]]; then
  sudo mv "$NODE_MODULES_BACKUP" "$TARGET/node_modules"
fi

sudo chown -R "$(id -u):$(id -g)" "$TARGET"
chmod +x "$TARGET/scripts/run-waiter-final-qa.sh"
INSTALLED=1

if [[ ! -f "$TARGET/.env" ]]; then
  cp "$TARGET/.env.example" "$TARGET/.env"
  chmod 600 "$TARGET/.env"
  echo "Created local .env from .env.example. Update credentials before running tests."
fi

echo
echo "== Installing Node dependencies =="
cd "$TARGET"
npm install

echo
echo "== Installing Playwright Chromium =="
if [[ "${PMD_SKIP_SYSTEM_DEPS:-0}" == "1" ]]; then
  npx playwright install chromium
else
  npx playwright install --with-deps chromium
fi

echo
echo "== Final validation and test discovery =="
node --check playwright.config.js
bash -n scripts/run-waiter-final-qa.sh
npx playwright --version
npm run validate

INSTALLED=0
trap cleanup EXIT

printf '%s\n' \
  '' \
  '========================================================' \
  'PMD Waiter Final Playwright QA V1 installed' \
  '========================================================' \
  '✓ Production waiter UI and backend files were untouched' \
  '✓ Smoke, full, responsive and stability suites installed' \
  '✓ Console/network/layout-shift/long-task telemetry installed' \
  '✓ Real order and payment mutations remain disabled by default' \
  '✓ HTML, JSON, JUnit, screenshot, video and trace reports enabled' \
  '✓ Playwright loaded and discovered every test successfully' \
  '' \
  "QA directory: $TARGET" \
  "Backup: $BACKUP" \
  '' \
  'Run after setting credentials:' \
  "cd '$TARGET'" \
  './scripts/run-waiter-final-qa.sh smoke' \
  '========================================================'
