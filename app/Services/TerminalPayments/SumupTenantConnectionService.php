<?php

namespace App\Services\TerminalPayments;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class SumupTenantConnectionService
{
    public const PROVIDER = 'sumup';
    public const APP_ID = 'com.paymydine.cloud';
    public const API_URL = 'https://api.sumup.com';

    public function state(): array
    {
        $this->importLegacyIfNeeded();

        $active = null;
        if ($this->configTableReady()) {
            $active = DB::table('terminal_provider_configs')
                ->where('provider_code', self::PROVIDER)
                ->where('is_active', 1)
                ->value('environment');
        }

        return [
            'provider' => self::PROVIDER,
            'app_id' => self::APP_ID,
            'active_environment' => $active ? (string)$active : null,
            'environments' => [
                'test' => $this->snapshot('test'),
                'production' => $this->snapshot('production'),
            ],
        ];
    }

    public function snapshot(string $environment): array
    {
        $environment = $this->environment($environment);
        $row = $this->configRow($environment);

        return [
            'environment' => $environment,
            'configured' => (bool)($row && !empty($row->access_token_encrypted)),
            'api_key_present' => (bool)($row && !empty($row->access_token_encrypted)),
            'affiliate_key_present' => (bool)($row && !empty($row->affiliate_key_encrypted)),
            'merchant_code' => (string)($row->merchant_code ?? ''),
            'app_id' => (string)($row->app_id ?? self::APP_ID),
            'connection_status' => (string)($row->connection_status ?? 'not_configured'),
            'is_active' => (bool)($row->is_active ?? false),
            'last_tested_at' => $row->last_tested_at ?? null,
            'last_error' => (string)($row->last_error ?? ''),
            'terminals' => $this->terminalSnapshots($environment),
        ];
    }

    public function saveConnection(
        string $environment,
        ?string $apiKey,
        ?string $affiliateKey,
        ?string $merchantCode
    ): array {
        $this->assertConfigTable();
        $environment = $this->environment($environment);
        $existing = $this->configRow($environment);

        $apiKey = trim((string)$apiKey);
        $affiliateKey = trim((string)$affiliateKey);
        $merchantCode = strtoupper(trim((string)$merchantCode));

        if (!$existing && $apiKey === '') {
            throw new \InvalidArgumentException('SumUp Secret API Key is required.');
        }
        if (!$existing && $affiliateKey === '') {
            throw new \InvalidArgumentException('SumUp Affiliate Key is required.');
        }

        $payload = [
            'provider_code' => self::PROVIDER,
            'environment' => $environment,
            'api_base_url' => self::API_URL,
            'merchant_code' => $merchantCode !== '' ? $merchantCode : ($existing->merchant_code ?? null),
            'app_id' => self::APP_ID,
            'connection_status' => 'untested',
            'last_error' => null,
            'updated_at' => now(),
        ];

        if ($apiKey !== '') {
            $payload['access_token_encrypted'] = Crypt::encryptString($apiKey);
        }
        if ($affiliateKey !== '') {
            $payload['affiliate_key_encrypted'] = Crypt::encryptString($affiliateKey);
        }

        if ($existing) {
            DB::table('terminal_provider_configs')
                ->where('terminal_provider_config_id', $existing->terminal_provider_config_id)
                ->update($payload);
        } else {
            $payload['is_active'] = 0;
            $payload['created_at'] = now();
            DB::table('terminal_provider_configs')->insert($payload);
        }

        return $this->snapshot($environment);
    }

