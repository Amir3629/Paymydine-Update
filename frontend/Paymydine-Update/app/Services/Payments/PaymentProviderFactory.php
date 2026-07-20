<?php

namespace App\Services\Payments;

use App\Services\Payments\Providers\StripeProvider;
use App\Services\Payments\Providers\WorldlineProvider;
use App\Services\Payments\Providers\SumUpProvider;
use App\Services\Payments\Providers\PaypalProvider;
use InvalidArgumentException;

class PaymentProviderFactory
{
    public static function make(string $code)
    {
        switch (strtolower(trim($code))) {
            case 'stripe':
                return new StripeProvider();
            case 'worldline':
                return new WorldlineProvider();
            case 'sumup':
                return new SumUpProvider();
            case 'paypal':
                return new PaypalProvider();
            default:
                throw new InvalidArgumentException("Unknown payment provider: {$code}");
        }
    }
}
