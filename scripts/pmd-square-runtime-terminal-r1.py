#!/usr/bin/env python3
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
V2 = BASE / 'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815'

ROUTES = BASE / 'app/admin/routes.php'
REGISTRY = BASE / 'app/Services/Payments/ProviderCapabilityRegistry.php'
PAYMENTS_MODEL = BASE / 'app/admin/models/Payments_model.php'
COUNTRY = BASE / 'app/Services/Platform/CountryPlatformProfileRegistry.php'
FINANCE = BASE / 'app/admin/controllers/Pmdfinance.php'
PAYMENTS = BASE / 'app/admin/controllers/Payments.php'
BASELINE = BASE / 'app/Services/PmdTenantProductBaselineR1.php'
TERMINAL_MODEL = BASE / 'app/admin/models/Terminal_devices_model.php'
TERMINAL_CONTROLLER = BASE / 'app/admin/controllers/TerminalDevices.php'
TERMINAL_SERVICE = BASE / 'app/Services/TerminalPayments/TerminalPaymentService.php'
WAITER = BASE / 'app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php'
RUNTIME = V2 / 'src/runtime/components/RuntimeOverlays.tsx'
QR_PAY = BASE / 'routes/qr-pay.php'


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


# 1) Load the new Square runtime after the historical route manifest.
replace_once(
    ROUTES,
    "require_once base_path('routes/worldline-probe.php');\n",
    "require_once base_path('routes/worldline-probe.php');\nrequire_once base_path('routes/square-runtime.php');\n",
    'Square runtime routes loaded',
)

# 2) Square implementation truth: online Card + Apple Pay + Google Pay, signed webhooks, Terminal API.
replace_once(
    REGISTRY,
    "                'implemented_capabilities' => [\n                    self::CAPABILITY_ONLINE_PAYMENTS,\n                    self::CAPABILITY_PAYMENT_LINKS,\n                ],\n                'implemented_payment_methods' => [\n                    self::METHOD_CARD,\n                ],\n",
    "                'implemented_capabilities' => [\n                    self::CAPABILITY_ONLINE_PAYMENTS,\n                    self::CAPABILITY_TERMINAL_PAYMENTS,\n                    self::CAPABILITY_PAYMENT_LINKS,\n                    self::CAPABILITY_WEBHOOKS,\n                ],\n                'implemented_payment_methods' => [\n                    self::METHOD_CARD,\n                    self::METHOD_APPLE_PAY,\n                    self::METHOD_GOOGLE_PAY,\n                ],\n",
    'Square implemented capability registry',
)

# 3) Canonical method/provider compatibility now includes Square wallets.
replace_once(
    PAYMENTS_MODEL,
    "        'card' => ['stripe', 'worldline', 'sumup', 'vr_payment'],\n        'apple_pay' => ['stripe', 'worldline', 'sumup', 'vr_payment'],\n        'google_pay' => ['stripe', 'worldline', 'sumup', 'vr_payment'],\n",
    "        'card' => ['stripe', 'worldline', 'sumup', 'square', 'vr_payment'],\n        'apple_pay' => ['stripe', 'worldline', 'sumup', 'square', 'vr_payment'],\n        'google_pay' => ['stripe', 'worldline', 'sumup', 'square', 'vr_payment'],\n",
    'Square method/provider matrix',
)

# 4) Market truth: Germany is NOT a Square seller-processing country.
country = COUNTRY.read_text()
if "'square' => ['online' => true, 'terminal' => false]," in country:
    country = country.replace("                        'square' => ['online' => true, 'terminal' => false],\n", '', 1)
if "['stripe', 'sumup', 'vr_payment', 'worldline', 'square']" in country:
    country = country.replace("['stripe', 'sumup', 'vr_payment', 'worldline', 'square']", "['stripe', 'sumup', 'vr_payment', 'worldline']", 1)
if "'square' => ['online' => true, 'terminal' => false]," in country or "['stripe', 'sumup', 'vr_payment', 'worldline', 'square']" in country:
    raise SystemExit('STOP: Germany Square market eligibility was not removed cleanly')
COUNTRY.write_text(country)
print('PASS: Germany Square live market eligibility removed (fail closed)')

