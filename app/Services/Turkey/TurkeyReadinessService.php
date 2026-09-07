<?php

namespace App\Services\Turkey;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class TurkeyReadinessService
{
    public function __construct(
        private ?TurkeyTenantContext $context = null,
        private ?TurkeyTenantProvisioningService $provisioning = null,
        private ?TurkeyIntegrationRegistry $registry = null
    ) {
        $this->context = $context ?: new TurkeyTenantContext();
        $this->provisioning = $provisioning ?: new TurkeyTenantProvisioningService();
        $this->registry = $registry ?: new TurkeyIntegrationRegistry();
    }

    public function report(?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $locationId = (int)($state['location_id'] ?? 0);
        $tables = [];
        foreach ($this->provisioning->requiredTables() as $table) {
            $tables[$table] = Schema::hasTable($table);
        }

        $integrationRows = [];
        if (Schema::hasTable('pmd_tr_integrations')) {
            $rows = DB::table('pmd_tr_integrations')->where('location_id', $locationId ?: null)->get();
            foreach ($rows as $row) {
                $integrationRows[(string)$row->code] = [
                    'status' => (string)$row->status,
                    'enabled' => (bool)$row->enabled,
                    'production_ready' => (bool)$row->production_ready,
                    'last_verified_at' => $row->last_verified_at,
                    'last_error' => $row->last_error,
                ];
            }
        }

        $ynOkcReady = (bool)($integrationRows['yn_okc']['production_ready'] ?? false);
        $gmoebysReady = (bool)($integrationRows['gmoebys']['production_ready'] ?? false);
        $fiscalReady = $ynOkcReady || $gmoebysReady;
        $acquirerReady = (bool)($integrationRows['acquirer']['production_ready'] ?? false);

        $blockers = [];
        if (!$fiscalReady) {
            $blockers[] = 'No Türkiye fiscal route is production-ready (YN ÖKC or approved GMÖEBYS).';
        }
        if (!$acquirerReady) {
            $blockers[] = 'acquirer is not production-ready.';
        }
        if (in_array(false, $tables, true)) {
            $blockers[] = 'Türkiye tenant schema is incomplete.';
        }

        return [
            'country_code' => 'TR',
            'location_id' => $locationId ?: null,
            'schema_ready' => !in_array(false, $tables, true),
            'tables' => $tables,
            'integrations' => $integrationRows,
            'fiscal' => [
                'ready' => $fiscalReady,
                'yn_okc_ready' => $ynOkcReady,
                'gmoebys_ready' => $gmoebysReady,
                'accepted_modes' => ['yn_okc', 'gmoebys'],
            ],
            'required_for_pilot' => [
                'fiscal_any_of' => ['yn_okc', 'gmoebys'],
                'payment' => ['acquirer'],
            ],
            'recommended_for_pilot' => ['e_document', 'yemeksepeti'],
            'pilot_ready' => $blockers === [],
            'blockers' => $blockers,
            'note' => 'pilot_ready only reflects PMD-recorded configuration/evidence. Real Turkish fiscal/payment approval from the selected bank/PSP/device/GMÖEBYS provider remains authoritative.',
        ];
    }
}
