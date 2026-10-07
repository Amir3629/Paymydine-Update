<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use App\Services\GoogleBusiness\PmdGoogleBusinessService;
use App\Services\Reservations\PmdReservationMessagingService;
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
            // Reuse the exact provider connection modal/card language already
            // used by PayMyDine Finance instead of inventing a second modal UI.
            $this->addCss('css/pmd-payment-provider-catalogue-v1.css');
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
        // PMD_SETTINGS_NO_TEAM_CARD_V1: Team/member authority is Shifts.
        $this->vars['pmdSettingsGroups'] = collect($this->groups($locationId))
            ->reject(fn ($group) => strtolower((string)($group['id'] ?? '')) === 'team')
            ->values()
            ->all();
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

        try {
            $this->vars['pmdGoogleBusiness'] = app(PmdGoogleBusinessService::class)->status($locationId);
        } catch (\Throwable $error) {
            $this->vars['pmdGoogleBusiness'] = [
                'configured' => false,
                'places_configured' => false,
                'notifications_configured' => false,
                'connected' => false,
                'pending_location' => false,
                'location_id' => $locationId,
                'last_error' => $error->getMessage(),
            ];
        }

        return $this->makeView('pmdsettings/restaurant');
    }



    /* PMD_FRONTEND_SETTINGS_V2_CONTROLLER */
    public function frontend()
    {
        Template::setTitle(\Admin\Classes\PmdPlatformI18n::fromEnglish('Customer Experience & Design', 'settings.'));
        Template::setHeading(\Admin\Classes\PmdPlatformI18n::fromEnglish('Customer Experience & Design', 'settings.'));
        $this->vars['pmdFrontend'] = $this->frontendExperiencePayload();

        // PMD_CUSTOMER_EXPERIENCE_QR_LIBRARY_R39
        // QR design tools are presentation-only. They reuse the existing table
        // QR authority and never persist or regenerate a table identity.
        $this->vars['pmdCustomerQrTables'] = $this->customerQrDesignTablesR39();
        $this->vars['pmdCustomerQrIdentity'] = $this->resolvedRestaurantIdentityR25(true);

        return $this->makeView('pmdsettings/frontend');
    }

    public function onPmdCustomerQrDesignData()
    {
        $tableId = max(0, (int)request()->input('table_id', 0));
        if ($tableId < 1) {
            return response()->json([
                'ok' => false,
                'message' => 'Choose a table first.',
            ], 422);
        }

        $locationId = $this->currentLocationId();
        $query = \Admin\Models\Tables_model::query()
            ->where('table_id', $tableId);

        try {
            $query->whereHasLocation($locationId);
        } catch (\Throwable $ignored) {
            try {
                if (Schema::hasColumn('tables', 'location_id')) {
                    $query->where('location_id', $locationId);
                }
            } catch (\Throwable $ignoredAgain) {
            }
        }

        $table = $query->first();
        if (!$table) {
            return response()->json([
                'ok' => false,
                'message' => 'Table not found for this restaurant.',
            ], 404);
        }

        $tableNo = trim((string)($table->table_no ?? $tableId));
        $routeTable = trim((string)($table->pos_table_label ?? '')) ?: $tableNo;
        $capacity = max(1, (int)($table->preferred_capacity ?? $table->max_capacity ?? 1));
        $qrCode = trim((string)($table->qr_code ?? ''));

        if ($qrCode === '') {
            return response()->json([
                'ok' => false,
                'message' => 'This table does not have a QR code yet.',
            ], 404);
        }

        $updatedAt = $table->updated_at ?? null;
        $updatedTime = $updatedAt && method_exists($updatedAt, 'format')
            ? $updatedAt->format('H:i')
            : date('H:i');
        $updatedDate = $updatedAt && method_exists($updatedAt, 'format')
            ? $updatedAt->format('Y-m-d')
            : date('Y-m-d');

        $targetUrl = rtrim(request()->getSchemeAndHttpHost(), '/')
            .'/table/'.rawurlencode($routeTable)
            .'?'.http_build_query([
                'location' => $locationId,
                'guest' => $capacity,
                'date' => $updatedDate,
                'time' => $updatedTime,
                'qr' => $qrCode,
                'table' => $routeTable,
            ]);

        $imageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&ecc=H&qzone=4&data='
            .rawurlencode($targetUrl);

        $context = stream_context_create([
            'http' => [
                'timeout' => 8,
                'user_agent' => 'PayMyDine Customer Experience QR/1.0',
            ],
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
            ],
        ]);

        $png = @file_get_contents($imageUrl, false, $context);
        if (!is_string($png) || $png === '') {
            return response()->json([
                'ok' => false,
                'message' => 'QR preview could not be prepared. Please try again.',
            ], 502);
        }

        $identity = $this->resolvedRestaurantIdentityR25(false);
        $safeNo = preg_replace('/[^A-Za-z0-9_-]+/', '-', $tableNo) ?: (string)$tableId;

        return response()->json([
            'ok' => true,
            'data_url' => 'data:image/png;base64,'.base64_encode($png),
            'filename' => 'paymydine-table-'.$safeNo.'-qr.png',
            'table_id' => $tableId,
            'table_name' => 'Table '.$tableNo,
            'restaurant_name' => (string)($identity['name'] ?? 'Restaurant'),
            'restaurant_logo' => $this->restaurantLogoPreviewR20((string)($identity['logo'] ?? '')),
            'active' => (bool)($table->table_status ?? true),
        ]);
    }

    protected function customerQrDesignTablesR39(): array
    {
        $locationId = $this->currentLocationId();

        try {
            $query = \Admin\Models\Tables_model::query();

            try {
                $query->whereHasLocation($locationId);
            } catch (\Throwable $ignored) {
                if (Schema::hasColumn('tables', 'location_id')) {
                    $query->where('location_id', $locationId);
                }
            }

            return $query
                ->orderBy('table_no')
                ->limit(250)
                ->get()
                ->map(static function ($table) {
                    $id = (int)($table->table_id ?? $table->id ?? 0);
                    $number = trim((string)($table->table_no ?? $id));

                    return [
                        'id' => $id,
                        'number' => $number,
                        'name' => trim((string)($table->table_name ?? '')) ?: 'Table '.$number,
                        'active' => (bool)($table->table_status ?? true),
                    ];
                })
                ->filter(static fn ($table) => (int)$table['id'] > 0)
                ->values()
                ->all();
        } catch (\Throwable $error) {
            report($error);
            return [];
        }
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
        $messagingInput = (array)post('messaging', []);
        $googleBusinessInput = (array)post('google_business', []);

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

        $googleValidator = Validator::make($googleBusinessInput, [
            'client_id' => ['nullable', 'string', 'max:500'],
            'client_secret' => ['nullable', 'string', 'max:1000'],
            'places_api_key' => ['nullable', 'string', 'max:1000'],
            'pubsub_topic' => ['nullable', 'string', 'max:500'],
            'pubsub_token' => ['nullable', 'string', 'max:1000'],
        ]);

        $messagingValidator = Validator::make($messagingInput, [
            'owner_email' => ['nullable', 'email', 'max:191'],
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
            'whatsapp_phone_number_id' => ['nullable', 'string', 'max:191'],
            'whatsapp_business_account_id' => ['nullable', 'string', 'max:191'],
            'whatsapp_access_token' => ['nullable', 'string', 'max:4096'],
            'whatsapp_graph_version' => ['nullable', 'string', 'max:20'],
            'whatsapp_public_number' => ['nullable', 'string', 'max:64'],
            'whatsapp_default_country_code' => ['nullable', 'string', 'max:8'],
            'whatsapp_template_created' => ['nullable', 'string', 'max:191'],
            'whatsapp_template_updated' => ['nullable', 'string', 'max:191'],
            'whatsapp_template_canceled' => ['nullable', 'string', 'max:191'],
            'whatsapp_template_language' => ['nullable', 'string', 'max:20'],
        ]);

        if ($messagingValidator->fails()) {
            throw new ValidationException($messagingValidator);
        }

        $messagingClean = $messagingValidator->validated();

        if ($googleValidator->fails()) {
            throw new ValidationException($googleValidator);
        }

        $googleClean = $googleValidator->validated();
        $pubsubTopic = trim((string)($googleClean['pubsub_topic'] ?? ''));
        if ($pubsubTopic !== '' && !preg_match('#^projects/[^/]+/topics/[^/]+$#', $pubsubTopic)) {
            throw ValidationException::withMessages([
                'google_business.pubsub_topic' => [
                    'Google Pub/Sub topic must look like projects/PROJECT_ID/topics/TOPIC_NAME.',
                ],
            ]);
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

        DB::transaction(function () use ($locationId, $clean, $profile, $hours, $messagingInput, $messagingClean, $uploadedLogo, $removeLogo, $resolvedLogo) {
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

                // PMD_RESERVATION_MESSAGING_R28
                'pmd_reservation_email_enabled' => !empty($messagingInput['email_enabled']) ? 1 : 0,
                'pmd_reservation_whatsapp_enabled' => !empty($messagingInput['whatsapp_enabled']) ? 1 : 0,
                'pmd_reservation_owner_email_enabled' => !empty($messagingInput['owner_email_enabled']) ? 1 : 0,
                'pmd_reservation_notify_created' => !empty($messagingInput['notify_created']) ? 1 : 0,
                'pmd_reservation_notify_updated' => !empty($messagingInput['notify_updated']) ? 1 : 0,
                'pmd_reservation_notify_canceled' => !empty($messagingInput['notify_canceled']) ? 1 : 0,
                'pmd_reservation_owner_email' => strtolower(trim((string)($messagingClean['owner_email'] ?? ''))),
                'pmd_reservation_test_email' => strtolower(trim((string)($messagingClean['test_email'] ?? ''))),

                // Reuse PayMyDine/TastyIgniter mail authority so every mail path
                // uses the same configured restaurant sender.
                'sender_name' => trim((string)($messagingClean['sender_name'] ?? '')),
                'sender_email' => strtolower(trim((string)($messagingClean['sender_email'] ?? ''))),
                'protocol' => (string)($messagingClean['protocol'] ?? 'mail'),
                'smtp_host' => trim((string)($messagingClean['smtp_host'] ?? '')),
                'smtp_port' => (int)($messagingClean['smtp_port'] ?? 587),
                'smtp_encryption' => trim((string)($messagingClean['smtp_encryption'] ?? 'tls')),
                'smtp_user' => trim((string)($messagingClean['smtp_user'] ?? '')),
                'mailgun_domain' => trim((string)($messagingClean['mailgun_domain'] ?? '')),
                'ses_region' => trim((string)($messagingClean['ses_region'] ?? '')),

                'pmd_whatsapp_phone_number_id' => trim((string)($messagingClean['whatsapp_phone_number_id'] ?? '')),
                'pmd_whatsapp_business_account_id' => trim((string)($messagingClean['whatsapp_business_account_id'] ?? '')),
                'pmd_whatsapp_graph_version' => trim((string)($messagingClean['whatsapp_graph_version'] ?? 'v23.0')),
                'pmd_whatsapp_public_number' => trim((string)($messagingClean['whatsapp_public_number'] ?? '')),
                'pmd_whatsapp_default_country_code' => trim((string)($messagingClean['whatsapp_default_country_code'] ?? '')),
                'pmd_whatsapp_template_created' => trim((string)($messagingClean['whatsapp_template_created'] ?? '')),
                'pmd_whatsapp_template_updated' => trim((string)($messagingClean['whatsapp_template_updated'] ?? '')),
                'pmd_whatsapp_template_canceled' => trim((string)($messagingClean['whatsapp_template_canceled'] ?? '')),
                'pmd_whatsapp_template_language' => trim((string)($messagingClean['whatsapp_template_language'] ?? '')),
            ];

            foreach ([
                'smtp_pass',
                'mailgun_secret',
                'postmark_token',
                'ses_key',
                'ses_secret',
            ] as $secretKey) {
                $secretValue = trim((string)($messagingClean[$secretKey] ?? ''));
                if ($secretValue !== '') {
                    $settings[$secretKey] = $secretValue;
                }
            }

            $whatsappAccessToken = trim((string)($messagingClean['whatsapp_access_token'] ?? ''));
            if ($whatsappAccessToken !== '') {
                $settings['pmd_whatsapp_access_token'] = $whatsappAccessToken;
            }

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

        app(PmdGoogleBusinessService::class)->saveConfiguration(
            $locationId,
            request()->getHost(),
            $googleClean
        );

        flash()->success(\Admin\Classes\PmdPlatformI18n::fromEnglish('Restaurant profile saved.', 'settings.'));

        return [
            '#pmd-profile-save-status' => '<span class="pmd-profile-save-status is-success">'.\Admin\Classes\PmdPlatformI18n::fromEnglish('Saved', 'settings.').'</span>',
        ];
    }

    public function onTestReservationEmail()
    {
        $result = app(PmdReservationMessagingService::class)->testEmail(
            trim((string)post('messaging.test_email', ''))
        );

        $class = !empty($result['success']) ? 'is-success' : 'is-error';
        $message = e((string)($result['message'] ?? 'Email test finished.'));

        return [
            '#pmd-reservation-email-test-status' => '<span class="pmd-profile-messaging-test '.$class.'">'.$message.'</span>',
        ];
    }

    public function onTestReservationWhatsapp()
    {
        $result = app(PmdReservationMessagingService::class)->testWhatsapp();
        $class = !empty($result['success']) ? 'is-success' : 'is-error';
        $message = e((string)($result['message'] ?? 'WhatsApp test finished.'));

        return [
            '#pmd-reservation-whatsapp-test-status' => '<span class="pmd-profile-messaging-test '.$class.'">'.$message.'</span>',
        ];
    }

    public function onGoogleBusinessSync()
    {
        try {
            $result = app(PmdGoogleBusinessService::class)
                ->syncReviews($this->currentLocationId());

            flash()->success(
                'Google Reviews synced: '.(int)($result['synced'] ?? 0).' review(s).'
            );
        } catch (\Throwable $error) {
            throw new \RuntimeException($error->getMessage());
        }

        return [
            '#pmd-google-business-status-v2' => '<span class="label label-success">Synced</span>',
        ];
    }

    public function onGoogleBusinessRefreshLinks()
    {
        try {
            app(PmdGoogleBusinessService::class)
                ->refreshPlaceLinks($this->currentLocationId());
            flash()->success('Google Maps and direct review links refreshed.');
        } catch (\Throwable $error) {
            throw new \RuntimeException($error->getMessage());
        }

        return [
            '#pmd-google-business-status-v2' => '<span class="label label-success">Links refreshed</span>',
        ];
    }

    public function onGoogleBusinessDisconnect()
    {
        try {
            app(PmdGoogleBusinessService::class)
                ->disconnect($this->currentLocationId());
            flash()->success('Google Business Profile disconnected.');
        } catch (\Throwable $error) {
            throw new \RuntimeException($error->getMessage());
        }

        return [
            '#pmd-google-business-status-v2' => '<span class="label label-default">Disconnected</span>',
        ];
    }

    public function onGoogleBusinessClearCredentials()
    {
        try {
            app(PmdGoogleBusinessService::class)
                ->clearConfiguration($this->currentLocationId());
            flash()->success('Google Business credentials cleared for this restaurant.');
        } catch (\Throwable $error) {
            throw new \RuntimeException($error->getMessage());
        }

        return [
            '#pmd-google-business-status-v2' => '<span class="label label-default">Credentials cleared</span>',
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

            // PMD_RESERVATION_MESSAGING_R28
            'reservation_email_enabled' => (bool)$value('pmd_reservation_email_enabled', 0),
            'reservation_whatsapp_enabled' => (bool)$value('pmd_reservation_whatsapp_enabled', 0),
            'reservation_owner_email_enabled' => (bool)$value('pmd_reservation_owner_email_enabled', 0),
            'reservation_notify_created' => (bool)$value('pmd_reservation_notify_created', 1),
            'reservation_notify_updated' => (bool)$value('pmd_reservation_notify_updated', 1),
            'reservation_notify_canceled' => (bool)$value('pmd_reservation_notify_canceled', 1),
            'reservation_owner_email' => (string)$value('pmd_reservation_owner_email', ''),
            'reservation_test_email' => (string)$value('pmd_reservation_test_email', ''),
            'sender_name' => (string)$value('sender_name', ''),
            'sender_email' => (string)$value('sender_email', ''),
            'protocol' => (string)$value('protocol', 'mail'),
            'smtp_host' => (string)$value('smtp_host', ''),
            'smtp_port' => (int)$value('smtp_port', 587),
            'smtp_encryption' => (string)$value('smtp_encryption', 'tls'),
            'smtp_user' => (string)$value('smtp_user', ''),
            'has_smtp_pass' => trim((string)$value('smtp_pass', '')) !== '',
            'mailgun_domain' => (string)$value('mailgun_domain', ''),
            'has_mailgun_secret' => trim((string)$value('mailgun_secret', '')) !== '',
            'has_postmark_token' => trim((string)$value('postmark_token', '')) !== '',
            'has_ses_key' => trim((string)$value('ses_key', '')) !== '',
            'has_ses_secret' => trim((string)$value('ses_secret', '')) !== '',
            'ses_region' => (string)$value('ses_region', ''),
            'whatsapp_phone_number_id' => (string)$value('pmd_whatsapp_phone_number_id', ''),
            'whatsapp_business_account_id' => (string)$value('pmd_whatsapp_business_account_id', ''),
            'has_whatsapp_access_token' => trim((string)$value('pmd_whatsapp_access_token', '')) !== '',
            'whatsapp_graph_version' => (string)$value('pmd_whatsapp_graph_version', 'v23.0'),
            'whatsapp_public_number' => (string)$value('pmd_whatsapp_public_number', ''),
            'whatsapp_default_country_code' => (string)$value('pmd_whatsapp_default_country_code', ''),
            'whatsapp_template_created' => (string)$value('pmd_whatsapp_template_created', ''),
            'whatsapp_template_updated' => (string)$value('pmd_whatsapp_template_updated', ''),
            'whatsapp_template_canceled' => (string)$value('pmd_whatsapp_template_canceled', ''),
            'whatsapp_template_language' => (string)$value('pmd_whatsapp_template_language', ''),
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
                    $this->item('Customer Experience', 'Themes, QR designs and guest-facing settings.', 'palette', admin_url('pmdsettings/frontend'), ''),
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
