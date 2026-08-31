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
BACKUP = ROOT / '.pmd-hotfix-backups' / ('shifts-live-finish-v5-' + STAMP)

CONTROLLER = ROOT / 'app/admin/controllers/Shifts.php'
VIEW = ROOT / 'app/admin/views/pmdshifts/index.blade.php'
JS = ROOT / 'app/admin/assets/js/pmd-shifts-v1.js'
CSS = ROOT / 'app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css'
GATE = ROOT / 'app/Http/Middleware/PmdSiteAccessGateMiddleware.php'
NOTIFICATION = ROOT / 'app/admin/views/_partials/notification_bell.blade.php'

for path in [CONTROLLER, VIEW, JS, CSS, GATE, NOTIFICATION]:
    if not path.is_file():
        raise SystemExit(f'ERROR: missing required file: {path}')

controller = CONTROLLER.read_text(encoding='utf-8')
view = VIEW.read_text(encoding='utf-8')
js = JS.read_text(encoding='utf-8')
css = CSS.read_text(encoding='utf-8')
gate = GATE.read_text(encoding='utf-8')
notification = NOTIFICATION.read_text(encoding='utf-8')

if 'PMD_SITE_ACCESS_WEB_GATE_V2' not in gate or 'finalizeAdminHtml' in gate:
    raise SystemExit('ERROR: safe PmdSiteAccessGateMiddleware V2 is not active')

for token, text, label in [
    ('PMD_SHIFTS_FINGERPRINTED_ASSETS_V1', controller, 'controller'),
    ('PMD_SHIFTS_CANONICAL_INTERACTION_V2', js, 'js'),
    ('PMD_SHIFTS_CANONICAL_VISUAL_V2', css, 'css'),
    ('data-pmd-shifts-notification-slot', view, 'view'),
    ('id="notif-root"', notification, 'notification partial'),
    ('id="notifDropdown"', notification, 'notification partial'),
]:
    if token not in text:
        raise SystemExit(f'ERROR: {label} missing {token}; V4/current notification authority is not installed')

originals = {
    CONTROLLER: controller,
    VIEW: view,
    JS: js,
    CSS: css,
}


