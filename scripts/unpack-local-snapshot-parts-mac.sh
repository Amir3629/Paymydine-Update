#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARTS_DIR="$ROOT_DIR/local-snapshot-archive"
OUTPUT_ARCHIVE="$ROOT_DIR/paymydine-local-snapshot.tar.gz"

cd "$ROOT_DIR"

echo "=== PayMyDine local snapshot unpacker (macOS/Linux) ==="

if [ ! -d "$PARTS_DIR" ]; then
  echo "ERROR: Missing $PARTS_DIR"
  echo "Expected split files like: local-snapshot-archive/paymydine-local-snapshot.tar.gz.part-aa"
  exit 1
fi

PART_COUNT=$(find "$PARTS_DIR" -maxdepth 1 -type f -name 'paymydine-local-snapshot.tar.gz.part-*' | wc -l | tr -d ' ')
if [ "$PART_COUNT" = "0" ]; then
  echo "ERROR: No snapshot parts found in $PARTS_DIR"
  echo "Expected files named: paymydine-local-snapshot.tar.gz.part-aa, part-ab, ..."
  exit 1
fi

echo "Found $PART_COUNT snapshot part(s)."
rm -f "$OUTPUT_ARCHIVE"

cat "$PARTS_DIR"/paymydine-local-snapshot.tar.gz.part-* > "$OUTPUT_ARCHIVE"

echo "Created: $OUTPUT_ARCHIVE"
ls -lh "$OUTPUT_ARCHIVE"

echo "=== Extracting local-snapshot/ ==="
rm -rf "$ROOT_DIR/local-snapshot"
tar -xzf "$OUTPUT_ARCHIVE" -C "$ROOT_DIR"

echo "=== Snapshot files ==="
find "$ROOT_DIR/local-snapshot" -maxdepth 3 -type f | sort | sed "s#^$ROOT_DIR/##"

echo "Done. Next run: bash scripts/setup-local-from-snapshot-mac.sh"
