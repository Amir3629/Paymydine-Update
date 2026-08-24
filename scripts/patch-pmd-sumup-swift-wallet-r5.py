#!/usr/bin/env python3
from pathlib import Path
import re
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: patch-pmd-sumup-swift-wallet-r5.py <stage-root>')

root = Path(sys.argv[1])
service_rel = 'app/Services/Payments/SumupOnlineCheckoutService.php'
routes_rel = 'app/main/routes_sumup_self_service.php'
controller_rel = 'app/admin/controllers/SumupTerminalSettings.php'
admin_js_rel = 'app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js'
front_rel = 'frontend-v2/src/runtime/components/SumupInlinePayment.tsx'


def read(rel):
    path = root / rel
    if not path.exists():
        raise SystemExit(f'ERROR: missing target: {rel}')
    return path, path.read_text()


def write(rel, text):
    path = root / rel
    path.write_text(text)


# ---------------------------------------------------------------------------
# 1. Backend wallet settings + public Swift Checkout configuration.
# ---------------------------------------------------------------------------
service_path, service = read(service_rel)

wallet_block = re.compile(
    r"    public function walletSettings\(string \$environment\): array\n"
    r"    \{.*?\n    \}\n\n"
    r"    public function saveWalletSettings\(.*?\n    \}\n\n"
    r"    public function stateWithWallets",
    re.DOTALL,
)

wallet_replacement = r'''    public function walletSettings(string $environment): array
    {
        $environment = $this->normalizeEnvironment($environment);
        $row = DB::table('terminal_provider_configs')
            ->where('provider_code', 'sumup')
            ->where('environment', $environment)
            ->first();

        $metadata = $this->decodeMetadata($row->metadata ?? null);
        $merchantId = trim((string)($metadata['google_pay_merchant_id'] ?? ''));
        $merchantName = trim((string)($metadata['google_pay_merchant_name'] ?? ''));
        $publicKey = trim((string)(
            $metadata['sumup_wallet_public_key']
            ?? $metadata['swift_checkout_public_key']
            ?? ''
        ));

        return [
            'google_pay' => [
                'merchant_id' => $merchantId,
                'merchant_name' => $merchantName,
                'configured' => $merchantId !== '' && $merchantName !== '',
            ],
            'apple_pay' => [
                'dashboard_domain_onboarding_required' => true,
            ],
            'swift_checkout' => [
                // Public merchant key intentionally goes to the browser. This
                // is NOT the secret SumUp API key (sup_sk_...).
                'public_key' => $publicKey,
                'configured' => str_starts_with($publicKey, 'sup_pk_'),
            ],
        ];
    }

    public function saveWalletSettings(
        string $environment,
        ?string $googlePayMerchantId,
        ?string $googlePayMerchantName,
        ?string $walletPublicKey = null
    ): array {
        $environment = $this->normalizeEnvironment($environment);
        $row = DB::table('terminal_provider_configs')
            ->where('provider_code', 'sumup')
            ->where('environment', $environment)
            ->first();

        if (!$row) {
            throw new RuntimeException('Save the SumUp connection before configuring wallets.');
        }

        $metadata = $this->decodeMetadata($row->metadata ?? null);
        $metadata['google_pay_merchant_id'] = trim((string)$googlePayMerchantId);
        $metadata['google_pay_merchant_name'] = trim((string)$googlePayMerchantName);

        if ($walletPublicKey !== null) {
            $walletPublicKey = trim($walletPublicKey);
            if ($walletPublicKey !== '' && !preg_match('/^sup_pk_[A-Za-z0-9._-]{6,500}$/', $walletPublicKey)) {
                throw new RuntimeException('SumUp Wallet Public Key must start with sup_pk_. Do not paste the secret sup_sk_ API key here.');
            }
            $metadata['sumup_wallet_public_key'] = $walletPublicKey;
        }

        $metadata['online_checkout_mode'] = 'payment_widget+swift_checkout';
        $metadata['wallet_settings_updated_at'] = now()->toIso8601String();

        DB::table('terminal_provider_configs')
            ->where('terminal_provider_config_id', $row->terminal_provider_config_id)
            ->update([
                'metadata' => json_encode($metadata, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ]);

        return $this->walletSettings($environment);
    }

    // PMD_SUMUP_SWIFT_CONFIG_R5
    // Swift Checkout is the dedicated SumUp product for standalone Apple Pay
    // and Google Pay buttons. The response contains browser-safe data only.
    public function swiftCheckoutConfig(): array
    {
        $config = $this->activeConfig();
        $wallets = $this->walletSettings((string)$config['environment']);
        $publicKey = trim((string)($wallets['swift_checkout']['public_key'] ?? ''));
        if (!str_starts_with($publicKey, 'sup_pk_')) {
            throw new RuntimeException('SumUp Wallet Public Key is missing. Copy the sup_pk_ key from SumUp Dashboard → Settings → For Developers → Toolkit → API Keys into PayMyDine.');
        }

        $identity = $this->merchantIdentity($config);

        return [
            'success' => true,
            'provider' => 'sumup',
            'integration_mode' => 'swift_checkout',
            'environment' => (string)$config['environment'],
            'sdk_url' => 'https://js.sumup.com/swift-checkout/v1/sdk.js',
            'public_key' => $publicKey,
            'country_code' => $identity['country_code'],
            'merchant_name' => $identity['merchant_name'],
            'google_pay' => ($wallets['google_pay']['configured'] ?? false)
                ? [
                    'merchantId' => (string)$wallets['google_pay']['merchant_id'],
                    'merchantName' => (string)$wallets['google_pay']['merchant_name'],
                ]
                : null,
        ];
    }

    public function stateWithWallets'''