    public function testConnection(string $environment): array
    {
        $environment = $this->environment($environment);
        $config = $this->config($environment);

        if (!$config['ready']) {
            throw new \RuntimeException('Save the SumUp credentials first.');
        }

        try {
            $me = Http::withToken($config['access_token'])
                ->acceptJson()
                ->timeout(20)
                ->get($config['url'].'/v0.1/me');

            if (!$me->successful()) {
                throw new \RuntimeException($this->safeHttpMessage($me, 'SumUp rejected the API key.'));
            }

            $meJson = (array)$me->json();
            $merchant = trim((string)$config['merchant_code']);
            if ($merchant === '') {
                $merchant = trim((string)(
                    $meJson['merchant_profile']['merchant_code']
                    ?? $meJson['merchant_code']
                    ?? ''
                ));
            }
            if ($merchant === '') {
                throw new \RuntimeException('Merchant Code is required. Copy it from the selected SumUp account or sandbox.');
            }

            $readers = Http::withToken($config['access_token'])
                ->acceptJson()
                ->timeout(20)
                ->get($config['url'].'/v0.1/merchants/'.rawurlencode($merchant).'/readers');

            if (!$readers->successful()) {
                throw new \RuntimeException($this->safeHttpMessage($readers, 'The API key cannot access this Merchant Code.'));
            }

            DB::table('terminal_provider_configs')
                ->where('terminal_provider_config_id', $config['id'])
                ->update([
                    'merchant_code' => $merchant,
                    'connection_status' => 'connected',
                    'last_tested_at' => now(),
                    'last_error' => null,
                    'updated_at' => now(),
                ]);

            if (!$this->hasActiveEnvironment()) {
                $this->activateEnvironment($environment);
            }

            return [
                'success' => true,
                'environment' => $environment,
                'merchant_code' => $merchant,
                'reader_count' => count((array)((array)$readers->json())['items'] ?? []),
                'message' => 'Connected to SumUp.',
                'state' => $this->state(),
            ];
        } catch (\Throwable $e) {
            $this->markConnectionError($environment, $e->getMessage());
            throw $e;
        }
    }

    public function activateEnvironment(string $environment): array
    {
        $this->assertConfigTable();
        $environment = $this->environment($environment);
        $row = $this->configRow($environment);

        if (!$row || empty($row->access_token_encrypted)) {
            throw new \RuntimeException('Configure this SumUp environment first.');
        }
        if ((string)$row->connection_status !== 'connected') {
            throw new \RuntimeException('Test the SumUp connection successfully before using it for payments.');
        }

        DB::transaction(function () use ($environment): void {
            DB::table('terminal_provider_configs')
                ->where('provider_code', self::PROVIDER)
                ->update(['is_active' => 0, 'updated_at' => now()]);

            DB::table('terminal_provider_configs')
                ->where('provider_code', self::PROVIDER)
                ->where('environment', $environment)
                ->update(['is_active' => 1, 'updated_at' => now()]);

            if (Schema::hasTable('terminal_devices')) {
                DB::table('terminal_devices')
                    ->whereRaw('LOWER(provider_code) = ?', [self::PROVIDER])
                    ->update(['is_active' => 0, 'updated_at' => now()]);

                $query = DB::table('terminal_devices')
                    ->whereRaw('LOWER(provider_code) = ?', [self::PROVIDER])
                    ->whereRaw('LOWER(COALESCE(pairing_state, ?)) = ?', ['unknown', 'paired']);

                if (Schema::hasColumn('terminal_devices', 'environment')) {
                    $query->where('environment', $environment);
                }

                $query->update(['is_active' => 1, 'updated_at' => now()]);
            }
        });

        return $this->state();
    }

