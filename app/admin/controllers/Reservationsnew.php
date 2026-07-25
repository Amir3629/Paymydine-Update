<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;

/**
 * Isolated Reservations workspace at /admin/reservationsnew.
 *
 * Phase 1 deliberately reuses the proven Reservations2 data/controller
 * behaviour while rendering through a separate view. This keeps the live
 * /admin/reservations2 route untouched while the new runtime is rebuilt.
 */
class Reservationsnew extends Reservations2
{
    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('reservations', 'sales');
    }
}
