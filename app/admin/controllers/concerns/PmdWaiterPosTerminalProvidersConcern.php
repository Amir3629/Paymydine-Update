<?php

namespace Admin\Controllers\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_WAITER_REAL_TERMINALS_R1
 *
 * Waiter POS exposes concrete provider terminal identifiers only. SumUp and VR
 * Payment are synced into terminal_devices. Worldline Terminal API uses the
 * provider-issued terminal ID stored in the Worldline provider configuration.
 */
trait PmdWaiterPosTerminalProvidersConcern
{
    protected function terminalProviders(): array
    {
        $providers = [];

        if (Schema::hasTable('terminal_devices')) {
            $columns = Schema::getColumnListing('terminal_devices');

            foreach (['sumup', 'vr_payment'] as $providerCode) {
                try {
                    $query = DB::table('terminal_devices')
                        ->whereRaw('LOWER(provider_code) = ?', [$providerCode])
                        ->where('is_active', 1)
                        ->whereNotNull('reader_id')
                        ->where('reader_id', '!=', '')
                        ->orderBy('terminal_device_id');

                    foreach ($query->get() as $terminal) {
                        $label = trim((string)($terminal->reader_label ?? ''));
                        $status = strtolower(trim((string)($terminal->terminal_status ?? 'unknown')));
                        $pairing = strtolower(trim((string)($terminal->pairing_state ?? 'unknown')));
                        $providerTerminalId = in_array('provider_terminal_id', $columns, true)
                            ? trim((string)($terminal->provider_terminal_id ?? ''))
                            : '';

                        $providers[] = [
                            'provider_code' => $providerCode,
                            'terminal_device_id' => (int)$terminal->terminal_device_id,
                            'provider_terminal_id' => $providerTerminalId !== '' ? $providerTerminalId : null,
                            'reader_id' => (string)$terminal->reader_id,
                            'name' => $label !== ''
                                ? $label
                                : ($providerCode === 'sumup' ? 'SumUp terminal' : 'VR Payment terminal'),
                            'terminal_status' => $status,
                            'pairing_state' => $pairing,
                            'environment' => in_array('environment', $columns, true)
                                ? (string)($terminal->environment ?? '')
                                : '',
                        ];
                    }
                } catch (\Throwable $ignored) {
                }
            }
        }

        // Worldline Terminal API is cloud-to-cloud and identifies a terminal by
        // the provider-issued terminal UUID. Expose it only when the terminal ID
        // and separate Terminal API bearer token are both configured.
        try {
            $worldline = \Admin\Models\Payments_model::query()
                ->where('code', 'worldline')
                ->where('status', 1)
                ->first();
            if ($worldline) {
                $config = method_exists($worldline, 'getConfigData')
                    ? (array)$worldline->getConfigData()
                    : (array)$worldline->data;
                $terminalId = trim((string)($config['terminal_id'] ?? ''));
                $terminalToken = trim((string)($config['terminal_api_token'] ?? env('WORLDLINE_TERMINAL_API_TOKEN') ?? ''));
                if ($terminalId !== '' && $terminalToken !== '') {
                    $providers[] = [
                        'provider_code' => 'worldline',
                        'terminal_device_id' => null,
                        'provider_terminal_id' => $terminalId,
                        'reader_id' => $terminalId,
                        'name' => trim((string)($config['terminal_label'] ?? '')) ?: 'Worldline terminal',
                        'terminal_status' => 'configured',
                        'pairing_state' => 'registered',
                        'environment' => (string)($config['terminal_environment'] ?? 'test'),
                    ];
                }
            }
        } catch (\Throwable $ignored) {
        }

        return $providers;
    }
}
