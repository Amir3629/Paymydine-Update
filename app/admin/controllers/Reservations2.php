<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Reservations_model;
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
    /**
     * The custom reservations workspace has no media inputs.
     */
    public $suppressMediaManager = true;

    public function __construct()
    {
        parent::__construct();

        // Keep the existing Reservations item highlighted in the shared admin UI.
        AdminMenu::setContext('reservations', 'sales');
    }

    public function index()
    {
        $pageTitle = lang('admin::lang.reservations.text_title');
        Template::setTitle($pageTitle);
        Template::setHeading($pageTitle);

        // This page renders its own floor workspace. Building the native list
        // creates unused List, Filter, Calendar and Sortable widgets/assets.
        $this->vars['pmdReservations2'] =
            Reservations_model::query()
                ->orderBy('reservation_id', 'desc')
                ->orderBy('reserve_date')
                ->orderBy('reserve_time')
                ->limit(1500)
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
