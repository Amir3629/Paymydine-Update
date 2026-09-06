<?php

namespace App\Services\AI;

/**
 * Deterministically reduces a public menu projection before it is sent to the
 * provider. It never invents facts and never changes item availability.
 */
final class GuestAiContextBuilder
{
    public function compact(array $menu, string $question): array
    {
        $items = array_values(array_filter((array)($menu['items'] ?? []), 'is_array'));
        if (!$items) return $menu;

        $limit = max(8, min(50, (int)config('pmd_ai.guest_context_menu_items', 28)));
        if (count($items) <= $limit) return $menu;

        $tokens = $this->tokens($question);
        $asksPopular = $this->containsAny($question, [
            'popular', 'best seller', 'best-selling', 'most ordered', 'top selling',
            'محبوب', 'پرفروش', 'beliebt', 'topseller', 'popüler', 'çok satan', '人気',
        ]);

        foreach ($items as $index => &$item) {
            $score = 0;
            $text = mb_strtolower(implode(' ', array_filter([
                (string)($item['name'] ?? ''),
                (string)($item['category'] ?? ''),
                (string)($item['description'] ?? ''),
                $this->flatten($item['ingredients'] ?? null),
                $this->flatten($item['dietary'] ?? null),
                $this->flatten($item['allergens'] ?? null),
            ])));

            foreach ($tokens as $token) {
                if (mb_strlen($token) < 2) continue;
                if (str_contains($text, $token)) $score += 8;
                if (str_contains(mb_strtolower((string)($item['name'] ?? '')), $token)) $score += 8;
                if (str_contains(mb_strtolower((string)($item['category'] ?? '')), $token)) $score += 4;
            }

            if (!empty($item['available'])) $score += 2;
            if (!empty($item['chef_recommended'])) $score += 2;
            if (!empty($item['best_seller'])) $score += $asksPopular ? 4 : 1;
            if ($asksPopular && isset($item['popularity_rank']) && is_numeric($item['popularity_rank'])) {
                $score += max(0, 12 - (int)$item['popularity_rank']);
            }

            $item['_pmd_ai_score'] = $score;
            $item['_pmd_ai_order'] = $index;
        }
        unset($item);

        usort($items, static function (array $a, array $b): int {
            $score = ((int)($b['_pmd_ai_score'] ?? 0)) <=> ((int)($a['_pmd_ai_score'] ?? 0));
            return $score !== 0 ? $score : ((int)($a['_pmd_ai_order'] ?? 0) <=> (int)($b['_pmd_ai_order'] ?? 0));
        });

        $items = array_slice($items, 0, $limit);
        foreach ($items as &$item) {
            unset($item['_pmd_ai_score'], $item['_pmd_ai_order']);
        }
        unset($item);

        $menu['items'] = array_values($items);
        $menu['item_count'] = count($items);
        $menu['context_compacted'] = true;
        $menu['context_item_limit'] = $limit;
        return $menu;
    }

    private function tokens(string $question): array
    {
        $question = mb_strtolower(strip_tags($question));
        $parts = preg_split('/[^\p{L}\p{N}]+/u', $question) ?: [];
        $stop = array_flip([
            'the','a','an','and','or','to','for','of','in','on','with','what','which','me','i','is','are',
            'چی','چه','یک','برای','من','این','اون','با','oder','und','was','welche','ein','eine','für',
            've','bir','ne','hangi','için','の','は','を','が','に','と',
        ]);
        $out = [];
        foreach ($parts as $part) {
            $part = trim((string)$part);
            if ($part === '' || isset($stop[$part])) continue;
            $out[$part] = true;
        }
        return array_keys($out);
    }

    private function containsAny(string $text, array $needles): bool
    {
        $text = mb_strtolower($text);
        foreach ($needles as $needle) {
            if (str_contains($text, mb_strtolower($needle))) return true;
        }
        return false;
    }

    private function flatten($value): string
    {
        if (is_scalar($value)) return (string)$value;
        if (!is_array($value)) return '';
        $out = [];
        foreach ($value as $entry) {
            if (is_scalar($entry)) $out[] = (string)$entry;
        }
        return implode(' ', $out);
    }
}
