<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

/**
 * Gift Card Design Model
 * Stores gift card visual designs and templates
 */
class GiftCardDesign_model extends Model
{
    /**
     * @var string The database table name
     */
    protected $table = 'gift_card_designs';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'design_id';

    /**
     * @var array Fillable fields
     */
    protected $fillable = [
        'name',
        'description',
        'image_path',
        'template_html',
        'is_active',
        'is_default',
    ];

    /**
     * @var array Cast attributes
     */
    protected $casts = [
        'design_id' => 'integer',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
    ];

    /**
     * @var bool Enable timestamps
     */
    public $timestamps = true;

    /**
     * @var array Model relationships
     */
    public $relation = [
        'hasMany' => [
            'gift_cards' => ['Admin\Models\Coupons_model', 'foreignKey' => 'design_id'],
        ],
    ];

    //
    // Scopes
    //

    /**
     * Scope to get active designs
     */
    public function scopeIsActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get default design
     */
    public function scopeIsDefault($query)
    {
        return $query->where('is_default', true);
    }

    //
    // Accessors & Mutators
    //

    /**
     * Get full image URL
     */
    public function getImageUrlAttribute()
    {
        if (!$this->image_path) {
            return null;
        }

        // If already a full URL, return as is
        if (filter_var($this->image_path, FILTER_VALIDATE_URL)) {
            return $this->image_path;
        }

        // Build URL from path
        return asset('storage/' . $this->image_path);
    }

    //
    // Helpers
    //

    /**
     * Set as default design
     */
    public function setAsDefault()
    {
        // Remove default flag from all designs
        self::where('is_default', true)->update(['is_default' => false]);

        // Set this as default
        $this->is_default = true;
        return $this->save();
    }

    /**
     * Get the default design
     */
    public static function getDefault()
    {
        return self::isDefault()->isActive()->first();
    }

    /**
     * Get all active designs for dropdown
     */
    public static function getDropdownOptions()
    {
        return self::isActive()
            ->orderBy('is_default', 'desc')
            ->orderBy('name')
            ->pluck('name', 'design_id')
            ->all();
    }

    /**
     * Render gift card HTML
     */
    public function renderCard($data = [])
    {
        if (!$this->template_html) {
            return $this->getDefaultTemplate($data);
        }

        // Replace placeholders in template
        $html = $this->template_html;
        foreach ($data as $key => $value) {
            $html = str_replace('{{' . $key . '}}', $value, $html);
        }

        return $html;
    }

    /**
     * Get default card template
     */
    protected function getDefaultTemplate($data = [])
    {
        $code = $data['code'] ?? 'GIFTCARD';
        $balance = $data['balance'] ?? '0.00';
        $recipientName = $data['recipient_name'] ?? 'Valued Customer';
        $message = $data['message'] ?? 'Enjoy!';

        return <<<HTML
<div class="gift-card" style="width: 400px; height: 250px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; padding: 30px; color: white; font-family: Arial, sans-serif; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
    <div style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">
        {$this->name}
    </div>
    <div style="margin-bottom: 15px;">
        <div style="font-size: 14px; opacity: 0.8;">For</div>
        <div style="font-size: 18px; font-weight: bold;">{$recipientName}</div>
    </div>
    <div style="margin-bottom: 15px;">
        <div style="font-size: 14px; opacity: 0.8;">Balance</div>
        <div style="font-size: 32px; font-weight: bold;">\${$balance}</div>
    </div>
    <div style="position: absolute; bottom: 30px; left: 30px; right: 30px;">
        <div style="font-size: 12px; opacity: 0.8; margin-bottom: 5px;">Card Code</div>
        <div style="font-size: 16px; letter-spacing: 2px; font-family: monospace;">{$code}</div>
    </div>
</div>
HTML;
    }
}

