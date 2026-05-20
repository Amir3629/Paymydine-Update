<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Models\Menu_options_model;
use Igniter\Flame\Exception\ApplicationException;
use Illuminate\Http\JsonResponse;

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

}
