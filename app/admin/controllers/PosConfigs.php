<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

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

        // Set the admin menu context for this controller
        AdminMenu::setContext('pos_configs', 'system');
    }

    public function listExtendQuery($query)
    {
        // If not super user, exclude super user records
        if (!AdminAuth::isSuperUser()) {
            $query->whereNotSuperUser();
        }
    }

    public function formExtendQuery($query)
    {
        // If not super user, exclude super user records
        if (!AdminAuth::isSuperUser()) {
            $query->whereNotSuperUser();
        }
    }

    public function onTestIntegration()
    {
        // Get the last segment from the URL (the record ID)
        $segments = request()->segments();
        $configId = end($segments);

        $config = \Admin\Models\Pos_configs_model::with('devices')->find($configId);
        if (!$config) {
            return response()->json(['error' => 'Configuration not found'], 404);
        }

        try {
            $posCode = $config->devices->code;

            Log::info('Sending request to POS', [
                'url' => "https://pay-my-dine-api-pos.onrender.com/api/pos/{$posCode}/products",
                'access_token' => substr($config->access_token, 0, 4) . '***' // only partial token
            ]);

            $response = Http::withToken($config->access_token)
                            ->get("https://pay-my-dine-api-pos.onrender.com/api/pos/{$posCode}/products");

            // Extract JSON response
            $json = $response->json();

            // Return JSON with the same HTTP status as the request
            return response()->json($json, $response->status());

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

   public function onRegisterWebhook()
    {
        $configId = post('config_id');
        $config = \Admin\Models\Pos_configs_model::with('devices')->find($configId);

        if (!$config) {
            return ['error' => 'Configuration not found'];
        }

        try {
            $posCode = $config->devices->code;
            $accessToken = $config->access_token;
            $notificationUrl = "https://pay-my-dine-api-pos.onrender.com/api/pos/{$posCode}/receive-order";
            $apiUrl = "https://pay-my-dine-api-pos.onrender.com/api/pos/{$posCode}/webhook";

            // Send request to register webhook
            $response = \Illuminate\Support\Facades\Http::withToken($accessToken)
                ->post($apiUrl, ['notification_url' => $notificationUrl]);

            $json = $response->json();

            if (!isset($json['error']) && ($json['status'] ?? 200) === 200) {
                $config->exists_webhook = 1;
                $config->save();

                return [
                    'success' => true,
                    'exists_webhook' => 1,
                    'response' => $json,
                ];
            }

            return [
                'success' => false,
                'exists_webhook' => 0,
                'response' => $json,
            ];

        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }
}
