<?php

namespace Admin\Controllers;

use Admin\Classes\PmdCleanWorkspaceControllerV1;

/** Clean Accountant workspace: shared shell + accounting KPIs, intentionally no Floor. */
class Accountantlab extends PmdCleanWorkspaceControllerV1
{
    protected $requiredPermissions = 'Admin.Dashboard';

    protected function pmdWorkspaceKey(): string
    {
        return 'accountant';
    }

    protected function pmdKpiMode(): string
    {
        return 'accountant';
    }

    protected function pmdKpiDefaults(): array
    {
        return [
            'vat_month',
            'gross_to_net',
            'cash_percent',
            'average_checks',
        ];
    }

    protected function pmdUsesFloor(): bool
    {
        return false;
    }
}
