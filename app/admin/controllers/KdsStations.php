<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Models\Kds_stations_model;
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
            'defaultSort' => ['name', 'ASC'],
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

    // Devices & Hardware is gated by Site.Settings; KDS-specific access remains valid too.
    protected $requiredPermissions = ['Admin.KdsStations', 'Site.Settings'];

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('kds_stations', 'tools');

        /* PMD_DEVICE_BACKEND_ONLY_V4
         * Browser GET pages live under /admin/pmddevices/*. This controller
         * remains only the canonical action/model/service authority.
         */
        AdminMenu::setContext('settings', 'system');
    }

    /**
     * List page
     */
    public function index()
    {
        /* PMD_DEVICE_LEGACY_UI_REDIRECT_V4_KDS_INDEX */
        if (request()->isMethod('get') && !request()->ajax()) {
            return redirect(admin_url('pmddevices/kds'));
        }


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
        /* PMD_DEVICE_LEGACY_UI_REDIRECT_V4_KDS_CREATE */
        if (request()->isMethod('get') && !request()->ajax()) {
            return redirect(admin_url('pmddevices/kds/create'));
        }

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
        /* PMD_DEVICE_LEGACY_UI_REDIRECT_V4_KDS_EDIT */
        if (request()->isMethod('get') && !request()->ajax()) {
            return redirect(admin_url('pmddevices/kds/edit/'.(int)basename(request()->path())));
        }

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
        // PMD_KDS_MINIMAL_STATION_V1: category routing is the only configurable KDS option.
        $this->pmdSetFormFieldOptionsV46($form, 'category_ids', Kds_stations_model::pmdKdsCategoryOptionsV46());
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

    /* PMD_KDS_DEVICE_SAVE_VISIBILITY_V115_START */
    protected function pmdKdsJsonRequestV115(): bool
    {
        return request()->ajax() || request()->wantsJson();
    }

    protected function pmdKdsForgetStationListCacheV115(): void
    {
        try {
            if (function_exists('cache')) {
                cache()->forget('pmd_kds_all_stations_minimal_v1_1');
            }
        } catch (\Throwable $e) {
            \Log::warning('PMD KDS station list cache invalidation failed: '.$e->getMessage());
        }
    }
    /* PMD_KDS_DEVICE_SAVE_VISIBILITY_V115_END */

    protected function pmdKdsBackendSaveV108($recordId = null)
    {
        /*
         * PMD_KDS_TABLE_SELF_HEAL_V116
         * Devices & Hardware posts directly into this backend save method.
         * Ensure the canonical KDS table exists before persistence.
         */
        if (!\Illuminate\Support\Facades\Schema::hasTable('kds_stations')) {
            $this->ensureTableExists();
        }

        if (!\Illuminate\Support\Facades\Schema::hasTable('kds_stations')) {
            if ($this->pmdKdsJsonRequestV115()) {
                return response()->json(['ok' => false, 'error' => 'KDS stations table does not exist.'], 500);
            }
            return redirect()->back()->with('error', 'KDS stations table does not exist.');
        }

        $payload = request()->input('Kds_station', []);

        if (!is_array($payload)) {
            $payload = [];
        }

        $name = trim((string)$this->pmdKdsLastValueV108($payload['name'] ?? '', ''));

        if ($name === '') {
            if ($this->pmdKdsJsonRequestV115()) {
                return response()->json(['ok' => false, 'error' => 'Station name is required.'], 422);
            }
            return redirect()->back()->withInput()->with('error', 'Station name is required.');
        }

        $categoryIds = $this->pmdKdsArrayIdsV108($payload['category_ids'] ?? []);
        $now = now();

        // PMD_KDS_MINIMAL_STATION_V1
        // Retired per-station knobs are canonical fixed product defaults. This
        // prevents old hidden settings from silently changing KDS behaviour.
        $data = [
            'name' => $name,
            'description' => '',
            'station_type' => 'kitchen',
            'category_ids' => json_encode($categoryIds),
            'status_ids' => json_encode([]),
            'can_change_status' => 1,
            'location_id' => null,
            'priority' => 0,
            // PMD_KDS_MINIMAL_STATION_V1_1: active/inactive is no longer a product setting.
            'is_active' => 1,
            'notification_sound' => 'doorbell',
            'sound_enabled' => 1,
            'refresh_interval' => 5,
            'theme_color' => '#4CAF50',
            'display_density' => 'normal',
            'show_reservations' => 0,
            'reservation_window_minutes' => 90,
            'ready_pickup_timeout_minutes' => 8,
            'auto_hide_completed_minutes' => 5,
            'order_limit' => 50,
            'sort_order' => 0,
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
            $this->pmdKdsForgetStationListCacheV115();

            if ($this->pmdKdsJsonRequestV115()) {
                return response()->json([
                    'ok' => true,
                    'station_id' => (int)$recordId,
                    'mode' => 'edit',
                    'message' => 'KDS station saved.',
                ]);
            }

            return redirect(admin_url('kds_stations'))->with('success', 'KDS station saved.');
        }

        $data['slug'] = $this->pmdKdsSlugV108((string)($payload['slug'] ?? $name));
        $data['created_at'] = $now;

        $safe = $this->pmdKdsFilterColumnsV108($data);

        $newId = \Illuminate\Support\Facades\DB::table('kds_stations')->insertGetId($safe);
        $this->pmdKdsForgetStationListCacheV115();

        if ($this->pmdKdsJsonRequestV115()) {
            return response()->json([
                'ok' => true,
                'station_id' => (int)$newId,
                'mode' => 'create',
                'message' => 'KDS station created.',
            ], 201);
        }

        return redirect(admin_url('kds_stations'))->with('success', 'KDS station created.');
    }
    /* PMD_KDS_BACKEND_SAVE_V108_END */


    /* PMD_DEVICE_NATIVE_KDS_ACTIONS_V4 */
    public function onPmdDeviceNativeSaveV4($context = null, $recordId = null)
    {
        return $this->pmdKdsBackendSaveV108($this->pmdKdsCurrentRecordIdV108());
    }

    public function onPmdDeviceNativeDeleteV4($context = null, $recordId = null)
    {
        $id = $this->pmdKdsCurrentRecordIdV108();
        if (!$id) {
            if ($this->pmdKdsJsonRequestV115()) {
                return response()->json(['ok' => false, 'error' => 'KDS station not found.'], 404);
            }
            return redirect(admin_url('pmddevices/kds'))->with('error', 'KDS station not found.');
        }
        $station = Kds_stations_model::find($id);
        if (!$station) {
            if ($this->pmdKdsJsonRequestV115()) {
                return response()->json(['ok' => false, 'error' => 'KDS station not found.'], 404);
            }
            return redirect(admin_url('pmddevices/kds'))->with('error', 'KDS station not found.');
        }
        $station->delete();
        $this->pmdKdsForgetStationListCacheV115();

        if ($this->pmdKdsJsonRequestV115()) {
            return response()->json(['ok' => true, 'station_id' => (int)$id, 'message' => 'KDS station deleted.']);
        }

        flash()->success('KDS station deleted.');
        return redirect(admin_url('pmddevices/kds'));
    }

}



