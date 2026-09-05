<?php

namespace Admin\Services;

use Illuminate\Support\Str;

/**
 * PMD_STARTER_MENU_IMAGES_V4
 *
 * V4 keeps the V3 bright neutral studio profile, but adds a semantic gate.
 * A visually beautiful pasta photo is no longer accepted for a risotto, and a
 * random plated main is no longer accepted for burrata, bruschetta, pizza etc.
 *
 * Search stays anchored to each dish; there is deliberately no broad cuisine
 * fallback. If a trustworthy match is not found we preserve the old starter
 * image rather than replacing it with the wrong food.
 */
class PmdStarterMenuImageServiceV4 extends PmdStarterMenuImageServiceV3
{
    public const VERSION = '4.0.0';

    protected function queries(array $item, string $restaurantType): array
    {
        $query = trim((string)($item['image_query'] ?? ''));
        if ($query === '') {
            $query = $this->searchName((string)($item['name'] ?? ''), $restaurantType);
        }

        return array_values(array_unique(array_filter([
            trim($query.' isolated plated food white plate bright neutral background'),
            trim($query.' restaurant menu photography clean light surface no people'),
            trim($query.' close up plated dish soft daylight white ceramic plate'),
        ])));
    }

    protected function materialize(array $item, string $restaurantType, string $targetPath): ?array
    {
        if (!function_exists('imagecreatefromstring') || !function_exists('imagewebp')) return null;

        foreach ($this->queries($item, $restaurantType) as $query) {
            $candidates = array_values(array_filter(
                $this->search($query),
                fn(array $candidate) => $this->candidateMatchesItem($candidate, $item)
            ));

            usort(
                $candidates,
                fn(array $a, array $b) => $this->candidateScore($b, $item) <=> $this->candidateScore($a, $item)
            );

            foreach ($candidates as $candidate) {
                $id = (int)($candidate['id'] ?? 0);
                if ($id > 0 && isset($this->usedPhotoIds[$id])) continue;

                $render = $this->downloadAndRender($candidate, $targetPath);
                if (!$render['ok']) continue;

                if ($id > 0) $this->usedPhotoIds[$id] = true;
                $photographerId = (int)($candidate['photographer_id'] ?? 0);
                if ($this->preferredPhotographerId === null && $photographerId > 0) {
                    $this->preferredPhotographerId = $photographerId;
                }

                $avg = $this->hexRgb((string)($candidate['avg_color'] ?? ''));
                if ($this->styleAnchorRgb === null && $avg) $this->styleAnchorRgb = $avg;

                $this->recordSource($targetPath, $candidate, $query, (array)$render['metrics']);

                return [
                    'id' => $id,
                    'provider' => 'pexels',
                    'photographer' => trim((string)($candidate['photographer'] ?? '')),
                    'landing_url' => trim((string)($candidate['url'] ?? '')),
                    'style' => 'pmd-studio-semantic-v4',
                ];
            }
        }

        return null;
    }

    protected function candidateMatchesItem(array $candidate, array $item): bool
    {
        $alt = $this->normaliseText((string)($candidate['alt'] ?? ''));
        if ($alt === '') return true;

        foreach ((array)($item['image_forbid'] ?? []) as $forbidden) {
            $forbidden = $this->normaliseText((string)$forbidden);
            if ($forbidden !== '' && str_contains($alt, $forbidden)) return false;
        }

        $family = strtolower(trim((string)($item['image_family'] ?? 'plated')));
        foreach ($this->conflictsForFamily($family) as $conflict) {
            if (str_contains($alt, $conflict)) return false;
        }

        $familyTokens = $this->familyTokens($family);
        $familyMatch = false;
        foreach ($familyTokens as $token) {
            if (str_contains($alt, $token)) {
                $familyMatch = true;
                break;
            }
        }

        $query = $this->normaliseText((string)($item['image_query'] ?? $item['name'] ?? ''));
        $queryMatch = false;
        foreach ($this->importantTokens($query) as $token) {
            if ($token !== '' && str_contains($alt, $token)) {
                $queryMatch = true;
                break;
            }
        }

        // Strong visual families must at least look like the requested kind of
        // food according to Pexels metadata. Broad plated/grill items can rely
        // on the exact search query plus the V3 visual gate.
        if (in_array($family, ['pizza','pasta','rice','soup','salad','sushi','dumpling','dessert','drink','sandwich','bread','seafood'], true)) {
            return $familyMatch || $queryMatch;
        }

        return true;
    }

