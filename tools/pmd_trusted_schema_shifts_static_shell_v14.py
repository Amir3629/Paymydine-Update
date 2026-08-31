#!/usr/bin/env python3
from pathlib import Path
import datetime as dt
import re
import shutil
import subprocess
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '/var/www/paymydine').resolve()
STAMP = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d_%H%M%S')
BACKUP = ROOT / '.pmd-hotfix-backups' / ('trusted-schema-shifts-shell-v14-' + STAMP)

CONTROLLER = ROOT / 'app/admin/controllers/Shifts.php'
SIDE = ROOT / 'app/admin/views/_partials/pmd_side_menu2_global.blade.php'
LAYOUT = ROOT / 'app/admin/assets/js/pmd-admin-exact-layout-v1.js'
MIGRATION = ROOT / 'app/system/database/migrations/2026_08_31_010000_add_user_id_to_pmd_site_access_devices.php'
TRUSTED = ROOT / 'app/Services/PmdTrustedLoginDeviceService.php'

for path in [CONTROLLER, SIDE, LAYOUT, TRUSTED]:
    if not path.is_file():
        raise SystemExit(f'ERROR: missing required file: {path}')

controller = CONTROLLER.read_text(encoding='utf-8')
side = SIDE.read_text(encoding='utf-8')
layout = LAYOUT.read_text(encoding='utf-8')
trusted = TRUSTED.read_text(encoding='utf-8')

if 'PMD_TRUSTED_LOGIN_DEVICE_V3' not in trusted:
    raise SystemExit('ERROR: Auth V13 trusted service is not active')
if 'pmd-shifts-first-paint-v13.css' not in controller:
    raise SystemExit('ERROR: Shifts V13 first-paint registration is not active')
if 'PMD_SHIFTS_SERVER_FIRST_BOOT_SKIP_V13' not in (ROOT / 'app/admin/assets/js/pmd-shifts-v1.js').read_text(encoding='utf-8'):
    raise SystemExit('ERROR: Shifts V13 server-first JS is not active')

originals = {CONTROLLER: controller, SIDE: side, LAYOUT: layout}
created_migration = False

migration_content = r'''<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** PMD_TRUSTED_LOGIN_DEVICE_USER_BINDING_V1 */
class AddUserIdToPmdSiteAccessDevices extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_site_access_devices')) return;

        if (!Schema::hasColumn('pmd_site_access_devices', 'user_id')) {
            Schema::table('pmd_site_access_devices', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->after('location_id');
                $table->index(
                    ['user_id', 'location_id', 'device_kind', 'revoked_at'],
                    'pmd_site_devices_user_location_kind_idx'
                );
            });
        }

        if (Schema::hasTable('users') && Schema::hasColumn('users', 'staff_id')) {
            DB::table('pmd_site_access_devices')
                ->whereNull('user_id')
                ->whereNotNull('staff_id')
                ->orderBy('id')
                ->chunkById(200, function ($devices) {
                    foreach ($devices as $device) {
                        $userId = (int)DB::table('users')
                            ->where('staff_id', (int)$device->staff_id)
                            ->orderBy('user_id')
                            ->value('user_id');

                        if ($userId > 0) {
                            DB::table('pmd_site_access_devices')
                                ->where('id', (int)$device->id)
                                ->whereNull('user_id')
                                ->update([
                                    'user_id' => $userId,
                                    'updated_at' => now(),
                                ]);
                        }
                    }
                }, 'id');
        }
    }

    public function down()
    {
        if (
            !Schema::hasTable('pmd_site_access_devices')
            || !Schema::hasColumn('pmd_site_access_devices', 'user_id')
        ) {
            return;
        }

        Schema::table('pmd_site_access_devices', function (Blueprint $table) {
            try {
                $table->dropIndex('pmd_site_devices_user_location_kind_idx');
            } catch (\Throwable $error) {
            }
            $table->dropColumn('user_id');
        });
    }
}
'''

if MIGRATION.exists():
    current = MIGRATION.read_text(encoding='utf-8')
    if 'PMD_TRUSTED_LOGIN_DEVICE_USER_BINDING_V1' not in current:
        raise SystemExit('ERROR: trusted-login migration path exists with unexpected content')
    print('CHECK: trusted-login migration already present')
else:
    MIGRATION.parent.mkdir(parents=True, exist_ok=True)
    MIGRATION.write_text(migration_content, encoding='utf-8')
    MIGRATION.chmod(0o644)
    created_migration = True
    print('INSTALL: trusted-login user_id migration')

