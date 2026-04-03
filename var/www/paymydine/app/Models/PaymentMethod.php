<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    protected $table = 'payment_methods';

    protected $fillable = [
        'code',
        'name',
        'status',
        'sort_order',
        'provider_code',
        'meta',
    ];

    protected $casts = [
        'status' => 'boolean',
        'meta' => 'array',
    ];

    public function provider()
    {
        return $this->belongsTo(PaymentProvider::class, 'provider_code', 'code');
    }
}
