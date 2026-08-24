#!/usr/bin/env python3
from pathlib import Path
import sys

path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('app/admin/views/pmddevices/_inline_modal_form.blade.php')
text = path.read_text(encoding='utf-8')

start = "    @elseif($kind === 'drawers')\n"
end = "    @elseif($kind === 'biometric')\n"

if "PMD_CASH_DRAWER_OWNER_SIMPLE_R1_INCLUDE" in text:
    print('PMD_CASH_DRAWER_OWNER_SIMPLE_R1_ALREADY_PATCHED')
    raise SystemExit(0)

start_i = text.find(start)
if start_i < 0:
    raise SystemExit('drawer section start anchor missing')
end_i = text.find(end, start_i + len(start))
if end_i < 0:
    raise SystemExit('drawer section end anchor missing')

replacement = (
    "    @elseif($kind === 'drawers')\n"
    "        {{-- PMD_CASH_DRAWER_OWNER_SIMPLE_R1_INCLUDE --}}\n"
    "        @include('admin::pmddevices._cash_drawer_simple_form')\n\n"
)

patched = text[:start_i] + replacement + text[end_i:]
path.write_text(patched, encoding='utf-8')
print('PMD_CASH_DRAWER_OWNER_SIMPLE_R1_PATCH_OK')
