#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-smoke}"

cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${PMD_BASE_URL:=https://mimoza.paymydine.com}"
: "${PMD_FINAL_PATH:=/admin/dashboardwaiternewfinal}"

if [[ -z "${PMD_USERNAME:-}" || -z "${PMD_PASSWORD:-}" ]]; then
  echo "ERROR: PMD_USERNAME and PMD_PASSWORD are required."
  echo "Copy .env.example to .env, or export credentials for this shell."
  exit 1
fi

if [[ ! -x node_modules/.bin/playwright ]]; then
  echo "== Installing QA dependencies =="
  npm install
fi

if [[ "${PMD_SKIP_BROWSER_INSTALL:-0}" != "1" ]]; then
  echo "== Ensuring Playwright Chromium is installed =="
  npx playwright install chromium
fi

mkdir -p test-results playwright-report

case "$MODE" in
  smoke)
    npm run test:smoke
    ;;
  full)
    npm run test:full
    ;;
  responsive)
    npm run test:responsive
    ;;
  stability)
    npm run test:stability
    ;;
  mutations)
    if [[ "${PMD_ALLOW_MUTATIONS:-0}" != "1" ]]; then
      echo "ERROR: mutations mode requires PMD_ALLOW_MUTATIONS=1."
      exit 1
    fi
    npm run test:mutations
    ;;
  headed)
    npm run test:headed
    ;;
  ui)
    npm run test:ui
    ;;
  *)
    echo "Usage: $0 {smoke|full|responsive|stability|mutations|headed|ui}"
    exit 2
    ;;
esac

echo
echo "QA complete. HTML report:"
echo "$ROOT/playwright-report/index.html"
echo
echo "Open it with:"
echo "cd '$ROOT' && npx playwright show-report playwright-report"
