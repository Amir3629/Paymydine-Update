<?php

namespace Admin\Services;

use Admin\Models\Tables_model;

/**
 * Narrow bridge for the AI import workspace.
 * Reuses the same floor/table creation authority as tenant Quick Setup without
 * completing onboarding, touching staff/KDS/theme, or deleting existing data.
 */
final class PmdAiImportTableService extends PmdTenantQuickSetupServiceV2
{
    public function importDetectedLayout(array $floors): array
    {
        $locationId = $this->locationId();
        if ($locationId < 1) {
            throw new \RuntimeException('Active restaurant location is unavailable.');
        }

        /*
         * This path is for initial migration only. Quick Setup intentionally
         * adds tables rather than replacing them, so refuse once real guest
         * tables already exist. System Cashier/Delivery tables do not count.
         */
        $existingGuestTables = Tables_model::query()
            ->whereRaw("LOWER(TRIM(COALESCE(table_name, ''))) NOT IN (?, ?)", ['cashier', 'delivery'])
            ->count();

        if ($existingGuestTables > 0) {
            throw new \RuntimeException(
                'Floor/Table AI import is only available before guest tables are created. Existing tables were not changed.'
            );
        }

        $normalized = $this->normalizeFloors($floors);
        if (!$normalized) {
            throw new \InvalidArgumentException('No valid Floor/Table layout was selected.');
        }

        return $this->ensureFloorsAndTables($locationId, $normalized);
    }
}