if 'PMD_SUMUP_SWIFT_CONFIG_R5' not in service:
    matches = list(wallet_block.finditer(service))
    if len(matches) != 1:
        raise SystemExit(f'ERROR: expected exactly one wallet settings block, found {len(matches)}')
    service = service[:matches[0].start()] + wallet_replacement + service[matches[0].end():]
    print('BACKEND_SWIFT_WALLET_SETTINGS=PATCHED')
else:
    print('BACKEND_SWIFT_WALLET_SETTINGS=ALREADY_PATCHED')

if 'protected function merchantIdentity(array $config): array' not in service:
    anchor = '    protected function transactionReference(array $body): string\n'
    helper = r'''    protected function merchantIdentity(array $config): array
    {
        $merchantCode = trim((string)($config['merchant_code'] ?? ''));
        if ($merchantCode === '') {
            throw new RuntimeException('SumUp Merchant Code is missing.');
        }

        $country = '';
        $name = '';

        try {
            $merchantResponse = Http::withToken($config['access_token'])
                ->acceptJson()
                ->timeout(15)
                ->get(rtrim((string)$config['url'], '/').'/v1/merchants/'.rawurlencode($merchantCode));

            if ($merchantResponse->successful()) {
                $merchant = (array)$merchantResponse->json();
                $company = (array)($merchant['company'] ?? []);
                $companyAddress = (array)($company['address'] ?? []);
                $business = (array)($merchant['business_profile'] ?? []);
                $businessAddress = (array)($business['address'] ?? []);
                $country = strtoupper(trim((string)(
                    $merchant['country']
                    ?? $companyAddress['country']
                    ?? $businessAddress['country']
                    ?? ''
                )));
                $name = trim((string)(
                    $business['name']
                    ?? $company['name']
                    ?? $merchant['alias']
                    ?? ''
                ));
            }
        } catch (\Throwable $e) {
            report($e);
        }

        if (!preg_match('/^[A-Z]{2}$/', $country)) {
            try {
                $meResponse = Http::withToken($config['access_token'])
                    ->acceptJson()
                    ->timeout(15)
                    ->get(rtrim((string)$config['url'], '/').'/v0.1/me');
                if ($meResponse->successful()) {
                    $me = (array)$meResponse->json();
                    $profile = (array)($me['merchant_profile'] ?? []);
                    $profileAddress = (array)($profile['address'] ?? []);
                    $country = strtoupper(trim((string)(
                        $profile['country']
                        ?? $profileAddress['country']
                        ?? $me['country']
                        ?? ''
                    )));
                    if ($name === '') {
                        $name = trim((string)(
                            $profile['business_name']
                            ?? $profile['name']
                            ?? $me['display_name']
                            ?? ''
                        ));
                    }
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        if (!preg_match('/^[A-Z]{2}$/', $country)) {
            throw new RuntimeException('Could not resolve the SumUp merchant country required by Swift Checkout. Test the SumUp connection again and make sure the API key belongs to this merchant.');
        }

        return [
            'country_code' => $country,
            'merchant_name' => $name !== '' ? $name : 'PayMyDine',
        ];
    }

'''
    if anchor not in service:
        raise SystemExit('ERROR: transactionReference anchor missing for merchant identity')
    service = service.replace(anchor, helper + anchor, 1)
    print('BACKEND_SWIFT_MERCHANT_IDENTITY=PATCHED')
else:
    print('BACKEND_SWIFT_MERCHANT_IDENTITY=ALREADY_PATCHED')

service_path.write_text(service)

