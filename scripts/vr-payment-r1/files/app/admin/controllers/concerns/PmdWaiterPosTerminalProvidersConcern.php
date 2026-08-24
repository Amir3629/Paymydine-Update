<?php

namespace Admin\Controllers\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_WAITER_REAL_TERMINALS_R1
 *
 * Waiter POS only exposes concrete synced terminal devices. A provider record is
 * never presented as if it were a physical terminal.
 */
trait PmdWaiterPosTerminalProvidersConcern
{
    protected function terminalProviders(): array
    {
        if (!Schema::hasTable('terminal_devices')) return [];

        $providers = [];
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

        return $providers;
    }
}
