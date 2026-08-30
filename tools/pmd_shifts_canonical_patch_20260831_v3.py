#!/usr/bin/env python3
from pathlib import Path
import os
import subprocess
import sys
import tempfile

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '/var/www/paymydine').resolve()
SOURCE_COMMIT = '72565960a32dc1633a1d2d70174762c8815d00c7'
SOURCE_PATCHER = 'tools/pmd_shifts_canonical_patch_20260831.py'
SERVICE_REL = Path('app/Services/PmdOperationalRosterReconciler.php')
SAFE_GATE_REL = Path('app/Http/Middleware/PmdSiteAccessGateMiddleware.php')


def fail(message):
    raise SystemExit('ERROR: ' + message)


def git_show(commit, path):
    result = subprocess.run(
        ['git', 'show', f'{commit}:{path}'],
        cwd=str(ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        fail(f'could not extract {path} from {commit}: {result.stderr.strip()}')
    return result.stdout


if not (ROOT / '.git').exists():
    fail(f'not a git worktree: {ROOT}')

# Refuse to run on top of the HTML-rewriting Site Access experiment. The
# canonical Shifts patch must remain independent from authentication middleware.
gate_path = ROOT / SAFE_GATE_REL
if not gate_path.is_file():
    fail(f'missing safe gate middleware: {gate_path}')
gate = gate_path.read_text(encoding='utf-8')
if 'PMD_SITE_ACCESS_WEB_GATE_V2' not in gate:
    fail('PmdSiteAccessGateMiddleware is not the restored V2 authority')
if 'finalizeAdminHtml' in gate:
    fail('HTML rewrite is present in PmdSiteAccessGateMiddleware; restore V2 first')
print('CHECK: safe Site Access middleware V2 is intact')

source = git_show(SOURCE_COMMIT, SOURCE_PATCHER)

# V1 bug 1: a word-boundary after the closing quote of the Team panel id can
# never match when whitespace follows. Match the actual tag boundary instead.
bad_panel_token = r'id=\"pmd-shifts-team-panel\"\b'
good_panel_token = r'id=\"pmd-shifts-team-panel\"(?=[\s>])'
if source.count(bad_panel_token) != 1:
    fail(f'expected exactly one V1 Team-panel regex token, found {source.count(bad_panel_token)}')
source = source.replace(bad_panel_token, good_panel_token, 1)
print('CHECK: Team-panel selector corrected')

# V1 bug 2: Python re.sub treats backslashes in a replacement string as
# replacement escapes. Our JavaScript replacement contains literal regexes such
# as \s and \b, so pass the replacement through a callback to keep it literal.
bad_subn = "    out, n = re.subn(pattern, replacement, text, count=count, flags=re.S)\n"
good_subn = "    out, n = re.subn(pattern, lambda _match: replacement, text, count=count, flags=re.S)\n"
if source.count(bad_subn) != 1:
    fail(f'expected exactly one V1 re.subn replacement call, found {source.count(bad_subn)}')
source = source.replace(bad_subn, good_subn, 1)
print('CHECK: regex replacements are now literal-safe')

# Avoid the Python 3.12 utcnow deprecation warning; behavior is unchanged.
source = source.replace(
    "dt.datetime.utcnow().strftime('%Y%m%d_%H%M%S')",
    "dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d_%H%M%S')",
    1,
)

try:
    compile(source, '<pmd_shifts_canonical_patch_v3>', 'exec')
except SyntaxError as error:
    fail(f'corrected patcher does not compile: {error}')
print('CHECK: corrected canonical patcher compiles')

# Ensure the service required by the canonical Shifts controller is present.
# If V3 has to create it and the overall patch fails, remove it again.
service_path = ROOT / SERVICE_REL
service_created = False
if service_path.exists():
    service_text = service_path.read_text(encoding='utf-8')
    if 'PMD_OPERATIONAL_ROSTER_RECONCILE_V1' not in service_text:
        fail(f'{SERVICE_REL} exists but is not the expected PMD reconciler; refusing to overwrite it')
    print('CHECK: operational roster reconciler already present')
else:
    expected_service = git_show(SOURCE_COMMIT, str(SERVICE_REL))
    if 'PMD_OPERATIONAL_ROSTER_RECONCILE_V1' not in expected_service:
        fail('pinned operational roster reconciler marker is missing')

    fd, lint_path = tempfile.mkstemp(prefix='pmd-roster-', suffix='.php')
    os.close(fd)
    try:
        Path(lint_path).write_text(expected_service, encoding='utf-8')
        lint = subprocess.run(
            ['php', '-l', lint_path],
            cwd=str(ROOT),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        print(lint.stdout.strip())
        if lint.returncode != 0:
            fail('pinned operational roster reconciler failed PHP lint')
    finally:
        try:
            os.unlink(lint_path)
        except FileNotFoundError:
            pass

    service_path.parent.mkdir(parents=True, exist_ok=True)
    service_path.write_text(expected_service, encoding='utf-8')
    parent_stat = service_path.parent.stat()
    os.chown(service_path, parent_stat.st_uid, parent_stat.st_gid)
    os.chmod(service_path, 0o644)
    service_created = True
    print(f'INSTALL: {SERVICE_REL}')

fd, patch_path = tempfile.mkstemp(prefix='pmd-shifts-canonical-v3-', suffix='.py')
os.close(fd)
Path(patch_path).write_text(source, encoding='utf-8')

try:
    result = subprocess.run([sys.executable, patch_path, str(ROOT)], cwd=str(ROOT))
    if result.returncode != 0:
        if service_created and service_path.exists():
            service_path.unlink()
            print(f'ROLLBACK: removed newly-installed {SERVICE_REL}')
        raise SystemExit(result.returncode)
finally:
    try:
        os.unlink(patch_path)
    except FileNotFoundError:
        pass

print('OK: canonical Shifts V3 patch completed')
print('OK: safe Site Access middleware V2 was not modified')
print('NOTE: trusted-device login/migration is intentionally not part of this run')
