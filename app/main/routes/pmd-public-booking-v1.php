<?php

use App\Http\Controllers\PmdPublicBookingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| PMD Public Booking V1
|--------------------------------------------------------------------------
| Tenant-hosted, login-free reservation surface. These routes are loaded
| before the public Next.js catch-all so /book stays PHP/TastyIgniter-native.
|--------------------------------------------------------------------------
*/

Route::get('/book', [PmdPublicBookingController::class, 'show'])
    ->name('pmd.public-booking.show');

Route::get('/book/availability', [PmdPublicBookingController::class, 'availability'])
    ->middleware('throttle:120,1')
    ->name('pmd.public-booking.availability');

Route::post('/book', [PmdPublicBookingController::class, 'store'])
    ->middleware('throttle:20,1')
    ->name('pmd.public-booking.store');

Route::get('/booking', static fn () => redirect('/book', 302));
Route::get('/reserve', static fn () => redirect('/book', 302));
