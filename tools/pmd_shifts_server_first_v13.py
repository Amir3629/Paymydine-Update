#!/usr/bin/env python3
from pathlib import Path
import datetime as dt
import hashlib
import os
import re
import shutil
import subprocess
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '/var/www/paymydine').resolve()
STAMP = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d_%H%M%S')
BACKUP = ROOT / '.pmd-hotfix-backups' / ('shifts-server-first-v13-' + STAMP)

CONTROLLER = ROOT / 'app/admin/controllers/Shifts.php'
VIEW = ROOT / 'app/admin/views/pmdshifts/index.blade.php'
JS = ROOT / 'app/admin/assets/js/pmd-shifts-v1.js'
SMOOTH = ROOT / 'app/admin/assets/js/smooth-transitions.js'
CSS13 = ROOT / 'app/admin/assets/css/pmd-shifts-first-paint-v13.css'
PARTIAL = ROOT / 'app/admin/views/pmdshifts/_server_rota_v13.blade.php'
FILES = [CONTROLLER, VIEW, JS, SMOOTH]

for path in FILES:
    if not path.is_file():
        raise SystemExit('ERROR: missing ' + str(path))
if not CSS13.is_file() or not PARTIAL.is_file():
    raise SystemExit('ERROR: install the tracked V13 CSS + server rota partial first')

text = {path: path.read_text(encoding='utf-8') for path in FILES}
original = dict(text)

if 'PMD_SHIFTS_ACCESS_ROLE_GROUPING_V1' not in text[JS]:
    raise SystemExit('ERROR: expected V11 Access Role grouping is not active')
if 'access_role_code' not in text[VIEW]:
    raise SystemExit('ERROR: expected V11 Access Role bootstrap is not active')

if 'PMD_SHIFTS_SERVER_FIRST_ROTA_V13' not in text[VIEW]:
    pattern = r'(<section\s+id="pmd-shift-day"\s+class="pmd-r2-yc-selected pmd-shifts-hour-host"\s+data-pmd-shifts-hour-host\s*>)(\s*</section>)'
    replacement = r"\1\n                @include('admin::pmdshifts._server_rota_v13')\n            </section>"
    text[VIEW], count = re.subn(pattern, replacement, text[VIEW], count=1, flags=re.S)
    if count != 1:
        raise SystemExit('ERROR: empty Shifts day-host anchor mismatch')
    print('PATCH: server render initial Dienstplan')

if 'PMD_SHIFTS_SERVER_FIRST_BOOT_SKIP_V13' not in text[JS]:
    old = "  if (boot.open_hour_on_boot && boot.selected_day) {\n    renderHourView(boot.selected_day);\n  }\n"
    new = "  if (boot.open_hour_on_boot && boot.selected_day) {\n    // PMD_SHIFTS_SERVER_FIRST_BOOT_SKIP_V13\n    var serverInitial = root.querySelector('[data-pmd-shifts-server-initial]');\n    if (!serverInitial || String(serverInitial.getAttribute('data-date') || '') !== String(boot.selected_day || '')) {\n      renderHourView(boot.selected_day);\n    }\n  }\n"
    if text[JS].count(old) != 1:
        raise SystemExit('ERROR: initial renderHourView anchor mismatch')
    text[JS] = text[JS].replace(old, new, 1)
    print('PATCH: leave server first rota untouched on boot')

text[CONTROLLER] = text[CONTROLLER].replace("        $this->addCss('css/pmd-shifts-first-paint-v12.css');\n", '', 1)
if 'pmd-shifts-first-paint-v13.css' not in text[CONTROLLER]:
    pattern = r"(\s*\$this->addCss\('css/pmd-shifts-canonical-[0-9a-f]{12}\.css'\);\n)"
    match = re.search(pattern, text[CONTROLLER])
    if match:
        text[CONTROLLER] = text[CONTROLLER][:match.end()] + "        $this->addCss('css/pmd-shifts-first-paint-v13.css');\n" + text[CONTROLLER][match.end():]
    else:
        anchor = "        $this->addCss('css/pmd-shifts-dashboard-reservations-v4.css');\n"
        if text[CONTROLLER].count(anchor) != 1:
            raise SystemExit('ERROR: Shifts CSS registration anchor mismatch')
        text[CONTROLLER] = text[CONTROLLER].replace(anchor, anchor + "        $this->addCss('css/pmd-shifts-first-paint-v13.css');\n", 1)
    print('PATCH: retire fixed V12 104px geometry; load V13')

