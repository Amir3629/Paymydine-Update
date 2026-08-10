<?php

namespace Admin\Controllers;

/**
 * Dedicated conflict-free controller for the Owner "Order channels" report.
 *
 * Keeping this as its own index action avoids any ambiguity with
 * Dashboard2::channels(Carbon $start, Carbon $end).
 */
class Pmdreportchannels extends Pmdreports
{
    public function index()
    {
        return $this->show('channels');
    }
}
