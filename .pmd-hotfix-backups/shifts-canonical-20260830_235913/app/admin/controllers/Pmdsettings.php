<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * PMD Settings Center
 *
 * Owner-facing settings IA for PayMyDine. Existing authorities remain intact;
 * the new pages progressively combine them into fewer owner-friendly screens.
 */
class Pmdsettings extends AdminController
{
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2
    protected $requiredPermissions = 'Site.Settings';

    public function __construct()
    {
        parent::__construct();

        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-settings-center-page');

        // Register final page geometry in <head>. The shared first-paint
        // authority uses a stronger body-class selector than the old warm
        // admin theme, eliminating the cream shell before body paint.
        if ($this->action === 'restaurant') {
            $this->addCss('css/pmd-settings-restaurant-v1.css');
            $this->addCss('css/pmd-settings-restaurant-platform-header-v4.css');
            $this->addCss('css/pmd-settings-restaurant-spacing-v7.css');
        } else {
            $this->addCss('css/pmd-settings-center-v1.css');
        }
        // PMD_SETTINGS_SINGLE_FONT_AUTHORITY_R87A
        $this->addCss('css/pmd-settings-suite-first-paint-v2.css');

        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Template::setTitle(\Admin\Classes\PmdPlatformI18n::fromEnglish('Settings', 'settings.'));
        Template::setHeading(\Admin\Classes\PmdPlatformI18n::fromEnglish('Settings', 'settings.'));

        $locationId = $this->currentLocationId();

        $this->vars['pmdSettingsLocationId'] = $locationId;
        $this->vars['pmdSettingsOpeningHours'] = $this->openingHours($locationId);
        $this->vars['pmdSettingsGroups'] = $this->groups($locationId);
        $this->vars['pmdSettingsHealth'] = [];

        return $this->makeView('pmdsettings/index');
    }

    public function restaurant()
    {
        Template::setTitle(\Admin\Classes\PmdPlatformI18n::fromEnglish('Restaurant profile', 'settings.'));
        Template::setHeading(\Admin\Classes\PmdPlatformI18n::fromEnglish('Restaurant profile', 'settings.'));

        $locationId = $this->currentLocationId();

        // PMD_RESTAURANT_IDENTITY_AUTHORITY_R25
        // Repair generic/template branding before rendering the owner profile.
        $this->resolvedRestaurantIdentityR25(true);

        $this->vars['pmdProfile'] = $this->restaurantProfilePayload($locationId);
        $this->vars['pmdProfileHours'] = $this->openingHours($locationId);
        $this->vars['pmdProfileLocationId'] = $locationId;

        return $this->makeView('pmdsettings/restaurant');
    }



    /* PMD_FRONTEND_SETTINGS_V2_CONTROLLER */
    public function frontend()
    {
        Template::setTitle(\Admin\Classes\PmdPlatformI18n::fromEnglish('Customer menu & themes', 'settings.'));
        Template::setHeading(\Admin\Classes\PmdPlatformI18n::fromEnglish('Customer menu & themes', 'settings.'));
        $this->vars['pmdFrontend'] = $this->frontendExperiencePayload();
        return $this->makeView('pmdsettings/frontend');
    }

