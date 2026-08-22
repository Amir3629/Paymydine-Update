<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Staffs_model;
use Admin\Models\Users_model;
use Admin\Services\PmdFixedRoleAuthorityV1;
use Illuminate\Support\Facades\DB;

/**
 * PMD Team & Access
 *
 * R43 makes the seven restaurant roles product-owned and keeps staff creation
 * intentionally small: Role, Name, Username, Password.
 */
class Pmdteam extends AdminController
{
    protected $requiredPermissions = 'Admin.Staffs';

    public function __construct()
    {
        parent::__construct();

        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-team-settings-page');

        $this->addCss('css/pmd-team-v1.css');
        $this->addCss('css/pmd-team-notification-v1.css');
        $this->addCss('css/pmd-team-r43-role-authority.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-settings-inline-detail-v1.css');
        $this->addJs('js/pmd-settings-inline-detail-v1.js');

        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Template::setTitle('Team & access');
        Template::setHeading('Team & access');

        $authority = app(PmdFixedRoleAuthorityV1::class);
        $fixedRoles = $authority->ensureDefaultRoles();

        $staffQuery = Staffs_model::with(['role', 'user'])
            ->orderBy('staff_name');

        if (!AdminAuth::isSuperUser()) {
            $staffQuery->whereNotSuperUser();
        }

        $staff = $staffQuery->get();
        $roleOptions = $this->roleOptionsR43($authority, $fixedRoles);
        $roleSelections = [];

        foreach ($staff as $member) {
            $roleSelections[(int)$member->staff_id] = $this->roleSelectionForStaffR43(
                $authority,
                $member
            );
        }

        $this->vars['pmdTeam'] = [
            'staff' => $staff,
            'roles' => $fixedRoles,
            'definitions' => $authority->definitions(),
            'role_options' => $roleOptions,
            'role_selections' => $roleSelections,
            'stats' => [
                'total' => $staff->count(),
                'active' => $staff->where('staff_status', true)->count(),
                'roles' => $fixedRoles->count(),
            ],
        ];

        return $this->makeView('pmdteam/index');
    }

    public function onSavePmdStaff()
    {
        $input = (array)post('staff', []);
        $staffId = max(0, (int)($input['id'] ?? 0));
        $roleSelection = trim((string)($input['role'] ?? ''));
        [$roleId, $stationId] = $this->parseRoleSelectionR43($roleSelection);
        $name = trim((string)($input['name'] ?? ''));
        $username = trim((string)($input['username'] ?? ''));
        $password = (string)($input['password'] ?? '');

        $errors = [];

        if (mb_strlen($name) < 2 || mb_strlen($name) > 128) {
            $errors[] = 'Name must be between 2 and 128 characters.';
        }

        if (!preg_match('/^[A-Za-z0-9_-]{2,32}$/', $username)) {
            $errors[] = 'Username must be 2–32 characters using letters, numbers, dash or underscore.';
        }

        if ($staffId < 1 && (strlen($password) < 6 || strlen($password) > 32)) {
            $errors[] = 'Password must be between 6 and 32 characters.';
        }

        if ($staffId > 0 && $password !== '' && (strlen($password) < 6 || strlen($password) > 32)) {
            $errors[] = 'New password must be between 6 and 32 characters.';
        }

        $authority = app(PmdFixedRoleAuthorityV1::class);
        $fixedRoles = $authority->ensureDefaultRoles();
        $role = $authority->roleById($roleId);
        $roleCode = $role ? $authority->roleCodeForRole($role) : '';

        if (!$role || !$fixedRoles->contains(fn ($candidate) => (int)$candidate->staff_role_id === $roleId)) {
            $errors[] = 'Choose one of the built-in PayMyDine roles.';
        }

        if ($roleCode === 'kds') {
            $station = $authority->kdsStations()->first(function ($candidate) use ($stationId) {
                return (int)($candidate->station_id ?? $candidate->getKey()) === $stationId;
            });

            if ($stationId < 1 || !$station) {
                $errors[] = 'Choose the KDS station from the Role field.';
            }
        } elseif ($stationId > 0) {
            $errors[] = 'KDS station selection is only valid for the KDS role.';
        }

        $duplicateName = Staffs_model::query()
            ->where('staff_name', $name)
            ->when($staffId > 0, fn ($query) => $query->where('staff_id', '!=', $staffId))
            ->exists();

        if ($duplicateName) {
            $errors[] = 'A staff member with this name already exists.';
        }

        $duplicateUsername = Users_model::query()
            ->where('username', $username)
            ->when($staffId > 0, fn ($query) => $query->where('staff_id', '!=', $staffId))
            ->exists();

        if ($duplicateUsername) {
            $errors[] = 'This username is already in use.';
        }

        if ($errors) {
            return response()->json([
                'ok' => false,
                'message' => implode(' ', $errors),
            ], 422);
        }

        try {
            $saved = DB::transaction(function () use (
                $authority,
                $staffId,
                $role,
                $roleCode,
                $stationId,
                $name,
                $username,
                $password
            ) {
                $member = $staffId > 0
                    ? Staffs_model::query()->find($staffId)
                    : new Staffs_model;

                if (!$member) {
                    throw new \RuntimeException('Staff member was not found.');
                }

                $isNew = !$member->exists;

                $member->staff_name = $name;
                $member->staff_role_id = (int)$role->staff_role_id;
                $member->staff_status = 1;
                $member->sale_permission = 1;

                // Email is no longer a staff-creation concept in PMD. Keep an
                // existing address, or use a non-deliverable internal identity
                // because the legacy model schema still requires this column.
                if (trim((string)$member->staff_email) === '') {
                    $member->staff_email = strtolower($username).'@staff.invalid';
                }

                if ($isNew) {
                    $member->language_id = null;
                }

                $user = [
                    'username' => $username,
                    'super_user' => false,
                    'activate' => true,
                    'send_invite' => false,
                ];

                if ($password !== '') {
                    $user['password'] = $password;
                }

                $member->user = $user;
                $member->save();
                $member->addStaffGroups([]);

                // New staff need the current restaurant location. Existing
                // staff keep any multi-location assignments they already had.
                $locationId = $this->currentLocationIdR43();
                if ($locationId > 0 && ($isNew || $member->locations()->count() < 1)) {
                    $member->addStaffLocations([$locationId]);
                }

                // KDS assignment is an explicit part of the Role selection.
                // Switching away from KDS clears any old station mapping.
                $authority->setKdsStationForStaff(
                    $member,
                    $roleCode === 'kds' ? $stationId : null
                );

                $fresh = Staffs_model::with(['role', 'user'])->find($member->staff_id);

                if ($roleCode === 'kds' && !$authority->stationForStaff($fresh)) {
                    throw new \RuntimeException('The selected KDS station could not be assigned.');
                }

                return $fresh;
            });
        } catch (\Throwable $error) {
            logger()->warning('PMD simple staff save failed', [
                'message' => $error->getMessage(),
                'staff_id' => $staffId,
            ]);

            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 422);
        }

