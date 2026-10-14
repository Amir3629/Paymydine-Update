<?php

namespace App\Services\RestaurantGroups;

/**
 * R26: Publish one ordinary TOP-LEVEL menu category to another authorized
 * restaurant. No items, images, stock, nested trees or local settings move.
 * All writes are wrapped in Publisher's per-target InnoDB transaction,
 * digest/replay guard and explicit location preview/confirmation.
 */
final class CategoryReplicator
{
    private const FIELDS = [
        'name', 'description', 'priority', 'status',
        'frontend_visible', 'permalink_slug', 'pmd_kind',
    ];

    public function export($db, int $categoryId): array
    {
        $category = $db->table('categories')
            ->where('category_id', $categoryId)->first();
        if (!$category) throw new \DomainException('Saved category not found.');
        if ((int)($category->parent_id ?? 0) !== 0) {
            throw new \DomainException('Nested categories must be managed inside their original restaurant.');
        }
        if (strtolower(trim((string)($category->pmd_kind ?? 'regular'))) !== 'regular') {
            throw new \DomainException('Special category types cannot be published as ordinary categories.');
        }

        $data = array_intersect_key((array)$category, array_flip(self::FIELDS));
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '' || mb_strlen($name) > 255) {
            throw new \DomainException('Category name must be saved before publication.');
        }
        if (!array_key_exists('permalink_slug', $data)) {
            throw new \DomainException('Category permalink storage is unavailable.');
        }
        return ['category' => $data];
    }

    public function validateTarget($db, array $payload, ?int $mappedId, int $locationId): void
    {
        if (!isset($payload['category']) || !is_array($payload['category'])) {
            throw new \DomainException('Category publication payload is invalid.');
        }
        $data = $payload['category'];
        $schema = $db->getSchemaBuilder();
        foreach (['categories', 'locationables', 'locations'] as $table) {
            if (!$schema->hasTable($table)) {
                throw new \DomainException('Target restaurant category storage is incomplete.');
            }
        }
        $columns = array_flip($schema->getColumnListing('categories'));
        foreach (['category_id','name','parent_id','priority','status','description',
            'permalink_slug','nest_left','nest_right'] as $column) {
            if (!isset($columns[$column])) {
                throw new \DomainException('Target category tree schema is incomplete.');
            }
        }
        foreach ($data as $key => $value) {
            if (!in_array($key, self::FIELDS, true) || !isset($columns[$key])) {
                throw new \DomainException('Target category schema differs from the source. Review it before publishing.');
            }
        }
        $name = trim((string)($data['name'] ?? ''));
        $slug = trim((string)($data['permalink_slug'] ?? ''));
        if ($name === '' || mb_strlen($name) > 255
            || $slug === '' || mb_strlen($slug) > 191
            || !preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]*$/D', $slug)
            || strtolower(trim((string)($data['pmd_kind'] ?? 'regular'))) !== 'regular') {
            throw new \DomainException('Category name, type or permalink must be reviewed before publishing.');
        }
        if (!$db->table('locations')->where('location_id', $locationId)->exists()) {
            throw new \DomainException('Target restaurant location is missing.');
        }

        $collision = $db->table('categories')
            ->where(function ($query) use ($name, $slug) {
                $query->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                    ->orWhereRaw('LOWER(permalink_slug) = ?', [mb_strtolower($slug)]);
            })->lockForUpdate()->get(['category_id']);
        foreach ($collision as $existing) {
            if ($mappedId === null || (int)$existing->category_id !== $mappedId) {
                throw new \DomainException(
                    'The target already has a category with this name or permalink. Review it before publishing.'
                );
            }
        }
        if ($mappedId !== null) {
            $row = $db->table('categories')->where('category_id', $mappedId)
                ->lockForUpdate()->first();
            if (!$row || (int)($row->parent_id ?? 0) !== 0) {
                throw new \DomainException('Previously published category was removed or became nested.');
            }
        }
    }

    public function import($db, array $payload, ?int $mappedId, int $locationId): int
    {
        $this->validateTarget($db, $payload, $mappedId, $locationId);
        $data = $payload['category'];
        $schema = $db->getSchemaBuilder();
        $columns = array_flip($schema->getColumnListing('categories'));

        if ($mappedId !== null) {
            $updates = $data;
            if (isset($columns['updated_at'])) $updates['updated_at'] = now();
            $db->table('categories')->where('category_id', $mappedId)->update($updates);
            return $mappedId;
        }

        $last = $db->table('categories')->whereNotNull('nest_right')
            ->orderByDesc('nest_right')->lockForUpdate()->first(['nest_right']);
        $right = (int)($last->nest_right ?? 0);
        // One top-level leaf. Existing category tree indices remain unchanged.
        // A database/transaction lock is held by Publisher for this entity;
        // nested-tree conflicts are rechecked under the target transaction.
        $data['parent_id'] = 0;
        $data['nest_left'] = $right + 1;
        $data['nest_right'] = $right + 2;
        if (isset($columns['image'])) $data['image'] = '';
        if (isset($columns['created_at'])) $data['created_at'] = now();
        if (isset($columns['updated_at'])) $data['updated_at'] = now();
        $id = (int)$db->table('categories')->insertGetId($data, 'category_id');
        $db->table('locationables')->insert([
            'location_id' => $locationId,
            'locationable_id' => $id,
            'locationable_type' => 'categories',
            'options' => serialize([]),
        ]);
        return $id;
    }
}
