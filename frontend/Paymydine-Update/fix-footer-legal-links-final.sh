#!/usr/bin/env bash
set -e

cd /Users/amir/Desktop/Projects/sanclusterFinal

echo "=== Fix footer legal links ==="

cp components/site-footer.tsx "components/site-footer.tsx.backup-before-footer-legal-links-$(date +%Y%m%d-%H%M%S)"

python3 <<'PY'
from pathlib import Path
import re

p = Path("components/site-footer.tsx")
s = p.read_text()

# 1) Fix existing wrong routes
s = s.replace('href="/privacy"', 'href="/privacy-policy"')
s = s.replace('href="/terms"', 'href="/terms-of-service"')

# 2) Fix labels that are still href="#" or href="/"
patterns = [
    (r'href=(["\'])(#|/)\1([^>]*>\s*Privacy Policy)', r'href="/privacy-policy"\3'),
    (r'href=(["\'])(#|/)\1([^>]*>\s*Terms of Service)', r'href="/terms-of-service"\3'),
    (r'href=(["\'])(#|/)\1([^>]*>\s*Imprint)', r'href="/imprint"\3'),
]
for old, new in patterns:
    s = re.sub(old, new, s, flags=re.I)

# 3) If footer uses data array objects like { label: "...", href: "..." }
s = re.sub(
    r'(\{\s*label:\s*["\']Privacy Policy["\']\s*,\s*href:\s*)["\'][^"\']*["\']',
    r'\1"/privacy-policy"',
    s,
)
s = re.sub(
    r'(\{\s*label:\s*["\']Terms of Service["\']\s*,\s*href:\s*)["\'][^"\']*["\']',
    r'\1"/terms-of-service"',
    s,
)
s = re.sub(
    r'(\{\s*label:\s*["\']Imprint["\']\s*,\s*href:\s*)["\'][^"\']*["\']',
    r'\1"/imprint"',
    s,
)

# 4) If object order is href first then label
s = re.sub(
    r'(\{\s*href:\s*)["\'][^"\']*["\'](\s*,\s*label:\s*["\']Privacy Policy["\'])',
    r'\1"/privacy-policy"\2',
    s,
)
s = re.sub(
    r'(\{\s*href:\s*)["\'][^"\']*["\'](\s*,\s*label:\s*["\']Terms of Service["\'])',
    r'\1"/terms-of-service"\2',
    s,
)
s = re.sub(
    r'(\{\s*href:\s*)["\'][^"\']*["\'](\s*,\s*label:\s*["\']Imprint["\'])',
    r'\1"/imprint"\2',
    s,
)

p.write_text(s)
PY

echo ""
echo "Footer legal lines:"
grep -n "Privacy Policy\|Terms of Service\|Imprint\|privacy-policy\|terms-of-service" components/site-footer.tsx || true

echo ""
echo "Build check..."
npm run build

echo ""
echo "Clean cache..."
pkill -f "next dev" 2>/dev/null || true
rm -rf .next

echo ""
echo "✅ Done. Run:"
echo "npm run dev"