    public function pairReader(string $environment, string $pairingCode, string $label): array
    {
        $environment = $this->environment($environment);
        $config = $this->config($environment);
        if (!$config['ready']) {
            throw new \RuntimeException('Connect this SumUp environment first.');
        }

        $pairingCode = strtoupper(trim($pairingCode));
        $label = trim($label);
        if (!preg_match('/^[A-Z0-9]{8,9}$/', $pairingCode)) {
            throw new \InvalidArgumentException('Enter the 8 or 9 character pairing code shown on the Solo.');
        }
        if ($label === '') {
            throw new \InvalidArgumentException('Give the terminal a simple name, for example Front Desk or Bar.');
        }

        $merchant = trim((string)$config['merchant_code']);
        if ($merchant === '') {
            throw new \RuntimeException('Merchant Code is missing. Test the SumUp connection first.');
        }

        $response = Http::withToken($config['access_token'])
            ->acceptJson()
            ->asJson()
            ->timeout(25)
            ->post(
                $config['url'].'/v0.1/merchants/'.rawurlencode($merchant).'/readers',
                ['pairing_code' => $pairingCode, 'name' => $label]
            );

        if (!$response->successful()) {
            throw new \RuntimeException($this->safeHttpMessage($response, 'SumUp could not pair this terminal.'));
        }

        $reader = (array)$response->json();
        $readerId = trim((string)($reader['id'] ?? ''));
        if (!str_starts_with($readerId, 'rdr_')) {
            throw new \RuntimeException('SumUp did not return a valid Reader ID.');
        }

        $pairState = strtolower(trim((string)($reader['status'] ?? 'processing')));
        for ($i = 0; $i < 12 && $pairState === 'processing'; $i++) {
            usleep(750000);
            $check = Http::withToken($config['access_token'])
                ->acceptJson()
                ->timeout(20)
                ->get($config['url'].'/v0.1/merchants/'.rawurlencode($merchant).'/readers/'.rawurlencode($readerId));
            if ($check->successful()) {
                $reader = (array)$check->json();
                $pairState = strtolower(trim((string)($reader['status'] ?? $pairState)));
            }
        }

        $live = $this->readerStatusRequest($config, $readerId);
        $liveStatus = strtoupper((string)($live['status'] ?? 'UNKNOWN'));
        $liveState = strtoupper((string)($live['state'] ?? 'UNKNOWN'));

        $terminalId = $this->saveReader([
            'environment' => $environment,
            'reader_id' => $readerId,
            'reader_label' => $label,
            'pairing_state' => $pairState,
            'terminal_status' => strtolower($liveStatus),
            'is_active' => $this->isEnvironmentActive($environment) && $pairState === 'paired',
            'metadata' => [
                'environment' => $environment,
                'sumup_environment' => $environment,
                'device_model' => $reader['device']['model'] ?? null,
                'device_identifier' => $reader['device']['identifier'] ?? null,
                'live_status' => $liveStatus,
                'live_state' => $liveState,
                'last_tested_at' => now()->toIso8601String(),
            ],
        ]);

        return [
            'success' => true,
            'terminal_device_id' => $terminalId,
            'label' => $label,
            'pairing_state' => $pairState,
            'terminal_status' => strtolower($liveStatus),
            'message' => $liveStatus === 'ONLINE'
                ? 'Terminal paired and online.'
                : 'Terminal paired. Keep the Solo online before taking payments.',
            'state' => $this->state(),
        ];
    }

    public function testReader(int $terminalDeviceId): array
    {
        $terminal = $this->terminalRow($terminalDeviceId);
        $environment = $this->terminalEnvironment($terminal);
        $config = $this->config($environment);
        if (!$config['ready']) {
            throw new \RuntimeException('The SumUp connection for this terminal is not configured.');
        }

        $merchant = trim((string)$config['merchant_code']);
        $readerId = trim((string)$terminal->reader_id);
        $base = $config['url'].'/v0.1/merchants/'.rawurlencode($merchant).'/readers/'.rawurlencode($readerId);

        $readerResp = Http::withToken($config['access_token'])->acceptJson()->timeout(20)->get($base);
        if (!$readerResp->successful()) {
            throw new \RuntimeException($this->safeHttpMessage($readerResp, 'SumUp could not find this reader.'));
        }

        $reader = (array)$readerResp->json();
        $pairState = strtolower((string)($reader['status'] ?? 'unknown'));
        $live = $this->readerStatusRequest($config, $readerId);
        $liveStatus = strtoupper((string)($live['status'] ?? 'UNKNOWN'));
        $liveState = strtoupper((string)($live['state'] ?? 'UNKNOWN'));

        $metadata = $this->decodeMetadata($terminal->metadata ?? null);
        $metadata['environment'] = $environment;
        $metadata['live_status'] = $liveStatus;
        $metadata['live_state'] = $liveState;
        $metadata['last_tested_at'] = now()->toIso8601String();

        DB::table('terminal_devices')
            ->where('terminal_device_id', $terminalDeviceId)
            ->update($this->filterColumns('terminal_devices', [
                'reader_label' => trim((string)($reader['name'] ?? '')) ?: (string)$terminal->reader_label,
                'pairing_state' => $pairState,
                'terminal_status' => strtolower($liveStatus),
                'metadata' => json_encode($metadata, JSON_UNESCAPED_SLASHES),
                'is_active' => $this->isEnvironmentActive($environment) && $pairState === 'paired' ? 1 : 0,
                'updated_at' => now(),
            ]));

        return [
            'success' => true,
            'terminal_device_id' => $terminalDeviceId,
            'pairing_state' => $pairState,
            'terminal_status' => strtolower($liveStatus),
            'live_state' => $liveState,
            'message' => $liveStatus === 'ONLINE' ? 'Terminal is online and ready.' : 'Terminal is paired but currently offline.',
            'state' => $this->state(),
        ];
    }

