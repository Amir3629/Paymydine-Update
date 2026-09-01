<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\LocationOption;
use Admin\Models\Locations_model;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * PMD Ownerboard V2
 *
 * Clean owner dashboard HTML shell.
 *
 * Important architecture:
 * - does NOT inherit Dashboard2
 * - does NOT inherit Reservations2
 * - does NOT render Dashboard2/Reservations2 views
 * - Dashboard2 is reused only as proven JSON data authority
 * - the shared PMD Floor engine is reused as the canonical Floor authority
 */
class Ownerboard extends AdminController
{
    private const FLOOR_VIEW_OPTION =
        'pmd_reservations2_floor_view_main_floor';

    private const FLOOR_VIEW_ID = 'main-floor';

    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();

        $this->bodyClass = trim(
            ($this->bodyClass ?? '')
            .' pmd-settings-suite'
            .' pmd-ownerboard-page'
            .' pmd-ownerboard-v2-page'
        );

        /*
         * First-paint shell authority already proven by Settings.
         */
        $this->addCss(
            'css/pmd-settings-suite-first-paint-v1.css'
        );

        /*
         * Canonical shared Floor component.
         * We intentionally reuse the proven Floor engine/data/layout
         * instead of rebuilding a second table model in Ownerboard.
         */
        $this->addCss('css/pmd-floor-v1.css');
        $this->addCss('css/pmd-floor-v1-stable-v11.css');
        $this->addCss('css/pmd-floor-v1-native-smart-v20.css');
        $this->addCss(
            'css/pmd-reservations2-floor-canvas-v310.css'
        );

        /*
         * One clean Ownerboard presentation/runtime.
         */
        $this->addCss('css/pmd-ownerboard-v2.css');
        // PMD_OWNERBOARD_WORKPLACE_APPROVAL_V1
        $this->addCss('css/pmd-ownerboard-workplace-access-v1.css');
        $this->addJs('js/pmd-floor-v1.js');
        $this->addJs('js/pmd-ownerboard-v2.js');
        $this->addJs('js/pmd-ownerboard-workplace-access-v1.js');

        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        Template::setTitle('Dashboard');
        Template::setHeading('Dashboard');

        $locale = strtolower(
            trim(
                (string)request()->cookie(
                    'pmd_admin_locale',
                    app()->getLocale()
                )
            )
        );

        $this->vars['pmdOwnerboardLocale'] =
            str_starts_with($locale, 'de')
                ? 'de'
                : 'en';

        $this->vars['pmdOwnerboardEndpoints'] = [
            /*
             * Proven aggregate/data authorities.
             * They return JSON before Dashboard2 renders any HTML.
             */
            'kpis' =>
                admin_url('dashboard2').'?pmd_kpis=1',

            'analytics' =>
                admin_url('dashboard2').'?pmd_analytics=1',
        ];

        /*
         * Use the exact same persisted Floor view preference as
         * Dashboard2 / Reservations2 so the user's One Row / Full
         * Floor choice and Full Floor zoom carry over unchanged.
         */
        $this->vars['pmdOwnerboardFloorView'] =
            $this->readFloorViewPreference();

