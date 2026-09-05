<?php

namespace Admin\Services;

use Illuminate\Support\Str;

/**
 * PMD_STARTER_MENU_IMAGES_V5
 *
 * V5 fixes the two failure modes seen in V4:
 * 1) overly strict metadata checks could leave valid foods with no image;
 * 2) broad starter/tapas queries could still accept the wrong kind of food.
 *
 * The resolver uses exact dish queries first. Dishes with specific semantic
 * evidence (for example Pimientos de Padrón, paella, carbonara or burrata)
 * receive a second synonym-based pass and NEVER fall through to an unrelated
 * same-category photo. Other dishes may use a same-cuisine/same-family fallback
 * to reduce blank cards. People, hands, table scenes and dark imagery remain
 * rejected by the V3 visual pipeline.
 */
class PmdStarterMenuImageServiceV5 extends PmdStarterMenuImageServiceV4
{
    public const VERSION = '5.1.0';

    protected function materialize(array $item, string $restaurantType, string $targetPath): ?array
    {
        if (!function_exists('imagecreatefromstring') || !function_exists('imagewebp')) return null;

        $locked = $this->hasSpecificSemanticLock($item);
        $passes = [
            ['mode' => 'strict', 'queries' => $this->strictQueries($item, $restaurantType)],
        ];

        if ($locked) {
            $passes[] = ['mode' => 'semantic', 'queries' => $this->semanticQueries($item, $restaurantType)];
        } else {
            $passes[] = ['mode' => 'family', 'queries' => $this->familyQueries($item, $restaurantType)];
        }

        foreach ($passes as $pass) {
            $mode = (string)$pass['mode'];
            foreach ((array)$pass['queries'] as $query) {
                $candidates = array_values(array_filter(
                    $this->search((string)$query),
                    fn(array $candidate) => $this->candidateMatchesV5($candidate, $item, (string)$query, $mode)
                ));

                usort(
                    $candidates,
                    fn(array $a, array $b) => $this->candidateScore($b, $item) <=> $this->candidateScore($a, $item)
                );

                foreach ($candidates as $candidate) {
                    $id = (int)($candidate['id'] ?? 0);
                    if ($id > 0 && isset($this->usedPhotoIds[$id])) continue;

                    $render = $this->downloadAndRender($candidate, $targetPath);
                    if (empty($render['ok'])) continue;

                    if ($id > 0) $this->usedPhotoIds[$id] = true;
                    $photographerId = (int)($candidate['photographer_id'] ?? 0);
                    if ($this->preferredPhotographerId === null && $photographerId > 0) {
                        $this->preferredPhotographerId = $photographerId;
                    }

                    $avg = $this->hexRgb((string)($candidate['avg_color'] ?? ''));
                    if ($this->styleAnchorRgb === null && $avg) $this->styleAnchorRgb = $avg;

                    $this->recordSource(
                        $targetPath,
                        $candidate,
                        (string)$query,
                        (array)($render['metrics'] ?? []),
                        $mode
                    );

                    return [
                        'id' => $id,
                        'provider' => 'pexels',
                        'photographer' => trim((string)($candidate['photographer'] ?? '')),
                        'landing_url' => trim((string)($candidate['url'] ?? '')),
                        'style' => 'pmd-studio-semantic-v5',
                        'match_mode' => $mode,
                    ];
                }
            }
        }

        return null;
    }

    protected function strictQueries(array $item, string $restaurantType): array
    {
        $query = trim((string)($item['image_query'] ?? ''));
        if ($query === '') {
            $query = $this->searchName((string)($item['name'] ?? ''), $restaurantType);
        }

        return array_values(array_unique(array_filter([
            trim($query.' plated food bright neutral background'),
            trim($query.' restaurant menu photo white plate close up'),
        ])));
    }

    protected function semanticQueries(array $item, string $restaurantType): array
    {
        $required = $this->semanticRequiredTokens($item);
        $family = strtolower(trim((string)($item['image_family'] ?? 'plated'))) ?: 'plated';
        $cuisine = $this->cuisineTerm($restaurantType);
        $terms = trim(implode(' ', array_slice($required, 0, 4)));
        if ($terms === '') return [];

        return array_values(array_unique(array_filter([
            trim($terms.' '.$cuisine.' '.$this->familySearchTerm($family).' bright plate'),
            trim($terms.' plated restaurant food close up'),
        ])));
    }

    protected function familyQueries(array $item, string $restaurantType): array
    {
        $fallback = trim((string)($item['image_fallback_query'] ?? ''));
        $family = strtolower(trim((string)($item['image_family'] ?? 'plated'))) ?: 'plated';
        $cuisine = $this->cuisineTerm($restaurantType);

        if ($fallback === '') {
            $fallback = trim($cuisine.' '.$this->familySearchTerm($family));
        }

        return array_values(array_unique(array_filter([
            trim($fallback.' plated food bright clean background'),
            trim($fallback.' close up restaurant food white plate'),
        ])));
    }

