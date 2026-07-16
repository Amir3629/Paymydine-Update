#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="agent/waiter-dashboard-new-v23-operational-polish"
REF="origin/$BRANCH"
BLADE="$LIVE/app/admin/views/waiter_dashboard_new.blade.php"
TS="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd-waiter-v23-$TS"
BACKUP="/var/backups/pmd-waiter-v23-$TS"
INSTALLED=0

FILES=(
  app/admin/assets/css/pmd-waiter-standard-v23-operational-polish.css
  app/admin/assets/js/pmd-waiter-standard-v23-operational-polish.js
  app/admin/assets/js/pmd-waiter-standard-v23-owner-filters.js
  app/admin/assets/css/pmd-waiter-standard-v221-theme.css
  app/admin/assets/js/pmd-waiter-standard-v221-theme.js
)

cleanup(){ rm -rf "$STAGE"; }
rollback(){
  code=$?
  if [[ $code -ne 0 && $INSTALLED -eq 1 ]]; then
    echo "ERROR: restoring previous waiter dashboard..."
    sudo cp -a "$BACKUP/waiter_dashboard_new.blade.php.before" "$BLADE"
    for path in "${FILES[@]}"; do
      name="$(basename "$path")"; target="$LIVE/$path"
      if [[ -f "$BACKUP/$name.before" ]]; then sudo cp -a "$BACKUP/$name.before" "$target"; else sudo rm -f "$target"; fi
    done
    php artisan view:clear || true
  fi
  cleanup
  exit "$code"
}
trap rollback EXIT

cd "$LIVE"
mkdir -p "$STAGE"

echo "========================================================"
echo "PMD Waiter Standard POS V2.3 — operational polish"
echo "========================================================"

test -s "$BLADE"
grep -Fq "data-pmd-waiter-v2-root" "$BLADE"
echo "PMD_WAITER_V23_BASE_OK"

git fetch --no-tags origin "$BRANCH:refs/remotes/origin/$BRANCH"
echo "Branch commit: $(git rev-parse "$REF")"

for path in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$path")"
  git show "$REF:$path" > "$STAGE/$path"
  test -s "$STAGE/$path"
  echo "Extracted: $path"
done

node --check "$STAGE/app/admin/assets/js/pmd-waiter-standard-v23-operational-polish.js"
node --check "$STAGE/app/admin/assets/js/pmd-waiter-standard-v23-owner-filters.js"
node --check "$STAGE/app/admin/assets/js/pmd-waiter-standard-v221-theme.js"
grep -Fq "CHEF RECOMMENDATIONS" "$STAGE/app/admin/assets/js/pmd-waiter-standard-v23-owner-filters.js"
grep -Fq "BEST SELLERS" "$STAGE/app/admin/assets/js/pmd-waiter-standard-v23-owner-filters.js"

sudo mkdir -p "$BACKUP"
sudo cp -a "$BLADE" "$BACKUP/waiter_dashboard_new.blade.php.before"
for path in "${FILES[@]}"; do
  target="$LIVE/$path"; name="$(basename "$path")"
  [[ -f "$target" ]] && sudo cp -a "$target" "$BACKUP/$name.before" || true
done

echo "Backup: $BACKUP"
cp "$BLADE" "$STAGE/waiter_dashboard_new.blade.php"

python3 - "$STAGE/waiter_dashboard_new.blade.php" "$TS" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1]); stamp=sys.argv[2]; text=p.read_text(encoding='utf-8')
m=re.search(r'<body class="([^"]*)">', text)
if not m: raise SystemExit('ERROR: body class anchor missing')
classes=m.group(1).split()
for cls in ('pmd-waiter-standard-v221-page','pmd-waiter-standard-v23-page'):
    if cls not in classes: classes.append(cls)
text=text[:m.start()]+'<body class="'+' '.join(classes)+'">'+text[m.end():]
text=re.sub(r'\s*<button[^>]*data-v2-refresh[^>]*>.*?</button>','',text,count=1,flags=re.S)
css=[
"    <link rel=\"stylesheet\" href=\"{{ asset('app/admin/assets/css/pmd-waiter-standard-v221-theme.css') }}?v=221\">",
"    <link rel=\"stylesheet\" href=\"{{ asset('app/admin/assets/css/pmd-waiter-standard-v23-operational-polish.css') }}?v=23-"+stamp+"\">",
]
js=[
"<script src=\"{{ asset('app/admin/assets/js/pmd-waiter-standard-v221-theme.js') }}?v=221\"></script>",
"<script src=\"{{ asset('app/admin/assets/js/pmd-waiter-standard-v23-operational-polish.js') }}?v=23-"+stamp+"\"></script>",
"<script src=\"{{ asset('app/admin/assets/js/pmd-waiter-standard-v23-owner-filters.js') }}?v=23-"+stamp+"\"></script>",
]
for line in css:
    asset=re.search(r"asset\('([^']+)'\)",line).group(1)
    if asset not in text: text=text.replace('</head>',line+'\n</head>',1)
for line in js:
    asset=re.search(r"asset\('([^']+)'\)",line).group(1)
    if asset not in text: text=text.replace('</body>',line+'\n</body>',1)
p.write_text(text,encoding='utf-8')
PY

php -l "$STAGE/waiter_dashboard_new.blade.php"
grep -Fq "pmd-waiter-standard-v23-page" "$STAGE/waiter_dashboard_new.blade.php"
if grep -Fq "data-v2-refresh" "$STAGE/waiter_dashboard_new.blade.php"; then echo "ERROR: refresh key remains"; exit 1; fi

for path in "${FILES[@]}"; do sudo install -D -m 0644 "$STAGE/$path" "$LIVE/$path"; done
sudo install -m 0644 "$STAGE/waiter_dashboard_new.blade.php" "$BLADE"
INSTALLED=1

php -l "$BLADE"
node --check "$LIVE/app/admin/assets/js/pmd-waiter-standard-v23-operational-polish.js"
node --check "$LIVE/app/admin/assets/js/pmd-waiter-standard-v23-owner-filters.js"
php artisan view:clear

PAGE="$(curl -k -sS -o /dev/null -w '%{http_code}' https://mimoza.paymydine.com/admin/dashboardwaiternew)"
CSS="$(curl -k -sS -o /dev/null -w '%{http_code}' https://mimoza.paymydine.com/app/admin/assets/css/pmd-waiter-standard-v23-operational-polish.css)"
JS="$(curl -k -sS -o /dev/null -w '%{http_code}' https://mimoza.paymydine.com/app/admin/assets/js/pmd-waiter-standard-v23-owner-filters.js)"
echo "Page HTTP: $PAGE | CSS: $CSS | JS: $JS"
[[ "$PAGE" == 200 || "$PAGE" == 302 ]]
[[ "$CSS" == 200 && "$JS" == 200 ]]

cat <<EOF
========================================================
PMD Waiter Standard POS V2.3 installed successfully
========================================================
✓ Kept /admin/dashboardwaiternew
✓ Online waiter name is visible
✓ Back to floor is icon-only
✓ Area name only; no Quick waiter ordering text
✓ Manual refresh controls removed; safe live sync retained
✓ Popular/Recent replaced by backend Chef Recommendations/Best Sellers
✓ Special tabs hide automatically when owner has no enabled items
✓ ADD removed; full product card remains clickable
✓ Tap feedback, quantity badges, bigger fonts and sharp colors
✓ Complete light/dark styling including cart and payment
Backup: $BACKUP
Console: PMDWaiterStandardV23.debug()
========================================================
EOF

INSTALLED=0
cleanup
trap - EXIT
