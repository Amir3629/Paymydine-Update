#!/usr/bin/env python3
from pathlib import Path
import runpy

BASE = Path(__file__).resolve().parents[1]
runpy.run_path(str(BASE / 'scripts/pmd-square-runtime-terminal-r2.py'), run_name='__main__')

route = BASE / 'routes/square-runtime.php'
text = route.read_text()
new_tail = "        }\n    })->withoutMiddleware([\\Igniter\\Flame\\Foundation\\Http\\Middleware\\VerifyCsrfToken::class]);\n});\n"
if new_tail not in text:
    old_tail = "        }\n    });\n});\n"
    if not text.endswith(old_tail):
        raise SystemExit('STOP: Square webhook CSRF tail anchor not found')
    text = text[:-len(old_tail)] + new_tail
    route.write_text(text)
    print('PASS: Square signed webhook is exempt from browser CSRF middleware only')
else:
    print('PASS: Square signed webhook CSRF exemption already applied')

if 'x-square-hmacsha256-signature' not in text or 'hash_equals' not in text:
    raise SystemExit('STOP: Square webhook signature validation is missing')

print('PASS: Square R3 patch sequence complete')