    public function onSaveFrontendExperience()
    {
        $input = (array)post('frontend', []);
        $allowedThemes = [
            'noir_editorial','verdant_modern','lumiere_fine_dining','kazen_japanese',
            'azzurra_coastal','neon_cocktail_bar','art_deco_speakeasy','shahrazad_persian',
            'anatolia_turkish','ember_steakhouse',
        ];
        $allowedPlatforms = ['instagram','facebook','trustpilot','reviews','website'];
        $allowedLayouts = ['tabs','accordion'];

        $validator = Validator::make($input, [
            'theme_configuration' => ['required', 'string', 'in:'.implode(',', $allowedThemes)],
            'languages' => ['nullable', 'array'],
            'languages.*' => ['string', 'regex:/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i'],
            'website_url' => ['nullable', 'url', 'max:500'],
            'featured_social_platform' => ['nullable', 'string', 'in:'.implode(',', $allowedPlatforms)],
            'featured_social_url' => ['nullable', 'url', 'max:500'],
            'kazen_menu_layout' => ['nullable', 'string', 'in:'.implode(',', $allowedLayouts)],
            'service_charge_type' => ['nullable','string','in:percentage,fixed'],
            'service_charge_value' => ['nullable','numeric','min:0','max:100000'],
            'service_charge_label' => ['nullable','string','max:191'],
        ]);
        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $clean = $validator->validated();
        $languages = array_values(array_unique(array_filter(array_map(function ($value) {
            return strtolower(trim((string)$value));
        }, (array)($clean['languages'] ?? [])))));
        if (!$languages) {
            $defaultLanguage = strtolower(trim((string)$this->restaurantSettingValueR24('default_language', 'en')));
            $languages = [$defaultLanguage ?: 'en'];
        }

        $theme = (string)$clean['theme_configuration'];
        $payload = [
            // PMD_FRONTEND_V2_SETTINGS_AUTHORITY_R3
            // These settings are the canonical V2 authority. The public V2
            // theme endpoint reads them before any legacy theme-table payload.
            'theme_configuration' => $theme,
            'theme_id' => $theme,
            'frontend_theme' => $theme,
            'pmd_v2_theme_id' => $theme,
            'pmd_admin_selected_theme' => $theme,
            'pmd_v2_enabled_languages' => implode(',', $languages),
            'pmd_v2_waiter_call_enabled' => !empty($input['waiter_call_enabled']) ? '1' : '0',
            'pmd_v2_valet_enabled' => !empty($input['valet_enabled']) ? '1' : '0',
            'pmd_v2_table_order_enabled' => !empty($input['table_order_enabled']) ? '1' : '0',
            'pmd_v2_split_bill_enabled' => !empty($input['split_bill_enabled']) ? '1' : '0',
            'pmd_v2_tips_enabled' => !empty($input['tips_enabled']) ? '1' : '0',
            'pmd_v2_coupons_enabled' => !empty($input['coupons_enabled']) ? '1' : '0',
            'pmd_v2_social_enabled' => !empty($input['social_enabled']) ? '1' : '0',
            // PMD_SPLIT_PAYMENT_SAFETY_R35
            'pmd_service_charge_enabled' => !empty($input['service_charge_enabled']) ? '1' : '0',
            'pmd_service_charge_type' => (string)($clean['service_charge_type'] ?? 'percentage'),
            'pmd_service_charge_value' => number_format(max(0, (float)($clean['service_charge_value'] ?? 0)), 4, '.', ''),
            'pmd_service_charge_label' => trim((string)($clean['service_charge_label'] ?? '')) ?: 'Service charge',
            'pmd_kazen_website_enabled' => !empty($input['website_enabled']) ? '1' : '0',
            'pmd_kazen_website_url' => trim((string)($clean['website_url'] ?? '')),
            'pmd_kazen_social_enabled' => !empty($input['featured_social_enabled']) ? '1' : '0',
            'pmd_kazen_social_platform' => (string)($clean['featured_social_platform'] ?? 'instagram'),
            'pmd_kazen_social_url' => trim((string)($clean['featured_social_url'] ?? '')),
            'kazen_menu_layout' => (string)($clean['kazen_menu_layout'] ?? 'tabs'),
        ];

        DB::transaction(function () use ($payload) {
            // PMD_THEME_IDENTITY_ISOLATION_R25
            // Never call the broad Settings manager here: an in-process stale
            // cache could re-persist site_name/site_logo while saving a theme.
            $this->persistSettingsDirectR25($payload);
            $this->persistFrontendThemePayload($payload);
            $this->resolvedRestaurantIdentityR25(true);
        });

        flash()->success(\Admin\Classes\PmdPlatformI18n::fromEnglish('Customer menu settings saved.', 'settings.'));
        return [
            '#pmd-frontend-save-status' => '<span class="pmd-frontend-save-status is-success">'.\Admin\Classes\PmdPlatformI18n::fromEnglish('Saved', 'settings.').'</span>',
        ];
    }

    protected function frontendExperiencePayload(): array
    {
        $data = $this->readFrontendThemePayload();
        $value = function (string $key, $fallback = '') use ($data) {
            // PMD_THEME_SETTINGS_DIRECT_DB_R25
            $settingValue = $this->restaurantSettingValueR24($key, null);
            if ($settingValue !== null && $settingValue !== '') return $settingValue;
            if (array_key_exists($key, $data) && $data[$key] !== null && $data[$key] !== '') {
                return $data[$key];
            }
            return $fallback;
        };

        $theme = (string)$value('pmd_v2_theme_id', '');
        if ($theme === '') $theme = (string)$value('theme_configuration', 'kazen_japanese');
        $languageRaw = (string)$value('pmd_v2_enabled_languages', (string)$this->restaurantSettingValueR24('default_language', 'en').',en');
        $languages = array_values(array_unique(array_filter(array_map('trim', explode(',', strtolower($languageRaw))))));

        return [
            'theme_configuration' => $theme,
            'enabled_languages' => $languages,
            'waiter_call_enabled' => (bool)$value('pmd_v2_waiter_call_enabled', 1),
            'valet_enabled' => (bool)$value('pmd_v2_valet_enabled', 0),
            'table_order_enabled' => (bool)$value('pmd_v2_table_order_enabled', 1),
            'split_bill_enabled' => (bool)$value('pmd_v2_split_bill_enabled', 1),
            'tips_enabled' => (bool)$value('pmd_v2_tips_enabled', 1),
            'coupons_enabled' => (bool)$value('pmd_v2_coupons_enabled', 1),
            'social_enabled' => (bool)$value('pmd_v2_social_enabled', 1),
            'service_charge_enabled' => (bool)$value('pmd_service_charge_enabled', 0),
            'service_charge_type' => (string)$value('pmd_service_charge_type', 'percentage'),
            'service_charge_value' => (float)$value('pmd_service_charge_value', 0),
            'service_charge_label' => (string)$value('pmd_service_charge_label', 'Service charge'),
            'website_enabled' => (bool)$value('pmd_kazen_website_enabled', 0),
            'website_url' => (string)$value('pmd_kazen_website_url', ''),
            'featured_social_enabled' => (bool)$value('pmd_kazen_social_enabled', 0),
            'featured_social_platform' => (string)$value('pmd_kazen_social_platform', 'instagram'),
            'featured_social_url' => (string)$value('pmd_kazen_social_url', ''),
            'kazen_menu_layout' => (string)$value('kazen_menu_layout', 'tabs'),
        ];
    }

