<?php

namespace Admin\Controllers;

use App\Services\TerminalPayments\SumupTenantConnectionService;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Canonical SumUp Cloud API reader authority.
 *
 * Test means SumUp sandbox. Production means a live SumUp merchant. The
 * controller verifies that relationship before pairing, keeps the local
 * terminal_devices projection reconciled with SumUp, and returns the real
 * provider failure status instead of hiding every failure behind HTTP 422.
 */
class SumupCloudReaderController extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    private const PROVIDER = 'sumup';
    private const API_URL = 'https://api.sumup.com';

    public function sync(Request $request, SumupTenantConnectionService $stateService)
    {
        $this->assertOwnerAccess();

        try {
            $environment = $this->requestedEnvironment($request, $stateService);
            $config = $this->config($environment);

            if (!$config['ready']) {
                return response()->json([
                    'success' => true,
                    'synced' => 0,
                    'message' => 'SumUp is not connected for this environment yet.',
                    'state' => $stateService->state(),
                ]);
            }

            $guard = $this->environmentGuard($config);
            if (!$guard['ok']) {
                return response()->json([
                    'success' => false,
                    'message' => $guard['message'],
                    'provider_status' => $guard['provider_status'],
                    'state' => $stateService->state(),
                ], $guard['http_status']);
            }

            $result = $this->syncRemoteReaders($config, false);

            return response()->json([
                'success' => true,
                'synced' => $result['saved'],
                'added' => $result['added'],
                'message' => $result['added'] > 0
                    ? 'Existing SumUp terminal'.($result['added'] === 1 ? '' : 's').' synchronized.'
                    : 'SumUp terminals are synchronized.',
                'state' => $stateService->state(),
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'Could not synchronize SumUp terminals.',
                'state' => $stateService->state(),
            ], 422);
        }
    }

    public function pair(Request $request, SumupTenantConnectionService $stateService)
    {
        $this->assertOwnerAccess();

        $data = $request->validate([
            'environment' => ['required', 'in:test,production'],
            'pairing_code' => ['required', 'string', 'max:32'],
            'label' => ['nullable', 'string', 'max:191'],
        ]);

        $environment = (string)$data['environment'];
        $pairingCode = $this->normalizePairingCode((string)$data['pairing_code']);
        $label = trim((string)($data['label'] ?? '')) ?: 'SumUp terminal';

        if (!preg_match('/^[A-Z0-9]{8,9}$/', $pairingCode)) {
            return response()->json([
                'success' => false,
                'message' => 'Enter the 8 or 9 character pairing code shown on the Solo.',
                'state' => $stateService->state(),
            ], 422);
        }

        try {
            $config = $this->config($environment);
            if (!$config['ready']) {
                throw new \RuntimeException('Connect and test this SumUp environment before pairing a terminal.');
            }

            $guard = $this->environmentGuard($config);
            if (!$guard['ok']) {
                return response()->json([
                    'success' => false,
                    'message' => $guard['message'],
                    'provider_status' => $guard['provider_status'],
                    'state' => $stateService->state(),
                ], $guard['http_status']);
            }

            // A previous browser request may have reached SumUp but failed before
            // the local reader projection was saved. Reconcile first so retries
            // remain idempotent from the restaurant's point of view.
            $this->syncRemoteReaders($config, false);

            $response = $this->client($config['access_token'])
                ->asJson()
                ->timeout(25)
                ->post(
                    $config['url'].'/v0.1/merchants/'.rawurlencode($config['merchant_code']).'/readers',
                    [
                        'pairing_code' => $pairingCode,
                        'name' => $label,
                    ]
                );

            if (!$response->successful()) {
                $after = $this->syncRemoteReaders($config, false);
                if ($after['added'] > 0 && in_array($response->status(), [404, 409], true)) {
                    return response()->json([
                        'success' => true,
                        'recovered' => true,
                        'message' => 'Terminal was already paired in SumUp and has been synchronized with PayMyDine.',
                        'state' => $stateService->state(),
                    ]);
                }

                return $this->pairingFailureResponse(
                    $response,
                    $pairingCode,
                    $config,
                    $guard,
                    $stateService
                );
            }

            $reader = (array)$response->json();
            $readerId = trim((string)($reader['id'] ?? ''));
            if (!str_starts_with($readerId, 'rdr_')) {
                throw new \RuntimeException('SumUp accepted the pairing request but did not return a valid Reader ID.');
            }

            $reader = $this->waitForPairing($config, $readerId, $reader);
            $pairingState = strtolower(trim((string)($reader['status'] ?? 'processing')));

            if ($pairingState === 'expired') {
                throw new \RuntimeException('The pairing session expired. Generate a new pairing code and submit it within 5 minutes.');
            }

            $terminalId = $this->saveRemoteReader($config, $reader, $label);
            $snapshot = $this->localTerminalSnapshot($terminalId);

            return response()->json([
                'success' => true,
                'terminal_device_id' => $terminalId,
                'label' => $snapshot['label'],
                'pairing_state' => $snapshot['pairing_state'],
                'terminal_status' => $snapshot['status'],
                'message' => $snapshot['online']
                    ? 'Terminal paired and online.'
                    : ($snapshot['pairing_state'] === 'paired'
                        ? 'Terminal paired. Waiting for the device to come online.'
                        : 'Pairing started. Keep the Solo on the pairing screen for a moment.'),
                'state' => $stateService->state(),
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'SumUp could not pair this terminal.',
                'state' => $stateService->state(),
            ], 422);
        }
    }

    /**
     * Test is explicitly a sandbox environment in PayMyDine. Virtual Solo is
     * supported by SumUp only against a sandbox merchant, so fail before the
     * pairing POST if the credentials point at the wrong merchant type.
     */
    private function environmentGuard(array $config): array
    {
        $response = $this->client($config['access_token'])
            ->timeout(20)
            ->get($config['url'].'/v1/merchants/'.rawurlencode($config['merchant_code']));

        if (!$response->successful()) {
            $problem = $this->providerProblem($response);
            $status = $response->status();

            // API keys normally have the required profile access. Auth failures
            // here are meaningful and should block pairing; other unexpected
            // failures do not hide a reader endpoint that may still be healthy.
            if (in_array($status, [401, 403, 404], true)) {
                return [
                    'ok' => false,
                    'http_status' => $status === 404 ? 409 : $status,
                    'provider_status' => $status,
                    'sandbox' => null,
                    'message' => $status === 404
                        ? 'The saved SumUp key cannot resolve merchant '.$config['merchant_code'].'. Reconnect the correct merchant account first.'
                        : 'The saved SumUp API key cannot verify this merchant. Reconnect SumUp and try again.'.($problem['message'] ? ' SumUp: '.$problem['message'] : ''),
                ];
            }

            return [
                'ok' => true,
                'http_status' => 200,
                'provider_status' => $status,
                'sandbox' => null,
                'message' => '',
            ];
        }

        $merchant = (array)$response->json();
        $sandbox = array_key_exists('sandbox', $merchant) && $merchant['sandbox'] !== null
            ? (bool)$merchant['sandbox']
            : null;

        if ($config['environment'] === 'test' && $sandbox === false) {
            return [
                'ok' => false,
                'http_status' => 409,
                'provider_status' => 200,
                'sandbox' => false,
                'message' => 'PayMyDine Test is connected to a LIVE SumUp merchant. Virtual Solo can only pair with a Sandbox Merchant Account. In SumUp Dashboard switch to the Sandbox Merchant Account, create/use its API key and merchant code in PayMyDine Test, save the connection, then generate a brand-new Virtual Solo pairing code.',
            ];
        }

        if ($config['environment'] === 'production' && $sandbox === true) {
            return [
                'ok' => false,
                'http_status' => 409,
                'provider_status' => 200,
                'sandbox' => true,
                'message' => 'PayMyDine Production is connected to a SumUp Sandbox Merchant. Connect the live merchant credentials before using production payments.',
            ];
        }

        return [
            'ok' => true,
            'http_status' => 200,
            'provider_status' => 200,
            'sandbox' => $sandbox,
            'message' => '',
        ];
    }

    private function pairingFailureResponse(
        Response $response,
        string $pairingCode,
        array $config,
        array $guard,
        SumupTenantConnectionService $stateService
    ) {
        $status = $response->status();
        $problem = $this->providerProblem($response);
        $detail = $problem['message'];

        Log::warning('SumUp Cloud API reader pairing rejected', [
            'provider' => self::PROVIDER,
            'environment' => $config['environment'],
            'merchant_code' => $config['merchant_code'],
            'merchant_sandbox' => $guard['sandbox'],
            'http_status' => $status,
            'content_type' => $response->header('Content-Type'),
            'pairing_code_suffix' => substr($pairingCode, -3),
            'provider_type' => $problem['type'],
            'provider_message' => $detail,
            'provider_body' => $problem['body'],
        ]);

        if ($status === 404) {
            $message = 'SumUp cannot find a pending reader for this code. Generate a brand-new code on the Solo/Virtual Solo and submit it within 5 minutes.';
        } elseif ($status === 409) {
            $message = 'The Solo is no longer in a pending pairing state. Disconnect/restart the API pairing screen, generate a fresh code, and try again.';
        } elseif (in_array($status, [401, 403], true)) {
            $message = 'The saved SumUp API key is not authorized to create readers for this merchant. Reconnect the correct merchant API key.';
        } elseif (in_array($status, [400, 422], true)) {
            $message = 'SumUp rejected the Create Reader request (HTTP '.$status.').';
            if ($detail !== '') {
                $message .= ' '.$detail;
            }
            if ($config['environment'] === 'test') {
                $message .= ' For Virtual Solo, use the Sandbox Merchant Account and a newly generated pairing code that is less than 5 minutes old.';
            }
        } else {
            $message = 'SumUp reader pairing failed (HTTP '.$status.').'.($detail !== '' ? ' '.$detail : '');
        }

        $localStatus = in_array($status, [400, 401, 403, 404, 409, 422], true) ? $status : 502;

        return response()->json([
            'success' => false,
            'message' => $message,
            'provider_status' => $status,
            'provider_type' => $problem['type'],
            'state' => $stateService->state(),
        ], $localStatus);
    }

    private function providerProblem(Response $response): array
    {
        $body = trim((string)$response->body());
        $json = json_decode($body, true);
        $message = '';
        $type = '';

        if (is_array($json)) {
            $type = trim((string)($json['type'] ?? data_get($json, 'errors.type') ?? data_get($json, 'error.type') ?? ''));
            $candidates = [
                $json['detail'] ?? null,
                $json['message'] ?? null,
                $json['error_message'] ?? null,
                $json['error_description'] ?? null,
                data_get($json, 'errors.detail'),
                data_get($json, 'error.detail'),
                data_get($json, 'errors.message'),
                data_get($json, 'error.message'),
            ];

            foreach ($candidates as $candidate) {
                if (is_scalar($candidate) && trim((string)$candidate) !== '') {
                    $message = trim((string)$candidate);
                    break;
                }
            }

            if ($message === '') {
                foreach ([$json['errors'] ?? null, $json['error'] ?? null] as $candidate) {
                    $message = $this->flattenProblem($candidate);
                    if ($message !== '') {
                        break;
                    }
                }
            }
        }

        // Some SumUp gateway failures can arrive as plain text. Never lose the
        // useful upstream explanation just because Content-Type is unexpected.
        if ($message === '' && $body !== '') {
            $plain = trim(preg_replace('/\s+/', ' ', strip_tags($body)) ?: '');
            if ($plain !== '') {
                $message = mb_substr($plain, 0, 500);
            }
        }

        return [
            'type' => $type,
            'message' => $message,
            'body' => mb_substr($body, 0, 1500),
        ];
    }

    private function flattenProblem($value): string
    {
        if (is_scalar($value)) {
            return trim((string)$value);
        }
        if (!is_array($value)) {
            return '';
        }

        $messages = [];
        array_walk_recursive($value, function ($item) use (&$messages): void {
            if (is_scalar($item)) {
                $text = trim((string)$item);
                if ($text !== '' && !in_array($text, $messages, true)) {
                    $messages[] = $text;
                }
            }
        });

        return implode(' · ', array_slice($messages, 0, 4));
    }

    private function syncRemoteReaders(array $config, bool $throwOnFailure): array
    {
        $result = ['saved' => 0, 'added' => 0];
        $response = $this->client($config['access_token'])
            ->timeout(20)
            ->get($config['url'].'/v0.1/merchants/'.rawurlencode($config['merchant_code']).'/readers');

        if (!$response->successful()) {
            if ($throwOnFailure) {
                $problem = $this->providerProblem($response);
                throw new \RuntimeException($problem['message'] ?: 'SumUp could not list readers for this merchant.');
            }
            return $result;
        }

        $items = (array)(((array)$response->json())['items'] ?? []);
        foreach ($items as $item) {
            $reader = (array)$item;
            $readerId = trim((string)($reader['id'] ?? ''));
            $pairingState = strtolower(trim((string)($reader['status'] ?? 'unknown')));
            if (!str_starts_with($readerId, 'rdr_')) continue;
            if (!in_array($pairingState, ['processing', 'paired'], true)) continue;

            $exists = $this->localReaderExists($readerId);
            $this->saveRemoteReader($config, $reader, null);
            $result['saved']++;
            if (!$exists) $result['added']++;
        }

        return $result;
    }

    private function waitForPairing(array $config, string $readerId, array $reader): array
    {
        $pairingState = strtolower(trim((string)($reader['status'] ?? 'processing')));

        for ($attempt = 0; $attempt < 24 && $pairingState === 'processing'; $attempt++) {
            usleep(500000);
            $response = $this->client($config['access_token'])
                ->timeout(20)
                ->get(
                    $config['url'].'/v0.1/merchants/'.rawurlencode($config['merchant_code']).
                    '/readers/'.rawurlencode($readerId)
                );
            if (!$response->successful()) continue;

            $reader = (array)$response->json();
            $pairingState = strtolower(trim((string)($reader['status'] ?? $pairingState)));
        }

        return $reader;
    }

    private function saveRemoteReader(array $config, array $reader, ?string $preferredLabel): int
    {
        if (!Schema::hasTable('terminal_devices')) {
            throw new \RuntimeException('terminal_devices table is missing. Run migrations first.');
        }

        $readerId = trim((string)($reader['id'] ?? ''));
        if (!str_starts_with($readerId, 'rdr_')) {
            throw new \RuntimeException('SumUp returned an invalid Reader ID.');
        }

        $pairingState = strtolower(trim((string)($reader['status'] ?? 'unknown')));
        $remoteLabel = trim((string)($reader['name'] ?? ''));
        $label = trim((string)$preferredLabel) ?: ($remoteLabel ?: 'SumUp terminal');
        $live = $pairingState === 'paired' ? $this->readerStatus($config, $readerId) : [];
        $liveStatus = strtoupper(trim((string)($live['status'] ?? 'UNKNOWN')));
        $liveState = strtoupper(trim((string)($live['state'] ?? 'UNKNOWN')));

        $existing = DB::table('terminal_devices')
            ->whereRaw('LOWER(provider_code) = ?', [self::PROVIDER])
            ->where('reader_id', $readerId)
            ->first();

        $metadata = $this->decodeMetadata($existing->metadata ?? null);
        $metadata = array_merge($metadata, [
            'environment' => $config['environment'],
            'sumup_environment' => $config['environment'],
            'device_model' => $reader['device']['model'] ?? ($metadata['device_model'] ?? null),
            'device_identifier' => $reader['device']['identifier'] ?? ($metadata['device_identifier'] ?? null),
            'live_status' => $liveStatus,
            'live_state' => $liveState,
            'last_tested_at' => now()->toIso8601String(),
            'synced_from_sumup' => true,
        ]);

        $payload = $this->filterColumns('terminal_devices', [
            'provider_code' => self::PROVIDER,
            'environment' => $config['environment'],
            'affiliate_key' => null,
            'reader_id' => $readerId,
            'reader_label' => $label,
            'pairing_state' => $pairingState,
            'terminal_status' => strtolower($liveStatus),
            'metadata' => json_encode($metadata, JSON_UNESCAPED_SLASHES),
            'is_active' => $config['is_active'] && $pairingState === 'paired' ? 1 : 0,
            'updated_at' => now(),
        ]);

        if ($existing) {
            DB::table('terminal_devices')
                ->where('terminal_device_id', $existing->terminal_device_id)
                ->update($payload);
            return (int)$existing->terminal_device_id;
        }

        $payload['created_at'] = now();
        return (int)DB::table('terminal_devices')->insertGetId($payload);
    }

    private function readerStatus(array $config, string $readerId): array
    {
        $response = $this->client($config['access_token'])
            ->timeout(20)
            ->get(
                $config['url'].'/v0.1/merchants/'.rawurlencode($config['merchant_code']).
                '/readers/'.rawurlencode($readerId).'/status'
            );

        if (!$response->successful()) return [];
        $json = (array)$response->json();
        return (array)($json['data'] ?? $json);
    }

    private function localReaderExists(string $readerId): bool
    {
        return Schema::hasTable('terminal_devices')
            && DB::table('terminal_devices')
                ->whereRaw('LOWER(provider_code) = ?', [self::PROVIDER])
                ->where('reader_id', $readerId)
                ->exists();
    }

    private function localTerminalSnapshot(int $terminalId): array
    {
        $row = DB::table('terminal_devices')->where('terminal_device_id', $terminalId)->first();
        if (!$row) {
            return ['label' => 'SumUp terminal', 'pairing_state' => 'unknown', 'status' => 'unknown', 'online' => false];
        }

        $status = strtolower(trim((string)($row->terminal_status ?? 'unknown')));
        return [
            'label' => trim((string)($row->reader_label ?? '')) ?: 'SumUp terminal',
            'pairing_state' => strtolower(trim((string)($row->pairing_state ?? 'unknown'))),
            'status' => $status,
            'online' => strtoupper($status) === 'ONLINE',
        ];
    }

    private function requestedEnvironment(Request $request, SumupTenantConnectionService $stateService): string
    {
        $requested = strtolower(trim((string)$request->input('environment', '')));
        if (in_array($requested, ['test', 'production'], true)) return $requested;

        $state = $stateService->state();
        $active = strtolower(trim((string)($state['active_environment'] ?? '')));
        if (in_array($active, ['test', 'production'], true)) return $active;

        $environments = (array)($state['environments'] ?? []);
        foreach (['test', 'production'] as $environment) {
            if (($environments[$environment]['connection_status'] ?? '') === 'connected') return $environment;
        }

        return 'test';
    }

    private function config(string $environment): array
    {
        if (!Schema::hasTable('terminal_provider_configs')) {
            throw new \RuntimeException('SumUp provider configuration is not installed. Run migrations first.');
        }

        $row = DB::table('terminal_provider_configs')
            ->where('provider_code', self::PROVIDER)
            ->where('environment', $environment)
            ->first();
        if (!$row) return ['ready' => false, 'environment' => $environment];

        $accessToken = $this->decrypt((string)($row->access_token_encrypted ?? ''));
        $merchantCode = strtoupper(trim((string)($row->merchant_code ?? '')));
        if ($accessToken === '' || $merchantCode === '') {
            return ['ready' => false, 'environment' => $environment];
        }

        return [
            'ready' => true,
            'environment' => $environment,
            'is_active' => (bool)($row->is_active ?? false),
            'merchant_code' => $merchantCode,
            'access_token' => $accessToken,
            'url' => rtrim((string)($row->api_base_url ?: self::API_URL), '/'),
        ];
    }

    private function client(string $token): PendingRequest
    {
        return Http::withToken($token)
            ->acceptJson()
            ->withHeaders(['User-Agent' => 'PayMyDine/1.0']);
    }

    private function normalizePairingCode(string $value): string
    {
        return preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($value))) ?: '';
    }

    private function decrypt(string $value): string
    {
        if ($value === '') return '';
        try {
            return (string)Crypt::decryptString($value);
        } catch (\Throwable $e) {
            return '';
        }
    }

    private function decodeMetadata($value): array
    {
        if (is_array($value)) return $value;
        if (!is_string($value) || trim($value) === '') return [];
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function filterColumns(string $table, array $data): array
    {
        if (!Schema::hasTable($table)) return $data;
        return array_intersect_key($data, array_flip(Schema::getColumnListing($table)));
    }

    private function assertOwnerAccess(): void
    {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user) abort(401, 'Authentication required.');
        if (!$user->hasPermission('Site.Settings') && !$user->hasPermission('Admin.Pos')) {
            abort(403, 'Settings permission required.');
        }
    }
}
