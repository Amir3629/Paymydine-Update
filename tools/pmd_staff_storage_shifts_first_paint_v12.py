#!/usr/bin/env python3
from pathlib import Path
import datetime as dt
import os
import re
import shutil
import subprocess
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '/var/www/paymydine').resolve()
STAMP = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d_%H%M%S')
BACKUP = ROOT / '.pmd-hotfix-backups' / ('staff-storage-shifts-first-paint-v12-' + STAMP)

CONTROLLER = ROOT / 'app/admin/controllers/Shifts.php'
VIEW = ROOT / 'app/admin/views/pmdshifts/index.blade.php'
SMOOTH = ROOT / 'app/admin/assets/js/smooth-transitions.js'
FIRST_PAINT = ROOT / 'app/admin/assets/css/pmd-shifts-first-paint-v12.css'
MIGRATION = ROOT / 'app/system/database/migrations/2026_08_31_121500_repair_pmd_staff_portal_storage.php'
GATE = ROOT / 'app/Http/Middleware/PmdSiteAccessGateMiddleware.php'

for path in [CONTROLLER, VIEW, SMOOTH, GATE]:
    if not path.is_file():
        raise SystemExit(f'ERROR: missing required file: {path}')

controller = CONTROLLER.read_text(encoding='utf-8')
view = VIEW.read_text(encoding='utf-8')
smooth = SMOOTH.read_text(encoding='utf-8')
gate = GATE.read_text(encoding='utf-8')

if 'PMD_TRUSTED_DEVICE_LOGIN_GATE_V1' not in gate or 'finalizeAdminHtml' in gate:
    raise SystemExit('ERROR: expected security-only trusted-device middleware')
if 'PMD_SHIFTS_ACCESS_ROLE_GROUPING_V1' not in (ROOT / 'app/admin/assets/js/pmd-shifts-v1.js').read_text(encoding='utf-8'):
    raise SystemExit('ERROR: expected V11 Shifts grouping state')

originals = {CONTROLLER: controller, VIEW: view, SMOOTH: smooth}
created = []

if "pmd-shifts-first-paint-v12.css" not in controller:
    needle = "        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');\n"
    if controller.count(needle) != 1:
        raise RuntimeError('Shifts first-paint registration anchor not found')
    controller = controller.replace(
        needle,
        needle + "        $this->addCss('css/pmd-shifts-first-paint-v12.css');\n",
        1,
    )
    print('PATCH: register Shifts first-paint CSS before normal Shifts assets')

if 'PMD_SHIFTS_ROW_COUNT_FIRST_PAINT_V12' not in view:
    pattern = r'(data-pmd-shifts-day-surface\s*\n)(\s*aria-label="Daily shift plan")'
    replacement = (
        r'\1'
        '            {{-- PMD_SHIFTS_ROW_COUNT_FIRST_PAINT_V12 --}}\n'
        '            style="--pmd-shifts-row-count: {{ max(1, (int)$people->count()) }};"\n'
        r'\2'
    )
    view, count = re.subn(pattern, replacement, view, count=1)
    if count != 1:
        raise RuntimeError(f'Shifts day-surface row-count anchor mismatch: {count}')
    print('PATCH: reserve final Dienstplan height from the server')

if 'PMD_SHIFTS_NO_SMOOTH_TRANSITION_V12' not in smooth:
    init_needle = "    init() {\n        if (!this.contentArea) return;\n        \n        // Add transition styles to content area\n"
    init_replacement = """    init() {
        if (!this.contentArea) return;

        const pmdPath = String(window.location.pathname || '').replace(/\\/+$/, '');
        if (pmdPath === '/admin/shifts') {
            // PMD_SHIFTS_NO_SMOOTH_TRANSITION_V12
            // Dienstplan owns a static first paint. Never fade/translate it or
            // replace it through the legacy SPA-like page transition layer.
            this.contentArea.style.setProperty('transition', 'none', 'important');
            this.contentArea.style.setProperty('opacity', '1', 'important');
            this.contentArea.style.setProperty('transform', 'none', 'important');
            if (this.pageTitle) {
                this.pageTitle.style.setProperty('transition', 'none', 'important');
                this.pageTitle.style.setProperty('opacity', '1', 'important');
                this.pageTitle.style.setProperty('transform', 'none', 'important');
            }
            return;
        }
        
        // Add transition styles to content area
"""
    if smooth.count(init_needle) != 1:
        raise RuntimeError('smooth-transitions init anchor not found')
    smooth = smooth.replace(init_needle, init_replacement, 1)

    array_needle = "            '/admin/dashboard',\n            '/admin',\n"
    array_replacement = "            '/admin/dashboard',\n            '/admin/shifts',\n            '/admin',\n"
    if smooth.count(array_needle) != 1:
        raise RuntimeError('smooth-transitions noAjaxPages anchor not found')
    smooth = smooth.replace(array_needle, array_replacement, 1)
    print('PATCH: exclude Shifts from legacy smooth/AJAX page transitions')

