<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Models\Kds_stations_model;
use Admin\Models\Categories_model;
use Admin\Models\Statuses_model;
use Admin\Models\Locations_model;
use Admin\Facades\AdminMenu;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * KDS Stations Controller
 * Manages Kitchen Display System stations configuration
 */
class KdsStations extends AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Kds_stations_model',
            'title' => 'Manage KDS Stations',
            'emptyMessage' => 'No KDS stations found. Create your first station to get started.',
            'defaultSort' => ['priority', 'ASC'],
            'configFile' => 'kds_stations_model',
        ],
    ];

    public $formConfig = [
        'name' => 'KDS Station',
        'model' => 'Admin\Models\Kds_stations_model',
        'create' => [
            'title' => 'Create KDS Station',
            'redirect' => 'kds_stations/edit/{station_id}',
            'redirectClose' => 'kds_stations',
        ],
        'edit' => [
            'title' => 'Edit KDS Station',
            'redirect' => 'kds_stations/edit/{station_id}',
            'redirectClose' => 'kds_stations',
        ],
        'preview' => [
            'title' => 'Preview KDS Station',
            'redirect' => 'kds_stations',
        ],
        'delete' => [
            'redirect' => 'kds_stations',
        ],
        'configFile' => 'kds_stations_model',
    ];

    protected $requiredPermissions = ['Admin.KdsStations'];

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('kds_stations', 'tools');
    }

    /**
     * List page
     */
    public function index()
    {

        // Ensure the table exists
        $this->ensureTableExists();
        
        $this->asExtension('ListController')->index();
        
        return $this->makeView('kds_stations/index');
    }

    /**
     * Create page
     */
    public function create()
    {
        /* PMD_KDS_V114_IGNORE_STATUS_ONLY_CREATE */
        if (request()->isMethod('post') && !request()->has('Kds_station') && (request()->has('status') || request()->has('message') || request()->has('clear_after'))) {
            if (request()->ajax() || request()->wantsJson()) {
                return response('', 204);
            }
            return redirect()->back();
        }

        if (request()->isMethod('post') && request()->has('Kds_station')) {
            return $this->pmdKdsBackendSaveV108(null);
        }

        $this->ensureTableExists();
        
        $this->vars['title'] = 'Create KDS Station';
        
        $this->asExtension('FormController')->create();
        
        return $this->makeView('kds_stations/create');
    }

    /**
     * Edit page
     */
    public function edit($context = null, $recordId = null)
    {
        /* PMD_KDS_V114_IGNORE_STATUS_ONLY_EDIT */
        if (request()->isMethod('post') && !request()->has('Kds_station') && (request()->has('status') || request()->has('message') || request()->has('clear_after'))) {
            if (request()->ajax() || request()->wantsJson()) {
                return response('', 204);
            }
            return redirect()->back();
        }

        if (request()->isMethod('post') && request()->has('Kds_station')) {
            return $this->pmdKdsBackendSaveV108($this->pmdKdsCurrentRecordIdV108());
        }


        /* PMD_KDS_EDIT_BINDING_FIX_V53_START */
        if ($recordId === null && is_numeric($context)) {
            $recordId = (int)$context;
            $context = null;
        }

        if (!empty($recordId) && !\Admin\Models\Kds_stations_model::where('station_id', $recordId)->exists()) {
            return redirect(admin_url('kds_stations'));
        }
        /* PMD_KDS_EDIT_BINDING_FIX_V53_END */

        $this->ensureTableExists();
        
        $this->vars['title'] = 'Edit KDS Station';
        $this->vars['recordId'] = $recordId;
        
        $this->asExtension('FormController')->edit($context, $recordId);
        
        return $this->makeView('kds_stations/edit');
    }

    /**
     * Extend form fields
     */
    
