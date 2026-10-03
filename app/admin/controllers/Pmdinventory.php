<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\Inventory\PmdInventoryControlService;
use App\Services\Inventory\PmdInventoryProService;
use App\Services\Inventory\PmdInventoryReceiptAiService;
use App\Services\Inventory\PmdInventoryStockCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
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
            ' pmd-admin-theme-v1 pmd-settings-suite pmd-inventory-page pmd-inventory-r19-page'
        );

        // PMD_INVENTORY_DASHBOARD_SHELL_R2
        // Use the exact modern PMD first-paint shell instead of the legacy
        // warm admin chrome shown by the first Inventory R1 build.
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-platform-card-system-v1.css');
        // PMD_INVENTORY_SELF_CHECKOUT_BROWSER_R19 - reusable visual stock catalogue.
        // PMD_INVENTORY_CARD_GEOMETRY_R9 - centered cards + shared steppers.
        // PMD_INVENTORY_CARD_LANGUAGE_R8 - Inventory composers inherit the
        // validated platform modal/card shell, then apply their feature-owned
        // field layout in pmd-inventory-v1.css.

        $inventoryCssPath = base_path('app/admin/assets/css/pmd-inventory-v1.css');
        $inventoryJsPath = base_path('app/admin/assets/js/pmd-inventory-v1.js');

        $this->addCss(
            asset('app/admin/assets/css/pmd-inventory-v1.css')
            .'?v='.(string)(@filemtime($inventoryCssPath) ?: 'r19')
        );
        $workspaceCssPath = base_path('app/admin/assets/css/pmd-inventory-workspace-r19.css');
        $this->addCss(
            asset('app/admin/assets/css/pmd-inventory-workspace-r19.css')
            .'?v='.(string)(@filemtime($workspaceCssPath) ?: 'r19')
        );
        $this->addJs(
            asset('app/admin/assets/js/pmd-inventory-v1.js')
            .'?v='.(string)(@filemtime($inventoryJsPath) ?: 'r19')
        );
        $proCssPath = base_path('app/admin/assets/css/pmd-inventory-pro-r24.css');
        $this->addCss(
            asset('app/admin/assets/css/pmd-inventory-pro-r24.css')
            .'?v='.(string)(@filemtime($proCssPath) ?: 'r24')
        );

        $workspaceJsPath = base_path('app/admin/assets/js/pmd-inventory-workspace-r19.js');
        $this->addJs(
            asset('app/admin/assets/js/pmd-inventory-workspace-r19.js')
            .'?v='.(string)(@filemtime($workspaceJsPath) ?: 'r19')
        );
        $proJsPath = base_path('app/admin/assets/js/pmd-inventory-pro-r24.js');
        $this->addJs(
            asset('app/admin/assets/js/pmd-inventory-pro-r24.js')
            .'?v='.(string)(@filemtime($proJsPath) ?: 'r24')
        );
        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        // PMD_MENU_INVENTORY_UNIFIED_R20
        // Inventory no longer owns a separate Owner/Manager page. Keep this
        // controller as the write/AJAX authority, but send normal browser GETs
        // into the Inventory workspace embedded inside Menu. AJAX handlers must
        // remain on this controller, so their request is never redirected.
        $this->assertOwnerOrManager();

        if (request()->isMethod('get') && !request()->ajax()) {
            return redirect(admin_url('pmdmenus').'?workspace=inventory');
        }

        return null;
    }

    protected function catalogWithImages(): array
    {
        return PmdInventoryStockCatalog::allWithImages();
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

    // PMD_INVENTORY_PRO_R24
    // Additive professional operations. R22/R23 remain the stock-ledger authority.
    public function onProSnapshot(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            return [
                'pro' => app(PmdInventoryProService::class)
                    ->snapshot($this->locationId()),
            ];
        });
    }

    public function onProSaveSupplier(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $id = $service->saveSupplier($this->locationId(), $this->staffId(), request()->all());

            return [
                'supplier_id' => $id,
                'pro' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onProSaveSupplierItem(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $id = $service->saveSupplierItem(
                $this->locationId(),
                $this->staffId(),
                request()->all()
            );

            return [
                'supplier_item_id' => $id,
                'snapshot' => app(PmdInventoryControlService::class)
                    ->snapshot($this->locationId()),
                'pro' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onProArchiveSupplierItem(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $service->archiveSupplierItem(
                $this->locationId(),
                (int)request()->input('supplier_item_id', 0)
            );

            return [
                'snapshot' => app(PmdInventoryControlService::class)
                    ->snapshot($this->locationId()),
                'pro' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onProArchiveSupplier(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $service->archiveSupplier(
                $this->locationId(),
                (int)request()->input('supplier_id', 0)
            );

            return ['pro' => $service->snapshot($this->locationId())];
        });
    }

    public function onProSaveIdentifier(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $id = $service->saveIdentifier($this->locationId(), $this->staffId(), request()->all());

            return [
                'identifier_id' => $id,
                'pro' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onProArchiveIdentifier(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $service->archiveIdentifier(
                $this->locationId(),
                (int)request()->input('identifier_id', 0)
            );

            return ['pro' => $service->snapshot($this->locationId())];
        });
    }

    public function onProResolveCode(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            return [
                'identifier' => app(PmdInventoryProService::class)->resolveIdentifier(
                    $this->locationId(),
                    (string)request()->input('code', '')
                ),
            ];
        });
    }

    public function onProSaveStorageLocation(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $id = $service->saveStorageLocation($this->locationId(), $this->staffId(), request()->all());

            return [
                'storage_location_id' => $id,
                'pro' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onProSaveSettings(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $service->saveSettings($this->locationId(), request()->all());

            return ['pro' => $service->snapshot($this->locationId())];
        });
    }

    public function onProSavePreparation(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $id = $service->savePreparation(
                $this->locationId(),
                $this->staffId(),
                request()->all()
            );

            return [
                'preparation_id' => $id,
                'pro' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onProArchivePreparation(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $service->archivePreparation(
                $this->locationId(),
                (int)request()->input('preparation_id', 0)
            );

            return ['pro' => $service->snapshot($this->locationId())];
        });
    }

    public function onProProducePreparation(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $id = $service->producePreparation(
                $this->locationId(),
                $this->staffId(),
                request()->all()
            );

            return [
                'production_batch_id' => $id,
                'snapshot' => app(PmdInventoryControlService::class)
                    ->snapshot($this->locationId()),
                'pro' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onProSavePurchaseOrder(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $id = $service->savePurchaseOrder($this->locationId(), $this->staffId(), request()->all());

            return [
                'purchase_order_id' => $id,
                'pro' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onProSetPurchaseOrderStatus(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $service->setPurchaseOrderStatus(
                $this->locationId(),
                $this->staffId(),
                (int)request()->input('purchase_order_id', 0),
                (string)request()->input('status', 'draft')
            );

            return ['pro' => $service->snapshot($this->locationId())];
        });
    }

    public function onProReceivePurchaseOrder(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $result = $service->receivePurchaseOrder(
                $this->locationId(),
                $this->staffId(),
                request()->all()
            );

            return $result + [
                'snapshot' => app(PmdInventoryControlService::class)
                    ->snapshot($this->locationId()),
                'pro' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onProTransferStock(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $service->transferStock($this->locationId(), $this->staffId(), request()->all());

            return ['pro' => $service->snapshot($this->locationId())];
        });
    }

    public function onProReversePurchaseReceipt(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $service->reversePurchaseReceipt(
                $this->locationId(),
                $this->staffId(),
                (int)request()->input('receipt_id', 0),
                (string)request()->input('reason', '')
            );

            return [
                'snapshot' => app(PmdInventoryControlService::class)
                    ->snapshot($this->locationId()),
                'pro' => $service->snapshot($this->locationId()),
            ];
        });
    }

    public function onProRecordAdjustment(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryProService::class);
            $id = $service->recordAdjustment($this->locationId(), $this->staffId(), request()->all());

            return [
                'movement_id' => $id,
                'snapshot' => app(PmdInventoryControlService::class)
                    ->snapshot($this->locationId()),
                'pro' => $service->snapshot($this->locationId()),
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

    public function onArchiveItem(): JsonResponse
    {
        $this->assertOwnerOrManager();

        return $this->action(function () {
            $service = app(PmdInventoryControlService::class);
            $service->archiveItem(
                $this->locationId(),
                $this->staffId(),
                (int)request()->input('item_id', 0)
            );

            return [
                'snapshot' => $service->snapshot($this->locationId()),
            ];
        });
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

            // PMD_INVENTORY_DUPLICATE_DOCUMENT_R24
            // A supplier invoice/receipt must never add stock twice.
            $documentHash = '';
            try {
                $documentHash = (string)hash_file('sha256', (string)$file->getRealPath());
            } catch (\Throwable $hashError) {
                $documentHash = '';
            }

            if (
                $documentHash !== ''
                && Schema::hasColumn('pmd_inventory_receipts', 'document_hash')
                && \Illuminate\Support\Facades\DB::table('pmd_inventory_receipts')
                    ->where('location_id', $this->locationId())
                    ->where('document_hash', $documentHash)
                    ->exists()
            ) {
                throw new \InvalidArgumentException('This supplier document was already scanned. Stock was not changed.');
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

            if (
                is_array($aiPayload)
                && !empty($aiPayload['invoice_number'])
                && !empty($aiPayload['supplier_name'])
                && Schema::hasColumn('pmd_inventory_receipts', 'invoice_number')
            ) {
                $duplicateInvoice = \Illuminate\Support\Facades\DB::table('pmd_inventory_receipts')
                    ->where('location_id', $this->locationId())
                    ->whereRaw('LOWER(COALESCE(supplier_name, \'\')) = ?', [
                        mb_strtolower(trim((string)$aiPayload['supplier_name']))
                    ])
                    ->where('invoice_number', trim((string)$aiPayload['invoice_number']))
                    ->exists();

                if ($duplicateInvoice) {
                    @unlink($absolutePath);
                    throw new \InvalidArgumentException(
                        'This supplier invoice number was already scanned. Stock was not changed.'
                    );
                }
            }

            $receiptId = $inventory->createReceiptReview(
                $this->locationId(),
                $this->staffId(),
                [
                    'path' => $relativePath,
                    'original_name' => mb_substr((string)$file->getClientOriginalName(), 0, 255),
                    'mime_type' => $mime,
                    'document_hash' => $documentHash,
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
