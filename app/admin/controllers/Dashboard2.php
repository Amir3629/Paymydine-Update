<?php

namespace Admin\Controllers;

/**
 * Reservations2 data/runtime with a Dashboard2-only shell wrapper.
 */
class Dashboard2 extends Reservations2
{
    public function index()
    {
        parent::index();

        return $this->makeView('dashboard2_reservations2_exact');
    }
}
