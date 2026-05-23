<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Models\Menu_options_model;
use Igniter\Flame\Exception\ApplicationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Admin\Models\Menus_model;
use Admin\Classes\FoodNameSuggestions;

class Menus extends AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
        'Admin\Actions\LocationAwareController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Menus_model',
            'title' => 'lang:admin::lang.menus.text_title',
            'emptyMessage' => 'lang:admin::lang.menus.text_empty',
            'defaultSort' => ['menu_id', 'DESC'],
            'configFile' => 'menus_model',
        ],
    ];

    public $formConfig = [
        'name' => 'lang:admin::lang.menus.text_form_name',
        'model' => 'Admin\Models\Menus_model',
        'request' => 'Admin\Requests\Menu',
        'create' => [
            'title' => 'lang:admin::lang.form.create_title',
            'redirect' => 'menus/edit/{menu_id}',
            'redirectClose' => 'menus',
            'redirectNew' => 'menus/create',
        ],
        'edit' => [
            'title' => 'lang:admin::lang.form.edit_title',
            'redirect' => 'menus/edit/{menu_id}',
            'redirectClose' => 'menus',
            'redirectNew' => 'menus/create',
        ],
        'preview' => [
            'title' => 'lang:admin::lang.form.preview_title',
            'redirect' => 'menus',
        ],
        'delete' => [
            'redirect' => 'menus',
        ],
        'configFile' => 'menus_model',
    ];

    protected $requiredPermissions = 'Admin.Menus';

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('menus', 'restaurant');
    }

    public function edit_onChooseMenuOption($context, $recordId)
    {
        $menuOptionId = post('Menu._options');
        if (!$menuOption = Menu_options_model::find($menuOptionId))
            throw new ApplicationException(lang('admin::lang.menus.alert_menu_option_not_attached'));

        $model = $this->asExtension('FormController')->formFindModelObject($recordId);

        $menuOption->attachToMenu($model);

        $model->reload();
        $this->asExtension('FormController')->initForm($model, $context);

        flash()->success(sprintf(lang('admin::lang.alert_success'), 'Menu item option attached'))->now();

        $formField = $this->widgets['form']->getField('menu_options');

        return [
            '#notification' => $this->makePartial('flash'),
            '#'.$formField->getId('group') => $this->widgets['form']->renderField($formField, [
                'useContainer' => false,
            ]),
        ];
    }


    public function onEstimateNutritionAssistant(): JsonResponse
    {
        $enabled = filter_var(env('PMD_AI_NUTRITION_ENABLED', false), FILTER_VALIDATE_BOOLEAN);
        $provider = strtolower((string)env('PMD_AI_NUTRITION_PROVIDER', 'openai'));
        $openAiKey = (string)env('OPENAI_API_KEY', '');
        $geminiKey = (string)env('GEMINI_API_KEY', '');
        $model = (string)env('PMD_AI_NUTRITION_MODEL', 'gpt-4.1-mini');

        $baseUrl = $provider === 'gemini'
            ? 'https://generativelanguage.googleapis.com/v1beta/openai'
            : 'https://api.openai.com/v1';
        $endpoint = $baseUrl.'/chat/completions';
        $apiKey = $provider === 'gemini' ? $geminiKey : $openAiKey;

        $payload = request()->validate([
            'action' => ['required', 'in:suggest-ingredients,improve-description,estimate-nutrition,auto-fill'],
            'menu_name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:3000'],
            'ingredients' => ['nullable', 'string', 'max:4000'],
            'serving_size' => ['nullable', 'string', 'max:120'],
            'preparation_notes' => ['nullable', 'string', 'max:2000'],
            'language' => ['nullable', 'string', 'max:16'],
            'calories' => ['nullable', 'numeric', 'min:0', 'max:5000'],
            'protein' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'carbs' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'fat' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'sugar' => ['nullable', 'numeric', 'min:0', 'max:1000'],
        ]);

        \Log::info('AI nutrition request started', ['enabled' => $enabled, 'provider' => $provider, 'action' => $payload['action'] ?? null]);

        if (!$enabled || !in_array($provider, ['openai', 'gemini'], true) || $apiKey === '') {
            \Log::warning('AI nutrition disabled/unconfigured', ['enabled' => $enabled, 'provider' => $provider, 'has_openai_key' => $openAiKey !== '', 'has_gemini_key' => $geminiKey !== '']);
            return response()->json([
                'enabled' => false,
                'message' => 'AI assistant is unavailable. You can still enter nutrition manually.',
            ]);
        }

        $lang = $payload['language'] ?? 'auto';
        $prompt = [
            'action' => $payload['action'],
            'menu_name' => $payload['menu_name'] ?? '',
            'description' => $payload['description'] ?? '',
            'ingredients' => $payload['ingredients'] ?? '',
            'serving_size' => $payload['serving_size'] ?? '',
            'preparation_notes' => $payload['preparation_notes'] ?? '',
            'language' => $lang,
            'supported_languages' => ['English','German','Persian','Arabic','Turkish'],
            'requirements' => [
                'Provide draft suggestions only.',
                'Nutrition values are estimates.',
                'Return JSON object only with keys: description, ingredients(array), calories, protein, carbs, fat, sugar, serving_size.',
            ],
        ];

        $body = [
            'model' => $model,
            'messages' => [
                ['role' => 'system', 'content' => 'You are a nutrition assistant for restaurant admins. Return compact JSON only.'],
                ['role' => 'user', 'content' => json_encode($prompt, JSON_UNESCAPED_UNICODE)],
            ],
            'temperature' => 0.2,
            'response_format' => ['type' => 'json_object'],
        ];

        try {
            $ch = curl_init($endpoint);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer '.$apiKey,
                    'Content-Type: application/json',
                ],
                CURLOPT_POSTFIELDS => json_encode($body),
                CURLOPT_TIMEOUT => 20,
            ]);
            $raw = curl_exec($ch);
            $err = curl_error($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($raw === false || $err || $code >= 400) {
                \Log::error('AI nutrition provider call failed', ['provider' => $provider, 'http_code' => $code, 'curl_error' => $err ?: null]);
                return response()->json([
                    'enabled' => false,
                    'message' => 'AI assistant is unavailable. You can still enter nutrition manually.',
                ]);
            }

            $json = json_decode((string)$raw, true);
            $content = $json['choices'][0]['message']['content'] ?? '{}';
            $suggestions = json_decode((string)$content, true);
            if (!is_array($suggestions)) {
                \Log::warning('AI nutrition invalid JSON payload returned');
                return response()->json([
                    'enabled' => false,
                    'message' => 'AI assistant is unavailable. You can still enter nutrition manually.',
                ]);
            }

            $num = function ($v, $min, $max) {
                if ($v === null || $v === '' || !is_numeric($v)) return null;
                return max($min, min($max, (float)$v));
            };

            $ingredients = $suggestions['ingredients'] ?? [];
            if (is_string($ingredients)) {
                $ingredients = array_values(array_filter(array_map('trim', preg_split('/[\n,]+/', $ingredients))));
            }
            if (!is_array($ingredients)) $ingredients = [];


            if (
                empty($suggestions['description'])
                && empty($suggestions['ingredients'])
                && !isset($suggestions['calories'])
                && !isset($suggestions['protein'])
                && !isset($suggestions['carbs'])
                && !isset($suggestions['fat'])
                && !isset($suggestions['sugar'])
                && empty($suggestions['serving_size'])
            ) {
                \Log::warning('AI nutrition suggestions empty after parsing');
                return response()->json([
                    'enabled' => false,
                    'message' => 'AI assistant is unavailable. You can still enter nutrition manually.',
                ]);
            }

            return response()->json([
                'enabled' => true,
                'suggestions' => [
                    'description' => isset($suggestions['description']) ? mb_substr((string)$suggestions['description'], 0, 2000) : null,
                    'ingredients' => array_slice(array_values(array_map(function ($item) {
                        return mb_substr((string)$item, 0, 120);
                    }, $ingredients)), 0, 30),
                    'calories' => $num($suggestions['calories'] ?? null, 0, 5000),
                    'protein' => $num($suggestions['protein'] ?? null, 0, 1000),
                    'carbs' => $num($suggestions['carbs'] ?? null, 0, 1000),
                    'fat' => $num($suggestions['fat'] ?? null, 0, 1000),
                    'sugar' => $num($suggestions['sugar'] ?? null, 0, 1000),
                    'serving_size' => isset($suggestions['serving_size']) ? mb_substr((string)$suggestions['serving_size'], 0, 120) : ($payload['serving_size'] ?? null),
                ],
                'disclaimer' => 'AI nutrition values are estimates and should be reviewed before publishing.',
            ]);
        } catch (\Throwable $e) {
            \Log::error('AI nutrition unexpected exception', ['message' => $e->getMessage()]);
            return response()->json([
                'enabled' => false,
                'message' => 'AI assistant is unavailable. You can still enter nutrition manually.',
            ]);
        }
    }

    public function onSuggestFoodNames(): JsonResponse
    {
        $query = (string)request()->input('query', '');
        $categoryId = (int)request()->input('category_id', 0);
        $queryNorm = FoodNameSuggestions::normalize($query);
        if (mb_strlen($queryNorm, 'UTF-8') < 2) {
            return response()->json(['success' => true, 'suggestions' => []]);
        }

        $menusQuery = Menus_model::query()->select(['menu_name']);
        if ($categoryId > 0) {
            $menusQuery->whereHas('categories', function ($q) use ($categoryId) {
                $q->where('categories.category_id', $categoryId);
            });
        }

        $tenantExisting = $menusQuery->where('menu_name', 'like', '%'.$query.'%')
            ->limit(30)
            ->pluck('menu_name')
            ->filter()
            ->map(fn($name) => trim((string)$name))
            ->unique()
            ->values()
            ->all();

        $cuisine = $this->detectCuisine($tenantExisting);
        $templates = FoodNameSuggestions::templates();
        $templatePool = array_merge($templates['english'], $templates['cafe'], $templates['fast_food']);
        if (isset($templates[$cuisine])) {
            $templatePool = array_merge($templates[$cuisine], $templatePool);
        }

        $rows = [];
        foreach ($tenantExisting as $name) $rows[] = ['name' => $name, 'source' => 'tenant_existing', 'cuisine' => $cuisine];
        foreach ($templatePool as $name) $rows[] = ['name' => $name, 'source' => 'template', 'cuisine' => $cuisine];
        $aiEnabled = false;
        foreach ($this->fetchGeminiFoodNameSuggestions($query, $cuisine, $tenantExisting) as $name) {
            $rows[] = ['name' => $name, 'source' => 'ai_gemini', 'cuisine' => $cuisine];
            $aiEnabled = true;
        }

        $seen = [];
        $matches = [];
        foreach ($rows as $row) {
            $nameNorm = FoodNameSuggestions::normalize($row['name']);
            if (!$nameNorm || isset($seen[$nameNorm])) continue;
            $pos = mb_strpos($nameNorm, $queryNorm, 0, 'UTF-8');
            if ($pos === false) continue;
            $starts = $pos === 0;
            $sourceBoost = match ($row['source']) {
                'tenant_existing' => 45,
                'ai_gemini' => 30,
                default => 10,
            };
            $score = ($starts ? 220 : 110) + $sourceBoost + ($row['cuisine'] === $cuisine ? 20 : 0);
            $matches[] = [
                'name' => $row['name'],
                'language' => $this->guessLanguage($row['name']),
                'cuisine' => $row['cuisine'],
                'source' => $row['source'],
                'category_hint' => null,
                'confidence' => $starts ? 0.95 : 0.8,
                '_score' => $score,
            ];
            $seen[$nameNorm] = true;
        }
        usort($matches, fn($a, $b) => $b['_score'] <=> $a['_score']);
        $matches = array_slice($matches, 0, 8);
        foreach ($matches as &$match) unset($match['_score']);

        return response()->json(['success' => true, 'ai_enabled' => $aiEnabled, 'suggestions' => $matches]);
    }

    protected function fetchGeminiFoodNameSuggestions(string $query, string $cuisine, array $tenantExisting): array
    {
        $enabled = filter_var(env('PMD_AI_NUTRITION_ENABLED', false), FILTER_VALIDATE_BOOLEAN);
        $provider = strtolower((string)env('PMD_AI_NUTRITION_PROVIDER', 'openai'));
        $geminiKey = (string)env('GEMINI_API_KEY', '');
        if (!$enabled || $provider !== 'gemini' || $geminiKey === '') {
            return [];
        }

        $cacheKey = 'pmd_food_suggest:'.md5(implode('|', [
            (string)setting('site_name', ''),
            $cuisine,
            FoodNameSuggestions::normalize($query),
        ]));

        return Cache::remember($cacheKey, now()->addMinutes(20), function () use ($query, $cuisine, $tenantExisting) {
            $model = (string)env('PMD_AI_NUTRITION_MODEL', 'gpt-4.1-mini');
            $endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
            $payload = [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => 'You generate short restaurant menu item names only. Return compact JSON only.'],
                    ['role' => 'user', 'content' => json_encode([
                        'task' => 'suggest_food_names',
                        'query' => $query,
                        'cuisine' => $cuisine,
                        'restaurant_name' => (string)setting('site_name', ''),
                        'existing_examples' => array_slice($tenantExisting, 0, 12),
                        'languages' => ['fa', 'ar', 'tr', 'de', 'en'],
                        'rules' => [
                            'Return JSON: {"suggestions":["..."]}',
                            'Max 8 suggestions',
                            'Each suggestion should be a short food name only',
                        ],
                    ], JSON_UNESCAPED_UNICODE)],
                ],
                'temperature' => 0.3,
                'response_format' => ['type' => 'json_object'],
            ];

            try {
                $ch = curl_init($endpoint);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST => true,
                    CURLOPT_HTTPHEADER => [
                        'Authorization: Bearer '.(string)env('GEMINI_API_KEY', ''),
                        'Content-Type: application/json',
                    ],
                    CURLOPT_POSTFIELDS => json_encode($payload),
                    CURLOPT_TIMEOUT => 8,
                ]);
                $raw = curl_exec($ch);
                $err = curl_error($ch);
                $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                if ($raw === false || $err || $code >= 400) return [];
                $json = json_decode((string)$raw, true);
                $content = $json['choices'][0]['message']['content'] ?? '{}';
                $parsed = json_decode((string)$content, true);
                $list = $parsed['suggestions'] ?? [];
                if (!is_array($list)) return [];
                return array_values(array_filter(array_map(function ($item) {
                    return mb_substr(trim((string)$item), 0, 80);
                }, $list)));
            } catch (\Throwable $e) {
                return [];
            }
        });
    }

    protected function detectCuisine(array $tenantExisting): string
    {
        $raw = (string)setting('cuisine', setting('restaurant_type', setting('business_type', '')));
        $raw .= ' '.(string)setting('site_name', '');
        $raw .= ' '.implode(' ', array_slice($tenantExisting, 0, 20));
        $normalized = FoodNameSuggestions::normalize($raw);

        $map = [
            'persian' => ['persian', 'iran', 'iranian', 'کباب', 'چلو', 'جوجه', 'خورشت'],
            'arabic' => ['arabic', 'middle eastern', 'shawarma', 'falafel', 'حمص', 'شاورما', 'فلافل'],
            'turkish' => ['turkish', 'doner', 'döner', 'kebap', 'lahmacun', 'köfte'],
            'german' => ['german', 'deutsch', 'schnitzel', 'bratwurst', 'currywurst'],
            'cafe' => ['cafe', 'coffee', 'latte', 'espresso'],
            'fast_food' => ['fast food', 'burger', 'pizza', 'fries', 'wrap'],
        ];

        foreach ($map as $cuisine => $needles) {
            foreach ($needles as $needle) {
                if (mb_strpos($normalized, FoodNameSuggestions::normalize($needle), 0, 'UTF-8') !== false) {
                    return $cuisine;
                }
            }
        }
        return 'english';
    }

    protected function guessLanguage(string $name): string
    {
        if (preg_match('/[\x{0600}-\x{06FF}]/u', $name)) {
            return str_contains($name, 'ی') || str_contains($name, 'ک') ? 'fa' : 'ar';
        }
        if (preg_match('/[çğıöşüÇĞİÖŞÜ]/u', $name)) return 'tr';
        if (preg_match('/[äöüßÄÖÜ]/u', $name)) return 'de';
        return 'en';
    }


    public function onSaveCardOrder(): JsonResponse
    {
        $user = admin_auth()->user();
        if (!$user || !$user->hasPermission('Admin.Menus')) {
            abort(403);
        }

        $ordered = (array)post('ordered_ids', []);
        $ordered = array_values(array_filter(array_map('intval', $ordered)));
        if (!count($ordered)) {
            return response()->json(['ok' => false, 'message' => 'No items provided'], 422);
        }

        DB::transaction(function () use ($ordered) {
            foreach ($ordered as $i => $menuId) {
                Menus_model::query()->where('menu_id', $menuId)->update(['menu_priority' => $i + 1]);
            }
        });

        return response()->json(['ok' => true]);
    }

}