css_content = r'''/* PMD_SHIFTS_FIRST_PAINT_STABLE_V12
 * First-frame geometry/visibility only. Prevents FOUC/layout shift.
 */
html body.pmd-shifts-page{background:#f8fbfd!important}
body.pmd-shifts-page .page-wrapper,
body.pmd-shifts-page .page-content,
body.pmd-shifts-page .page-title,
body.pmd-shifts-page #pmd-shifts,
body.pmd-shifts-page [data-pmd-shifts-day-surface],
body.pmd-shifts-page [data-pmd-shifts-hour-host]{opacity:1!important;visibility:visible!important;transform:none!important;filter:none!important;animation:none!important;transition:none!important}
body.pmd-shifts-page [data-pmd-shifts-day-surface]{min-height:calc(116px + (var(--pmd-shifts-row-count,1) * 104px))!important}
body.pmd-shifts-page [data-pmd-shifts-hour-host]{min-height:inherit!important}
body.pmd-shifts-page .pmd-shifts-final-scale-row{height:44px!important;min-height:44px!important;max-height:44px!important}
body.pmd-shifts-page .pmd-shifts-final-row{height:104px!important;min-height:104px!important;max-height:104px!important}
body.pmd-shifts-page .pmd-shifts-final-person,
body.pmd-shifts-page .pmd-shifts-final-track,
body.pmd-shifts-page .pmd-shifts-final-slots,
body.pmd-shifts-page .pmd-shifts-final-shifts{min-height:104px!important;height:104px!important}
body.pmd-shifts-page.is-transitioning .page-content,
body.pmd-shifts-page .page-content.is-transitioning{opacity:1!important;transform:none!important}
'''

migration_content = r'''<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** PMD_STAFF_PORTAL_STORAGE_REPAIR_V1 */
class RepairPmdStaffPortalStorage extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_staff_requests')) {
            Schema::create('pmd_staff_requests', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('staff_id');
                $table->unsignedBigInteger('person_id')->nullable();
                $table->string('request_type', 32);
                $table->unsignedBigInteger('shift_id')->nullable();
                $table->date('date_from')->nullable();
                $table->date('date_to')->nullable();
                $table->text('message')->nullable();
                $table->string('status', 24)->default('pending');
                $table->text('manager_reply')->nullable();
                $table->unsignedBigInteger('handled_by_staff_id')->nullable();
                $table->timestamp('handled_at')->nullable();
                $table->timestamps();
                $table->index(['location_id','status'], 'pmd_staff_requests_location_status_idx');
                $table->index(['staff_id','status'], 'pmd_staff_requests_staff_status_idx');
                $table->index(['person_id','created_at'], 'pmd_staff_requests_person_created_idx');
            });
        }
        if (!Schema::hasTable('pmd_staff_chat_groups')) {
            Schema::create('pmd_staff_chat_groups', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id');
                $table->string('name', 96);
                $table->string('group_type', 24)->default('custom');
                $table->unsignedBigInteger('created_by_staff_id')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->index(['location_id','is_active'], 'pmd_staff_chat_groups_location_active_idx');
            });
        }
        if (!Schema::hasTable('pmd_staff_chat_group_members')) {
            Schema::create('pmd_staff_chat_group_members', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('group_id');
                $table->unsignedBigInteger('staff_id');
                $table->string('member_role', 24)->default('member');
                $table->timestamps();
                $table->unique(['group_id','staff_id'], 'pmd_staff_chat_group_member_unique');
                $table->index(['staff_id','group_id'], 'pmd_staff_chat_member_staff_group_idx');
            });
        }
        if (!Schema::hasTable('pmd_staff_chat_messages')) {
            Schema::create('pmd_staff_chat_messages', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('group_id');
                $table->unsignedBigInteger('staff_id');
                $table->text('message');
                $table->timestamps();
                $table->index(['group_id','created_at'], 'pmd_staff_chat_messages_group_created_idx');
                $table->index(['location_id','created_at'], 'pmd_staff_chat_messages_location_created_idx');
            });
        }
        if (!Schema::hasTable('staff_attendance')) {
            Schema::create('staff_attendance', function (Blueprint $table) {
                $table->bigIncrements('attendance_id');
                $table->unsignedBigInteger('staff_id');
                $table->unsignedBigInteger('location_id')->nullable();
                $table->timestamp('check_in_time');
                $table->timestamp('check_out_time')->nullable();
                $table->decimal('hours_worked', 8, 2)->nullable();
                $table->text('metadata')->nullable();
                $table->timestamps();
                $table->index(['staff_id','check_out_time'], 'staff_attendance_staff_open_idx');
                $table->index(['location_id','check_in_time'], 'staff_attendance_location_checkin_idx');
            });
        }
    }

    public function down()
    {
        // Intentionally non-destructive: repair may now contain live staff data.
    }
}
'''

BACKUP.mkdir(parents=True, exist_ok=False)
for path, content in originals.items():
    dest = BACKUP / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

print('BACKUP:', BACKUP)

try:
    CONTROLLER.write_text(controller, encoding='utf-8')
    VIEW.write_text(view, encoding='utf-8')
    SMOOTH.write_text(smooth, encoding='utf-8')

    for target, content in [(FIRST_PAINT, css_content), (MIGRATION, migration_content)]:
        existed = target.exists()
        target.write_text(content, encoding='utf-8')
        if not existed:
            created.append(target)

    for target in [FIRST_PAINT, MIGRATION]:
        os.chmod(target, 0o644)

    for php_file in [CONTROLLER, MIGRATION]:
        check = subprocess.run(['php', '-l', str(php_file)], cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        print(check.stdout.strip())
        if check.returncode != 0:
            raise RuntimeError(f'PHP validation failed: {php_file}')

    node = subprocess.run(['node', '--check', str(SMOOTH)], cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if node.stdout.strip():
        print(node.stdout.strip())
    if node.returncode != 0:
        raise RuntimeError('smooth-transitions.js syntax check failed')

except Exception:
    print('ERROR: restoring V12 backup', file=sys.stderr)
    for path, content in originals.items():
        path.write_text(content, encoding='utf-8')
    for target in created:
        try:
            target.unlink()
        except FileNotFoundError:
            pass
    raise

print('OK: Staff Portal storage repair + Shifts first-paint V12 installed')
