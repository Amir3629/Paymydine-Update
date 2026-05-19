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

        $validated = request()->validate([
            'action' => ['required', 'in:estimate,suggest-ingredients'],
            'menu_name' => ['nullable', 'string', 'max:255'],
            'menu_description' => ['nullable', 'string', 'max:2000'],
            'ingredients' => ['nullable', 'string', 'max:3000'],
            'portion' => ['nullable', 'string', 'max:120'],
            'preparation_notes' => ['nullable', 'string', 'max:2000'],
            'locale' => ['nullable', 'string', 'max:12'],
        ]);

        if (!$enabled || $provider === '') {
            return response()->json([
                'success' => false,
                'message' => 'AI Nutrition Assistant is currently unavailable. Please enter estimates manually.',
                'data' => [
                    'enabled' => false,
                    'provider' => $provider,
                    'suggestion' => null,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'AI provider is enabled, but draft generation is not implemented in this safe branch.',
            'data' => [
                'enabled' => true,
                'provider' => $provider,
                'suggestion' => null,
                'requires_manual_review' => true,
            ],
        ]);
    }

}
