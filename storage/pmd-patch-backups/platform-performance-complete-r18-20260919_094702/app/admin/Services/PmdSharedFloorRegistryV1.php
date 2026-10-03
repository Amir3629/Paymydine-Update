<?php

namespace Admin\Services;

use Admin\Models\LocationOption;
use Illuminate\Support\Str;

/**
 * PMD_SHARED_FLOOR_MULTI_FLOOR_V1_2_ASSIGNMENT_AUTHORITY
 *
 * One location-scoped PMD floor registry plus explicit table-id assignments.
 *
 * Important compatibility contract:
 * - existing tables.floor_name is LEGACY metadata and is never used as the new
 *   PMD floor identity/assignment authority;
 * - every table with no explicit PMD assignment belongs to Main Floor;
 * - an explicit assignment is stored by canonical tables.table_id inside the
 *   same LocationOption registry value, so no schema migration is required;
 * - QR lifecycle and Tables_model remain untouched.
 */
class PmdSharedFloorRegistryV1
{
    public const OPTION_KEY = 'pmd_shared_floor_registry_v1';

    /*
     * PMD_ACTIVE_FLOOR_USER_PAGE_COOKIE_V3
     *
     * Active Floor is a VIEW preference.
     *
     * Scope:
     *   restaurant location
     * + authenticated Admin/Staff login
     * + workspace/page
     *
     * Floor registry and table assignments remain restaurant-shared.
     */
    /*
     * PMD_DEFAULT_FLOOR_STABLE_ID_V4
     *
     * "Main Floor" is ONLY the initial display name.
     *
     * The permanent ID created from the original Main Floor identity is
     * the real default-Floor authority. Therefore the user may rename the
     * first/default Floor without changing its role or creating a second
     * Main Floor on the next snapshot.
     */
    public function defaultFloorId(): string
    {
        return $this->floorId('Main Floor');
    }

    public function isDefaultFloorId(string $floorId): bool
    {
        $floorId = trim($floorId);

        return
            $floorId !== ''
            && hash_equals(
                $this->defaultFloorId(),
                $floorId
            );
    }

    public function legacyCookieName(int $locationId): string
    {
        return 'pmd_shared_floor_active_'.max(0, $locationId);
    }

    protected function activeFloorUserToken(): string
    {
        try {
            $user = \Admin\Facades\AdminAuth::getUser();

            if (!$user) {
                return 'guest';
            }

            $identity = '';

            if (
                method_exists(
                    $user,
                    'getAuthIdentifier'
                )
            ) {
                $identity =
                    (string)$user->getAuthIdentifier();
            }

            if (
                $identity === ''
                && method_exists(
                    $user,
                    'getKey'
                )
            ) {
                $identity =
                    (string)$user->getKey();
            }

            if ($identity === '') {
                $identity =
                    (string)(
                        $user->staff_id
                        ?? $user->user_id
                        ?? $user->id
                        ?? $user->email
                        ?? ''
                    );
            }

            if ($identity === '') {
                return 'unknown';
            }

            return substr(
                hash(
                    'sha256',
                    get_class($user)
                    .'|'
                    .$identity
                ),
                0,
                12
            );
        } catch (\Throwable $error) {
            return 'unknown';
        }
    }

    protected function activeFloorPageToken(): string
    {
        try {
            $path =
                strtolower(
                    trim(
                        (string)request()->path(),
                        '/'
                    )
                );
        } catch (\Throwable $error) {
            $path = 'admin';
        }

        if ($path === '') {
            $path = 'admin';
        }

        return substr(
            hash(
                'sha256',
                $path
            ),
            0,
            10
        );
    }

    public function cookieName(int $locationId): string
    {
        return
            'pmd_shared_floor_active_v3_'
            .max(0, $locationId)
            .'_'
            .$this->activeFloorUserToken()
            .'_'
            .$this->activeFloorPageToken();
    }

