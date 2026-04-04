<?php

namespace Admin\Models;

use Carbon\Carbon;
use Igniter\Flame\Auth\Models\User;
use Igniter\Flame\Database\Model;
use Igniter\Flame\Location\Models\AbstractLocation;

/**
 * Coupons Model Class
 * @deprecated remove before v4. Added for backward compatibility, see Igniter\Coupons\Models\Coupons_model
 */
class Coupons_model extends Model
{
    use \Admin\Traits\Locationable;

    const LOCATIONABLE_RELATION = 'locations';

    /**
     * @var string The database table name
     */
    protected $table = 'igniter_coupons';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'coupon_id';

    protected $timeFormat = 'H:i';

    public $timestamps = true;

    protected $casts = [
        'discount' => 'float',
        'min_total' => 'float',
        'redemptions' => 'integer',
        'customer_redemptions' => 'integer',
        'status' => 'boolean',
        'period_start_date' => 'date',
        'period_end_date' => 'date',
        'fixed_date' => 'date',
        'fixed_from_time' => 'time',
        'fixed_to_time' => 'time',
        'recurring_from_time' => 'time',
        'recurring_to_time' => 'time',
        'order_restriction' => 'integer',
        // Gift card fields
        'initial_balance' => 'float',
        'current_balance' => 'float',
        'is_reloadable' => 'boolean',
        'is_purchasable' => 'boolean',
        'purchase_price' => 'float',
        'purchased_by' => 'integer',
        'purchase_date' => 'datetime',
        'first_use_date' => 'datetime',
        'last_use_date' => 'datetime',
        'is_transferable' => 'boolean',
        'is_digital' => 'boolean',
        'expiry_date' => 'datetime',
        'max_discount_cap' => 'float',
        'design_id' => 'integer',
    ];

    public $relation = [
        'hasMany' => [
            'history' => 'Admin\Models\Coupons_history_model',
            'transactions' => 'Admin\Models\GiftCardTransaction_model',
        ],
        'belongsTo' => [
            'design' => 'Admin\Models\GiftCardDesign_model',
            'purchaser' => ['Admin\Models\Customers_model', 'foreignKey' => 'purchased_by'],
        ],
        'morphToMany' => [
            'locations' => ['Admin\Models\Locations_model', 'name' => 'locationable'],
        ],
    ];

    public function getRecurringEveryOptions()
    {
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }

    //
    // Accessors & Mutators
    //

    public function getRecurringEveryAttribute($value)
    {
        return empty($value) ? [0, 1, 2, 3, 4, 5, 6] : explode(', ', $value);
    }

    public function setRecurringEveryAttribute($value)
    {
        $this->attributes['recurring_every'] = empty($value)
            ? null : implode(', ', $value);
    }

    public function getTypeNameAttribute($value)
    {
        return ($this->type == 'P') ? lang('admin::lang.menus.text_percentage') : lang('admin::lang.menus.text_fixed_amount');
    }

    public function getFormattedDiscountAttribute($value)
    {
        return ($this->type == 'P') ? round($this->discount).'%' : number_format($this->discount, 2);
    }

    //
    // Scopes
    //

    public function scopeIsEnabled($query)
    {
        return $query->where('status', '1');
    }

    //
    // Helpers
    //

    public function isFixed()
    {
        return $this->type == 'F';
    }

    public function discountWithOperand()
    {
        return ($this->isFixed() ? '-' : '-%').$this->discount;
    }

    public function minimumOrderTotal()
    {
        return $this->min_total ?: 0;
    }

    public function isExpired()
    {
        $now = Carbon::now();

        switch ($this->validity) {
            case 'forever':
                return false;
            case 'fixed':
                $start = $this->fixed_date->copy()->setTimeFromTimeString($this->fixed_from_time);
                $end = $this->fixed_date->copy()->setTimeFromTimeString($this->fixed_to_time);

                return !$now->between($start, $end);
            case 'period':
                return !$now->between($this->period_start_date, $this->period_end_date);
            case 'recurring':
                if (!in_array($now->format('w'), $this->recurring_every))
                    return true;

                $start = $now->copy()->setTimeFromTimeString($this->recurring_from_time);
                $end = $now->copy()->setTimeFromTimeString($this->recurring_to_time);

                return !$now->between($start, $end);
        }

        return false;
    }

    public function hasRestriction($orderType)
    {
        if (empty($this->order_restriction))
            return false;

        $orderTypes = [AbstractLocation::DELIVERY => 1, AbstractLocation::COLLECTION => 2];

        return array_get($orderTypes, $orderType, $orderType) != $this->order_restriction;
    }

    public function hasLocationRestriction($locationId)
    {
        if (!$this->locations || $this->locations->isEmpty())
            return false;

        $locationKeyColumn = $this->locations()->getModel()->qualifyColumn('location_id');

        return !$this->locations()->where($locationKeyColumn, $locationId)->exists();
    }

    public function hasReachedMaxRedemption()
    {
        return $this->redemptions && $this->redemptions <= $this->countRedemptions();
    }

    public function customerHasMaxRedemption(User $user)
    {
        return $this->customer_redemptions && $this->customer_redemptions <= $this->countCustomerRedemptions($user->getKey());
    }

    public function countRedemptions()
    {
        return $this->history()->isEnabled()->count();
    }

    public function countCustomerRedemptions($id)
    {
        return $this->history()->isEnabled()
            ->where('customer_id', $id)->count();
    }

    //
    // Gift Card & Voucher Methods
    //

    /**
     * Check if this is a gift card
     */
    public function isGiftCard()
    {
        return $this->card_type === 'gift_card';
    }