    protected function candidateMatchesV5(array $candidate, array $item, string $query, string $mode): bool
    {
        $alt = $this->normaliseText((string)($candidate['alt'] ?? ''));
        $family = strtolower(trim((string)($item['image_family'] ?? 'plated'))) ?: 'plated';
        $required = $this->semanticRequiredTokens($item);
        $locked = $this->hasSpecificSemanticLock($item);

        foreach ((array)($item['image_forbid'] ?? []) as $forbidden) {
            $forbidden = $this->normaliseText((string)$forbidden);
            if ($forbidden !== '' && $alt !== '' && str_contains($alt, $forbidden)) return false;
        }

        // For semantically locked dishes, missing metadata is not enough proof.
        // Generic dishes can still use an exact query when Pexels has no alt.
        if ($alt === '') return !$locked && $mode === 'strict';

        $queryTokens = $this->meaningfulQueryTokens($query);
        $queryMatch = $this->containsAny($alt, $queryTokens);
        $requiredMatch = !$required || $this->containsAny($alt, $required);
        $familyMatch = $this->containsAny($alt, $this->familyTokens($family));
        $detected = $this->detectedStrongFamilies($alt);

        // A locked dish must show at least one dish-specific semantic term on
        // BOTH strict and synonym passes. This prevents peppers -> octopus and
        // salad -> calzone even when both happen to be tagged as tapas/starter.
        if ($locked && !$requiredMatch) return false;

        if ($this->hasConflictingFamily($family, $detected, $queryMatch, $requiredMatch)) {
            return false;
        }

        if ($mode === 'semantic') return $requiredMatch;

        if ($mode === 'strict') {
            return $requiredMatch || $queryMatch || $familyMatch;
        }

        return $familyMatch && ($queryMatch || !$detected || in_array($family, $detected, true));
    }

    protected function semanticRequiredTokens(array $item): array
    {
        $tokens = [];
        foreach ((array)($item['image_required'] ?? []) as $value) {
            $value = $this->normaliseText((string)$value);
            if ($value !== '') $tokens[] = $value;
        }
        foreach ($this->requiredAltTokens($item) as $value) {
            $value = $this->normaliseText((string)$value);
            if ($value !== '') $tokens[] = $value;
        }
        return array_values(array_unique($tokens));
    }

    protected function hasSpecificSemanticLock(array $item): bool
    {
        $family = strtolower(trim((string)($item['image_family'] ?? 'plated'))) ?: 'plated';
        $required = $this->semanticRequiredTokens($item);
        $familyTokens = array_values(array_unique(array_map(
            fn($value) => $this->normaliseText((string)$value),
            $this->familyTokens($family)
        )));

        if (!$required) return false;
        if ($this->requiredAltTokens($item)) return true;

        $requiredSorted = $required;
        $familySorted = $familyTokens;
        sort($requiredSorted);
        sort($familySorted);
        return $requiredSorted !== $familySorted;
    }

    protected function meaningfulQueryTokens(string $query): array
    {
        $tokens = $this->importantTokens($this->normaliseText($query));
        $generic = [
            'food','foods','plate','plated','dish','dishes','bright','neutral','background',
            'restaurant','menu','photo','photography','white','close','clean','light','style',
        ];
        return array_values(array_filter(
            $tokens,
            static fn($token) => !in_array($token, $generic, true)
        ));
    }

    protected function hasConflictingFamily(
        string $requested,
        array $detected,
        bool $queryMatch,
        bool $requiredMatch
    ): bool {
        if (!$detected || $requiredMatch) return false;
        if (in_array($requested, $detected, true)) return false;
        if ($queryMatch && count($detected) === 1) return false;

        $compatible = [
            'pasta' => ['seafood'],
            'rice' => ['seafood','grill','vegetarian'],
            'salad' => ['vegetarian'],
            'sandwich' => ['grill','vegetarian'],
            'starter' => ['bread','dumpling','vegetarian'],
            'mezze' => ['vegetarian','bread'],
            'side' => ['vegetarian'],
            'vegetarian' => ['salad','side'],
            'plated' => ['grill','seafood','vegetarian','rice'],
        ][$requested] ?? [];

        foreach ($detected as $family) {
            if (in_array($family, $compatible, true)) return false;
        }

        return true;
    }

    protected function detectedStrongFamilies(string $alt): array
    {
        $families = [];
        foreach (['pizza','pasta','rice','soup','salad','sushi','dumpling','dessert','drink','sandwich','seafood','grill'] as $family) {
            if ($this->containsAny($alt, $this->familyTokens($family))) $families[] = $family;
        }
        return array_values(array_unique($families));
    }