    public function snapshot(int $locationId): array
    {
        $locationId = max(0, $locationId);
        $saved = $this->readSavedState($locationId);
        $floors = $this->normalizeFloors((array)($saved['floors'] ?? []));

        $defaultFloorId =
            $this->defaultFloorId();

        if (
            !$this->findById(
                $floors,
                $defaultFloorId
            )
        ) {
            array_unshift(
                $floors,
                $this->mainFloor()
            );
        }

        usort(
            $floors,
            function (
                array $a,
                array $b
            ) use ($defaultFloorId) {
                $aDefault =
                    (string)($a['id'] ?? '')
                    === $defaultFloorId;

                $bDefault =
                    (string)($b['id'] ?? '')
                    === $defaultFloorId;

                if ($aDefault !== $bDefault) {
                    return $aDefault
                        ? -1
                        : 1;
                }

                $sort =
                    ((int)($a['sort'] ?? 0))
                    <=>
                    ((int)($b['sort'] ?? 0));

                if ($sort !== 0) {
                    return $sort;
                }

                return strcasecmp(
                    (string)($a['name'] ?? ''),
                    (string)($b['name'] ?? '')
                );
            }
        );

        /*
         * Give the browser an explicit immutable identity marker.
         * UI must never infer default status from the display name.
         */
        foreach ($floors as &$floor) {
            $floor['is_default'] =
                (string)($floor['id'] ?? '')
                === $defaultFloorId;
        }

        unset($floor);

        $validById = [];
        foreach ($floors as $floor) {
            $id = trim((string)($floor['id'] ?? ''));
            if ($id !== '') $validById[$id] = $floor;
        }

        $assignments = [];
        $byId = [];
        foreach ((array)($saved['table_assignments'] ?? []) as $tableId => $floorId) {
            $tableId = (int)$tableId;
            $floorId = trim((string)$floorId);
            if ($tableId < 1 || $floorId === '' || !isset($validById[$floorId])) continue;

            $floor = $validById[$floorId];
            if (
                $this->isDefaultFloorId(
                    (string)($floor['id'] ?? '')
                )
            ) {
                // Default Floor needs no redundant explicit assignment.
                continue;
            }

            $assignments[(string)$tableId] = $floorId;
            $byId[(string)$tableId] = (string)$floor['name'];
        }

        return [
            'version' => 2,
            'assignment_authority' => 'location-option-table-id-map',
            'location_id' => $locationId,
            'cookie_name' => $this->cookieName($locationId),
            'legacy_cookie_name' => $this->legacyCookieName($locationId),
            'floors' => array_values($floors),
            'table_assignments' => $assignments,
            'table_floor_map' => [
                'by_id' => $byId,
                'by_number' => [],
                'by_name' => [],
            ],
        ];
    }

    public function activeFloor(array $floors, string $requestedId): array
    {
        $requestedId = trim($requestedId);
        foreach ($floors as $floor) {
            if ($requestedId !== '' && hash_equals((string)($floor['id'] ?? ''), $requestedId)) {
                return $floor;
            }
        }

        $defaultFloor =
            $this->findById(
                $floors,
                $this->defaultFloorId()
            );

        if ($defaultFloor) {
            return $defaultFloor;
        }

        return
            $floors[0]
            ?? $this->mainFloor();
    }

    public function findByName(array $floors, string $name): ?array
    {
        $key = $this->nameKey($name);
        if ($key === '') return null;
        foreach ($floors as $floor) {
            if ($this->nameKey($floor['name'] ?? '') === $key) return $floor;
        }
        return null;
    }

    public function findById(array $floors, string $id): ?array
    {
        $id = trim($id);
        if ($id === '') return null;
        foreach ($floors as $floor) {
            if (hash_equals((string)($floor['id'] ?? ''), $id)) return $floor;
        }
        return null;
    }

    public function createFloor(int $locationId, string $name): array
    {
        $locationId = max(0, $locationId);
        $name = $this->normalizeName($name);
        if ($name === '') {
            throw new \InvalidArgumentException(
                'Floor name is required.'
            );
        }

        if (
            $this->nameKey($name)
            === $this->nameKey('Main Floor')
        ) {
            throw new \InvalidArgumentException(
                'Main Floor is reserved for the default Floor.'
            );
        }

        $snapshot = $this->snapshot($locationId);
        if ($this->findByName((array)$snapshot['floors'], $name)) {
            throw new \InvalidArgumentException('A floor with this name already exists.');
        }

        $maxSort = 0;
        foreach ((array)$snapshot['floors'] as $floor) {
            $maxSort = max($maxSort, (int)($floor['sort'] ?? 0));
        }

        $created = [
            'id' => $this->floorId($name),
            'name' => $name,
            'sort' => $maxSort + 10,
        ];

        $floors = array_values((array)$snapshot['floors']);
        $floors[] = $created;
        $this->persist(
            $locationId,
            $floors,
            (array)($snapshot['table_assignments'] ?? [])
        );

        $fresh = $this->snapshot($locationId);
        return [
            'floor' => $this->findByName((array)$fresh['floors'], $name) ?: $created,
            'registry' => $fresh,
        ];
    }

