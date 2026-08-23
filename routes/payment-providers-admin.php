<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['web'])
    ->prefix(config('system.adminUri', 'admin'))
    ->group(function () {
        Route::get(
            'payment-providers',
            [\Admin\Controllers\PaymentProviders::class, 'index']
        )->name('pmd.payment-providers.index');

        Route::get(
            'payment-providers/state',
            [\Admin\Controllers\PaymentProviders::class, 'state']
        )->name('pmd.payment-providers.state');
    });
