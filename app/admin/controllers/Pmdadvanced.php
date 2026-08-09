<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Statuses_model;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class Pmdadvanced extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    public function __construct()
    {
        parent::__construct();
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-owner-settings-page pmd-advanced-settings-page');
        $this->addCss('css/pmd-owner-settings-v1.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addJs('js/pmd-owner-settings-v1.js');
        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Template::setTitle('Advanced settings');
        Template::setHeading('Advanced settings');

        $this->vars['pmdAdvanced'] = [
            'settings' => $this->payload(),
            'order_statuses' => $this->statusOptions('order'),
            'reservation_statuses' => $this->statusOptions('reserve'),
        ];

        return $this->makeView('pmdadvanced/index');
    }

    public function onSaveAdvanced()
    {
        $input = (array)post('advanced', []);

        $validator = Validator::make($input, [
            'country_id' => ['nullable', 'integer', 'min:0'],
            'menus_page' => ['nullable', 'string', 'max:191'],
            'reservation_page' => ['nullable', 'string', 'max:191'],
            'distance_unit' => ['nullable', 'string', 'max:32'],
            'default_geocoder' => ['nullable', 'string', 'max:100'],
            'maps_api_key' => ['nullable', 'string', 'max:4096'],
            'default_language' => ['nullable', 'string', 'max:50'],
            'default_currency_code' => ['nullable', 'string', 'max:20'],
            'timezone' => ['nullable', 'string', 'max:100'],
            'currency_converter_api' => ['nullable', 'string', 'max:60'],
            'currency_oer_api_key' => ['nullable', 'string', 'max:4096'],
            'currency_fixer_api_key' => ['nullable', 'string', 'max:4096'],
            'currency_refresh_interval' => ['nullable', 'integer', 'min:1', 'max:10080'],
            'default_order_status' => ['nullable', 'integer'],
            'processing_order_status' => ['nullable', 'integer'],
            'completed_order_status' => ['nullable', 'integer'],
            'canceled_order_status' => ['nullable', 'integer'],
            'default_reservation_status' => ['nullable', 'integer'],
            'confirmed_reservation_status' => ['nullable', 'integer'],
            'canceled_reservation_status' => ['nullable', 'integer'],
            'eta_default_prep_minutes' => ['nullable', 'integer', 'min:1', 'max:240'],
            'eta_order_load_window_minutes' => ['nullable', 'integer', 'min:1', 'max:240'],
            'eta_busy_item_threshold' => ['nullable', 'integer', 'min:0', 'max:500'],
            'eta_very_busy_item_threshold' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'eta_busy_extra_minutes' => ['nullable', 'integer', 'min:0', 'max:240'],
            'eta_very_busy_extra_minutes' => ['nullable', 'integer', 'min:0', 'max:240'],
            'eta_expected_kitchen_staff' => ['nullable', 'integer', 'min:0', 'max:100'],
            'eta_understaffed_extra_minutes' => ['nullable', 'integer', 'min:0', 'max:240'],
            'eta_round_to_nearest_minutes' => ['nullable', 'integer', 'min:1', 'max:60'],
            'eta_max_minutes' => ['nullable', 'integer', 'min:1', 'max:1440'],
            'eta_hint_text' => ['nullable', 'string', 'max:500'],
            'admin_after_save_action' => ['nullable', 'in:continue,close,new'],
            'activity_log_timeout' => ['nullable', 'integer', 'min:1', 'max:525600'],
            'maintenance_message' => ['nullable', 'string', 'max:2000'],
            'kds_notification_sound' => ['nullable', 'string', 'max:100'],
            'note_suggestions' => ['nullable', 'string', 'max:10000'],
        ]);

        if ($validator->fails()) throw new ValidationException($validator);
        $clean = $validator->validated();

        $converter = $this->settingValue('currency_converter', []);
        if (!is_array($converter)) $converter = [];
        $converter['api'] = (string)($clean['currency_converter_api'] ?? ($converter['api'] ?? ''));
        $converter['oer']['apiKey'] = (string)($clean['currency_oer_api_key'] ?? ($converter['oer']['apiKey'] ?? ''));
        $converter['fixerio']['apiKey'] = (string)($clean['currency_fixer_api_key'] ?? ($converter['fixerio']['apiKey'] ?? ''));
        $converter['refreshInterval'] = (int)($clean['currency_refresh_interval'] ?? ($converter['refreshInterval'] ?? 60));

        $suggestions = [];
        foreach (preg_split('/\R+/', (string)($clean['note_suggestions'] ?? '')) ?: [] as $line) {
            $line = trim($line);
            if ($line !== '') $suggestions[] = ['sentence' => mb_substr($line, 0, 500)];
        }

        $values = [
            'country_id' => (int)($clean['country_id'] ?? 0),
            'menus_page' => trim((string)($clean['menus_page'] ?? '')),
            'reservation_page' => trim((string)($clean['reservation_page'] ?? '')),
            'distance_unit' => trim((string)($clean['distance_unit'] ?? 'km')),
            'default_geocoder' => trim((string)($clean['default_geocoder'] ?? '')),
            'maps_api_key' => trim((string)($clean['maps_api_key'] ?? '')),
            'default_language' => trim((string)($clean['default_language'] ?? 'en')),
            'detect_language' => !empty($input['detect_language']) ? 1 : 0,
            'default_currency_code' => trim((string)($clean['default_currency_code'] ?? 'EUR')),
            'timezone' => trim((string)($clean['timezone'] ?? 'UTC')),
            'currency_converter' => $converter,
            'guest_order' => !empty($input['guest_order']) ? 1 : 0,
            'location_order' => !empty($input['location_order']) ? 1 : 0,
            'order_email' => !empty($input['order_email']) ? 1 : 0,
            'default_order_status' => (int)($clean['default_order_status'] ?? 0),
            'processing_order_status' => (int)($clean['processing_order_status'] ?? 0),
            'completed_order_status' => (int)($clean['completed_order_status'] ?? 0),
            'canceled_order_status' => (int)($clean['canceled_order_status'] ?? 0),
            'enable_customer_eta' => !empty($input['enable_customer_eta']) ? 1 : 0,
            'smart_eta_enabled' => !empty($input['smart_eta_enabled']) ? 1 : 0,
            'eta_default_prep_minutes' => (int)($clean['eta_default_prep_minutes'] ?? 20),
            'eta_order_load_window_minutes' => (int)($clean['eta_order_load_window_minutes'] ?? 30),
            'eta_busy_item_threshold' => (int)($clean['eta_busy_item_threshold'] ?? 10),
            'eta_very_busy_item_threshold' => (int)($clean['eta_very_busy_item_threshold'] ?? 20),
            'eta_busy_extra_minutes' => (int)($clean['eta_busy_extra_minutes'] ?? 5),
            'eta_very_busy_extra_minutes' => (int)($clean['eta_very_busy_extra_minutes'] ?? 10),
            'eta_use_staff_attendance' => !empty($input['eta_use_staff_attendance']) ? 1 : 0,
            'eta_expected_kitchen_staff' => (int)($clean['eta_expected_kitchen_staff'] ?? 1),
            'eta_understaffed_extra_minutes' => (int)($clean['eta_understaffed_extra_minutes'] ?? 5),
            'eta_round_to_nearest_minutes' => (int)($clean['eta_round_to_nearest_minutes'] ?? 5),
            'eta_max_minutes' => (int)($clean['eta_max_minutes'] ?? 120),
            'eta_hint_text' => trim((string)($clean['eta_hint_text'] ?? '')),
            'reservation_email' => !empty($input['reservation_email']) ? 1 : 0,
            'default_reservation_status' => (int)($clean['default_reservation_status'] ?? 0),
            'confirmed_reservation_status' => (int)($clean['confirmed_reservation_status'] ?? 0),
            'canceled_reservation_status' => (int)($clean['canceled_reservation_status'] ?? 0),
            'admin_after_save_action' => (string)($clean['admin_after_save_action'] ?? 'continue'),
            'note_suggestion_sentences' => $suggestions,
            'kds_notification_sound' => trim((string)($clean['kds_notification_sound'] ?? '')),
            'enable_request_log' => !empty($input['enable_request_log']) ? 1 : 0,
            'activity_log_timeout' => (int)($clean['activity_log_timeout'] ?? 60),
            'maintenance_mode' => !empty($input['maintenance_mode']) ? 1 : 0,
            'maintenance_message' => trim((string)($clean['maintenance_message'] ?? '')),
        ];

        setting()->set($values);
        setting()->save();

        flash()->success('Advanced settings saved.');
        return ['#pmd-owner-save-status' => '<span>Saved</span>'];
    }

    protected function payload(): array
    {
        $defaults = [
            'country_id'=>0,'menus_page'=>'','reservation_page'=>'','distance_unit'=>'km','default_geocoder'=>'','maps_api_key'=>'',
            'default_language'=>'en','detect_language'=>0,'default_currency_code'=>'EUR','timezone'=>'UTC','currency_converter'=>[],
            'guest_order'=>1,'location_order'=>1,'order_email'=>1,'default_order_status'=>0,'processing_order_status'=>0,'completed_order_status'=>0,'canceled_order_status'=>0,
            'enable_customer_eta'=>0,'smart_eta_enabled'=>0,'eta_default_prep_minutes'=>20,'eta_order_load_window_minutes'=>30,'eta_busy_item_threshold'=>10,'eta_very_busy_item_threshold'=>20,'eta_busy_extra_minutes'=>5,'eta_very_busy_extra_minutes'=>10,'eta_use_staff_attendance'=>0,'eta_expected_kitchen_staff'=>1,'eta_understaffed_extra_minutes'=>5,'eta_round_to_nearest_minutes'=>5,'eta_max_minutes'=>120,'eta_hint_text'=>'',
            'reservation_email'=>1,'default_reservation_status'=>0,'confirmed_reservation_status'=>0,'canceled_reservation_status'=>0,
            'admin_after_save_action'=>'continue','note_suggestion_sentences'=>[],'kds_notification_sound'=>'','enable_request_log'=>1,'activity_log_timeout'=>60,'maintenance_mode'=>0,'maintenance_message'=>'Site is under maintenance. Please check back later.',
        ];

        foreach ($defaults as $key => $fallback) $defaults[$key] = $this->settingValue($key, $fallback);

        $converter = is_array($defaults['currency_converter']) ? $defaults['currency_converter'] : [];
        $defaults['currency_converter_api'] = (string)($converter['api'] ?? '');
        $defaults['currency_oer_api_key'] = (string)($converter['oer']['apiKey'] ?? '');
        $defaults['currency_fixer_api_key'] = (string)($converter['fixerio']['apiKey'] ?? '');
        $defaults['currency_refresh_interval'] = (int)($converter['refreshInterval'] ?? 60);

        $lines = [];
        foreach ((array)$defaults['note_suggestion_sentences'] as $row) {
            $sentence = is_array($row) ? ($row['sentence'] ?? '') : $row;
            if (trim((string)$sentence) !== '') $lines[] = trim((string)$sentence);
        }
        $defaults['note_suggestions'] = implode("\n", $lines);

        return $defaults;
    }

    protected function statusOptions(string $for): array
    {
        try {
            return Statuses_model::query()->where('status_for', $for)->orderBy('status_id')->pluck('status_name', 'status_id')->toArray();
        } catch (\Throwable $error) {
            return [];
        }
    }

    protected function settingValue(string $key, $fallback = null)
    {
        try { return setting($key, $fallback); }
        catch (\Throwable $error) { return $fallback; }
    }
}
