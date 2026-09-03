#!/usr/bin/env python3
from pathlib import Path
import runpy

BASE = Path(__file__).resolve().parents[1]
R5 = BASE / 'scripts/pmd-square-ui-runtime-r5.py'
COUNTRY = BASE / 'app/Services/Platform/CountryPlatformProfileRegistry.php'
FOUNDATION = BASE / 'app/Services/Platform/TenantRegionalFoundationService.php'
TENANT_PROFILE = BASE / 'app/Services/Platform/TenantPlatformProfileService.php'
MARKET_SETTINGS = BASE / 'app/admin/controllers/PaymentMarketSettings.php'
SQUARE_RUNTIME = BASE / 'app/Services/Payments/SquareRuntimeService.php'
SQUARE_TERMINAL = BASE / 'app/Services/TerminalPayments/SquareTerminalProvider.php'
PAYMENTS = BASE / 'app/admin/controllers/Payments.php'
FINANCE = BASE / 'app/admin/controllers/Pmdfinance.php'


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


def replace_php_function(path: Path, signature: str, replacement: str, marker: str, label: str):
    text = path.read_text()
    if marker in text:
        print(f'PASS: {label} already applied')
        return
    start = text.find(signature)
    if start < 0:
        raise SystemExit(f'STOP: {label}: function signature not found')
    brace = text.find('{', start)
    if brace < 0:
        raise SystemExit(f'STOP: {label}: opening brace not found')
    depth = 0
    end = None
    for index in range(brace, len(text)):
        char = text[index]
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                end = index + 1
                break
    if end is None:
        raise SystemExit(f'STOP: {label}: closing brace not found')
    path.write_text(text[:start] + replacement.rstrip() + text[end:])
    print(f'PASS: {label}')


# R6 is deliberately layered on the validated Square runtime chain. The repaired
# R5 patcher is idempotent and first makes the UI/runtime fixes that failed on the
# earlier production anchor, then this file adds the Canada market boundary.
runpy.run_path(str(R5), run_name='__main__')

# ---------------------------------------------------------------------------
# 1) Canada becomes a first-class platform country. SuperAdmin countryOptions()
# and publicProfiles() are registry-driven, so this one profile automatically
# appears in Create/Edit restaurant and in the market preview.
# ---------------------------------------------------------------------------
replace_once(
    COUNTRY,
    "    public const VERSION = '1.1.0';\n",
    "    public const VERSION = '1.2.0';\n",
    'Country profile version bumped for Canada',
)
insert_before_once(
    COUNTRY,
    "    public const GERMANY = 'DE';\n",
    "    public const CANADA = 'CA';\n",
    "public const CANADA = 'CA';",
    'Canada country constant',
)

# Keep Germany fail-closed for Square even when R6 is run against a source tree
# that has not yet received the R4 Germany cleanup.
country = COUNTRY.read_text()
country = country.replace("                        'square' => ['online' => true, 'terminal' => false],\n", '', 1)
country = country.replace("['stripe', 'sumup', 'vr_payment', 'worldline', 'square']", "['stripe', 'sumup', 'vr_payment', 'worldline']", 1)
COUNTRY.write_text(country)

