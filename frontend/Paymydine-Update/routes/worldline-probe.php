<?php

use Admin\Controllers\QrRedirectController;
use Admin\Controllers\SuperAdminController;
use Admin\Controllers\StaffAuthController;
use Admin\Controllers\Biometricdevices;
use Admin\Controllers\BiometricDevicesAPI;
use Admin\Controllers\Api\CashDrawerController;
use Admin\Controllers\Api\PosAgentController;
use App\Admin\Controllers\NotificationsApiController;
use App\Admin\Classes\TerminalDevicesPlatformController;
use Admin\Facades\AdminAuth;
use Illuminate\Http\Request;
require_once base_path('app/system/helpers/r2o_outbound_dryrun_helper.php');
use Illuminate\Support\Facades\DB;


/* PMD_WORLDLINE_PHASE1_ROUTES */
\Route::get('/payments/worldline/debug-config', function () {
    try {
        $svc = new \Admin\Classes\WorldlineHostedCheckoutService();
        $cfg = $svc->getConfig();

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'environment' => $svc->getEnvironment($cfg),
            'config_id' => $cfg['config_id'],
            'merchant_id_present' => !empty($cfg['merchant_id']),
            'api_key_id_present' => !empty($cfg['api_key_id']),
            'secret_api_key_present' => !empty($cfg['secret_api_key']),
            'webhook_secret_present' => !empty($cfg['webhook_secret']),
            'api_endpoint' => $cfg['api_endpoint'],
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE DEBUG CONFIG ERROR', [
            'message' => $e->getMessage(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});

\Route::post('/payments/worldline/create-hosted-checkout', function (\Illuminate\Http\Request $request) {
    try {
        $svc = new \Admin\Classes\WorldlineHostedCheckoutService();

        $payload = [
            'amount_minor' => (int) $request->input('amount_minor', 0),
            'currency' => (string) $request->input('currency', 'EUR'),
            'return_url' => (string) $request->input('return_url', url('/order-placed')),
            'locale' => (string) $request->input('locale', 'en_GB'),
        ];

        \Log::info('WORLDLINE CREATE HOSTED CHECKOUT HIT', [
            'payload' => $payload,
            'host' => request()->getHost(),
        ]);

        $result = $svc->createHostedCheckout($payload);

        \Log::info('WORLDLINE CREATE HOSTED CHECKOUT OK', $result);

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'redirect_url' => $result['redirect_url'],
            'hosted_checkout_id' => $result['hosted_checkout_id'],
            'environment' => $result['environment'],
            'meta' => $result['request_meta'],
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE CREATE HOSTED CHECKOUT ERROR', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});

\Route::post('/worldline/webhook', function (\Illuminate\Http\Request $request) {
    try {
        \Log::info('WORLDLINE WEBHOOK HIT', [
            'host' => request()->getHost(),
            'headers' => $request->headers->all(),
            'payload' => $request->all(),
            'raw' => $request->getContent(),
        ]);

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'message' => 'Webhook received and logged. Signature verification comes in phase 2.',
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE WEBHOOK ERROR', [
            'message' => $e->getMessage(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});


Route::post('/payments/worldline/raw-card-probe', function (\Illuminate\Http\Request $request) {
    try {
        \Log::info('PMD RAW CARD PROBE HIT', [
            'path' => $request->path(),
            'host' => $request->getHost(),
            'payload' => $request->except(['cardNumber', 'cvv']),
        ]);

        $host = $request->getHost();
        $tenant = null;

        try {
            if (function_exists('db_get_active_connection')) {
                $tenant = db_get_active_connection();
            }
        } catch (\Throwable $ignored) {}

        $config = \DB::table('payment_provider_configs')
            ->where('provider', 'worldline')
            ->where('status', 1)
            ->orderByDesc('id')
            ->first();

        if (!$config) {
            return response()->json([
                'ok' => false,
                'error' => 'No active Worldline config found'
            ], 500);
        }

        $merchantId = $config->merchant_id ?? $config->merchantId ?? null;
        $apiKeyId = $config->api_key_id ?? $config->apiKeyId ?? null;
        $secretApiKey = $config->secret_api_key ?? $config->secretApiKey ?? null;
        $integrator = $config->integrator ?? 'PayMyDine Raw Probe';
        $apiEndpoint = $config->api_endpoint ?? $config->apiEndpoint ?? null;

        if (!$merchantId || !$apiKeyId || !$secretApiKey || !$apiEndpoint) {
            \Log::error('PMD RAW CARD PROBE CONFIG INCOMPLETE', [
                'merchantId' => $merchantId,
                'apiKeyId' => $apiKeyId ? 'present' : null,
                'secretApiKey' => $secretApiKey ? 'present' : null,
                'apiEndpoint' => $apiEndpoint,
            ]);

            return response()->json([
                'ok' => false,
                'error' => 'Worldline config incomplete'
            ], 500);
        }

        $communicatorConfiguration = new \Worldline\Connect\Sdk\CommunicatorConfiguration(
            $apiKeyId,
            $secretApiKey,
            $apiEndpoint,
            $integrator
        );

        $communicator = new \Worldline\Connect\Sdk\DefaultImpl\Communicator(
            new \Worldline\Connect\Sdk\DefaultImpl\CurlConnection(),
            $communicatorConfiguration
        );

        $client = new \Worldline\Connect\Sdk\Client($communicator);
        $merchantClient = $client->v1()->merchant($merchantId);

        $amount = (int) round(((float) ($request->input('amount', 12))) * 100);
        $currency = (string) ($request->input('currency', 'EUR'));
        $email = (string) ($request->input('email', 'rawprobe@example.com'));
        $country = (string) ($request->input('countryCode', 'AT'));

        $cardNumber = preg_replace('/\D+/', '', (string) $request->input('cardNumber', '4012000033330026'));
        $expiryDate = preg_replace('/\D+/', '', (string) $request->input('expiryDate', '1229'));
        $cvv = preg_replace('/\D+/', '', (string) $request->input('cvv', '123'));
        $cardholderName = (string) ($request->input('cardholderName', 'Amir Test'));

        $body = new \Worldline\Connect\Sdk\V1\Domain\CreatePaymentRequest();

        $body->order = new \Worldline\Connect\Sdk\V1\Domain\Order();
        $body->order->amountOfMoney = new \Worldline\Connect\Sdk\V1\Domain\AmountOfMoney();
        $body->order->amountOfMoney->amount = $amount;
        $body->order->amountOfMoney->currencyCode = $currency;

        $body->order->customer = new \Worldline\Connect\Sdk\V1\Domain\Customer();
        $body->order->customer->merchantCustomerId = 'PMD' . substr(md5((string) microtime(true)), 0, 12);
        $body->order->customer->locale = 'de_AT';

        $body->order->customer->billingAddress = new \Worldline\Connect\Sdk\V1\Domain\Address();
        $body->order->customer->billingAddress->countryCode = $country;

        $body->order->customer->contactDetails = new \Worldline\Connect\Sdk\V1\Domain\ContactDetails();
        $body->order->customer->contactDetails->emailAddress = $email;

        $body->cardPaymentMethodSpecificInput = new \Worldline\Connect\Sdk\V1\Domain\CardPaymentMethodSpecificInput();
        $body->cardPaymentMethodSpecificInput->paymentProductId = 1;
        $body->cardPaymentMethodSpecificInput->transactionChannel = 'ECOMMERCE';
        $body->cardPaymentMethodSpecificInput->authorizationMode = 'SALE';

        $body->cardPaymentMethodSpecificInput->card = new \Worldline\Connect\Sdk\V1\Domain\Card();
        $body->cardPaymentMethodSpecificInput->card->cardNumber = $cardNumber;
        $body->cardPaymentMethodSpecificInput->card->expiryDate = $expiryDate;
        $body->cardPaymentMethodSpecificInput->card->cvv = $cvv;
        $body->cardPaymentMethodSpecificInput->card->cardholderName = $cardholderName;

        \Log::info('PMD RAW CARD PROBE REQUEST', [
            'host' => $host,
            'tenant_database' => $tenant,
            'merchantId' => $merchantId,
            'apiEndpoint' => $apiEndpoint,
            'request' => json_decode(json_encode($body), true),
        ]);

        $response = $merchantClient->payments()->create($body);

        \Log::info('PMD RAW CARD PROBE SUCCESS', [
            'response' => json_decode(json_encode($response), true),
        ]);

        return response()->json([
            'ok' => true,
            'message' => 'Raw card probe succeeded',
            'response' => json_decode(json_encode($response), true),
        ]);
    } catch (\Throwable $e) {
        $statusCode = null;
        $responseBody = null;
        $errors = null;

        try {
            if (method_exists($e, 'getStatusCode')) {
                $statusCode = $e->getStatusCode();
            }
        } catch (\Throwable $ignored) {}

        try {
            if (method_exists($e, 'getResponseBody')) {
                $responseBody = $e->getResponseBody();
            }
        } catch (\Throwable $ignored) {}

        try {
            if (method_exists($e, 'getErrors')) {
                $errors = $e->getErrors();
            }
        } catch (\Throwable $ignored) {}

        \Log::error('PMD RAW CARD PROBE ERROR', [
            'class' => get_class($e),
            'message' => $e->getMessage(),
            'statusCode' => $statusCode,
            'responseBody' => $responseBody,
            'errors' => $errors,
        ]);

        return response()->json([
            'ok' => false,
            'error' => $e->getMessage(),
            'class' => get_class($e),
            'statusCode' => $statusCode,
            'responseBody' => $responseBody,
            'errors' => $errors,
        ], 500);
    }
});


/* /PMD_WORLDLINE_PHASE1_ROUTES */
