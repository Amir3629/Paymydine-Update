<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Models\Reservations_model;
use Admin\Models\Statuses_model;
use Igniter\Flame\Exception\ApplicationException;

/**
 * Clean Reservations workspace.
 */
class Reservations2 extends Reservations
{
    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('reservations', 'sales');
    }

    public function index()
    {
        // Only redirect when the visitor directly opens the old URL.
        // When Reservations.php delegates here, the request URL is already
        // /admin/reservations, so the real page renders below.
        if (request()->is('admin/reservations2')) {
            return redirect(admin_url('reservations'));
        }

        $this->asExtension('ListController')->index();

        $this->vars['statusesOptions']
            = Statuses_model::getDropdownOptionsForReservation();

        $this->vars['pmdReservations2']
            = Reservations_model::query()
                ->orderBy('reservation_id', 'desc')
                ->limit(250)
                ->get();
    }

    public function index_onDelete()
    {
        if (!$this->getUser()->hasPermission('Admin.DeleteReservations')) {
            throw new ApplicationException(
                lang('admin::lang.alert_user_restricted')
            );
        }

        return $this
            ->asExtension('Admin\Actions\ListController')
            ->index_onDelete();
    }
}