if 'PMD_SHIFTS_DEDICATED_SHELL_V14' not in controller:
    old_body = "$this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-shifts-page');"
    new_body = "// PMD_SHIFTS_DEDICATED_SHELL_V14\n        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-shifts-page');"
    if controller.count(old_body) != 1:
        raise RuntimeError(f'Shifts bodyClass anchor mismatch={controller.count(old_body)}')
    controller = controller.replace(old_body, new_body, 1)

    settings_css = "        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');\n"
    if controller.count(settings_css) != 1:
        raise RuntimeError(f'Settings first-paint CSS anchor mismatch={controller.count(settings_css)}')
    controller = controller.replace(settings_css, '', 1)
    print('PATCH: Shifts detached from Settings first-paint authority')
else:
    print('ALREADY: Shifts dedicated shell V14')

if 'PMD_SHIFTS_STATIC_SHELL_ROUTE_V14' not in side:
    anchor = "    $pmdIsSettingsSuiteRoute = $pmdIsSettingsSuiteRoute || $pmdIsDeviceSettingsSuiteRoute;\n\n\n"
    insert = anchor + "    /* PMD_SHIFTS_STATIC_SHELL_ROUTE_V14 */\n    $pmdIsShiftsStaticShell = $pmdPath === 'admin/shifts';\n\n\n"
    if side.count(anchor) != 1:
        raise RuntimeError('Side-menu route marker anchor mismatch')
    side = side.replace(anchor, insert, 1)

    marker_anchor = "    @if($pmdPath === 'admin/dashboard2')\n"
    marker_insert = """    @if($pmdIsShiftsStaticShell)
    document.documentElement.classList.add(
        'pmd-shifts-static-shell-v14'
    );
    @endif

""" + marker_anchor
    if side.count(marker_anchor) != 1:
        raise RuntimeError('Side-menu HTML class marker anchor mismatch')
    side = side.replace(marker_anchor, marker_insert, 1)
    print('PATCH: Shifts route marker emitted before paint')

if 'PMD_SHIFTS_STATIC_SHELL_FIRST_PAINT_V14' not in side:
    anchor = "<!-- PMD_SM2_ZERO_REFRESH_TRANSITION_V8_START -->\n"
    static_style = r'''@if($pmdIsShiftsStaticShell)
<!-- PMD_SHIFTS_STATIC_SHELL_FIRST_PAINT_V14_START -->
<style id="pmd-shifts-static-shell-first-paint-v14">
  html.pmd-shifts-static-shell-v14,
  html.pmd-shifts-static-shell-v14 body {
    margin:0!important;
    padding:0!important;
    background:#f8fbfd!important;
    overflow-x:hidden!important;
  }

  html.pmd-shifts-static-shell-v14 .page-wrapper {
    position:absolute!important;
    left:86px!important;
    right:auto!important;
    width:calc(100vw - 86px)!important;
    max-width:none!important;
    min-width:0!important;
    margin:0!important;
    padding:0!important;
    box-sizing:border-box!important;
    overflow-x:hidden!important;
    z-index:1!important;
    transform:none!important;
    transition:none!important;
    animation:none!important;
  }

  html.pmd-shifts-static-shell-v14.pmd-sm2-expanded .page-wrapper {
    left:198px!important;
    width:calc(100vw - 198px)!important;
  }

  html.pmd-shifts-static-shell-v14 .page-content {
    position:relative!important;
    left:0!important;
    right:auto!important;
    top:0!important;
    width:100%!important;
    max-width:none!important;
    min-width:0!important;
    margin:0!important;
    padding-left:14px!important;
    padding-right:14px!important;
    box-sizing:border-box!important;
    overflow-x:hidden!important;
    opacity:1!important;
    visibility:visible!important;
    transform:none!important;
    transition:none!important;
    animation:none!important;
  }

  html.pmd-shifts-static-shell-v14 .page-content > * {
    box-sizing:border-box!important;
    min-width:0!important;
    max-width:100%!important;
  }

  html.pmd-shifts-static-shell-v14 .navbar-top,
  html.pmd-shifts-static-shell-v14 .navbar-fixed-top {
    left:86px!important;
    right:0!important;
    width:calc(100vw - 86px)!important;
    max-width:none!important;
    margin-left:0!important;
    box-sizing:border-box!important;
    transform:none!important;
    transition:none!important;
    animation:none!important;
  }

  html.pmd-shifts-static-shell-v14.pmd-sm2-expanded .navbar-top,
  html.pmd-shifts-static-shell-v14.pmd-sm2-expanded .navbar-fixed-top {
    left:198px!important;
    width:calc(100vw - 198px)!important;
  }

  @media (max-width:767px) {
    html.pmd-shifts-static-shell-v14 .page-wrapper,
    html.pmd-shifts-static-shell-v14.pmd-sm2-expanded .page-wrapper {
      left:0!important;
      width:100vw!important;
    }

    html.pmd-shifts-static-shell-v14 .page-content {
      padding-left:10px!important;
      padding-right:10px!important;
    }

    html.pmd-shifts-static-shell-v14 .navbar-top,
    html.pmd-shifts-static-shell-v14 .navbar-fixed-top,
    html.pmd-shifts-static-shell-v14.pmd-sm2-expanded .navbar-top,
    html.pmd-shifts-static-shell-v14.pmd-sm2-expanded .navbar-fixed-top {
      left:0!important;
      width:100vw!important;
    }
  }
</style>
<!-- PMD_SHIFTS_STATIC_SHELL_FIRST_PAINT_V14_END -->
@endif

'''
    if side.count(anchor) != 1:
        raise RuntimeError('Static shell insertion anchor mismatch')
    side = side.replace(anchor, static_style + anchor, 1)
    print('PATCH: static Shifts shell geometry installed')