canada_block = r'''            self::CANADA => [
                'country_code' => 'CA',
                'country_iso3' => 'CAN',
                'country_name' => 'Canada',
                'calling_code' => '+1',
                // Canada spans multiple time zones. Toronto is the safe bootstrap
                // default; an explicit location timezone may override it later.
                'timezone' => 'America/Toronto',
                'week_start' => 'sunday',
                'date_format_hint' => 'YYYY-MM-DD',
                'currency' => [
                    'code' => 'CAD',
                    'minor_exponent' => 2,
                ],
                'languages' => [
                    // English is launch-ready. French must not be exposed until
                    // the PMD customer/Admin fr catalogue is completed and audited.
                    'default' => 'en',
                    'fallback' => 'en',
                    'eligible' => ['en'],
                    'locale_tags' => ['en-CA'],
                ],
                'operations' => [
                    'business_hours_policy' => 'location_owned',
                    'reservation_timezone' => 'America/Toronto',
                    'reporting_timezone' => 'America/Toronto',
                    'tax_policy' => 'restaurant_configured',
                ],
                'payments' => [
                    'currency' => 'CAD',
                    'providers' => [
                        'square' => [
                            'online' => true,
                            'terminal' => true,
                            'status' => 'implemented_canada_runtime',
                        ],
                    ],
                    'methods' => [
                        'ca_card' => $this->method('ca_card', 'Cards (Canada)', 'card', ['square']),
                        'ca_apple_pay' => $this->method('ca_apple_pay', 'Apple Pay (Canada)', 'apple_pay', ['square']),
                        'ca_google_pay' => $this->method('ca_google_pay', 'Google Pay (Canada)', 'google_pay', ['square']),
                        'ca_cash' => $this->method('ca_cash', 'Cash (Canada)', 'cash', []),
                    ],
                ],
                'terminals' => [
                    'providers' => [
                        'square' => [
                            'pmd_remote_runtime' => true,
                            'status' => 'implemented_sandbox_ready_live_device_validation_pending',
                        ],
                    ],
                ],
            ],

'''
insert_before_once(
    COUNTRY,
    "            self::TURKEY => [\n",
    canada_block,
    "self::CANADA => [",
    'Canada country platform profile',
)
replace_once(
    COUNTRY,
    "            'TR', 'TUR', 'TURKEY', 'TURKIYE', 'TÜRKİYE', 'TÜRKIYE' => self::TURKEY,\n",
    "            'CA', 'CAN', 'CANADA' => self::CANADA,\n            'TR', 'TUR', 'TURKEY', 'TURKIYE', 'TÜRKİYE', 'TÜRKIYE' => self::TURKEY,\n",
    'Canada country normalization',
)

# ---------------------------------------------------------------------------
# 2) Materialize a real CAD row rather than falling through to a generic code.
# ---------------------------------------------------------------------------
cad_definition = r'''            'CAD' => [
                'currency_name' => 'Canadian Dollar',
                'currency_code' => 'CAD',
                'currency_symbol' => '$',
                'currency_rate' => 1,
                'symbol_position' => 1,
                'thousand_sign' => ',',
                'decimal_sign' => '.',
                'decimal_position' => '2',
                'iso_alpha2' => 'CA',
                'iso_alpha3' => 'CAN',
                'iso_numeric' => 124,
                'flag' => '',
                'currency_status' => 1,
            ],
'''
insert_before_once(
    FOUNDATION,
    "            'EUR' => [\n",
    cad_definition,
    "'currency_name' => 'Canadian Dollar'",
    'Canonical CAD currency foundation',
)

# ---------------------------------------------------------------------------
# 3) Canada tenant apply semantics. English-only market rows are enforced; the
# canonical mature card/apple/google rows are reused, while any assignment to a
# non-Square provider is disabled. Reapplying Canada preserves rows already
# assigned to Square. Leaving Canada disables Square provider/method offering.
# ---------------------------------------------------------------------------
replace_once(
    TENANT_PROFILE,
    "        if ($countryCode === CountryPlatformProfileRegistry::TURKEY && in_array('status', $columns, true)) {\n",
    "        if (in_array($countryCode, [CountryPlatformProfileRegistry::TURKEY, CountryPlatformProfileRegistry::CANADA], true) && in_array('status', $columns, true)) {\n",
    'Canada tenant language rows are market-scoped',
)

