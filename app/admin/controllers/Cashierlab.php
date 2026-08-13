<?php

namespace Admin\Controllers;

use Admin\Classes\PmdCleanWorkspaceControllerV1;

/** Clean Cashier workspace: shared shell + cashier finance KPIs + Floor. */
class Cashierlab extends PmdCleanWorkspaceControllerV1
{
    protected $requiredPermissions = 'Admin.Dashboard';

    protected function pmdWorkspaceKey(): string
    {
        return 'cashier';
    }

    protected function pmdKpiMode(): string
    {
        return 'cashier';
    }

    protected function pmdKpiDefaults(): array
    {
        return [
            'open_bills',
            'average_settlement_time',
            'failed_transactions',
            'cash_percent',
        ];
    }
}