    /*
     * PMD_SHARED_FLOOR_RENAME_DELETE_V2
     *
     * Rename keeps the permanent Floor ID.
     * Delete never deletes tables.
     * Removing a custom Floor sends those assignments to Main Floor
     * by removing their explicit non-Main assignment.
     */
    public function renameFloor(
        int $locationId,
        string $floorId,
        string $name
    ): array {
        $locationId =
            max(0, $locationId);

        $floorId =
            trim($floorId);

        $name =
            $this->normalizeName($name);

        if ($locationId < 1) {
            throw new \RuntimeException(
                'Active restaurant location is unavailable.'
            );
        }

        if ($floorId === '') {
            throw new \InvalidArgumentException(
                'Floor identity is required.'
            );
        }

        if ($name === '') {
            throw new \InvalidArgumentException(
                'Floor name is required.'
            );
        }

        $snapshot =
            $this->snapshot($locationId);

        $floors =
            array_values(
                (array)($snapshot['floors'] ?? [])
            );

        $current =
            $this->findById(
                $floors,
                $floorId
            );

        if (!$current) {
            throw new \InvalidArgumentException(
                'Selected Floor does not exist.'
            );
        }

        $isDefaultFloor =
            $this->isDefaultFloorId(
                (string)(
                    $current[
                        'id'
                    ]
                    ?? ''
                )
            );

        /*
         * Default Floor may freely change its display name.
         * A custom Floor may not claim the reserved initial label
         * "Main Floor", because that label belongs to the default
         * Floor identity.
         */
        if (
            !$isDefaultFloor
            && $this->nameKey($name)
                === $this->nameKey(
                    'Main Floor'
                )
        ) {
            throw new \InvalidArgumentException(
                'Main Floor is reserved for the default Floor.'
            );
        }

        $duplicate =
            $this->findByName(
                $floors,
                $name
            );

        if (
            $duplicate
            && (string)($duplicate['id'] ?? '')
                !== $floorId
        ) {
            throw new \InvalidArgumentException(
                'A floor with this name already exists.'
            );
        }

        foreach ($floors as &$floor) {
            if (
                (string)($floor['id'] ?? '')
                === $floorId
            ) {
                $floor['name'] = $name;
                break;
            }
        }

        unset($floor);

        $this->persist(
            $locationId,
            $floors,
            (array)(
                $snapshot[
                    'table_assignments'
                ]
                ?? []
            )
        );

        $fresh =
            $this->snapshot(
                $locationId
            );

        return [
            'floor' =>
                $this->findById(
                    (array)(
                        $fresh['floors']
                        ?? []
                    ),
                    $floorId
                ),

            'registry' =>
                $fresh,
        ];
    }

