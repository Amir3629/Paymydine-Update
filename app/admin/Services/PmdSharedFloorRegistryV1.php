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

    public function cookieName(int $locationId): string
    {
        return 'pmd_shared_floor_active_'.max(0, $locationId);
    }

    public function snapshot(int $locationId): array
    {
        $locationId = max(0, $locationId);
        $saved = $this->readSavedState($locationId);
        $floors = $this->normalizeFloors((array)($saved['floors'] ?? []));

        if (!$this->findByName($floors, 'Main Floor')) {
            array_unshift($floors, $this->mainFloor());
        }

        usort($floors, function (array $a, array $b) {
            $aMain = $this->nameKey($a['name'] ?? '') === $this->nameKey('Main Floor');
            $bMain = $this->nameKey($b['name'] ?? '') === $this->nameKey('Main Floor');
            if ($aMain !== $bMain) return $aMain ? -1 : 1;
            $sort = ((int)($a['sort'] ?? 0)) <=> ((int)($b['sort'] ?? 0));
            if ($sort !== 0) return $sort;
            return strcasecmp((string)($a['name'] ?? ''), (string)($b['name'] ?? ''));
        });

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
            if ($this->nameKey($floor['name'] ?? '') === $this->nameKey('Main Floor')) {
                // Main Floor is the default; do not need redundant persisted rows.
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

        $main = $this->findByName($floors, 'Main Floor');
        if ($main) return $main;

        return $floors[0] ?? $this->mainFloor();
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
        if ($name === '') throw new \InvalidArgumentException('Floor name is required.');

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
        if ($this->nameKey($floor['name'] ?? '') === $this->nameKey('Main Floor')) {
            unset($assignments[(string)$tableId], $assignments[$tableId]);
        } else {
            $assignments[(string)$tableId] = (string)$floor['id'];
        }

        $this->persist($locationId, $floors, $assignments);
        return $this->snapshot($locationId);
    }

    public function floorNameForTable(int $locationId, int $tableId): string
    {
        $snapshot = $this->snapshot($locationId);
        $name = $snapshot['table_floor_map']['by_id'][(string)max(0, $tableId)] ?? '';
        return trim((string)$name) ?: 'Main Floor';
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
            'id' => $this->floorId('Main Floor'),
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