new_disable_function = r'''    private function disableForeignPaymentRows(string $countryCode): void
    {
        try {
            $model = new Payments_model();
            $table = $model->getTable();
            $connection = $model->getConnection();
            $schema = $connection->getSchemaBuilder();
            if (!$schema->hasTable($table)) return;

            if ($countryCode === CountryPlatformProfileRegistry::OMAN) {
                $foreignCodes = [
                    'de_card', 'de_apple_pay', 'de_google_pay', 'de_wero', 'de_paypal', 'de_cash',
                    'ca_card', 'ca_apple_pay', 'ca_google_pay', 'ca_cash',
                    'card', 'apple_pay', 'google_pay', 'wero', 'paypal', 'cod', 'cash',
                    'stripe', 'worldline', 'sumup', 'square', 'vr_payment',
                    'tr_card', 'tr_cash',
                ];
            } elseif ($countryCode === CountryPlatformProfileRegistry::TURKEY) {
                $foreignCodes = [
                    'de_card', 'de_apple_pay', 'de_google_pay', 'de_wero', 'de_paypal', 'de_cash',
                    'om_card', 'om_omannet', 'om_apple_pay', 'om_google_pay', 'om_cash',
                    'ca_card', 'ca_apple_pay', 'ca_google_pay', 'ca_cash',
                    'card', 'apple_pay', 'google_pay', 'wero', 'paypal', 'cod', 'cash',
                    'stripe', 'worldline', 'sumup', 'square', 'vr_payment', 'paymob',
                ];
            } elseif ($countryCode === CountryPlatformProfileRegistry::CANADA) {
                $foreignCodes = [
                    'de_card', 'de_apple_pay', 'de_google_pay', 'de_wero', 'de_paypal', 'de_cash',
                    'om_card', 'om_omannet', 'om_apple_pay', 'om_google_pay', 'om_cash',
                    'tr_card', 'tr_cash',
                    // Canada runtime is Square-only. Keep Square and providerless
                    // cash, but disable other provider products and unsupported
                    // canonical online methods.
                    'stripe', 'worldline', 'sumup', 'vr_payment', 'paypal', 'paymob',
                    'wero',
                ];
            } else {
                // Germany/mature EU market: Canada-specific catalogue and the
                // Square provider itself cannot remain active after a market move.
                $foreignCodes = [
                    'om_card', 'om_omannet', 'om_apple_pay', 'om_google_pay', 'om_cash', 'paymob',
                    'tr_card', 'tr_cash',
                    'ca_card', 'ca_apple_pay', 'ca_google_pay', 'ca_cash', 'square',
                ];
            }

            $columns = $schema->getColumnListing($table);
            if (!in_array('status', $columns, true)) return;

            $foreignCodes = array_values(array_unique($foreignCodes));
            $affected = $connection->table($table)
                ->whereIn('code', $foreignCodes)
                ->where('status', '!=', 0)
                ->update(['status' => 0]);

            $assignmentAffected = 0;
            if (in_array('provider_code', $columns, true)) {
                if ($countryCode === CountryPlatformProfileRegistry::CANADA) {
                    // Preserve an already-configured Square assignment on profile
                    // reapply, but fail closed if the canonical row belongs to a
                    // provider carried over from a different market.
                    $assignmentAffected = $connection->table($table)
                        ->whereIn('code', ['card', 'apple_pay', 'google_pay'])
                        ->whereNotNull('provider_code')
                        ->whereRaw('LOWER(provider_code) <> ?', ['square'])
                        ->where('status', '!=', 0)
                        ->update(['status' => 0]);
                } else {
                    // Moving away from Canada must immediately stop any canonical
                    // payment method that still points at Square.
                    $assignmentAffected = $connection->table($table)
                        ->whereIn('code', ['card', 'apple_pay', 'google_pay'])
                        ->whereRaw('LOWER(provider_code) = ?', ['square'])
                        ->where('status', '!=', 0)
                        ->update(['status' => 0]);
                }
            }

            Log::info('PMD_TENANT_PLATFORM_FOREIGN_PAYMENTS_DISABLED_R6', [
                'country_code' => $countryCode,
                'affected' => $affected,
                'assignment_affected' => $assignmentAffected,
                'square_canada_only' => true,
            ]);
        } catch (\Throwable $error) {
            Log::warning('PMD_TENANT_PLATFORM_FOREIGN_PAYMENTS_DISABLE_FAILED_R6', [
                'country_code' => $countryCode,
                'error' => $error->getMessage(),
            ]);
        }
    }
'''
replace_php_function(
    TENANT_PROFILE,
    '    private function disableForeignPaymentRows(string $countryCode): void',
    new_disable_function,
    'PMD_TENANT_PLATFORM_FOREIGN_PAYMENTS_DISABLED_R6',
    'Canada/Square tenant market isolation',
)

# Canada uses the mature canonical card/apple/google rows, exactly as Germany
# does today, while labels/catalogue identities remain ca_* in market UI.
replace_once(
    MARKET_SETTINGS,
    "        if ($country === CountryPlatformProfileRegistry::GERMANY && $canonical !== '') {\n",
    "        if (in_array($country, [CountryPlatformProfileRegistry::GERMANY, CountryPlatformProfileRegistry::CANADA], true) && $canonical !== '') {\n",
    'Canada market methods use canonical runtime rows',
)

# ---------------------------------------------------------------------------
# 4) Square itself is a PayMyDine Canada-only runtime. Keep the provider-level
# catalogue of Square-supported seller countries for factual capability data,
# but PMD policy permits only CA in browser and terminal runtimes.
# ---------------------------------------------------------------------------
insert_before_once(
    SQUARE_RUNTIME,
    "    public const SUPPORTED_SELLER_COUNTRIES = ['AU', 'CA', 'FR', 'IE', 'JP', 'ES', 'GB', 'US'];\n",
    "    public const PMD_SUPPORTED_COUNTRIES = ['CA'];\n",
    "public const PMD_SUPPORTED_COUNTRIES = ['CA'];",
    'Square PMD Canada-only country policy',
)