    public function deleteFloor(
        int $locationId,
        string $floorId
    ): array {
        $locationId =
            max(0, $locationId);

        $floorId =
            trim($floorId);

        if ($locationId < 1) {
            throw new \RuntimeException(
                'Active restaurant location is unavailable.'
            );
        }

        if ($floorId === '') {
            throw new \InvalidArgumentException(
                'Floor identity is required.'
            );
        }

        $snapshot =
            $this->snapshot(
                $locationId
            );

        $floors =
            array_values(
                (array)(
                    $snapshot['floors']
                    ?? []
                )
            );

        $current =
            $this->findById(
                $floors,
                $floorId
            );

        if (!$current) {
            throw new \InvalidArgumentException(
                'Selected Floor does not exist.'
            );
        }

        if (
            $this->isDefaultFloorId(
                (string)(
                    $current[
                        'id'
                    ]
                    ?? ''
                )
            )
        ) {
            throw new \InvalidArgumentException(
                'The default Floor cannot be removed.'
            );
        }

        $floors =
            array_values(
                array_filter(
                    $floors,
                    static function (
                        array $floor
                    ) use ($floorId): bool {
                        return
                            (string)(
                                $floor['id']
                                ?? ''
                            )
                            !== $floorId;
                    }
                )
            );

        $assignments =
            (array)(
                $snapshot[
                    'table_assignments'
                ]
                ?? []
            );

        $movedToMain = 0;

        foreach (
            $assignments
            as $tableId => $assignedFloorId
        ) {
            if (
                (string)$assignedFloorId
                === $floorId
            ) {
                unset(
                    $assignments[$tableId]
                );

                $movedToMain++;
            }
        }

        $this->persist(
            $locationId,
            $floors,
            $assignments
        );

        $fresh =
            $this->snapshot(
                $locationId
            );

        $main =
            $this->findById(
                (array)(
                    $fresh['floors']
                    ?? []
                ),
                $this->defaultFloorId()
            );

        return [
            'floor' =>
                $main,

            'registry' =>
                $fresh,

            'moved_to_main' =>
                $movedToMain,
        ];
    }

    public function assignTable(int $locationId, int $tableId, string $floorIdentity): array
    {
        $locationId = max(0, $locationId);
        $tableId = max(0, $tableId);
        if ($locationId < 1) throw new \RuntimeException('Active restaurant location is unavailable.');
        if ($tableId < 1) throw new \InvalidArgumentException('Canonical table ID is required.');

        $snapshot = $this->snapshot($locationId);
        $floors = (array)($snapshot['floors'] ?? []);
        $floor = $this->findById($floors, $floorIdentity)
            ?: $this->findByName($floors, $floorIdentity);
        if (!$floor) throw new \InvalidArgumentException('Selected Floor does not exist.');

        $assignments = (array)($snapshot['table_assignments'] ?? []);
        if (
            $this->isDefaultFloorId(
                (string)($floor['id'] ?? '')
            )
        ) {
            unset(
                $assignments[(string)$tableId],
                $assignments[$tableId]
            );
        } else {
            $assignments[(string)$tableId] = (string)$floor['id'];
        }

        $this->persist($locationId, $floors, $assignments);
        return $this->snapshot($locationId);
    }

    public function floorNameForTable(int $locationId, int $tableId): string
    {
        $snapshot =
            $this->snapshot(
                $locationId
            );

        $name =
            $snapshot[
                'table_floor_map'
            ][
                'by_id'
            ][
                (string)max(
                    0,
                    $tableId
                )
            ]
            ?? '';

        if (trim((string)$name) !== '') {
            return trim(
                (string)$name
            );
        }

        $defaultFloor =
            $this->findById(
                (array)(
                    $snapshot[
                        'floors'
                    ]
                    ?? []
                ),
                $this->defaultFloorId()
            );

        return trim(
            (string)(
                $defaultFloor[
                    'name'
                ]
                ?? 'Main Floor'
            )
        ) ?: 'Main Floor';
    }