    public function removeReader(int $terminalDeviceId): array
    {
        $terminal = $this->terminalRow($terminalDeviceId);
        $environment = $this->terminalEnvironment($terminal);
        $config = $this->config($environment);
        $readerId = trim((string)$terminal->reader_id);

        if ($config['ready'] && $readerId !== '') {
            $merchant = trim((string)$config['merchant_code']);
            if ($merchant !== '') {
                $response = Http::withToken($config['access_token'])
                    ->acceptJson()
                    ->timeout(20)
                    ->delete($config['url'].'/v0.1/merchants/'.rawurlencode($merchant).'/readers/'.rawurlencode($readerId));

                if (!$response->successful() && $response->status() !== 404) {
                    throw new \RuntimeException($this->safeHttpMessage($response, 'SumUp could not remove this reader.'));
                }
            }
        }

        DB::table('terminal_devices')->where('terminal_device_id', $terminalDeviceId)->delete();

        return [
            'success' => true,
            'message' => 'Terminal removed.',
            'state' => $this->state(),
        ];
    }

    public function activeConfig(): array
    {
        $this->importLegacyIfNeeded();
        if (!$this->configTableReady()) {
            return [];
        }

        $row = DB::table('terminal_provider_configs')
            ->where('provider_code', self::PROVIDER)
            ->where('is_active', 1)
            ->orderByDesc('terminal_provider_config_id')
            ->first();

        if (!$row) {
            return [];
        }

        return $this->configFromRow($row);
    }

    private function config(string $environment): array
    {
        $this->importLegacyIfNeeded();
        $row = $this->configRow($environment);
        return $row ? $this->configFromRow($row) : ['ready' => false, 'environment' => $environment];
    }

    private function configFromRow(object $row): array
    {
        $token = $this->decrypt((string)($row->access_token_encrypted ?? ''));
        $affiliate = $this->decrypt((string)($row->affiliate_key_encrypted ?? ''));
        $merchant = trim((string)($row->merchant_code ?? ''));

        return [
            'id' => (int)$row->terminal_provider_config_id,
            'ready' => $token !== '' && $affiliate !== '',
            'provider_code' => self::PROVIDER,
            'environment' => (string)$row->environment,
            'url' => rtrim((string)($row->api_base_url ?: self::API_URL), '/'),
            'access_token' => $token,
            'affiliate_key' => $affiliate,
            'merchant_code' => $merchant,
            'id_application' => $merchant,
            'affiliate_app_id' => (string)($row->app_id ?: self::APP_ID),
            'currency' => 'EUR',
        ];
    }

    private function configRow(string $environment): ?object
    {
        if (!$this->configTableReady()) {
            return null;
        }
        return DB::table('terminal_provider_configs')
            ->where('provider_code', self::PROVIDER)
            ->where('environment', $this->environment($environment))
            ->first();
    }

