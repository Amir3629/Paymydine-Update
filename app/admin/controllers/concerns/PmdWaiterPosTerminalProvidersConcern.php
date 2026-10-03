<?php

namespace Admin\Controllers\Concerns;

use Admin\Models\Terminal_devices_model;
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

            // PMD_SQUARE_TERMINAL_CANADA_R10_MARKET_INVENTORY
            $allowedProviderCodes = array_keys(Terminal_devices_model::listProviderOptions());
            foreach ($allowedProviderCodes as $providerCode) {
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
                                : ($providerCode === 'sumup' ? 'SumUp terminal' : ($providerCode === 'worldline' ? 'Worldline terminal' : ($providerCode === 'square' ? 'Square Terminal' : 'VR Payment terminal'))),
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

        // PMD_VR_SIM_VISIBILITY_R2_20260905
        // Always expose PMD's own TEST-only VR simulator rows to Waiter/Cashier POS,
        // even if the location market context has not resolved yet. Real provider
        // terminals are still handled exclusively by the market-gated loop above.
        try {
            $existingIds = array_map(
                static fn ($row): int => (int)($row['terminal_device_id'] ?? 0),
                $providers
            );

            $simulatorQuery = DB::table('terminal_devices')
                ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
                ->where('is_active', 1)
                ->where('reader_id', 'like', 'PMD-VR-SIM-%')
                ->whereNotNull('reader_id')
                ->where('reader_id', '!=', '')
                ->orderBy('terminal_device_id');

            if (in_array('environment', $columns, true)) {
                $simulatorQuery->whereRaw("LOWER(COALESCE(environment, 'test')) = ?", ['test']);
            }

            foreach ($simulatorQuery->get() as $terminal) {
                $terminalDeviceId = (int)($terminal->terminal_device_id ?? 0);
                if ($terminalDeviceId <= 0 || in_array($terminalDeviceId, $existingIds, true)) {
                    continue;
                }

                $label = trim((string)($terminal->reader_label ?? ''));
                $status = strtolower(trim((string)($terminal->terminal_status ?? 'online')));
                $pairing = strtolower(trim((string)($terminal->pairing_state ?? 'paired')));

                $providers[] = [
                    'provider_code' => 'vr_payment',
                    'terminal_device_id' => $terminalDeviceId,
                    'provider_terminal_id' => null,
                    'reader_id' => (string)$terminal->reader_id,
                    'name' => $label !== '' ? $label : 'PMD VR Simulator',
                    'terminal_status' => $status !== '' ? $status : 'online',
                    'pairing_state' => $pairing !== '' ? $pairing : 'paired',
                    'environment' => in_array('environment', $columns, true)
                        ? (string)($terminal->environment ?? 'test')
                        : 'test',
                ];
            }
        } catch (\Throwable $ignored) {
        }

        // Worldline terminals are sourced from terminal_devices above.
        return $providers;
    }
}
