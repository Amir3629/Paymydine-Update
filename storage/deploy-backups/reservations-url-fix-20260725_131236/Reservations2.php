<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Models\Reservations_model;
use Admin\Models\Statuses_model;
use Igniter\Flame\Exception\ApplicationException;

/**
 * Clean Reservations workspace.
 *
 * This controller intentionally keeps the proven native reservation model,
 * permissions and list configuration, while rendering a completely isolated
 * index page at /admin/reservations2.
 */
class Reservations2 extends Reservations
{
    public function __construct()
    {
        parent::__construct();

        // Keep the existing Reservations item highlighted in the shared admin UI.
        AdminMenu::setContext('reservations', 'sales');
    }

    public function index()
    {
        $this->asExtension('ListController')->index();

        $this->vars['statusesOptions'] = Statuses_model::getDropdownOptionsForReservation();
        $this->vars['pmdReservations2'] = Reservations_model::query()
            ->orderBy('reservation_id', 'desc')
            ->limit(250)
            ->get();
    }

    public function index_onDelete()
    {
        if (!$this->getUser()->hasPermission('Admin.DeleteReservations')) {
            throw new ApplicationException(lang('admin::lang.alert_user_restricted'));
        }

        return $this->asExtension('Admin\Actions\ListController')->index_onDelete();
    }
}
