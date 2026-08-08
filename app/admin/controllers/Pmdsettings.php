<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD Settings Center
 *
 * A clean owner-facing information architecture that keeps all existing
 * settings/routes intact while presenting them in one coherent place.
 * This page is intentionally read-only: it does not migrate or rewrite any
 * existing setting. Each module continues to use its established authority.
 */
class Pmdsettings extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    public function __construct()
    {
        parent::__construct();
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
        $this->vars['pmdSettingsHealth'] = $this->health($locationId);

        return $this->makeView('pmdsettings/index');
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

        // PayMyDine currently operates as a single-restaurant installation.
        return 1;
    }

    protected function openingHours(int $locationId): array
    {
        $days = [
            0 => 'Monday',
            1 => 'Tuesday',
            2 => 'Wednesday',
            3 => 'Thursday',
            4 => 'Friday',
            5 => 'Saturday',
            6 => 'Sunday',
        ];

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

            // IMPORTANT: query the relation table directly. Do not call
            // Locations_model::getWorkingHours(), because that helper creates
            // default rows for locations with no schedule.
            $rows = DB::table('working_hours')
                ->where('location_id', $locationId)
                ->where('type', 'opening')
                ->orderBy('weekday')
                ->orderBy('id')
                ->get();

            foreach ($rows as $row) {
                $weekday = (int)$row->weekday;
                if (!array_key_exists($weekday, $result)) {
                    continue;
                }

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

    protected function health(int $locationId): array
    {
        $hours = collect($this->openingHours($locationId));
        $hasHours = $hours->contains(fn ($day) => !empty($day['enabled']));

        return [
            [
                'label' => 'Restaurant profile',
                'ready' => (string)setting('site_name', '') !== '',
                'href' => admin_url('settings/edit/general'),
            ],
            [
                'label' => 'Opening hours',
                'ready' => $hasHours,
                'href' => admin_url('locations/edit/'.$locationId),
            ],
            [
                'label' => 'Payment methods',
                'ready' => true,
                'href' => admin_url('payments?mode=methods'),
            ],
            [
                'label' => 'Team & roles',
                'ready' => true,
                'href' => admin_url('staffs'),
            ],
        ];
    }

    protected function groups(int $locationId): array
    {
        return [
            [
                'id' => 'restaurant',
                'eyebrow' => 'Core setup',
                'title' => 'Restaurant',
                'description' => 'Identity, hours, localization and the core rules that define how your restaurant operates.',
                'items' => [
                    $this->item('Restaurant profile', 'Name, email, address, logos and core restaurant information.', 'restaurant', admin_url('settings/edit/general'), 'Core'),
                    $this->item('Opening hours', 'Weekly service hours used by reservations, availability and customer-facing experiences.', 'clock', admin_url('locations/edit/'.$locationId), 'Important'),
                    $this->item('Localization', 'Language, country, currency and timezone settings.', 'globe', admin_url('settings'), 'Setup'),
                    $this->item('Business information', 'Company details, policies and legal information.', 'building', admin_url('settings'), 'Occasional'),
                ],
            ],
            [
                'id' => 'guest',
                'eyebrow' => 'Guest-facing',
                'title' => 'Menu & Guest Experience',
                'description' => 'Everything guests see or interact with on the digital menu and checkout experience.',
                'items' => [
                    $this->item('Menu presentation', 'Menu highlights, featured items and guest-facing menu behaviour.', 'menu', admin_url('settings/edit/menu_highlights'), 'Frontend'),
                    $this->item('Reviews & social links', 'Post-checkout review prompts and social links shown to guests.', 'star', admin_url('settings/edit/review_social'), 'Frontend'),
                    $this->item('Customer registration', 'Guest account and registration communication settings.', 'user', admin_url('settings'), 'Optional'),
                    $this->item('Media library', 'Restaurant media, upload rules and reusable guest-facing assets.', 'image', admin_url('settings'), 'Assets'),
                ],
            ],
            [
                'id' => 'reservations',
                'eyebrow' => 'Operations',
                'title' => 'Reservations & Floor',
                'description' => 'Reservation behaviour, service hours, tables, floor operations and booking rules.',
                'items' => [
                    $this->item('Reservation settings', 'Booking interval, stay time, advance booking and reservation behaviour.', 'calendar', admin_url('settings'), 'Daily ops'),
                    $this->item('Opening hours', 'The shared schedule authority for reservation times and Hour View.', 'clock', admin_url('locations/edit/'.$locationId), 'Shared'),
                    $this->item('Tables & floor', 'Table capacity, floor layout and operational table settings.', 'table', admin_url('tables'), 'Floor'),
                    $this->item('Reservations workspace', 'Open the live reservations and floor workspace.', 'booking', admin_url('reservations2'), 'Workspace'),
                ],
            ],
            [
                'id' => 'team',
                'eyebrow' => 'People',
                'title' => 'Team & Access',
                'description' => 'Staff accounts, roles, permissions and authentication policies in one place.',
                'items' => [
                    $this->item('Staff', 'Manage team members, access and employee accounts.', 'users', admin_url('staffs'), 'Team'),
                    $this->item('Roles & permissions', 'Control what each role can see and change across PayMyDine.', 'shield', admin_url('staffs'), 'Access'),
                    $this->item('Authentication', 'Login, PIN and staff access policies.', 'key', admin_url('staffs'), 'Security'),
                ],
            ],
            [
                'id' => 'devices',
                'eyebrow' => 'Hardware',
                'title' => 'Devices & Hardware',
                'description' => 'POS hardware, kitchen displays, drawers, biometric devices, printers and connected screens.',
                'items' => [
                    $this->item('Kitchen displays', 'KDS stations and kitchen-facing operational screens.', 'monitor', admin_url('kdsstations'), 'Device'),
                    $this->item('Cash drawers', 'Configure cash drawers and their linked POS devices.', 'cash', admin_url('cashdrawers'), 'Device'),
                    $this->item('Biometric devices', 'Fingerprint and attendance devices for staff operations.', 'fingerprint', admin_url('biometricdevices'), 'Device'),
                    $this->item('POS terminals', 'Connected terminals, monitors and local POS device configuration.', 'terminal', admin_url('posdevices'), 'Device'),
                ],
            ],
            [
                'id' => 'finance',
                'eyebrow' => 'Money',
                'title' => 'Payments & Finance',
                'description' => 'Payment methods, taxes, fiscal compliance, invoicing, tips and cash-related configuration.',
                'items' => [
                    $this->item('Payment methods', 'Enable and configure the ways guests can pay.', 'card', admin_url('payments?mode=methods'), 'Payments'),
                    $this->item('VAT & taxes', 'Restaurant VAT, tax rates and fiscal calculation settings.', 'percent', admin_url('settings'), 'Required'),
                    $this->item('Invoicing', 'Invoice logo, numbering and receipt presentation.', 'invoice', admin_url('settings'), 'Finance'),
                    $this->item('Fiskaly / TSE', 'German fiscal compliance and TSE configuration.', 'receipt', admin_url('settings'), 'Required'),
                ],
            ],
            [
                'id' => 'brand',
                'eyebrow' => 'Identity',
                'title' => 'Branding & Communication',
                'description' => 'Logos, visual identity, email delivery and communication-facing assets.',
                'items' => [
                    $this->item('Brand assets', 'Restaurant, dashboard, favicon, invoice and email logos.', 'palette', admin_url('settings/edit/general'), 'Brand'),
                    $this->item('Email', 'Sending configuration and restaurant email behaviour.', 'mail', admin_url('settings'), 'Communication'),
                    $this->item('Media', 'Reusable images and upload settings for the PayMyDine experience.', 'image', admin_url('settings'), 'Assets'),
                ],
            ],
            [
                'id' => 'advanced',
                'eyebrow' => 'Rarely needed',
                'title' => 'System & Advanced',
                'description' => 'Technical configuration, logs and maintenance tools kept out of everyday restaurant setup.',
                'items' => [
                    $this->item('Panel settings', 'Maintenance mode and platform-level behaviour.', 'settings', admin_url('settings'), 'Advanced'),
                    $this->item('Activity & logs', 'Review recent system activity and operational logs.', 'activity', admin_url('activities'), 'System'),
                    $this->item('Legacy settings', 'Access every existing setting while the new center is being consolidated.', 'archive', admin_url('settings'), 'All settings'),
                ],
            ],
        ];
    }

    protected function item(string $title, string $description, string $icon, string $href, string $badge): array
    {
        return compact('title', 'description', 'icon', 'href', 'badge');
    }
}