    protected function candidateScore(array $candidate, array $item): int
    {
        $score = parent::candidateScore($candidate, $item);
        $alt = $this->normaliseText((string)($candidate['alt'] ?? ''));
        if ($alt === '') return $score;

        $required = $this->semanticRequiredTokens($item);
        if ($required && $this->containsAny($alt, $required)) $score += 95;

        $fallback = $this->normaliseText((string)($item['image_fallback_query'] ?? ''));
        if ($fallback !== '' && $this->containsAny($alt, $this->meaningfulQueryTokens($fallback))) {
            $score += 14;
        }

        return $score;
    }

    protected function passesStudioProfile(array $metrics): bool
    {
        $edgeLuma = (float)($metrics['edge_luma'] ?? 0);
        $darkEdge = (float)($metrics['dark_edge_ratio'] ?? 1);
        $neutralLight = (float)($metrics['neutral_light_edge_ratio'] ?? 0);
        $skin = (float)($metrics['skin_edge_ratio'] ?? 1);

        // Wider than V4 for coverage, while preserving the bright menu-card
        // direction and making the people/hands rejection even stricter.
        if ($edgeLuma < 96) return false;
        if ($darkEdge > 0.31) return false;
        if ($neutralLight < 0.025) return false;
        if ($skin > 0.028) return false;

        return true;
    }

    protected function familySearchTerm(string $family): string
    {
        return [
            'pizza' => 'pizza',
            'pasta' => 'pasta',
            'rice' => 'rice dish',
            'soup' => 'soup bowl',
            'salad' => 'salad plate',
            'sushi' => 'sushi plate',
            'dumpling' => 'dumplings',
            'dessert' => 'dessert plate',
            'drink' => 'drink glass',
            'sandwich' => 'sandwich plate',
            'seafood' => 'seafood plate',
            'grill' => 'grilled meat plate',
            'mezze' => 'mezze plate',
            'starter' => 'appetizer plate',
            'vegetarian' => 'vegetarian plate',
            'side' => 'side dish',
            'bread' => 'bread plate',
            'sausage' => 'sausage plate',
            'stew' => 'stew bowl',
            'plated' => 'plated main dish',
        ][$family] ?? 'plated food';
    }

    protected function filename(string $type, string $name): string
    {
        $typeSlug = Str::slug($type) ?: 'restaurant';
        $itemSlug = Str::slug($name) ?: 'food';
        return 'pmdstarter_v5_'.$typeSlug.'_'.$itemSlug.'.webp';
    }

    protected function isStarterPath(string $path): bool
    {
        $base = strtolower(basename(str_replace('\\\\', '/', $path)));
        return str_starts_with($base, 'pmdstarter_v1_')
            || str_starts_with($base, 'pmdstarter_v2_')
            || str_starts_with($base, 'pmdstarter_v3_')
            || str_starts_with($base, 'pmdstarter_v4_')
            || str_starts_with($base, 'pmdstarter_v5_');
    }

    protected function recordSource(
        string $targetPath,
        array $candidate,
        string $query,
        array $metrics,
        string $mode = 'strict'
    ): void {
        try {
            $manifest = storage_path('app/pmd-starter-menu-image-sources-v5.json');
            $directory = dirname($manifest);
            if (!is_dir($directory)) @mkdir($directory, 0755, true);

            $handle = @fopen($manifest, 'c+');
            if (!$handle) return;
            if (!flock($handle, LOCK_EX)) { fclose($handle); return; }

            rewind($handle);
            $data = json_decode((string)stream_get_contents($handle), true);
            if (!is_array($data)) $data = [];

            $data[basename($targetPath)] = [
                'provider' => 'pexels',
                'style_profile' => 'pmd-studio-semantic-v5',
                'match_mode' => $mode,
                'query' => $query,
                'photo_id' => (int)($candidate['id'] ?? 0),
                'alt' => trim((string)($candidate['alt'] ?? '')),
                'avg_color' => trim((string)($candidate['avg_color'] ?? '')),
                'photographer' => trim((string)($candidate['photographer'] ?? '')),
                'photographer_id' => (int)($candidate['photographer_id'] ?? 0),
                'photographer_url' => trim((string)($candidate['photographer_url'] ?? '')),
                'landing_url' => trim((string)($candidate['url'] ?? '')),
                'visual_metrics' => $metrics,
                'saved_at' => now()->toIso8601String(),
            ];

            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
            fflush($handle);
            flock($handle, LOCK_UN);
            fclose($handle);
        } catch (\Throwable $error) {
            // Source auditing must never block Quick Setup.
        }
    }
}
