from pathlib import Path

path = Path('.github/pmd185_shifts_simple_team_v14.py')
lines = path.read_text().splitlines()
replacement = (
    "seed = (\"    try {\\n\" "
    "+ \"        $pmdShiftsNotificationCount = app(\\\\Admin\\\\Services\\\\PmdNotificationCountV1::class)->currentNewCount();\\n\" "
    "+ \"    } catch (\\\\Throwable $error) {\\n\" "
    "+ \"        $pmdShiftsNotificationCount = 0;\\n\" "
    "+ \"    }\\n\" "
    "+ \"@endphp\\n\\n\" "
    "+ \"<div id=\\\"pmd-shifts\\\"\")"
)
found = False
for index, line in enumerate(lines):
    if line.startswith('seed = """'):
        lines[index] = replacement
        found = True
        break
if not found:
    raise SystemExit('broken seed line not found')
code = '\n'.join(lines) + '\n'
compile(code, str(path), 'exec')
exec(compile(code, str(path), 'exec'), {'__name__': '__main__'})
