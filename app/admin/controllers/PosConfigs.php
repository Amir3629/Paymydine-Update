<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Igniter\Flame\Exception\ApplicationException;

class PosConfigs extends \Admin\Classes\AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Pos_configs_model',
            'title' => 'lang:admin::lang.pos_configs.text_title',
            'emptyMessage' => 'lang:admin::lang.pos_configs.text_empty',
            'defaultSort' => ['config_id', 'DESC'],
            'configFile' => 'pos_configs_model',
        ],
    ];

    public $formConfig = [
        'name' => 'lang:admin::lang.pos_configs.text_form_name',
        'model' => 'Admin\Models\Pos_configs_model',
        'request' => 'Admin\Requests\PosConfigs',
        'create' => [
            'title' => 'lang:admin::lang.form.create_title',
            'redirect' => 'pos_configs/edit/{config_id}',
            'redirectClose' => 'pos_configs',
            'redirectNew' => 'pos_configs/create',
        ],
        'edit' => [
            'title' => 'lang:admin::lang.form.edit_title',
            'redirect' => 'pos_configs',
            'redirectClose' => 'pos_configs',
            'redirectNew' => 'pos_configs/create',
        ],
        'preview' => [
            'title' => 'lang:admin::lang.form.preview_title',
            'redirect' => 'pos_configs',
        ],
        'delete' => [
            'redirect' => 'pos_configs',
        ],
        'configFile' => 'pos_configs_model',
    ];

    protected $requiredPermissions = 'Admin.PosConfigs';

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('pos_configs', 'system');
    }

    public function listExtendQuery($query)
    {
        if (!AdminAuth::isSuperUser()) {
            $query->whereNotSuperUser();
        }
    }

    public function formExtendQuery($query)
    {
        if (!AdminAuth::isSuperUser()) {
            $query->whereNotSuperUser();
        }
    }

    public function onTestIntegration()
    {
        $segments = request()->segments();
        $configId = end($segments); // pega o último segmento da URL

        $config = \Admin\Models\Pos_configs_model::with('devices')->find($configId);
        if (!$config) {
            return response()->json(['error' => 'Configuração não encontrada'], 404);
        }

        try {
            $posCode = $config->devices->code;

            Log::info('Fazendo requisição para POS', [
                'url' => "https://03d5743d9b32.ngrok-free.app/api/pos/{$posCode}/products",
                'access_token' => substr($config->access_token, 0, 4) . '***' // só parte do token
            ]);

            $response = Http::withToken($config->access_token)
                            ->get("https://03d5743d9b32.ngrok-free.app/api/pos/{$posCode}/products");

            // Extrai o JSON da resposta
            $json = $response->json();

            // Retorna com status da própria requisição (200, 401 etc)
            return response()->json($json, $response->status());

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

}
