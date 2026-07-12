<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;

require_once __DIR__.'/concerns/PmdWaiterPosRenderEndpoints.php';
require_once __DIR__.'/concerns/PmdWaiterPosSaveEndpoint.php';
require_once __DIR__.'/concerns/PmdWaiterPosPaymentBasicEndpoints.php';
require_once __DIR__.'/concerns/PmdWaiterPosSettleEndpoint.php';
require_once __DIR__.'/concerns/PmdWaiterPosTerminalEndpoint.php';
require_once __DIR__.'/concerns/PmdWaiterPosBootstrapConcern.php';
require_once __DIR__.'/concerns/PmdWaiterPosOrderPersistenceConcern.php';
require_once __DIR__.'/concerns/PmdWaiterPosOrderScopeConcern.php';
require_once __DIR__.'/concerns/PmdWaiterPosPaymentSummaryConcern.php';
require_once __DIR__.'/concerns/PmdWaiterPosPaymentAllocationConcern.php';
require_once __DIR__.'/concerns/PmdWaiterPosPaymentTransactionConcern.php';

/**
 * PayMyDine Waiter POS V2.
 *
 * The V1 class name is retained for safe selective deployment. The production
 * implementation is intentionally split into focused concerns so ordering,
 * settlement and provider integration stay reviewable.
 */
class PmdWaiterPosV1 extends AdminController
{
    use \Admin\Controllers\Concerns\PmdWaiterPosRenderEndpoints;
    use \Admin\Controllers\Concerns\PmdWaiterPosSaveEndpoint;
    use \Admin\Controllers\Concerns\PmdWaiterPosPaymentBasicEndpoints;
    use \Admin\Controllers\Concerns\PmdWaiterPosSettleEndpoint;
    use \Admin\Controllers\Concerns\PmdWaiterPosTerminalEndpoint;
    use \Admin\Controllers\Concerns\PmdWaiterPosBootstrapConcern;
    use \Admin\Controllers\Concerns\PmdWaiterPosOrderPersistenceConcern;
    use \Admin\Controllers\Concerns\PmdWaiterPosOrderScopeConcern;
    use \Admin\Controllers\Concerns\PmdWaiterPosPaymentSummaryConcern;
    use \Admin\Controllers\Concerns\PmdWaiterPosPaymentAllocationConcern;
    use \Admin\Controllers\Concerns\PmdWaiterPosPaymentTransactionConcern;

    protected $requiredPermissions = 'Admin.Orders';
}
