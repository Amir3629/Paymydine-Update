<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Admin\Models\Menus_model;

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
                'access_token' => substr($config->access_token, 0, 4) . '***'
            ]);

            $response = Http::withToken($config->access_token)
                            ->get("https://pay-my-dine-api-pos.onrender.com/api/pos/{$posCode}/products");

            $json = $response->json();
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

            $notificationUrl = "https://pay-my-dine-api-pos.onrender.com/api/pos/{$posCode}/order";
            $apiUrl = "https://pay-my-dine-api-pos.onrender.com/api/pos/{$posCode}/webhook";

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

    public function onSyncMenu()
    {
        $configId = post('config_id');
        $config = \Admin\Models\Pos_configs_model::with('devices')->find($configId);

        if (!$config) {
            Log::warning("Configuration not found for config_id: {$configId}");
            return [
                '#syncResultModal .modal-body' => '<div class="d-block alert-danger">Configuration not found.</div>',
            ];
        }

        try {
            Log::info("Starting bidirectional menu synchronization for config #{$configId}");
            $posCode = $config->devices->code;

            // ----------------------------
            // 1 Fetch products from POS
            // ----------------------------
            $response = Http::withToken($config->access_token)
                ->get("https://pay-my-dine-api-pos.onrender.com/api/pos/{$posCode}/products");

            if (!$response->successful()) {
                Log::error("Failed to fetch products from POS for config #{$configId}", [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [
                    '#syncResultModal .modal-body' => '<div class="d-block alert-danger">Failed to fetch products from POS.</div>',
                ];
            }

            $posProducts = $response->json();
            Log::info("Number of products fetched from POS: " . count($posProducts));

            $createdLocal = [];
            $updatedLocal = [];
            $skippedLocal = [];

            foreach ($posProducts as $item) {
                if (($item['type'] ?? '') !== 'ITEM') continue;

                $data = $item['item_data'] ?? [];
                $name = trim($data['name'] ?? '');
                $description = trim($data['description_plaintext'] ?? $data['description'] ?? '');
                $variation = $data['variations'][0]['item_variation_data'] ?? [];
                $price = isset($variation['price_money']['amount']) ? $variation['price_money']['amount'] / 100 : 0;

                $localMenu = \Admin\Models\Menus_model::whereRaw('LOWER(menu_name) = ?', [strtolower($name)])
                    ->orWhereRaw('LOWER(menu_description) = ?', [strtolower($description)])
                    ->first();

                if (!$localMenu) {
                    $localMenu = new \Admin\Models\Menus_model();
                    $localMenu->menu_name = $name;
                    $localMenu->menu_description = $description;
                    $localMenu->menu_price = $price;
                    $localMenu->minimum_qty = 1;
                    $localMenu->menu_status = 1;
                    $localMenu->menu_priority = 0;
                    $localMenu->order_restriction = null;
                    $localMenu->save();

                    Log::info("Created new local product", ['name' => $name]);
                    $createdLocal[] = $name;
                    continue;
                }

                $hasChanges = false;
                if ($localMenu->menu_price != $price) {
                    $localMenu->menu_price = $price;
                    $hasChanges = true;
                }
                if ($localMenu->menu_description != $description) {
                    $localMenu->menu_description = $description;
                    $hasChanges = true;
                }

                if ($hasChanges) {
                    $localMenu->save();
                    $updatedLocal[] = $name;
                } else {
                    $skippedLocal[] = $name;
                }
            }

            // ----------------------------
            // 2 Push local products to POS
            // ----------------------------
            $localMenus = Menus_model::all();
            $createdPOS = [];
            $skippedPOS = [];

            foreach ($localMenus as $menu) {
               $payload = [
                    'name'           => $menu->menu_name,
                    'description'    => $menu->menu_description,
                    'price'          => $menu->menu_price,
                    'variation_name' => $menu->menu_name,
                    'currency'       => 'USD',
                ];

                try {
                    $response = Http::withToken($config->access_token)
                        ->post("https://pay-my-dine-api-pos.onrender.com/api/pos/{$posCode}/products", $payload);

                        Log::info("Pushing product to POS", [
                            'link' => 'https://pay-my-dine-api-pos.onrender.com/api/pos/{$posCode}/products',
                            'name' => $menu->menu_name,
                            'payload' => $payload,
                            'status' => $response->status()
                        ]);

                    if ($response->successful()) {
                        $createdPOS[] = $menu->menu_name;
                        Log::info("Created product on POS", ['name' => $menu->menu_name]);
                    } else {
                        $skippedPOS[] = $menu->menu_name;
                        Log::warning("Failed to create product on POS", [
                            'name' => $menu->menu_name,
                            'status' => $response->status(),
                            'body' => $response->body()
                        ]);
                    }
                } catch (\Exception $e) {
                    $skippedPOS[] = $menu->menu_name;
                    Log::error("Exception creating product on POS", [
                        'name' => $menu->menu_name,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // ----------------------------
            // 3 Build modal message
            // ----------------------------
            $html = '<h5 class="mb-3">Bidirectional synchronization complete!</h5>';

            if ($createdLocal) {
                $html .= "<div class='d-block py-2 px-3'><strong>Added locally:</strong><ul class='mb-0 mt-1'>";
                foreach ($createdLocal as $item) $html .= "<li>{$item}</li>";
                $html .= "</ul></div>";
            }
            if ($updatedLocal) {
                $html .= "<div class='d-block alert-info py-2 px-3'><strong>Updated locally:</strong><ul class='mb-0 mt-1'>";
                foreach ($updatedLocal as $item) $html .= "<li>{$item}</li>";
                $html .= "</ul></div>";
            }
            if ($skippedLocal) {
                $html .= "<div class='d-block alert-secondary py-2 px-3'><strong>Unchanged locally:</strong><ul class='mb-0 mt-1'>";
                foreach ($skippedLocal as $item) $html .= "<li>{$item}</li>";
                $html .= "</ul></div>";
            }

            if ($createdPOS) {
                $html .= "<div class='d-block py-2 px-3 mt-2'><strong>Added to POS:</strong><ul class='mb-0 mt-1'>";
                foreach ($createdPOS as $item) $html .= "<li>{$item}</li>";
                $html .= "</ul></div>";
            }
            if ($skippedPOS) {
                $html .= "<div class='d-block alert-warning py-2 px-3 mt-2'><strong>Skipped / Failed POS:</strong><ul class='mb-0 mt-1'>";
                foreach ($skippedPOS as $item) $html .= "<li>{$item}</li>";
                $html .= "</ul></div>";
            }

            return [
                '#syncResultModal .modal-body' => $html
            ];

        } catch (\Exception $e) {
            Log::error('Error in bidirectional menu sync', [
                'config_id' => $configId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                '#syncResultModal .modal-body' => '<div class="d-block alert-danger"><strong>Error:</strong> ' . e($e->getMessage()) . '</div>'
            ];
        }
    }

}

