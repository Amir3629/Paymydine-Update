#!/usr/bin/env python3
"""Deploy the already-reviewed PMD tenant unavailable patch without discarding local work.

Use from an EXACT fetched origin/main Git object:
  git show origin/main:scripts/pmd-safe-tenant-deploy-r2.py | python3 -
Reads the checkout, backs up and reconciles only local conflicts that are
byte-for-byte identical to incoming Git blobs. Does not modify tenant data,
DNS, or SSL. An optional --install-nginx flag invokes the separately reviewed
backup + nginx -t + rollback installer under sudo after completing checks.
"""
from __future__ import annotations
import argparse
import datetime as dt
import os
from pathlib import Path
import shutil
import subprocess
import sys

EXPECTED_ROOT = Path('/var/www/paymydine')
REQUIRED = ('public/restaurant-unavailable.html',
            'scripts/pmd-install-tenant-unavailable-r1.py',
            'scripts/test-pmd-tenant-unavailable-r1.py',
            'ops/nginx/pmd-tenant-unavailable-r1.conf')

def run(*args: str, quiet: bool = False) -> str:
    cp = subprocess.run(list(args), capture_output=True, text=True, check=False)
    if cp.returncode:
        raise RuntimeError('{} exited {}: {}'.format(' '.join(args), cp.returncode,
                           (cp.stderr.strip() or cp.stdout.strip())[:1500]))
    if not quiet and cp.stdout.strip():
        print(cp.stdout.strip())
    return cp.stdout.strip()

def git(*args: str, quiet: bool = True) -> str:
    return run('git', '-c', 'gc.auto=0', *args, quiet=quiet)

def incoming_ref(path: str) -> str:
    return git('rev-parse', 'origin/main:' + path)

def original_ref(path: str) -> str | None:
    cp = subprocess.run(['git','rev-parse','HEAD:' + path], capture_output=True, text=True)
    return cp.stdout.strip() if cp.returncode == 0 else None

def blob(path: str) -> str:
    return git('hash-object', '--', path)

def split_null(data: bytes) -> list[str]:
    return [os.fsdecode(x) for x in data.split(b'\x00') if x]

def git_paths(*args: str) -> list[str]:
    return split_null(subprocess.check_output(['git', *args]))

def writable_parent(path: Path) -> bool:
    current = path.parent
    while not current.exists():
        current = current.parent
    return os.access(current, os.W_OK)

def deploy(root: Path, nginx_install: bool = False) -> None:
    os.chdir(root)
    if not Path('artisan').is_file():
        raise RuntimeError('Not a PMD app root: artisan missing')
    if git('branch','--show-current') != 'main':
        raise RuntimeError('Expected local branch main')
    git('fetch','origin','main', quiet=False)
    git('merge-base','--is-ancestor','HEAD','origin/main')
    for file in REQUIRED:
        incoming_ref(file)
    incoming = set(git_paths('diff','--name-only','--diff-filter=ACMR','-z','HEAD','origin/main'))
    untracked = set(git_paths('ls-files','--others','--exclude-standard','-z'))
    staged = set(git_paths('diff','--cached','--name-only','-z'))
    if staged & incoming:
        raise RuntimeError('Staged modifications in incoming files: ' + ', '.join(sorted(staged & incoming)))
    cleanups: list[tuple[str,str]] = []
    for path in sorted(incoming):
        file = Path(path)
        if not writable_parent(file):
            raise RuntimeError('No write permission on parent of '+path+
                               '. Fix only that specific directory ownership; do not use sudo git.')
        if not file.is_file():
            if file.is_symlink() or file.is_dir():
                raise RuntimeError('Incoming path occupied by non-file '+path)
            continue
        if path in untracked:
            if blob(path) != incoming_ref(path):
                raise RuntimeError('Untracked file differs; no changes made: '+path)
            cleanups.append(('untracked',path))
        elif original_ref(path) is not None:
            head_sha = original_ref(path)
            actual = blob(path)
            if actual != head_sha:
                if actual != incoming_ref(path):
                    raise RuntimeError('Tracked local edit differs; no changes made: '+path)
                cleanups.append(('tracked',path))
        else:
            raise RuntimeError('Unexpected file/path state: '+path)
    backup_dir = Path.home()/('pmd-tenant-deploy-'+dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+str(os.getpid()))
    initial_head = git('rev-parse', 'HEAD')
    backup_dir.mkdir(mode=0o700,parents=True,exist_ok=False)
    relocated: list[tuple[str,str]] = []
    try:
        for kind,path in cleanups:
            backup = backup_dir/path
            backup.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(path,backup)
            if kind == 'untracked':
                Path(path).unlink()
            else:
                git('restore','--source=HEAD','--worktree','--',path)
            relocated.append((kind,path))
            print('Backed up compatible local '+kind+': '+path)
        git('merge','--ff-only','origin/main',quiet=False)
    except Exception:
        # Restore original local changes only if HEAD never advanced.
        if git('rev-parse', 'HEAD') != initial_head:
            raise
        for kind,path in relocated:
            dest=Path(path)
            if kind == 'untracked' and not dest.exists():
                dest.parent.mkdir(parents=True,exist_ok=True)
                shutil.copy2(backup_dir/path,dest)
            if kind == 'tracked' and dest.is_file():
                shutil.copy2(backup_dir/path,dest)
        raise
    print('Backup: '+str(backup_dir))
    run('php','-l','app/Http/Middleware/TenantDatabaseMiddleware.php')
    run('python3','scripts/test-pmd-tenant-unavailable-r1.py')
    run('python3','scripts/pmd-install-tenant-unavailable-r1.py')
    if nginx_install:
        run('sudo','python3','scripts/pmd-install-tenant-unavailable-r1.py','--apply')
        run('php','artisan','view:clear')
    print('Git: '+git('log','-1','--oneline'))
    print('Certificate: additional wildcard DNS-01/TLS setup still required for unknown HTTPS hostnames.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--install-nginx',action='store_true',help='Run backed-up nginx installer after merge checks')
    parser.add_argument('--root',default=str(EXPECTED_ROOT),help='App root (testing only)')
    args=parser.parse_args()
    try:
        deploy(Path(args.root),nginx_install=args.install_nginx)
    except Exception as exc:
        print('STOP: '+str(exc),file=sys.stderr)
        raise SystemExit(1)
