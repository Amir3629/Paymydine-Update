<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class AiNutritionSuggestionService
{
    /**
     * Return tenant-safe, editable nutrition estimates for a menu item.
     */
    public function suggest(string $foodName, ?string $ingredients = null): array
    {
        $foodName = self::sanitizePromptText($foodName, 160);
        $ingredients = self::sanitizePromptText((string)$ingredients, 1200);

        if ($foodName === '' && $ingredients === '') {
            return $this->emptySuggestion('heuristic', 'Enter a food name or ingredients to generate a nutrition estimate.');
        }

        $openAiSuggestion = $this->suggestWithOpenAi($foodName, $ingredients);

        if ($openAiSuggestion !== null) {
            return $openAiSuggestion;
        }

        return $this->suggestWithHeuristic($foodName, $ingredients);
    }

    /**
     * Reusable input sanitizer for future AI suggestion prompts.
     */
    public static function sanitizePromptText(?string $value, int $maxLength = 500): string
    {
        $value = trim((string)$value);
        $value = strip_tags($value);
        $value = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $value) ?? '';
        $value = preg_replace('/\s+/u', ' ', $value) ?? '';

        return Str::limit($value, $maxLength, '');
    }

    private function suggestWithOpenAi(string $foodName, string $ingredients): ?array
    {
        $apiKey = (string)env('OPENAI_API_KEY', '');

        if ($apiKey === '') {
            return null;
        }

        $schema = [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['calories', 'protein', 'fat', 'carbs', 'sugar'],
            'properties' => [
                'calories' => ['type' => 'integer', 'minimum' => 0, 'maximum' => 5000],
                'protein' => ['type' => 'number', 'minimum' => 0, 'maximum' => 500],
                'fat' => ['type' => 'number', 'minimum' => 0, 'maximum' => 500],
                'carbs' => ['type' => 'number', 'minimum' => 0, 'maximum' => 800],
                'sugar' => ['type' => 'number', 'minimum' => 0, 'maximum' => 500],
            ],
        ];

        $payload = [
            'model' => env('OPENAI_NUTRITION_MODEL', 'gpt-4o-mini'),
            'input' => [
                [
                    'role' => 'system',
                    'content' => 'Return conservative per-serving restaurant nutrition estimates as JSON only. Values must be editable estimates, not medical advice.',
                ],
                [
                    'role' => 'user',
                    'content' => json_encode([
                        'food_name' => $foodName,
                        'ingredients' => $ingredients,
                    ]),
                ],
            ],
            'text' => [
                'format' => [
                    'type' => 'json_schema',
                    'name' => 'nutrition_suggestion',
                    'strict' => true,
                    'schema' => $schema,
                ],
            ],
            'max_output_tokens' => 300,
        ];

        try {
            $response = Http::withToken($apiKey)
                ->acceptJson()
                ->timeout(15)
                ->post('https://api.openai.com/v1/responses', $payload);

            if (!$response->successful()) {
                return null;
            }

            $data = $this->extractJsonFromOpenAiResponse((array)$response->json());

            if (!is_array($data)) {
                return null;
            }

            return $this->normalizeSuggestion($data, 'openai', 'AI estimate. Please review and edit before saving.');
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function extractJsonFromOpenAiResponse(array $response): ?array
    {
        $text = $response['output_text'] ?? null;

        if (!is_string($text) && isset($response['output']) && is_array($response['output'])) {
            foreach ($response['output'] as $output) {
                foreach (($output['content'] ?? []) as $content) {
                    if (($content['type'] ?? null) === 'output_text' && isset($content['text'])) {
                        $text = $content['text'];
                        break 2;
                    }
                }
            }
        }

        if (!is_string($text) || trim($text) === '') {
            return null;
        }

        $decoded = json_decode($text, true);

        return is_array($decoded) ? $decoded : null;
    }

    private function suggestWithHeuristic(string $foodName, string $ingredients): array
    {
        $text = strtolower($foodName.' '.$ingredients);
        $calories = 450;
        $protein = 18;
        $fat = 16;
        $carbs = 48;
        $sugar = 6;

        if (preg_match('/salad|leaf|greens|vegetable|veggie/', $text)) {
            $calories -= 160;
            $fat -= 6;
            $carbs -= 22;
        }

        if (preg_match('/pizza|burger|fried|fries|cream|cheese|butter/', $text)) {
            $calories += 220;
            $fat += 14;
            $carbs += 16;
        }

        if (preg_match('/chicken|beef|lamb|fish|salmon|tuna|shrimp|egg/', $text)) {
            $protein += 18;
            $calories += 80;
        }

        if (preg_match('/rice|pasta|noodle|bread|wrap|potato|quinoa/', $text)) {
            $carbs += 28;
            $calories += 110;
        }

        if (preg_match('/cake|dessert|chocolate|cookie|ice cream|syrup|honey/', $text)) {
            $sugar += 22;
            $carbs += 26;
            $calories += 180;
        }

        return $this->normalizeSuggestion([
            'calories' => $calories,
            'protein' => $protein,
            'fat' => $fat,
            'carbs' => $carbs,
            'sugar' => $sugar,
        ], 'heuristic', 'Fallback estimate. Configure OPENAI_API_KEY for AI-generated estimates.');
    }

    private function normalizeSuggestion(array $data, string $source, string $disclaimer): array
    {
        return [
            'calories' => $this->clampInt($data['calories'] ?? 0, 0, 5000),
            'protein' => $this->clampFloat($data['protein'] ?? 0, 0, 500),
            'fat' => $this->clampFloat($data['fat'] ?? 0, 0, 500),
            'carbs' => $this->clampFloat($data['carbs'] ?? 0, 0, 800),
            'sugar' => $this->clampFloat($data['sugar'] ?? 0, 0, 500),
            'source' => $source,
            'disclaimer' => $disclaimer,
        ];
    }

    private function emptySuggestion(string $source, string $disclaimer): array
    {
        return $this->normalizeSuggestion([
            'calories' => 0,
            'protein' => 0,
            'fat' => 0,
            'carbs' => 0,
            'sugar' => 0,
        ], $source, $disclaimer);
    }

    private function clampInt($value, int $min, int $max): int
    {
        return max($min, min($max, (int)round((float)$value)));
    }

    private function clampFloat($value, float $min, float $max): float
    {
        return round(max($min, min($max, (float)$value)), 1);
    }
}
