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

            // PMD_QPOS_TERMINAL_INVENTORY_V139_EFFECTIVE_TRAIT
            // This is the method explicitly selected in PmdWaiterPosV1.
            // Use only active, market-allowed real devices for this location.
            $locationId = 0;
            try {
                $locationId = (int)\Admin\Facades\AdminLocation::getId();
            } catch (\Throwable $ignored) {
            }

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

                    if (in_array('location_id', $columns, true)) {
                        $query->where(function ($scope) use ($locationId) {
                            $scope->whereNull('location_id');
                            if ($locationId > 0) {
                                $scope->orWhere('location_id', $locationId);
                            }
                        });
                    }

                    foreach ($query->get() as $terminal) {
                        if (
                            $providerCode === 'vr_payment'
                            && str_starts_with(
                                strtoupper(trim((string)($terminal->reader_id ?? ''))),
                                'PMD-VR-SIM-'
                            )
                        ) {
                            continue;
                        }
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

        // PMD_QPOS_REAL_TERMINALS_ONLY_V139
        // Legacy VR simulator fallback removed from the live Card picker.

        // Worldline terminals are sourced from terminal_devices above.
        return $providers;
    }
}
