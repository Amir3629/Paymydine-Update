#!/usr/bin/env python3
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
FINANCE = BASE / 'app/admin/controllers/Pmdfinance.php'
FINANCE_JS = BASE / 'app/admin/assets/js/pmd-finance-market-r4.js'


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


# Canada must not fall through to the historical global provider/method list.
# It uses canonical card/apple/google storage rows because the Square runtime is
# mature on those codes; cash remains providerless.
old_market_branch = '''        } elseif ($countryCode === CountryPlatformProfileRegistry::GERMANY) {
            // Germany keeps the mature canonical storage/runtime rows. Only add
            // a first-paint market marker; do not remap its proven payment flow.
            $this->bodyClass = trim($this->bodyClass.' pmd-finance-market-de');
        }
'''
new_market_branch = '''        } elseif ($countryCode === CountryPlatformProfileRegistry::GERMANY) {
            // Germany keeps the mature canonical storage/runtime rows. Only add
            // a first-paint market marker; do not remap its proven payment flow.
            $this->bodyClass = trim($this->bodyClass.' pmd-finance-market-de');
        } elseif ($countryCode === CountryPlatformProfileRegistry::CANADA) {
            // PMD_CANADA_FINANCE_FIRST_PAINT_R6
            // Square is the only Canadian provider. Canada reuses the mature
            // canonical Card/Apple Pay/Google Pay rows, while cash is providerless.
            $methodCodes = ['card', 'apple_pay', 'google_pay', 'cod', 'cash'];
            $providerCodes = ['square'];
            $this->bodyClass = trim($this->bodyClass.' pmd-finance-market-ca');
        }
'''
replace_once(FINANCE, old_market_branch, new_market_branch, 'Canada Finance first-paint provider/method filter')

old_provider_mapping = '''            if ($countryCode === CountryPlatformProfileRegistry::OMAN) {
                $definition = (array)($methodDefinitions[$methodCode] ?? []);
                $methodProviders[$methodCode] = collect((array)($definition['provider_candidates'] ?? []))
                    ->mapWithKeys(fn ($code) => [(string)$code => $providerLabels[(string)$code] ?? ucfirst(str_replace('_', ' ', (string)$code))])
                    ->all();
                continue;
            }

            $methodProviders[$methodCode] = collect(Payments_model::supportedProvidersForMethod($methodCode))
'''
new_provider_mapping = '''            if ($countryCode === CountryPlatformProfileRegistry::OMAN) {
                $definition = (array)($methodDefinitions[$methodCode] ?? []);
                $methodProviders[$methodCode] = collect((array)($definition['provider_candidates'] ?? []))
                    ->mapWithKeys(fn ($code) => [(string)$code => $providerLabels[(string)$code] ?? ucfirst(str_replace('_', ' ', (string)$code))])
                    ->all();
                continue;
            }

            if ($countryCode === CountryPlatformProfileRegistry::CANADA) {
                $methodProviders[$methodCode] = in_array($methodCode, ['card', 'apple_pay', 'google_pay'], true)
                    ? ['square' => ($providerLabels['square'] ?? 'Square')]
                    : [];
                continue;
            }

            $methodProviders[$methodCode] = collect(Payments_model::supportedProvidersForMethod($methodCode))
'''
replace_once(FINANCE, old_provider_mapping, new_provider_mapping, 'Canada Finance method/provider mapping')

old_actions = '''    var actions = document.querySelector('#payment-methods .pmd-owner-card__actions');
    if (actions && state.country_code === 'OM') {
      actions.innerHTML = '<span class="pmd-r4-market-pill">Oman · OMR · Asia/Muscat</span>';
    }
'''
new_actions = '''    var actions = document.querySelector('#payment-methods .pmd-owner-card__actions');
    if (actions && state.country_code === 'OM') {
      actions.innerHTML = '<span class="pmd-r4-market-pill">Oman · OMR · Asia/Muscat</span>';
    } else if (actions && state.country_code === 'CA') {
      actions.innerHTML = '<span class="pmd-r4-market-pill">Canada · CAD · America/Toronto · Square</span>';
    }
'''
replace_once(FINANCE_JS, old_actions, new_actions, 'Canada Finance market badge')

finance = FINANCE.read_text()
for marker in [
    'PMD_CANADA_FINANCE_FIRST_PAINT_R6',
    "$providerCodes = ['square'];",
    "['card', 'apple_pay', 'google_pay', 'cod', 'cash']",
    "CountryPlatformProfileRegistry::CANADA",
]:
    if marker not in finance:
        raise SystemExit(f'STOP: Canada Finance marker missing: {marker}')

js = FINANCE_JS.read_text()
if 'Canada · CAD · America/Toronto · Square' not in js:
    raise SystemExit('STOP: Canada Finance market badge missing')

print('PASS: Canada Finance first paint shows Square as the only provider')
print('PASS: Canada Finance Card/Apple Pay/Google Pay map only to Square')
print('PASS: Canada Finance cash remains providerless')
print('PASS: Canada Finance market badge is location-aware')
print('PASS: Square Canada Finance R6A patch sequence complete')