<?php

namespace Admin\Controllers\Concerns;

use Admin\Models\Payments_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

trait PmdWaiterPosTerminalProvidersConcern
{
    protected function terminalProviders(): array
    {
        $providers = [];

        // SumUp terminals are hardware records. Only active readers with a real
        // reader_id are offered to the waiter POS.
        if (Schema::hasTable('terminal_devices')) {
            try {
                $sumup = DB::table('terminal_devices')
                    ->whereRaw('LOWER(provider_code) = ?', ['sumup'])
                    ->where('is_active', 1)
                    ->whereNotNull('reader_id')
                    ->where('reader_id', '!=', '')
                    ->orderBy('terminal_device_id')
                    ->get();

                foreach ($sumup as $terminal) {
                    $label = trim((string)($terminal->reader_label ?? ''));
                    $providers[] = [
                        'provider_code' => 'sumup',
                        'terminal_device_id' => (int)$terminal->terminal_device_id,
                        'reader_id' => (string)$terminal->reader_id,
                        'name' => $label !== '' ? 'SumUp · '.$label : 'SumUp terminal',
                    ];
                }
            } catch (\Throwable $ignored) {
            }
        }

        // Keep the existing provider-level terminal entries for future certified
        // Worldline / VR implementations.
        try {
            $legacy = Payments_model::query()
                ->where('status', 1)
                ->whereIn('code', ['worldline', 'vr_payment'])
                ->orderBy('priority')
                ->get();

            foreach ($legacy as $row) {
                $code = strtolower((string)$row->code);
                $providers[] = [
                    'provider_code' => $code,
                    'terminal_device_id' => null,
                    'reader_id' => null,
                    'name' => (string)($row->name ?: strtoupper(str_replace('_', ' ', $code))),
                ];
            }
        } catch (\Throwable $ignored) {
        }

        return $providers;
    }
}
