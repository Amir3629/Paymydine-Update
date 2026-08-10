<?php

namespace Admin\Controllers;

/**
 * Dedicated conflict-free controller for the Owner "Tips summary" report.
 *
 * Keeping this as its own index action avoids any ambiguity with
 * Dashboard2::tips(Carbon $start, Carbon $end).
 */
class Pmdreporttips extends Pmdreports
{
    public function index()
    {
        return $this->show('tips');
    }
}