if 'PMD_SHIFTS_STATIC_LAYOUT_V14' not in layout:
    dashboard_fn = """  function isDashboard2() {
    return normalizedPath === '/admin/dashboard2';
  }

"""
    replacement = dashboard_fn + """  // PMD_SHIFTS_STATIC_LAYOUT_V14
  function isShifts() {
    return normalizedPath === '/admin/shifts';
  }

"""
    if layout.count(dashboard_fn) != 1:
        raise RuntimeError('exact-layout dashboard function anchor mismatch')
    layout = layout.replace(dashboard_fn, replacement, 1)

    old_return = "    return isSettingsSuite() || isDashboard2();"
    new_return = "    return isSettingsSuite() || isDashboard2() || isShifts();"
    if layout.count(old_return) != 1:
        raise RuntimeError('isStaticBootRoute return anchor mismatch')
    layout = layout.replace(old_return, new_return, 1)

    old_local = "    var staticBootRoute = settingsSuite || dashboard2;"
    new_local = "    var staticBootRoute = settingsSuite || dashboard2 || isShifts();"
    if layout.count(old_local) != 1:
        raise RuntimeError('apply staticBootRoute anchor mismatch')
    layout = layout.replace(old_local, new_local, 1)
    print('PATCH: exact-layout recognizes Shifts as static boot route')

for token, text, label in [
    ('PMD_SHIFTS_DEDICATED_SHELL_V14', controller, 'Shifts controller'),
    ('PMD_SHIFTS_STATIC_SHELL_ROUTE_V14', side, 'side-menu route'),
    ('PMD_SHIFTS_STATIC_SHELL_FIRST_PAINT_V14', side, 'side-menu CSS'),
    ('PMD_SHIFTS_STATIC_LAYOUT_V14', layout, 'exact layout'),
]:
    if token not in text:
        raise RuntimeError(f'{label} missing marker {token}')

BACKUP.mkdir(parents=True, exist_ok=False)
for path, content in originals.items():
    destination = BACKUP / path.relative_to(ROOT)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, destination)
print('BACKUP:', BACKUP)

try:
    CONTROLLER.write_text(controller, encoding='utf-8')
    SIDE.write_text(side, encoding='utf-8')
    LAYOUT.write_text(layout, encoding='utf-8')

    php = subprocess.run(
        ['php', '-l', str(CONTROLLER)],
        cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    print(php.stdout.strip())
    if php.returncode != 0:
        raise RuntimeError('Shifts controller PHP lint failed')

    migration_lint = subprocess.run(
        ['php', '-l', str(MIGRATION)],
        cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    print(migration_lint.stdout.strip())
    if migration_lint.returncode != 0:
        raise RuntimeError('trusted migration PHP lint failed')

    node = subprocess.run(
        ['node', '--check', str(LAYOUT)],
        cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    if node.stdout.strip():
        print(node.stdout.strip())
    if node.returncode != 0:
        raise RuntimeError('exact-layout JS check failed')

except Exception:
    print('ERROR: restoring V14 source backup', file=sys.stderr)
    for path, content in originals.items():
        path.write_text(content, encoding='utf-8')
    if created_migration:
        try:
            MIGRATION.unlink()
        except FileNotFoundError:
            pass
    raise

print('OK: V14 source patch installed')
