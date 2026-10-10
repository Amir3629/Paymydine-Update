#!/usr/bin/env python3
"""Apply a pinned Restaurant Groups release to an existing checkout, not /tmp tests.
Only allowlisted feature files are merged. No checkout/reset/stash or DB rollback.
"""
from __future__ import annotations
import argparse
import fcntl
import datetime
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import signal
import stat
import subprocess
import sys
import tempfile

BASE = 'abc1df6082474cd8d1d2bc1be5e66cc4d03ce677'
EXACT = {
    'app/Services/SuperAdminTenantLifecycleService.php',
    'app/Providers/RestaurantGroupsServiceProvider.php',
    'app/system/ServiceProvider.php',
    'app/Console/Commands/RestaurantGroupsCommand.php',
    'app/admin/classes/User.php', 'app/admin/routes.php',
    'app/admin/assets/js/pmd-overlay-single-visual-plane-v4.js',
    'app/admin/views/superadmin_r2/layout.blade.php',
    'app/Services/RestaurantGroups/Store.php',
    'app/Services/RestaurantGroups/Auth.php',
    'app/Services/RestaurantGroups/ManagedIdentity.php',
    'app/admin/controllers/SuperAdminR2Controller.php',
    'app/Services/PmdSiteAccessWorkspaceGateService.php',
    'app/admin/views/superadmin_r2/restaurants.blade.php',
    'config/app.php', 'config/pmd_groups.php',
    'routes/pmd-groups.php',
    'app/admin/views/_partials/pmd_admin_i18n.blade.php',
    'app/admin/views/superadmin_r2/side_menu.blade.php',
    'app/admin/assets/css/pmd-restaurant-groups-v1.css',
    'app/admin/assets/js/pmd-restaurant-groups-v1.js',
    # R18: only the native Dashboard/Menu files required for in-place
    # read-only scope rendering. Do not touch unrelated Admin controllers.
    'app/admin/views/_partials/pmd_group_scope_firstpaint.blade.php',
    # R19: existing onboarding wizard and the server-first persistent return.
    'app/admin/views/_partials/pmd_quick_setup_return.blade.php',
    'app/admin/assets/js/pmd-onboarding-welcome-v1.js',
    'app/admin/assets/js/pmd-tenant-quick-setup-v3.js',
    'app/admin/views/dashboardlab/index.blade.php',
    'app/admin/views/pmdmenus/index.blade.php',
    'app/admin/assets/js/pmd-dashboard-lab-kpis-v1.js',
    'app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js',
    'app/admin/assets/js/pmd-dashboard-live-refresh-v1.js',
    'scripts/pmd-groups-live-tool.php',
}
PREFIXES = ('app/Services/RestaurantGroups/',
            'app/Http/Controllers/RestaurantGroups/', 'resources/views/pmd-groups/')
ENTRY = 'app/admin/views/superadmin_r2/restaurants.blade.php'
MARKER = "@includeIf('pmd-groups::entry')"
class DeployError(RuntimeError):
    pass

def run(args, *, cwd=None, data=None, output=None):
    result = subprocess.run([str(x) for x in args], cwd=cwd, input=data,
                            stdout=output if output is not None else subprocess.PIPE,
                            stderr=subprocess.PIPE)
    if result.returncode:
        # Never echo command output that may contain credentials/SQL bindings.
        raise DeployError(f'{Path(str(args[0])).name} failed (exit {result.returncode}).')
    return result.stdout

def git(root, *args):
    return run(['git', '-c', f'safe.directory={root}', *args], cwd=root)

def blob(root, ref, name):
    p = subprocess.run(['git','-c',f'safe.directory={root}','show',f'{ref}:{name}'],
                       cwd=root, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return p.stdout if p.returncode == 0 else None

def within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent); return True
    except ValueError:
        return False

def safe_path(root: Path, name: str) -> Path:
    if Path(name).is_absolute() or '..' in Path(name).parts:
        raise DeployError('Invalid deployment path.')
    p = root / name
    if not within(p.resolve(), root.resolve()):
        raise DeployError(f'Path escapes the application: {name}')
    if p.is_symlink():
        raise DeployError(f'Review symlink before deployment: {name}')
    return p

