<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Models\Reservations_model;

/**
 * Full-year operations calendar.
 *
 * Route intentionally follows the requested spelling: /admin/calender.
 */
class Calender extends \Admin\Classes\AdminController
{
    public $requiredPermissions = ['Admin.Reservations'];

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('reservations', 'sales');
    }

    public function index()
    {
        $year = (int)request()->query('year', now()->year);
        $year = max(2020, min(2100, $year));

        $this->pageTitle = 'Year Calendar';
        $this->vars['calendarYear'] = $year;
        $this->vars['calendarReservations'] = Reservations_model::query()
            ->whereYear('reserve_date', $year)
            ->orderBy('reserve_date')
            ->orderBy('reserve_time')
            ->get();

        // Public/event data can be injected here later from a tenant-managed feed.
        $this->vars['calendarEvents'] = [];
        $this->vars['calendarReports'] = [];
    }
}
