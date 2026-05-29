<?php

namespace System\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Traits\FormExtendable;
use Admin\Traits\WidgetMaker;
use Exception;
use Igniter\Flame\Exception\ApplicationException;
use Igniter\Flame\Support\Facades\File;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\View;
use System\Models\Mail_templates_model;

class Settings extends \Admin\Classes\AdminController
{
    use WidgetMaker;
    use FormExtendable;

    protected $requiredPermissions = 'Site.Settings';

    protected $modelClass = 'System\Models\Settings_model';

    /**
     * @var \Admin\Widgets\Form
     */
    public $formWidget;

    /**
     * @var \Admin\Widgets\Toolbar
     */
    public $toolbarWidget;

    public $settingCode;

    public $settingItemErrors = [];

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Mail_templates_model::syncAll();

        $this->validateSettingItems(true);

        // For security reasons, delete setup files if still exists.
        if (File::isFile(base_path('setup.php')) || File::isDirectory(base_path('setup'))) {
            flash()->danger(lang('system::lang.settings.alert_delete_setup_files'))->important()->now();
        }

        $pageTitle = lang('system::lang.settings.text_title');
        Template::setTitle($pageTitle);
        Template::setHeading($pageTitle);
        $this->vars['settings'] = $this->createModel()->listSettingItems();
        $this->vars['settingItemErrors'] = $this->settingItemErrors;
    }

    public function edit($context, $settingCode = null)
    {
        try {
            $this->settingCode = $settingCode;

            if ($settingCode === 'about' && input('download') === 'video') {
                return $this->streamAboutVideo();
            }

            [$model, $definition] = $this->findSettingDefinitions($settingCode);
            if (!$definition) {
                throw new Exception(sprintf(lang('system::lang.settings.alert_settings_not_found'), $settingCode));
            }

            if ($definition->permission && !AdminAuth::user()->hasPermission($definition->permission))
                return Response::make(View::make('admin::access_denied'), 403);

            $pageTitle = sprintf(lang('system::lang.settings.text_edit_title'), lang($definition->label));
            Template::setTitle($pageTitle);
            Template::setHeading($pageTitle);

            $this->initWidgets($model, $definition);

            $this->validateSettingItems();
            if ($errors = array_get($this->settingItemErrors, $settingCode))
                Session::flash('errors', $errors);
        }
        catch (Exception $ex) {
            $this->handleError($ex);
        }
    }

    public function edit_onSave($context, $settingCode = null)
    {
        $this->settingCode = $settingCode;
        [$model, $definition] = $this->findSettingDefinitions($settingCode);
        if (!$definition) {
            throw new Exception(lang('system::lang.settings.alert_settings_not_found'));
        }

        if ($definition->permission && !AdminAuth::user()->hasPermission($definition->permission))
            return Response::make(View::make('admin::access_denied'), 403);

        $this->initWidgets($model, $definition);

        $this->validateFormRequest($model, $definition);

        if ($this->formValidate($model, $this->formWidget) === false)
            return Request::ajax() ? ['#notification' => $this->makePartial('flash')] : false;

        $this->formBeforeSave($model);

        $saveData = $this->formWidget->getSaveData();

        // PMD FIX: force logo fields from raw request hidden inputs
        $rawSettingInput = (array)request()->input('setting', []);

        if (array_key_exists('site_logo', $rawSettingInput)) {
            $saveData['site_logo'] = $rawSettingInput['site_logo'];
        }

        if (array_key_exists('favicon_logo', $rawSettingInput)) {
            $saveData['favicon_logo'] = $rawSettingInput['favicon_logo'];
        }
        if (array_key_exists('table_map_background_image', $rawSettingInput)) {
            $saveData['table_map_background_image'] = $rawSettingInput['table_map_background_image'];
        }
        if (array_key_exists('table_map_background_image', $rawSettingInput)) {
            $saveData['table_map_background_image'] = $rawSettingInput['table_map_background_image'];
        }

        \Log::info('PMD_SETTINGS_LOGO_DEBUG', [
            'site_logo' => $saveData['site_logo'] ?? null,
            'dashboard_logo' => $saveData['dashboard_logo'] ?? null,
            'favicon_logo' => $saveData['favicon_logo'] ?? null,
            'raw_site_logo' => $rawSettingInput['site_logo'] ?? null,
            'raw_dashboard_logo' => $rawSettingInput['dashboard_logo'] ?? null,
            'raw_favicon_logo' => $rawSettingInput['favicon_logo'] ?? null,
        ]);

        // PMD FIX: force logo fields from raw request so site_logo does not get overwritten
        $rawSettingInput = (array)request()->input('setting', []);
        if (array_key_exists('site_logo', $rawSettingInput)) {
            $saveData['site_logo'] = $rawSettingInput['site_logo'];
        }
        if (array_key_exists('favicon_logo', $rawSettingInput)) {
            $saveData['favicon_logo'] = $rawSettingInput['favicon_logo'];
        }
        
        // CRITICAL: Ensure site_name and site_email are never empty or null
        // If they're empty in form data, prevent saving empty values that could cause defaults to be applied
        if (isset($saveData['site_name']) && empty(trim($saveData['site_name']))) {
            unset($saveData['site_name']); // Don't save empty value
        }
        if (isset($saveData['site_email']) && empty(trim($saveData['site_email']))) {
            unset($saveData['site_email']); // Don't save empty value
        }
        
        
        // PMD_DASHBOARD_LOGO_NEVER_COPY_SITE_LOGO_START
        // Keep dashboard_logo independent from site_logo.
        // If dashboard_logo is not posted by the General form, do not infer/copy it from site_logo.
        if (isset($saveData) && is_array($saveData) && isset($saveData['site_logo'])) {
            if (!isset($rawSettingInput) || !is_array($rawSettingInput) || !array_key_exists('dashboard_logo', $rawSettingInput)) {
                unset($saveData['dashboard_logo']);
            }
        }

        if (isset($saveData['dashboard_logo'])) {
            $pmdDashboardLogoCheck = strtolower(basename(parse_url((string)$saveData['dashboard_logo'], PHP_URL_PATH) ?: (string)$saveData['dashboard_logo']));
            if (in_array($pmdDashboardLogoCheck, ['images.jpeg', 'image.jpeg', 'images.jpg', 'image.jpg', 'images.png', 'image.png'], true)) {
                $saveData['dashboard_logo'] = '';
            }
        }
        // PMD_DASHBOARD_LOGO_NEVER_COPY_SITE_LOGO_END

        
        // PMD_SETUP_SAVE_PROTECT_GENERAL_IDENTITY_START
        // The Setup/Invoice settings form must never overwrite General settings
        // such as Restaurant Name, Email, Restaurant Logo, Dashboard Logo, or Favicon.
        // It may save invoice_logo and invoice_* fields only.
        try {
            $pmdPath = trim((string)request()->path(), '/');
            $pmdIsSetupSave = (strpos($pmdPath, 'admin/settings/edit/setup') !== false)
                || (strpos((string)request()->fullUrl(), '/admin/settings/edit/setup') !== false);

            if ($pmdIsSetupSave && isset($saveData) && is_array($saveData)) {
                foreach ([
                    'site_name',
                    'site_email',
                    'site_logo',
                    'dashboard_logo',
                    'favicon_logo',
                    'restaurant_logo',
                    'mail_from_name',
                    'mail_from_address',
                ] as $pmdProtectedSettingKey) {
                    unset($saveData[$pmdProtectedSettingKey]);
                }
            }
        } catch (\Throwable $e) {
            try { \Log::warning('PMD_SETUP_SAVE_PROTECT_GENERAL_IDENTITY_FAILED', ['error' => $e->getMessage()]); } catch (\Throwable $ignored) {}
        }
        // PMD_SETUP_SAVE_PROTECT_GENERAL_IDENTITY_END


        // PMD_SYNC_INVOICE_LOGO_FROM_DASHBOARD_YES_START
        // When General Settings asks "use Dashboard Logo for invoice?" and user clicks Yes,
        // persist invoice_logo server-side. The General settings model does not normally own invoice_logo.
        try {
            $pmdRawSettingInput = isset($rawSettingInput) && is_array($rawSettingInput)
                ? $rawSettingInput
                : (array)request()->input('setting', []);

            $pmdSyncInvoiceLogo = !empty($pmdRawSettingInput['pmd_sync_dashboard_logo_to_invoice'])
                || !empty(request()->input('setting.pmd_sync_dashboard_logo_to_invoice'));

            if ($pmdSyncInvoiceLogo) {
                $pmdDashboardLogoForInvoice = $pmdRawSettingInput['dashboard_logo']
                    ?? ($saveData['dashboard_logo'] ?? null);

                $pmdNormalizeLogo = function ($value) {
                    if (is_array($value)) {
                        foreach (['path', 'publicUrl', 'url', 'file', 'value', 'name'] as $key) {
                            if (!empty($value[$key])) {
                                return $value[$key];
                            }
                        }
                        foreach ($value as $item) {
                            if (!empty($item)) {
                                return $item;
                            }
                        }
                        return '';
                    }

                    if (is_object($value)) {
                        return '';
                    }

                    $value = trim((string)$value);
                    if ($value === '') {
                        return '';
                    }

                    $value = strtok($value, '?') ?: $value;

                    if (preg_match('~/assets/media/uploads/([^/]+)$~', $value, $m)) {
                        return '/'.$m[1];
                    }

                    if (preg_match('~^https?://~i', $value)) {
                        $path = parse_url($value, PHP_URL_PATH);
                        if ($path && preg_match('~/assets/media/uploads/([^/]+)$~', $path, $m)) {
                            return '/'.$m[1];
                        }
                    }

                    return $value;
                };

                $pmdIsBrokenLogo = function ($value) {
                    $value = trim((string)$value);
                    if ($value === '') {
                        return true;
                    }

                    $base = strtolower(basename(strtok($value, '?') ?: $value));

                    return in_array($base, [
                        'images.png',
                        'images.jpeg',
                        'image.png',
                        'image.jpeg',
                        'placeholder.svg',
                        'no-image.png',
                    ], true);
                };

                $pmdDashboardLogoForInvoice = $pmdNormalizeLogo($pmdDashboardLogoForInvoice);

                if ($pmdDashboardLogoForInvoice !== '' && !$pmdIsBrokenLogo($pmdDashboardLogoForInvoice)) {
                    \Illuminate\Support\Facades\DB::table('settings')->updateOrInsert(
                        ['item' => 'invoice_logo'],
                        [
                            'sort' => 0,
                            'value' => $pmdDashboardLogoForInvoice,
                            'serialized' => 0,
                        ]
                    );

                    $saveData['invoice_logo'] = $pmdDashboardLogoForInvoice;

                    try {
                        setting()->set('invoice_logo', $pmdDashboardLogoForInvoice);
                    } catch (\Throwable $ignored) {}

                    try {
                        \Log::info('PMD_SYNCED_INVOICE_LOGO_FROM_DASHBOARD', [
                            'invoice_logo' => $pmdDashboardLogoForInvoice,
                        ]);
                    } catch (\Throwable $ignored) {}
                }
            }
        } catch (\Throwable $e) {
            try { \Log::warning('PMD_SYNC_INVOICE_LOGO_FROM_DASHBOARD_FAILED', ['error' => $e->getMessage()]); } catch (\Throwable $ignored) {}
        }
        // PMD_SYNC_INVOICE_LOGO_FROM_DASHBOARD_YES_END

        // Sync dashboard_logo to logos table if it exists in save data (for navbar display)
        if (isset($saveData['dashboard_logo'])) {
            $dashboardLogo = $saveData['dashboard_logo'];
            // Convert relative path to full URL if needed
            if (!empty($dashboardLogo)) {
                if (strpos($dashboardLogo, 'http') !== 0) {
                    // It's a relative path, convert to full URL
                    $dashboardLogo = url('assets/media/uploads/' . ltrim($dashboardLogo, '/'));
                }
                
                $exists = DB::table('logos')->exists();
                if ($exists) {
                    DB::table('logos')->update(['dashboard_logo' => $dashboardLogo]);
                } else {
                    DB::table('logos')->insert(['dashboard_logo' => $dashboardLogo]);
                }
            } else {
                // Empty value - clear from logos table
                DB::table('logos')->update(['dashboard_logo' => null]);
            }
        }
        
        $this->pmdCleanupDuplicateSettingsRows([
            'site_name','site_email','site_logo','dashboard_logo','favicon_logo','invoice_logo','invoice_prefix',
            'invoice_customer_template','invoice_customer_footer_text','invoice_receipt_mode','invoice_paper_width',
            'invoice_auto_print_after_paid','invoice_auto_print_dialog','invoice_show_logo','invoice_show_qr',
            'invoice_show_fiskaly','invoice_compact_mode','invoice_font_size_preset','invoice_print_hint',
        ]);

        // Save settings - only save if we have data to save
        if (!empty($saveData)) {
            setting()->set($saveData);
            setting()->save();
            
            // CRITICAL: After saving, verify site_name and site_email were saved correctly
            // If they're missing from database, this could cause defaults to be used later
            if (isset($saveData['site_name'])) {
                $verifySiteName = DB::table('settings')->where('item', 'site_name')->first();
                if (!$verifySiteName || $verifySiteName->value !== $saveData['site_name']) {
                    \Log::warning('Settings save verification failed for site_name', [
                        'saved_value' => $saveData['site_name'] ?? null,
                        'db_value' => $verifySiteName->value ?? null
                    ]);
                }
            }
            if (isset($saveData['site_email'])) {
                $verifySiteEmail = DB::table('settings')->where('item', 'site_email')->first();
                if (!$verifySiteEmail || $verifySiteEmail->value !== $saveData['site_email']) {
                    \Log::warning('Settings save verification failed for site_email', [
                        'saved_value' => $saveData['site_email'] ?? null,
                        'db_value' => $verifySiteEmail->value ?? null
                    ]);
                }
            }
        }

        $this->formAfterSave($model);

        flash()->success(sprintf(lang('admin::lang.alert_success'), lang($definition->label).' settings updated '));

        if (post('close')) {
            return $this->redirect('settings');
        }

        return $this->refresh();
    }

    protected function streamAboutVideo()
    {
        $videoPath = base_path('PayMyDine.mp4');

        if (!file_exists($videoPath)) {
            abort(404, 'PayMyDine demo video not found on the server.');
        }

        return Response::file($videoPath, [
            'Content-Type' => 'video/mp4',
            'Content-Disposition' => 'inline; filename="PayMyDine-Demo.mp4"',
        ]);
    }

    public function edit_onTestMail()
    {
        [$model, $definition] = $this->findSettingDefinitions('mail');
        if (!$definition) {
            throw new Exception(lang('system::lang.settings.alert_settings_not_found'));
        }

        $this->initWidgets($model, $definition);

        $this->validateFormRequest($model, $definition);

        if ($this->formValidate($model, $this->formWidget) === false)
            return Request::ajax() ? ['#notification' => $this->makePartial('flash')] : false;

        setting()->set($this->formWidget->getSaveData());

        $name = AdminAuth::getStaffName();
        $email = AdminAuth::getStaffEmail();

        try {
            Mail::raw(lang('system::lang.settings.text_test_email_message'), function (Message $message) use ($name, $email) {
                $message->to($email, $name)->subject('This a test email');
            });

            flash()->success(sprintf(lang('system::lang.settings.alert_email_sent'), $email));
        }
        catch (Exception $ex) {
            flash()->error($ex->getMessage());
        }

        return $this->refresh();
    }

    public function initWidgets($model, $definition)
    {
        $modelConfig = $model->getFieldConfig($definition->code);

        $formConfig = array_except($modelConfig, 'toolbar');
        $formConfig['model'] = $model;
        $formConfig['data'] = array_undot($model->getFieldValues());
        $formConfig['alias'] = 'form';
        $formConfig['arrayName'] = strtolower(str_singular(strip_class_basename($model, '_model'))); // Changed to lowercase to match form field names (setting[site_logo])
        $formConfig['context'] = 'edit';

        // Form Widget with extensibility
        $this->formWidget = $this->makeWidget('Admin\Widgets\Form', $formConfig);
        $this->formWidget->bindToController();

        // Prep the optional toolbar widget
        if (isset($modelConfig['toolbar']) && isset($this->widgets['toolbar'])) {
            $this->toolbarWidget = $this->widgets['toolbar'];
            $this->toolbarWidget->reInitialize($modelConfig['toolbar']);
        }
    }

    protected function findSettingDefinitions($code)
    {
        if (!strlen($code))
            throw new Exception(lang('admin::lang.form.missing_id'));

        // Prep the list widget config
        $model = $this->createModel();

        $definition = $model->getSettingDefinitions($code);

        return [$model, $definition];
    }

    protected function createModel()
    {
        if (!isset($this->modelClass) || !strlen($this->modelClass)) {
            throw new Exception(lang('system::lang.settings.alert_settings_missing_model'));
        }

        return new $this->modelClass();
    }

    protected function formAfterSave($model)
    {
        $this->validateSettingItems(true);
    }

    protected function validateSettingItems($skipSession = false)
    {
        $settingItemErrors = Session::get('settings.errors', []);

        if ($skipSession || !$settingItemErrors) {
            $model = $this->createModel();
            $settingItems = array_get($model->listSettingItems(), 'core');
            $settingValues = array_undot($model->getFieldValues());

            foreach ($settingItems as $settingItem) {
                $settingItemForm = $this->createModel()->getFieldConfig($settingItem->code);

                if (!isset($settingItemForm['rules']))
                    continue;

                $validator = $this->makeValidator($settingValues, $settingItemForm['rules']);
                $errors = $validator->fails() ? $validator->errors() : [];

                $settingItemErrors[$settingItem->code] = $errors;
            }

            Session::put('settings.errors', $settingItemErrors);
        }

        return $this->settingItemErrors = $settingItemErrors;
    }

    protected function validateFormRequest($model, $definition)
    {
        if (!strlen($requestClass = $definition->request))
            return;

        if (!class_exists($requestClass))
            throw new ApplicationException(sprintf(lang('admin::lang.form.request_class_not_found'), $requestClass));

        app()->resolving($requestClass, function ($request, $app) {
            if (method_exists($request, 'setController'))
                $request->setController($this);

            $request->setInputKey('setting'); // Changed to lowercase to match form field names (setting[site_logo])
        });

        return app()->make($requestClass);
    }
    protected function pmdCleanupDuplicateSettingsRows(array $keys): void
    {
        try {
            foreach ($keys as $key) {
                $rows = DB::table('settings')->where('item', $key)->orderByDesc('setting_id')->get(['setting_id','value']);
                if ($rows->count() <= 1) continue;
                $keepId = null;
                foreach ($rows as $row) {
                    if (trim((string)$row->value) !== '') { $keepId = (int)$row->setting_id; break; }
                }
                if (!$keepId) $keepId = (int)$rows->first()->setting_id;
                $deleteIds = $rows->pluck('setting_id')->filter(fn($id)=>(int)$id !== $keepId)->values()->all();
                if ($deleteIds) DB::table('settings')->whereIn('setting_id', $deleteIds)->delete();
            }
        } catch (\Throwable $e) {
            \Log::warning('PMD_SETTINGS_DEDUP_FAILED',['error'=>$e->getMessage()]);
        }
    }

}
