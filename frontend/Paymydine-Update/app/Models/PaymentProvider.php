<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentProvider extends Model
{
    protected $table = 'payment_providers';

    protected $fillable = [
        'code',
        'name',
        'status',
        'mode',
        'supports_card',
        'supports_apple_pay',
        'supports_google_pay',
        'supports_paypal',
        'supports_cash',
        'supports_hosted_checkout',
        'config',
    ];

    protected $casts = [
        'status' => 'boolean',
        'supports_card' => 'boolean',
        'supports_apple_pay' => 'boolean',
        'supports_google_pay' => 'boolean',
        'supports_paypal' => 'boolean',
        'supports_cash' => 'boolean',
        'supports_hosted_checkout' => 'boolean',
        'config' => 'array',
    ];
}