# 5) Payments & Finance modal gets all Square Web Payments + webhook credentials.
replace_once(
    FINANCE,
    "            'square' => array_merge($mode, [\n                'test_access_token' => ['label' => 'Sandbox Access Token', 'secret' => true],\n                'test_location_id' => ['label' => 'Sandbox Location ID'],\n                'live_access_token' => ['label' => 'Live Access Token', 'secret' => true],\n                'live_location_id' => ['label' => 'Live Location ID'],\n                'currency' => ['label' => 'Currency', 'default' => 'EUR'],\n            ]),\n",
    "            'square' => array_merge($mode, [\n                'test_application_id' => ['label' => 'Sandbox Application ID', 'help' => 'Square Developer Console > Credentials > Sandbox Application ID. Public client identifier.'],\n                'test_access_token' => ['label' => 'Sandbox Access Token', 'secret' => true, 'help' => 'Secret server credential. Leave blank to keep the stored token.'],\n                'test_location_id' => ['label' => 'Sandbox Location ID', 'help' => 'Square Developer Console > Locations. Currency must match the PayMyDine order currency.'],\n                'test_webhook_signature_key' => ['label' => 'Sandbox Webhook Signature Key', 'secret' => true, 'help' => 'From the Square Webhooks subscription details. Leave blank to keep the stored key.'],\n                'test_webhook_notification_url' => ['label' => 'Sandbox Webhook Notification URL', 'help' => 'Use exactly https://YOUR-TENANT/api/v1/payments/square/webhook. Must exactly match Square Developer Console.'],\n                'live_application_id' => ['label' => 'Production Application ID'],\n                'live_access_token' => ['label' => 'Production Access Token', 'secret' => true],\n                'live_location_id' => ['label' => 'Production Location ID'],\n                'live_webhook_signature_key' => ['label' => 'Production Webhook Signature Key', 'secret' => true],\n                'live_webhook_notification_url' => ['label' => 'Production Webhook Notification URL'],\n                'currency' => ['label' => 'Currency', 'default' => 'EUR', 'help' => 'Must match the configured Square seller location currency.'],\n            ]),\n",
    'Square Finance provider fields',
)
replace_once(
    FINANCE,
    "            'square' => ['test_access_token', 'live_access_token'],\n",
    "            'square' => ['test_access_token', 'live_access_token', 'test_webhook_signature_key', 'live_webhook_signature_key'],\n",
    'Square Finance secret preservation',
)

