#!/usr/bin/env bash
set -Eeuo pipefail

echo "== Replace Rayton with I Cube v33b =="

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="./storage/backups/replace-rayton-with-icube-v33b-$TS"
mkdir -p "$BACKUP_DIR"

COMPONENT=$(python3 - <<'PY'
from pathlib import Path
import re

page = Path("app/page.tsx")
if page.exists():
    s = page.read_text()
    m = re.search(r'import\s+(HarringtonExperienceV\d+)\s+from\s+"../components/([^"]+)"', s)
    if m:
        print("components/" + m.group(2) + ".tsx")
    else:
        print("components/HarringtonExperienceV30.tsx")
else:
    print("components/HarringtonExperienceV30.tsx")
PY
)

if [[ ! -f "$COMPONENT" ]]; then
  echo "ERROR: Could not find component: $COMPONENT"
  exit 1
fi

echo "Using component: $COMPONENT"

cp -a "$COMPONENT" "$BACKUP_DIR/" 2>/dev/null || true
cp -a app/globals.css "$BACKUP_DIR/" 2>/dev/null || true
cp -a app/page.tsx "$BACKUP_DIR/" 2>/dev/null || true

python3 - <<'PY'
from pathlib import Path
import re

page = Path("app/page.tsx")
page_s = page.read_text()

m = re.search(r'import\s+(HarringtonExperienceV\d+)\s+from\s+"../components/([^"]+)"', page_s)
if m:
    component = Path("components/" + m.group(2) + ".tsx")
else:
    component = Path("components/HarringtonExperienceV30.tsx")

s = component.read_text()

# Remove any previous v33b block if rerun.
s = re.sub(
    r'\n// HH_VISIBLE_COMPANIES_V33B_START[\s\S]*?// HH_VISIBLE_COMPANIES_V33B_END\n',
    '\n',
    s
)

# Replace old static slideIds with computed visible companies.
slide_block = '''

// HH_VISIBLE_COMPANIES_V33B_START
function hhCompanyKey(company: Company) {
  return `${company.slug} ${company.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const visibleCompanies = (() => {
  const icube = companies.find((company) => {
    const key = hhCompanyKey(company);
    return key.includes("icube") || key.includes("icubesolutions") || company.name.toLowerCase().includes("cube");
  });

  const withoutRaytonAndIcube = companies.filter((company) => {
    const key = hhCompanyKey(company);
    const isRayton = key.includes("rayton");
    const isIcube = icube ? company === icube : key.includes("icube") || company.name.toLowerCase().includes("cube");
    return !isRayton && !isIcube;
  });

  return icube ? [icube, ...withoutRaytonAndIcube] : withoutRaytonAndIcube;
})();

function firstCompanySlideId() {
  return visibleCompanies[0] ? `company-${visibleCompanies[0].slug}` : "portfolio";
}

const slideIds = [
  "intro",
  "about",
  "portfolio",
  ...visibleCompanies.map((company) => `company-${company.slug}`),
  "ecosystem",
  "contact",
];
// HH_VISIBLE_COMPANIES_V33B_END
'''

if re.search(r'const slideIds\s*=\s*\[[\s\S]*?\];', s):
    s = re.sub(r'const slideIds\s*=\s*\[[\s\S]*?\];', slide_block.strip(), s, count=1)
else:
    insert_after = s.find("];", s.find("const companies"))
    if insert_after == -1:
        raise SystemExit("ERROR: Could not find place to insert visibleCompanies")
    s = s[:insert_after+2] + slide_block + s[insert_after+2:]

# Use visibleCompanies in portfolio cards + company slides.
s = s.replace("companies.map((company, index) => (", "visibleCompanies.map((company, index) => (")

# Fix nav buttons that still point to Rayton.
s = s.replace('goTo("company-rayton")', 'goTo(firstCompanySlideId())')
s = s.replace("goTo('company-rayton')", "goTo(firstCompanySlideId())")

component.write_text(s)
print("PATCHED:", component)
PY

echo "== Remove old Rayton slide/card if any CSS/runtime leftovers exist =="
cat >> app/globals.css <<'CSS'

/* REPLACE_RAYTON_WITH_ICUBE_V33B */
#company-rayton {
  display: none !important;
}

CSS

echo "== Build check =="
rm -rf .next
npm run build

echo ""
echo "DONE v33b."
echo "Now run:"
echo "npm run dev"
echo ""
echo "Open:"
echo "http://localhost:3000?v=replace-rayton-icube-v33b"
