<?php

namespace Admin\Services;

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

        $normalized = $this->normalizeFloors($floors);
        if (!$normalized) {
            throw new \InvalidArgumentException('No valid Floor/Table layout was selected.');
        }

        return $this->ensureFloorsAndTables($locationId, $normalized);
    }
}