square_runtime_guard = r'''        if (!in_array($pmdCountry, self::PMD_SUPPORTED_COUNTRIES, true)) {
            throw new \RuntimeException('Square is enabled in PayMyDine only for Canada (CA).');
        }
        if (!in_array($country, self::PMD_SUPPORTED_COUNTRIES, true) || !hash_equals($pmdCountry, $country)) {
            throw new \RuntimeException('The configured Square seller/test location must be in Canada for this PayMyDine market.');
        }
'''
insert_before_once(
    SQUARE_RUNTIME,
    "        if ($status !== '' && $status !== 'ACTIVE') {\n",
    square_runtime_guard,
    "Square is enabled in PayMyDine only for Canada (CA).",
    'Square browser runtime rejects non-Canada markets',
)

new_terminal_validate = r'''    public function validateConfiguration(array $config): array
    {
        foreach (['access_token', 'location_id', 'device_id'] as $field) {
            if (trim((string)($config[$field] ?? '')) === '') {
                return ['ok' => false, 'message' => 'Missing Square Terminal field: '.$field];
            }
        }

        $pmdCountry = strtoupper(trim((string)($config['pmd_country_code'] ?? '')));
        if (!in_array($pmdCountry, SquareRuntimeService::PMD_SUPPORTED_COUNTRIES, true)) {
            return [
                'ok' => false,
                'message' => 'Square Terminal is enabled in PayMyDine only for Canada (CA).',
            ];
        }

        $currency = strtoupper(trim((string)($config['currency'] ?? '')));
        if ($currency !== '' && $currency !== 'CAD') {
            return [
                'ok' => false,
                'message' => 'Square Canada Terminal payments require CAD.',
            ];
        }

        return ['ok' => true, 'message' => 'Square Canada Terminal API configuration is ready.'];
    }
'''
replace_php_function(
    SQUARE_TERMINAL,
    '    public function validateConfiguration(array $config): array',
    new_terminal_validate,
    'Square Terminal is enabled in PayMyDine only for Canada (CA).',
    'Square Terminal rejects non-Canada markets',
)
insert_before_once(
    SQUARE_TERMINAL,
    "        $amountMinor = $runtime->toMinor((float)($attempt['amount'] ?? 0), $currency);\n",
    "        if ($currency !== 'CAD') {\n            return ['ok' => false, 'status' => 'failed', 'message' => 'Square Canada Terminal checkout currency must be CAD.'];\n        }\n",
    "Square Canada Terminal checkout currency must be CAD.",
    'Square Terminal checkout enforces CAD',
)

# ---------------------------------------------------------------------------
# 5) Provider admin defaults/testing match the Canada-only policy.
# ---------------------------------------------------------------------------
for path in (FINANCE, PAYMENTS):
    text = path.read_text()
    # These exact Square field definitions are introduced by R4. Restrict only
    # Square defaults; do not touch EUR defaults for Stripe/Worldline/etc.
    text = text.replace(
        "'currency' => ['label' => 'Currency', 'default' => 'EUR', 'help' => 'Must match the configured Square seller location currency.'],",
        "'currency' => ['label' => 'Currency', 'default' => 'CAD', 'help' => 'Square is a PayMyDine Canada-only provider. Must match the Canadian Square seller location currency.'],"
    )
    text = text.replace(
        "'currency' => ['label' => 'Currency', 'type' => 'text', 'span' => 'left', 'default' => 'EUR', 'comment' => 'Must match the Square Location currency.'],",
        "'currency' => ['label' => 'Currency', 'type' => 'text', 'span' => 'left', 'default' => 'CAD', 'comment' => 'Canada only. Must match the Square Location currency (CAD).'],"
    )
    text = text.replace(
        "Germany/Oman/Turkiye are not Square live processing countries; PMD blocks Square live there.",
        "Square is enabled by PayMyDine only for Canada. Use a Canadian Square seller/sandbox account and CAD location."
    )
    path.write_text(text)

payments = PAYMENTS.read_text()
old_market = "            $liveMarketOk = $mode !== 'live' || (in_array($restaurantCountry, \\App\\Services\\Payments\\SquareRuntimeService::SUPPORTED_SELLER_COUNTRIES, true) && hash_equals($restaurantCountry, $squareCountry));\n"
new_market = "            $marketOk = $restaurantCountry === 'CA' && $squareCountry === 'CA';\n"
if new_market not in payments:
    if payments.count(old_market) != 1:
        raise SystemExit(f'STOP: Square Canada admin market check anchor expected 1, found {payments.count(old_market)}')
    payments = payments.replace(old_market, new_market, 1)