    private function terminalSnapshots(string $environment): array
    {
        if (!Schema::hasTable('terminal_devices')) {
            return [];
        }

        $query = DB::table('terminal_devices')
            ->whereRaw('LOWER(provider_code) = ?', [self::PROVIDER])
            ->orderBy('terminal_device_id');

        if (Schema::hasColumn('terminal_devices', 'environment')) {
            $query->where('environment', $environment);
        }

        return $query->get()->map(function ($row) use ($environment): array {
            $status = strtoupper(trim((string)($row->terminal_status ?? 'UNKNOWN')));
            $pairing = strtolower(trim((string)($row->pairing_state ?? 'unknown')));
            $reader = trim((string)($row->reader_id ?? ''));
            return [
                'terminal_device_id' => (int)$row->terminal_device_id,
                'environment' => $environment,
                'label' => trim((string)($row->reader_label ?? '')) ?: 'SumUp terminal',
                'status' => $status,
                'pairing_state' => $pairing,
                'online' => $status === 'ONLINE',
                'active' => (bool)($row->is_active ?? false),
                'reader_hint' => $reader !== '' ? substr($reader, 0, 8).'…'.substr($reader, -4) : '',
            ];
        })->values()->all();
    }

    private function saveReader(array $data): int
    {
        if (!Schema::hasTable('terminal_devices')) {
            throw new \RuntimeException('terminal_devices table is missing. Run migrations first.');
        }

        $existing = DB::table('terminal_devices')
            ->whereRaw('LOWER(provider_code) = ?', [self::PROVIDER])
            ->where('reader_id', $data['reader_id'])
            ->first();

        $payload = $this->filterColumns('terminal_devices', [
            'provider_code' => self::PROVIDER,
            'environment' => $data['environment'],
            'affiliate_key' => null,
            'reader_id' => $data['reader_id'],
            'reader_label' => $data['reader_label'],
            'pairing_state' => $data['pairing_state'],
            'terminal_status' => $data['terminal_status'],
            'metadata' => json_encode($data['metadata'], JSON_UNESCAPED_SLASHES),
            'is_active' => $data['is_active'] ? 1 : 0,
            'updated_at' => now(),
        ]);

        if ($existing) {
            DB::table('terminal_devices')->where('terminal_device_id', $existing->terminal_device_id)->update($payload);
            return (int)$existing->terminal_device_id;
        }

        $payload['created_at'] = now();
        return (int)DB::table('terminal_devices')->insertGetId($payload);
    }

    private function readerStatusRequest(array $config, string $readerId): array
    {
        $merchant = trim((string)$config['merchant_code']);
        $resp = Http::withToken($config['access_token'])
            ->acceptJson()
            ->timeout(20)
            ->get($config['url'].'/v0.1/merchants/'.rawurlencode($merchant).'/readers/'.rawurlencode($readerId).'/status');

        if (!$resp->successful()) {
            return ['status' => 'UNKNOWN', 'state' => 'UNKNOWN'];
        }

        $json = (array)$resp->json();
        return (array)($json['data'] ?? $json);
    }

    private function terminalRow(int $terminalDeviceId): object
    {
        if (!Schema::hasTable('terminal_devices')) {
            throw new \RuntimeException('terminal_devices table is missing.');
        }
        $row = DB::table('terminal_devices')
            ->where('terminal_device_id', $terminalDeviceId)
            ->whereRaw('LOWER(provider_code) = ?', [self::PROVIDER])
            ->first();
        if (!$row) {
            throw new \RuntimeException('SumUp terminal not found.');
        }
        return $row;
    }

    private function terminalEnvironment(object $terminal): string
    {
        if (Schema::hasColumn('terminal_devices', 'environment')) {
            $value = trim((string)($terminal->environment ?? ''));
            if (in_array($value, ['test', 'production'], true)) {
                return $value;
            }
        }
        $metadata = $this->decodeMetadata($terminal->metadata ?? null);
        $value = strtolower((string)($metadata['environment'] ?? $metadata['sumup_environment'] ?? ''));
        return in_array($value, ['sandbox', 'test'], true) ? 'test' : 'production';
    }