    /*
     * PMD_SHARED_FLOOR_USER_PAGE_VIEW_PREFERENCE_V1
     *
     * One preference row per:
     *   restaurant location
     *   authenticated admin user
     *   Lab workspace
     *
     * Examples:
     *   owner Dashboard = Full Floor
     *   same owner Manager page = One row
     *   Waiter A CashierLab = One row
     *   Waiter B CashierLab = Full Floor
     *
     * No schema migration. Existing LocationOption storage is reused.
     */
    public function applyUserPageViewPreference(
        int $locationId,
        string $workspace,
        array $bootstrap
    ): array {
        $fallbackMode = in_array(
            (string)($bootstrap['mode'] ?? ''),
            ['full', 'row'],
            true
        )
            ? (string)$bootstrap['mode']
            : 'row';

        $fallbackZoom = is_numeric(
            $bootstrap['zoom'] ?? null
        )
            ? max(
                0.4,
                min(
                    1.6,
                    (float)$bootstrap['zoom']
                )
            )
            : 1.0;

        $bootstrap['mode'] =
            $fallbackMode;

        $bootstrap['zoom'] =
            round(
                $fallbackZoom,
                2
            );

        $locationId =
            max(
                0,
                $locationId
            );

        $item =
            $this->pmdUserPageViewOptionKey(
                $workspace
            );

        if (
            $locationId < 1
            || $item === ''
        ) {
            return $bootstrap;
        }

        try {
            $row =
                LocationOption::query()
                    ->where(
                        'location_id',
                        $locationId
                    )
                    ->where(
                        'item',
                        $item
                    )
                    ->first();

            if (!$row) {
                return $bootstrap;
            }

            $value =
                $row->value;

            if (is_string($value)) {
                $decoded =
                    json_decode(
                        $value,
                        true
                    );

                $value =
                    is_array($decoded)
                        ? $decoded
                        : [];
            } elseif (is_object($value)) {
                $value =
                    json_decode(
                        json_encode($value),
                        true
                    ) ?: [];
            }

            if (!is_array($value)) {
                return $bootstrap;
            }

            $mode =
                (string)(
                    $value['layout_mode']
                    ?? ''
                );

            $zoom =
                $value[
                    'full_floor_zoom'
                ]
                ?? null;

            if (
                !in_array(
                    $mode,
                    ['full', 'row'],
                    true
                )
                || !is_numeric($zoom)
                || (float)$zoom < 0.4
                || (float)$zoom > 1.6
            ) {
                return $bootstrap;
            }

            $bootstrap['mode'] =
                $mode;

            $bootstrap['zoom'] =
                round(
                    (float)$zoom,
                    2
                );

            return $bootstrap;
        } catch (\Throwable $e) {
            return $bootstrap;
        }
    }

    public function saveUserPageViewPreference(
        int $locationId,
        string $workspace,
        string $mode,
        float $zoom
    ): array {
        $locationId =
            max(
                0,
                $locationId
            );

        if ($locationId < 1) {
            throw new \RuntimeException(
                'Active restaurant location is unavailable.'
            );
        }

        if (
            !in_array(
                $mode,
                ['full', 'row'],
                true
            )
        ) {
            throw new \InvalidArgumentException(
                'Invalid Floor layout mode.'
            );
        }

        if (
            $zoom < 0.4
            || $zoom > 1.6
        ) {
            throw new \InvalidArgumentException(
                'Invalid Floor zoom.'
            );
        }

        $workspace =
            $this->pmdNormalizeViewWorkspace(
                $workspace
            );

        $item =
            $this->pmdUserPageViewOptionKey(
                $workspace
            );

        if ($item === '') {
            throw new \RuntimeException(
                'Authenticated preference identity is unavailable.'
            );
        }

        $value = [
            'version' => 1,
            'scope' =>
                'authenticated-user-page-location',
            'workspace' =>
                $workspace,
            'floor_id' =>
                'main-floor',
            'layout_mode' =>
                $mode,
            'full_floor_zoom' =>
                round(
                    $zoom,
                    2
                ),
        ];

        LocationOption::query()
            ->updateOrCreate(
                [
                    'location_id' =>
                        $locationId,

                    'item' =>
                        $item,
                ],
                [
                    'value' =>
                        $value,
                ]
            );

        return $value;
    }

    protected function pmdUserPageViewOptionKey(
        string $workspace
    ): string {
        try {
            $user =
                \Admin\Facades\AdminAuth::getUser();

            if (!$user) {
                return '';
            }

            $identity = '';

            if (
                method_exists(
                    $user,
                    'getAuthIdentifier'
                )
            ) {
                $identity =
                    (string)$user
                        ->getAuthIdentifier();
            }

            if (
                $identity === ''
                && method_exists(
                    $user,
                    'getKey'
                )
            ) {
                $identity =
                    (string)$user
                        ->getKey();
            }

            if ($identity === '') {
                $identity =
                    (string)(
                        $user->staff_id
                        ?? $user->user_id
                        ?? $user->email
                        ?? ''
                    );
            }

            if ($identity === '') {
                return '';
            }

            $workspace =
                $this->pmdNormalizeViewWorkspace(
                    $workspace
                );

            $userToken =
                substr(
                    hash(
                        'sha256',
                        get_class($user)
                        .'|'
                        .$identity
                    ),
                    0,
                    20
                );

            return
                'pmd_floor_view_user_page_v1_'
                .$workspace
                .'_'
                .$userToken;
        } catch (\Throwable $e) {
            return '';
        }
    }

