<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

/**
 * Gift Card Transaction Model
 * Tracks all gift card transactions (purchases, reloads, redemptions, refunds)
 */
class GiftCardTransaction_model extends Model
{
    /**
     * @var string The database table name
     */
    protected $table = 'gift_card_transactions';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'transaction_id';

    /**
     * @var array Fillable fields
     */
    protected $fillable = [
        'coupon_id',
        'customer_id',
        'order_id',
        'transaction_type',
        'amount',
        'balance_before',
        'balance_after',
        'payment_method',
        'payment_reference',
        'notes',
        'staff_id',
    ];

    /**
     * @var array Cast attributes
     */
    protected $casts = [
        'transaction_id' => 'integer',
        'coupon_id' => 'integer',
        'customer_id' => 'integer',
        'order_id' => 'integer',
        'amount' => 'float',
        'balance_before' => 'float',
        'balance_after' => 'float',
        'staff_id' => 'integer',
    ];

    /**
     * @var bool Enable timestamps
     */
    public $timestamps = true;

    /**
     * @var array Model relationships
     */
    public $relation = [
        'belongsTo' => [
            'coupon' => ['Admin\Models\Coupons_model', 'foreignKey' => 'coupon_id'],
            'customer' => ['Admin\Models\Customers_model', 'foreignKey' => 'customer_id'],
            'order' => ['Admin\Models\Orders_model', 'foreignKey' => 'order_id'],
            'staff' => ['Admin\Models\Staffs_model', 'foreignKey' => 'staff_id'],
        ],
    ];

    //
    // Scopes
    //

    /**
     * Scope to get purchase transactions
     */
    public function scopePurchases($query)
    {
        return $query->where('transaction_type', 'purchase');
    }

    /**
     * Scope to get reload transactions
     */
    public function scopeReloads($query)
    {
        return $query->where('transaction_type', 'reload');
    }

    /**
     * Scope to get redemption transactions
     */
    public function scopeRedemptions($query)
    {
        return $query->where('transaction_type', 'redemption');
    }

    /**
     * Scope to get refund transactions
     */
    public function scopeRefunds($query)
    {
        return $query->where('transaction_type', 'refund');
    }

    /**
     * Scope to get transactions for a specific coupon
     */
    public function scopeForCoupon($query, $couponId)
    {
        return $query->where('coupon_id', $couponId);
    }

    /**
     * Scope to get transactions for a specific customer
     */
    public function scopeForCustomer($query, $customerId)
    {
        return $query->where('customer_id', $customerId);
    }

    //
    // Helpers
    //

    /**
     * Get formatted transaction type
     */
    public function getTransactionTypeNameAttribute()
    {
        $types = [
            'purchase' => 'Purchase',
            'reload' => 'Reload',
            'redemption' => 'Redemption',
            'refund' => 'Refund',
            'adjustment' => 'Adjustment',
        ];

        return $types[$this->transaction_type] ?? $this->transaction_type;
    }

    /**
     * Get formatted amount with sign
     */
    public function getFormattedAmountAttribute()
    {
        $sign = in_array($this->transaction_type, ['purchase', 'reload']) ? '+' : '-';
        return $sign . currency_format(abs($this->amount));
    }

    /**
     * Check if transaction is credit (increases balance)
     */
    public function isCredit()
    {
        return in_array($this->transaction_type, ['purchase', 'reload', 'refund']);
    }

    /**
     * Check if transaction is debit (decreases balance)
     */
    public function isDebit()
    {
        return $this->transaction_type === 'redemption';
    }

    //
    // Static Methods
    //

    /**
     * Create a purchase transaction
     */
    public static function createPurchase($couponId, $amount, $customerId = null, $paymentMethod = null, $paymentReference = null)
    {
        $coupon = Coupons_model::find($couponId);
        if (!$coupon) {
            return false;
        }

        return self::create([
            'coupon_id' => $couponId,
            'customer_id' => $customerId,
            'transaction_type' => 'purchase',
            'amount' => $amount,
            'balance_before' => 0,
            'balance_after' => $amount,
            'payment_method' => $paymentMethod,
            'payment_reference' => $paymentReference,
            'notes' => 'Gift card purchased',
        ]);
    }

    /**
     * Create a reload transaction
     */
    public static function createReload($couponId, $amount, $customerId = null, $paymentMethod = null, $paymentReference = null)
    {
        $coupon = Coupons_model::find($couponId);
        if (!$coupon) {
            return false;
        }

        $balanceBefore = $coupon->current_balance ?? 0;
        $balanceAfter = $balanceBefore + $amount;

        return self::create([
            'coupon_id' => $couponId,
            'customer_id' => $customerId,
            'transaction_type' => 'reload',
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'payment_method' => $paymentMethod,
            'payment_reference' => $paymentReference,
            'notes' => 'Balance reloaded',
        ]);
    }

    /**
     * Create a redemption transaction
     */
    public static function createRedemption($couponId, $amount, $orderId = null, $customerId = null)
    {
        $coupon = Coupons_model::find($couponId);
        if (!$coupon) {
            return false;
        }

        $balanceBefore = $coupon->current_balance ?? 0;
        $balanceAfter = $balanceBefore - $amount;

        return self::create([
            'coupon_id' => $couponId,
            'customer_id' => $customerId,
            'order_id' => $orderId,
            'transaction_type' => 'redemption',
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'notes' => 'Gift card redeemed',
        ]);
    }

    /**
     * Create a refund transaction
     */
    public static function createRefund($couponId, $amount, $orderId = null, $customerId = null, $notes = null)
    {
        $coupon = Coupons_model::find($couponId);
        if (!$coupon) {
            return false;
        }

        $balanceBefore = $coupon->current_balance ?? 0;
        $balanceAfter = $balanceBefore + $amount;

        return self::create([
            'coupon_id' => $couponId,
            'customer_id' => $customerId,
            'order_id' => $orderId,
            'transaction_type' => 'refund',
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'notes' => $notes ?? 'Gift card refunded',
        ]);
    }
}

