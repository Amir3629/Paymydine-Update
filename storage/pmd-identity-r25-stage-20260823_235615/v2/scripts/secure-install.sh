#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: Node.js and npm are required." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "ERROR: Node.js 20+ is required. Found $(node -v)." >&2
  exit 1
fi

echo "PMD V2 secure install"
echo "node=$(node -v) npm=$(npm -v)"
echo "Installing exact root dependency pins and generating a fresh lockfile..."

# package.json pins every root dependency exactly. No --force is used.
npm install --package-lock
npm audit fix
npm audit --omit=dev

echo "PMD V2 secure install: PASS"
echo "Generated lock: $ROOT/package-lock.json"