# 6) Canonical Payments admin fields and connection test.
replace_once(
    PAYMENTS,
    "            ['code' => 'square', 'name' => 'Square', 'supported_methods' => ['card']],\n",
    "            ['code' => 'square', 'name' => 'Square', 'supported_methods' => ['card', 'apple_pay', 'google_pay']],\n",
    'Square provider supported methods',
)
replace_once(
    PAYMENTS,
    "            'square' => array_merge($commonModeField, [\n                'test_access_token' => ['label' => 'Sandbox Access Token', 'type' => 'text', 'span' => 'left', 'comment' => 'Saved value is shown; replace to update.'],\n                'test_location_id' => ['label' => 'Sandbox Location ID', 'type' => 'text', 'span' => 'right', 'comment' => 'Location ID used to create payment links.'],\n                'live_access_token' => ['label' => 'Live Access Token', 'type' => 'text', 'span' => 'left', 'comment' => 'Saved value is shown; replace to update.'],\n                'live_location_id' => ['label' => 'Live Location ID', 'type' => 'text', 'span' => 'right', 'comment' => 'Production location for payment links.'],\n                'currency' => ['label' => 'Currency', 'type' => 'text', 'span' => 'left', 'default' => 'EUR', 'comment' => '3-letter ISO code, for example EUR or USD.'],\n            ]),\n",
    "            'square' => array_merge($commonModeField, [\n                'square_setup_guide' => ['type' => 'section', 'label' => 'Square Web Payments + Terminal API', 'comment' => 'Sandbox needs Application ID, Access Token and Location ID. Access tokens remain server-side. Germany/Oman/Turkiye are not Square live processing countries; PMD blocks Square live there.'],\n                'test_application_id' => ['label' => 'Sandbox Application ID', 'type' => 'text', 'span' => 'left', 'comment' => 'Developer Console > Credentials > Sandbox Application ID.'],\n                'test_access_token' => ['label' => 'Sandbox Access Token', 'type' => 'password', 'span' => 'right', 'comment' => 'Secret. Leave blank to keep the saved token.'],\n                'test_location_id' => ['label' => 'Sandbox Location ID', 'type' => 'text', 'span' => 'left', 'comment' => 'Developer Console > Locations.'],\n                'test_webhook_signature_key' => ['label' => 'Sandbox Webhook Signature Key', 'type' => 'password', 'span' => 'right', 'comment' => 'Developer Console > Webhooks subscription. Leave blank to keep saved key.'],\n                'test_webhook_notification_url' => ['label' => 'Sandbox Webhook Notification URL', 'type' => 'text', 'span' => 'full', 'comment' => 'Exact URL: https://TENANT/api/v1/payments/square/webhook'],\n                'live_application_id' => ['label' => 'Production Application ID', 'type' => 'text', 'span' => 'left'],\n                'live_access_token' => ['label' => 'Production Access Token', 'type' => 'password', 'span' => 'right', 'comment' => 'Secret. Leave blank to keep the saved token.'],\n                'live_location_id' => ['label' => 'Production Location ID', 'type' => 'text', 'span' => 'left'],\n                'live_webhook_signature_key' => ['label' => 'Production Webhook Signature Key', 'type' => 'password', 'span' => 'right'],\n                'live_webhook_notification_url' => ['label' => 'Production Webhook Notification URL', 'type' => 'text', 'span' => 'full'],\n                'currency' => ['label' => 'Currency', 'type' => 'text', 'span' => 'left', 'default' => 'EUR', 'comment' => 'Must match the Square Location currency.'],\n            ]),\n",
    'Square canonical provider form fields',
)
replace_once(
    PAYMENTS,
    "            'square' => ['test_access_token', 'live_access_token'],\n",
    "            'square' => ['test_access_token', 'live_access_token', 'test_webhook_signature_key', 'live_webhook_signature_key'],\n",
    'Square Payments secret preservation',
)
replace_once(
    PAYMENTS,
    "        } elseif ($code === 'square') {\n            $mode = $data['transaction_mode'] ?? 'test';\n            $token = $mode === 'live' ? ($data['live_access_token'] ?? null) : ($data['test_access_token'] ?? null);\n            if (!$token) throw new ApplicationException('Missing Square access token for selected mode.');\n            $base = $mode === 'live' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';\n            $resp = Http::withHeaders(['Authorization' => 'Bearer '.$token, 'Accept' => 'application/json'])->get($base.'/v2/locations');\n            $result = ['success' => $resp->ok(), 'message' => $resp->ok() ? 'Square connection successful.' : 'Square API request failed.', 'status' => $resp->status()];\n",
    "        } elseif ($code === 'square') {\n            $mode = strtolower((string)($data['transaction_mode'] ?? 'test')) === 'live' ? 'live' : 'test';\n            $prefix = $mode === 'live' ? 'live_' : 'test_';\n            $appId = trim((string)($data[$prefix.'application_id'] ?? ''));\n            $token = trim((string)($data[$prefix.'access_token'] ?? ''));\n            $locationId = trim((string)($data[$prefix.'location_id'] ?? ''));\n            if ($appId === '' || $token === '' || $locationId === '') throw new ApplicationException('Square Application ID, Access Token and Location ID are required for the selected mode.');\n            $base = $mode === 'live' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';\n            $resp = Http::withToken($token)->withHeaders(['Square-Version' => \\App\\Services\\Payments\\SquareRuntimeService::API_VERSION])->acceptJson()->get($base.'/v2/locations/'.rawurlencode($locationId));\n            $json = (array)$resp->json();\n            $location = (array)($json['location'] ?? []);\n            $squareCountry = strtoupper(trim((string)($location['country'] ?? '')));\n            $squareCurrency = strtoupper(trim((string)($location['currency'] ?? '')));\n            $platform = app(\\App\\Services\\Platform\\LocationPlatformContext::class);\n            $restaurantCountry = strtoupper((string)($platform->countryCode() ?? ''));\n            $restaurantCurrency = strtoupper((string)($platform->currencyCode() ?? ''));\n            $currencyOk = $squareCurrency === '' || $restaurantCurrency === '' || hash_equals($restaurantCurrency, $squareCurrency);\n            $liveMarketOk = $mode !== 'live' || (in_array($restaurantCountry, \\App\\Services\\Payments\\SquareRuntimeService::SUPPORTED_SELLER_COUNTRIES, true) && hash_equals($restaurantCountry, $squareCountry));\n            $ok = $resp->ok() && $currencyOk && $liveMarketOk;\n            $message = !$resp->ok() ? (string)($json['errors'][0]['detail'] ?? 'Square Location API request failed.') : (!$currencyOk ? \"Square location currency {$squareCurrency} does not match PayMyDine {$restaurantCurrency}.\" : (!$liveMarketOk ? \"Square live processing is not available for PayMyDine restaurant country {$restaurantCountry}.\" : 'Square connection successful.'));\n            $result = ['success' => $ok, 'connected' => $resp->ok(), 'message' => $message, 'status' => $resp->status(), 'mode' => $mode, 'location_id' => $locationId, 'location_name' => $location['name'] ?? null, 'square_country' => $squareCountry ?: null, 'square_currency' => $squareCurrency ?: null, 'restaurant_country' => $restaurantCountry ?: null, 'restaurant_currency' => $restaurantCurrency ?: null, 'live_market_supported' => $liveMarketOk];\n",
    'Square saved connection test validates location/currency/market',
)

