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
BACKUP = ROOT / '.pmd-hotfix-backups' / ('shifts-notification-v6-' + STAMP)

CONTROLLER = ROOT / 'app/admin/controllers/Shifts.php'
JS = ROOT / 'app/admin/assets/js/pmd-shifts-v1.js'
VIEW = ROOT / 'app/admin/views/pmdshifts/index.blade.php'
GATE = ROOT / 'app/Http/Middleware/PmdSiteAccessGateMiddleware.php'

for path in [CONTROLLER, JS, VIEW, GATE]:
    if not path.is_file():
        raise SystemExit(f'ERROR: missing required file: {path}')

controller = CONTROLLER.read_text(encoding='utf-8')
js = JS.read_text(encoding='utf-8')
view = VIEW.read_text(encoding='utf-8')
gate = GATE.read_text(encoding='utf-8')

if 'PMD_SITE_ACCESS_WEB_GATE_V2' not in gate or 'finalizeAdminHtml' in gate:
    raise SystemExit('ERROR: safe PmdSiteAccessGateMiddleware V2 is not active')

for token, text, label in [
    ('PMD_SHIFTS_FINGERPRINTED_ASSETS_V1', controller, 'controller'),
    ('PMD_SHIFTS_CANONICAL_INTERACTION_V3', js, 'js'),
    ('PMD_SHIFTS_REAL_NOTIFICATION_V1', view, 'view'),
    ("@include('admin::_partials.notification_bell')", view, 'view'),
]:
    if token not in text:
        raise SystemExit(f'ERROR: {label} missing {token}; V5 is not installed')

original_controller = controller
original_js = js
created = []

marker = 'PMD_SHIFTS_NOTIFICATION_VISIBILITY_V1'

if marker not in js:
    old_root = """    notificationRoot.removeAttribute('style');
    notificationRoot.removeAttribute('hidden');
    notificationRoot.classList.remove('show');

    var trigger = notificationRoot.querySelector('#notifDropdown');
"""
    new_root = """    notificationRoot.removeAttribute('style');
    notificationRoot.removeAttribute('hidden');
    notificationRoot.classList.remove('show');

    // PMD_SHIFTS_NOTIFICATION_VISIBILITY_V1
    // A global legacy notification rule can mark the real root hidden even
    // after it has been moved into the Shifts header. Inline important values
    // are the final local owner for this already-mounted functional control.
    notificationRoot.style.setProperty('display', 'grid', 'important');
    notificationRoot.style.setProperty('visibility', 'visible', 'important');
    notificationRoot.style.setProperty('opacity', '1', 'important');
    notificationRoot.style.setProperty('pointer-events', 'auto', 'important');
    notificationRoot.setAttribute('aria-hidden', 'false');

    var trigger = notificationRoot.querySelector('#notifDropdown');
"""
    count = js.count(old_root)
    if count != 1:
        raise SystemExit(f'ERROR before write: notification root normalization expected 1 match, found {count}')
    js = js.replace(old_root, new_root, 1)

    old_trigger = """    trigger.removeAttribute('style');
    trigger.classList.remove('show');
    trigger.setAttribute('aria-expanded', 'false');
"""
    new_trigger = """    trigger.removeAttribute('style');
    trigger.classList.remove('show');
    trigger.style.setProperty('display', 'grid', 'important');
    trigger.style.setProperty('visibility', 'visible', 'important');
    trigger.style.setProperty('opacity', '1', 'important');
    trigger.style.setProperty('pointer-events', 'auto', 'important');
    trigger.setAttribute('aria-expanded', 'false');
"""
    count = js.count(old_trigger)
    if count != 1:
        raise SystemExit(f'ERROR before write: notification trigger normalization expected 1 match, found {count}')
    js = js.replace(old_trigger, new_trigger, 1)
    print('PATCH: Give Shifts final visibility ownership of the real notification root')
else:
    print('ALREADY: Shifts notification visibility V1')

if marker not in js:
    raise SystemExit('ERROR before write: visibility marker missing')

js_hash = hashlib.sha256(js.encode('utf-8')).hexdigest()[:12]
js_name = f'pmd-shifts-canonical-{js_hash}.js'
js_target = JS.parent / js_name

js_pattern = r"\$this->addJs\('js/pmd-shifts-canonical-[0-9a-f]{12}\.js'\);"
js_registration = "$this->addJs('js/" + js_name + "');"
controller, js_count = re.subn(js_pattern, lambda _m: js_registration, controller, count=1)
if js_count != 1:
    raise SystemExit(f'ERROR before write: fingerprinted JS registration matches={js_count}')

if js_name not in controller:
    raise SystemExit('ERROR before write: controller does not reference new JS asset')

BACKUP.mkdir(parents=True, exist_ok=False)
for source in [CONTROLLER, JS]:
    dest = BACKUP / source.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)
print(f'BACKUP: {BACKUP}')

try:
    CONTROLLER.write_text(controller, encoding='utf-8')
    JS.write_text(js, encoding='utf-8')

    existed = js_target.exists()
    js_target.write_text(js, encoding='utf-8')
    stat = JS.stat()
    os.chown(js_target, stat.st_uid, stat.st_gid)
    os.chmod(js_target, stat.st_mode & 0o777)
    if not existed:
        created.append(js_target)

    commands = [['php', '-l', str(CONTROLLER)]]
    if shutil.which('node'):
        commands.extend([
            ['node', '--check', str(JS)],
            ['node', '--check', str(js_target)],
        ])

    for command in commands:
        result = subprocess.run(command, cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        print(result.stdout.strip())
        if result.returncode != 0:
            raise RuntimeError('validation failed: ' + ' '.join(command))

    if hashlib.sha256(js_target.read_bytes()).hexdigest()[:12] != js_hash:
        raise RuntimeError('fingerprinted JS content hash mismatch')

except Exception:
    print('ERROR: validation failed; restoring V5 controller/JS', file=sys.stderr)
    CONTROLLER.write_text(original_controller, encoding='utf-8')
    JS.write_text(original_js, encoding='utf-8')
    for target in created:
        try:
            target.unlink()
        except FileNotFoundError:
            pass
    raise

print('OK: Shifts notification visibility V6 applied')
print('ASSET_JS: ' + js_name)
print('OK: safe Site Access middleware V2 was not modified')
