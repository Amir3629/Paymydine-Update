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
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');

        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Template::setTitle('Settings');
        Template::setHeading('Settings');

        $locationId = $this->currentLocationId();

        $this->vars['pmdSettingsLocationId'] = $locationId;
        $this->vars['pmdSettingsOpeningHours'] = $this->openingHours($locationId);
        $this->vars['pmdSettingsGroups'] = $this->groups($locationId);
        $this->vars['pmdSettingsHealth'] = [];

        return $this->makeView('pmdsettings/index');
    }

    public function restaurant()
    {
        Template::setTitle('Restaurant profile');
        Template::setHeading('Restaurant profile');

        $locationId = $this->currentLocationId();

        $this->vars['pmdProfile'] = $this->restaurantProfilePayload($locationId);
        $this->vars['pmdProfileHours'] = $this->openingHours($locationId);
        $this->vars['pmdProfileLocationId'] = $locationId;

        return $this->makeView('pmdsettings/restaurant');
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

        DB::transaction(function () use ($locationId, $clean, $profile, $hours) {
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

            setting()->set($settings);
            setting()->save();

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

        flash()->success('Restaurant profile saved.');

        return [
            '#pmd-profile-save-status' => '<span class="pmd-profile-save-status is-success">Saved</span>',
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
            try {
                return setting($key, $fallback);
            } catch (\Throwable $error) {
                return $fallback;
            }
        };

        return [
            'name' => (string)($value('site_name') ?: ($location->location_name ?? '')),
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
            'site_logo' => (string)$value('site_logo', ''),
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
            [
                'id' => 'restaurant', 'eyebrow' => '', 'title' => 'Restaurant', 'description' => '',
                'items' => [
                    $this->item('Restaurant profile', 'Name, contact, address, opening hours, website and social links.', 'restaurant', admin_url('pmdsettings/restaurant'), ''),
                ],
            ],
            [
                'id' => 'guest', 'eyebrow' => '', 'title' => 'Menu & Guest Experience', 'description' => '',
                'items' => [
                    $this->item('Menu & checkout', 'Guest-facing menu, highlights, review prompt and checkout experience.', 'menu', admin_url('pmdmenu'), ''),
                    $this->item('Customer accounts', 'Guest registration and account communication settings.', 'user', admin_url('settings/edit/user'), ''),
                ],
            ],
            [
                'id' => 'team', 'eyebrow' => '', 'title' => 'Team & Access', 'description' => '',
                'items' => [
                    $this->item('Team & access', 'Staff, roles, permissions, login and PIN policies in one place.', 'users', admin_url('pmdteam'), ''),
                ],
            ],
            [
                'id' => 'devices', 'eyebrow' => '', 'title' => 'Devices & Hardware', 'description' => '',
                'items' => [
                    $this->item('Devices', 'KDS, POS terminals, cash drawers, biometric devices and connected screens.', 'monitor', admin_url('pmddevices'), ''),
                ],
            ],
            [
                'id' => 'finance', 'eyebrow' => '', 'title' => 'Payments & Finance', 'description' => '',
                'items' => [
                    $this->item('Payment methods', 'Configure how guests can pay.', 'card', admin_url('pmdfinance#payment-methods'), ''),
                    $this->item('Tax & invoicing', 'VAT, tax calculation, invoice numbering, logo and receipt presentation.', 'invoice', admin_url('pmdfinance#tax-invoicing'), ''),
                    $this->item('Fiskaly / TSE', 'German fiscal compliance and TSE configuration.', 'receipt', admin_url('pmdfinance#fiskaly'), ''),
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
