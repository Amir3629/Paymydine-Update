<?php

namespace Admin\Traits;

/**
 * PMD_MENU_GALLERY_OPTIONS_V1
 *
 * Request-gated persistence for the clean /admin/menu food editor.
 * Uses existing menu_images and TastyIgniter menu option tables so customer
 * menu, POS, checkout and order pricing keep one shared authority.
 */
trait PmdMenuGalleryOptionsV1
{
    protected function syncPmdMenuGalleryOptionsV1(): void
    {
        $request = request();
        if ((string)$request->input('pmd_menu_enhancements_v1', '') !== '1') return;

        $connection = $this->getConnection();
        $schema = $connection->getSchemaBuilder();
        $menuId = (int)$this->getKey();
        if ($menuId < 1) return;

        $this->syncPmdMenuGalleryUploadsV1($request, $connection, $schema, $menuId);

        if ((string)$request->input('pmd_menu_options_present', '') === '1') {
            $groups = $this->normalizePmdMenuOptionGroupsV1((array)$request->input('options', []));
            $this->syncPmdMenuOptionGroupsV1($connection, $schema, $menuId, $groups);
        }
    }

    protected function syncPmdMenuGalleryUploadsV1($request, $connection, $schema, int $menuId): void
    {
        $incoming = $request->file('images', []);
        if (!$incoming) $incoming = [];
        if (!is_array($incoming)) $incoming = [$incoming];
        $incoming = array_values(array_filter($incoming));
        $remove = array_values(array_unique(array_filter(array_map(static function ($path) {
            $path = trim((string)$path);
            return $path === '' ? '' : basename(str_replace('\\', '/', $path));
        }, (array)$request->input('remove_images', [])))));

        if (!$incoming && !$remove) return;
        if (!$schema->hasTable('menu_images')) throw new \RuntimeException('Menu image storage is unavailable for this restaurant.');
        if (count($incoming) > 8 || count($remove) > 8) throw new \RuntimeException('A food can have up to 8 images.');

        $existingRows = $connection->table('menu_images')->where('menu_id', $menuId)->get(['image_path']);
        $existing = $existingRows->pluck('image_path')->map(static function ($path) {
            return trim((string)$path);
        })->filter()->values()->all();
        $removeActual = [];
        foreach ($existing as $path) {
            if (in_array(basename(str_replace('\\', '/', $path)), $remove, true)) $removeActual[] = $path;
        }
        if ((count(array_diff($existing, $removeActual)) + count($incoming)) > 8) {
            throw new \RuntimeException('A food can have up to 8 images. Remove an image before adding another one.');
        }

        foreach ($incoming as $file) {
            if (!$file || !$file->isValid()) throw new \RuntimeException('One of the selected food images could not be uploaded.');
            if ((int)$file->getSize() > 5 * 1024 * 1024) throw new \RuntimeException('Each food image must be 5 MB or smaller.');
            if (!in_array(strtolower((string)$file->getMimeType()), ['image/jpeg', 'image/png', 'image/webp'], true)) {
                throw new \RuntimeException('Food images must be JPG, PNG or WEBP.');
            }
        }

        if ($removeActual) {
            $connection->table('menu_images')->where('menu_id', $menuId)->whereIn('image_path', $removeActual)->delete();
        }
        if (!$incoming) return;

        $directory = base_path('assets/media/uploads');
        if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
            throw new \RuntimeException('Unable to create the menu image directory.');
        }
        if ($schema->hasColumn('menu_images', 'sort_order')) {
            $connection->table('menu_images')->where('menu_id', $menuId)->increment('sort_order', count($incoming));
        }

        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        foreach ($incoming as $index => $file) {
            $mime = strtolower((string)$file->getMimeType());
            $filename = 'pmdmenu_'.date('Ymd_His').'_'.bin2hex(random_bytes(6)).'.'.$extensions[$mime];
            $file->move($directory, $filename);
            $row = ['menu_id' => $menuId, 'image_path' => $filename];
            if ($schema->hasColumn('menu_images', 'sort_order')) $row['sort_order'] = $index + 1;
            if ($schema->hasColumn('menu_images', 'created_at')) $row['created_at'] = now();
            if ($schema->hasColumn('menu_images', 'updated_at')) $row['updated_at'] = now();
            $connection->table('menu_images')->insert($row);
        }
    }

    protected function normalizePmdMenuOptionGroupsV1(array $groups): array
    {
        $normalized = [];
        foreach (array_slice($groups, 0, 12) as $group) {
            if (!is_array($group)) continue;
            $name = trim((string)($group['name'] ?? ''));
            if ($name === '') continue;
            $type = strtolower(trim((string)($group['display_type'] ?? 'radio')));
            if (!in_array($type, ['radio', 'checkbox', 'select'], true)) $type = 'radio';
            $values = [];
            $defaultUsed = false;
            foreach (array_slice((array)($group['values'] ?? []), 0, 30) as $value) {
                if (!is_array($value)) continue;
                $valueName = trim((string)($value['name'] ?? ''));
                if ($valueName === '') continue;
                $price = (float)($value['price'] ?? 0);
                if (!is_finite($price) || $price < 0 || $price > 9999999) throw new \RuntimeException('Option prices must be valid positive amounts.');
                $isDefault = !$defaultUsed && filter_var($value['is_default'] ?? false, FILTER_VALIDATE_BOOLEAN);
                if ($isDefault) $defaultUsed = true;
                $values[] = ['name' => mb_substr($valueName, 0, 128), 'price' => $price, 'is_default' => $isDefault];
            }
            if (!$values) continue;
            $normalized[] = [
                'name' => mb_substr($name, 0, 128),
                'display_type' => $type,
                'required' => filter_var($group['required'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'values' => $values,
            ];
        }
        return $normalized;
    }

    protected function syncPmdMenuOptionGroupsV1($connection, $schema, int $menuId, array $groups): void
    {
        foreach (['menu_options', 'menu_option_values', 'menu_item_options', 'menu_item_option_values'] as $table) {
            if (!$schema->hasTable($table)) {
                if ($groups) throw new \RuntimeException('Menu option storage is unavailable for this restaurant.');
                return;
            }
        }

        $oldRows = $connection->table('menu_item_options')->where('menu_id', $menuId)->get(['menu_option_id', 'option_id']);
        $oldMenuOptionIds = $oldRows->pluck('menu_option_id')->map('intval')->filter()->values()->all();
        $oldOptionIds = $oldRows->pluck('option_id')->map('intval')->filter()->unique()->values()->all();
        if ($oldMenuOptionIds) $connection->table('menu_item_option_values')->whereIn('menu_option_id', $oldMenuOptionIds)->delete();
        $connection->table('menu_item_options')->where('menu_id', $menuId)->delete();

        foreach ($groups as $groupIndex => $group) {
            $optionRow = ['option_name' => $group['name'], 'display_type' => $group['display_type']];
            if ($schema->hasColumn('menu_options', 'priority')) $optionRow['priority'] = $groupIndex + 1;
            if ($schema->hasColumn('menu_options', 'update_related_menu_item')) $optionRow['update_related_menu_item'] = 0;
            if ($schema->hasColumn('menu_options', 'created_at')) $optionRow['created_at'] = now();
            if ($schema->hasColumn('menu_options', 'updated_at')) $optionRow['updated_at'] = now();
            $optionId = (int)$connection->table('menu_options')->insertGetId($optionRow);

            $menuOptionRow = ['option_id' => $optionId, 'menu_id' => $menuId, 'required' => $group['required'] ? 1 : 0];
            if ($schema->hasColumn('menu_item_options', 'priority')) $menuOptionRow['priority'] = $groupIndex + 1;
            if ($schema->hasColumn('menu_item_options', 'min_selected')) $menuOptionRow['min_selected'] = $group['required'] ? 1 : 0;
            if ($schema->hasColumn('menu_item_options', 'max_selected')) $menuOptionRow['max_selected'] = $group['display_type'] === 'checkbox' ? max(1, count($group['values'])) : 1;
            if ($schema->hasColumn('menu_item_options', 'created_at')) $menuOptionRow['created_at'] = now();
            if ($schema->hasColumn('menu_item_options', 'updated_at')) $menuOptionRow['updated_at'] = now();
            $menuOptionId = (int)$connection->table('menu_item_options')->insertGetId($menuOptionRow);

            foreach ($group['values'] as $valueIndex => $value) {
                $valueRow = ['option_id' => $optionId, 'value' => $value['name'], 'price' => $value['price']];
                if ($schema->hasColumn('menu_option_values', 'priority')) $valueRow['priority'] = $valueIndex + 1;
                if ($schema->hasColumn('menu_option_values', 'created_at')) $valueRow['created_at'] = now();
                if ($schema->hasColumn('menu_option_values', 'updated_at')) $valueRow['updated_at'] = now();
                $optionValueId = (int)$connection->table('menu_option_values')->insertGetId($valueRow);

                $link = ['menu_option_id' => $menuOptionId, 'option_value_id' => $optionValueId];
                if ($schema->hasColumn('menu_item_option_values', 'menu_id')) $link['menu_id'] = $menuId;
                if ($schema->hasColumn('menu_item_option_values', 'option_id')) $link['option_id'] = $optionId;
                if ($schema->hasColumn('menu_item_option_values', 'new_price')) $link['new_price'] = $value['price'];
                if ($schema->hasColumn('menu_item_option_values', 'priority')) $link['priority'] = $valueIndex + 1;
                if ($schema->hasColumn('menu_item_option_values', 'is_default')) $link['is_default'] = $value['is_default'] ? 1 : 0;
                if ($schema->hasColumn('menu_item_option_values', 'quantity')) $link['quantity'] = 0;
                if ($schema->hasColumn('menu_item_option_values', 'subtract_stock')) $link['subtract_stock'] = 0;
                if ($schema->hasColumn('menu_item_option_values', 'created_at')) $link['created_at'] = now();
                if ($schema->hasColumn('menu_item_option_values', 'updated_at')) $link['updated_at'] = now();
                $connection->table('menu_item_option_values')->insert($link);
            }
        }

        foreach ($oldOptionIds as $oldOptionId) {
            if ($connection->table('menu_item_options')->where('option_id', $oldOptionId)->exists()) continue;
            $connection->table('menu_option_values')->where('option_id', $oldOptionId)->delete();
            $connection->table('menu_options')->where('option_id', $oldOptionId)->delete();
        }
    }
}