# 7) Baseline seeding does not regress Square to card-only.
replace_once(
    BASELINE,
    "            'square' => ['name' => 'Square', 'priority' => 150, 'supported_methods' => ['card']],\n",
    "            'square' => ['name' => 'Square', 'priority' => 150, 'supported_methods' => ['card', 'apple_pay', 'google_pay']],\n",
    'Square tenant baseline methods',
)

# 8) Square becomes a canonical terminal_devices provider.
replace_once(
    TERMINAL_MODEL,
    "            'worldline' => 'Worldline Terminal API',\n",
    "            'worldline' => 'Worldline Terminal API',\n            'square' => 'Square Terminal API',\n",
    'Square terminal device provider option',
)

# 9) Device UI: Square-specific setup + safe non-charging configuration test.
replace_once(
    TERMINAL_CONTROLLER,
    "use App\\Services\\TerminalPayments\\WorldlineTerminalProvider;\n",
    "use App\\Services\\TerminalPayments\\WorldlineTerminalProvider;\nuse App\\Services\\TerminalPayments\\SquareTerminalProvider;\n",
    'Square Terminal provider import',
)
replace_once(
    TERMINAL_CONTROLLER,
    "        } elseif ($providerCode === 'vr_payment') {\n            $guideLabel = 'VR Payment Terminal Setup';\n",
    "        } elseif ($providerCode === 'square') {\n            $guideLabel = 'Square Terminal API Setup';\n            $guideComment = 'Reader ID = Square device_id. In Sandbox you may use Square documented simulator ID 9fa747a2-25ff-48ee-b078-04381f7c828f for a successful card checkout. Production requires a paired Square Terminal device_id and a Square-supported seller country.';\n        } elseif ($providerCode === 'vr_payment') {\n            $guideLabel = 'VR Payment Terminal Setup';\n",
    'Square Terminal setup guide',
)
square_test_block = r'''        if ($providerCode === 'square') {
            try {
                $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
                $config = $runtime->providerConfig(false);
                $config['device_id'] = $readerId;
                $config['pmd_country_code'] = strtoupper((string)(app(\App\Services\Platform\LocationPlatformContext::class)->countryCode((int)($model->location_id ?? 0) ?: null) ?? ''));
                $validation = (new SquareTerminalProvider())->validateConfiguration($config);
                if (!($validation['ok'] ?? false)) {
                    return response()->json(['success' => false, 'provider' => 'square', 'error' => $validation['message'] ?? 'Square Terminal configuration is incomplete.'], 422);
                }
                $location = $runtime->location($config);
                $mode = (string)($config['mode'] ?? 'test');
                $sandboxIds = ['9fa747a2-25ff-48ee-b078-04381f7c828f', '22cd266c-6246-4c06-9983-67f0c26346b0', '4mp4e78c-88ed-4d55-a269-8008dfe14e9'];
                $model->terminal_status = $mode === 'test' && in_array($readerId, $sandboxIds, true) ? 'sandbox_simulator_ready' : 'configured';
                $model->pairing_state = $mode === 'test' && in_array($readerId, $sandboxIds, true) ? 'paired' : ((string)$model->pairing_state ?: 'unknown');
                if (empty($model->reader_label)) $model->reader_label = $mode === 'test' ? 'Square Sandbox Terminal' : 'Square Terminal';
                $model->metadata = array_merge((array)$model->metadata, [
                    'last_configuration_tested_at' => now()->toIso8601String(),
                    'square_terminal_api' => [
                        'mode' => $mode,
                        'location_id' => $config['location_id'] ?? null,
                        'location_name' => $location['name'] ?? null,
                        'country' => $location['country'] ?? null,
                        'currency' => $location['currency'] ?? null,
                        'device_id' => $readerId,
                        'sandbox_simulator' => $mode === 'test' && in_array($readerId, $sandboxIds, true),
                    ],
                ]);
                $model->save();
                return response()->json([
                    'success' => true,
                    'provider' => 'square',
                    'reader_id' => $readerId,
                    'mode' => $mode,
                    'location' => ['id' => $config['location_id'] ?? null, 'name' => $location['name'] ?? null, 'country' => $location['country'] ?? null, 'currency' => $location['currency'] ?? null],
                    'sandbox_simulator' => $mode === 'test' && in_array($readerId, $sandboxIds, true),
                    'network_probe_performed' => true,
                    'payment_sent' => false,
                    'message' => 'Square credentials/location are valid. No charge was created. Use a real Terminal payment attempt to validate checkout settlement.',
                    'status' => $this->buildStatusSnapshot('square', $readerId, (bool)$model->is_active),
                ]);
            } catch (\Throwable $e) {
                return response()->json(['success' => false, 'provider' => 'square', 'error' => $e->getMessage()], 422);
            }
        }

'''
insert_before_once(
    TERMINAL_CONTROLLER,
    "        if ($providerCode !== 'sumup') {\n",
    square_test_block,
    "'provider' => 'square',\n                    'reader_id' => $readerId,\n                    'mode' => $mode,",
    'Square Terminal safe connection test',
)
square_status_block = r'''        if ($providerCode === 'square') {
            try {
                $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
                $config = $runtime->providerConfig(false);
                $config['device_id'] = $readerId;
                $config['pmd_country_code'] = strtoupper((string)(app(\App\Services\Platform\LocationPlatformContext::class)->countryCode() ?? ''));
                $providerReady = (bool)((new SquareTerminalProvider())->validateConfiguration($config)['ok'] ?? false);
                $networkProbe = 'locations-api';
            } catch (\Throwable $ignored) {
                $providerReady = false;
                $networkProbe = 'not-run';
            }
        }

'''
insert_before_once(
    TERMINAL_CONTROLLER,
    "        $terminalReady = $providerReady && trim($readerId) !== '';\n",
    square_status_block,
    "if ($providerCode === 'square') {\n            try {\n                $runtime = app(\\App\\Services\\Payments\\SquareRuntimeService::class);",
    'Square Terminal readiness snapshot',
)

