<?php

namespace Admin\Models;

use Admin\Traits\Locationable;
use Igniter\Flame\Database\Model;
use Igniter\Flame\Database\Traits\Sortable;
use Illuminate\Support\Str; 

/**
 * Tables Model Class
 */
class Tables_model extends Model
{
    use Locationable;
    use Sortable;

    const LOCATIONABLE_RELATION = 'locations';

    const SORT_ORDER = 'priority';

    /**
     * @var string The database table name
     */
    protected $table = 'tables';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'table_id';

    protected $casts = [
        'table_no' => 'integer',
        'min_capacity' => 'integer',
        'max_capacity' => 'integer',
        'extra_capacity' => 'integer',
        'priority' => 'integer',
        'is_joinable' => 'boolean',
        'table_status' => 'boolean',
    ];

    protected $fillable = [
        'table_no',
        'table_name',
        'min_capacity',
        'max_capacity',
        'extra_capacity',
        'priority',
        'is_joinable',
        'table_status',
        'qr_code',
    ];

    public $relation = [
        'morphToMany' => [
            'locations' => ['Admin\Models\Locations_model', 'name' => 'locationable'],
        ],
    ];

    public $timestamps = true;

    public static function getDropdownOptions()
    {
        return self::selectRaw('table_id, concat(table_name, " (", min_capacity, " - ", max_capacity, ")") AS display_name')
            ->dropdown('display_name');
    }

    /**
     * Scope a query to only include enabled location
     *
     * @return $this
     */
    public function scopeIsEnabled($query)
    {
        return $query->where('table_status', 1);
    }

    public function scopeWhereBetweenCapacity($query, $noOfGuests)
    {
        return $query->where('min_capacity', '<=', $noOfGuests)
            ->where('max_capacity', '>=', $noOfGuests);
    }



        /**
     * Function to generate the unique ID with the required format
     * ms-{sequential_number}-{random_string}
     */
    public function generateUniqueId()
    {
        $prefix = 'ms';
        $sequentialNumber = $this->getNextSequentialNumber();
        $randomString = Str::random(6); // Generate a random 5 character alphanumeric string
        return $prefix . $sequentialNumber.$randomString;
    }

    /**
     * Get the next sequential number for the ID
     */
    public function getNextSequentialNumber()
    {
        // Get the latest table_id and increment it
        $latestRecord = self::latest('table_id')->first();
        return $latestRecord ? $latestRecord->table_id + 1 : 1; // Start from 1 if no records exist
    }

    /**
     * Normalize admin input:
     *  - "cashier" (any case) becomes "Cashier"
     *  - pure digits ("2", "02") are stored as "Table 2"
     *  - anything else is kept as-is (legacy/custom)
     */
    public function setTableNameAttribute($value)
    {
        $trimmed = trim((string)$value);
        if ($trimmed === '') { $this->attributes['table_name'] = $trimmed; return; }
        if (strtolower($trimmed) === 'cashier') { $this->attributes['table_name'] = 'Cashier'; return; }
        if (ctype_digit($trimmed)) { $this->attributes['table_name'] = 'Table '.((int)$trimmed); return; }
        $this->attributes['table_name'] = $trimmed;
    }

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            // normalize table_no
            $model->table_no = (int)($model->table_no ?? 0);

            // preserve explicit "cashier" table names
            $isCashier = is_string($model->table_name) && trim(strtolower($model->table_name)) === 'cashier';

            if (!$isCashier) {
                // When number is valid, force table_name to match "Table {no}"
                if ($model->table_no > 0) {
                    $model->table_name = 'Table '.$model->table_no;
                }
            }

            // Ensure qr_code exists
            if (empty($model->qr_code)) {
                $model->qr_code = $model->generateUniqueId();
            }
        });

        static::created(function ($model) {
            // If created without a number, default table_no to table_id then sync name once
            if ((int)$model->table_no <= 0) {
                $model->table_no = (int)$model->table_id;
                if (trim(strtolower($model->table_name)) !== 'cashier') {
                    $model->table_name = 'Table '.$model->table_no;
                }
                $model->saveQuietly();
            }
        });
    }


}
