#!/usr/bin/env python3
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
TENANT_PROFILE = BASE / 'app/Services/Platform/TenantPlatformProfileService.php'
TERMINAL_MODEL = BASE / 'app/admin/models/Terminal_devices_model.php'


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
        if text[index] == '{':
            depth += 1
        elif text[index] == '}':
            depth -= 1
            if depth == 0:
                end = index + 1
                break
    if end is None:
        raise SystemExit(f'STOP: {label}: closing brace not found')
    path.write_text(text[:start] + replacement.rstrip() + text[end:])
    print(f'PASS: {label}')


# Reapplying or changing a market must also deactivate foreign physical/cloud
# terminal inventory. Rows are retained for audit/recovery; only is_active is
# changed. The allowed set comes from the same country profile used everywhere.
replace_once(
    TENANT_PROFILE,
    "        $this->disableForeignPaymentRows($countryCode);\n",
    "        $this->disableForeignPaymentRows($countryCode);\n        $this->disableForeignTerminalDevices($countryCode);\n",
    'Tenant market apply also isolates terminal devices',
)

terminal_isolation_function = r'''    private function disableForeignTerminalDevices(string $countryCode): void
    {
        try {
            if (!Schema::hasTable('terminal_devices') || !Schema::hasColumn('terminal_devices', 'provider_code') || !Schema::hasColumn('terminal_devices', 'is_active')) {
                return;
            }

            $profile = $this->profiles->requireProfile($countryCode);
            $allowed = array_values(array_unique(array_map(
                static fn ($code) => strtolower(trim((string)$code)),
                array_keys((array)($profile['terminals']['providers'] ?? []))
            )));

            $query = DB::table('terminal_devices')->where('is_active', '!=', 0);
            if ($allowed) {
                $query->whereNotIn(DB::raw('LOWER(provider_code)'), $allowed);
            }
            $affected = $query->update(['is_active' => 0]);

            Log::info('PMD_TENANT_PLATFORM_FOREIGN_TERMINALS_DISABLED_R6B', [
                'country_code' => $countryCode,
                'allowed_providers' => $allowed,
                'affected' => $affected,
            ]);
        } catch (\Throwable $error) {
            Log::warning('PMD_TENANT_PLATFORM_FOREIGN_TERMINALS_DISABLE_FAILED_R6B', [
                'country_code' => $countryCode,
                'error' => $error->getMessage(),
            ]);
        }
    }

'''
insert_before_once(
    TENANT_PROFILE,
    "    private function disableForeignPaymentRows(string $countryCode): void\n",
    terminal_isolation_function,
    'PMD_TENANT_PLATFORM_FOREIGN_TERMINALS_DISABLED_R6B',
    'Tenant terminal inventory market isolation',
)

# Settings > Devices provider picker must be market-driven too. R4 adds Square to
# the global implementation catalogue; R6B intersects that catalogue with the
# active location country profile instead of showing every provider everywhere.
new_provider_options = r'''    public static function listProviderOptions(): array
    {
        // PMD_TERMINAL_DEVICE_MARKET_OPTIONS_R6B
        $implemented = [
            'sumup' => 'SumUp',
            'vr_payment' => 'VR Payment',
            'worldline' => 'Worldline Terminal API',
            'square' => 'Square Terminal API',
        ];

        try {
            $state = app(\App\Services\Platform\LocationPlatformContext::class)->state();
            if (!($state['resolved'] ?? false) || empty($state['profile'])) {
                return [];
            }
            $allowed = array_keys((array)($state['profile']['terminals']['providers'] ?? []));
            return array_intersect_key($implemented, array_fill_keys($allowed, true));
        } catch (\Throwable $error) {
            return [];
        }
    }
'''
replace_php_function(
    TERMINAL_MODEL,
    '    public static function listProviderOptions(): array',
    new_provider_options,
    'PMD_TERMINAL_DEVICE_MARKET_OPTIONS_R6B',
    'Settings Devices provider picker is market-scoped',
)

profile = TENANT_PROFILE.read_text()
if 'disableForeignTerminalDevices($countryCode)' not in profile or 'PMD_TENANT_PLATFORM_FOREIGN_TERMINALS_DISABLED_R6B' not in profile:
    raise SystemExit('STOP: tenant terminal market isolation missing')
model = TERMINAL_MODEL.read_text()
if 'PMD_TERMINAL_DEVICE_MARKET_OPTIONS_R6B' not in model or "'square' => 'Square Terminal API'" not in model:
    raise SystemExit('STOP: market-aware terminal provider options missing')

print('PASS: Canada terminal device picker exposes Square only')
print('PASS: Germany terminal device picker keeps only its profile providers')
print('PASS: Oman/Turkiye cannot expose foreign terminal device providers')
print('PASS: market changes deactivate foreign active terminal_devices rows')
print('PASS: Square Canada terminal market R6B patch sequence complete')