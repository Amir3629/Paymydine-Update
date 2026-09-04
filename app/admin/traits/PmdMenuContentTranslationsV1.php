<?php

namespace Admin\Traits;

/**
 * PMD_MENU_CONTENT_TRANSLATIONS_V1
 *
 * Tenant-scoped translations for restaurant-authored menu content.
 * Reuses the existing language_translations table with a private namespace,
 * so no parallel schema or migration is required.
 */
trait PmdMenuContentTranslationsV1
{
    protected string $pmdMenuContentTranslationNamespaceV1 = 'pmd-menu-content-v1';

    protected function syncPmdMenuContentTranslationsV1($request, $connection, $schema, int $menuId): void
    {
        if ((string)$request->input('pmd_menu_translations_present', '') !== '1') return;
        if ($menuId < 1) return;
        if (!$schema->hasTable('language_translations')) {
            throw new \RuntimeException('Menu translation storage is unavailable for this restaurant.');
        }

        $payload = (array)$request->input('pmd_translations', []);
        if (!$payload) return;

        [$defaultLocale, $enabledLocales] = $this->pmdMenuTranslationLocalesV1($connection, $schema);
        $allowed = array_fill_keys($enabledLocales, true);
        $rawOptions = (array)$request->input('options', []);
        $selectedCategoryIds = array_values(array_unique(array_filter(array_map('intval', (array)$request->input('category_ids', [])))));
        $now = now();

        foreach ($payload as $locale => $translation) {
            $locale = $this->normalizePmdMenuTranslationLocaleV1($locale);
            if ($locale === '' || $locale === $defaultLocale || !isset($allowed[$locale]) || !is_array($translation)) continue;

            // Menu and option rows belong to this food. Clear them for this locale
            // first so removed option groups / values never leave stale translations.
            $menuPrefix = $menuId.'.';
            $connection->table('language_translations')
                ->where('namespace', $this->pmdMenuContentTranslationNamespaceV1)
                ->where('locale', $locale)
                ->where(function ($query) use ($menuPrefix) {
                    $query->where(function ($q) use ($menuPrefix) {
                        $q->where('group', 'menu')->where('item', 'like', $menuPrefix.'%');
                    })->orWhere(function ($q) use ($menuPrefix) {
                        $q->where('group', 'menu_option')->where('item', 'like', $menuPrefix.'%');
                    })->orWhere(function ($q) use ($menuPrefix) {
                        $q->where('group', 'menu_option_value')->where('item', 'like', $menuPrefix.'%');
                    });
                })
                ->delete();

            $menu = (array)($translation['menu'] ?? []);
            $this->upsertPmdMenuTranslationV1($connection, $locale, 'menu', $menuId.'.name', $menu['name'] ?? '', 160, $now);
            $this->upsertPmdMenuTranslationV1($connection, $locale, 'menu', $menuId.'.description', $menu['description'] ?? '', 5000, $now);

            // Category translations are global because a category may be shared by
            // many foods. Only categories selected on this form are writable here.
            foreach ((array)($translation['categories'] ?? []) as $categoryId => $categoryTranslation) {
                $categoryId = (int)$categoryId;
                if ($categoryId < 1 || !in_array($categoryId, $selectedCategoryIds, true) || !is_array($categoryTranslation)) continue;
                $this->upsertOrDeletePmdMenuTranslationV1(
                    $connection,
                    $locale,
                    'category',
                    $categoryId.'.name',
                    $categoryTranslation['name'] ?? '',
                    160,
                    $now
                );
            }

            foreach ((array)($translation['options'] ?? []) as $groupIndex => $groupTranslation) {
                $groupIndex = (int)$groupIndex;
                if ($groupIndex < 0 || $groupIndex >= 12 || !is_array($groupTranslation)) continue;
                $sourceGroup = $rawOptions[$groupIndex] ?? null;
                if (!is_array($sourceGroup) || trim((string)($sourceGroup['name'] ?? '')) === '') continue;

                $this->upsertPmdMenuTranslationV1(
                    $connection,
                    $locale,
                    'menu_option',
                    $menuId.'.'.$groupIndex.'.name',
                    $groupTranslation['name'] ?? '',
                    160,
                    $now
                );

                $sourceValues = (array)($sourceGroup['values'] ?? []);
                foreach ((array)($groupTranslation['values'] ?? []) as $valueIndex => $valueTranslation) {
                    $valueIndex = (int)$valueIndex;
                    if ($valueIndex < 0 || $valueIndex >= 30 || !is_array($valueTranslation)) continue;
                    $sourceValue = $sourceValues[$valueIndex] ?? null;
                    if (!is_array($sourceValue) || trim((string)($sourceValue['name'] ?? '')) === '') continue;
                    $this->upsertPmdMenuTranslationV1(
                        $connection,
                        $locale,
                        'menu_option_value',
                        $menuId.'.'.$groupIndex.'.'.$valueIndex.'.name',
                        $valueTranslation['name'] ?? '',
                        160,
                        $now
                    );
                }
            }
        }
    }

