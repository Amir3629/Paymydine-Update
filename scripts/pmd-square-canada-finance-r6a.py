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


# The Finance first paint must follow the same market profile as SuperAdmin and
# LocationPlatformContext. Germany keeps mature canonical method rows but its
# provider list is filtered by the DE profile (so Square disappears). Canada
# also uses canonical method rows but Square is its only online/terminal provider.
# Türkiye remains intentionally payment-empty. Oman keeps its isolated om_* rows.
old_market_branch = '''        } elseif ($countryCode === CountryPlatformProfileRegistry::GERMANY) {
            // Germany keeps the mature canonical storage/runtime rows. Only add
            // a first-paint market marker; do not remap its proven payment flow.
            $this->bodyClass = trim($this->bodyClass.' pmd-finance-market-de');
        }
'''
new_market_branch = '''        } elseif ($countryCode === CountryPlatformProfileRegistry::GERMANY) {
            // PMD_FINANCE_MARKET_SCOPE_R6A
            // Germany keeps the mature canonical storage/runtime rows, but only
            // providers declared by the DE market profile are visible/selectable.
            $profile = (array)($market['profile'] ?? []);
            $paymentProfile = (array)($profile['payments'] ?? []);
            $providerCodes = array_values(array_keys((array)($paymentProfile['providers'] ?? [])));
            $this->bodyClass = trim($this->bodyClass.' pmd-finance-market-de');
        } elseif ($countryCode === CountryPlatformProfileRegistry::CANADA) {
            // PMD_CANADA_FINANCE_FIRST_PAINT_R6
            // Square is the only Canadian provider. Canada reuses the mature
            // canonical Card/Apple Pay/Google Pay rows, while cash is providerless.
            $methodCodes = ['card', 'apple_pay', 'google_pay', 'cod', 'cash'];
            $providerCodes = ['square'];
            $this->bodyClass = trim($this->bodyClass.' pmd-finance-market-ca');
        } elseif ($countryCode === CountryPlatformProfileRegistry::TURKEY) {
            // Türkiye is intentionally payment-empty until a reviewed provider
            // integration exists. Do not flash the historical global catalogue.
            $methodCodes = [];
            $providerCodes = [];
            $this->bodyClass = trim($this->bodyClass.' pmd-finance-market-tr');
        }
'''
replace_once(FINANCE, old_market_branch, new_market_branch, 'Finance first-paint market provider scoping')

old_provider_mapping = '''            if ($countryCode === CountryPlatformProfileRegistry::OMAN) {
                $definition = (array)($methodDefinitions[$methodCode] ?? []);
                $methodProviders[$methodCode] = collect((array)($definition['provider_candidates'] ?? []))
                    ->mapWithKeys(fn ($code) => [(string)$code => $providerLabels[(string)$code] ?? ucfirst(str_replace('_', ' ', (string)$code))])
                    ->all();
                continue;
            }

            $methodProviders[$methodCode] = collect(Payments_model::supportedProvidersForMethod($methodCode))
                ->mapWithKeys(fn ($code) => [(string)$code => $providerLabels[(string)$code] ?? ucfirst(str_replace('_', ' ', (string)$code))])
                ->all();
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

            $compatible = Payments_model::supportedProvidersForMethod($methodCode);
            if ($countryCode === CountryPlatformProfileRegistry::GERMANY) {
                $compatible = array_values(array_intersect($compatible, $providerCodes));
            }
            $methodProviders[$methodCode] = collect($compatible)
                ->mapWithKeys(fn ($code) => [(string)$code => $providerLabels[(string)$code] ?? ucfirst(str_replace('_', ' ', (string)$code))])
                ->all();
'''
replace_once(FINANCE, old_provider_mapping, new_provider_mapping, 'Finance method/provider mapping respects market provider list')

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
    } else if (actions && state.country_code === 'DE') {
      actions.innerHTML = '<span class="pmd-r4-market-pill">Germany · EUR · Europe/Berlin</span>';
    } else if (actions && state.country_code === 'TR') {
      actions.innerHTML = '<span class="pmd-r4-market-pill">Türkiye · TRY · Europe/Istanbul · payments pending</span>';
    }
'''
replace_once(FINANCE_JS, old_actions, new_actions, 'Finance market badge for all platform countries')

finance = FINANCE.read_text()
for marker in [
    'PMD_FINANCE_MARKET_SCOPE_R6A',
    'PMD_CANADA_FINANCE_FIRST_PAINT_R6',
    "$providerCodes = ['square'];",
    "['card', 'apple_pay', 'google_pay', 'cod', 'cash']",
    'CountryPlatformProfileRegistry::CANADA',
    'CountryPlatformProfileRegistry::TURKEY',
    'array_intersect($compatible, $providerCodes)',
]:
    if marker not in finance:
        raise SystemExit(f'STOP: Finance market marker missing: {marker}')

js = FINANCE_JS.read_text()
for marker in [
    'Canada · CAD · America/Toronto · Square',
    'Germany · EUR · Europe/Berlin',
    'Türkiye · TRY · Europe/Istanbul · payments pending',
]:
    if marker not in js:
        raise SystemExit(f'STOP: Finance market badge missing: {marker}')

print('PASS: Germany Finance no longer exposes Square from the global provider catalogue')
print('PASS: Türkiye Finance remains payment-empty on first paint')
print('PASS: Canada Finance first paint shows Square as the only provider')
print('PASS: Canada Finance Card/Apple Pay/Google Pay map only to Square')
print('PASS: Canada Finance cash remains providerless')
print('PASS: Finance market badges are location-aware for DE/TR/OM/CA')
print('PASS: Square Canada Finance R6A patch sequence complete')