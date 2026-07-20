#!/usr/bin/env bash
set -e

cd /Users/amir/Desktop/Projects/sanclusterFinal

echo "=== Emergency clean broken global CSS + safe hero backgrounds ==="

cp app/globals.css "app/globals.css.backup-before-clean-hero-global-$(date +%Y%m%d-%H%M%S)"
cp app/servers/page.tsx "app/servers/page.tsx.backup-before-clean-hero-global-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
cp app/advantages/page.tsx "app/advantages/page.tsx.backup-before-clean-hero-global-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
cp app/about/page.tsx "app/about/page.tsx.backup-before-clean-hero-global-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
cp app/contact/page.tsx "app/contact/page.tsx.backup-before-clean-hero-global-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

python3 <<'PY'
from pathlib import Path
import re

css_path = Path("app/globals.css")
s = css_path.read_text()

# Remove bad appended CSS blocks from previous attempts.
markers = [
    "/* === PAGE HERO BACKGROUNDS: Servers / Advantages / About / Contact === */",
    "/* === CONTACT PAGE READABILITY FINAL FIX === */",
    "/* === EMERGENCY CONTACT READABILITY OVERRIDE === */",
    "/* === IMPRINT TRADEMARK WHITE FIX === */",
]

# Remove from each marker until next marker/end marker or EOF.
for marker in markers:
    while marker in s:
        start = s.find(marker)
        # Prefer known end marker
        end = s.find("/* === END PAGE HERO BACKGROUNDS SAFE === */", start)
        if end != -1 and marker.startswith("/* === PAGE HERO"):
            end += len("/* === END PAGE HERO BACKGROUNDS SAFE === */")
            s = s[:start] + "\n" + s[end:]
            continue

        # Otherwise cut until next big marker after this block or EOF
        next_marker = len(s)
        for m in ["/* ===", "\n@media", "\n:root", "\nbody", "\n.site-footer"]:
            pos = s.find(m, start + len(marker))
            if pos != -1:
                next_marker = min(next_marker, pos)
        s = s[:start] + "\n" + s[next_marker:]

# Remove dangerous selectors if any survived
bad_lines = [
    '[class*="text-[#ddb243]"]',
    '[class*="text-[#b8871f]"]',
    "color: rgba(32, 50, 77, 0.76) !impornt;",
]
for b in bad_lines:
    s = s.replace(b, "")

s = s.replace("!impornt", "!important")
s = s.replace("!importnt", "!important")
s = s.replace("!importnat", "!important")

css_path.write_text(s.rstrip() + "\n")
print("✅ cleaned bad global CSS blocks")

# Fix cssName typo everywhere
for p in list(Path("app").glob("**/*.tsx")) + list(Path("components").glob("**/*.tsx")):
    txt = p.read_text()
    if "cssName=" in txt:
        txt = txt.replace("cssName=", "className=")
        p.write_text(txt)
        print(f"✅ fixed cssName in {p}")

# Make sure hero classes exist on first section only.
pages = {
    "app/servers/page.tsx": "servers-hero-bg",
    "app/advantages/page.tsx": "advantages-hero-bg",
    "app/about/page.tsx": "about-hero-bg",
    "app/contact/page.tsx": "contact-hero-bg",
}

all_hero_classes = ["page-hero-bg", "servers-hero-bg", "advantages-hero-bg", "about-hero-bg", "contact-hero-bg"]

for file, hero_class in pages.items():
    p = Path(file)
    if not p.exists():
        continue
    txt = p.read_text()

    # remove duplicated hero classes everywhere first
    for c in all_hero_classes:
        txt = txt.replace(c, "")
    txt = re.sub(r'className="([^"]*)"', lambda m: 'className="' + re.sub(r'\s+', ' ', m.group(1)).strip() + '"', txt)

    # add class only to first section
    m = re.search(r'<section\s+className="([^"]*)"', txt)
    if m:
        existing = m.group(1).strip()
        new_class = f'page-hero-bg {hero_class} {existing}'.strip()
        txt = txt[:m.start()] + f'<section className="{new_class}"' + txt[m.end():]
        p.write_text(txt)
        print(f"✅ applied safe hero class to {file}")
    else:
        print(f"⚠️ no section found in {file}")
PY

cat >> app/globals.css <<'CSS'

/* === SAFE PAGE HERO BACKGROUNDS ONLY === */
.page-hero-bg {
  position: relative !important;
  isolation: isolate !important;
  overflow: hidden !important;
  background-color: #071a35 !important;
  background-image:
    linear-gradient(90deg, rgba(5, 13, 28, 0.92) 0%, rgba(7, 26, 53, 0.74) 45%, rgba(7, 26, 53, 0.28) 100%),
    var(--page-hero-image) !important;
  background-size: cover !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
}

/* Do NOT force every child white. Only the hero intro text should be white. */
.page-hero-bg > div:first-child h1,
.page-hero-bg > div:first-child h2,
.page-hero-bg > div:first-child p {
  color: #ffffff !important;
  text-shadow: 0 14px 42px rgba(0,0,0,0.45) !important;
}

.page-hero-bg > div:first-child p:first-child,
.page-hero-bg > div:first-child [class*="tracking"] {
  color: #ddb243 !important;
  text-shadow: none !important;
}

.servers-hero-bg {
  --page-hero-image: url("/images/page-heroes/servers-hero.png");
}

.advantages-hero-bg {
  --page-hero-image: url("/images/page-heroes/advantages-hero.png");
}

.about-hero-bg {
  --page-hero-image: url("/images/page-heroes/about-hero.png");
}

.contact-hero-bg {
  --page-hero-image: url("/images/page-heroes/contact-hero.png");
}

/* Restore readable card/body text everywhere */
main section:not(.page-hero-bg) h1,
main section:not(.page-hero-bg) h2,
main section:not(.page-hero-bg) h3,
main section:not(.page-hero-bg) p,
main section:not(.page-hero-bg) li,
main section:not(.page-hero-bg) label {
  text-shadow: none !important;
}

/* White cards must always have dark text */
.bg-white,
.bg-white h1,
.bg-white h2,
.bg-white h3,
.bg-white p,
.bg-white li,
.bg-white label {
  color: #071a35 !important;
}

/* Dark navy cards stay readable */
.bg-\[\#071a35\],
.bg-\[\#071a35\] h1,
.bg-\[\#071a35\] h2,
.bg-\[\#071a35\] h3 {
  color: #ffffff !important;
}

.bg-\[\#071a35\] p,
.bg-\[\#071a35\] li,
.bg-\[\#071a35\] span {
  color: rgba(255,255,255,0.74) !important;
}

/* Footer dark readability */
.site-footer p,
.site-footer span,
.site-footer a {
  color: rgba(255,255,255,0.72) !important;
}

.site-footer .footer-brand span {
  color: #f5d77b !important;
}
/* === END SAFE PAGE HERO BACKGROUNDS ONLY === */
CSS

echo ""
echo "Check copied images:"
ls -lh public/images/page-heroes || true

echo ""
echo "Check CSS dangerous selectors:"
grep -n 'text-\\[\\#\\|text\\[\\#\\|class\\*="text' app/globals.css || true

echo ""
echo "Build check:"
npm run build

echo ""
echo "Kill dev + clean all caches:"
pkill -f "next dev" 2>/dev/null || true
rm -rf .next

echo ""
echo "✅ Fixed. Run:"
echo "npm run dev"
