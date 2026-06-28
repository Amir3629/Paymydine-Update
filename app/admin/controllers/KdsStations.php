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
}