def merge_bytes(current: bytes, before: bytes, after: bytes, name: str) -> bytes:
    if current == after or before == after:
        return current
    if current == before:
        return after
    with tempfile.TemporaryDirectory(prefix='pmd-merge-') as tmp:
        paths = [Path(tmp) / s for s in ('current','base','release')]
        for p, value in zip(paths, (current, before, after)):
            p.write_bytes(value)
        r = subprocess.run(['git','merge-file','-p', *map(str, paths)],
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if r.returncode:
            raise DeployError(f'Merge conflict: {name}. No live files were changed; keep your local version for review.')
        return r.stdout

def known_feature_version(root: Path, ref: str, base: str, name: str, current: bytes | None) -> bool:
    """Accept only an exact file blob from this feature's first-parent history.

    This makes an installed R1-R4 release upgradeable without treating arbitrary
    local edits as trusted. Unknown content still stops the deployment.
    """
    if current is None:
        return False

    history = git(root, 'rev-list', '--first-parent', ref, '^'+base).decode().splitlines()
    for sha in history:
        if sha == ref:
            continue
        candidate = blob(root, sha, name)
        if candidate is not None and candidate == current:
            return True

    return False

def plan(root: Path, ref: str, base: str = BASE) -> dict[str, bytes]:
    if not re.fullmatch(r'[a-f0-9]{40}', ref):
        raise DeployError('A complete pinned commit SHA is required.')
    git(root, 'merge-base', '--is-ancestor', base, ref)
    names = git(root, 'diff', '--name-only', '-z', base, ref).decode().split('\0')
    changes = {}
    for name in filter(None, names):
        if name not in EXACT and not name.startswith(PREFIXES):
            continue
        dest = safe_path(root, name)
        before, after = blob(root, base, name), blob(root, ref, name)
        if after is None:
            raise DeployError(f'Deleting a runtime file is not supported: {name}')
        current = dest.read_bytes() if dest.is_file() else None

        # A previous pinned Restaurant Groups release may already be installed
        # even when the original feature base did not contain this file. Accept
        # only exact blobs from this branch's first-parent history. This also
        # avoids unnecessary three-way conflicts when upgrading a file that is
        # byte-for-byte identical to R1-R4.
        if current is not None and current != after and known_feature_version(root, ref, base, name, current):
            replacement = after
        elif before is None:
            if current is not None and current != after:
                raise DeployError(f'Existing unmerged feature file: {name}. No live files were changed.')
            replacement = after
        elif current is None:
            raise DeployError(f'Locally removed file requires review: {name}')
        else:
            replacement = merge_bytes(current, before, after, name)
        if replacement != current:
            changes[name] = replacement
    # R5 integrates all Restaurant Groups creation controls into the canonical
    # Restaurants modal. Remove the previous standalone-page entry marker from
    # live checkouts that installed R1-R4.
    page = safe_path(root, ENTRY)
    current = changes.get(ENTRY, page.read_bytes())
    text = current.decode('utf-8')
    cleaned = text.replace(MARKER+'\n', '').replace('\n'+MARKER, '').replace(MARKER, '')
    if cleaned.encode() != page.read_bytes():
        changes[ENTRY] = cleaned.encode()
    # Explicit opt-in is part of this installer. Preserve every other env setting.
    env_path = safe_path(root, '.env')
    env = env_path.read_text()
    key = 'PMD_RESTAURANT_GROUPS_ENABLED'
    matches = list(re.finditer(r'(?m)^' + key + r'=.*$', env))
    if len(matches) > 1:
        raise DeployError('Duplicate Restaurant Groups enable flag in .env; review before installing.')
    desired = re.sub(r'(?m)^' + key + r'=.*$', key + '=true', env) if matches else env.rstrip('\n')+'\n'+key+'=true\n'
    if desired != env:
        changes['.env'] = desired.encode()
    return changes

def save_originals(root, names, directory):
    records = {}
    for name in names:
        p = safe_path(root, name)
        if p.exists():
            if not p.is_file():
                raise DeployError(f'Not a regular file: {name}')
            s = p.stat()
            target = directory / 'files' / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(p, target)
            target.chmod(0o600)
            records[name] = {'present':True,'mode':stat.S_IMODE(s.st_mode),'uid':s.st_uid,'gid':s.st_gid}
        else:
            records[name] = {'present':False}
    return records

def atomic_write(p, content, mode, uid, gid):
    missing = []
    parent = p.parent
    while not parent.exists():
        missing.append(parent); parent = parent.parent
    for directory in reversed(missing):
        directory.mkdir(); directory.chmod(0o755)
        if os.geteuid() == 0: os.chown(directory, uid, gid)
    fd, temp = tempfile.mkstemp(prefix='.pmd-install-', dir=p.parent)
    try:
        with os.fdopen(fd, 'wb') as out:
            out.write(content); out.flush(); os.fsync(out.fileno())
        os.chmod(temp, mode)
        if os.geteuid() == 0:
            os.chown(temp, uid, gid)
        os.replace(temp, p)
    finally:
        if os.path.exists(temp): os.unlink(temp)

def restore(root, directory, records):
    for name, rec in records.items():
        p = safe_path(root, name)
        if rec['present']:
            atomic_write(p, (directory/'files'/name).read_bytes(), rec['mode'], rec['uid'], rec['gid'])
        elif p.exists():
            p.unlink()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('commit')
    parser.add_argument('--apply', action='store_true', help='Install runtime files and central schema; enable the feature.')
    parser.add_argument('--web-user', default='www-data')
    parser.add_argument('--app-user', help='CLI user for Artisan/helper commands. Auto-detected when omitted.')
    parser.add_argument('--fpm-service', help='Required when multiple PHP-FPM services are active.')
    args = parser.parse_args()
    def interrupted(signum, frame):
        raise DeployError(f'Installation interrupted by signal {signum}.')
    for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
        signal.signal(sig, interrupted)
    root = args.root.resolve()
    if not args.apply:
        raise DeployError('Pass --apply to install. This program is not the isolated test runner.')
    if os.geteuid() != 0:
        raise DeployError('Run this installer with sudo so backups, file ownership and PHP-FPM reload can be handled consistently.')
    for name in ('git','php','runuser','systemctl'):
        if not shutil.which(name): raise DeployError(f'Required executable not found: {name}')
    if not (root/'artisan').is_file() or not (root/'vendor/autoload.php').is_file():
        raise DeployError('Use the existing application checkout with its installed dependencies.')
    try:
        pwd.getpwnam(args.web_user)
    except KeyError:
        raise DeployError(f'Configured web user does not exist: {args.web_user}')
    if args.app_user:
        try:
            pwd.getpwnam(args.app_user)
        except KeyError:
            raise DeployError(f'Requested application CLI user does not exist: {args.app_user}')
    os.umask(0o022)
    php = shutil.which('php')
    backup_root = Path('/var/backups/paymydine-groups')
    if backup_root.is_symlink(): raise DeployError('Backup directory must not be a symlink.')
    backup_root.mkdir(mode=0o700, parents=True, exist_ok=True); backup_root.chmod(0o700)
    lockfile = (backup_root/'.install.lock').open('a')
    try: fcntl.flock(lockfile, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError: raise DeployError('Another Restaurant Groups installation is in progress.')
    # Avoid copying private staging .env files or switching the application's HEAD.
    changes = plan(root, args.commit)
    print(f'[PMD] Prepared {len(changes)} runtime/config files; unrelated files and Git HEAD are preserved.', flush=True)
    active = run(['systemctl','list-units','--type=service','--state=running','--no-legend','--plain']).decode()
    services = [s.split()[0] for s in active.splitlines() if re.match(r'^php[0-9]+\.[0-9]+-fpm\.service\s', s)]
    if args.fpm_service:
        service = re.sub(r'\.service$', '', args.fpm_service) + '.service'
        if service not in services: raise DeployError('Requested PHP-FPM service is not active.')
        services = [service]
    if len(services) != 1:
        raise DeployError('Select the application PHP-FPM service with --fpm-service; no live files changed.')
    version = re.search(r'php([0-9]+\.[0-9]+)', services[0]).group(1)
    php = shutil.which('php'+version) or php
    actual = run([php,'-r','echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;']).decode()
    if actual != version: raise DeployError('PHP CLI and selected PHP-FPM versions differ.')
    # The repository may be maintained by the SSH/deploy user while PHP-FPM
    # runs as www-data. Artisan maintenance/cache commands need write access to
    # storage/framework and bootstrap/cache, so do not force the FPM user.
    def user_command(user, *tail):
        prefix = [php] if user == 'root' else ['runuser','-u',user,'--',php]
        return prefix + [str(x) for x in tail]

    def add_candidate(items, value):
        if not value or value in items:
            return
        try:
            pwd.getpwnam(value)
        except KeyError:
            return
        items.append(value)

    candidates = []
    if args.app_user:
        add_candidate(candidates, args.app_user)
    else:
        sudo_user = os.environ.get('SUDO_USER', '')
        if sudo_user and sudo_user != 'root':
            add_candidate(candidates, sudo_user)
        for owned in (root/'artisan', root, root/'storage', root/'bootstrap'/'cache'):
            try:
                add_candidate(candidates, pwd.getpwuid(owned.stat().st_uid).pw_name)
            except (FileNotFoundError, KeyError):
                pass
        add_candidate(candidates, args.web_user)
        add_candidate(candidates, 'root')

    # Backups and diagnostic output stay OUTSIDE the public application directory.
    directory = backup_root / (datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+args.commit[:12])
    directory.mkdir(parents=True, mode=0o700, exist_ok=False)
    directory.chmod(0o700)
    print(f'[PMD] Private backup directory: {directory}', flush=True)
    log = (directory/'deployment.log').open('ab')
    def logged(command, label=None):
        result = subprocess.run(command, cwd=root, stdout=log, stderr=subprocess.STDOUT)
        log.flush()
        if result.returncode:
            name = label or Path(str(command[0])).name
            raise DeployError(f'{name} failed; inspect {directory}/deployment.log locally (do not share credentials).')
    with tempfile.TemporaryDirectory(prefix='pmd-live-tool-') as tool_dir:
        Path(tool_dir).chmod(0o755)
        helper = Path(tool_dir)/'tool.php'
        tool_bytes = blob(root, args.commit, 'scripts/pmd-groups-live-tool.php')
        if not tool_bytes: raise DeployError('Pinned runtime helper is missing.')
        helper.write_bytes(tool_bytes); helper.chmod(0o644)
        # Syntax-check every candidate PHP file BEFORE any live replacement.
        for name, content in changes.items():
            if name.endswith('.php') and not name.endswith('.blade.php'):
                run([php,'-l'], data=content)
        runtime_probe = (
            '$root=$argv[1];'
            '$paths=[$root."/storage/framework",$root."/storage/logs",$root."/bootstrap/cache"];'
            'foreach($paths as $p){if(!is_dir($p)||!is_writable($p)){fwrite(STDERR,basename($p)." not writable\\n");exit(3);}}'
        )
        app_user = None
        info = None
        attempted = []
        for candidate in candidates:
            attempted.append(candidate)
            writable = subprocess.run(
                user_command(candidate, '-r', runtime_probe, str(root)),
                cwd=root, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            if writable.returncode:
                log.write(('CLI user '+candidate+' runtime-writability probe failed.\\n').encode())
                log.write(writable.stderr[:1000]); log.flush()
                continue
            probe = subprocess.run(
                user_command(candidate, str(helper), 'info', str(root)),
                cwd=root, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            if probe.returncode:
                log.write(('CLI user '+candidate+' Laravel bootstrap probe failed.\\n').encode())
                log.write(probe.stderr[:2000]); log.flush()
                continue
            try:
                parsed = json.loads(probe.stdout)
            except Exception:
                log.write(('CLI user '+candidate+' returned invalid preflight JSON.\\n').encode()); log.flush()
                continue
            app_user = candidate
            info = parsed
            break
        if not app_user:
            raise DeployError(
                'No application CLI user could bootstrap Laravel and write runtime directories. '
                +'Tried: '+', '.join(attempted)+'. Inspect the private deployment log.'
            )
        appcmd = lambda *tail: user_command(app_user, *tail)
        print(f'[PMD] Application CLI user: {app_user}', flush=True)
        caches = []
        for full in info['cache_paths']:
            p = Path(full)
            if within(p, root):
                caches.append(str(p.relative_to(root)))

        # TastyIgniter/Laravel deployments may retain versioned cache files
        # (for example routes-v7.php) that are not represented by the process
        # that performed the initial probe. Back up and clear every generated
        # PHP file in bootstrap/cache so the next bootstrap must read the newly
        # installed provider and routes. .gitignore and non-PHP files are kept.
        bootstrap_cache = safe_path(root, 'bootstrap/cache')
        if bootstrap_cache.is_dir():
            for cached in bootstrap_cache.glob('*.php'):
                if cached.is_symlink():
                    raise DeployError('bootstrap/cache contains a symlink; review before deployment.')
                if cached.is_file():
                    caches.append(str(cached.relative_to(root)))

        caches = sorted(set(caches))
        maintenance_files = ['storage/framework/down', 'storage/framework/maintenance.php']
        records = save_originals(root, sorted(set(changes)|set(caches)|set(maintenance_files)), directory)
        manifest = {'commit':args.commit,'previous_head':git(root,'rev-parse','HEAD').decode().strip(),'files':records}
        (directory/'manifest.json').write_text(json.dumps(manifest, indent=2))
        (directory/'manifest.json').chmod(0o600)
        down = False
        replaced = False

        def restore_maintenance_markers():
            for name in maintenance_files:
                rec = records[name]
                target = safe_path(root, name)
                if rec['present']:
                    atomic_write(
                        target,
                        (directory/'files'/name).read_bytes(),
                        rec['mode'],
                        rec['uid'],
                        rec['gid']
                    )
                elif target.exists():
                    target.unlink()

        def enter_maintenance():
            framework = safe_path(root, 'storage/framework')
            stub = safe_path(
                root,
                'vendor/laravel/framework/src/Illuminate/Foundation/Console/stubs/maintenance-mode.stub'
            )
            if not stub.is_file():
                raise DeployError('Laravel maintenance-mode stub is missing.')
            down_path = safe_path(root, 'storage/framework/down')
            maintenance_path = safe_path(root, 'storage/framework/maintenance.php')
            if down_path.exists():
                raise DeployError('Application entered maintenance mode during preflight; stop and review.')
            owner = framework.stat()
            payload = json.dumps({
                'except': [],
                'redirect': None,
                'retry': None,
                'refresh': None,
                'secret': None,
                'status': 503,
                'template': None,
            }, indent=4).encode()
            atomic_write(down_path, payload, 0o644, owner.st_uid, owner.st_gid)
            try:
                atomic_write(
                    maintenance_path,
                    stub.read_bytes(),
                    0o644,
                    owner.st_uid,
                    owner.st_gid
                )
            except BaseException:
                restore_maintenance_markers()
                raise

        def clear_framework_caches():
            for name in caches:
                target = safe_path(root, name)
                if target.exists():
                    if not target.is_file():
                        raise DeployError('Unexpected cache object: '+name)
                    target.unlink()
            views = safe_path(root, 'storage/framework/views')
            if views.is_dir():
                for compiled in views.glob('*.php'):
                    if compiled.is_symlink():
                        raise DeployError('Compiled-view cache contains a symlink; review before deployment.')
                    compiled.unlink()

        try:
            enter_maintenance()
            down = True
            print('[PMD] Maintenance mode enabled without Artisan.', flush=True)
            # No tenant backup or migration: installation only adds central tables.
            dump_path = directory/'central-before.sql'
            with dump_path.open('wb') as dump:
                result = subprocess.run(appcmd(str(helper),'backup',str(root)), cwd=root, stdout=dump, stderr=log)
            dump_path.chmod(0o600)
            if result.returncode or dump_path.stat().st_size < 100 or not dump_path.read_bytes().endswith(b'-- PMD BACKUP COMPLETE\n'):
                raise DeployError('Central backup failed; live files were not replaced.')
            (directory/'central-before.sha256').write_text(hashlib.sha256(dump_path.read_bytes()).hexdigest()+'\n')
            print('[PMD] Central registry/group backup created. Applying runtime files.', flush=True)
            for name in changes:
                rec = records[name]; p = safe_path(root, name)
                original = (directory/'files'/name).read_bytes() if rec['present'] else None
                current = p.read_bytes() if p.is_file() else None
                if current != original: raise DeployError('A live file changed during preflight: '+name)
            replaced = True
            default = (root/'config/app.php').stat()
            for name, content in changes.items():
                rec = records[name]
                atomic_write(safe_path(root,name), content, rec.get('mode',0o644), rec.get('uid',default.st_uid), rec.get('gid',default.st_gid))
            # App namespace is PSR-4 loaded from app/, so these classes do not
            # require Composer regeneration. Clear Laravel's known generated
            # caches directly instead of depending on this deployment's Artisan CLI.
            clear_framework_caches()
            # The helper validates the central DB and installs additive group tables.
            logged(appcmd(str(root/'scripts/pmd-groups-live-tool.php'),'install',str(root)), 'Restaurant Groups schema install')
            # Before reopening, resolve the actual routes, auth bindings and render
            # the real Blade form (not a regex-only route-list success check).
            try:
                logged(appcmd(str(root/'scripts/pmd-groups-live-tool.php'),'health',str(root)), 'Restaurant Groups health check')
            except DeployError:
                log.flush()
                try:
                    lines = (directory/'deployment.log').read_text(errors='replace').splitlines()
                    safe = [line for line in lines[-80:] if line.startswith('PMD health failed at [')]
                    if safe:
                        print('[PMD] '+safe[-1], file=sys.stderr, flush=True)
                except Exception:
                    pass
                raise
            # Health renders Blade. Remove compiled views once more so PHP-FPM
            # recreates them under its normal runtime identity.
            clear_framework_caches()
            for service in services:
                logged(['systemctl','reload',service], 'PHP-FPM reload')
            restore_maintenance_markers()
            down = False
            (directory/'INSTALLED').write_text(args.commit+'\n')
            print('[PMD] INSTALLED: '+args.commit, flush=True)
            print('[PMD] R19 preserves the existing Quick Setup wizard: its Dashboard/Menu header link stays until server-confirmed completion, even after Not now.', flush=True)
            print('[PMD] Open https://paymydine.com/superadmin/new', flush=True)
            print('[PMD] Create chooser uses non-button interactive rows, scanner hard-exclusion and a fresh browser cache key.', flush=True)
            print('[PMD] Provisioning issues no longer render as a top-page attention card; Retry setup lives in the affected restaurant row.', flush=True)
            print('[PMD] Normal restaurants require a chosen Owner username/password; inherited template credentials are rotated before activation.', flush=True)
            print('[PMD] Pending/failed group locations stay disabled until Retry provisioning reaches ready.', flush=True)
            print('[PMD] R16 registers Restaurant Group Admin APIs before the greedy legacy Admin catch-all and health-checks the real tenant URL match.', flush=True)
            print('[PMD] R15 uses a dedicated authenticated JSON controller for Restaurant Group context/dashboard/menu APIs.', flush=True)
            print('[PMD] R15 validates managed Group Owner MFA against the central factor authority without requiring tenant-local pmd_owner_mfa.', flush=True)
            print('[PMD] R14 loads the group switcher on supported Dashboard/Menu routes without depending on stale session-marker bootstrap state.', flush=True)
            print('[PMD] Group Owners get an in-header Current / restaurant / All restaurants switcher on Dashboard and Menu without subdomain navigation.', flush=True)
            print('[PMD] Dashboard cross-tenant scopes are read-only reports; Menu cross-tenant scopes are read-only catalogs and writes still use Apply to locations.', flush=True)
            print('[PMD] Live health now verifies the real newtenantdb template using the configured MySQL table prefix before installation succeeds.', flush=True)
            print('[PMD] Existing prepared group tenants can repair historical extra template Owners/locations during Retry.', flush=True)
        except BaseException:
            if replaced:
                print('[PMD] Installation failed. Restoring previous runtime files; central additive tables are retained.', file=sys.stderr, flush=True)
                restore(root, directory, records)
            if down:
                try:
                    restore_maintenance_markers()
                except BaseException as recovery_error:
                    log.write(('Maintenance marker recovery failed: '+str(recovery_error)+'\\n').encode())
                    log.flush()
                    print('[PMD] WARNING: application may still be in maintenance mode; inspect the private deployment log.', file=sys.stderr)
            for service in services:
                subprocess.run(['systemctl','reload',service], stdout=log, stderr=log)
            raise
        finally:
            log.close()

if __name__ == '__main__':
    try: main()
    except (DeployError, OSError, ValueError, KeyError) as exc:
        print('[PMD] STOPPED: '+str(exc), file=sys.stderr)
        sys.exit(1)