        return $this->makeView('ownerboard/index');
    }

    /**
     * AJAX handler used directly by pmd-floor-v1.js.
     */
    public function onSaveFloorViewPreference()
    {
        $user = AdminAuth::getUser();

        if (!$user) {
            return response()->json([
                'ok' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (
            !$user->hasPermission('Admin.Dashboard')
            && !$user->hasPermission('Admin.Reservations')
        ) {
            return response()->json([
                'ok' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        try {
            $location =
                $this->resolveFloorViewLocation($user);
        } catch (Throwable $exception) {
            $this->logFloorViewFailure(
                'location resolution',
                $exception
            );

            return response()->json([
                'ok' => false,
                'message' =>
                    'Active location could not be resolved.',
            ], 500);
        }

        if (!$location) {
            return response()->json([
                'ok' => false,
                'message' =>
                    'No active location is selected.',
            ], 409);
        }

        $floorId = trim(
            (string)request()->input('floor_id')
        );

        $mode = trim(
            (string)request()->input('layout_mode')
        );

        $zoom =
            request()->input('full_floor_zoom');

        if ($floorId !== self::FLOOR_VIEW_ID) {
            return response()->json([
                'ok' => false,
                'message' => 'Invalid Floor.',
            ], 422);
        }

        if (!in_array($mode, ['full', 'row'], true)) {
            return response()->json([
                'ok' => false,
                'message' =>
                    'Invalid Floor layout mode.',
            ], 422);
        }

        if (
            !is_numeric($zoom)
            || (float)$zoom < 0.4
            || (float)$zoom > 1.6
        ) {
            return response()->json([
                'ok' => false,
                'message' => 'Invalid Floor zoom.',
            ], 422);
        }

        $value = [
            'floor_id' => self::FLOOR_VIEW_ID,
            'layout_mode' => $mode,
            'full_floor_zoom' =>
                round((float)$zoom, 2),
        ];

        try {
            LocationOption::query()->updateOrCreate([
                'location_id' =>
                    (int)$location->location_id,

                'item' =>
                    self::FLOOR_VIEW_OPTION,
            ], [
                'value' => $value,
            ]);
        } catch (Throwable $exception) {
            $this->logFloorViewFailure(
                'write',
                $exception,
                $location
            );

            return response()->json([
                'ok' => false,
                'message' =>
                    'Floor view preference could not be saved.',
            ], 500);
        }

        return response()->json([
            'ok' => true,
            'view' => $value,
        ]);
    }

    protected function readFloorViewPreference(): array
    {
        $default =
            $this->defaultFloorViewPreference();

        $location = null;

        try {
            $location =
                $this->resolveFloorViewLocation();

            if (!$location) {
                return $default;
            }

            $record =
                LocationOption::findRecord(
                    self::FLOOR_VIEW_OPTION,
                    $location
                );

            if (
                !$record
                || !is_array($record->value)
            ) {
                return $default;
            }

            $value = $record->value;

            $floorId =
                (string)($value['floor_id'] ?? '');

            $mode =
                (string)($value['layout_mode'] ?? '');

            $zoom =
                $value['full_floor_zoom'] ?? null;

            if (
                $floorId !== self::FLOOR_VIEW_ID
                || !in_array(
                    $mode,
                    ['full', 'row'],
                    true
                )
                || !is_numeric($zoom)
                || (float)$zoom < 0.4
                || (float)$zoom > 1.6
            ) {
                return $default;
            }

            return [
                'floor_id' =>
                    self::FLOOR_VIEW_ID,

                'layout_mode' => $mode,

                'full_floor_zoom' =>
                    round((float)$zoom, 2),
            ];
        } catch (Throwable $exception) {
            $this->logFloorViewFailure(
                'read',
                $exception,
                $location
            );

            return $default;
        }
    }

    protected function defaultFloorViewPreference(): array
    {
        return [
            'floor_id' =>
                self::FLOOR_VIEW_ID,

            /*
             * Match the current Owner Dashboard experience:
             * if no preference exists yet, start on Full Floor.
             */
            'layout_mode' => 'full',

            'full_floor_zoom' => 1.0,
        ];
    }

    protected function resolveFloorViewLocation(
        $user = null
    ) {
        if ($location = AdminLocation::current()) {
            return $location;
        }

        $user = $user ?: AdminAuth::getUser();

        if (!$user) {
            return null;
        }

        $locationId =
            (int)AdminLocation::getSession('id');

        if (
            !$locationId
            && function_exists('is_single_location')
            && is_single_location()
        ) {
            $locationId =
                (int)params('default_location_id');
        }

        if (!$locationId) {
            $staff = $user->staff;

            $accessibleLocations =
                $staff
                    ? $staff
                        ->locations
                        ->where(
                            'location_status',
                            true
                        )
                        ->values()
                    : collect();

            if (
                $accessibleLocations->count() === 1
            ) {
                $locationId =
                    (int)$accessibleLocations
                        ->first()
                        ->location_id;
            }
        }

        if (!$locationId) {
            return null;
        }

        $location =
            Locations_model::isEnabled()
                ->find($locationId);

        if (
            !$location
            || (
                !$user->isSuperUser()
                && !$user->hasLocationAccess(
                    $location
                )
            )
        ) {
            return null;
        }

        AdminLocation::setCurrent($location);

        return $location;
    }

    protected function logFloorViewFailure(
        string $operation,
        Throwable $exception,
        $location = null
    ): void {
        Log::warning(
            'Ownerboard Floor view preference '
            .$operation
            .' failed.',
            [
                'tenant_id' =>
                    request()
                        ->attributes
                        ->get('tenant_id'),

                'location_id' =>
                    $location
                        ? (int)$location->location_id
                        : null,

                'floor_id' =>
                    self::FLOOR_VIEW_ID,

                'exception_class' =>
                    get_class($exception),

                'exception_message' =>
                    $exception->getMessage(),
            ]
        );
    }
}