payments = payments.replace(
    "            $ok = $resp->ok() && $currencyOk && $liveMarketOk;\n",
    "            $ok = $resp->ok() && $currencyOk && $marketOk;\n",
    1
)
payments = payments.replace(
    "(!$liveMarketOk ? \"Square live processing is not available for PayMyDine restaurant country {$restaurantCountry}.\" : 'Square connection successful.')",
    "(!$marketOk ? \"Square is enabled in PayMyDine only for Canada; Square seller/test location and restaurant must both be CA.\" : 'Square connection successful.')",
    1
)
payments = payments.replace(
    "'live_market_supported' => $liveMarketOk",
    "'market_supported' => $marketOk, 'live_market_supported' => $marketOk",
    1
)
PAYMENTS.write_text(payments)

# ---------------------------------------------------------------------------
# Final static invariants. These are intentionally strict because market leakage
# is a payments safety issue, not a cosmetic configuration problem.
# ---------------------------------------------------------------------------
country = COUNTRY.read_text()
if "self::CANADA => [" not in country or "'code' => 'CAD'" not in country or "'square' => [" not in country:
    raise SystemExit('STOP: Canada market profile is incomplete')

germany = country.split("self::GERMANY => [", 1)[1].split("self::CANADA => [", 1)[0]
if "'square' =>" in germany or "'square']" in germany:
    raise SystemExit('STOP: Germany still advertises Square after Canada-only policy')

canada = country.split("self::CANADA => [", 1)[1].split("self::TURKEY => [", 1)[0]
for required in ["'currency' => [", "'code' => 'CAD'", "'timezone' => 'America/Toronto'", "'square' => [", "'ca_card'", "'ca_apple_pay'", "'ca_google_pay'", "'ca_cash'"]:
    if required not in canada:
        raise SystemExit(f'STOP: Canada profile missing {required}')
for forbidden in ["'stripe' =>", "'worldline' =>", "'sumup' =>", "'vr_payment' =>", "'paymob' =>"]:
    if forbidden in canada:
        raise SystemExit(f'STOP: Canada profile contains non-Square provider {forbidden}')

runtime = SQUARE_RUNTIME.read_text()
if "PMD_SUPPORTED_COUNTRIES = ['CA']" not in runtime or 'Square is enabled in PayMyDine only for Canada (CA).' not in runtime:
    raise SystemExit('STOP: Square Canada-only browser runtime guard missing')
terminal = SQUARE_TERMINAL.read_text()
if 'Square Terminal is enabled in PayMyDine only for Canada (CA).' not in terminal or 'Square Canada Terminal checkout currency must be CAD.' not in terminal:
    raise SystemExit('STOP: Square Canada-only terminal runtime guard missing')
market = MARKET_SETTINGS.read_text()
if 'CountryPlatformProfileRegistry::CANADA' not in market:
    raise SystemExit('STOP: Canada canonical payment-row mapping missing')
profile = TENANT_PROFILE.read_text()
if 'PMD_TENANT_PLATFORM_FOREIGN_PAYMENTS_DISABLED_R6' not in profile:
    raise SystemExit('STOP: Canada tenant payment isolation missing')
if "'currency_name' => 'Canadian Dollar'" not in FOUNDATION.read_text():
    raise SystemExit('STOP: CAD regional foundation missing')
if "$marketOk = $restaurantCountry === 'CA' && $squareCountry === 'CA';" not in PAYMENTS.read_text():
    raise SystemExit('STOP: Square admin Canada-only test guard missing')

print('PASS: Canada appears as a first-class SuperAdmin market')
print('PASS: Canada defaults to CAD and America/Toronto')
print('PASS: Canada launch languages are English-only until a French pack is audited')
print('PASS: Canada online payment candidates are Square Card + Apple Pay + Google Pay only')
print('PASS: Canada terminal provider is Square only')
print('PASS: Square browser runtime is PayMyDine Canada-only')
print('PASS: Square Terminal runtime is PayMyDine Canada-only and CAD-only')
print('PASS: Germany/Oman/Turkiye cannot retain Square offering after market apply')
print('PASS: Square Canada market R6 patch sequence complete')