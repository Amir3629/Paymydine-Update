#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${1:-}"

if [[ -z "$HOST" ]]; then
  echo "Usage: bash scripts/pmd-staff-attendance-rollout.sh <tenant>.paymydine.com" >&2
  exit 2
fi

if [[ ! "$HOST" =~ ^[a-z0-9][a-z0-9-]*\.paymydine\.com$ ]]; then
  echo "ERROR: explicit *.paymydine.com tenant host required." >&2
  exit 2
fi

cd "$ROOT"

echo "===================================================="
echo "PMD STAFF ATTENDANCE ROLLOUT"
echo "TENANT: $HOST"
echo "===================================================="

echo
echo() { printf '%s\n' "$*"; }

echo "== 1/4 Read-only preflight =="
php scripts/pmd-staff-attendance-canary.php --tenant-host="$HOST"

echo
echo "== 2/4 Apply canonical attendance schema =="
php scripts/pmd-staff-attendance-canary.php --tenant-host="$HOST" --apply

echo
echo "== 3/4 Read-only verification =="
php scripts/pmd-staff-attendance-canary.php --tenant-host="$HOST"

echo
echo "== 4/4 Refresh Laravel runtime caches =="
php artisan optimize:clear

echo
echo "===================================================="
echo "PMD STAFF ATTENDANCE ROLLOUT: PASS"
echo "No historical attendance rows were fabricated."
echo "Actual worked hours begin with real PMD clock-in/out records."
echo "===================================================="