    protected function candidateScore(array $candidate, array $item): int
    {
        $score = parent::candidateScore($candidate, $item);
        $alt = $this->normaliseText((string)($candidate['alt'] ?? ''));
        if ($alt === '') return $score;

        $family = strtolower(trim((string)($item['image_family'] ?? 'plated')));
        foreach ($this->familyTokens($family) as $token) {
            if (str_contains($alt, $token)) {
                $score += 42;
                break;
            }
        }

        $query = $this->normaliseText((string)($item['image_query'] ?? $item['name'] ?? ''));
        foreach ($this->importantTokens($query) as $token) {
            if ($token !== '' && str_contains($alt, $token)) $score += 18;
        }

        return $score;
    }

    protected function familyTokens(string $family): array
    {
        return [
            'pizza' => ['pizza'],
            'pasta' => ['pasta','spaghetti','tagliatelle','linguine','penne','gnocchi','noodle','noodles','spaetzle','spatzle'],
            'rice' => ['rice','risotto','paella','pilaf','biryani'],
            'soup' => ['soup','broth','ramen','pho','bisque'],
            'salad' => ['salad','greens','tomato salad'],
            'sushi' => ['sushi','nigiri','maki','roll'],
            'dumpling' => ['dumpling','dumplings','gyoza','manti','bao'],
            'dessert' => ['dessert','cake','pudding','tart','pastry','ice cream','gelato','tiramisu','baklava','churros','cheesecake','custard'],
            'drink' => ['coffee','latte','cappuccino','espresso','juice','drink','soda','cooler','tea'],
            'sandwich' => ['sandwich','burger','toast','taco','tacos','burrito','quesadilla','panini','bagel','flatbread'],
            'bread' => ['bread','toast','pretzel','pastry','bruschetta','croissant'],
            'seafood' => ['fish','salmon','tuna','cod','bass','prawn','prawns','shrimp','scallop','scallops','calamari','octopus','mussel','mussels','seafood'],
            'grill' => ['steak','beef','chicken','lamb','pork','kebab','skewer','skewers','ribs','chop','chops','schnitzel','grilled'],
            'mezze' => ['hummus','dip','labneh','mezze','meze'],
            'vegetarian' => ['vegetable','vegetables','eggplant','aubergine','tofu','halloumi'],
            'side' => ['potato','potatoes','fries','side'],
            'sausage' => ['sausage','bratwurst','currywurst'],
            'stew' => ['stew','braised','casserole'],
            'starter' => ['appetizer','starter','tapas'],
            'plated' => ['plate','plated','dish'],
        ][$family] ?? ['plate','plated','dish'];
    }

    protected function conflictsForFamily(string $family): array
    {
        $map = [
            'pizza' => ['pasta','spaghetti','noodles','burger','salad bowl','steak'],
            'pasta' => ['pizza','burger','steak','sushi','salad bowl','rice bowl'],
            'rice' => ['pizza','burger','sandwich','pasta plate','steak'],
            'soup' => ['pizza','burger','sandwich','steak','cake'],
            'salad' => ['pizza','burger','pasta bowl','steak','cake'],
            'sushi' => ['pizza','burger','pasta','steak','cake'],
            'dumpling' => ['pizza','burger','steak','cake'],
            'dessert' => ['steak','burger','pizza','pasta','salad'],
            'drink' => ['pizza','steak','burger','pasta','salad'],
            'sandwich' => ['pasta bowl','risotto','sushi','cake'],
            'bread' => ['steak','pasta bowl','rice bowl','sushi'],
            'seafood' => ['pizza','burger','cake'],
        ];
        return $map[$family] ?? [];
    }

    protected function filename(string $type, string $name): string
    {
        $typeSlug = Str::slug($type) ?: 'restaurant';
        $itemSlug = Str::slug($name) ?: 'food';
        return 'pmdstarter_v4_'.$typeSlug.'_'.$itemSlug.'.webp';
    }

    protected function isStarterPath(string $path): bool
    {
        $base = strtolower(basename(str_replace('\\\\', '/', $path)));
        return str_starts_with($base, 'pmdstarter_v1_')
            || str_starts_with($base, 'pmdstarter_v2_')
            || str_starts_with($base, 'pmdstarter_v3_')
            || str_starts_with($base, 'pmdstarter_v4_');
    }

    protected function recordSource(string $targetPath, array $candidate, string $query, array $metrics): void
    {
        try {
            $manifest = storage_path('app/pmd-starter-menu-image-sources-v4.json');
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
                'style_profile' => 'pmd-studio-semantic-v4',
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
            // Audit metadata must never make Quick Setup fail.
        }
    }
}
