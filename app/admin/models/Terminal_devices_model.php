<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

class Terminal_devices_model extends Model
{
    protected $table = 'terminal_devices';
    protected $primaryKey = 'terminal_device_id';
    public $timestamps = true;

    protected $casts = ['metadata' => 'array', 'is_active' => 'boolean'];

    protected $fillable = [
        'provider_code', 'environment', 'location_id', 'affiliate_key', 'reader_id',
        'reader_label', 'pairing_state', 'terminal_status', 'metadata', 'is_active',
    ];

    public $relation = [
        'belongsTo' => [
            'location' => ['Admin\\Models\\Locations_model', 'foreignKey' => 'location_id'],
        ],
    ];

    public function scopeIsActive($query)
    {
        return $query->where('is_active', 1);
    }

    public static function listProviderOptions(): array
    {
        // provider_code means the payment/terminal-management provider. It does
        // NOT have to be the physical hardware manufacturer. Türkiye hardware
        // manufacturer/model/fiscal topology live in metadata/integration state.
        $implemented = [
            'sumup' => 'SumUp',
            'vr_payment' => 'VR Payment',
            'worldline' => 'Worldline Terminal API',
            'square' => 'Square Terminal API',
            'isbank' => 'Türkiye İş Bankası POS / Payment Facilitator',
        ];

        $options = [];

        try {
            $state = app(\App\Services\Platform\LocationPlatformContext::class)->state();
            if (($state['resolved'] ?? false) && !empty($state['profile'])) {
                $allowed = array_keys((array)($state['profile']['terminals']['providers'] ?? []));
                $options = array_intersect_key($implemented, array_fill_keys($allowed, true));
            }
        } catch (\Throwable $error) {
            $options = [];
        }

        // PMD_VR_SIM_VISIBILITY_R2_20260905
        try {
            if (
                \Illuminate\Support\Facades\Schema::hasTable('terminal_devices')
                && \Illuminate\Support\Facades\DB::table('terminal_devices')
                    ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
                    ->where('is_active', 1)
                    ->where('reader_id', 'like', 'PMD-VR-SIM-%')
                    ->where(function ($query) {
                        if (\Illuminate\Support\Facades\Schema::hasColumn('terminal_devices', 'environment')) {
                            $query->whereRaw("LOWER(COALESCE(environment, 'test')) = ?", ['test']);
                        }
                    })
                    ->exists()
            ) {
                $options['vr_payment'] = $implemented['vr_payment'];
            }
        } catch (\Throwable $error) {
        }

        return $options;
    }

    public static function listPairingStateOptions(): array
    {
        return [
            'unpaired' => 'Unpaired',
            'paired' => 'Paired',
            'needs_attention' => 'Needs Attention',
            'unknown' => 'Unknown',
        ];
    }

    public static function listLocationOptions(): array
    {
        if (!class_exists(Locations_model::class)) return [];
        return Locations_model::query()->orderBy('location_name')->pluck('location_name', 'location_id')->toArray();
    }
}