    protected function decodeFrontendThemePayload($raw): array
    {
        if (is_array($raw)) return $raw;
        if (is_object($raw)) return json_decode(json_encode($raw), true) ?: [];
        if (!is_string($raw) || trim($raw) === '') return [];
        $json = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($json)) return $json;
        $unserialized = @unserialize($raw);
        if ($unserialized !== false || $raw === 'b:0;') {
            return json_decode(json_encode($unserialized), true) ?: [];
        }
        return [];
    }

    protected function readFrontendThemePayload(): array
    {
        $data = [];
        foreach (['themes', 'ti_themes'] as $table) {
            try {
                if (!Schema::hasTable($table)) continue;
                $query = DB::table($table)->where(function ($q) {
                    $q->where('code', 'frontend-theme')
                      ->orWhere('code', 'paymydine-nextjs')
                      ->orWhere('name', 'like', '%Menu Theme%');
                });
                // Oldest first; newest matching row wins when merged below.
                try { $query = $query->orderBy('updated_at'); } catch (\Throwable $error) {}
                foreach ($query->get() as $row) {
                    foreach (['data','settings','config','value'] as $column) {
                        if (isset($row->{$column}) && $row->{$column} !== '') {
                            $decoded = $this->decodeFrontendThemePayload($row->{$column});
                            if ($decoded) $data = array_replace_recursive($data, $decoded);
                        }
                    }
                }
            } catch (\Throwable $error) {}
        }
        return $data;
    }

    protected function persistFrontendThemePayload(array $payload): void
    {
        // Compatibility mirror only. Canonical authority is setting()->set($payload).
        foreach (['themes', 'ti_themes'] as $table) {
            try {
                if (!Schema::hasTable($table)) continue;
                $columns = Schema::getColumnListing($table);
                $rows = DB::table($table)->where(function ($q) {
                    $q->where('code', 'frontend-theme')
                      ->orWhere('code', 'paymydine-nextjs')
                      ->orWhere('name', 'like', '%Menu Theme%');
                })->get();

                foreach ($rows as $row) {
                    $storageColumn = null;
                    foreach (['data','settings','config','value'] as $column) {
                        if (in_array($column, $columns, true) && isset($row->{$column}) && $row->{$column} !== '') {
                            $storageColumn = $column;
                            break;
                        }
                    }
                    if (!$storageColumn) {
                        foreach (['data','settings','config','value'] as $column) {
                            if (in_array($column, $columns, true)) { $storageColumn = $column; break; }
                        }
                    }
                    if (!$storageColumn) continue;

                    $current = $this->decodeFrontendThemePayload($row->{$storageColumn} ?? null);
                    $merged = array_replace($current, $payload);
                    $update = [$storageColumn => json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
                    if (in_array('updated_at', $columns, true)) $update['updated_at'] = now();

                    if (in_array('theme_id', $columns, true) && isset($row->theme_id)) {
                        DB::table($table)->where('theme_id', $row->theme_id)->update($update);
                    } elseif (in_array('id', $columns, true) && isset($row->id)) {
                        DB::table($table)->where('id', $row->id)->update($update);
                    } elseif (in_array('code', $columns, true) && isset($row->code)) {
                        DB::table($table)->where('code', $row->code)->update($update);
                    }
                }
                if ($rows->count()) return;
            } catch (\Throwable $error) {
                logger()->warning('PMD frontend settings theme payload persistence failed', ['message' => $error->getMessage()]);
            }
        }
    }



    /* PMD_RESTAURANT_IDENTITY_R11_CONTROLLER */
    public function onSaveRestaurantIdentityV2()
    {
        $input = (array)post('pmd_identity', []);
        $siteName = trim((string)($input['site_name'] ?? ''));
        if ($siteName === '' || mb_strlen($siteName) > 191) {
            throw new \RuntimeException(\Admin\Classes\PmdPlatformI18n::fromEnglish('Restaurant name is required and must be 191 characters or fewer.', 'settings.'));
        }

        $settings = ['site_name' => $siteName];
        $file = request()->file('pmd_restaurant_logo');
        if ($file) {
            if (!$file->isValid()) {
                throw new \RuntimeException(\Admin\Classes\PmdPlatformI18n::fromEnglish('The uploaded logo could not be read.', 'settings.'));
            }
            if ((int)$file->getSize() > 5 * 1024 * 1024) {
                throw new \RuntimeException(\Admin\Classes\PmdPlatformI18n::fromEnglish('Restaurant logo must be 5 MB or smaller.', 'settings.'));
            }
            $mime = strtolower((string)$file->getMimeType());
            $extensions = [
                'image/png' => 'png',
                'image/jpeg' => 'jpg',
                'image/webp' => 'webp',
            ];
            if (!isset($extensions[$mime])) {
                throw new \RuntimeException(\Admin\Classes\PmdPlatformI18n::fromEnglish('Restaurant logo must be PNG, JPG or WEBP.', 'settings.'));
            }
            $directory = base_path('assets/media/attachments/public');
            if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
                throw new \RuntimeException(\Admin\Classes\PmdPlatformI18n::fromEnglish('Unable to create the PayMyDine media directory.', 'settings.'));
            }
            $filename = 'pmd_restaurant_logo_'.date('Ymd_His').'_'.bin2hex(random_bytes(6)).'.'.$extensions[$mime];
            $file->move($directory, $filename);
            $settings['site_logo'] = '/api/media/'.$filename;
        }

        $settings['pmd_restaurant_identity_name'] = $siteName;
        if (isset($settings['site_logo'])) {
            $settings['pmd_restaurant_identity_logo'] = $settings['site_logo'];
        }
        $this->persistSettingsDirectR25($settings);

        flash()->success(\Admin\Classes\PmdPlatformI18n::fromEnglish('Restaurant identity saved.', 'settings.'));
        return [
            '#pmd-restaurant-identity-status-r11' => '<span class="pmd-identity-r11__status">'.\Admin\Classes\PmdPlatformI18n::fromEnglish('Saved', 'settings.').'</span>',
        ];
    }


    /* PMD_RESTAURANT_PROFILE_SINGLE_AUTHORITY_R19 */
    /* PMD_RESTAURANT_LOGO_PHYSICAL_CONTRACT_R22 */
    protected function restaurantLogoLocalPathR22(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') return null;
        if (preg_match('#^https?://#i', $value)) return '__REMOTE__';
        $path = parse_url($value, PHP_URL_PATH) ?: $value;
        $base = basename(str_replace('\\', '/', $path));
        if ($base === '') return null;

        $root = base_path('assets/media/attachments/public');
        $direct = $root.'/'.$base;
        if (is_file($direct)) return $direct;
        if (is_dir($root)) {
            try {
                $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root, \RecursiveDirectoryIterator::SKIP_DOTS));
                foreach ($it as $file) {
                    if ($file->isFile() && $file->getFilename() === $base) return $file->getPathname();
                }
            } catch (\Throwable $error) {
            }
        }
        return null;
    }

    protected function restaurantLogoIsValidFileR22(string $path): bool
    {
        if ($path === '__REMOTE__') return true;
        if (!is_file($path)) return false;
        $size = @filesize($path);
        if (!$size || $size > 5 * 1024 * 1024) return false;
        $mime = strtolower((string)(@mime_content_type($path) ?: ''));
        return in_array($mime, ['image/png', 'image/jpeg', 'image/webp'], true);
    }

    protected function storeRestaurantLogoR19(): ?string
    {
        // PMD_NATIVE_MULTIPART_LOGO_UPLOAD_R22_CONTROLLER
        $file = request()->file('pmd_restaurant_logo');
        if (!$file) return null;
        if (!$file->isValid()) throw new \RuntimeException(\Admin\Classes\PmdPlatformI18n::fromEnglish('The uploaded restaurant logo could not be read.', 'settings.'));
        if ((int)$file->getSize() <= 0 || (int)$file->getSize() > 5 * 1024 * 1024) {
            throw new \RuntimeException(\Admin\Classes\PmdPlatformI18n::fromEnglish('Restaurant logo must be between 1 byte and 5 MB.', 'settings.'));
        }
        $mime = strtolower((string)$file->getMimeType());
        $extensions = ['image/png'=>'png', 'image/jpeg'=>'jpg', 'image/webp'=>'webp'];
        if (!isset($extensions[$mime])) throw new \RuntimeException(\Admin\Classes\PmdPlatformI18n::fromEnglish('Restaurant logo must be PNG, JPG or WEBP.', 'settings.'));

        $directory = base_path('assets/media/attachments/public');
        if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
            throw new \RuntimeException(\Admin\Classes\PmdPlatformI18n::fromEnglish('Unable to create the PayMyDine media directory.', 'settings.'));
        }
        $filename = 'pmd_restaurant_logo_'.date('Ymd_His').'_'.bin2hex(random_bytes(6)).'.'.$extensions[$mime];
        $file->move($directory, $filename);
        $stored = $directory.'/'.$filename;
        @chmod($stored, 0644);
        if (!$this->restaurantLogoIsValidFileR22($stored)) {
            @unlink($stored);
            throw new \RuntimeException(\Admin\Classes\PmdPlatformI18n::fromEnglish('Restaurant logo upload was received but the stored image failed validation.', 'settings.'));
        }
        return '/api/media/'.$filename;
    }


    /* PMD_RESTAURANT_SETTINGS_DIRECT_DB_AUTHORITY_R24 */
    protected function restaurantSettingValueR24(string $key, $fallback = '')
    {
        // Match the proven public Settings API authority: current tenant DB.
        // Do not let a stale in-process setting()/MediaFinder cache drive this page.
        try {
            $value = DB::table('settings')->where('item', $key)->value('value');
            if ($value !== null) {
                return $value;
            }
        } catch (\Throwable $error) {
        }

        try {
            return setting($key, $fallback);
        } catch (\Throwable $error) {
            return $fallback;
        }
    }

    /* PMD_RESTAURANT_IDENTITY_AUTHORITY_R25 */
    protected function persistSettingsDirectR25(array $values): void
    {
        if (!Schema::hasTable('settings')) {
            throw new \RuntimeException(\Admin\Classes\PmdPlatformI18n::fromEnglish('Tenant settings table is unavailable.', 'settings.'));
        }

        $columns = Schema::getColumnListing('settings');
        foreach ($values as $item => $value) {
            $item = trim((string)$item);
            if ($item === '') continue;

            $query = DB::table('settings')->where('item', $item);
            $write = ['value' => (string)$value];
            if (in_array('updated_at', $columns, true)) $write['updated_at'] = now();

            if ($query->exists()) {
                $query->update($write);
                continue;
            }

            $insert = ['item' => $item, 'value' => (string)$value];
            if (in_array('sort', $columns, true)) $insert['sort'] = 'config';
            if (in_array('serialized', $columns, true)) $insert['serialized'] = 0;
            if (in_array('created_at', $columns, true)) $insert['created_at'] = now();
            if (in_array('updated_at', $columns, true)) $insert['updated_at'] = now();
            DB::table('settings')->insert($insert);
        }
    }

    protected function tenantIdentityHostR25(): string
    {
        $host = strtolower(trim((string)request()->getHost()));
        return preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $host) ? $host : '';
    }

    protected function defaultRestaurantNameR25(): string
    {
        $host = $this->tenantIdentityHostR25();
        if ($host !== '') {
            $label = explode('.', $host)[0] ?? '';
            if ($label !== '') return $label;
        }
        return 'PayMyDine';
    }

    protected function defaultRestaurantLogoR25(): string
    {
        $host = $this->tenantIdentityHostR25();
        return $host !== ''
            ? 'https://'.$host.'/brand/paymydine-logo.svg'
            : '/brand/paymydine-logo.svg';
    }

    protected function isGenericRestaurantNameR25(string $name): bool
    {
        $name = strtolower(trim((string)preg_replace('/\s+/u', ' ', $name)));
        return $name === '' || in_array($name, [
            'tastyigniter',
            'tasty igniter',
            'default',
            'paymydine restaurant',
        ], true);
    }

    protected function isStaleRestaurantLogoR25(string $logo): bool
    {
        $logo = trim($logo);
        if ($logo === '') return true;
        $path = parse_url($logo, PHP_URL_PATH) ?: $logo;
        $base = strtolower(basename(str_replace('\\', '/', $path)));
        return in_array($base, [
            'gemini_generated_image_kzcmghkzcmghkzcm-removebg-preview.png',
            'images.png', 'image.png', 'images.jpg', 'image.jpg',
            'images.jpeg', 'image.jpeg', 'placeholder.svg', 'no-image.png',
        ], true);
    }

    protected function resolvedRestaurantIdentityR25(bool $persist = false): array
    {
        $dedicatedName = trim((string)$this->restaurantSettingValueR24('pmd_restaurant_identity_name', ''));
        $legacyName = trim((string)$this->restaurantSettingValueR24('site_name', ''));
        $locationName = '';
        try {
            $locationName = trim((string)(DB::table('locations')->orderBy('location_id')->value('location_name') ?? ''));
        } catch (\Throwable $error) {
        }

        $name = '';
        foreach ([$dedicatedName, $legacyName, $locationName] as $candidate) {
            if (!$this->isGenericRestaurantNameR25((string)$candidate)) {
                $name = trim((string)$candidate);
                break;
            }
        }
        if ($name === '') $name = $this->defaultRestaurantNameR25();

        $dedicatedLogo = trim((string)$this->restaurantSettingValueR24('pmd_restaurant_identity_logo', ''));
        $legacyLogo = trim((string)$this->restaurantSettingValueR24('site_logo', ''));
        $logo = !$this->isStaleRestaurantLogoR25($dedicatedLogo)
            ? $dedicatedLogo
            : (!$this->isStaleRestaurantLogoR25($legacyLogo)
                ? $legacyLogo
                : $this->defaultRestaurantLogoR25());

        if ($persist) {
            $this->persistSettingsDirectR25([
                'pmd_restaurant_identity_name' => $name,
                'pmd_restaurant_identity_logo' => $logo,
                'site_name' => $name,
                'site_logo' => $logo,
            ]);
        }

        return ['name' => $name, 'logo' => $logo];
    }

    /* PMD_RESTAURANT_LOGO_AUTHORITY_R20 */
    protected function restaurantLogoPreviewR20(string $value): string
    {
        $value = trim($value);
        if ($value === '') return '';
        $path = parse_url($value, PHP_URL_PATH) ?: $value;
        $base = strtolower(basename(str_replace('\\', '/', $path)));
        if (in_array($base, ['images.png','image.png','images.jpg','image.jpg','images.jpeg','image.jpeg','placeholder.svg','no-image.png'], true)) {
            return '';
        }
        if (preg_match('#^https?://#i', $value)) return $value;
        $path = '/'.ltrim(str_replace('\\', '/', $path), '/');
        if (str_starts_with($path, '/api/media/')) return $path;
        if (str_starts_with($path, '/assets/media/')) return $path;
        if (str_starts_with($path, '/uploads/')) return '/assets/media'.$path;
        return '/api/media/'.basename($path);
    }


    /* PMD_RESTAURANT_LOGO_PERSISTENCE_GUARD_R21 */
    protected function resolvedRestaurantLogoR21(?string $uploadedLogo, bool $removeLogo): string
    {
        if ($uploadedLogo !== null && trim($uploadedLogo) !== '') {
            return trim($uploadedLogo);
        }
        if ($removeLogo) {
            return $this->defaultRestaurantLogoR25();
        }

        $current = trim((string)$this->restaurantSettingValueR24('pmd_restaurant_identity_logo', ''));
        if ($current === '') {
            $current = trim((string)$this->restaurantSettingValueR24('site_logo', ''));
        }
        if ($current === '') {
            return $this->defaultRestaurantLogoR25();
        }

        $path = parse_url($current, PHP_URL_PATH) ?: $current;
        $base = basename(str_replace('\\', '/', $path));

        // The proven stale Mimoza logo must never be re-persisted by a cached settings object.
        if ($base === 'Gemini_Generated_Image_kzcmghkzcmghkzcm-removebg-preview.png') {
            return $this->defaultRestaurantLogoR25();
        }

        $resolvedPath = $this->restaurantLogoLocalPathR22($current);
        if ($resolvedPath === null || !$this->restaurantLogoIsValidFileR22($resolvedPath)) {
            return $this->defaultRestaurantLogoR25();
        }

        return $current;
    }

    public function onSaveRestaurantProfile()
    {
        $locationId = $this->currentLocationId();
        $profile = (array)post('profile', []);
        $hours = (array)post('hours', []);

        $validator = Validator::make($profile, [
            'name' => ['required', 'string', 'max:191'],
            'email' => ['nullable', 'email', 'max:191'],
            'telephone' => ['nullable', 'string', 'max:64'],
            'address_1' => ['nullable', 'string', 'max:191'],
            'address_2' => ['nullable', 'string', 'max:191'],
            'city' => ['nullable', 'string', 'max:120'],
            'state' => ['nullable', 'string', 'max:120'],
            'postcode' => ['nullable', 'string', 'max:32'],
            'website_url' => ['nullable', 'url', 'max:500'],
            'instagram_url' => ['nullable', 'url', 'max:500'],
            'google_url' => ['nullable', 'url', 'max:500'],
            'trustpilot_url' => ['nullable', 'url', 'max:500'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $clean = $validator->validated();
        $uploadedLogo = $this->storeRestaurantLogoR19();
        $removeLogo = !empty($profile['remove_logo']);
        $resolvedLogo = $this->resolvedRestaurantLogoR21($uploadedLogo, $removeLogo);

        foreach (range(0, 6) as $weekday) {
            $row = (array)($hours[$weekday] ?? []);
            $enabled = !empty($row['enabled']);
            $opening = trim((string)($row['opening_time'] ?? ''));
            $closing = trim((string)($row['closing_time'] ?? ''));

            if ($enabled && (!preg_match('/^([01]\\d|2[0-3]):[0-5]\\d$/', $opening)
                || !preg_match('/^([01]\\d|2[0-3]):[0-5]\\d$/', $closing))) {
                throw ValidationException::withMessages([
                    'hours.'.$weekday => ['Please enter a valid opening and closing time.'],
                ]);
            }
        }

        DB::transaction(function () use ($locationId, $clean, $profile, $hours, $uploadedLogo, $removeLogo, $resolvedLogo) {
            $settings = [
                'site_name' => trim((string)$clean['name']),
                'site_email' => trim((string)($clean['email'] ?? '')),
                'pmd_social_website_enabled' => !empty($profile['website_enabled']) ? 1 : 0,
                'pmd_social_website_url' => trim((string)($clean['website_url'] ?? '')),
                'pmd_social_instagram_enabled' => !empty($profile['instagram_enabled']) ? 1 : 0,
                'pmd_social_instagram_url' => trim((string)($clean['instagram_url'] ?? '')),
                'pmd_social_google_enabled' => !empty($profile['google_enabled']) ? 1 : 0,
                'pmd_social_google_url' => trim((string)($clean['google_url'] ?? '')),
                'pmd_social_trustpilot_enabled' => !empty($profile['trustpilot_enabled']) ? 1 : 0,
                'pmd_social_trustpilot_url' => trim((string)($clean['trustpilot_url'] ?? '')),
            ];

            // PMD_RESTAURANT_IDENTITY_PERSIST_R25
            // Owner identity is written to dedicated keys and mirrored to legacy
            // site_* keys. No broad Settings-manager flush is allowed here.
            $settings['site_logo'] = $resolvedLogo;
            $settings['pmd_restaurant_identity_name'] = trim((string)$clean['name']);
            $settings['pmd_restaurant_identity_logo'] = $resolvedLogo;
            $this->persistSettingsDirectR25($settings);

            DB::table('locations')
                ->where('location_id', $locationId)
                ->update([
                    'location_name' => trim((string)$clean['name']),
                    'location_email' => trim((string)($clean['email'] ?? '')),
                    'location_telephone' => trim((string)($clean['telephone'] ?? '')),
                    'location_address_1' => trim((string)($clean['address_1'] ?? '')),
                    'location_address_2' => trim((string)($clean['address_2'] ?? '')),
                    'location_city' => trim((string)($clean['city'] ?? '')),
                    'location_state' => trim((string)($clean['state'] ?? '')),
                    'location_postcode' => trim((string)($clean['postcode'] ?? '')),
                ]);

            foreach (range(0, 6) as $weekday) {
                $row = (array)($hours[$weekday] ?? []);
                $enabled = !empty($row['enabled']);
                $opening = $enabled ? trim((string)($row['opening_time'] ?? '')) : '00:00';
                $closing = $enabled ? trim((string)($row['closing_time'] ?? '')) : '23:59';

                DB::table('working_hours')->updateOrInsert(
                    [
                        'location_id' => $locationId,
                        'weekday' => $weekday,
                        'type' => 'opening',
                    ],
                    [
                        'opening_time' => $opening.':00',
                        'closing_time' => $closing.':00',
                        'status' => $enabled ? 1 : 0,
                    ]
                );
            }
        });

        flash()->success(\Admin\Classes\PmdPlatformI18n::fromEnglish('Restaurant profile saved.', 'settings.'));

        return [
            '#pmd-profile-save-status' => '<span class="pmd-profile-save-status is-success">'.\Admin\Classes\PmdPlatformI18n::fromEnglish('Saved', 'settings.').'</span>',
        ];
    }

    protected function currentLocationId(): int
    {
        try {
            $location = AdminLocation::current();
            if ($location && (int)$location->location_id > 0) {
                return (int)$location->location_id;
            }
        } catch (\Throwable $error) {
        }

        try {
            $sessionId = (int)AdminLocation::getSession('id');
            if ($sessionId > 0) {
                return $sessionId;
            }
        } catch (\Throwable $error) {
        }

        try {
            $defaultId = (int)params('default_location_id');
            if ($defaultId > 0) {
                return $defaultId;
            }
        } catch (\Throwable $error) {
        }

        return 1;
    }

    protected function restaurantProfilePayload(int $locationId): array
    {
        $location = null;

        try {
            $location = DB::table('locations')->where('location_id', $locationId)->first();
        } catch (\Throwable $error) {
        }

        $value = function (string $key, $fallback = '') {
            return $this->restaurantSettingValueR24($key, $fallback);
        };
        $identity = $this->resolvedRestaurantIdentityR25(true);

        return [
            'name' => (string)$identity['name'],
            'email' => (string)($value('site_email') ?: ($location->location_email ?? '')),
            'telephone' => (string)($location->location_telephone ?? ''),
            'address_1' => (string)($location->location_address_1 ?? ''),
            'address_2' => (string)($location->location_address_2 ?? ''),
            'city' => (string)($location->location_city ?? ''),
            'state' => (string)($location->location_state ?? ''),
            'postcode' => (string)($location->location_postcode ?? ''),
            'website_enabled' => (bool)$value('pmd_social_website_enabled', 0),
            'website_url' => (string)$value('pmd_social_website_url', ''),
            'instagram_enabled' => (bool)$value('pmd_social_instagram_enabled', 0),
            'instagram_url' => (string)$value('pmd_social_instagram_url', ''),
            'google_enabled' => (bool)$value('pmd_social_google_enabled', 0),
            'google_url' => (string)$value('pmd_social_google_url', ''),
            'trustpilot_enabled' => (bool)$value('pmd_social_trustpilot_enabled', 0),
            'trustpilot_url' => (string)$value('pmd_social_trustpilot_url', ''),
            'site_logo' => (string)($siteLogoR24 = $identity['logo']),
            'site_logo_preview' => $this->restaurantLogoPreviewR20((string)$siteLogoR24),
        ];
    }

    protected function openingHours(int $locationId): array
    {
        $days = [0=>'Monday',1=>'Tuesday',2=>'Wednesday',3=>'Thursday',4=>'Friday',5=>'Saturday',6=>'Sunday'];

        $result = [];
        foreach ($days as $weekday => $label) {
            $result[$weekday] = [
                'weekday' => $weekday,
                'label' => $label,
                'enabled' => false,
                'opening_time' => null,
                'closing_time' => null,
            ];
        }

        try {
            if (!Schema::hasTable('working_hours')) {
                return array_values($result);
            }

            $rows = DB::table('working_hours')
                ->where('location_id', $locationId)
                ->where('type', 'opening')
                ->orderBy('weekday')
                ->orderBy('id')
                ->get();

            foreach ($rows as $row) {
                $weekday = (int)$row->weekday;
                if (!array_key_exists($weekday, $result)) continue;
                $result[$weekday]['enabled'] = (bool)$row->status;
                $result[$weekday]['opening_time'] = substr((string)$row->opening_time, 0, 5);
                $result[$weekday]['closing_time'] = substr((string)$row->closing_time, 0, 5);
            }
        } catch (\Throwable $error) {
            logger()->warning('PMD Settings opening-hours summary failed', [
                'location_id' => $locationId,
                'message' => $error->getMessage(),
            ]);
        }

        return array_values($result);
    }

    protected function groups(int $locationId): array
    {
        return [
            // PMD_SETTINGS_SERVER_COPY_AUTHORITY_R88A
            // Visible Settings landing copy is final in server HTML.
            // CSS and canonical href changes must not alter the wording.
            [
                'id' => 'restaurant', 'eyebrow' => '', 'title' => 'Restaurant', 'description' => '',
                'items' => [
                    $this->item('Restaurant profile', 'Manage your restaurant details.', 'restaurant', admin_url('pmdsettings/restaurant'), ''),
                ],
            ],
            [
                'id' => 'guest', 'eyebrow' => '', 'title' => 'Menu & Guest Experience', 'description' => '',
                'items' => [
                    $this->item('Customer menu theme', 'Choose your digital menu theme.', 'palette', admin_url('pmdsettings/frontend'), ''),
                    // PMD_SETTINGS_REMOVE_MENU_CHECKOUT_CARD_R85
                    // Intentionally not exposed in the Settings Center.
                    // Pmdmenu remains available only as an internal/compatibility authority.
                    $this->item('Customer accounts', 'Guest registration and account communication settings.', 'user', admin_url('pmdcustomer'), ''),
                ],
            ],
            [
                'id' => 'team', 'eyebrow' => '', 'title' => 'Team & Access', 'description' => '',
                'items' => [
                    $this->item('Team & access', 'Manage staff and access.', 'users', admin_url('pmdteam'), ''),
                ],
            ],
            [
                'id' => 'devices', 'eyebrow' => '', 'title' => 'Devices & Hardware', 'description' => '',
                'items' => [
                    $this->item('Devices', 'Manage your connected devices.', 'monitor', admin_url('pmddevices'), ''),
                ],
            ],
            [
                'id' => 'finance', 'eyebrow' => '', 'title' => 'Payments & Finance', 'description' => '',
                'items' => [
                    $this->item('Payments & finance', 'Set payments, tax and invoices.', 'card', admin_url('pmdfinance'), ''),
                ],
            ],
            [
                'id' => 'brand', 'eyebrow' => '', 'title' => 'Branding & Communication', 'description' => '',
                'items' => [
                    $this->item('Brand & communication', 'Logos, email delivery and reusable media in one place.', 'palette', admin_url('pmdbrand'), ''),
                ],
            ],
            [
                'id' => 'advanced', 'eyebrow' => '', 'title' => 'System & Advanced', 'description' => '',
                'items' => [
                    $this->item('Advanced settings', 'System behaviour, maintenance and less frequently used configuration.', 'settings', admin_url('pmdadvanced'), ''),
                ],
            ],
        ];
    }

    protected function item(string $title, string $description, string $icon, string $href, string $badge = ''): array
    {
        return compact('title', 'description', 'icon', 'href', 'badge');
    }
}
