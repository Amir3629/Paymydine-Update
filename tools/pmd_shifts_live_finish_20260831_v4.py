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
BACKUP = ROOT / '.pmd-hotfix-backups' / ('shifts-live-finish-v4-' + STAMP)

CONTROLLER = ROOT / 'app/admin/controllers/Shifts.php'
JS = ROOT / 'app/admin/assets/js/pmd-shifts-v1.js'
CSS = ROOT / 'app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css'
GATE = ROOT / 'app/Http/Middleware/PmdSiteAccessGateMiddleware.php'

for path in [CONTROLLER, JS, CSS, GATE]:
    if not path.is_file():
        raise SystemExit(f'ERROR: missing required file: {path}')

controller = CONTROLLER.read_text(encoding='utf-8')
js = JS.read_text(encoding='utf-8')
css = CSS.read_text(encoding='utf-8')
gate = GATE.read_text(encoding='utf-8')

# Refuse to work on the old HTML-rewrite security experiment.
if 'PMD_SITE_ACCESS_WEB_GATE_V2' not in gate or 'finalizeAdminHtml' in gate:
    raise SystemExit('ERROR: safe PmdSiteAccessGateMiddleware V2 is not active')

# V4 is intentionally a finish pass over the already-successful canonical V3.
required = {
    'controller': ['PMD_SHIFTS_CANONICAL_ROSTER_V1', 'PMD_SHIFTS_EXACT_DUPLICATE_GUARD_V1'],
    'js': ['PMD_SHIFTS_CANONICAL_INTERACTION_V1', 'groupedPersonShifts', 'data-pmd-role-family'],
    'css': ['PMD_SHIFTS_CANONICAL_VISUAL_V1'],
}
for token in required['controller']:
    if token not in controller:
        raise SystemExit(f'ERROR: Shifts controller missing {token}; canonical V3 is not installed')
for token in required['js']:
    if token not in js:
        raise SystemExit(f'ERROR: Shifts JS missing {token}; canonical V3 is not installed')
for token in required['css']:
    if token not in css:
        raise SystemExit(f'ERROR: Shifts CSS missing {token}; canonical V3 is not installed')

original_controller = controller
original_js = js
original_css = css


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


