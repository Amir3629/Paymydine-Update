<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class Pmdbrand extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    public function __construct()
    {
        parent::__construct();
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-owner-settings-page pmd-brand-settings-page');
        $this->addCss('css/pmd-owner-settings-v1.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addJs('js/pmd-owner-settings-v1.js');
        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        // PMD_PMDBRAND_REDIRECT_R11
        return redirect(admin_url('pmdsettings/restaurant'));
    }

    public function onSaveBrand()
    {
        $input = (array)post('brand', []);

        $validator = Validator::make($input, [
            'site_logo' => ['nullable', 'string', 'max:500'],
            'dashboard_logo' => ['nullable', 'string', 'max:500'],
            'favicon_logo' => ['nullable', 'string', 'max:500'],
            'invoice_logo' => ['nullable', 'string', 'max:500'],
            'table_map_background_image' => ['nullable', 'string', 'max:500'],
            'mail_logo' => ['nullable', 'string', 'max:500'],
            'sender_name' => ['nullable', 'string', 'max:191'],
            'sender_email' => ['nullable', 'email', 'max:191'],
            'protocol' => ['nullable', 'in:mail,smtp,sendmail,mailgun,postmark,ses'],
            'smtp_host' => ['nullable', 'string', 'max:255'],
            'smtp_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'smtp_encryption' => ['nullable', 'string', 'max:20'],
            'smtp_user' => ['nullable', 'string', 'max:255'],
            'smtp_pass' => ['nullable', 'string', 'max:4096'],
            'mailgun_domain' => ['nullable', 'string', 'max:255'],
            'mailgun_secret' => ['nullable', 'string', 'max:4096'],
            'postmark_token' => ['nullable', 'string', 'max:4096'],
            'ses_key' => ['nullable', 'string', 'max:4096'],
            'ses_secret' => ['nullable', 'string', 'max:4096'],
            'ses_region' => ['nullable', 'string', 'max:100'],
            'test_email' => ['nullable', 'email', 'max:191'],
            'media_max_size' => ['nullable', 'integer', 'min:1', 'max:2048'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $clean = $validator->validated();

        $values = [
            'site_logo' => trim((string)($clean['site_logo'] ?? '')),
            'dashboard_logo' => trim((string)($clean['dashboard_logo'] ?? '')),
            'favicon_logo' => trim((string)($clean['favicon_logo'] ?? '')),
            'invoice_logo' => trim((string)($clean['invoice_logo'] ?? '')),
            'table_map_background_image' => trim((string)($clean['table_map_background_image'] ?? '')),
            'mail_logo' => trim((string)($clean['mail_logo'] ?? '')),
            'sender_name' => trim((string)($clean['sender_name'] ?? '')),
            'sender_email' => trim((string)($clean['sender_email'] ?? '')),
            'protocol' => (string)($clean['protocol'] ?? 'mail'),
            'smtp_host' => trim((string)($clean['smtp_host'] ?? '')),
            'smtp_port' => (int)($clean['smtp_port'] ?? 587),
            'smtp_encryption' => trim((string)($clean['smtp_encryption'] ?? 'tls')),
            'smtp_user' => trim((string)($clean['smtp_user'] ?? '')),
            'mailgun_domain' => trim((string)($clean['mailgun_domain'] ?? '')),
            'ses_region' => trim((string)($clean['ses_region'] ?? '')),
            'test_email' => trim((string)($clean['test_email'] ?? '')),
            'pmd_home_social_icons_enabled' => !empty($input['pmd_home_social_icons_enabled']) ? 1 : 0,
        ];

        foreach (['smtp_pass', 'mailgun_secret', 'postmark_token', 'ses_key', 'ses_secret'] as $secret) {
            $value = trim((string)($clean[$secret] ?? ''));
            if ($value !== '') $values[$secret] = $value;
        }

        $existingManager = $this->settingValue('image_manager', []);
        if (!is_array($existingManager)) $existingManager = [];
        $values['image_manager'] = array_merge($existingManager, [
            'max_size' => (int)($clean['media_max_size'] ?? ($existingManager['max_size'] ?? 10)),
            'uploads' => !empty($input['media_uploads']) ? 1 : 0,
            'new_folder' => !empty($input['media_new_folder']) ? 1 : 0,
            'copy' => !empty($input['media_copy']) ? 1 : 0,
            'move' => !empty($input['media_move']) ? 1 : 0,
            'rename' => !empty($input['media_rename']) ? 1 : 0,
            'delete' => !empty($input['media_delete']) ? 1 : 0,
        ]);

        DB::transaction(function () use ($values) {
            setting()->set($values);
            setting()->save();
            $this->syncDashboardLogo((string)($values['dashboard_logo'] ?? ''));
        });

        flash()->success('Brand & communication settings saved.');
        return ['#pmd-owner-save-status' => '<span>Saved</span>'];
    }

    protected function payload(): array
    {
        $keys = [
            'site_logo' => '', 'dashboard_logo' => '', 'favicon_logo' => '',
            'invoice_logo' => '', 'table_map_background_image' => '', 'mail_logo' => '',
            'sender_name' => '', 'sender_email' => '', 'protocol' => 'mail',
            'smtp_host' => '', 'smtp_port' => 587, 'smtp_encryption' => 'tls', 'smtp_user' => '',
            'mailgun_domain' => '', 'ses_region' => '', 'test_email' => '',
            'pmd_home_social_icons_enabled' => 1,
        ];

        foreach ($keys as $key => $fallback) {
            $keys[$key] = $this->settingValue($key, $fallback);
        }

        $manager = $this->settingValue('image_manager', []);
        if (!is_array($manager)) $manager = [];
        $keys['image_manager'] = array_merge([
            'max_size' => 10, 'uploads' => 1, 'new_folder' => 1, 'copy' => 1,
            'move' => 1, 'rename' => 1, 'delete' => 1,
        ], $manager);

        foreach (['smtp_pass', 'mailgun_secret', 'postmark_token', 'ses_key', 'ses_secret'] as $secret) {
            $keys['has_'.$secret] = trim((string)$this->settingValue($secret, '')) !== '';
        }

        return $keys;
    }

    protected function syncDashboardLogo(string $logo): void
    {
        try {
            if (!Schema::hasTable('logos')) return;

            $value = trim($logo);
            if ($value !== '' && !str_starts_with($value, 'http')) {
                $value = url('assets/media/uploads/'.ltrim($value, '/'));
            }

            if (DB::table('logos')->exists()) {
                DB::table('logos')->update(['dashboard_logo' => $value !== '' ? $value : null]);
            } else {
                DB::table('logos')->insert(['dashboard_logo' => $value !== '' ? $value : null]);
            }
        } catch (\Throwable $error) {
            logger()->warning('PMD Brand dashboard-logo sync failed', ['message' => $error->getMessage()]);
        }
    }

    protected function settingValue(string $key, $fallback = null)
    {
        try { return setting($key, $fallback); }
        catch (\Throwable $error) { return $fallback; }
    }
}
