<?php

/*
|--------------------------------------------------------------------------
| PMD_MENU_CONTENT_TRANSLATIONS_ROUTE_V1
|--------------------------------------------------------------------------
| Read-only guest contract for restaurant-authored menu translations.
| Uses the tenant language_translations table and the same enabled-language
| settings already used by Frontend V2. No migration and no parallel store.
|--------------------------------------------------------------------------
*/

if (!defined('PMD_MENU_CONTENT_TRANSLATIONS_ROUTE_V1')) {
    define('PMD_MENU_CONTENT_TRANSLATIONS_ROUTE_V1', true);

    \Illuminate\Support\Facades\Route::get('/api/v1/menu-content-translations', function () {
        $db = \Illuminate\Support\Facades\DB::connection();
        $schema = \Illuminate\Support\Facades\Schema::connection($db->getName());
        $namespace = 'pmd-menu-content-v1';

        $normalizeLocale = static function ($locale) {
            $locale = strtolower(trim(str_replace('_', '-', (string)$locale)));
            if (!preg_match('/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/', $locale)) return '';
            return explode('-', $locale)[0];
        };

        $parseLocales = static function ($value) use ($normalizeLocale) {
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

        $defaultLocale = $normalizeLocale(
            $setting('pmd_customer_default_language', $setting('default_language', 'en'))
        );
        if ($defaultLocale === '') $defaultLocale = 'en';

        $enabledLocales = $parseLocales(
            $setting('pmd_v2_enabled_languages', $setting('supported_languages', []))
        );
        if (!$enabledLocales) $enabledLocales = [$defaultLocale];
        if (!in_array($defaultLocale, $enabledLocales, true)) array_unshift($enabledLocales, $defaultLocale);
        $enabledLocales = array_values(array_unique($enabledLocales));

        $output = [
            'success' => true,
            'api_version' => 'pmd-menu-content-translations-v1',
            'default_locale' => $defaultLocale,
            'enabled_locales' => $enabledLocales,
            'menus' => new \stdClass(),
            'categories' => new \stdClass(),
        ];

        try {
            if (!$schema->hasTable('language_translations')) {
                return response()->json($output)->header('Cache-Control', 'no-store, no-cache, must-revalidate');
            }

            $menuId = max(0, (int)request()->query('menu_id', 0));
            $query = $db->table('language_translations')
                ->where('namespace', $namespace)
                ->whereIn('locale', $enabledLocales)
                ->whereIn('group', ['menu', 'category', 'menu_option', 'menu_option_value']);

            if ($menuId > 0) {
                $prefix = $menuId.'.';
                $query->where(function ($scope) use ($prefix) {
                    $scope->where('group', 'category')
                        ->orWhere(function ($q) use ($prefix) {
                            $q->whereIn('group', ['menu', 'menu_option', 'menu_option_value'])
                                ->where('item', 'like', $prefix.'%');
                        });
                });
            }

            $menus = [];
            $categories = [];

            foreach ($query->get(['locale', 'group', 'item', 'text']) as $row) {
                $locale = $normalizeLocale($row->locale ?? '');
                $group = (string)($row->group ?? '');
                $item = trim((string)($row->item ?? ''));
                $text = trim((string)($row->text ?? ''));
                if ($locale === '' || $text === '' || $item === '') continue;

                if ($group === 'category' && preg_match('/^(\d+)\.name$/', $item, $match)) {
                    $categoryId = (string)(int)$match[1];
                    if (!isset($categories[$categoryId])) $categories[$categoryId] = ['translations' => []];
                    $categories[$categoryId]['translations'][$locale] = $text;
                    continue;
                }

                if ($group === 'menu' && preg_match('/^(\d+)\.(name|description)$/', $item, $match)) {
                    $id = (string)(int)$match[1];
                    $field = $match[2];
                    if (!isset($menus[$id])) $menus[$id] = ['translations' => [], 'options' => []];
                    if (!isset($menus[$id]['translations'][$locale])) $menus[$id]['translations'][$locale] = [];
                    $menus[$id]['translations'][$locale][$field] = $text;
                    continue;
                }

                if ($group === 'menu_option' && preg_match('/^(\d+)\.(\d+)\.name$/', $item, $match)) {
                    $id = (string)(int)$match[1];
                    $groupIndex = (string)(int)$match[2];
                    if (!isset($menus[$id])) $menus[$id] = ['translations' => [], 'options' => []];
                    if (!isset($menus[$id]['options'][$groupIndex])) {
                        $menus[$id]['options'][$groupIndex] = ['translations' => [], 'values' => []];
                    }
                    $menus[$id]['options'][$groupIndex]['translations'][$locale] = $text;
                    continue;
                }

                if ($group === 'menu_option_value' && preg_match('/^(\d+)\.(\d+)\.(\d+)\.name$/', $item, $match)) {
                    $id = (string)(int)$match[1];
                    $groupIndex = (string)(int)$match[2];
                    $valueIndex = (string)(int)$match[3];
                    if (!isset($menus[$id])) $menus[$id] = ['translations' => [], 'options' => []];
                    if (!isset($menus[$id]['options'][$groupIndex])) {
                        $menus[$id]['options'][$groupIndex] = ['translations' => [], 'values' => []];
                    }
                    if (!isset($menus[$id]['options'][$groupIndex]['values'][$valueIndex])) {
                        $menus[$id]['options'][$groupIndex]['values'][$valueIndex] = ['translations' => []];
                    }
                    $menus[$id]['options'][$groupIndex]['values'][$valueIndex]['translations'][$locale] = $text;
                }
            }

            $output['menus'] = $menus ?: new \stdClass();
            $output['categories'] = $categories ?: new \stdClass();
        } catch (\Throwable $e) {
            // Translation metadata must never take down the guest menu. Missing or
            // older tenant schemas simply fall back to the restaurant's base text.
        }

        return response()->json($output)->header('Cache-Control', 'no-store, no-cache, must-revalidate');
    });
}