try:
    if 'PMD_SHIFTS_CANONICAL_INTERACTION_V2' not in js:
        js = replace_exact(
            js,
            '/* PMD_SHIFTS_CANONICAL_INTERACTION_V1 */',
            '/* PMD_SHIFTS_CANONICAL_INTERACTION_V2 */\n/* PMD_SHIFTS_CANONICAL_INTERACTION_V1 */',
            'Mark Shifts browser interaction V2',
        )

        old_kitchen = "    if (department === 'kitchen' || /\\b(kitchen|chef|cook|kds|dish|prep|boh)\\b/.test(text)) return {family:'kitchen', rank:10};"
        new_kitchen = "    if (department === 'kitchen' || role.indexOf('kitchen') !== -1 || /\\b(chef|cook|kds|dish|prep|boh)\\b/.test(text)) return {family:'kitchen', rank:10};"
        js = replace_exact(js, old_kitchen, new_kitchen, 'Treat kitchenhelper/kitchen-prefixed roles as Kitchen')

        group_pattern = r"  function groupedPersonShifts\(personShifts\) \{.*?\n  function finalTimeScaleMarkup\(\) \{"
        group_replacement = r'''  function groupedPersonShifts(personShifts) {
    var sorted = personShifts.slice().sort(function (left, right) {
      var leftWindow = shiftWindow(left);
      var rightWindow = shiftWindow(right);
      if (leftWindow.start !== rightWindow.start) return leftWindow.start - rightWindow.start;
      if (leftWindow.end !== rightWindow.end) return leftWindow.end - rightWindow.end;
      return Number(left.id || 0) - Number(right.id || 0);
    });
    var groups = [];
    sorted.forEach(function (shift) {
      var window = shiftWindow(shift);
      var current = groups.length ? groups[groups.length - 1] : null;
      if (current && window.start <= current.end) {
        current.shifts.push(shift);
        current.end = Math.max(current.end, window.end);
      } else {
        groups.push({start:window.start, end:window.end, shifts:[shift]});
      }
    });
    return groups;
  }

  function layoutShiftGroup(group) {
    var laneEnds = [];
    var items = group.shifts.slice().sort(function (left, right) {
      var leftWindow = shiftWindow(left);
      var rightWindow = shiftWindow(right);
      if (leftWindow.start !== rightWindow.start) return leftWindow.start - rightWindow.start;
      if (leftWindow.end !== rightWindow.end) return leftWindow.end - rightWindow.end;
      return Number(left.id || 0) - Number(right.id || 0);
    }).map(function (shift) {
      var window = shiftWindow(shift);
      var lane = 0;
      while (lane < laneEnds.length && window.start < laneEnds[lane]) lane += 1;
      if (lane === laneEnds.length) laneEnds.push(window.end);
      else laneEnds[lane] = window.end;
      return {shift:shift, start:window.start, end:window.end, lane:lane};
    });
    return {items:items, lanes:Math.max(1, laneEnds.length)};
  }

  function finalShiftGroupMarkup(group, person) {
    if (!group || !Array.isArray(group.shifts) || group.shifts.length === 0) return '';
    if (group.shifts.length === 1) return finalShiftMarkup(group.shifts[0], person);

    var start = Math.max(360, Number(group.start || 360));
    var end = Math.min(1800, Number(group.end || start + 30));
    if (end <= start) end = Math.min(1800, start + 30);
    var span = Math.max(1, end - start);
    var left = ((start - 360) / 1440) * 100;
    var width = (span / 1440) * 100;
    var layout = layoutShiftGroup(group);

    var segments = layout.items.map(function (item) {
      var shift = item.shift;
      var state = shiftStateForPerson(shift, person);
      var time = shiftTimeLabel(shift);
      var segmentStart = Math.max(start, item.start);
      var segmentEnd = Math.min(end, item.end);
      if (segmentEnd <= segmentStart) segmentEnd = Math.min(end, segmentStart + 1);
      var segmentLeft = ((segmentStart - start) / span) * 100;
      var segmentWidth = ((segmentEnd - segmentStart) / span) * 100;
      var laneTop = (item.lane / layout.lanes) * 100;
      var laneHeight = 100 / layout.lanes;
      return '' +
        '<button type="button" class="pmd-shifts-final-shift-segment' + (shift.confirmed ? ' is-confirmed' : '') + (state === 'absent' ? ' is-absent' : '') + '"' +
          ' data-pmd-shift-manage="' + Number(shift.id || 0) + '"' +
          ' style="left:' + segmentLeft.toFixed(4) + '%;width:' + segmentWidth.toFixed(4) + '%;top:' + laneTop.toFixed(4) + '%;height:' + laneHeight.toFixed(4) + '%"' +
          ' title="' + escapeHtml((shift.label || 'Shift') + ' · ' + time + ' · click to edit/remove') + '">' +
          '<strong>' + escapeHtml(time) + '</strong>' +
          '<span>' + escapeHtml(shift.label || 'Shift') + '</span>' +
        '</button>';
    }).join('');

    return '' +
      '<div class="pmd-shifts-final-shift-group" style="left:' + left.toFixed(4) + '%;width:' + width.toFixed(4) + '%"' +
        ' title="Connected coverage · ' + group.shifts.length + ' editable shifts">' +
        '<span class="pmd-shifts-final-shift-group__coverage" aria-hidden="true"></span>' +
        '<div class="pmd-shifts-final-shift-group__segments">' + segments + '</div>' +
      '</div>';
  }

  function finalTimeScaleMarkup() {'''
        js = replace_regex(js, group_pattern, group_replacement, 'Preserve real time geometry for connected/overlapping shifts')

        notification_pattern = r"  function mountHeaderNotification\(\) \{.*?\n  function scrollToTeamPanel\(personId\) \{"
        notification_replacement = r'''  function normalizeHeaderNotification(notificationRoot) {
    if (!notificationRoot) return false;
    notificationRoot.removeAttribute('style');
    notificationRoot.removeAttribute('hidden');
    notificationRoot.classList.remove('show');

    var trigger = notificationRoot.querySelector('#notifDropdown');
    if (!trigger) return false;
    trigger.removeAttribute('style');
    trigger.classList.remove('show');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Notifications');
    trigger.setAttribute('title', 'Notifications');

    trigger.querySelectorAll('i.fa, i.fas, i.far, i.fal, i.fab').forEach(function (icon) {
      icon.remove();
    });

    var count = trigger.querySelector('#notification-count');
    var bells = Array.prototype.slice.call(trigger.querySelectorAll('#bell-icon'));
    var bell = bells.length ? bells[0] : null;
    bells.slice(1).forEach(function (duplicate) { duplicate.remove(); });

    if (!bell) {
      bell = document.createElement('span');
      bell.id = 'bell-icon';
      if (count) trigger.insertBefore(bell, count);
      else trigger.insertBefore(bell, trigger.firstChild);
    }

    if (count && bell.contains(count)) trigger.appendChild(count);
    bell.removeAttribute('style');
    bell.innerHTML = '' +
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>' +
        '<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>' +
      '</svg>';
    return true;
  }

  function mountHeaderNotification() {
    var slot = root.querySelector('[data-pmd-shifts-notification-slot]');
    var notificationRoot = document.getElementById('notif-root');
    if (!slot || !notificationRoot) return false;
    if (!normalizeHeaderNotification(notificationRoot)) return false;
    if (!slot.contains(notificationRoot)) {
      slot.innerHTML = '';
      slot.appendChild(notificationRoot);
    }
    notificationRoot.classList.add('pmd-shifts__notification-root');
    return true;
  }

  function ensureHeaderNotification() {
    if (mountHeaderNotification()) return;
    var remount = function () { mountHeaderNotification(); };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', remount, {once:true});
    }
    window.addEventListener('load', remount, {once:true});
  }

  function scrollToTeamPanel(personId) {'''
        js = replace_regex(js, notification_pattern, notification_replacement, 'Normalize real Owner-style notification bell without polling')
    else:
        print('ALREADY: Shifts browser interaction V2')

    if 'PMD_SHIFTS_CANONICAL_VISUAL_V2' not in css:
        css += r'''

/* PMD_SHIFTS_CANONICAL_VISUAL_V2
 * Static first paint, truthful connected-shift lanes, and normal Owner bell.
 */
body.pmd-shifts-page .page-content,
body.pmd-shifts-page .page-wrapper,
body.pmd-shifts-page .page-title{animation:none!important;transition:none!important}
body.pmd-shifts-page .page-content{opacity:1!important;transform:none!important;filter:none!important}
body.pmd-shifts-page #pmd-shifts{scroll-behavior:auto!important}
body.pmd-shifts-page .pmd-shifts-final-shift-group__segments{position:absolute!important;inset:4px 5px 4px 7px!important;display:block!important;min-width:0!important;pointer-events:none!important}
body.pmd-shifts-page .pmd-shifts-final-shift-segment{position:absolute!important;display:grid!important;align-content:center!important;min-width:24px!important;margin:0!important;padding:2px 6px!important;box-sizing:border-box!important;border:1px solid var(--pmd-role-border)!important;border-radius:6px!important;background:rgba(255,255,255,.82)!important;color:var(--pmd-role-text)!important;overflow:hidden!important;cursor:pointer!important;pointer-events:auto!important}
body.pmd-shifts-page .pmd-shifts-final-shift-segment strong{font-size:9px!important;line-height:1.05!important}
body.pmd-shifts-page .pmd-shifts-final-shift-segment span{font-size:8px!important;line-height:1.05!important}
body.pmd-shifts-page .pmd-shifts__notification-slot{display:inline-grid!important;place-items:center!important;visibility:visible!important;opacity:1!important}
body.pmd-shifts-page .pmd-shifts__notification-root{display:grid!important;visibility:visible!important;opacity:1!important}
body.pmd-shifts-page .pmd-shifts__notification-root #notifDropdown{display:grid!important;place-items:center!important;visibility:visible!important;opacity:1!important}
body.pmd-shifts-page .pmd-shifts__notification-root #bell-icon{display:grid!important;place-items:center!important;width:20px!important;height:20px!important}
body.pmd-shifts-page .pmd-shifts__notification-root #bell-icon svg{display:block!important;width:20px!important;height:20px!important;fill:none!important;stroke:currentColor!important;stroke-width:2!important;stroke-linecap:round!important;stroke-linejoin:round!important}
'''
        print('PATCH: Append Shifts canonical visual V2')
    else:
        print('ALREADY: Shifts canonical visual V2')

    # Fingerprinted asset filenames guarantee browsers/proxies cannot serve the
    # pre-V3 JS/CSS after deployment. The existing files remain the source
    # authorities; the fingerprinted files are immutable delivery artifacts.
    js_hash = hashlib.sha256(js.encode('utf-8')).hexdigest()[:12]
    css_hash = hashlib.sha256(css.encode('utf-8')).hexdigest()[:12]
    js_name = f'pmd-shifts-canonical-{js_hash}.js'
    css_name = f'pmd-shifts-canonical-{css_hash}.css'
    js_target = JS.parent / js_name
    css_target = CSS.parent / css_name

    css_pattern = r"\$this->addCss\('css/(?:pmd-shifts-dashboard-reservations-v4\.css|pmd-shifts-canonical-[0-9a-f]{12}\.css)'\);"
    js_pattern = r"\$this->addJs\('js/(?:pmd-shifts-v1\.js|pmd-shifts-canonical-[0-9a-f]{12}\.js)'\);"
    css_registration = "$this->addCss('css/" + css_name + "');"
    js_registration = "$this->addJs('js/" + js_name + "');"

    controller, css_count = re.subn(css_pattern, lambda _m: css_registration, controller, count=1)
    controller, js_count = re.subn(js_pattern, lambda _m: js_registration, controller, count=1)
    if css_count != 1 or js_count != 1:
        raise RuntimeError(f'asset registration: CSS matches={css_count}, JS matches={js_count}')
    if 'PMD_SHIFTS_FINGERPRINTED_ASSETS_V1' not in controller:
        controller = controller.replace(
            css_registration,
            "// PMD_SHIFTS_FINGERPRINTED_ASSETS_V1\n        " + css_registration,
            1,
        )
    print(f'PATCH: Fingerprint CSS as {css_name}')
    print(f'PATCH: Fingerprint JS as {js_name}')

    # Validate transformed content before touching disk.
    for token in ['PMD_SHIFTS_CANONICAL_INTERACTION_V2', 'layoutShiftGroup', 'normalizeHeaderNotification']:
        if token not in js:
            raise RuntimeError(f'post-transform JS missing {token}')
    for token in ['PMD_SHIFTS_CANONICAL_VISUAL_V2']:
        if token not in css:
            raise RuntimeError(f'post-transform CSS missing {token}')
    if js_name not in controller or css_name not in controller:
        raise RuntimeError('controller does not reference fingerprinted Shifts assets')