    protected function pmdMenuTranslationLocalesV1($connection, $schema): array
    {
        $settings = [];
        if ($schema->hasTable('settings')) {
            $columns = $schema->getColumnListing('settings');
            $keyColumn = in_array('item', $columns, true) ? 'item' : (in_array('key', $columns, true) ? 'key' : null);
            $valueColumn = in_array('value', $columns, true) ? 'value' : (in_array('data', $columns, true) ? 'data' : null);
            if ($keyColumn && $valueColumn) {
                foreach ($connection->table('settings')->whereIn($keyColumn, [
                    'pmd_v2_enabled_languages',
                    'pmd_customer_default_language',
                    'default_language',
                    'supported_languages',
                ])->get([$keyColumn, $valueColumn]) as $row) {
                    $settings[(string)$row->{$keyColumn}] = $row->{$valueColumn};
                }
            }
        }

        $default = $this->normalizePmdMenuTranslationLocaleV1(
            $settings['pmd_customer_default_language'] ?? $settings['default_language'] ?? 'en'
        );
        if ($default === '') $default = 'en';

        $enabled = $this->parsePmdMenuTranslationLocaleListV1(
            $settings['pmd_v2_enabled_languages'] ?? $settings['supported_languages'] ?? []
        );
        if (!$enabled) $enabled = [$default];
        if (!in_array($default, $enabled, true)) array_unshift($enabled, $default);

        return [$default, array_values(array_unique($enabled))];
    }

    protected function parsePmdMenuTranslationLocaleListV1($value): array
    {
        if (is_string($value)) {
            $trimmed = trim($value);
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) $value = $decoded;
            else $value = preg_split('/\s*,\s*/', $trimmed, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        }
        if (!is_array($value)) return [];
        $out = [];
        foreach ($value as $locale) {
            $locale = $this->normalizePmdMenuTranslationLocaleV1($locale);
            if ($locale !== '') $out[] = $locale;
        }
        return array_values(array_unique($out));
    }

    protected function normalizePmdMenuTranslationLocaleV1($locale): string
    {
        $locale = strtolower(trim(str_replace('_', '-', (string)$locale)));
        if (!preg_match('/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/', $locale)) return '';
        return explode('-', $locale)[0];
    }

    protected function cleanPmdMenuTranslationTextV1($value, int $limit): string
    {
        $text = trim((string)$value);
        if ($text === '') return '';
        $text = preg_replace('/\R{3,}/u', "\n\n", $text) ?: $text;
        return mb_substr($text, 0, $limit);
    }

    protected function upsertPmdMenuTranslationV1($connection, string $locale, string $group, string $item, $value, int $limit, $now): void
    {
        $text = $this->cleanPmdMenuTranslationTextV1($value, $limit);
        if ($text === '') return;
        $connection->table('language_translations')->updateOrInsert(
            [
                'locale' => $locale,
                'namespace' => $this->pmdMenuContentTranslationNamespaceV1,
                'group' => $group,
                'item' => $item,
            ],
            [
                'text' => $text,
                'unstable' => 0,
                'locked' => 0,
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );
    }

    protected function upsertOrDeletePmdMenuTranslationV1($connection, string $locale, string $group, string $item, $value, int $limit, $now): void
    {
        $text = $this->cleanPmdMenuTranslationTextV1($value, $limit);
        if ($text === '') {
            $connection->table('language_translations')->where([
                'locale' => $locale,
                'namespace' => $this->pmdMenuContentTranslationNamespaceV1,
                'group' => $group,
                'item' => $item,
            ])->delete();
            return;
        }
        $this->upsertPmdMenuTranslationV1($connection, $locale, $group, $item, $text, $limit, $now);
    }
}
