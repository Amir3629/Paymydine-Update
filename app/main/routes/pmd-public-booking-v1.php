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

Route::get('/book/date-statuses', [PmdPublicBookingController::class, 'dateStatuses'])
    ->middleware('throttle:120,1')
    ->name('pmd.public-booking.date-statuses');

Route::post('/book', [PmdPublicBookingController::class, 'store'])
    ->middleware('throttle:20,1')
    ->name('pmd.public-booking.store');

Route::get('/book/manage', [PmdPublicBookingController::class, 'manageLookupPage'])
    ->name('pmd.public-booking.manage.lookup');

Route::post('/book/manage', [PmdPublicBookingController::class, 'manageLookup'])
    ->middleware('throttle:20,1')
    ->name('pmd.public-booking.manage.lookup.submit');

Route::get('/book/manage/{hash}', [PmdPublicBookingController::class, 'manageShow'])
    ->where('hash', '[A-Fa-f0-9]{32}')
    ->name('pmd.public-booking.manage.show');

Route::get('/book/manage/{hash}/availability', [PmdPublicBookingController::class, 'manageAvailability'])
    ->where('hash', '[A-Fa-f0-9]{32}')
    ->middleware('throttle:120,1')
    ->name('pmd.public-booking.manage.availability');

Route::post('/book/manage/{hash}', [PmdPublicBookingController::class, 'manageUpdate'])
    ->where('hash', '[A-Fa-f0-9]{32}')
    ->middleware('throttle:20,1')
    ->name('pmd.public-booking.manage.update');

Route::post('/book/manage/{hash}/cancel', [PmdPublicBookingController::class, 'manageCancel'])
    ->where('hash', '[A-Fa-f0-9]{32}')
    ->middleware('throttle:10,1')
    ->name('pmd.public-booking.manage.cancel');

Route::get('/booking', static fn () => redirect('/book', 302));
Route::get('/reserve', static fn () => redirect('/book', 302));
