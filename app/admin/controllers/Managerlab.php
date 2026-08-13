<?php

namespace Admin\Controllers;

use Admin\Classes\PmdCleanWorkspaceControllerV1;

/** Clean Manager workspace: shared shell + operations-focused KPI defaults + Floor. */
class Managerlab extends PmdCleanWorkspaceControllerV1
{
    protected $requiredPermissions = 'Admin.Dashboard';

    protected function pmdWorkspaceKey(): string
    {
        return 'manager';
    }

    protected function pmdKpiMode(): string
    {
        return 'owner';
    }

    protected function pmdKpiDefaults(): array
    {
        return [
            'revenue',
            'guests',
            'occupancy',
            'kitchen',
        ];
    }
}
