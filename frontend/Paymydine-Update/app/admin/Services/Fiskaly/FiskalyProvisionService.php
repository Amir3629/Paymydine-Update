<?php

namespace Admin\Services\Fiskaly;

use Admin\Models\Fiskaly_configs_model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class FiskalyProvisionService
{
    protected function readMeta(Fiskaly_configs_model $cfg): array
    {
        return is_array($cfg->meta) ? $cfg->meta : [];
    }

    protected function writeMeta(Fiskaly_configs_model $cfg, array $data): void
    {
        $cfg->meta = array_merge($this->readMeta($cfg), $data);
        $cfg->saveQuietly();
    }

    protected function extractAdminPuk(array $meta): ?string
    {
        $candidates = [
            $meta['admin_puk'] ?? null,
            $meta['set_uninitialized_response']['admin_puk'] ?? null,
            $meta['create_tss_response']['admin_puk'] ?? null,
            $meta['create_tss_response']['puk'] ?? null,
            $meta['get_tss_response']['admin_puk'] ?? null,
        ];

        foreach ($candidates as $value) {
            if ($value !== null && $value !== '') {
                return (string)$value;
            }
        }

        return null;
    }

    public function ensureClientExists(Fiskaly_configs_model $cfg, bool $force = false): array
    {
        if (!$cfg->is_enabled) {
            return ['ok' => false, 'skipped' => true, 'reason' => 'disabled'];
        }

        if (empty($cfg->api_key) || empty($cfg->api_secret) || empty($cfg->cash_register_id)) {
            return ['ok' => false, 'skipped' => true, 'reason' => 'missing_required_config'];
        }

        require_once __DIR__.'/FiskalyApiClient.php';

        $meta = $this->readMeta($cfg);

        $adminPin = (string)($meta['admin_pin'] ?? '');
        if (strlen($adminPin) < 6) {
            $adminPin = '123456';
        }

        $timeAdminPin = (string)($meta['time_admin_pin'] ?? '');
        if (strlen($timeAdminPin) < 6) {
            $timeAdminPin = '678901';
        }

        $this->writeMeta($cfg, [
            'admin_pin' => $adminPin,
            'time_admin_pin' => $timeAdminPin,
            'provisioning_status' => 'started',
            'last_error' => null,
        ]);

        $api = new FiskalyApiClient($cfg);

        try {
            if (empty($cfg->tss_id)) {
                $tss = $api->createTss([
                    'description' => 'paymydine loc-'.$cfg->location_id.' '.$cfg->cash_register_id,
                    'admin_pin' => $adminPin,
                    'time_admin_pin' => $timeAdminPin,
                ]);

                $cfg->tss_id = $tss['_id'] ?? $tss['id'] ?? $tss['tss_id'] ?? $cfg->tss_id;
                $save = [
                    'create_tss_response' => $tss,
                    'provisioning_status' => 'tss_created',
                ];
                if (!empty($tss['admin_puk'])) {
                    $save['admin_puk'] = (string)$tss['admin_puk'];
                }
                $this->writeMeta($cfg, $save);
            }

            if (empty($cfg->tss_id)) {
                throw new \RuntimeException('Missing tss_id after createTss');
            }

            $tss = $api->getTss((string)$cfg->tss_id);
            $state = (string)($tss['state'] ?? '');

            $this->writeMeta($cfg, [
                'get_tss_response' => $tss,
                'tss_state' => $state,
            ]);

            if ($state === 'CREATED') {
                $tss = $api->updateTssState((string)$cfg->tss_id, 'UNINITIALIZED');
                $state = (string)($tss['state'] ?? 'UNINITIALIZED');

                $save = [
                    'set_uninitialized_response' => $tss,
                    'tss_state' => $state,
                ];
                if (!empty($tss['admin_puk'])) {
                    $save['admin_puk'] = (string)$tss['admin_puk'];
                }
                $this->writeMeta($cfg, $save);
            }

            $meta = $this->readMeta($cfg);
            $adminPuk = $this->extractAdminPuk($meta);

            try {
                $adminAuth = $api->adminAuth((string)$cfg->tss_id, $adminPin, $timeAdminPin);
                $this->writeMeta($cfg, [
                    'admin_auth_response' => $adminAuth,
                ]);
            } catch (\Throwable $authError) {
                if (!$adminPuk) {
                    throw $authError;
                }

                $pinResult = $api->changeAdminPinWithPuk((string)$cfg->tss_id, $adminPuk, $adminPin, $timeAdminPin);
                $this->writeMeta($cfg, [
                    'change_admin_pin_with_puk_response' => $pinResult,
                    'admin_pin' => $adminPin,
                    'time_admin_pin' => $timeAdminPin,
                ]);

                $adminAuth = $api->adminAuth((string)$cfg->tss_id, $adminPin, $timeAdminPin);
                $this->writeMeta($cfg, [
                    'admin_auth_response' => $adminAuth,
                ]);
            }

            $tss = $api->getTss((string)$cfg->tss_id);
            $state = (string)($tss['state'] ?? '');
            $this->writeMeta($cfg, [
                'get_tss_after_admin_auth' => $tss,
                'tss_state' => $state,
            ]);

            if ($state === 'UNINITIALIZED') {
                $tss = $api->updateTssState((string)$cfg->tss_id, 'INITIALIZED');
                $state = (string)($tss['state'] ?? 'INITIALIZED');

                $this->writeMeta($cfg, [
                    'set_initialized_response' => $tss,
                    'tss_state' => $state,
                ]);
            }

            if (!$force && !empty($cfg->client_id)) {
                $currentMeta = $this->readMeta($cfg);

                $this->writeMeta($cfg, [
                    'provisioning_status' => 'active',
                    'last_error' => null,
                    'tss_state' => $state,
                    'provisioned_at' => $currentMeta['provisioned_at'] ?? now()->toDateTimeString(),
                ]);

                return [
                    'ok' => true,
                    'skipped' => true,
                    'reason' => 'already_exists',
                    'tss_id' => $cfg->tss_id,
                    'client_id' => $cfg->client_id,
                    'tss_state' => $state,
                ];
            }

            $clientId = !empty($cfg->client_id) ? (string)$cfg->client_id : (string)Str::uuid();

            $baseSerial = 'PMD-LOC'.$cfg->location_id.'-'.preg_replace('/[^A-Za-z0-9\-_]/', '-', (string)$cfg->cash_register_id).'-TEST';
            $serialNumber = (string)($meta['client_serial_number'] ?? $baseSerial);

            $client = $api->createClient((string)$cfg->tss_id, $clientId, [
                'serial_number' => $serialNumber,
            ]);

            $cfg->client_id = $client['_id'] ?? $client['id'] ?? $client['client_id'] ?? $clientId;
            $cfg->last_error = null;
            $cfg->saveQuietly();

            $this->writeMeta($cfg, [
                'client_serial_number' => $serialNumber,
                'create_client_response' => $client,
                'client_serial_note' => 'middleware client endpoint persisted by v8',
                'provisioning_status' => 'active',
                'provisioned_at' => now()->toDateTimeString(),
                'last_error' => null,
                'tss_state' => $state,
            ]);

            return [
                'ok' => true,
                'tss_id' => $cfg->tss_id,
                'client_id' => $cfg->client_id,
                'tss_state' => $state,
            ];
        } catch (\Throwable $e) {
            $cfg->last_error = $e->getMessage();
            $cfg->saveQuietly();

            $this->writeMeta($cfg, [
                'provisioning_status' => 'failed',
                'last_error' => $e->getMessage(),
            ]);

            Log::error('[Fiskaly] provisioning failed', [
                'location_id' => $cfg->location_id,
                'message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
