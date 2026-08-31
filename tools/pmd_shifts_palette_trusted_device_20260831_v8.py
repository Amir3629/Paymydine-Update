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
BACKUP = ROOT / '.pmd-hotfix-backups' / ('shifts-palette-trusted-v8-' + STAMP)

CONTROLLER = ROOT / 'app/admin/controllers/Shifts.php'
CSS = ROOT / 'app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css'
GATE = ROOT / 'app/Http/Middleware/PmdSiteAccessGateMiddleware.php'
TRUSTED = ROOT / 'app/Services/PmdTrustedLoginDeviceService.php'

SOURCE_COMMIT = '724738ccfc17f653d0bf2367b0da697bec4c8e7f'
GATE_REL = 'app/Http/Middleware/PmdSiteAccessGateMiddleware.php'
TRUSTED_REL = 'app/Services/PmdTrustedLoginDeviceService.php'

for path in [CONTROLLER, CSS, GATE, TRUSTED]:
    if not path.is_file():
        raise SystemExit(f'ERROR: missing required file: {path}')

controller = CONTROLLER.read_text(encoding='utf-8')
css = CSS.read_text(encoding='utf-8')
gate = GATE.read_text(encoding='utf-8')
trusted = TRUSTED.read_text(encoding='utf-8')

# Production must still be on the restored security-only V2 before V8 installs
# the trusted-device hooks. Never build on the old HTML-rewrite experiment.
if 'PMD_SITE_ACCESS_WEB_GATE_V2' not in gate or 'finalizeAdminHtml' in gate:
    raise SystemExit('ERROR: safe PmdSiteAccessGateMiddleware V2 is not active')

for token in [
    'PMD_SHIFTS_COALESCE_RECONFIRM_V1',
    'PMD_SHIFTS_EXTEND_EXISTING_V1',
    'PMD_SHIFTS_FINGERPRINTED_ASSETS_V1',
]:
    if token not in controller:
        raise SystemExit(f'ERROR: controller missing {token}; expected V7 production state')

for token in [
    'PMD_SHIFTS_CANONICAL_VISUAL_V3',
    'PMD_SHIFTS_PLATFORM_CONTROLS_V1',
]:
    if token not in css:
        raise SystemExit(f'ERROR: CSS missing {token}; expected V7 production state')