except Exception as error:
    raise SystemExit(f'ERROR before write: {error}')

BACKUP.mkdir(parents=True, exist_ok=False)
for source in [CONTROLLER, JS, CSS]:
    dest = BACKUP / source.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)
print(f'BACKUP: {BACKUP}')

created = []
try:
    CONTROLLER.write_text(controller, encoding='utf-8')
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

    commands = [
        ['php', '-l', str(CONTROLLER)],
        ['node', '--check', str(JS)] if shutil.which('node') else None,
        ['node', '--check', str(js_target)] if shutil.which('node') else None,
    ]
    for command in [item for item in commands if item]:
        result = subprocess.run(command, cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        print(result.stdout.strip())
        if result.returncode != 0:
            raise RuntimeError('validation failed: ' + ' '.join(command))

    if hashlib.sha256(js_target.read_bytes()).hexdigest()[:12] != js_hash:
        raise RuntimeError('fingerprinted JS content hash mismatch')
    if hashlib.sha256(css_target.read_bytes()).hexdigest()[:12] != css_hash:
        raise RuntimeError('fingerprinted CSS content hash mismatch')

except Exception:
    print('ERROR: validation failed; restoring V3 source files', file=sys.stderr)
    for source in [CONTROLLER, JS, CSS]:
        backup = BACKUP / source.relative_to(ROOT)
        if backup.exists():
            shutil.copyfile(backup, source)
    for target in created:
        try:
            target.unlink()
        except FileNotFoundError:
            pass
    raise

print('OK: Shifts live finish V4 applied')
print('ASSET_JS: ' + js_name)
print('ASSET_CSS: ' + css_name)
print('OK: safe Site Access middleware V2 was not modified')
