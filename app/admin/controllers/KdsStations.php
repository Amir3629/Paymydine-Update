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
        
        $this->vars['title'] = 'Manage KDS Stations';
        
        $this->asExtension('ListController')->index();
        
        return $this->makeView('kds_stations/index');
    }

    /**
     * Create page
     */
    public function create()
    {
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
        // Add category options
        $categories = Categories_model::where('status', 1)
            ->orderBy('priority', 'asc')
            ->orderBy('name', 'asc')
            ->get();
        
        $categoryOptions = [];
        foreach ($categories as $category) {
            $categoryOptions[$category->category_id] = $category->name;
        }
        
        if (isset($form->fields['category_ids'])) {
            $form->fields['category_ids']['options'] = $categoryOptions;
        }
        
        // Add status options
        $statuses = Statuses_model::where('status_for', 'order')
            ->orderBy('status_id', 'asc')
            ->get();
        
        $statusOptions = [];
        foreach ($statuses as $status) {
            $statusOptions[$status->status_id] = $status->status_name;
        }
        
        if (isset($form->fields['status_ids'])) {
            $form->fields['status_ids']['options'] = $statusOptions;
        }
        
        // Add notification sound options
        if (isset($form->fields['notification_sound'])) {
            $form->fields['notification_sound']['options'] = Kds_stations_model::$notificationSounds;
        }
        
        // Add theme color options
        if (isset($form->fields['theme_color'])) {
            $form->fields['theme_color']['options'] = Kds_stations_model::$themeColors;
        }
        
        // Add location options
        $locations = Locations_model::where('location_status', 1)->get();
        $locationOptions = ['' => '-- All Locations --'];
        foreach ($locations as $location) {
            $locationOptions[$location->location_id] = $location->location_name;
        }
        
        if (isset($form->fields['location_id'])) {
            $form->fields['location_id']['options'] = $locationOptions;
        }
    }

    /**
     * Before save - generate slug if needed
     */
    public function formBeforeSave($model)
    {
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
}

