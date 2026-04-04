<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Admin\Models\Menus_model;
use Admin\Helpers\PosMenuNormalizer;

class PosConfigs extends \Admin\Classes\AdminController
{
    private $urlPosAPI = 'https://pay-my-dine-api-pos.onrender.com';
    // private $urlPosAPI = 'https://6fbebe8a021d.ngrok-free.app';

    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
    ];

    public $listConfig = [
        'list' => [
            'model'        => 'Admin\Models\Pos_configs_model',
            'title'        => 'lang:admin::lang.pos_configs.text_title',
            'emptyMessage' => 'lang:admin::lang.pos_configs.text_empty',
            'defaultSort'  => ['config_id', 'DESC'],
            'configFile'   => 'pos_configs_model',
        ],
    ];

    public $formConfig = [
        'name'    => 'lang:admin::lang.pos_configs.text_form_name',
        'model'   => 'Admin\Models\Pos_configs_model',
        'request' => 'Admin\Requests\PosConfigs',

        'create'  => [
            'title'         => 'lang:admin::lang.form.create_title',
            'redirect'      => 'pos_configs/edit/{config_id}',
            'redirectClose' => 'pos_configs',
            'redirectNew'   => 'pos_configs/create',
        ],

        'edit'    => [
            'title'         => 'lang:admin::lang.form.edit_title',
            'redirect'      => 'pos_configs',
            'redirectClose' => 'pos_configs',
            'redirectNew'   => 'pos_configs/create',
        ],

        'preview' => [
            'title'    => 'lang:admin::lang.form.preview_title',
            'redirect' => 'pos_configs',
        ],

        'delete'  => [
            'redirect' => 'pos_configs',
        ],

        'configFile' => 'pos_configs_model',
    ];

    protected $requiredPermissions = 'Admin.PosConfigs';

    public function __construct()
    {
        parent::__construct();

        // Set admin menu context for this controller
        AdminMenu::setContext('pos_configs', 'system');
    }

    public function listExtendQuery($query)
    {
        // If the current user is not a super user, exclude super user records
        if (!AdminAuth::isSuperUser()) {
            $query->whereNotSuperUser();
        }
    }

    public function formExtendQuery($query)
    {
        // If the current user is not a super user, exclude super user records
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

            $baseUrl = $this->urlPosAPI . '/api/pos';
            $url     = "{$baseUrl}/{$posCode}/products";

            // If provider is Clover and merchant ID exists, add merchantId query param
            if (strtolower($posCode) === 'clover' && !empty($config->id_application)) {
                $url .= '?merchantId=' . urlencode($config->id_application);
            }

            // If provider is Lightspeed, add domainPrefix query param when available
            if (strtolower($posCode) === 'lightspeed') {
                $domainPrefix = $config->id_application ?? null;

                if (!empty($domainPrefix)) {
                    $url .= '?domainPrefix=' . urlencode($domainPrefix);
                }
            }

            Log::info('Sending request to POS', [
                'url'          => $url,
                'posCode'      => $posCode,
                'merchantId'   => $config->id_application ?? null,
                'domainPrefix' => $config->id_application ?? null,
                'access_token' => substr($config->access_token, 0, 4) . '***',
            ]);

            $response = Http::withToken($config->access_token)->get($url);

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            Log::error('Error while testing POS integration', [
                'config_id' => $configId,
                'message'   => $e->getMessage(),
            ]);

            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function onRegisterWebhook()
    {
        $configId = post('config_id');
        $config   = \Admin\Models\Pos_configs_model::with('devices')->find($configId);

        Log::info("Registering webhook for config ID: {$configId}", [$config]);

        if (!$config) {
            return ['error' => 'Configuration not found'];
        }

        try {
            $posCode     = $config->devices->code;
            $accessToken = $config->access_token;

            $tenantHost = request()->getHost();

            // Build query parameters to forward tenant info and provider-specific identifiers
            $query = ['tenant' => $tenantHost];
            $lowerCode = strtolower($posCode);

            if ($lowerCode === 'clover' && !empty($config->id_application)) {
                $query['merchantId'] = $config->id_application;
            }

            if ($lowerCode === 'lightspeed' && !empty($config->id_application)) {
                $query['domainPrefix'] = $config->id_application;
            }

            $queryString     = http_build_query($query);
            $baseUrl         = $this->urlPosAPI . "/api/pos/{$posCode}/webhook?{$queryString}";
            $notificationUrl = $this->urlPosAPI . "/api/pos/{$posCode}/order?{$queryString}";

            Log::info('Registering webhook at POS', [
                'config_id'        => $configId,
                'pos_code'         => $posCode,
                'base_url'         => $baseUrl,
                'notification_url' => $notificationUrl,
                'query'            => $query,
            ]);

            $response = Http::withToken($accessToken)
                ->post($baseUrl, ['notification_url' => $notificationUrl]);

            $json = $response->json();

            // Consider success when API returns no 'error' and status is 200
            if (!isset($json['error']) && ($json['status'] ?? 200) === 200) {
                $config->exists_webhook = 1;
                $config->save();

                return [
                    'success'        => true,
                    'exists_webhook' => 1,
                    'response'       => $json,
                ];
            }

            return [
                'success'        => false,
                'exists_webhook' => 0,
                'response'       => $json,
            ];
        } catch (\Exception $e) {
            Log::error('Exception while registering webhook', [
                'config_id' => $configId,
                'message'   => $e->getMessage(),
            ]);

            return ['error' => $e->getMessage()];
        }
    }

    public function onSyncMenu()
    {
        $configId = post('config_id');
        $config   = \Admin\Models\Pos_configs_model::with('devices')->find($configId);

        if (!$config) {
            Log::warning("Configuration not found for config_id: {$configId}");

            return [
                '#syncResultModal .modal-body' => '<div class="d-block alert-danger">Configuration not found.</div>',
            ];
        }

        try {
            Log::info("Starting bidirectional menu synchronization for config #{$configId}");

            $posCode     = strtolower($config->devices->code);
            $baseUrl     = $this->urlPosAPI . '/api/pos';
            $accessToken = $config->access_token;
            $merchantId  = $config->id_application; // Clover (merchantId) / Lightspeed (domainPrefix)

            // ----------------------------
            // 1  Fetch products from POS
            // ----------------------------
            $getUrl = "{$baseUrl}/{$posCode}/products";

            // Se Clover, append merchantId
            if ($posCode === 'clover' && !empty($merchantId)) {
                $getUrl .= '?merchantId=' . urlencode($merchantId);
            }

            // Se Lightspeed, append domainPrefix
            if ($posCode === 'lightspeed' && !empty($merchantId)) {
                $getUrl .= '?domainPrefix=' . urlencode($merchantId);
            }

            Log::info('Fetching products from POS', [
                'config_id' => $configId,
                'pos'       => $posCode,
                'url'       => $getUrl,
            ]);

            $response = Http::withToken($accessToken)->get($getUrl);

            if (!$response->successful()) {
                Log::error("Failed to fetch products from POS for config #{$configId}", [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);

                return [
                    '#syncResultModal .modal-body' => '<div class="d-block alert-danger">Failed to fetch products from POS.</div>',
                ];
            }

            $rawProducts = $response->json() ?? [];

            // Normalize products according to POS provider
            if ($posCode === 'clover') {
                $posProducts = PosMenuNormalizer::fromClover($rawProducts);
            } elseif ($posCode === 'lightspeed') {
                $posProducts = PosMenuNormalizer::fromLightspeed($rawProducts);
            } else {
                // keep Square normalization as the default behavior
                $posProducts = PosMenuNormalizer::fromSquare($rawProducts);
            }

            Log::info('Number of products fetched from POS (normalized): ' . count($posProducts));

            $createdLocal = [];
            $updatedLocal = [];
            $skippedLocal = [];

            // ----------------------------
            // 1.1  POS -> Local
            // ----------------------------
            foreach ($posProducts as $item) {
                $name        = trim($item['name'] ?? '');
                $description = trim($item['description'] ?? '');
                $price       = (float) ($item['price'] ?? 0);

                if ($name === '') {
                    continue;
                }

                $localMenu = Menus_model::whereRaw('LOWER(menu_name) = ?', [strtolower($name)])
                    ->first();

                if (!$localMenu) {
                    // Create new local menu item
                    $localMenu                    = new Menus_model();
                    $localMenu->menu_name         = $name;
                    $localMenu->menu_description  = $description;
                    $localMenu->menu_price        = $price;
                    $localMenu->minimum_qty       = 1;
                    $localMenu->menu_status       = 1;
                    $localMenu->menu_priority     = 0;
                    $localMenu->order_restriction = null;
                    $localMenu->save();

                    Log::info('Created new local product', ['name' => $name]);
                    $createdLocal[] = $name;
                    continue;
                }

                $hasChanges = false;

                if ((float) $localMenu->menu_price !== $price) {
                    $localMenu->menu_price = $price;
                    $hasChanges = true;
                }

                if ($localMenu->menu_description !== $description) {
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
            // 2  Push local products to POS
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

                $postUrl = "{$baseUrl}/{$posCode}/products";

                if ($posCode === 'clover' && !empty($merchantId)) {
                    $postUrl .= '?merchantId=' . urlencode($merchantId);
                }

                if ($posCode === 'lightspeed' && !empty($merchantId)) {
                    $postUrl .= '?domainPrefix=' . urlencode($merchantId);
                }

                try {
                    $response = Http::withToken($accessToken)->post($postUrl, $payload);

                    Log::info('Pushing product to POS', [
                        'link'    => $postUrl,
                        'pos'     => $posCode,
                        'name'    => $menu->menu_name,
                        'payload' => $payload,
                        'status'  => $response->status(),
                    ]);

                    if ($response->successful()) {
                        $createdPOS[] = $menu->menu_name;
                        Log::info('Created product on POS', ['name' => $menu->menu_name]);
                    } else {
                        $skippedPOS[] = $menu->menu_name;

                        Log::warning('Failed to create product on POS', [
                            'name'   => $menu->menu_name,
                            'status' => $response->status(),
                            'body'   => $response->body(),
                        ]);
                    }
                } catch (\Exception $e) {
                    $skippedPOS[] = $menu->menu_name;

                    Log::error('Exception creating product on POS', [
                        'name'  => $menu->menu_name,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // ----------------------------
            // 3  Build modal HTML message
            // ----------------------------
            $html = '<h5 class="mb-3">Bidirectional synchronization complete!</h5>';

            if ($createdLocal) {
                $html .= "<div class='d-block py-2 px-3'><strong>Added locally:</strong><ul class='mb-0 mt-1'>";
                foreach ($createdLocal as $item) {
                    $html .= "<li>{$item}</li>";
                }
                $html .= "</ul></div>";
            }

            if ($updatedLocal) {
                $html .= "<div class='d-block alert-info py-2 px-3'><strong>Updated locally:</strong><ul class='mb-0 mt-1'>";
                foreach ($updatedLocal as $item) {
                    $html .= "<li>{$item}</li>";
                }
                $html .= "</ul></div>";
            }

            if ($skippedLocal) {
                $html .= "<div class='d-block alert-secondary py-2 px-3'><strong>Unchanged locally:</strong><ul class='mb-0 mt-1'>";
                foreach ($skippedLocal as $item) {
                    $html .= "<li>{$item}</li>";
                }
                $html .= "</ul></div>";
            }

            if ($createdPOS) {
                $html .= "<div class='d-block py-2 px-3 mt-2'><strong>Added to POS:</strong><ul class='mb-0 mt-1'>";
                foreach ($createdPOS as $item) {
                    $html .= "<li>{$item}</li>";
                }
                $html .= "</ul></div>";
            }

            if ($skippedPOS) {
                $html .= "<div class='d-block alert-warning py-2 px-3 mt-2'><strong>Skipped / Failed POS:</strong><ul class='mb-0 mt-1'>";
                foreach ($skippedPOS as $item) {
                    $html .= "<li>{$item}</li>";
                }
                $html .= "</ul></div>";
            }

            return [
                '#syncResultModal .modal-body' => $html,
            ];
        } catch (\Exception $e) {
            Log::error('Error in bidirectional menu synchronization', [
                'config_id' => $configId,
                'error'     => $e->getMessage(),
                'trace'     => $e->getTraceAsString(),
            ]);

            return [
                '#syncResultModal .modal-body' => '<div class="d-block alert-danger"><strong>Error:</strong> ' . e($e->getMessage()) . '</div>',
            ];
        }
    }

}