def git_show(commit, path):
    result = subprocess.run(
        ['git', 'show', f'{commit}:{path}'],
        cwd=str(ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        raise RuntimeError(f'git show failed for {commit}:{path}: {result.stderr.strip()}')
    return result.stdout


# -------------------------------------------------------------------------
# 1. Install the security-only trusted-device authority from the pinned commit.
# -------------------------------------------------------------------------
new_gate = git_show(SOURCE_COMMIT, GATE_REL)
new_trusted = git_show(SOURCE_COMMIT, TRUSTED_REL)

if 'PMD_SITE_ACCESS_WEB_GATE_V2' not in new_gate:
    raise SystemExit('ERROR: pinned middleware lost V2 safe marker')
if 'PMD_TRUSTED_DEVICE_LOGIN_GATE_V1' not in new_gate:
    raise SystemExit('ERROR: pinned middleware missing trusted-device marker')
if 'finalizeAdminHtml' in new_gate:
    raise SystemExit('ERROR: pinned middleware contains forbidden HTML rewrite')
if 'PMD_TRUSTED_LOGIN_DEVICE_V2' not in new_trusted:
    raise SystemExit('ERROR: pinned trusted-device service is not V2')

print('PATCH: Activate trusted-device login in security-only middleware')
print('PATCH: Renew trusted browser cookie on normal use / trusted resume')


# -------------------------------------------------------------------------
# 2. One role family = one palette everywhere in Dienstplan.
# -------------------------------------------------------------------------
if 'PMD_SHIFTS_ROLE_FAMILY_PALETTE_V2' not in css:
    css += r'''

/* PMD_SHIFTS_ROLE_FAMILY_PALETTE_V2
 * Category color is deterministic, never per-person:
 * Kitchen / Team member / Waiter / Cashier / Reservations / Manager / Bar /
 * Accountant / Other. The identity cell, avatar, name and shift share one
 * family palette. Absent remains the only red state override.
 */
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row{
  --pmd-role-bg:#f2f4f7;
  --pmd-role-border:#a8b2bf;
  --pmd-role-accent:#6b7787;
  --pmd-role-text:#435063;
  --pmd-role-avatar:#eef1f5;
  --pmd-role-avatar-border:#b6c0cb;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="kitchen"]{
  --pmd-role-bg:#fff4d8;--pmd-role-border:#e1aa2f;--pmd-role-accent:#c17a00;--pmd-role-text:#654400;--pmd-role-avatar:#fff1c4;--pmd-role-avatar-border:#e8bf63;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="team_member"]{
  --pmd-role-bg:#e9faf6;--pmd-role-border:#63b9a7;--pmd-role-accent:#17806c;--pmd-role-text:#17594e;--pmd-role-avatar:#e2f7f2;--pmd-role-avatar-border:#79c4b5;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="waiter"]{
  --pmd-role-bg:#eaf3ff;--pmd-role-border:#80afe5;--pmd-role-accent:#2f80ed;--pmd-role-text:#174d91;--pmd-role-avatar:#e7f1ff;--pmd-role-avatar-border:#8db6e5;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="cashier"]{
  --pmd-role-bg:#eaf9ef;--pmd-role-border:#72bd8d;--pmd-role-accent:#27864c;--pmd-role-text:#1e6239;--pmd-role-avatar:#e6f7ec;--pmd-role-avatar-border:#7bc194;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="reservations"]{
  --pmd-role-bg:#f3ecff;--pmd-role-border:#aa88df;--pmd-role-accent:#7c4dcc;--pmd-role-text:#55318d;--pmd-role-avatar:#f0e8ff;--pmd-role-avatar-border:#b197dc;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="manager"]{
  --pmd-role-bg:#edf0ff;--pmd-role-border:#8997dc;--pmd-role-accent:#4f5fbd;--pmd-role-text:#354080;--pmd-role-avatar:#e9edff;--pmd-role-avatar-border:#98a3dc;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="bar"]{
  --pmd-role-bg:#fff0f4;--pmd-role-border:#dc8da4;--pmd-role-accent:#b94e70;--pmd-role-text:#7f3650;--pmd-role-avatar:#ffebf1;--pmd-role-avatar-border:#df9caf;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="accountant"]{
  --pmd-role-bg:#eaf8fb;--pmd-role-border:#78bdcb;--pmd-role-accent:#26889d;--pmd-role-text:#246071;--pmd-role-avatar:#e5f6fa;--pmd-role-avatar-border:#82c2cf;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="other"]{
  --pmd-role-bg:#f2f4f7;--pmd-role-border:#a8b2bf;--pmd-role-accent:#6b7787;--pmd-role-text:#435063;--pmd-role-avatar:#eef1f5;--pmd-role-avatar-border:#b6c0cb;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row .pmd-shifts-final-person{
  background:var(--pmd-role-bg)!important;
  box-shadow:inset 4px 0 0 var(--pmd-role-accent)!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row .pmd-shifts-final-avatar{
  background:var(--pmd-role-avatar)!important;
  border-color:var(--pmd-role-avatar-border)!important;
  color:var(--pmd-role-text)!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row .pmd-shifts-final-person-copy button,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row .pmd-shifts-final-person-copy small{
  color:var(--pmd-role-text)!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row .pmd-shifts-final-shift,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row .pmd-shifts-final-shift-group__coverage,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row .pmd-shifts-final-shift-segment{
  background:var(--pmd-role-bg)!important;
  border-color:var(--pmd-role-border)!important;
  color:var(--pmd-role-text)!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row .pmd-shifts-final-shift,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row .pmd-shifts-final-shift-group__coverage{
  border-left-color:var(--pmd-role-accent)!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row .pmd-shifts-final-shift.is-absent,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row .pmd-shifts-final-shift-segment.is-absent{
  background:#fff1f1!important;
  border-color:#e0a0a0!important;
  color:#8b2929!important;
}

/* V7 referenced a non-existent .pmd-shifts-final-member-button selector.
 * The real canonical control is .pmd-shifts-final-member-add. */
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-member-add{
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  box-sizing:border-box!important;
  height:42px!important;
  min-height:42px!important;
  max-height:42px!important;
  margin:0!important;
  padding:0 14px!important;
  border:1px solid #cfe0ec!important;
  border-radius:12px!important;
  background:#fff!important;
  color:#173752!important;
  box-shadow:0 3px 10px rgba(23,55,82,.05)!important;
  font:inherit!important;
  font-size:12px!important;
  font-weight:800!important;
  line-height:1!important;
  white-space:nowrap!important;
  cursor:pointer!important;
  transition:none!important;
  animation:none!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-member-add:hover,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-member-add:focus-visible{
  border-color:#bdd0df!important;
  background:#f4f8fb!important;
  color:#173752!important;
  outline:none!important;
}
'''
    print('PATCH: Enforce one deterministic color palette per role family')
    print('PATCH: Fix real +Member control class to standard white platform style')
else:
    print('ALREADY: role-family palette V2')


# Fingerprint CSS so Safari/proxies cannot keep the previous palette/control CSS.
css_hash = hashlib.sha256(css.encode('utf-8')).hexdigest()[:12]
css_name = f'pmd-shifts-canonical-{css_hash}.css'
css_target = CSS.parent / css_name
css_pattern = r"\$this->addCss\('css/pmd-shifts-canonical-[0-9a-f]{12}\.css'\);"
css_registration = "$this->addCss('css/" + css_name + "');"
controller, css_count = re.subn(css_pattern, lambda _m: css_registration, controller, count=1)
if css_count != 1:
    raise SystemExit(f'ERROR before write: fingerprinted CSS registration matches={css_count}')

for token, text, label in [
    ('PMD_SHIFTS_ROLE_FAMILY_PALETTE_V2', css, 'css'),
    ('.pmd-shifts-final-member-add', css, 'css'),
    (css_name, controller, 'controller'),
    ('PMD_TRUSTED_DEVICE_LOGIN_GATE_V1', new_gate, 'middleware'),
    ('PMD_TRUSTED_LOGIN_DEVICE_V2', new_trusted, 'trusted service'),
]:
    if token not in text:
        raise SystemExit(f'ERROR before write: {label} missing {token}')

BACKUP.mkdir(parents=True, exist_ok=False)
for source in [CONTROLLER, CSS, GATE, TRUSTED]:
    dest = BACKUP / source.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)
print(f'BACKUP: {BACKUP}')

original_controller = CONTROLLER.read_text(encoding='utf-8')
original_css = CSS.read_text(encoding='utf-8')
original_gate = GATE.read_text(encoding='utf-8')
original_trusted = TRUSTED.read_text(encoding='utf-8')
created = []

try:
    CONTROLLER.write_text(controller, encoding='utf-8')
    CSS.write_text(css, encoding='utf-8')
    GATE.write_text(new_gate, encoding='utf-8')
    TRUSTED.write_text(new_trusted, encoding='utf-8')

    existed = css_target.exists()
    css_target.write_text(css, encoding='utf-8')
    stat = CSS.stat()
    os.chown(css_target, stat.st_uid, stat.st_gid)
    os.chmod(css_target, stat.st_mode & 0o777)
    if not existed:
        created.append(css_target)

    for php_file in [CONTROLLER, GATE, TRUSTED]:
        result = subprocess.run(
            ['php', '-l', str(php_file)],
            cwd=str(ROOT),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        print(result.stdout.strip())
        if result.returncode != 0:
            raise RuntimeError(f'PHP validation failed: {php_file}')

    final_gate = GATE.read_text(encoding='utf-8')
    if 'finalizeAdminHtml' in final_gate:
        raise RuntimeError('forbidden HTML rewrite appeared in Site Access middleware')
    if 'PMD_TRUSTED_DEVICE_LOGIN_GATE_V1' not in final_gate:
        raise RuntimeError('trusted-device middleware marker missing after write')
    if hashlib.sha256(css_target.read_bytes()).hexdigest()[:12] != css_hash:
        raise RuntimeError('fingerprinted CSS content hash mismatch')

except Exception:
    print('ERROR: V8 validation failed; restoring previous files', file=sys.stderr)
    CONTROLLER.write_text(original_controller, encoding='utf-8')
    CSS.write_text(original_css, encoding='utf-8')
    GATE.write_text(original_gate, encoding='utf-8')
    TRUSTED.write_text(original_trusted, encoding='utf-8')
    for target in created:
        try:
            target.unlink()
        except FileNotFoundError:
            pass
    raise

print('OK: Shifts role-family palette V2 installed')
print('OK: trusted-device login V2 installed without HTML rewriting')
print('ASSET_CSS: ' + css_name)
print('NOTE: V8 does not run database migrations')