        return response()->json([
            'ok' => true,
            'message' => $staffId > 0 ? 'Staff member updated.' : 'Staff member added.',
            'staff_id' => (int)$saved->staff_id,
        ]);
    }

    private function roleOptionsR43(PmdFixedRoleAuthorityV1 $authority, $fixedRoles): array
    {
        $options = [];

        foreach ($fixedRoles as $code => $role) {
            $roleId = (int)$role->staff_role_id;

            if ($code !== 'kds') {
                $options[] = [
                    'value' => 'role:'.$roleId,
                    'label' => (string)$role->name,
                    'role_id' => $roleId,
                    'station_id' => 0,
                ];
                continue;
            }

            foreach ($authority->kdsStations() as $station) {
                $stationId = (int)($station->station_id ?? $station->getKey());
                if ($stationId < 1) {
                    continue;
                }

                $options[] = [
                    'value' => 'kds:'.$roleId.':'.$stationId,
                    'label' => 'KDS — '.trim((string)$station->name),
                    'role_id' => $roleId,
                    'station_id' => $stationId,
                ];
            }
        }

        return $options;
    }

    private function roleSelectionForStaffR43(PmdFixedRoleAuthorityV1 $authority, $member): string
    {
        if (!$member || !$member->role) {
            return '';
        }

        $roleId = (int)$member->staff_role_id;
        $roleCode = $authority->roleCodeForRole($member->role);

        if ($roleCode !== 'kds') {
            return $roleId > 0 ? 'role:'.$roleId : '';
        }

        $station = $authority->stationForStaff($member);
        $stationId = $station ? (int)($station->station_id ?? $station->getKey()) : 0;

        return $roleId > 0 && $stationId > 0
            ? 'kds:'.$roleId.':'.$stationId
            : '';
    }

    private function parseRoleSelectionR43(string $selection): array
    {
        if (preg_match('/^role:(\d+)$/', $selection, $match)) {
            return [(int)$match[1], 0];
        }

        if (preg_match('/^kds:(\d+):(\d+)$/', $selection, $match)) {
            return [(int)$match[1], (int)$match[2]];
        }

        return [0, 0];
    }

    private function currentLocationIdR43(): int
    {
        try {
            $location = AdminLocation::current();
            if ($location && (int)$location->location_id > 0) {
                return (int)$location->location_id;
            }
        } catch (\Throwable $ignored) {
        }

        try {
            $sessionId = (int)AdminLocation::getSession('id');
            if ($sessionId > 0) {
                return $sessionId;
            }
        } catch (\Throwable $ignored) {
        }

        return 0;
    }
}
