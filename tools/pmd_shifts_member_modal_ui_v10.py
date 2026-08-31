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
BACKUP = ROOT / '.pmd-hotfix-backups' / ('shifts-member-modal-ui-v10-' + STAMP)

VIEW = ROOT / 'app/admin/views/pmdshifts/index.blade.php'
CSS = ROOT / 'app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css'
CONTROLLER = ROOT / 'app/admin/controllers/Shifts.php'
GATE = ROOT / 'app/Http/Middleware/PmdSiteAccessGateMiddleware.php'

for path in [VIEW, CSS, CONTROLLER, GATE]:
    if not path.is_file():
        raise SystemExit(f'ERROR: missing required file: {path}')

view = VIEW.read_text(encoding='utf-8')
css = CSS.read_text(encoding='utf-8')
controller = CONTROLLER.read_text(encoding='utf-8')
gate = GATE.read_text(encoding='utf-8')

# V10 is intentionally scoped to the member modal UI. Do not run it against an
# older live state because the Role-only model must already be active.
for token, text, label in [
    ('PMD_SHIFTS_MEMBER_NO_AREA_V1', view, 'V9 member view'),
    ('PMD_SHIFTS_ROLE_ONLY_MEMBER_V1', controller, 'V9 controller'),
    ('PMD_SHIFTS_ROLE_FAMILY_PALETTE_V2', css, 'V8/V9 Shifts CSS'),
    ('PMD_TRUSTED_DEVICE_LOGIN_GATE_V1', gate, 'trusted-device middleware'),
]:
    if token not in text:
        raise SystemExit(f'ERROR: expected {label} marker {token}')
if 'finalizeAdminHtml' in gate:
    raise SystemExit('ERROR: forbidden HTML-rewrite middleware detected')
if 'data-pmd-team-department' in view:
    raise SystemExit('ERROR: Area field unexpectedly exists; V9 state is not active')

# -------------------------------------------------------------------------
# 1. Remove the redundant Add/Edit team member subheading from real markup.
# -------------------------------------------------------------------------
if 'PMD_SHIFTS_MEMBER_MODAL_UI_V10' not in view:
    head_pattern = r'''\n\s*<div\s+class=["']pmd-shifts__team-form-head["']>\s*<strong\s+data-pmd-team-form-title>.*?</strong>\s*</div>'''
    view, head_count = re.subn(head_pattern, '', view, count=1, flags=re.S | re.I)
    if head_count != 1:
        raise RuntimeError(f'Remove duplicate Member subheading: expected 1 match, found {head_count}')

    form_anchor = '<form class="pmd-shifts__team-form pmd-shifts__team-editor"'
    pos = view.find(form_anchor)
    if pos < 0:
        raise RuntimeError('Member form anchor not found')
    line_start = view.rfind('\n', 0, pos) + 1
    indent = view[line_start:pos]
    marker = indent + '{{-- PMD_SHIFTS_MEMBER_MODAL_UI_V10: one title, one compact field flow, no Area gap. --}}\n'
    view = view[:line_start] + marker + view[line_start:]
    print('PATCH: Remove redundant Add/Edit team member subheading')
else:
    print('ALREADY: Member modal markup V10')

# -------------------------------------------------------------------------
# 2. Compact, balanced form geometry. Role owns the entire row after Area died.
# -------------------------------------------------------------------------
if 'PMD_SHIFTS_MEMBER_MODAL_POLISH_V10' not in css:
    css += r'''

/* PMD_SHIFTS_MEMBER_MODAL_POLISH_V10
 * Member has one visual title (the modal header). The removed Area field must
 * not leave a ghost second column. Keep the editor compact and aligned with
 * the rest of the admin platform without animations or decorative whitespace.
 */
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor-card{
  width:min(500px,calc(100vw - 24px))!important;
  max-height:calc(100dvh - 24px)!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor-card .pmd-shifts__modal-header{
  min-height:0!important;
  padding:14px 18px!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor-card .pmd-shifts__modal-header h2{
  margin:0!important;
  font-size:20px!important;
  line-height:1.15!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor{
  display:grid!important;
  grid-template-columns:1fr!important;
  gap:10px!important;
  padding:14px 18px 0!important;
  border:0!important;
  background:#fff!important;
  overflow:auto!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor .pmd-shifts__team-form-head{
  display:none!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor>label,
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor .pmd-shifts__team-identity-row>label,
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor .pmd-shifts__team-access-fields>label{
  display:grid!important;
  gap:5px!important;
  min-width:0!important;
  margin:0!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor label>span:first-child{
  margin:0!important;
  line-height:1.2!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor .pmd-shifts__team-identity-row{
  display:grid!important;
  grid-template-columns:minmax(0,1fr)!important;
  gap:0!important;
  width:100%!important;
  margin:0!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor .pmd-shifts__team-identity-row input,
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor .pmd-shifts__team-identity-row select{
  width:100%!important;
  max-width:none!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor .pmd-shifts__team-access-fields{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
  gap:10px 12px!important;
  width:100%!important;
  padding:0!important;
  margin:0!important;
  border:0!important;
  background:transparent!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor .pmd-shifts__team-access-fields .is-password{
  grid-column:1/-1!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor input,
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor select{
  box-sizing:border-box!important;
  width:100%!important;
  height:42px!important;
  min-height:42px!important;
  margin:0!important;
  padding:0 11px!important;
  border-radius:10px!important;
  transition:none!important;
  animation:none!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-password-row{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) auto!important;
  gap:10px!important;
  align-items:stretch!important;
  width:100%!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-password-row>button{
  box-sizing:border-box!important;
  min-width:96px!important;
  height:42px!important;
  min-height:42px!important;
  margin:0!important;
  padding:0 14px!important;
  border-radius:10px!important;
  transition:none!important;
  animation:none!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor-footer{
  margin:4px -18px 0!important;
  padding:12px 18px!important;
  gap:10px!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor-footer .pmd-shifts__button{
  min-height:42px!important;
  margin:0!important;
  border-radius:10px!important;
  transition:none!important;
  animation:none!important;
}
@media(max-width:600px){
  body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor-card{width:min(100%,calc(100vw - 16px))!important}
  body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor .pmd-shifts__team-access-fields{grid-template-columns:1fr!important}
  body.pmd-shifts-page #pmd-shifts .pmd-shifts__team-editor .pmd-shifts__team-access-fields .is-password{grid-column:auto!important}
}
'''
    print('PATCH: Make Member modal compact and remove the empty Role column')