    private function importLegacyIfNeeded(): void
    {
        if (!$this->configTableReady()) {
            return;
        }
        if (DB::table('terminal_provider_configs')->where('provider_code', self::PROVIDER)->exists()) {
            return;
        }
        if (!Schema::hasTable('pos_configs') || !Schema::hasTable('pos_devices')) {
            return;
        }

        try {
            $deviceId = DB::table('pos_devices')
                ->whereRaw('LOWER(code) = ?', [self::PROVIDER])
                ->orderByDesc('device_id')
                ->value('device_id');
            if (!$deviceId) {
                return;
            }

            $legacy = DB::table('pos_configs')
                ->where('device_id', (int)$deviceId)
                ->orderByDesc('config_id')
                ->first();
            if (!$legacy || trim((string)($legacy->access_token ?? '')) === '') {
                return;
            }

            $environment = $this->inferLegacyEnvironment();
            DB::table('terminal_provider_configs')->insert([
                'provider_code' => self::PROVIDER,
                'environment' => $environment,
                'api_base_url' => rtrim((string)($legacy->url ?? self::API_URL), '/'),
                'access_token_encrypted' => Crypt::encryptString((string)$legacy->access_token),
                'affiliate_key_encrypted' => trim((string)($legacy->sumup_affiliate_key ?? '')) !== ''
                    ? Crypt::encryptString((string)$legacy->sumup_affiliate_key)
                    : null,
                'merchant_code' => trim((string)($legacy->id_application ?? '')) ?: null,
                'app_id' => self::APP_ID,
                'is_active' => 1,
                'connection_status' => 'connected',
                'last_tested_at' => now(),
                'last_error' => null,
                'metadata' => json_encode(['imported_from' => 'pos_configs'], JSON_UNESCAPED_SLASHES),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if (Schema::hasTable('terminal_devices') && Schema::hasColumn('terminal_devices', 'environment')) {
                DB::table('terminal_devices')
                    ->whereRaw('LOWER(provider_code) = ?', [self::PROVIDER])
                    ->whereNull('environment')
                    ->update(['environment' => $environment, 'updated_at' => now()]);
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function inferLegacyEnvironment(): string
    {
        if (!Schema::hasTable('terminal_devices')) {
            return 'production';
        }
        foreach (DB::table('terminal_devices')->whereRaw('LOWER(provider_code) = ?', [self::PROVIDER])->get() as $terminal) {
            $metadata = $this->decodeMetadata($terminal->metadata ?? null);
            $env = strtolower((string)($metadata['environment'] ?? $metadata['sumup_environment'] ?? ''));
            if (in_array($env, ['sandbox', 'test'], true)) {
                return 'test';
            }
        }
        return 'production';
    }

    private function hasActiveEnvironment(): bool
    {
        return $this->configTableReady()
            && DB::table('terminal_provider_configs')
                ->where('provider_code', self::PROVIDER)
                ->where('is_active', 1)
                ->exists();
    }

    private function isEnvironmentActive(string $environment): bool
    {
        return $this->configTableReady()
            && DB::table('terminal_provider_configs')
                ->where('provider_code', self::PROVIDER)
                ->where('environment', $environment)
                ->where('is_active', 1)
                ->exists();
    }

    private function markConnectionError(string $environment, string $message): void
    {
        if (!$this->configTableReady()) {
            return;
        }
        DB::table('terminal_provider_configs')
            ->where('provider_code', self::PROVIDER)
            ->where('environment', $environment)
            ->update([
                'connection_status' => 'error',
                'last_tested_at' => now(),
                'last_error' => mb_substr($message, 0, 1000),
                'updated_at' => now(),
            ]);
    }

    private function configTableReady(): bool
    {
        return Schema::hasTable('terminal_provider_configs');
    }

    private function assertConfigTable(): void
    {
        if (!$this->configTableReady()) {
            throw new \RuntimeException('SumUp self-service migration is missing. Run migrations first.');
        }
    }

    private function environment(string $environment): string
    {
        $environment = strtolower(trim($environment));
        if (!in_array($environment, ['test', 'production'], true)) {
            throw new \InvalidArgumentException('Environment must be test or production.');
        }
        return $environment;
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

    private function safeHttpMessage($response, string $fallback): string
    {
        $json = (array)$response->json();
        $errors = (array)($json['errors'] ?? []);
        return trim((string)(
            $errors['detail']
            ?? $json['detail']
            ?? $json['message']
            ?? $json['error_message']
            ?? $fallback
        ));
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
}
