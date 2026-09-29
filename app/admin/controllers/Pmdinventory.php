<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\Inventory\PmdInventoryControlService;
use App\Services\Inventory\PmdInventoryReceiptAiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * PMD_INVENTORY_CONTROL_R1
 *
 * Owner/Manager stock, purchasing, recipe usage, physical count and waste
 * workspace. Variance is evidence for review, never an accusation of theft.
 */
class Pmdinventory extends AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();

        $this->bodyClass = trim(
            ($this->bodyClass ?? '').
            ' pmd-admin-theme-v1 pmd-settings-suite pmd-inventory-page pmd-inventory-r2-page'
        );

        // PMD_INVENTORY_DASHBOARD_SHELL_R2
        // Use the exact modern PMD first-paint shell instead of the legacy
        // warm admin chrome shown by the first Inventory R1 build.
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-platform-card-system-v1.css');

        $inventoryCssPath = base_path('app/admin/assets/css/pmd-inventory-v1.css');
        $inventoryJsPath = base_path('app/admin/assets/js/pmd-inventory-v1.js');

        $this->addCss(
            asset('app/admin/assets/css/pmd-inventory-v1.css')
            .'?v='.(string)(@filemtime($inventoryCssPath) ?: 'r2')
        );
        $this->addJs(
            asset('app/admin/assets/js/pmd-inventory-v1.js')
            .'?v='.(string)(@filemtime($inventoryJsPath) ?: 'r2')
        );
        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        $this->assertOwnerOrManager();

        Template::setTitle('Stock control');
        Template::setHeading('Stock control');

        $inventory = app(PmdInventoryControlService::class);
        $snapshot = null;
        $error = null;

        try {
            $snapshot = $inventory->snapshot($this->locationId());
        } catch (\Throwable $exception) {
            $error = $exception->getMessage();
        }

        $this->vars['pmdInventory'] = [
            'snapshot' => $snapshot,
            'error' => $error,
            'ready' => $inventory->ready(),
            'ai_receipts' => app(PmdInventoryReceiptAiService::class)->available(),
            'currency' => $this->currencyCode(),
            'units' => [
                'piece' => 'piece',
                'bottle' => 'bottle',
                'can' => 'can',
                'pack' => 'pack',
                'case' => 'case',
                'box' => 'box',
                'tray' => 'tray',
                'bag' => 'bag',
                'kg' => 'kg',
                'g' => 'g',
                'l' => 'l',
                'ml' => 'ml',
            ],
            'common_stock' => [
                ['name' => 'Still water', 'category' => 'Drinks', 'unit' => 'ml', 'purchase_unit' => 'bottle', 'purchase_to_base' => null],
                ['name' => 'Sparkling water', 'category' => 'Drinks', 'unit' => 'ml', 'purchase_unit' => 'bottle', 'purchase_to_base' => null],
                ['name' => 'Cola', 'category' => 'Soft drinks', 'unit' => 'ml', 'purchase_unit' => 'bottle', 'purchase_to_base' => null],
                ['name' => 'Beer', 'category' => 'Bar', 'unit' => 'ml', 'purchase_unit' => 'bottle', 'purchase_to_base' => null],
                ['name' => 'Red wine', 'category' => 'Wine', 'unit' => 'ml', 'purchase_unit' => 'bottle', 'purchase_to_base' => null],
                ['name' => 'White wine', 'category' => 'Wine', 'unit' => 'ml', 'purchase_unit' => 'bottle', 'purchase_to_base' => null],
                ['name' => 'Sparkling wine', 'category' => 'Wine', 'unit' => 'ml', 'purchase_unit' => 'bottle', 'purchase_to_base' => null],
                ['name' => 'Vodka', 'category' => 'Spirits', 'unit' => 'ml', 'purchase_unit' => 'bottle', 'purchase_to_base' => null],
                ['name' => 'Gin', 'category' => 'Spirits', 'unit' => 'ml', 'purchase_unit' => 'bottle', 'purchase_to_base' => null],
                ['name' => 'Rum', 'category' => 'Spirits', 'unit' => 'ml', 'purchase_unit' => 'bottle', 'purchase_to_base' => null],
                ['name' => 'Whisky', 'category' => 'Spirits', 'unit' => 'ml', 'purchase_unit' => 'bottle', 'purchase_to_base' => null],
                ['name' => 'Beef', 'category' => 'Meat', 'unit' => 'g', 'purchase_unit' => 'kg', 'purchase_to_base' => 1000],
                ['name' => 'Chicken', 'category' => 'Meat', 'unit' => 'g', 'purchase_unit' => 'kg', 'purchase_to_base' => 1000],
                ['name' => 'Salmon', 'category' => 'Fish', 'unit' => 'g', 'purchase_unit' => 'kg', 'purchase_to_base' => 1000],
                ['name' => 'Rice', 'category' => 'Dry goods', 'unit' => 'g', 'purchase_unit' => 'kg', 'purchase_to_base' => 1000],
                ['name' => 'Pasta', 'category' => 'Dry goods', 'unit' => 'g', 'purchase_unit' => 'kg', 'purchase_to_base' => 1000],
                ['name' => 'Olive oil', 'category' => 'Kitchen', 'unit' => 'ml', 'purchase_unit' => 'l', 'purchase_to_base' => 1000],
                ['name' => 'Milk', 'category' => 'Dairy', 'unit' => 'ml', 'purchase_unit' => 'l', 'purchase_to_base' => 1000],
                ['name' => 'Eggs', 'category' => 'Dairy', 'unit' => 'piece', 'purchase_unit' => 'tray', 'purchase_to_base' => null],
            ],
            'waste_reasons' => [
                'Spoilage',
                'Prep trim',
                'Overcooked',
                'Spill / breakage',
                'Returned by guest',
                'Staff meal',
                'Comp / complimentary',
                'Expired',
                'Other',
            ],
        ];

        return $this->makeView('pmdinventory/index');
    }

    public function onSnapshot(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            return [
                'snapshot' => app(PmdInventoryControlService::class)
                    ->snapshot($this->locationId()),
            ];
        });
    }

    public function onSaveItem(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryControlService::class);
            $id = $service->saveItem(
                $this->locationId(),
                $this->staffId(),
                request()->all()
            );

            return [
                'item_id' => $id,
                'snapshot' => $service->snapshot($this->locationId()),
            ];
        });
    }

    // Compatibility handler kept for any first R1 client already pointing here.
    public function onAddItem(): JsonResponse
    {
        return $this->onSaveItem();
    }

    public function onSavePurchase(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryControlService::class);
            $id = $service->savePurchase(
                $this->locationId(),
                $this->staffId(),
                request()->all()
            );

            return [
                'receipt_id' => $id,
                'snapshot' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onRecordWaste(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryControlService::class);
            $id = $service->recordWaste(
                $this->locationId(),
                $this->staffId(),
                request()->all()
            );

            return [
                'movement_id' => $id,
                'snapshot' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onSaveRecipe(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryControlService::class);
            $service->saveRecipe(
                $this->locationId(),
                $this->staffId(),
                request()->all()
            );

            return [
                'snapshot' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onCompleteCount(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryControlService::class);
            $id = $service->completeCount(
                $this->locationId(),
                $this->staffId(),
                request()->all()
            );

            return [
                'count_id' => $id,
                'snapshot' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onScanReceipt(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $inventory = app(PmdInventoryControlService::class);
            if (!$inventory->ready()) {
                throw new \RuntimeException(
                    'Inventory Control is not provisioned yet. Run the inventory migration first.'
                );
            }

            $file = request()->file('receipt');
            if (!$file || !$file->isValid()) {
                throw new \InvalidArgumentException('Choose a receipt photo or PDF.');
            }
            if ((int)$file->getSize() > 8 * 1024 * 1024) {
                throw new \InvalidArgumentException('Receipt file must be 8 MB or smaller.');
            }

            $mime = strtolower((string)($file->getMimeType() ?: ''));
            $allowed = [
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
                'application/pdf' => 'pdf',
            ];
            if (!isset($allowed[$mime])) {
                throw new \InvalidArgumentException('Receipt must be JPG, PNG, WEBP or PDF.');
            }

            $relativeDir = 'pmd-inventory-receipts/'.$this->locationId().'/'.now()->format('Y/m');
            $absoluteDir = storage_path('app/'.$relativeDir);
            if (!is_dir($absoluteDir) && !@mkdir($absoluteDir, 0770, true) && !is_dir($absoluteDir)) {
                throw new \RuntimeException('Receipt storage directory could not be created.');
            }

            $fileName = (string)Str::uuid().'.'.$allowed[$mime];
            $file->move($absoluteDir, $fileName);
            $relativePath = $relativeDir.'/'.$fileName;
            $absolutePath = $absoluteDir.'/'.$fileName;

            $aiPayload = null;
            $aiError = null;

            try {
                $aiPayload = app(PmdInventoryReceiptAiService::class)
                    ->extract($absolutePath, $mime);
            } catch (\Throwable $aiException) {
                $aiError = $aiException->getMessage();
                Log::warning('PMD inventory receipt AI extraction unavailable', [
                    'location_id' => $this->locationId(),
                    'message' => $aiError,
                ]);
            }

            $receiptId = $inventory->createReceiptReview(
                $this->locationId(),
                $this->staffId(),
                [
                    'path' => $relativePath,
                    'original_name' => mb_substr((string)$file->getClientOriginalName(), 0, 255),
                    'mime_type' => $mime,
                ],
                $aiPayload,
                $aiError
            );

            return [
                'receipt_id' => $receiptId,
                'ai_ok' => $aiPayload !== null,
                'ai_error' => $aiPayload === null ? $aiError : null,
                'extraction' => $aiPayload ?: [
                    'supplier_name' => null,
                    'purchase_date' => now()->toDateString(),
                    'currency' => $this->currencyCode(),
                    'total_amount' => null,
                    'lines' => [],
                ],
            ];
        });
    }

    private function action(callable $callback): JsonResponse
    {
        try {
            return response()->json(array_merge(
                ['ok' => true],
                (array)$callback()
            ));
        } catch (\Throwable $exception) {
            Log::warning('PMD inventory action failed', [
                'handler' => (string)request()->header('X-IGNITER-REQUEST-HANDLER', ''),
                'location_id' => $this->locationId(),
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'error' => $exception->getMessage(),
            ], 422);
        }
    }

    private function assertOwnerOrManager(): void
    {
        try {
            $role = app(PmdDefaultStaffRoleService::class)
                ->roleCodeForUser(AdminAuth::getUser());

            if (in_array($role, [
                PmdDefaultStaffRoleService::OWNER,
                PmdDefaultStaffRoleService::MANAGER,
                'owner',
                'manager',
            ], true)) {
                return;
            }
        } catch (\Throwable $exception) {
        }

        abort(403);
    }

    private function locationId(): int
    {
        try {
            $id = (int)AdminLocation::getId();
            if ($id > 0) {
                return $id;
            }
        } catch (\Throwable $exception) {
        }

        return max(1, (int)params('default_location_id', 1));
    }

    private function staffId(): ?int
    {
        try {
            $user = AdminAuth::getUser();
            $staff = $user ? $user->staff : null;
            $id = (int)($staff->staff_id ?? $staff->id ?? 0);
            return $id > 0 ? $id : null;
        } catch (\Throwable $exception) {
            return null;
        }
    }

    private function currencyCode(): string
    {
        foreach (['currency_code', 'default_currency', 'currency'] as $key) {
            try {
                $value = strtoupper(trim((string)setting($key, '')));
                if (preg_match('/^[A-Z]{3}$/', $value)) {
                    return $value;
                }
            } catch (\Throwable $exception) {
            }
        }

        return 'EUR';
    }
}
