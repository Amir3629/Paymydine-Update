<?php

namespace Admin\Controllers;

use App\Services\TerminalPayments\SumupTenantConnectionService;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Canonical SumUp reader pairing/reconciliation authority.
 *
 * Provider credentials remain owned by terminal_provider_configs. This
 * controller only manages the hardware relationship and keeps the local
 * terminal_devices projection in sync with SumUp.
 */
class SumupReaderPairing extends \Admin\Classes\AdminController
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
            // Allow copy/paste formatting from the Solo screen. The value is
            // normalized below before it is sent to SumUp.
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

            // First reconcile anything that SumUp already knows about. This
            // makes retries safe if a previous request reached SumUp but the
            // browser disconnected before PayMyDine could persist the reader.
            $before = $this->syncRemoteReaders($config, false);

            $response = Http::withToken($config['access_token'])
                ->acceptJson()
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
                // SumUp can return a conflict when the pairing request already
                // completed. Reconcile once more before deciding it failed.
                $after = $this->syncRemoteReaders($config, false);
                $recovered = $after['added'] > 0;

                if ($recovered && in_array($response->status(), [404, 409], true)) {
                    return response()->json([
                        'success' => true,
                        'recovered' => true,
                        'message' => 'Terminal was already paired in SumUp and has been synchronized with PayMyDine.',
                        'state' => $stateService->state(),
                    ]);
                }

                $this->throwPairingFailure($response, $pairingCode, $environment, $config['merchant_code']);
            }

            $reader = (array)$response->json();
            $readerId = trim((string)($reader['id'] ?? ''));
            if (!str_starts_with($readerId, 'rdr_')) {
                throw new \RuntimeException('SumUp paired the device but did not return a valid Reader ID. Refresh terminals and try again.');
            }

            $reader = $this->waitForPairing($config, $readerId, $reader);
            $pairingState = strtolower(trim((string)($reader['status'] ?? 'processing')));

            if ($pairingState === 'expired') {
                throw new \RuntimeException('The pairing session expired. Generate a new pairing code on the Solo and try again within 5 minutes.');
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

    private function requestedEnvironment(Request $request, SumupTenantConnectionService $stateService): string
    {
        $requested = strtolower(trim((string)$request->input('environment', '')));
        if (in_array($requested, ['test', 'production'], true)) {
            return $requested;
        }

        $state = $stateService->state();
        $active = strtolower(trim((string)($state['active_environment'] ?? '')));
        if (in_array($active, ['test', 'production'], true)) {
            return $active;
        }

        $environments = (array)($state['environments'] ?? []);
        foreach (['test', 'production'] as $environment) {
            $snapshot = (array)($environments[$environment] ?? []);
            if (($snapshot['connection_status'] ?? '') === 'connected') {
                return $environment;
            }
        }

        return 'test';
    }

    private function normalizePairingCode(string $value): string
    {
        return preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($value))) ?: '';
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

        if (!$row) {
            return ['ready' => false, 'environment' => $environment];
        }

        $accessToken = $this->decrypt((string)($row->access_token_encrypted ?? ''));
        $merchantCode = strtoupper(trim((string)($row->merchant_code ?? '')));

        if ($accessToken === '' || $merchantCode === '') {
            return ['ready' => false, 'environment' => $environment];
        }

        return [
            'ready' => true,
            'environment' => $environment,
            'id' => (int)$row->terminal_provider_config_id,
            'is_active' => (bool)($row->is_active ?? false),
            'merchant_code' => $merchantCode,
            'access_token' => $accessToken,
            'url' => rtrim((string)($row->api_base_url ?: self::API_URL), '/'),
        ];
    }

    private function syncRemoteReaders(array $config, bool $throwOnFailure): array
    {
        $result = [
            'saved' => 0,
            'added' => 0,
            'reader_ids' => [],
        ];

        $response = Http::withToken($config['access_token'])
            ->acceptJson()
            ->timeout(20)
            ->get($config['url'].'/v0.1/merchants/'.rawurlencode($config['merchant_code']).'/readers');

        if (!$response->successful()) {
            if ($throwOnFailure) {
                throw new \RuntimeException($this->providerMessage($response, 'SumUp could not list readers for this merchant.'));
            }
            return $result;
        }

        $items = (array)(((array)$response->json())['items'] ?? []);
        foreach ($items as $item) {
            $reader = (array)$item;
            $readerId = trim((string)($reader['id'] ?? ''));
            $pairingState = strtolower(trim((string)($reader['status'] ?? 'unknown')));

            if (!str_starts_with($readerId, 'rdr_')) {
                continue;
            }
            if (!in_array($pairingState, ['processing', 'paired'], true)) {
                continue;
            }

            $result['reader_ids'][] = $readerId;
            $exists = $this->localReaderExists($readerId);
            $this->saveRemoteReader($config, $reader, null);
            $result['saved']++;
            if (!$exists) {
                $result['added']++;
            }
        }

        return $result;
    }

    private function waitForPairing(array $config, string $readerId, array $reader): array
    {
        $pairingState = strtolower(trim((string)($reader['status'] ?? 'processing')));

        // The Solo normally acknowledges quickly, but Virtual Solo and slower
        // networks can take longer than a single browser round trip.
        for ($attempt = 0; $attempt < 24 && $pairingState === 'processing'; $attempt++) {
            usleep(500000);

            $response = Http::withToken($config['access_token'])
                ->acceptJson()
                ->timeout(20)
                ->get(
                    $config['url'].'/v0.1/merchants/'.rawurlencode($config['merchant_code']).
                    '/readers/'.rawurlencode($readerId)
                );

            if (!$response->successful()) {
                continue;
            }

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
        $response = Http::withToken($config['access_token'])
            ->acceptJson()
            ->timeout(20)
            ->get(
                $config['url'].'/v0.1/merchants/'.rawurlencode($config['merchant_code']).
                '/readers/'.rawurlencode($readerId).'/status'
            );

        if (!$response->successful()) {
            return [];
        }

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
        $row = DB::table('terminal_devices')
            ->where('terminal_device_id', $terminalId)
            ->first();

        if (!$row) {
            return [
                'label' => 'SumUp terminal',
                'pairing_state' => 'unknown',
                'status' => 'unknown',
                'online' => false,
            ];
        }

        $status = strtolower(trim((string)($row->terminal_status ?? 'unknown')));
        return [
            'label' => trim((string)($row->reader_label ?? '')) ?: 'SumUp terminal',
            'pairing_state' => strtolower(trim((string)($row->pairing_state ?? 'unknown'))),
            'status' => $status,
            'online' => strtoupper($status) === 'ONLINE',
        ];
    }

    private function throwPairingFailure(
        Response $response,
        string $pairingCode,
        string $environment,
        string $merchantCode
    ): void {
        $status = $response->status();
        $providerMessage = $this->providerMessage($response, '');

        Log::warning('SumUp reader pairing rejected', [
            'provider' => self::PROVIDER,
            'environment' => $environment,
            'merchant_code' => $merchantCode,
            'http_status' => $status,
            'pairing_code_suffix' => substr($pairingCode, -3),
            'provider_message' => $providerMessage,
        ]);

        if ($status === 404) {
            throw new \RuntimeException('This pairing code is no longer active. Generate a new code on the Solo and pair it within 5 minutes.');
        }

        if ($status === 409) {
            throw new \RuntimeException('This Solo is no longer waiting to be paired. Generate a fresh pairing code on the device and try again.');
        }

        if (in_array($status, [401, 403], true)) {
            throw new \RuntimeException('The saved SumUp API key cannot create readers for this merchant. Reconnect SumUp with the merchant Secret API Key, then try again.');
        }

        if (in_array($status, [400, 422], true)) {
            throw new \RuntimeException($providerMessage !== ''
                ? 'SumUp rejected the pairing request: '.$providerMessage
                : 'SumUp rejected this pairing code. Generate a fresh code on the Solo and try again.');
        }

        throw new \RuntimeException($providerMessage !== ''
            ? 'SumUp pairing failed: '.$providerMessage
            : 'SumUp could not pair this terminal. Generate a fresh pairing code and try again.');
    }

    private function providerMessage(Response $response, string $fallback): string
    {
        $json = $response->json();
        if (!is_array($json)) {
            return $fallback;
        }

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
                return trim((string)$candidate);
            }
        }

        foreach ([$json['errors'] ?? null, $json['error'] ?? null] as $candidate) {
            $flattened = $this->flattenProblem($candidate);
            if ($flattened !== '') {
                return $flattened;
            }
        }

        return $fallback;
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

    private function decrypt(string $value): string
    {
        if ($value === '') {
            return '';
        }

        try {
            return (string)Crypt::decryptString($value);
        } catch (\Throwable $e) {
            return '';
        }
    }

    private function decodeMetadata($value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (!is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function filterColumns(string $table, array $data): array
    {
        if (!Schema::hasTable($table)) {
            return $data;
        }

        return array_intersect_key($data, array_flip(Schema::getColumnListing($table)));
    }

    private function assertOwnerAccess(): void
    {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user) {
            abort(401, 'Authentication required.');
        }

        if (!$user->hasPermission('Site.Settings') && !$user->hasPermission('Admin.Pos')) {
            abort(403, 'Settings permission required.');
        }
    }
}
