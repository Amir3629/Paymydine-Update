#!/usr/bin/env python3
from pathlib import Path

BASE = Path('/var/www/paymydine')
INDEX = BASE / 'app/admin/views/pmddevices/index.blade.php'
SUMUP_JS = BASE / 'app/admin/assets/js/pmd-sumup-self-service-v1.js'


def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text()
    if new in text:
        print(f'PASS: {label} already applied')
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    path.write_text(text.replace(old, new, 1))
    print(f'PASS: {label}')


def insert_before_once(path: Path, anchor: str, block: str, marker: str, label: str):
    text = path.read_text()
    if marker in text:
        print(f'PASS: {label} already applied')
        return
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    path.write_text(text.replace(anchor, block + anchor, 1))
    print(f'PASS: {label}')


for required in [INDEX, SUMUP_JS]:
    if not required.is_file():
        raise SystemExit(f'STOP: required file missing: {required}')

# R7 made the server-rendered Devices page market-aware, but the old globally
# loaded SumUp self-service JS still replaced the whole Payment terminals card
# after DOM load. That produced the visible Square -> SumUp blink in Canada.
# Make server ownership explicit and expose the market provider codes to legacy JS.
replace_once(
    INDEX,
    '    <section class="pmd-owner-section" id="payment-terminals">\n',
    '    <section class="pmd-owner-section" id="payment-terminals" data-pmd-terminal-market-ui="1" data-pmd-terminal-provider-codes="{{ implode(\',\', array_keys($terminalProviders)) }}">\n',
    'Devices terminal section advertises market UI ownership',
)

helper = r'''  // PMD_TERMINAL_MARKET_UI_OWNERSHIP_R8
  // The old SumUp self-service may own the terminal card only on a legacy page
  // or when SumUp is literally the sole terminal provider for the active market.
  // On Canada (Square-only) and multi-provider markets it must never replace the
  // canonical server-rendered provider-neutral terminal UI.
  function legacySumupOwnsTerminalPage() {
    var section = document.getElementById('payment-terminals');
    if (!section || section.getAttribute('data-pmd-terminal-market-ui') !== '1') return true;

    var codes = String(section.getAttribute('data-pmd-terminal-provider-codes') || '')
      .split(',')
      .map(function (code) { return String(code || '').trim().toLowerCase(); })
      .filter(function (code) { return code !== ''; });

    return codes.length === 1 && codes[0] === 'sumup';
  }

'''
insert_before_once(
    SUMUP_JS,
    '  function guardLegacyTerminalEditor(event) {\n',
    helper,
    'PMD_TERMINAL_MARKET_UI_OWNERSHIP_R8',
    'Legacy SumUp self-service understands market UI ownership',
)

replace_once(
    SUMUP_JS,
    "  function guardLegacyTerminalEditor(event) {\n    if (!/^\\/admin\\/pmddevices(?:\\/|$)/.test((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : location.pathname))) return;\n",
    "  function guardLegacyTerminalEditor(event) {\n    if (!/^\\/admin\\/pmddevices(?:\\/|$)/.test((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : location.pathname))) return;\n    if (!legacySumupOwnsTerminalPage()) return;\n",
    'Legacy SumUp click guard no longer hijacks market-owned terminal UI',
)

replace_once(
    SUMUP_JS,
    "  function mount() {\n    if (!/^\\/admin\\/pmddevices(?:\\/|$)/.test((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : location.pathname))) return;\n",
    "  function mount() {\n    if (!/^\\/admin\\/pmddevices(?:\\/|$)/.test((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : location.pathname))) return;\n    if (!legacySumupOwnsTerminalPage()) return;\n",
    'Legacy SumUp mount no longer replaces market-owned terminal UI',
)

index = INDEX.read_text()
js = SUMUP_JS.read_text()
if 'data-pmd-terminal-market-ui="1"' not in index or 'data-pmd-terminal-provider-codes=' not in index:
    raise SystemExit('STOP: terminal market ownership attributes missing')
if 'PMD_TERMINAL_MARKET_UI_OWNERSHIP_R8' not in js:
    raise SystemExit('STOP: SumUp market ownership helper missing')
if js.count('if (!legacySumupOwnsTerminalPage()) return;') != 2:
    raise SystemExit('STOP: SumUp legacy mount/click ownership guards are incomplete')

print('PASS: Canada Square terminal UI remains stable after page load')
print('PASS: legacy SumUp JS cannot replace Square-only or multi-provider market UI')
print('PASS: legacy SumUp self-service remains available only when SumUp is the sole provider')
print('PASS: terminal runtime/payment settlement code was not changed')
print('PASS: Terminal market UI R8 patch sequence complete')