if 'PMD_SHIFTS_NO_SMOOTH_TRANSITION_V13' not in text[SMOOTH] and 'PMD_SHIFTS_NO_SMOOTH_TRANSITION_V12' not in text[SMOOTH]:
    anchor = "    init() {\n        if (!this.contentArea) return;\n        \n        // Add transition styles to content area\n"
    replacement = "    init() {\n        if (!this.contentArea) return;\n\n        const pmdPath = String(window.location.pathname || '').replace(/\\/+$/, '');\n        if (pmdPath === '/admin/shifts') {\n            // PMD_SHIFTS_NO_SMOOTH_TRANSITION_V13\n            this.contentArea.style.setProperty('transition', 'none', 'important');\n            this.contentArea.style.setProperty('opacity', '1', 'important');\n            this.contentArea.style.setProperty('transform', 'none', 'important');\n            return;\n        }\n        \n        // Add transition styles to content area\n"
    if text[SMOOTH].count(anchor) != 1:
        raise SystemExit('ERROR: smooth transition init anchor mismatch')
    text[SMOOTH] = text[SMOOTH].replace(anchor, replacement, 1)
if "            '/admin/shifts',\n" not in text[SMOOTH]:
    anchor = "            '/admin/dashboard',\n"
    if text[SMOOTH].count(anchor) != 1:
        raise SystemExit('ERROR: noAjaxPages anchor mismatch')
    text[SMOOTH] = text[SMOOTH].replace(anchor, anchor + "            '/admin/shifts',\n", 1)
print('PATCH: Shifts bypasses legacy smooth/AJAX navigation')

js_hash = hashlib.sha256(text[JS].encode('utf-8')).hexdigest()[:12]
js_name = 'pmd-shifts-canonical-' + js_hash + '.js'
js_target = JS.parent / js_name
pattern = r"\$this->addJs\('js/pmd-shifts-canonical-[0-9a-f]{12}\.js'\);"
text[CONTROLLER], count = re.subn(pattern, lambda _: "$this->addJs('js/" + js_name + "');", text[CONTROLLER], count=1)
if count != 1:
    raise SystemExit('ERROR: fingerprinted Shifts JS registration mismatch')

BACKUP.mkdir(parents=True, exist_ok=False)
for path in FILES:
    dest = BACKUP / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)
print('BACKUP:', BACKUP)

created = not js_target.exists()
try:
    for path in FILES:
        path.write_text(text[path], encoding='utf-8')
    js_target.write_text(text[JS], encoding='utf-8')
    stat = JS.stat()
    os.chown(js_target, stat.st_uid, stat.st_gid)
    os.chmod(js_target, stat.st_mode & 0o777)

    php = subprocess.run(['php', '-l', str(CONTROLLER)], cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    print(php.stdout.strip())
    if php.returncode != 0:
        raise RuntimeError('Shifts PHP lint failed')
    for path in [JS, SMOOTH, js_target]:
        node = subprocess.run(['node', '--check', str(path)], cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        if node.returncode != 0:
            raise RuntimeError('JS syntax failed: ' + str(path))
except Exception:
    for path, content in original.items():
        path.write_text(content, encoding='utf-8')
    if created:
        try:
            js_target.unlink()
        except FileNotFoundError:
            pass
    raise

print('OK: Shifts server-first V13 installed')
print('ASSET_JS:', js_name)