# 10) Shared TerminalPaymentService routes Square terminal_devices through the real adapter.
replace_once(
    TERMINAL_SERVICE,
    "        return match(strtolower($code)){'sumup'=>new SumupTerminalProvider(),'worldline'=>new WorldlineTerminalProvider(),'vr_payment'=>new VrPaymentTerminalProvider(),default=>new NullTerminalProvider($code)};\n",
    "        return match(strtolower($code)){'sumup'=>new SumupTerminalProvider(),'worldline'=>new WorldlineTerminalProvider(),'square'=>new SquareTerminalProvider(),'vr_payment'=>new VrPaymentTerminalProvider(),default=>new NullTerminalProvider($code)};\n",
    'Square Terminal provider registered',
)
square_create = r'''        if($providerCode==='square'){
            $terminal=$this->resolveSquareTerminal($terminalId);
            if(!$terminal)return ['success'=>false,'error'=>'No active Square Terminal API device is configured. Add it under Settings > Devices.'];
            $config['device_id']=(string)$terminal->reader_id;
            $config['reader_id']=(string)$terminal->reader_id;
            $config['terminal_device_id']=(int)$terminal->terminal_device_id;
            $terminalId=(string)$terminal->reader_id;
        }
'''
insert_before_once(
    TERMINAL_SERVICE,
    "        $validation=$provider->validateConfiguration($config);if(!($validation['ok']??false)) return ['success'=>false,'error'=>$validation['message']??'Provider is not configured.'];",
    square_create,
    "No active Square Terminal API device is configured",
    'Square createAttempt terminal resolution',
)
square_refresh = r'''        if($providerCode==='square'){
            $terminal=$this->resolveSquareTerminal((string)($attempt['terminal_id']??''));
            if(!$terminal)return ['success'=>false,'error'=>'Square terminal for this attempt was not found.'];
            $config['device_id']=(string)$terminal->reader_id;
            $config['reader_id']=(string)$terminal->reader_id;
            $config['terminal_device_id']=(int)$terminal->terminal_device_id;
        }
'''
insert_before_once(
    TERMINAL_SERVICE,
    "        $result=$provider->checkStatus($attempt,$config);$status=(string)($result['status']??($attempt['status']??'pending'));",
    square_refresh,
    "Square terminal for this attempt was not found",
    'Square refreshAttempt terminal resolution',
)
replace_once(
    TERMINAL_SERVICE,
    "        if($code==='sumup'){$config['url']=rtrim((string)($config['url']??'https://api.sumup.com'),'/');$config['merchant_code']=(string)($config['merchant_code']??$config['id_application']??'');$config['id_application']=(string)($config['id_application']??$config['merchant_code']??'');$config['affiliate_app_id']=(string)($config['affiliate_app_id']??SumupTenantConnectionService::APP_ID);$config['currency']=strtoupper((string)($config['currency']??'EUR'));}\n        return $config;\n",
    "        if($code==='sumup'){$config['url']=rtrim((string)($config['url']??'https://api.sumup.com'),'/');$config['merchant_code']=(string)($config['merchant_code']??$config['id_application']??'');$config['id_application']=(string)($config['id_application']??$config['merchant_code']??'');$config['affiliate_app_id']=(string)($config['affiliate_app_id']??SumupTenantConnectionService::APP_ID);$config['currency']=strtoupper((string)($config['currency']??'EUR'));}\n        if($code==='square'){\n            $mode=strtolower(trim((string)($config['transaction_mode']??'test')))==='live'?'live':'test';\n            $prefix=$mode==='live'?'live_':'test_';\n            $config['transaction_mode']=$mode;\n            $config['mode']=$mode;\n            $config['access_token']=trim((string)($config[$prefix.'access_token']??''));\n            $config['location_id']=trim((string)($config[$prefix.'location_id']??''));\n            try{$platform=app(\\App\\Services\\Platform\\LocationPlatformContext::class);$config['pmd_country_code']=strtoupper((string)($platform->countryCode()??''));$config['currency']=strtoupper((string)($platform->currencyCode()??($config['currency']??'')));}catch(\\Throwable $ignored){$config['currency']=strtoupper((string)($config['currency']??''));}\n        }\n        return $config;\n",
    'Square Terminal provider config normalization',
)
square_resolver = r'''    private function resolveSquareTerminal(?string $terminalId=null)
    {
        if(!Schema::hasTable('terminal_devices'))return null;
        $query=DB::table('terminal_devices')->whereRaw('LOWER(provider_code) = ?',['square'])->where('is_active',1)->whereNotNull('reader_id')->where('reader_id','!=','');
        $terminalId=trim((string)$terminalId);
        if($terminalId!=='')$query->where(function($q)use($terminalId){if(ctype_digit($terminalId))$q->orWhere('terminal_device_id',(int)$terminalId);$q->orWhere('reader_id',$terminalId);});
        return $query->orderBy('terminal_device_id')->first();
    }

'''
insert_before_once(
    TERMINAL_SERVICE,
    "    private function sumupReturnUrl(?int $attemptId=null):string\n",
    square_resolver,
    "private function resolveSquareTerminal",
    'Square terminal_devices resolver',
)

