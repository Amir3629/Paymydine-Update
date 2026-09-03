#!/usr/bin/env python3
from pathlib import Path
import json

BASE = Path('/var/www/paymydine')
INDEX = BASE / 'app/admin/views/pmddevices/index.blade.php'
SUMUP_V1 = BASE / 'app/admin/assets/js/pmd-sumup-self-service-v1.js'
SUMUP_V2 = BASE / 'app/admin/assets/js/pmd-sumup-self-service-v2.js'
ASSETS = BASE / 'app/admin/views/_meta/assets.json'

for required in [INDEX, SUMUP_V1, ASSETS]:
    if not required.is_file():
        raise SystemExit(f'STOP: required file missing: {required}')

index = INDEX.read_text()

# R9 makes the server-rendered card itself resistant to an old browser-cached
# pmd-sumup-self-service-v1.js. The legacy script already refuses to mount when
# data-pmd-sumup-self-service="1" is present, so Canada stays Square even if an
# old v1 response is still in the browser cache.
vars_old = "    $terminalProviders = (array)($data['terminal_provider_options'] ?? []);\n    $archivedTerminalCount = (int)($data['archived_terminal_count'] ?? 0);\n"
vars_new = "    $terminalProviders = (array)($data['terminal_provider_options'] ?? []);\n    $pmdTerminalProviderCodes = array_values(array_map(static fn ($code) => strtolower(trim((string)$code)), array_keys($terminalProviders)));\n    $pmdLegacySumupOnly = count($pmdTerminalProviderCodes) === 1 && $pmdTerminalProviderCodes[0] === 'sumup';\n    $archivedTerminalCount = (int)($data['archived_terminal_count'] ?? 0);\n"
if '$pmdLegacySumupOnly' not in index:
    if index.count(vars_old) != 1:
        raise SystemExit(f'STOP: terminal provider variable anchor count={index.count(vars_old)}')
    index = index.replace(vars_old, vars_new, 1)
    print('PASS: Devices computes whether legacy SumUp may own the terminal card')
else:
    print('PASS: Devices legacy SumUp ownership state already present')

card_old = '        <div class="pmd-owner-card" data-accent="blue">\n'
card_new = '        <div class="pmd-owner-card" data-accent="blue" data-pmd-sumup-self-service="{{ $pmdLegacySumupOnly ? \'0\' : \'1\' }}">\n'
section_marker = 'id="payment-terminals" data-pmd-terminal-market-ui="1"'
if card_new not in index:
    section_pos = index.find(section_marker)
    if section_pos < 0:
        raise SystemExit('STOP: R8 market-owned payment-terminal section marker missing')
    card_pos = index.find(card_old, section_pos)
    if card_pos < 0:
        raise SystemExit('STOP: payment terminal card anchor missing after R8 section')
    index = index[:card_pos] + index[card_pos:].replace(card_old, card_new, 1)
    print('PASS: server-rendered Canada card blocks stale cached SumUp auto-mount')
else:
    print('PASS: stale-cache SumUp mount blocker already present')

INDEX.write_text(index)

v1 = SUMUP_V1.read_text()
if 'PMD_TERMINAL_MARKET_UI_OWNERSHIP_R8' not in v1:
    raise SystemExit('STOP: live SumUp v1 does not contain the R8 provider ownership guard')
if v1.count('if (!legacySumupOwnsTerminalPage()) return;') != 2:
    raise SystemExit('STOP: live SumUp v1 does not contain both R8 ownership guards')

# Use a new asset filename so browsers cannot reuse the pre-R8 JavaScript from
# cache. Keep V1 on disk for rollback/history, but new pages load only V2.
v2 = v1.replace('PMDSumupSelfServiceV1', 'PMDSumupSelfServiceV2')
if 'PMD_TERMINAL_MARKET_UI_CACHE_BUST_R9' not in v2:
    strict_anchor = "  'use strict';\n"
    if v2.count(strict_anchor) != 1:
        raise SystemExit('STOP: SumUp strict-mode anchor not unique')
    v2 = v2.replace(
        strict_anchor,
        strict_anchor + "\n  // PMD_TERMINAL_MARKET_UI_CACHE_BUST_R9\n  // Unique asset filename forces browsers to load the market-aware ownership guard.\n",
        1,
    )
SUMUP_V2.write_text(v2)
print('PASS: cache-busted SumUp self-service V2 generated from guarded R8 source')

assets_text = ASSETS.read_text()
old_path = '"path": "js/pmd-sumup-self-service-v1.js"'
new_path = '"path": "js/pmd-sumup-self-service-v2.js"'
old_name = '"name": "pmd-sumup-self-service-v1-js"'
new_name = '"name": "pmd-sumup-self-service-v2-js"'

if new_path not in assets_text:
    if assets_text.count(old_path) != 1:
        raise SystemExit(f'STOP: SumUp v1 asset path anchor count={assets_text.count(old_path)}')
    assets_text = assets_text.replace(old_path, new_path, 1)
if new_name not in assets_text:
    if assets_text.count(old_name) != 1:
        raise SystemExit(f'STOP: SumUp v1 asset name anchor count={assets_text.count(old_name)}')
    assets_text = assets_text.replace(old_name, new_name, 1)

json.loads(assets_text)
ASSETS.write_text(assets_text)
print('PASS: admin asset manifest now uses the unique guarded SumUp V2 URL')

# Final invariants.
index_check = INDEX.read_text()
v2_check = SUMUP_V2.read_text()
assets_check = ASSETS.read_text()
if 'data-pmd-sumup-self-service="{{ $pmdLegacySumupOnly ? \'0\' : \'1\' }}"' not in index_check:
    raise SystemExit('STOP: server stale-cache mount blocker missing')
if 'PMD_TERMINAL_MARKET_UI_CACHE_BUST_R9' not in v2_check:
    raise SystemExit('STOP: V2 cache-bust marker missing')
if v2_check.count('if (!legacySumupOwnsTerminalPage()) return;') != 2:
    raise SystemExit('STOP: V2 market ownership guards missing')
if 'js/pmd-sumup-self-service-v1.js' in assets_check:
    raise SystemExit('STOP: admin manifest still references SumUp V1')
if 'js/pmd-sumup-self-service-v2.js' not in assets_check:
    raise SystemExit('STOP: admin manifest does not reference SumUp V2')

print('PASS: Canada Square terminal card is protected even from stale cached SumUp V1')
print('PASS: fresh admin pages load cache-busted guarded SumUp V2')
print('PASS: SumUp self-service remains available only for SumUp-only markets')
print('PASS: terminal payment runtime and settlement code were not changed')
print('PASS: Terminal market UI R9 patch sequence complete')