    /**
     * Check if this is a voucher
     */
    public function isVoucher()
    {
        return $this->card_type === 'voucher';
    }

    /**
     * Check if this is a credit/comp
     */
    public function isCredit()
    {
        return in_array($this->card_type, ['credit', 'comp']);
    }

    /**
     * Check if this is a regular coupon
     */
    public function isCoupon()
    {
        return $this->card_type === 'coupon' || empty($this->card_type);
    }

    /**
     * Get current balance
     */
    public function getBalance()
    {
        return $this->current_balance ?? 0;
    }

    /**
     * Get formatted balance
     */
    public function getFormattedBalanceAttribute()
    {
        return currency_format($this->getBalance());
    }

    /**
     * Check if card has sufficient balance
     */
    public function hasSufficientBalance($amount)
    {
        return $this->getBalance() >= $amount;
    }

    /**
     * Redeem amount from card
     */
    public function redeem($amount, $orderId = null, $customerId = null)
    {
        if (!$this->isGiftCard() && !$this->isCredit()) {
            return false;
        }

        if (!$this->hasSufficientBalance($amount)) {
            return false;
        }

        $balanceBefore = $this->current_balance;
        $this->current_balance -= $amount;

        if (!$this->first_use_date) {
            $this->first_use_date = now();
        }
        $this->last_use_date = now();
        $this->save();

        // Create transaction record
        GiftCardTransaction_model::createRedemption(
            $this->coupon_id,
            $amount,
            $orderId,
            $customerId
        );

        return true;
    }

    /**
     * Reload gift card balance
     */
    public function reloadBalance($amount, $paymentMethod = null, $paymentReference = null, $customerId = null)
    {
        if (!$this->is_reloadable) {
            return false;
        }

        $balanceBefore = $this->current_balance;
        $this->current_balance += $amount;
        $this->save();

        // Create transaction record
        GiftCardTransaction_model::createReload(
            $this->coupon_id,
            $amount,
            $customerId,
            $paymentMethod,
            $paymentReference
        );

        return true;
    }

    /**
     * Check if card is expired
     */
    public function isExpiredCard()
    {
        if (!$this->expiry_date) {
            return false;
        }

        return now()->greaterThan($this->expiry_date);
    }

    /**
     * Check if card is valid (active, not expired, has balance)
     */
    public function isValidCard()
    {
        return $this->status &&
               !$this->isExpiredCard() &&
               $this->getBalance() > 0;
    }

    /**
     * Calculate redemption amount for an order
     * For gift cards: min(balance, order_total)
     * For coupons: calculated discount
     */
    public function calculateRedemptionAmount($orderTotal)
    {
        if ($this->isGiftCard() || $this->isCredit()) {
            // Use up to the full balance or order total, whichever is less
            return min($this->getBalance(), $orderTotal);
        }

        // Regular coupon discount calculation
        if ($this->isFixed()) {
            return min($this->discount, $orderTotal);
        } else {
            // Percentage discount
            $discount = $orderTotal * ($this->discount / 100);
            
            // Apply max discount cap if set
            if ($this->max_discount_cap && $discount > $this->max_discount_cap) {
                $discount = $this->max_discount_cap;
            }
            
            return $discount;
        }
    }

    /**
     * Generate unique gift card code
     */
    public static function generateGiftCardCode($prefix = 'GC', $length = 10)
    {
        do {
            $code = $prefix . strtoupper(substr(md5(uniqid(rand(), true)), 0, $length));
        } while (self::where('code', $code)->exists());

        return $code;
    }

    /**
     * Generate unique voucher code
     */
    public static function generateVoucherCode($prefix = 'V', $length = 8)
    {
        return self::generateGiftCardCode($prefix, $length);
    }

    /**
     * Generate unique credit code
     */
    public static function generateCreditCode($prefix = 'CR', $length = 8)
    {
        return self::generateGiftCardCode($prefix, $length);
    }

    /**
     * Scope to get gift cards only
     */
    public function scopeGiftCards($query)
    {
        return $query->where('card_type', 'gift_card');
    }

    /**
     * Scope to get vouchers only
     */
    public function scopeVouchers($query)
    {
        return $query->where('card_type', 'voucher');
    }

    /**
     * Scope to get credits only
     */
    public function scopeCredits($query)
    {
        return $query->where('card_type', 'credit');
    }

    /**
     * Scope to get comps only
     */
    public function scopeComps($query)
    {
        return $query->where('card_type', 'comp');
    }

    /**
     * Scope to get regular coupons only
     */
    public function scopeCoupons($query)
    {
        return $query->where(function ($q) {
            $q->where('card_type', 'coupon')
              ->orWhereNull('card_type');
        });
    }

    /**
     * Scope to get purchasable gift cards
     */
    public function scopePurchasable($query)
    {
        return $query->where('is_purchasable', true);
    }

    /**
     * Scope to get cards with balance
     */
    public function scopeHasBalance($query)
    {
        return $query->where('current_balance', '>', 0);
    }

    /**
     * Get card type badge color
     */
    public function getCardTypeBadgeClass()
    {
        $badges = [
            'coupon' => 'badge-primary',
            'gift_card' => 'badge-success',
            'voucher' => 'badge-info',
            'credit' => 'badge-warning',
            'comp' => 'badge-secondary',
        ];

        return $badges[$this->card_type] ?? 'badge-default';
    }

    /**
     * Get card type display name
     */
    public function getCardTypeNameAttribute()
    {
        $names = [
            'coupon' => 'Coupon',
            'gift_card' => 'Gift Card',
            'voucher' => 'Voucher',
            'credit' => 'Credit',
            'comp' => 'Comp',
        ];

        return $names[$this->card_type] ?? 'Coupon';
    }
}