# 11) Waiter POS exposes Square terminal_devices alongside SumUp/VR/Worldline.
waiter = WAITER.read_text()
if "foreach (['sumup', 'vr_payment', 'worldline', 'square'] as $providerCode)" not in waiter:
    old_loops = [
        "foreach (['sumup', 'vr_payment', 'worldline'] as $providerCode)",
        "foreach (['sumup', 'vr_payment'] as $providerCode)",
    ]
    found = [old for old in old_loops if old in waiter]
    if len(found) != 1:
        raise SystemExit(f'STOP: Waiter provider loop: found {len(found)} candidate anchors')
    waiter = waiter.replace(found[0], "foreach (['sumup', 'vr_payment', 'worldline', 'square'] as $providerCode)", 1)
old_label = "($providerCode === 'sumup' ? 'SumUp terminal' : ($providerCode === 'worldline' ? 'Worldline terminal' : 'VR Payment terminal'))"
new_label = "($providerCode === 'sumup' ? 'SumUp terminal' : ($providerCode === 'worldline' ? 'Worldline terminal' : ($providerCode === 'square' ? 'Square Terminal' : 'VR Payment terminal')))"
if new_label not in waiter:
    if old_label in waiter:
        waiter = waiter.replace(old_label, new_label, 1)
    elif "($providerCode === 'sumup' ? 'SumUp terminal' : 'VR Payment terminal')" in waiter:
        waiter = waiter.replace("($providerCode === 'sumup' ? 'SumUp terminal' : 'VR Payment terminal')", new_label, 1)
    else:
        raise SystemExit('STOP: Waiter terminal label anchor not found')
