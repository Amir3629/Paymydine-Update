#!/usr/bin/env python3
from pathlib import Path
import sys

TARGET = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('app/admin/views/pmdfinance/index.blade.php')
text = TARGET.read_text()

methods_marker = '<section class="pmd-owner-section" id="payment-methods">'
providers_marker = '<section class="pmd-owner-section" id="payment-providers">'
tax_marker = '<section class="pmd-owner-section" id="tax-invoicing">'

methods_pos = text.find(methods_marker)
providers_pos = text.find(providers_marker)
tax_pos = text.find(tax_marker)

if min(methods_pos, providers_pos, tax_pos) < 0:
    raise SystemExit('PATCH ERROR: expected finance payment sections were not found')

if providers_pos < methods_pos:
    print(f'ALREADY_PROVIDER_FIRST={TARGET}')
    raise SystemExit(0)

if not (methods_pos < providers_pos < tax_pos):
    raise SystemExit('PATCH ERROR: unexpected finance payment section order')

prefix = text[:methods_pos]
methods_block = text[methods_pos:providers_pos]
providers_block = text[providers_pos:tax_pos]
suffix = text[tax_pos:]

marker = "        {{-- PMD_FINANCE_PROVIDER_FIRST_R1: provider connection precedes guest method mapping. --}}\n"
if marker not in providers_block:
    providers_block = marker + providers_block

TARGET.write_text(prefix + providers_block + methods_block + suffix)
print(f'PATCHED={TARGET}')
print('PMDFINANCE_ORDER=providers_then_methods')