# ---------------------------------------------------------------------------
# 2. Guest-safe Swift configuration route.
# ---------------------------------------------------------------------------
routes_path, routes = read(routes_rel)
if '/payments/sumup/swift/config' not in routes:
    anchor = "    // Canonical embedded online-payment flow. The browser receives only a\n"
    block = r'''    // PMD_SUMUP_SWIFT_ROUTE_R5
    // Browser-safe configuration for dedicated Apple Pay / Google Pay Swift Checkout.
    Route::get('/payments/sumup/swift/config', function (SumupOnlineCheckoutService $service) {
        try {
            return response()->json($service->swiftCheckoutConfig());
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'provider' => 'sumup',
                'integration_mode' => 'swift_checkout',
                'message' => $e->getMessage() ?: 'Could not prepare SumUp wallet checkout.',
            ], 422);
        }
    })->name('pmd.sumup.swift.config');

'''
    if anchor not in routes:
        raise SystemExit('ERROR: SumUp route group anchor missing')
    routes = routes.replace(anchor, block + anchor, 1)
    routes_path.write_text(routes)
    print('SWIFT_CONFIG_ROUTE=PATCHED')
else:
    print('SWIFT_CONFIG_ROUTE=ALREADY_PATCHED')

# ---------------------------------------------------------------------------
# 3. Admin controller: save the public sup_pk_ alongside wallet metadata.
# ---------------------------------------------------------------------------
controller_path, controller = read(controller_rel)
validation_anchor = "            'google_pay_merchant_name' => ['nullable', 'string', 'max:191'],\n"
if "'sumup_wallet_public_key'" not in controller:
    if validation_anchor not in controller:
        raise SystemExit('ERROR: SumUp controller Google validation anchor missing')
    controller = controller.replace(
        validation_anchor,
        validation_anchor + "            'sumup_wallet_public_key' => ['nullable', 'string', 'max:512'],\n",
        1,
    )

condition_old = """                array_key_exists('google_pay_merchant_id', $data)
                || array_key_exists('google_pay_merchant_name', $data)
            ) {"""
condition_new = """                array_key_exists('google_pay_merchant_id', $data)
                || array_key_exists('google_pay_merchant_name', $data)
                || array_key_exists('sumup_wallet_public_key', $data)
            ) {"""
if condition_old in controller:
    controller = controller.replace(condition_old, condition_new, 1)
elif condition_new not in controller:
    raise SystemExit('ERROR: SumUp controller wallet save condition anchor missing')

call_old = """                    $data['google_pay_merchant_id'] ?? null,
                    $data['google_pay_merchant_name'] ?? null
                );"""
call_new = """                    $data['google_pay_merchant_id'] ?? null,
                    $data['google_pay_merchant_name'] ?? null,
                    array_key_exists('sumup_wallet_public_key', $data) ? $data['sumup_wallet_public_key'] : null
                );"""
if call_old in controller:
    controller = controller.replace(call_old, call_new, 1)
elif "array_key_exists('sumup_wallet_public_key', $data) ?" not in controller:
    raise SystemExit('ERROR: SumUp controller saveWalletSettings call anchor missing')

controller_path.write_text(controller)
print('ADMIN_PUBLIC_WALLET_KEY=PATCHED')

# ---------------------------------------------------------------------------
# 4. Admin UI: one public key field; Apple upload flow remains PMD-managed.
# ---------------------------------------------------------------------------
js_path, js = read(admin_js_rel)
if 'var swift = wallets.swift_checkout || {};' not in js:
    anchor = '    var google = wallets.google_pay || {};\n'
    if anchor not in js:
        raise SystemExit('ERROR: SumUp admin wallet state anchor missing')
    js = js.replace(anchor, anchor + '    var swift = wallets.swift_checkout || {};\n', 1)

if "'sumup-wallet-public-key'" not in js:
    anchor = "    fields.className = 'pmd-provider-modal-fields';\n"
    block = r'''    fields.className = 'pmd-provider-modal-fields';
    fields.appendChild(field(
      'SumUp Wallet Public Key',
      'sumup-wallet-public-key',
      swift.public_key || '',
      'sup_pk_…',
      'Required for Apple Pay and Google Pay Swift Checkout. Copy the public sup_pk_ key from SumUp → Settings → For Developers → Toolkit → API Keys. Never paste the secret sup_sk_ key here.'
    ));
'''
    if anchor not in js:
        raise SystemExit('ERROR: SumUp admin wallet fields anchor missing')
    js = js.replace(anchor, block, 1)