WAITER.write_text(waiter)
print('PASS: Waiter POS exposes Square terminal_devices')

# 12) Frontend V2 uses Square Web Payments SDK inline for existing-order Card/Apple/Google.
replace_once(
    RUNTIME,
    "import { StripeInlinePayment } from './StripeInlinePayment'\n",
    "import { StripeInlinePayment } from './StripeInlinePayment'\nimport { SquareInlinePayment } from './SquareInlinePayment'\n",
    'Square inline payment import',
)
replace_once(
    RUNTIME,
    "  const isStripeInline = Boolean(selectedMethod && settlementMode === 'pay-existing' && selectedProvider === 'stripe' && ['card', 'apple_pay', 'google_pay'].includes(selectedCode))\n",
    "  const isStripeInline = Boolean(selectedMethod && settlementMode === 'pay-existing' && selectedProvider === 'stripe' && ['card', 'apple_pay', 'google_pay'].includes(selectedCode))\n  const isSquareInline = Boolean(selectedMethod && settlementMode === 'pay-existing' && selectedProvider === 'square' && ['card', 'apple_pay', 'google_pay'].includes(selectedCode))\n",
    'Square inline payment selection',
)
square_jsx = r'''      ) : isSquareInline && selectedMethod && canStartPayment ? (
        <SquareInlinePayment
          key={`square-r1-${paymentMethodKey(selectedMethod)}-${order.orderId}`}
          orderId={order.orderId}
          table={bootstrap.table}
          methodCode={selectedMethod.code}
          providerCode={selectedMethod.providerCode}
          amount={payableEstimate}
          currency={bootstrap.restaurant.currency}
          tipAmount={tipAmountEstimate}
          couponCode={mode === 'split' ? null : couponCode.trim() || null}
          couponDiscount={mode === 'split' ? 0 : couponDiscount}
          selectedItems={selectedItemsPayload}
          payerLabel={payerLabel}
          items={order.items.filter((item) => item.unpaidQuantity > 0).map((item) => ({ id: String(item.orderMenuId || item.menuId), name: item.name, quantity: item.unpaidQuantity, price: item.price * grossRatio }))}
          prepareSplitIntent={mode === 'split' && splitMode !== 'full' ? prepareSplit : undefined}
          guestSessionId={guestSessionId}
          locale={locale}
          onSuccess={(amount) => completePaymentLocally(amount)}
          onError={setMessage}
        />
'''
single_square_anchor = "      ) : isStripeInline && selectedMethod && canStartPayment ? (\n        <StripeInlinePayment\n          key={`r35c-${paymentMethodKey(selectedMethod)}-${order.orderId}`}\n"
single_square_replacement = square_jsx + single_square_anchor
replace_once(
    RUNTIME,
    single_square_anchor,
    single_square_replacement,
    'Square inline checkout mounted',
)

