#!/usr/bin/env bash
set -e

cd /Users/amir/Desktop/Projects/sanclusterFinal

echo "=== Fix product/server image zoom ==="

cp components/product-card.tsx components/product-card.tsx.backup-before-image-contain-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
cp app/servers/page.tsx app/servers/page.tsx.backup-before-image-contain-$(date +%Y%m%d-%H%M%S)
cp app/globals.css app/globals.css.backup-before-image-contain-$(date +%Y%m%d-%H%M%S)

python3 <<'PY'
from pathlib import Path
import re

files = [
    Path("components/product-card.tsx"),
    Path("app/servers/page.tsx"),
    Path("app/page.tsx"),
]

for path in files:
    if not path.exists():
        continue

    text = path.read_text()

    # Replace Tailwind object-cover with object-contain for product/server images
    text = text.replace("object-cover", "object-contain")

    # If object-position is too aggressive, center it
    text = text.replace("object-left", "object-center")
    text = text.replace("object-right", "object-center")
    text = text.replace("object-top", "object-center")
    text = text.replace("object-bottom", "object-center")

    path.write_text(text)
    print(f"✅ patched {path}")
PY

cat >> app/globals.css <<'CSS'

/* === PRODUCT IMAGE CONTAIN FIX === */
.product-card img,
.server-card img,
[class*="product"] img,
[class*="server"] img {
  object-fit: contain !important;
  object-position: center center !important;
}

/* Make product image areas show full server nicely */
.product-card [class*="relative"],
.server-card [class*="relative"] {
  background:
    radial-gradient(circle at center, rgba(34, 73, 125, 0.28), rgba(4, 13, 31, 0.98)) !important;
}

/* Prevent server images from being cropped in big alternating server sections */
#servers img,
main img[src*="/images/products/primergy"] {
  object-fit: contain !important;
  object-position: center center !important;
}
CSS

echo ""
echo "Checking for remaining object-cover:"
grep -R "object-cover" components app lib 2>/dev/null || true

echo ""
echo "Clean cache..."
pkill -f "next dev" 2>/dev/null || true
rm -rf .next

echo ""
echo "✅ Done. Run:"
echo "npm run dev"