else:
    print('ALREADY: Member modal CSS V10')

# Fingerprint the canonical Shifts CSS so Safari/proxies cannot retain V9.
css_hash = hashlib.sha256(css.encode('utf-8')).hexdigest()[:12]
css_name = f'pmd-shifts-canonical-{css_hash}.css'
css_target = CSS.parent / css_name
css_pattern = r"\$this->addCss\('css/pmd-shifts-canonical-[0-9a-f]{12}\.css'\);"
css_registration = "$this->addCss('css/" + css_name + "');"
controller, css_count = re.subn(css_pattern, lambda _m: css_registration, controller, count=1)
if css_count != 1:
    raise RuntimeError(f'Update fingerprinted CSS registration: expected 1 match, found {css_count}')

# Pre-write validation.
for token, text, label in [
    ('PMD_SHIFTS_MEMBER_MODAL_UI_V10', view, 'view'),
    ('PMD_SHIFTS_MEMBER_MODAL_POLISH_V10', css, 'css'),
    (css_name, controller, 'controller'),
]:
    if token not in text:
        raise RuntimeError(f'Pre-write validation: {label} missing {token}')
if 'data-pmd-team-form-title' in view:
    raise RuntimeError('Pre-write validation: duplicate Member subheading still exists')
if 'data-pmd-team-department' in view:
    raise RuntimeError('Pre-write validation: Area field reappeared')

BACKUP.mkdir(parents=True, exist_ok=False)
for source in [VIEW, CSS, CONTROLLER]:
    dest = BACKUP / source.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)
print(f'BACKUP: {BACKUP}')

original_view = VIEW.read_text(encoding='utf-8')
original_css = CSS.read_text(encoding='utf-8')
original_controller = CONTROLLER.read_text(encoding='utf-8')
created = []

try:
    VIEW.write_text(view, encoding='utf-8')
    CSS.write_text(css, encoding='utf-8')
    CONTROLLER.write_text(controller, encoding='utf-8')

    existed = css_target.exists()
    css_target.write_text(css, encoding='utf-8')
    stat = CSS.stat()
    os.chown(css_target, stat.st_uid, stat.st_gid)
    os.chmod(css_target, stat.st_mode & 0o777)
    if not existed:
        created.append(css_target)

    result = subprocess.run(
        ['php', '-l', str(CONTROLLER)],
        cwd=str(ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    print(result.stdout.strip())
    if result.returncode != 0:
        raise RuntimeError('PHP validation failed for Shifts controller')

    final_view = VIEW.read_text(encoding='utf-8')
    if 'data-pmd-team-form-title' in final_view:
        raise RuntimeError('duplicate subheading exists after write')
    if 'data-pmd-team-department' in final_view:
        raise RuntimeError('Area exists after write')
    if hashlib.sha256(css_target.read_bytes()).hexdigest()[:12] != css_hash:
        raise RuntimeError('fingerprinted CSS content hash mismatch')

except Exception:
    print('ERROR: V10 validation failed; restoring previous files', file=sys.stderr)
    VIEW.write_text(original_view, encoding='utf-8')
    CSS.write_text(original_css, encoding='utf-8')
    CONTROLLER.write_text(original_controller, encoding='utf-8')
    for target in created:
        try:
            target.unlink()
        except FileNotFoundError:
            pass
    raise

print('OK: duplicate Add/Edit team member line removed')
print('OK: Role now uses the full row with no ghost Area column')
print('OK: Member editor spacing is compact and aligned')
print('ASSET_CSS: ' + css_name)
print('NOTE: V10 changes UI only; no migration and no auth/security changes')