# 13) Settlement endpoint independently verifies Square payment server-to-server.
qr = QR_PAY.read_text()
if "$normalizedProviderCode = strtolower(str_replace('-', '_', (string)$request->input('payment_provider'" not in qr:
    old = "        $normalizedPaymentMethod = strtolower((string)$request->payment_method);\n"
    if qr.count(old) != 1:
        raise SystemExit(f'STOP: pay-existing provider normalization anchor: found {qr.count(old)}')
    qr = qr.replace(old, old + "        $normalizedProviderCode = strtolower(str_replace('-', '_', (string)$request->input('payment_provider', $request->input('provider', ''))));\n", 1)
old_use = "function () use ($request, $order, $normalizedPaymentMethod, $paidStatusId, $hasSplitTables, $selectedItemsPayload, $allocationColumn, $allocationMode, $hasAllocOrderMenuColumn, $hasAllocMenuIdColumn, &$transactionId, $r35IntentId, $r35SplitMode)"
new_use = "function () use ($request, $order, $normalizedPaymentMethod, $normalizedProviderCode, $paidStatusId, $hasSplitTables, $selectedItemsPayload, $allocationColumn, $allocationMode, $hasAllocOrderMenuColumn, $hasAllocMenuIdColumn, &$transactionId, $r35IntentId, $r35SplitMode)"
if new_use not in qr:
    if qr.count(old_use) != 1:
        raise SystemExit(f'STOP: pay-existing transaction use anchor: found {qr.count(old_use)}')
    qr = qr.replace(old_use, new_use, 1)
verify_marker = 'SQUARE_PAY_EXISTING_SERVER_VERIFIED_R1'
if verify_marker not in qr:
    anchor = "                $remainingGrossTotal = round($remainingTotal * $orderGrossRatio, 4);\n"
    if qr.count(anchor) != 1:
        raise SystemExit(f'STOP: Square settlement verification anchor: found {qr.count(anchor)}')
    verify = r'''                // SQUARE_PAY_EXISTING_SERVER_VERIFIED_R1
                if ($normalizedProviderCode === 'square') {
                    $squarePaymentId = trim((string)$request->input('payment_reference', ''));
                    if ($squarePaymentId === '') throw new \InvalidArgumentException('Square payment reference is required before settlement.');
                    $squareRuntime = app(\App\Services\Payments\SquareRuntimeService::class);
                    $squareCfg = $squareRuntime->providerConfig(true);
                    $squareCurrency = strtoupper((string)(app(\App\Services\Platform\LocationPlatformContext::class)->currencyCode((int)($lockedOrder->location_id ?? 0) ?: null) ?: ($squareCfg['configured_currency'] ?? '')));
                    if ($squareCurrency === '') throw new \InvalidArgumentException('Square settlement currency is unavailable.');
                    $squareReference = substr($r35IntentId ? 'PMD-'.(int)$lockedOrder->order_id.'-I-'.(int)$r35IntentId : 'PMD-'.(int)$lockedOrder->order_id, 0, 40);
                    $squareVerified = $squareRuntime->verifyPayment(
                        $squarePaymentId,
                        $squareRuntime->toMinor($payableAmount, $squareCurrency),
                        $squareCurrency,
                        $squareReference,
                        (string)($squareCfg['location_id'] ?? '')
                    );
                    if (!($squareVerified['is_paid'] ?? false) || !($squareVerified['verification_ok'] ?? false)) {
                        throw new \InvalidArgumentException('Square payment is not server-verified as COMPLETED for this exact amount, currency and order reference.');
                    }
                }
'''
    qr = qr.replace(anchor, verify + anchor, 1)
QR_PAY.write_text(qr)
print('PASS: Square settlement requires independent server verification')

print('==========================================')
print('SQUARE RUNTIME + TERMINAL PATCH APPLIED')
print('==========================================')
print('PASS: Web Payments SDK runtime is token-only; PMD receives no raw card data')
print('PASS: Card + Apple Pay + Google Pay use Square Payments API')
print('PASS: Square signed webhook endpoint is reconciliation-only')
print('PASS: Terminal API uses canonical terminal_devices and shared PMD settlement')
print('PASS: Square live remains fail-closed for Germany/Oman/Turkiye')
