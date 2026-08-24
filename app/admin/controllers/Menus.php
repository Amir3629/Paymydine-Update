<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\AdminAuth;
use Admin\Models\Menu_options_model;
use Igniter\Flame\Exception\ApplicationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;
use Admin\Models\Menus_model;
use Admin\Models\Categories_model;
use Admin\Models\Allergens_model;
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

    /* PMD_MENU_MANAGER_V1_BACKEND_START */
    public function index()
    {
        if (request()->isMethod('get') && !request()->ajax()) {
            return redirect(admin_url('pmdmenus'));
        }

        $this->asExtension('ListController')->index();
        return $this->makeView('menus/index');
    }

    public function create()
    {
        if (request()->isMethod('get') && !request()->ajax()) {
            return redirect(admin_url('pmdmenus').'?pmd_mode=create');
        }

        $this->asExtension('FormController')->create();
        return $this->makeView('menus/create');
    }

    public function edit($context = null, $recordId = null)
    {
        if ($recordId === null && is_numeric($context)) {
            $recordId = (int)$context;
            $context = null;
        }

        if (request()->isMethod('get') && !request()->ajax()) {
            $id = $recordId ?: (int)basename(request()->path());
            return redirect(admin_url('pmdmenus').'?pmd_mode=edit&pmd_id='.(int)$id);
        }

        $this->asExtension('FormController')->edit($context, $recordId);
        return $this->makeView('menus/edit');
    }
    public function onPmdMenuManagerSaveV1(): JsonResponse
    {
        $user = AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Menus')) abort(403);

        $input = request()->all();
        $validator = Validator::make($input, [
            'menu_id' => ['nullable', 'integer', 'min:1'],
            'menu_name' => ['required', 'string', 'min:2', 'max:128'],
            'menu_price' => ['required', 'numeric', 'min:0', 'max:9999999'],
            'category_id' => ['nullable', 'integer', 'min:1'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'min:1', 'distinct'],
            'menu_description' => ['nullable', 'string', 'max:1028'],
            'menu_status' => ['nullable', 'boolean'],
            'is_halal' => ['nullable', 'boolean'],
            'is_vegetarian' => ['nullable', 'boolean'],
            'is_vegan' => ['nullable', 'boolean'],
            'allergen_ids' => ['nullable', 'array'],
            'allergen_ids.*' => ['integer', 'min:1', 'distinct'],
            'calories' => ['nullable', 'integer', 'min:0', 'max:5000'],
            'serving_size' => ['nullable', 'string', 'max:64'],
            'protein' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'carbs' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'fat' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'sugar' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'prep_time_minutes' => ['nullable', 'integer', 'min:0', 'max:240'],
            'image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'ok' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        $clean = $validator->validated();
        $menuId = !empty($clean['menu_id']) ? (int)$clean['menu_id'] : null;
        $categoryIds = array_values(array_unique(array_map('intval', (array)($clean['category_ids'] ?? []))));
        if (!$categoryIds && !empty($clean['category_id'])) {
            $categoryIds = [(int)$clean['category_id']];
        }
        $allergenIds = array_values(array_unique(array_map('intval', (array)($clean['allergen_ids'] ?? []))));

        if ($categoryIds) {
            $validCategoryIds = Categories_model::query()
                ->whereIn('category_id', $categoryIds)
                ->pluck('category_id')
                ->map(static fn($id) => (int)$id)
                ->all();
            sort($validCategoryIds);
            $expectedCategoryIds = $categoryIds;
            sort($expectedCategoryIds);
            if ($validCategoryIds !== $expectedCategoryIds) {
                return response()->json(['ok' => false, 'message' => 'One or more categories are invalid.'], 422);
            }
        }

        if ($allergenIds) {
            $allergenQuery = Allergens_model::query()->whereIn('allergen_id', $allergenIds);
            if (Schema::hasColumn('allergens', 'status')) {
                $allergenQuery->where('status', 1);
            }
            $validAllergenIds = $allergenQuery
                ->pluck('allergen_id')
                ->map(static fn($id) => (int)$id)
                ->all();
            sort($validAllergenIds);
            $expectedAllergenIds = $allergenIds;
            sort($expectedAllergenIds);
            if ($validAllergenIds !== $expectedAllergenIds) {
                return response()->json(['ok' => false, 'message' => 'One or more allergens are invalid.'], 422);
            }
        }

        $uploadedRelative = null;
        $uploadedAbsolute = null;
        $image = request()->file('image');
        if ($image) {
            $mime = strtolower((string)$image->getMimeType());
            $extensions = [
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
            ];
            if (!isset($extensions[$mime])) {
                return response()->json(['ok' => false, 'message' => 'Food image must be JPG, PNG or WEBP.'], 422);
            }

            $directory = base_path('assets/media/uploads');
            if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
                return response()->json(['ok' => false, 'message' => 'Unable to create the menu image directory.'], 500);
            }

            $uploadedRelative = 'pmdmenu_'.date('Ymd_His').'_'.bin2hex(random_bytes(6)).'.'.$extensions[$mime];
            $image->move($directory, $uploadedRelative);
            $uploadedAbsolute = $directory.'/'.$uploadedRelative;
        }

        try {
            $saved = DB::transaction(function () use ($clean, $menuId, $categoryIds, $allergenIds, $uploadedRelative) {
                $menu = $menuId ? Menus_model::query()->find($menuId) : new Menus_model;
                if ($menuId && !$menu) {
                    throw new \RuntimeException('Menu item not found.');
                }

                $menu->menu_name = trim((string)$clean['menu_name']);
                $menu->menu_price = (float)$clean['menu_price'];
                $menu->menu_description = trim((string)($clean['menu_description'] ?? ''));
                $menu->menu_status = 1; // PMD V1.2.1: published is product-default, not a user setting

                $optional = [
                    'is_halal' => !empty($clean['is_halal']) ? 1 : 0,
                    'is_vegetarian' => !empty($clean['is_vegetarian']) ? 1 : 0,
                    'is_vegan' => !empty($clean['is_vegan']) ? 1 : 0,
                    'calories' => ($clean['calories'] ?? '') === '' ? null : (int)$clean['calories'],
                    'serving_size' => trim((string)($clean['serving_size'] ?? '')) ?: null,
                    'protein' => ($clean['protein'] ?? '') === '' ? null : (float)$clean['protein'],
                    'carbs' => ($clean['carbs'] ?? '') === '' ? null : (float)$clean['carbs'],
                    'fat' => ($clean['fat'] ?? '') === '' ? null : (float)$clean['fat'],
                    'sugar' => ($clean['sugar'] ?? '') === '' ? null : (float)$clean['sugar'],
                    'prep_time_minutes' => ($clean['prep_time_minutes'] ?? '') === '' ? 15 : (int)$clean['prep_time_minutes'],
                ];

                foreach ($optional as $column => $value) {
                    if (Schema::hasColumn($menu->getTable(), $column)) {
                        $menu->{$column} = $value;
                    }
                }

                if (!$menu->exists) {
                    $menu->minimum_qty = 1;
                    $menu->menu_priority = ((int)Menus_model::query()->max('menu_priority')) + 1;
                    if (Schema::hasColumn($menu->getTable(), 'is_stock_out')) {
                        $menu->is_stock_out = 0;
                    }
                }

                $menu->save();
                $menu->addMenuCategories($categoryIds);
                $menu->addMenuAllergens($allergenIds);

                // PMD_FOOD_UPLOAD_PERSISTENCE_R32
                if ($uploadedRelative) {
                    $pmdMenuConnectionR32 = $menu->getConnection();
                    $pmdMenuSchemaR32 = $pmdMenuConnectionR32->getSchemaBuilder();
                    if (!$pmdMenuSchemaR32->hasTable('menu_images')) {
                        throw new \RuntimeException('Menu image storage is unavailable for this restaurant.');
                    }

                    $pmdMenuConnectionR32->table('menu_images')
                        ->where('menu_id', (int)$menu->menu_id)
                        ->increment('sort_order', 1);

                    $pmdMenuConnectionR32->table('menu_images')->insert([
                        'menu_id' => (int)$menu->menu_id,
                        'image_path' => $uploadedRelative,
                        'sort_order' => 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                return $menu->fresh(['categories', 'allergens', 'menu_images']);
            });
        } catch (\Throwable $e) {
            if ($uploadedAbsolute && is_file($uploadedAbsolute)) @unlink($uploadedAbsolute);
            $notFound = $e instanceof \RuntimeException && $e->getMessage() === 'Menu item not found.';
            $status = $notFound ? 404 : 500;
            return response()->json([
                'ok' => false,
                'message' => $notFound ? $e->getMessage() : 'Menu item could not be saved.',
            ], $status);
        }

        return response()->json([
            'ok' => true,
            'menu_id' => (int)$saved->menu_id,
            'created' => !$menuId,
            'message' => $menuId ? 'Food updated.' : 'Food created.',
        ]);
    }
    /* PMD_MENU_MANAGER_V1_BACKEND_END */

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
                'Also return prep_time_minutes as integer 1..240.',
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
                    'prep_time_minutes' => $num($suggestions['prep_time_minutes'] ?? null, 1, 240) ?: (int)(\Illuminate\Support\Facades\DB::table('settings')->where('item','eta_default_prep_minutes')->orderByDesc('setting_id')->value('value') ?: 15),
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




    public function onToggleMenuStatus(): JsonResponse
    {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Menus')) abort(403);

        $menuId = (int)post('menu_id');
        $menu = Menus_model::query()->find($menuId);
        if (!$menu) return response()->json(['ok' => false, 'message' => 'Menu not found'], 404);

        $menu->menu_status = $menu->menu_status ? 0 : 1;
        $menu->save();

        return response()->json(['ok' => true, 'menu_status' => (int)$menu->menu_status]);
    }

    public function onToggleMenuStock(): JsonResponse
    {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Menus')) abort(403);

        $menuId = (int)post('menu_id');
        $menu = Menus_model::query()->find($menuId);
        if (!$menu) return response()->json(['ok' => false, 'message' => 'Menu not found'], 404);

        $menu->is_stock_out = $menu->is_stock_out ? 0 : 1;
        $menu->save();

        return response()->json(['ok' => true, 'is_stock_out' => (int)$menu->is_stock_out]);
    }


    /**
     * PMD Menu Manager V1.2.9 same-page destructive action.
     * Uses the canonical Menus_model delete lifecycle so category/allergen/location
     * relations and delete=true child relations keep their existing cleanup rules.
     */
    public function onPmdMenuManagerDeleteV129(): JsonResponse
    {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Menus')) abort(403);

        $menuId = (int)post('menu_id');
        if ($menuId < 1) {
            return response()->json(['ok' => false, 'message' => 'Invalid menu item.'], 422);
        }

        $menu = Menus_model::query()->find($menuId);
        if (!$menu) {
            return response()->json(['ok' => false, 'message' => 'Menu item not found.'], 404);
        }

        // Never silently corrupt a Combo by deleting one of its component foods.
        if (Schema::hasTable('menu_combo_items')) {
            $comboIds = DB::table('menu_combo_items')
                ->where('menu_id', $menuId)
                ->pluck('combo_id')
                ->map(static fn($id) => (int)$id)
                ->filter()
                ->unique()
                ->values();

            if ($comboIds->isNotEmpty()) {
                $names = Schema::hasTable('menu_combos')
                    ? DB::table('menu_combos')->whereIn('combo_id', $comboIds->all())->pluck('combo_name')->filter()->values()->all()
                    : [];
                $isGerman = str_starts_with(strtolower((string)request()->cookie('pmd_admin_locale', '')), 'de');
                $suffix = count($names) ? ': '.implode(', ', array_slice($names, 0, 4)) : '';
                $message = $isGerman
                    ? 'Diese Speise wird noch in '.count($comboIds).' Combo(s) verwendet'.$suffix.'. Entferne sie zuerst aus diesen Combos.'
                    : 'This food is still used in '.count($comboIds).' combo(s)'.$suffix.'. Remove it from those combos first.';

                return response()->json([
                    'ok' => false,
                    'code' => 'food_used_in_combos',
                    'message' => $message,
                    'combo_count' => count($comboIds),
                ], 409);
            }
        }

        // PMD Menu Manager uploads are unique files under assets/media/uploads.
        // Collect only safe basename paths; database/model deletion remains authoritative.
        $uploadFiles = [];
        if (Schema::hasTable('menu_images')) {
            $uploadFiles = DB::table('menu_images')
                ->where('menu_id', $menuId)
                ->pluck('image_path')
                ->map(static fn($path) => trim((string)$path))
                ->filter(static fn($path) => $path !== '' && basename($path) === $path)
                ->values()
                ->all();
        }

        try {
            DB::transaction(function () use ($menu) {
                $menu->delete();
            });
        } catch (\Throwable $e) {
            // PMD_MENU_DELETE_FAILURE_DIAGNOSTIC_V1_6_4
            //
            // Keep the browser response safe/generic, but preserve the exact
            // tenant/database exception server-side so a remaining schema
            // problem can be diagnosed from one failed request.
            \Log::error(
                'PMD_MENU_DELETE_FAILED_V164',
                [
                    'menu_id' => $menuId,
                    'database' => DB::connection()->getDatabaseName(),
                    'exception' => get_class($e),
                    'message' => $e->getMessage(),
                ]
            );

            return response()->json([
                'ok' => false,
                'message' => 'Menu item could not be deleted.',
            ], 500);
        }

        $uploadRoot = base_path('assets/media/uploads');
        foreach ($uploadFiles as $file) {
            $candidate = $uploadRoot.DIRECTORY_SEPARATOR.$file;
            if (is_file($candidate)) @unlink($candidate);
        }

        return response()->json(['ok' => true, 'menu_id' => $menuId, 'message' => 'Food deleted.']);
    }

    public function onPmdMenuManagerCreateCategoryV125(): JsonResponse
    {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Categories')) {
            abort(403);
        }

        $name = trim((string)post('name', ''));
        if (mb_strlen($name, 'UTF-8') < 2 || mb_strlen($name, 'UTF-8') > 128) {
            return response()->json(['ok' => false, 'message' => 'Category name must be between 2 and 128 characters.'], 422);
        }

        if (Categories_model::query()->where('name', $name)->exists()) {
            return response()->json(['ok' => false, 'message' => 'A category with this name already exists.'], 422);
        }

        $nextPriority = ((int)Categories_model::query()->max('priority')) + 1;
        $attributes = [
            'name' => $name,
            'priority' => $nextPriority,
            'status' => 1,
        ];

        $schema = DB::getSchemaBuilder();
        if ($schema->hasColumn('categories', 'frontend_visible')) {
            $attributes['frontend_visible'] = 1;
        }

        $category = Categories_model::query()->create($attributes);

        return response()->json([
            'ok' => true,
            'category_id' => (int)$category->category_id,
            'name' => (string)$category->name,
            'priority' => (int)$category->priority,
        ]);
    }

    /**
     * PMD_MENU_CATEGORY_DELETE_WITH_FOODS_V130
     *
     * Owner/Manager-only destructive category action.
     *
     * Deletes:
     * - the selected category
     * - every food assigned to the selected category
     * - only affected combos that become invalid (< 2 foods)
     *
     * Menus_model remains canonical food deletion authority.
     */
    public function onPmdMenuManagerDeleteCategoryV130(): JsonResponse
    {
        $user = AdminAuth::getUser();

        if (
            !$user
            || !$user->hasPermission('Admin.Menus')
            || !$user->hasPermission('Admin.Categories')
        ) {
            abort(403);
        }

        $role = '';

        try {
            if (!empty($user->is_super_user)) {
                $role = 'owner';
            } elseif (!empty($user->staff_id)) {
                $roleRow = DB::table('staffs as s')
                    ->leftJoin(
                        'staff_roles as r',
                        'r.staff_role_id',
                        '=',
                        's.staff_role_id'
                    )
                    ->where(
                        's.staff_id',
                        (int)$user->staff_id
                    )
                    ->select(
                        'r.code as role_code',
                        'r.name as role_name'
                    )
                    ->first();

                $roleCode = strtolower(
                    trim(
                        (string)(
                            $roleRow->role_code
                            ?? ''
                        )
                    )
                );

                $roleName = strtolower(
                    trim(
                        (string)(
                            $roleRow->role_name
                            ?? ''
                        )
                    )
                );

                if (
                    $roleCode === 'owner'
                    || $roleName === 'owner'
                ) {
                    $role = 'owner';
                } elseif (
                    $roleCode === 'manager'
                    || $roleName === 'manager'
                ) {
                    $role = 'manager';
                }
            }
        } catch (\Throwable $error) {
            $role = '';
        }

        if (!in_array($role, ['owner', 'manager'], true)) {
            abort(403);
        }

        $categoryId = (int)post('category_id');

        if ($categoryId < 1) {
            return response()->json([
                'ok' => false,
                'message' => 'Invalid category.',
            ], 422);
        }

        $category = Categories_model::query()
            ->find($categoryId);

        if (!$category) {
            return response()->json([
                'ok' => false,
                'message' => 'Category not found.',
            ], 404);
        }

        $menuIds = DB::table('menu_categories')
            ->where('category_id', $categoryId)
            ->pluck('menu_id')
            ->map(static fn($id) => (int)$id)
            ->filter(static fn($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        /*
         * Capture only combos affected by foods we are about
         * to delete. We never sweep unrelated existing combos.
         */
        $affectedComboIds = [];

        if (
            $menuIds
            && Schema::hasTable('menu_combo_items')
        ) {
            $affectedComboIds = DB::table('menu_combo_items')
                ->whereIn('menu_id', $menuIds)
                ->pluck('combo_id')
                ->map(static fn($id) => (int)$id)
                ->filter(static fn($id) => $id > 0)
                ->unique()
                ->values()
                ->all();
        }

        try {
            $result = DB::transaction(
                function () use (
                    $category,
                    $menuIds,
                    $affectedComboIds
                ) {
                    $deletedFoods = 0;
                    $deletedCombos = 0;

                    foreach ($menuIds as $menuId) {
                        $menu = Menus_model::query()
                            ->find((int)$menuId);

                        if (!$menu) {
                            continue;
                        }

                        /*
                         * Canonical model delete lifecycle:
                         * relations / images / child rows continue
                         * using the existing Menus_model authority.
                         */
                        $menu->delete();

                        $deletedFoods++;
                    }

                    $category->delete();

                    /*
                     * menu_combo_items rows referencing deleted
                     * foods are FK-cascaded.
                     *
                     * A Combo requires >= 2 foods in this manager.
                     * Remove only affected Combos that are now
                     * structurally invalid.
                     */
                    if (
                        Schema::hasTable('menu_combos')
                        && Schema::hasTable('menu_combo_items')
                    ) {
                        foreach ($affectedComboIds as $comboId) {
                            $remaining = DB::table(
                                'menu_combo_items'
                            )
                                ->where(
                                    'combo_id',
                                    (int)$comboId
                                )
                                ->count();

                            if ($remaining >= 2) {
                                continue;
                            }

                            $combo = \Admin\Models\Menu_combos_model::query()
                                ->find((int)$comboId);

                            if (!$combo) {
                                continue;
                            }

                            $combo->delete();

                            $deletedCombos++;
                        }
                    }

                    return [
                        'deleted_foods' => $deletedFoods,
                        'deleted_combos' => $deletedCombos,
                    ];
                }
            );
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => 'Category could not be deleted.',
            ], 500);
        }

        return response()->json([
            'ok' => true,
            'category_id' => $categoryId,
            'deleted_foods' => (int)$result['deleted_foods'],
            'deleted_combos' => (int)$result['deleted_combos'],
            'message' => 'Category and assigned foods deleted.',
        ]);
    }

    public function onSaveCategoryOrder(): JsonResponse
    {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Categories')) {
            abort(403);
        }

        $ordered = (array)post('ordered_category_ids', []);
        $ordered = array_values(array_unique(array_filter(array_map('intval', $ordered))));
        if (!count($ordered)) {
            return response()->json(['ok' => false, 'message' => 'No categories provided'], 422);
        }

        $validIds = Categories_model::query()->whereIn('category_id', $ordered)->pluck('category_id')->map(function ($id) {
            return (int)$id;
        })->all();
        $validSet = array_flip($validIds);

        $sequence = [];
        foreach ($ordered as $categoryId) {
            if (isset($validSet[$categoryId])) {
                $sequence[] = $categoryId;
            }
        }

        if (!count($sequence)) {
            return response()->json(['ok' => false, 'message' => 'No valid categories provided'], 422);
        }

        DB::transaction(function () use ($sequence) {
            foreach ($sequence as $index => $categoryId) {
                Categories_model::query()->where('category_id', $categoryId)->update(['priority' => $index + 1]);
            }
        });

        return response()->json(['ok' => true, 'updated' => count($sequence)]);
    }

    public function onSaveCardOrder(): JsonResponse
    {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Menus')) {
            abort(403);
        }

        $ordered = (array)post('ordered_ids', []);
        $ordered = array_values(array_unique(array_filter(array_map('intval', $ordered))));
        if (!count($ordered)) {
            return response()->json(['ok' => false, 'message' => 'No items provided'], 422);
        }

        $validIds = Menus_model::query()->whereIn('menu_id', $ordered)->pluck('menu_id')->map(function ($id) {
            return (int)$id;
        })->all();
        $validSet = array_flip($validIds);

        $sequence = [];
        foreach ($ordered as $menuId) {
            if (isset($validSet[$menuId])) {
                $sequence[] = $menuId;
            }
        }

        if (!count($sequence)) {
            return response()->json(['ok' => false, 'message' => 'No valid items provided'], 422);
        }

        DB::transaction(function () use ($sequence) {
            foreach ($sequence as $index => $menuId) {
                Menus_model::query()->where('menu_id', $menuId)->update(['menu_priority' => $index + 1]);
            }
        });

        return response()->json(['ok' => true, 'updated' => count($sequence)]);
    }

}