    protected function pmdNormalizeViewWorkspace(
        string $workspace
    ): string {
        $workspace =
            strtolower(
                trim(
                    $workspace
                )
            );

        $workspace =
            preg_replace(
                '/[^a-z0-9_-]+/',
                '-',
                $workspace
            ) ?: '';

        $workspace =
            trim(
                $workspace,
                '-_'
            );

        return
            $workspace !== ''
                ? substr(
                    $workspace,
                    0,
                    32
                )
                : 'workspace';
    }

    protected function readSavedState(int $locationId): array
    {
        if ($locationId < 1) return ['floors' => [], 'table_assignments' => []];

        try {
            $row = LocationOption::query()
                ->where('location_id', $locationId)
                ->where('item', self::OPTION_KEY)
                ->first();
            if (!$row) return ['floors' => [], 'table_assignments' => []];

            $value = $row->value;
            if (is_string($value)) {
                $decoded = json_decode($value, true);
                $value = is_array($decoded) ? $decoded : [];
            } elseif (is_object($value)) {
                $value = json_decode(json_encode($value), true) ?: [];
            }
            if (!is_array($value)) return ['floors' => [], 'table_assignments' => []];

            if (array_key_exists('floors', $value)) {
                $floors = is_array($value['floors']) ? array_values($value['floors']) : [];
            } else {
                // V1 compatibility: the option value could itself be the floor list.
                $floors = array_values($value);
            }

            $assignments = $value['table_assignments'] ?? $value['assignments'] ?? [];
            if (!is_array($assignments)) $assignments = [];

            return [
                'floors' => $floors,
                'table_assignments' => $assignments,
            ];
        } catch (\Throwable $e) {
            return ['floors' => [], 'table_assignments' => []];
        }
    }

    protected function persist(int $locationId, array $floors, array $assignments): void
    {
        if ($locationId < 1) throw new \RuntimeException('Active restaurant location is unavailable.');

        LocationOption::query()->updateOrCreate([
            'location_id' => $locationId,
            'item' => self::OPTION_KEY,
        ], [
            'value' => [
                'version' => 2,
                'assignment_authority' => 'location-option-table-id-map',
                'floors' => array_values($floors),
                'table_assignments' => (object)$assignments,
            ],
        ]);
    }

    protected function normalizeFloors(array $floors): array
    {
        $byKey = [];
        foreach ($floors as $floor) {
            if (!is_array($floor)) continue;
            $name = $this->normalizeName($floor['name'] ?? '');
            if ($name === '') continue;
            $key = $this->nameKey($name);
            if (isset($byKey[$key])) continue;
            $byKey[$key] = [
                'id' => trim((string)($floor['id'] ?? '')) ?: $this->floorId($name),
                'name' => $name,
                'sort' => (int)($floor['sort'] ?? 0),
            ];
        }
        return array_values($byKey);
    }

    protected function mainFloor(): array
    {
        return [
            'id' => $this->defaultFloorId(),
            'name' => 'Main Floor',
            'sort' => 0,
        ];
    }

    protected function floorId(string $name): string
    {
        $slug = Str::slug($name);
        if ($slug === '') $slug = 'floor';
        return substr($slug, 0, 42).'-'.substr(sha1($this->nameKey($name)), 0, 10);
    }

    protected function normalizeName($name): string
    {
        $name = preg_replace('/\s+/u', ' ', trim((string)$name)) ?: '';
        if ($name === '') return '';
        $key = function_exists('mb_strtolower')
            ? mb_strtolower($name, 'UTF-8')
            : strtolower($name);
        return in_array($key, ['main', 'main floor'], true) ? 'Main Floor' : $name;
    }

    protected function nameKey($name): string
    {
        $name = $this->normalizeName($name);
        return function_exists('mb_strtolower') ? mb_strtolower($name, 'UTF-8') : strtolower($name);
    }
}
