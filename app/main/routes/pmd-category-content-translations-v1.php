<?php

/*
|--------------------------------------------------------------------------
| PMD_CATEGORY_CONTENT_TRANSLATIONS_V1
|--------------------------------------------------------------------------
| Category names are owned by the Category editor, never by a Food editor.
| This same-page endpoint creates/renames a regular category and persists its
| tenant-scoped translations in the existing language_translations table.
|--------------------------------------------------------------------------
*/

if (!defined('PMD_CATEGORY_CONTENT_TRANSLATIONS_V1')) {
    define('PMD_CATEGORY_CONTENT_TRANSLATIONS_V1', true);

    \Illuminate\Support\Facades\Route::post('/admin/pmd-menu-category-content-v1', function () {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Categories')) {
            abort(403);
        }

        $db = \Illuminate\Support\Facades\DB::connection();
        $schema = \Illuminate\Support\Facades\Schema::connection($db->getName());
        $namespace = 'pmd-menu-content-v1';

        $normalizeLocale = static function ($locale): string {
            $locale = strtolower(trim(str_replace('_', '-', (string)$locale)));
            if (!preg_match('/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/', $locale)) return '';
            return explode('-', $locale)[0];
        };

        $parseLocales = static function ($value) use ($normalizeLocale): array {
            if (is_string($value)) {
                $trimmed = trim($value);
                $decoded = json_decode($trimmed, true);
                if (is_array($decoded)) {
                    $value = $decoded;
                } else {
                    $unserialized = @unserialize($trimmed);
                    if (is_array($unserialized)) $value = $unserialized;
                    else $value = preg_split('/\s*,\s*/', $trimmed, -1, PREG_SPLIT_NO_EMPTY) ?: [];
                }
            }
            if (!is_array($value)) return [];
            $out = [];
            foreach ($value as $locale) {
                $locale = $normalizeLocale($locale);
                if ($locale !== '') $out[] = $locale;
            }
            return array_values(array_unique($out));
        };

        $setting = static function ($key, $fallback = null) use ($db, $schema) {
            try {
                if (!$schema->hasTable('settings')) return $fallback;
                $columns = $schema->getColumnListing('settings');
                $keyColumn = in_array('item', $columns, true) ? 'item' : (in_array('key', $columns, true) ? 'key' : null);
                $valueColumn = in_array('value', $columns, true) ? 'value' : (in_array('data', $columns, true) ? 'data' : null);
                if (!$keyColumn || !$valueColumn) return $fallback;
                $value = $db->table('settings')->where($keyColumn, $key)->value($valueColumn);
                return $value !== null ? $value : $fallback;
            } catch (\Throwable $e) {
                return $fallback;
            }
        };

        $configuredDefault = $normalizeLocale(
            $setting('default_language', $setting('pmd_customer_default_language', 'en'))
        );
        if ($configuredDefault === '') $configuredDefault = 'en';

        $enabledLocales = $parseLocales(
            $setting('pmd_v2_enabled_languages', $setting('supported_languages', []))
        );
        if (!$enabledLocales) $enabledLocales = [$configuredDefault];
        if (!in_array($configuredDefault, $enabledLocales, true)) array_unshift($enabledLocales, $configuredDefault);
        $enabledLocales = array_values(array_unique($enabledLocales));
        $allowedLocales = array_fill_keys($enabledLocales, true);

        $sourceLocale = $normalizeLocale(request()->input('pmd_category_translation_source_locale', ''));
        if ($sourceLocale === '' || !isset($allowedLocales[$sourceLocale])) {
            $sourceLocale = $configuredDefault;
        }

        $name = trim((string)request()->input('name', ''));
        if (mb_strlen($name, 'UTF-8') < 2 || mb_strlen($name, 'UTF-8') > 128) {
            return response()->json([
                'ok' => false,
                'message' => 'Category name must be between 2 and 128 characters.',
            ], 422);
        }

        $categoryId = max(0, (int)request()->input('category_id', 0));
        $category = null;
        $created = false;

        if ($categoryId > 0) {
            $category = \Admin\Models\Categories_model::query()->find($categoryId);
            if (!$category) {
                return response()->json(['ok' => false, 'message' => 'Category not found.'], 404);
            }

            $kind = strtolower(trim((string)($category->pmd_kind ?? 'regular')));
            if ($kind !== '' && $kind !== 'regular') {
                return response()->json([
                    'ok' => false,
                    'message' => 'This system category cannot be renamed here.',
                ], 422);
            }
        }

        $duplicate = \Admin\Models\Categories_model::query()->where('name', $name);
        if ($categoryId > 0) $duplicate->where('category_id', '!=', $categoryId);
        if ($duplicate->exists()) {
            return response()->json(['ok' => false, 'message' => 'A category with this name already exists.'], 422);
        }

        try {
            $result = $db->transaction(function () use (
                $schema,
                $category,
                $categoryId,
                $name,
                $namespace,
                $enabledLocales,
                $sourceLocale,
                &$created
            ) {
                if ($categoryId > 0) {
                    $category->name = $name;
                    $category->save();
                } else {
                    $nextPriority = ((int)\Admin\Models\Categories_model::query()->max('priority')) + 1;
                    $attributes = [
                        'name' => $name,
                        'priority' => $nextPriority,
                        'status' => 1,
                    ];
                    if ($schema->hasColumn('categories', 'frontend_visible')) {
                        $attributes['frontend_visible'] = 1;
                    }
                    $category = \Admin\Models\Categories_model::query()->create($attributes);
                    $created = true;
                }

                $id = (int)$category->getKey();
                $translations = (array)request()->input('pmd_category_translations', []);

                if ($schema->hasTable('language_translations')) {
                    $now = now();
                    foreach ($enabledLocales as $locale) {
                        if ($locale === $sourceLocale) continue;
                        $row = $translations[$locale] ?? [];
                        $text = is_array($row) ? trim((string)($row['name'] ?? '')) : '';
                        $where = [
                            'locale' => $locale,
                            'namespace' => $namespace,
                            'group' => 'category',
                            'item' => $id.'.name',
                        ];

                        if ($text === '') {
                            \Illuminate\Support\Facades\DB::connection()->table('language_translations')->where($where)->delete();
                            continue;
                        }

                        \Illuminate\Support\Facades\DB::connection()->table('language_translations')->updateOrInsert(
                            $where,
                            [
                                'text' => mb_substr($text, 0, 160),
                                'unstable' => 0,
                                'locked' => 0,
                                'updated_at' => $now,
                                'created_at' => $now,
                            ]
                        );
                    }
                }

                return [
                    'category_id' => $id,
                    'name' => (string)$category->name,
                ];
            });
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('PMD_CATEGORY_CONTENT_SAVE_FAILED_V1', [
                'category_id' => $categoryId,
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'ok' => false,
                'message' => 'Category could not be saved.',
            ], 500);
        }

        return response()->json([
            'ok' => true,
            'category_id' => (int)$result['category_id'],
            'name' => (string)$result['name'],
            'created' => $created,
            'source_locale' => $sourceLocale,
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate');
    });
}