intro_old = 'PayMyDine uses the embedded SumUp Payment Widget. Card details stay with SumUp; eligible Apple Pay and Google Pay options render in the same checkout card.'
intro_new = 'Card / Wallet uses the embedded SumUp Payment Widget. Standalone Apple Pay and Google Pay use SumUp Swift Checkout buttons inside the same PayMyDine checkout card, so wallet selection never falls back to card fields.'
if intro_old in js:
    js = js.replace(intro_old, intro_new, 1)
elif intro_new not in js:
    raise SystemExit('ERROR: SumUp admin intro copy anchor missing')

if "data-pmd-sumup-wallet-field=\"sumup-wallet-public-key\"" not in js:
    query_anchor = "      var merchantName = section.querySelector('[data-pmd-sumup-wallet-field=\"google-pay-merchant-name\"]');\n"
    if query_anchor not in js:
        raise SystemExit('ERROR: SumUp admin save query anchor missing')
    js = js.replace(
        query_anchor,
        query_anchor + "      var walletPublicKey = section.querySelector('[data-pmd-sumup-wallet-field=\"sumup-wallet-public-key\"]');\n",
        1,
    )

body_anchor = "          google_pay_merchant_name: merchantName ? String(merchantName.value || '').trim() : ''\n"
body_new = "          google_pay_merchant_name: merchantName ? String(merchantName.value || '').trim() : '',\n          sumup_wallet_public_key: walletPublicKey ? String(walletPublicKey.value || '').trim() : ''\n"
if body_anchor in js:
    js = js.replace(body_anchor, body_new, 1)
elif 'sumup_wallet_public_key:' not in js:
    raise SystemExit('ERROR: SumUp admin save body anchor missing')

js_path.write_text(js)
print('ADMIN_SWIFT_WALLET_UI=PATCHED')

# ---------------------------------------------------------------------------
# 5. Frontend router: card keeps Payment Widget; wallets go to Swift component.
# ---------------------------------------------------------------------------
front_path, front = read(front_rel)
import_anchor = "import styles from './RuntimeOverlays.module.css'\n"
import_line = "import { SumupSwiftWalletPayment } from './SumupSwiftWalletPayment'\n"
if import_line not in front:
    if import_anchor not in front:
        raise SystemExit('ERROR: SumUp frontend styles import anchor missing')
    front = front.replace(import_anchor, import_anchor + import_line, 1)

if 'function SumupCardWidgetPayment(props: Props)' not in front:
    export_anchor = 'export function SumupInlinePayment(props: Props) {'
    if export_anchor not in front:
        raise SystemExit('ERROR: SumUp frontend exported component anchor missing')
    front = front.replace(export_anchor, 'function SumupCardWidgetPayment(props: Props) {', 1)

if 'PMD_SUMUP_SWIFT_ROUTER_R5' not in front:
    front = front.rstrip() + r'''

// PMD_SUMUP_SWIFT_ROUTER_R5
// Never mount the card-oriented Payment Widget for standalone wallets.
export function SumupInlinePayment(props: Props) {
  const method = String(props.methodCode || '').toLowerCase()
  if (method === 'apple_pay' || method === 'google_pay') {
    return <SumupSwiftWalletPayment {...props} />
  }
  return <SumupCardWidgetPayment {...props} />
}
''' + '\n'

front_path.write_text(front)
print('FRONTEND_SWIFT_WALLET_ROUTER=PATCHED')

# Final contract checks.
required = {
    service_rel: [
        'PMD_SUMUP_SWIFT_CONFIG_R5',
        "'sumup_wallet_public_key'",
        "'sdk_url' => 'https://js.sumup.com/swift-checkout/v1/sdk.js'",
        'protected function merchantIdentity(array $config): array',
    ],
    routes_rel: [
        "Route::get('/payments/sumup/swift/config'",
        "pmd.sumup.swift.config",
    ],
    controller_rel: [
        "'sumup_wallet_public_key'",
        "array_key_exists('sumup_wallet_public_key', $data)",
    ],
    admin_js_rel: [
        'SumUp Wallet Public Key',
        'sumup_wallet_public_key:',
        'Swift Checkout buttons',
    ],
    front_rel: [
        "import { SumupSwiftWalletPayment } from './SumupSwiftWalletPayment'",
        'function SumupCardWidgetPayment(props: Props)',
        'PMD_SUMUP_SWIFT_ROUTER_R5',
    ],
}
for rel, needles in required.items():
    _, text = read(rel)
    for needle in needles:
        if needle not in text:
            raise SystemExit(f'ERROR: R5 contract missing {needle}: {rel}')

print('PMD_SUMUP_SWIFT_WALLET_R5=OK')
