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
    'app/Console/Commands/RestaurantGroupsCommand.php',
    'app/admin/classes/User.php', 'config/app.php', 'config/pmd_groups.php',
    'routes/pmd-groups.php',
    'app/admin/views/_partials/pmd_admin_i18n.blade.php',
    'app/admin/views/superadmin_r2/side_menu.blade.php',
    'app/admin/assets/css/pmd-restaurant-groups-v1.css',
    'app/admin/assets/js/pmd-restaurant-groups-v1.js',
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
        if before is None:
            if current is not None and current != after:
                raise DeployError(f'Existing unmerged feature file: {name}. No live files were changed.')
            replacement = after
        elif current is None:
            raise DeployError(f'Locally removed file requires review: {name}')
        else:
            replacement = merge_bytes(current, before, after, name)
        if replacement != current:
            changes[name] = replacement
    page = safe_path(root, ENTRY)
    current = page.read_bytes()
    text = current.decode('utf-8')
    if MARKER not in text:
        anchor = "@section('content')"
        if text.count(anchor) != 1:
            raise DeployError('Restaurants view changed: entry-point placement requires review.')
        changes[ENTRY] = text.replace(anchor, anchor + '\n' + MARKER, 1).encode()
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
    for name in ('git','php','composer','runuser','systemctl'):
        if not shutil.which(name): raise DeployError(f'Required executable not found: {name}')
    if not (root/'artisan').is_file() or not (root/'vendor/autoload.php').is_file():
        raise DeployError('Use the existing application checkout with its installed dependencies.')
    pwd.getpwnam(args.web_user)
    os.umask(0o022)
    os.environ['COMPOSER_ALLOW_SUPERUSER'] = '1'
    php = shutil.which('php')
    webcmd = ['runuser','-u',args.web_user,'--',php]
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
    webcmd = ['runuser','-u',args.web_user,'--',php]
    # Backups and diagnostic output stay OUTSIDE the public application directory.
    directory = backup_root / (datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+args.commit[:12])
    directory.mkdir(parents=True, mode=0o700, exist_ok=False)
    directory.chmod(0o700)
    print(f'[PMD] Private backup directory: {directory}', flush=True)
    log = (directory/'deployment.log').open('ab')
    def logged(command):
        result = subprocess.run(command, cwd=root, stdout=log, stderr=subprocess.STDOUT)
        log.flush()
        if result.returncode:
            raise DeployError(f'{Path(str(command[0])).name} failed; inspect {directory}/deployment.log locally (do not share credentials).')
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
        probe = subprocess.run(webcmd+[str(helper),'info',str(root)], cwd=root, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        log.write(probe.stderr); log.flush()
        if probe.returncode: raise DeployError(f'Native application preflight failed before any live replacement. Inspect {directory}/deployment.log locally.')
        info = json.loads(probe.stdout)
        caches = []
        for full in info['cache_paths']:
            p = Path(full)
            if within(p, root): caches.append(str(p.relative_to(root)))
        runtime_generated = ['vendor/autoload.php'] + [str(p.relative_to(root)) for p in (root/'vendor/composer').glob('autoload*.php')]
        records = save_originals(root, sorted(set(changes)|set(caches)|set(runtime_generated)), directory)
        manifest = {'commit':args.commit,'previous_head':git(root,'rev-parse','HEAD').decode().strip(),'files':records}
        (directory/'manifest.json').write_text(json.dumps(manifest, indent=2))
        (directory/'manifest.json').chmod(0o600)
        down = False
        replaced = False
        try:
            logged(webcmd+[str(root/'artisan'),'down'])
            down = True
            # No tenant backup or migration: installation only adds central tables.
            dump_path = directory/'central-before.sql'
            with dump_path.open('wb') as dump:
                result = subprocess.run(webcmd+[str(helper),'backup',str(root)], cwd=root, stdout=dump, stderr=log)
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
            # Do not run dependency installation, update scripts, or plugins.
            logged(['composer','dump-autoload','--optimize','--no-interaction','--no-scripts','--no-plugins'])
            for action in ('config:clear','route:clear','view:clear'):
                logged(webcmd+[str(root/'artisan'),action])
            # The helper validates the central DB and installs additive group tables.
            logged(webcmd+[str(root/'scripts/pmd-groups-live-tool.php'),'install',str(root)])
            # Before reopening, resolve the actual routes, auth bindings and render
            # the real Blade form (not a regex-only route-list success check).
            logged(webcmd+[str(root/'scripts/pmd-groups-live-tool.php'),'health',str(root)])
            for service in services: logged(['systemctl','reload',service])
            logged(webcmd+[str(root/'artisan'),'up']); down = False
            (directory/'INSTALLED').write_text(args.commit+'\n')
            print('[PMD] INSTALLED: '+args.commit, flush=True)
            print('[PMD] Open https://paymydine.com/superadmin/groups', flush=True)
            print('[PMD] Restaurants also has a Create multi-location account entry.', flush=True)
            print('[PMD] This installed the current feature; it is not a claim of full menu/media, TLS or browser acceptance.', flush=True)
        except BaseException:
            if replaced:
                print('[PMD] Installation failed. Restoring previous runtime files; central additive tables are retained.', file=sys.stderr, flush=True)
                restore(root, directory, records)
            if down:
                result = subprocess.run(webcmd+[str(root/'artisan'),'up'], cwd=root, stdout=log, stderr=log)
                if result.returncode:
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