def replace_exact(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 exact match, found {count}')
    print(f'PATCH: {label}')
    return text.replace(old, new, 1)


def replace_regex(text, pattern, replacement, label):
    out, count = re.subn(pattern, lambda _m: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 regex match, found {count}')
    print(f'PATCH: {label}')
    return out


created = []
try:
    if 'PMD_SHIFTS_REAL_NOTIFICATION_V1' not in view:
        notification_pattern = (
            r'<span class="pmd-shifts__notification-slot" '
            r'data-pmd-shifts-notification-slot aria-label="Notifications">\s*'
            r'<span class="pmd-shifts__notification-fallback" aria-hidden="true">.*?</span>\s*'
            r'</span>'
        )
        notification_replacement = '''{{-- PMD_SHIFTS_REAL_NOTIFICATION_V1: render the shared functional notification dropdown here. --}}
            <ul class="pmd-shifts__notification-slot" data-pmd-shifts-notification-slot aria-label="Notifications">
                @include('admin::_partials.notification_bell')
            </ul>'''
        view = replace_regex(
            view,
            notification_pattern,
            notification_replacement,
            'Render the real shared notification dropdown in Shifts header',
        )
    else:
        print('ALREADY: real Shifts notification partial')

    if 'PMD_SHIFTS_CANONICAL_INTERACTION_V3' not in js:
        js = replace_exact(
            js,
            '/* PMD_SHIFTS_CANONICAL_INTERACTION_V2 */',
            '/* PMD_SHIFTS_CANONICAL_INTERACTION_V3 */\n/* PMD_SHIFTS_CANONICAL_INTERACTION_V2 */',
            'Mark Shifts browser interaction V3',
        )

        old_segment_style = (
            "          ' style=\"left:' + segmentLeft.toFixed(4) + '%;width:' + segmentWidth.toFixed(4) + "
            "'%;top:' + laneTop.toFixed(4) + '%;height:' + laneHeight.toFixed(4) + '%\"' +\n"
        )
        new_segment_style = (
            "          ' style=\"left:' + segmentLeft.toFixed(4) + '% !important;width:' + segmentWidth.toFixed(4) + "
            "'% !important;top:' + laneTop.toFixed(4) + '% !important;height:' + laneHeight.toFixed(4) + '% !important\"' +\n"
        )
        js = replace_exact(
            js,
            old_segment_style,
            new_segment_style,
            'Make connected shift segments own their real time width and lane',
        )

        old_group_style = (
            "      '<div class=\"pmd-shifts-final-shift-group\" style=\"left:' + left.toFixed(4) + "
            "'%;width:' + width.toFixed(4) + '%\"' +\n"
        )
        new_group_style = (
            "      '<div class=\"pmd-shifts-final-shift-group\" style=\"left:' + left.toFixed(4) + "
            "'% !important;width:' + width.toFixed(4) + '% !important\"' +\n"
        )
        js = replace_exact(
            js,
            old_group_style,
            new_group_style,
            'Lock connected coverage to its actual timeline span',
        )

        old_notification_lookup = "    var notificationRoot = document.getElementById('notif-root');\n    if (!slot || !notificationRoot) return false;\n"
        new_notification_lookup = """    var notificationRoot = slot && slot.querySelector('#notif-root');
    if (!notificationRoot) notificationRoot = document.getElementById('notif-root');
    if (!slot || !notificationRoot) return false;
    document.querySelectorAll('#notif-root').forEach(function (candidate) {
      if (candidate !== notificationRoot) candidate.remove();
    });
"""
        js = replace_exact(
            js,
            old_notification_lookup,
            new_notification_lookup,
            'Give Shifts one local notification root owner',
        )
    else:
        print('ALREADY: Shifts browser interaction V3')

    if 'PMD_SHIFTS_CANONICAL_VISUAL_V3' not in css:
        css += r'''

/* PMD_SHIFTS_CANONICAL_VISUAL_V3
 * Real shared notification dropdown + exact overlap segment geometry.
 */
body.pmd-shifts-page .pmd-shifts__notification-slot{
  position:relative!important;
  display:inline-grid!important;
  place-items:center!important;
  flex:0 0 46px!important;
  width:46px!important;
  min-width:46px!important;
  max-width:46px!important;
  height:46px!important;
  min-height:46px!important;
  max-height:46px!important;
  margin:0!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
  list-style:none!important;
  overflow:visible!important;
}
body.pmd-shifts-page .pmd-shifts__notification-slot #notif-root{
  position:relative!important;
  display:grid!important;
  place-items:center!important;
  width:46px!important;
  min-width:46px!important;
  max-width:46px!important;
  height:46px!important;
  min-height:46px!important;
  max-height:46px!important;
  margin:0!important;
  margin-left:0!important;
  margin-inline-start:0!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
  list-style:none!important;
  overflow:visible!important;
  visibility:visible!important;
  opacity:1!important;
}
body.pmd-shifts-page .pmd-shifts__notification-slot #notif-root [data-pmd-main-header-notification-divider-r66]{display:none!important}
body.pmd-shifts-page .pmd-shifts__notification-slot #notifDropdown{
  position:relative!important;
  display:grid!important;
  place-items:center!important;
  width:46px!important;
  min-width:46px!important;
  max-width:46px!important;
  height:46px!important;
  min-height:46px!important;
  max-height:46px!important;
  margin:0!important;
  padding:0!important;
  border:1px solid #cfe0ec!important;
  border-radius:14px!important;
  background:#fff!important;
  color:#173752!important;
  box-shadow:0 3px 10px rgba(23,55,82,.05)!important;
  text-decoration:none!important;
  visibility:visible!important;
  opacity:1!important;
  overflow:visible!important;
}
body.pmd-shifts-page .pmd-shifts__notification-slot #notification-panel,
body.pmd-shifts-page .pmd-shifts__notification-slot #notif-root .dropdown-menu{
  position:absolute!important;
  top:54px!important;
  right:0!important;
  left:auto!important;
  margin:0!important;
  z-index:10080!important;
}
body.pmd-shifts-page .pmd-shifts-final-shift-segment{
  flex:none!important;
  max-width:none!important;
  min-width:24px!important;
}
'''
        print('PATCH: Append Shifts canonical visual V3')
    else:
        print('ALREADY: Shifts canonical visual V3')

    js_hash = hashlib.sha256(js.encode('utf-8')).hexdigest()[:12]
    css_hash = hashlib.sha256(css.encode('utf-8')).hexdigest()[:12]
    js_name = f'pmd-shifts-canonical-{js_hash}.js'
    css_name = f'pmd-shifts-canonical-{css_hash}.css'
    js_target = JS.parent / js_name
    css_target = CSS.parent / css_name

    css_pattern = r"\$this->addCss\('css/pmd-shifts-canonical-[0-9a-f]{12}\.css'\);"
    js_pattern = r"\$this->addJs\('js/pmd-shifts-canonical-[0-9a-f]{12}\.js'\);"
    css_registration = "$this->addCss('css/" + css_name + "');"
    js_registration = "$this->addJs('js/" + js_name + "');"

    controller, css_count = re.subn(css_pattern, lambda _m: css_registration, controller, count=1)
    controller, js_count = re.subn(js_pattern, lambda _m: js_registration, controller, count=1)
    if css_count != 1 or js_count != 1:
        raise RuntimeError(f'fingerprinted asset registration: CSS matches={css_count}, JS matches={js_count}')
    print(f'PATCH: Fingerprint CSS as {css_name}')
    print(f'PATCH: Fingerprint JS as {js_name}')

    for token, text, label in [
        ('PMD_SHIFTS_REAL_NOTIFICATION_V1', view, 'view'),
        ("@include('admin::_partials.notification_bell')", view, 'view'),
        ('PMD_SHIFTS_CANONICAL_INTERACTION_V3', js, 'js'),
        ('candidate !== notificationRoot', js, 'js'),
        ('% !important;width:', js, 'js'),
        ('PMD_SHIFTS_CANONICAL_VISUAL_V3', css, 'css'),
        (js_name, controller, 'controller'),
        (css_name, controller, 'controller'),
    ]:
        if token not in text:
            raise RuntimeError(f'post-transform {label} missing {token}')

except Exception as error:
    raise SystemExit(f'ERROR before write: {error}')

BACKUP.mkdir(parents=True, exist_ok=False)
for source in [CONTROLLER, VIEW, JS, CSS]:
    dest = BACKUP / source.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)
print(f'BACKUP: {BACKUP}')

try:
    CONTROLLER.write_text(controller, encoding='utf-8')
    VIEW.write_text(view, encoding='utf-8')
    JS.write_text(js, encoding='utf-8')
    CSS.write_text(css, encoding='utf-8')

    def write_delivery(source, target, content):
        existed = target.exists()
        target.write_text(content, encoding='utf-8')
        stat = source.stat()
        os.chown(target, stat.st_uid, stat.st_gid)
        os.chmod(target, stat.st_mode & 0o777)
        if not existed:
            created.append(target)

    write_delivery(JS, js_target, js)
    write_delivery(CSS, css_target, css)

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
    if hashlib.sha256(css_target.read_bytes()).hexdigest()[:12] != css_hash:
        raise RuntimeError('fingerprinted CSS content hash mismatch')

except Exception:
    print('ERROR: validation failed; restoring V4 files', file=sys.stderr)
    for source, original in originals.items():
        source.write_text(original, encoding='utf-8')
    for target in created:
        try:
            target.unlink()
        except FileNotFoundError:
            pass
    raise

print('OK: Shifts live finish V5 applied')
print('ASSET_JS: ' + js_name)
print('ASSET_CSS: ' + css_name)
print('OK: real shared notification dropdown is now server-rendered on Shifts')
print('OK: safe Site Access middleware V2 was not modified')
