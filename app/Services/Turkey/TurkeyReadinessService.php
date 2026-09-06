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

        $requiredForPilot = ['yn_okc', 'acquirer'];
        $recommendedForPilot = ['e_document', 'yemeksepeti'];
        $blockers = [];
        foreach ($requiredForPilot as $code) {
            if (!(bool)($integrationRows[$code]['production_ready'] ?? false)) {
                $blockers[] = $code.' is not production-ready.';
            }
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
            'required_for_pilot' => $requiredForPilot,
            'recommended_for_pilot' => $recommendedForPilot,
            'pilot_ready' => $blockers === [],
            'blockers' => $blockers,
            'note' => 'pilot_ready only reflects PMD-recorded configuration/evidence. Real fiscal/payment approval remains authoritative at the selected Turkish partner/manufacturer.',
        ];
    }
}
