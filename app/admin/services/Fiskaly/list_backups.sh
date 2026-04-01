#!/usr/bin/env bash
set -euo pipefail

echo "========================================"
echo "📂 ALL BACKUPS (sorted newest first)"
echo "========================================"

ls -lt FiskalySignDeService.php.bak_* 2>/dev/null || echo "❌ no backups found"

echo
echo "========================================"
echo "📊 COUNT"
echo "========================================"

ls FiskalySignDeService.php.bak_* 2>/dev/null | wc -l || true

echo
echo "========================================"
echo "🧪 SHOW FIRST 20 LINES OF EACH BACKUP"
echo "========================================"

for f in $(ls -t FiskalySignDeService.php.bak_* 2>/dev/null | head -5); do
  echo
  echo "---- $f ----"
  head -n 20 "$f"
done

echo
echo "========================================"
echo "✅ DONE"
echo "========================================"