public function formExtendFields($form)
    {
        $this->pmdSetFormFieldOptionsV46($form, 'category_ids', Kds_stations_model::pmdKdsCategoryOptionsV46());
        $this->pmdSetFormFieldOptionsV46($form, 'status_ids', Kds_stations_model::pmdKdsStatusOptionsV46());
        $this->pmdSetFormFieldOptionsV46($form, 'location_id', Kds_stations_model::pmdKdsLocationOptionsV46());
        $this->pmdSetFormFieldOptionsV46($form, 'notification_sound', Kds_stations_model::$notificationSounds);
        $this->pmdSetFormFieldOptionsV46($form, 'theme_color', Kds_stations_model::$themeColors);
    }

    /* PMD_KDS_SETTINGS_BACKEND_V46_CONTROLLER_START */
    protected function pmdSetFormFieldOptionsV46($form, $fieldName, array $options)
    {
        if (isset($form->fields[$fieldName])) {
            if (is_array($form->fields[$fieldName])) {
                $form->fields[$fieldName]['options'] = $options;
            } elseif (is_object($form->fields[$fieldName])) {
                $form->fields[$fieldName]->options = $options;
            }
        }

        if (isset($form->tabs) && is_array($form->tabs) && isset($form->tabs['fields'][$fieldName])) {
            if (is_array($form->tabs['fields'][$fieldName])) {
                $form->tabs['fields'][$fieldName]['options'] = $options;
            } elseif (is_object($form->tabs['fields'][$fieldName])) {
                $form->tabs['fields'][$fieldName]->options = $options;
            }
        }

        if (isset($form->tabs) && is_object($form->tabs) && isset($form->tabs->fields[$fieldName])) {
            if (is_array($form->tabs->fields[$fieldName])) {
                $form->tabs->fields[$fieldName]['options'] = $options;
            } elseif (is_object($form->tabs->fields[$fieldName])) {
                $form->tabs->fields[$fieldName]->options = $options;
            }
        }
    }
    /* PMD_KDS_SETTINGS_BACKEND_V46_CONTROLLER_END */


    /**
     * Before save - generate slug if needed
     */
    public function formBeforeSave($model)
    {

        /* PMD_KDS_SLUG_SANITIZE_V53_START */
        $model->slug = trim((string)($model->slug ?? ''));

        if (in_array($model->slug, ['-1', '0'], true)) {
            $model->slug = '';
        }

        if (!empty($model->slug)) {
            $model->slug = Str::slug($model->slug);
        }
        /* PMD_KDS_SLUG_SANITIZE_V53_END */

        if (empty($model->slug) && !empty($model->name)) {
            $model->slug = Str::slug($model->name);
            
            // Ensure unique slug
            $originalSlug = $model->slug;
            $counter = 1;
            while (Kds_stations_model::where('slug', $model->slug)
                ->where('station_id', '!=', $model->station_id ?? 0)
                ->exists()) {
                $model->slug = $originalSlug . '-' . $counter;
                $counter++;
            }
        }
    }

    /**
     * Ensure the KDS stations table exists
     */
    protected function ensureTableExists()
    {
        try {
            $prefix = DB::connection()->getTablePrefix();
            $tableName = $prefix . 'kds_stations';
            
            if (!DB::getSchemaBuilder()->hasTable('kds_stations')) {
                DB::statement("
                    CREATE TABLE IF NOT EXISTS `{$tableName}` (
                        `station_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                        `name` varchar(128) NOT NULL,
                        `slug` varchar(128) NOT NULL,
                        `description` text DEFAULT NULL,
                        `category_ids` JSON DEFAULT NULL,
                        `status_ids` JSON DEFAULT NULL,
                        `can_change_status` tinyint(1) NOT NULL DEFAULT 1,
                        `is_active` tinyint(1) NOT NULL DEFAULT 1,
                        `notification_sound` varchar(50) NOT NULL DEFAULT 'doorbell',
                        `refresh_interval` int(11) NOT NULL DEFAULT 5,
                        `theme_color` varchar(20) NOT NULL DEFAULT '#4CAF50',
                        `location_id` int(10) UNSIGNED DEFAULT NULL,
                        `priority` int(11) NOT NULL DEFAULT 0,
                        `created_at` timestamp NULL DEFAULT NULL,
                        `updated_at` timestamp NULL DEFAULT NULL,
                        PRIMARY KEY (`station_id`),
                        UNIQUE KEY `slug_unique` (`slug`),
                        KEY `is_active_index` (`is_active`),
                        KEY `location_id_index` (`location_id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                ");
                
                // Insert default station
                DB::table('kds_stations')->insert([
                    'name' => 'Main Kitchen',
                    'slug' => 'main-kitchen',
                    'description' => 'Main kitchen display for all orders',
                    'category_ids' => json_encode([]),
                    'status_ids' => json_encode([]),
                    'can_change_status' => true,
                    'is_active' => true,
                    'notification_sound' => 'doorbell',
                    'refresh_interval' => 5,
                    'theme_color' => '#4CAF50',
                    'priority' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                
                \Log::info('KDS Stations table created successfully');
            }
        } catch (\Exception $e) {
            \Log::error('Failed to create KDS stations table: ' . $e->getMessage());
        }
    }

    /* PMD_KDS_BACKEND_SAVE_V108_START */
    protected function pmdKdsCurrentRecordIdV108()
    {
        $path = request()->path();

        if (preg_match('~/kds_stations/edit/([0-9]+)~', $path, $m)) {
            return (int)$m[1];
        }

        foreach (['station_id', 'id', 'recordId'] as $key) {
            $value = request()->route($key) ?: request()->input($key);
            if (!empty($value)) {
                return (int)$value;
            }
        }

        return null;
    }

    protected function pmdKdsLastValueV108($value, $default = null)
    {
        if (is_array($value)) {
            $value = array_values($value);
            return count($value) ? end($value) : $default;
        }

        return $value !== null ? $value : $default;
    }

    protected function pmdKdsBoolV108($value, $default = 0)
    {
        $value = $this->pmdKdsLastValueV108($value, $default);
        return in_array((string)$value, ['1', 'true', 'on', 'yes'], true) ? 1 : 0;
    }

    protected function pmdKdsIntV108($value, $default = 0)
    {
        $value = $this->pmdKdsLastValueV108($value, $default);
        return is_numeric($value) ? (int)$value : (int)$default;
    }

    protected function pmdKdsNullableIntV108($value)
    {
        $value = $this->pmdKdsLastValueV108($value, null);
        if ($value === '' || $value === null || $value === '0') {
            return null;
        }

        return is_numeric($value) ? (int)$value : null;
    }

    protected function pmdKdsArrayIdsV108($value)
    {
        if ($value === null) {
            return [];
        }

        if (!is_array($value)) {
            $value = [$value];
        }

        $ids = [];

        foreach ($value as $item) {
            if (is_array($item)) {
                foreach ($item as $sub) {
                    if (is_numeric($sub) && (int)$sub > 0) {
                        $ids[] = (int)$sub;
                    }
                }
                continue;
            }

            if (is_numeric($item) && (int)$item > 0) {
                $ids[] = (int)$item;
            }
        }

        return array_values(array_unique($ids));
    }

    protected function pmdKdsSlugV108($name, $recordId = null)
    {
        $base = \Illuminate\Support\Str::slug($name ?: 'kds-station');

        if ($base === '') {
            $base = 'kds-station';
        }

        $slug = $base;
        $i = 2;

        while (true) {
            $q = \Illuminate\Support\Facades\DB::table('kds_stations')->where('slug', $slug);

            if (!empty($recordId)) {
                $q->where('station_id', '!=', $recordId);
            }

            if (!$q->exists()) {
                return $slug;
            }

            $slug = $base . '-' . $i;
            $i++;
        }
    }


    protected function pmdKdsFilterColumnsV108(array $data)
    {
        try {
            $cols = \Illuminate\Support\Facades\Schema::getColumnListing('kds_stations');
            if (!empty($cols)) {
                return array_intersect_key($data, array_flip($cols));
            }
        } catch (\Throwable $e) {}

        return $data;
    }

    protected function pmdKdsBackendSaveV108($recordId = null)
    {
        if (!\Illuminate\Support\Facades\Schema::hasTable('kds_stations')) {
            return redirect()->back()->with('error', 'KDS stations table does not exist.');
        }

        $payload = request()->input('Kds_station', []);

        if (!is_array($payload)) {
            $payload = [];
        }

        $name = trim((string)$this->pmdKdsLastValueV108($payload['name'] ?? '', ''));

        if ($name === '') {
            return redirect()->back()->withInput()->with('error', 'Station name is required.');
        }

        $categoryIds = $this->pmdKdsArrayIdsV108($payload['category_ids'] ?? []);
        $statusIds = $this->pmdKdsArrayIdsV108($payload['status_ids'] ?? []);

        $now = now();

        $data = [
            'name' => $name,
            'description' => (string)$this->pmdKdsLastValueV108($payload['description'] ?? '', ''),
            'station_type' => (string)$this->pmdKdsLastValueV108($payload['station_type'] ?? 'kitchen', 'kitchen'),
            'category_ids' => json_encode($categoryIds),
            'status_ids' => json_encode($statusIds),
            'can_change_status' => $this->pmdKdsBoolV108($payload['can_change_status'] ?? 1, 1),
            'location_id' => $this->pmdKdsNullableIntV108($payload['location_id'] ?? null),
            'priority' => $this->pmdKdsIntV108($payload['priority'] ?? 0, 0),
            'is_active' => $this->pmdKdsBoolV108($payload['is_active'] ?? 1, 1),
            'notification_sound' => (string)$this->pmdKdsLastValueV108($payload['notification_sound'] ?? 'doorbell', 'doorbell'),
            'sound_enabled' => $this->pmdKdsBoolV108($payload['sound_enabled'] ?? 1, 1),
            'refresh_interval' => $this->pmdKdsIntV108($payload['refresh_interval'] ?? 5, 5),
            'theme_color' => (string)$this->pmdKdsLastValueV108($payload['theme_color'] ?? '#4CAF50', '#4CAF50'),
            'display_density' => (string)$this->pmdKdsLastValueV108($payload['display_density'] ?? 'normal', 'normal'),
            'show_reservations' => $this->pmdKdsBoolV108($payload['show_reservations'] ?? 1, 1),
            'reservation_window_minutes' => $this->pmdKdsIntV108($payload['reservation_window_minutes'] ?? 90, 90),
            'ready_pickup_timeout_minutes' => $this->pmdKdsIntV108($payload['ready_pickup_timeout_minutes'] ?? 8, 8),
            'auto_hide_completed_minutes' => $this->pmdKdsIntV108($payload['auto_hide_completed_minutes'] ?? 5, 5),
            'order_limit' => $this->pmdKdsIntV108($payload['order_limit'] ?? 50, 50),
            'sort_order' => $this->pmdKdsIntV108($payload['priority'] ?? 0, 0),
            'updated_at' => $now,
        ];

        if (!empty($recordId) && \Illuminate\Support\Facades\DB::table('kds_stations')->where('station_id', $recordId)->exists()) {
            if (empty($payload['slug'])) {
                $existing = \Illuminate\Support\Facades\DB::table('kds_stations')->where('station_id', $recordId)->first();
                $data['slug'] = $existing && !empty($existing->slug) ? $existing->slug : $this->pmdKdsSlugV108($name, $recordId);
            } else {
                $data['slug'] = $this->pmdKdsSlugV108((string)$payload['slug'], $recordId);
            }

            $safe = $this->pmdKdsFilterColumnsV108($data);

            \Illuminate\Support\Facades\DB::table('kds_stations')->where('station_id', $recordId)->update($safe);

            return redirect(admin_url('kds_stations'))->with('success', 'KDS station saved.');
        }

        $data['slug'] = $this->pmdKdsSlugV108((string)($payload['slug'] ?? $name));
        $data['created_at'] = $now;

        $safe = $this->pmdKdsFilterColumnsV108($data);

        $newId = \Illuminate\Support\Facades\DB::table('kds_stations')->insertGetId($safe);

        return redirect(admin_url('kds_stations'))->with('success', 'KDS station created.');
    }
    /* PMD_KDS_BACKEND_SAVE_V108_END */

}




