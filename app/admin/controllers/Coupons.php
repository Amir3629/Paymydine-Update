<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Coupons_model;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class Coupons extends AdminController
{
    public $implement = [
        'Admin\\Actions\\ListController',
        'Admin\\Actions\\FormController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\\Models\\Coupons_model',
            'title' => 'Coupons & Gift Cards',
            'emptyMessage' => 'No coupons or gift cards found',
            'defaultSort' => ['coupon_id', 'DESC'],
            'configFile' => 'coupons_model',
        ],
    ];

    public $formConfig = [
        'name' => 'Coupon / Gift Card',
        'model' => 'Admin\\Models\\Coupons_model',
        'create' => [
            'title' => 'Create Coupon / Gift Card',
            'redirect' => 'coupons/edit/{coupon_id}',
            'redirectClose' => 'coupons',
            'redirectNew' => 'coupons/create',
        ],
        'edit' => [
            'title' => 'Edit Coupon / Gift Card',
            'redirect' => 'coupons/edit/{coupon_id}',
            'redirectClose' => 'coupons',
            'redirectNew' => 'coupons/create',
        ],
        'preview' => [
            'title' => 'Preview Coupon / Gift Card',
            'redirect' => 'coupons',
        ],
        'delete' => [
            'redirect' => 'coupons',
        ],
        'configFile' => 'coupons_model',
    ];

    protected $requiredPermissions = 'Admin';

    public function __construct()
    {
        parent::__construct();

        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-owner-settings-page pmd-coupon-manager-page pmd-coupon-manager-v1 pmd-coupon-manager-v11');
        $this->addCss('css/pmd-owner-settings-v1.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-coupon-manager-v11.css');
        $this->addJs('js/pmd-coupon-manager-v11.js');

        AdminMenu::setContext('coupons', 'marketing');
    }

    /**
     * PMD Coupon Manager V1 browser authority.
     * The legacy list UI is retired; the canonical /admin/coupons URL now
     * server-renders one clean workspace while this controller stays the
     * coupon write authority.
     */
    public function index()
    {
        Template::setTitle('Coupons');
        Template::setHeading('Coupons');

        $this->preparePmdCouponWorkspace();

        return $this->makeView('pmdcoupons/index');
    }

    /**
     * Legacy create/edit/preview GET routes never render native detail pages.
     * POST/AJAX compatibility remains available to the FormController.
     */
    public function create()
    {
        if (request()->isMethod('get') && !request()->ajax()) {
            return redirect(admin_url('coupons').'?pmd_mode=create');
        }

        $this->asExtension('FormController')->create();
        return $this->makeView('coupons/create');
    }

    public function edit($context = null, $recordId = null)
    {
        if ($recordId === null && is_numeric($context)) {
            $recordId = (int)$context;
            $context = null;
        }

        if (request()->isMethod('get') && !request()->ajax()) {
            $id = $recordId ?: (int)basename(request()->path());
            return redirect(admin_url('coupons').'?pmd_mode=edit&pmd_id='.(int)$id);
        }

        $this->asExtension('FormController')->edit($context, $recordId);
        return $this->makeView('coupons/edit');
    }

    public function preview($context = null, $recordId = null)
    {
        if ($recordId === null && is_numeric($context)) {
            $recordId = (int)$context;
        }

        if (request()->isMethod('get') && !request()->ajax()) {
            $id = $recordId ?: (int)basename(request()->path());
            return redirect(admin_url('coupons').'?pmd_mode=edit&pmd_id='.(int)$id);
        }

        $this->asExtension('FormController')->preview($context, $recordId);
        return $this->makeView('coupons/preview');
    }

    public function onPmdCouponSaveV1(): JsonResponse
    {
        $this->assertPmdCouponAccess();

        $input = request()->all();
        $validator = Validator::make($input, [
            'coupon_id' => ['nullable', 'integer', 'min:1'],
            'card_type' => ['required', 'in:coupon,gift_card,voucher,credit,comp'],
            'name' => ['required', 'string', 'min:2', 'max:128'],
            'code' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9][A-Za-z0-9_-]*$/'],
            'description' => ['nullable', 'string', 'max:1028'],
            'type' => ['nullable', 'in:F,P'],
            'discount' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'initial_balance' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'purchase_price' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'min_total' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'redemptions' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'customer_redemptions' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'status' => ['nullable', 'boolean'],
            'is_purchasable' => ['nullable', 'boolean'],
            'is_reloadable' => ['nullable', 'boolean'],
            'is_transferable' => ['nullable', 'boolean'],
            'expiry_date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'ok' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        $clean = $validator->validated();
        $couponId = !empty($clean['coupon_id']) ? (int)$clean['coupon_id'] : null;
        $cardType = (string)$clean['card_type'];
        $isDiscountCard = in_array($cardType, ['coupon', 'voucher'], true);
        $isBalanceCard = in_array($cardType, ['gift_card', 'credit', 'comp'], true);
        $table = (new Coupons_model)->getTable();

        if (!Schema::hasColumn($table, 'card_type') && $cardType !== 'coupon') {
            return response()->json([
                'ok' => false,
                'message' => 'This tenant schema does not support gift cards or credits yet.',
            ], 422);
        }

        $discountType = (string)($clean['type'] ?? 'F');
        $discount = (float)($clean['discount'] ?? 0);
        if ($isDiscountCard && $discountType === 'P' && $discount > 100) {
            return response()->json(['ok' => false, 'message' => 'Percentage discount cannot be greater than 100%.'], 422);
        }
        if ($isDiscountCard && $discount <= 0) {
            return response()->json(['ok' => false, 'message' => 'Enter a discount greater than zero.'], 422);
        }

        $code = strtoupper(trim((string)($clean['code'] ?? '')));
        if ($code === '') {
            $code = $this->generatePmdCouponCode($cardType);
        }

        $duplicate = Coupons_model::query()->whereRaw('UPPER(code) = ?', [$code]);
        if ($couponId) $duplicate->where('coupon_id', '<>', $couponId);
        if ($duplicate->exists()) {
            return response()->json(['ok' => false, 'message' => 'This code is already in use.'], 422);
        }

        try {
            $coupon = DB::transaction(function () use (
                $couponId,
                $clean,
                $cardType,
                $isDiscountCard,
                $isBalanceCard,
                $discountType,
                $discount,
                $code,
                $table
            ) {
                $coupon = $couponId ? Coupons_model::query()->find($couponId) : new Coupons_model;
                if ($couponId && !$coupon) {
                    throw new \RuntimeException('Coupon not found.');
                }

                $isNew = !$coupon->exists;
                $coupon->name = trim((string)$clean['name']);
                $coupon->code = $code;
                $coupon->description = trim((string)($clean['description'] ?? ''));

                if (Schema::hasColumn($table, 'card_type')) {
                    $coupon->card_type = $cardType;
                }

                if ($isDiscountCard) {
                    $coupon->type = $discountType;
                    $coupon->discount = $discount;
                }

                if ($isBalanceCard && Schema::hasColumn($table, 'initial_balance')) {
                    $startingBalance = (float)($clean['initial_balance'] ?? 0);
                    if ($isNew) {
                        $coupon->initial_balance = $startingBalance;
                        if (Schema::hasColumn($table, 'current_balance')) {
                            $coupon->current_balance = $startingBalance;
                        }
                    }
                }

                if (Schema::hasColumn($table, 'min_total')) {
                    $coupon->min_total = (float)($clean['min_total'] ?? 0);
                }
                if (Schema::hasColumn($table, 'redemptions')) {
                    $coupon->redemptions = (int)($clean['redemptions'] ?? 0);
                }
                if (Schema::hasColumn($table, 'customer_redemptions')) {
                    $coupon->customer_redemptions = (int)($clean['customer_redemptions'] ?? 0);
                }
                if (Schema::hasColumn($table, 'status')) {
                    $coupon->status = !empty($clean['status']) ? 1 : 0;
                }
                if (Schema::hasColumn($table, 'expiry_date')) {
                    $expiry = trim((string)($clean['expiry_date'] ?? ''));
                    $coupon->expiry_date = $expiry !== '' ? Carbon::createFromFormat('Y-m-d', $expiry)->startOfDay() : null;
                }

                if ($cardType === 'gift_card') {
                    if (Schema::hasColumn($table, 'is_purchasable')) {
                        $coupon->is_purchasable = !empty($clean['is_purchasable']) ? 1 : 0;
                    }
                    if (Schema::hasColumn($table, 'purchase_price')) {
                        $coupon->purchase_price = (float)($clean['purchase_price'] ?? 0);
                    }
                    if (Schema::hasColumn($table, 'is_reloadable')) {
                        $coupon->is_reloadable = !empty($clean['is_reloadable']) ? 1 : 0;
                    }
                    if (Schema::hasColumn($table, 'is_transferable')) {
                        $coupon->is_transferable = !empty($clean['is_transferable']) ? 1 : 0;
                    }
                }

                $coupon->save();
                return $coupon;
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage() === 'Coupon not found.' ? $e->getMessage() : 'Coupon could not be saved.',
            ], $e->getMessage() === 'Coupon not found.' ? 404 : 500);
        }

        return response()->json([
            'ok' => true,
            'coupon_id' => (int)$coupon->coupon_id,
            'code' => (string)$coupon->code,
            'message' => 'Saved.',
        ]);
    }

    public function onPmdCouponToggleStatusV1(): JsonResponse
    {
        $this->assertPmdCouponAccess();

        $couponId = (int)post('coupon_id');
        $coupon = Coupons_model::query()->find($couponId);
        if (!$coupon) {
            return response()->json(['ok' => false, 'message' => 'Coupon not found.'], 404);
        }

        if (!Schema::hasColumn($coupon->getTable(), 'status')) {
            return response()->json(['ok' => false, 'message' => 'Status is not supported by this schema.'], 422);
        }

        $coupon->status = $coupon->status ? 0 : 1;
        $coupon->save();

        return response()->json([
            'ok' => true,
            'coupon_id' => $couponId,
            'status' => (int)$coupon->status,
        ]);
    }

    public function onPmdCouponDeleteV1(): JsonResponse
    {
        $this->assertPmdCouponAccess();

        $couponId = (int)post('coupon_id');
        if ($couponId < 1) {
            return response()->json(['ok' => false, 'message' => 'Invalid coupon.'], 422);
        }

        $coupon = Coupons_model::query()->find($couponId);
        if (!$coupon) {
            return response()->json(['ok' => false, 'message' => 'Coupon not found.'], 404);
        }

        try {
            DB::transaction(function () use ($coupon) {
                $coupon->delete();
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['ok' => false, 'message' => 'Coupon could not be deleted.'], 500);
        }

        return response()->json(['ok' => true, 'coupon_id' => $couponId, 'message' => 'Deleted.']);
    }

    protected function preparePmdCouponWorkspace(): void
    {
        $query = Coupons_model::query()->orderBy('coupon_id', 'desc');
        if (Schema::hasTable('coupons_history')) {
            $query->withCount([
                'history as redemption_count' => static function ($history) {
                    $history->where('status', 1);
                },
            ]);
        }

        $coupons = $query->get();
        $cards = [];
        $catalog = [];
        $activeCount = 0;
        $redemptionCount = 0;
        $storedBalance = 0.0;
        $now = Carbon::now();

        foreach ($coupons as $coupon) {
            $cardType = trim((string)($coupon->card_type ?? 'coupon')) ?: 'coupon';
            $expiry = $coupon->expiry_date ? Carbon::parse($coupon->expiry_date) : null;
            $isExpired = $expiry ? $expiry->copy()->endOfDay()->lt($now) : false;
            $isActive = !empty($coupon->status) && !$isExpired;
            $redemptions = (int)($coupon->redemption_count ?? 0);
            $currentBalance = (float)($coupon->current_balance ?? 0);

            if ($isActive) $activeCount++;
            $redemptionCount += $redemptions;
            if (in_array($cardType, ['gift_card', 'credit', 'comp'], true)) {
                $storedBalance += max(0, $currentBalance);
            }

            $card = [
                'id' => (int)$coupon->coupon_id,
                'name' => trim((string)$coupon->name),
                'code' => trim((string)$coupon->code),
                'description' => trim((string)($coupon->description ?? '')),
                'card_type' => $cardType,
                'discount_type' => (string)($coupon->type ?? 'F'),
                'discount' => (float)($coupon->discount ?? 0),
                'initial_balance' => (float)($coupon->initial_balance ?? 0),
                'current_balance' => $currentBalance,
                'purchase_price' => (float)($coupon->purchase_price ?? 0),
                'min_total' => (float)($coupon->min_total ?? 0),
                'redemptions' => (int)($coupon->redemptions ?? 0),
                'customer_redemptions' => (int)($coupon->customer_redemptions ?? 0),
                'redemption_count' => $redemptions,
                'status' => !empty($coupon->status),
                'is_expired' => $isExpired,
                'is_active' => $isActive,
                'is_purchasable' => !empty($coupon->is_purchasable),
                'is_reloadable' => !empty($coupon->is_reloadable),
                'is_transferable' => !empty($coupon->is_transferable),
                'expiry_date' => $expiry ? $expiry->format('Y-m-d') : '',
                'created_at' => $coupon->created_at ? Carbon::parse($coupon->created_at)->format('Y-m-d') : '',
            ];

            $cards[] = $card;
            $catalog[(string)$card['id']] = $card;
        }

        $this->vars['pmdCouponCards'] = $cards;
        $this->vars['pmdCouponCatalog'] = $catalog;
        $this->vars['pmdCouponStats'] = [
            'total' => count($cards),
            'active' => $activeCount,
            'redemptions' => $redemptionCount,
            'stored_balance' => $storedBalance,
        ];
    }

    protected function assertPmdCouponAccess(): void
    {
        $user = AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin')) abort(403);
    }

    protected function generatePmdCouponCode(string $cardType): string
    {
        $prefixes = [
            'coupon' => 'CP',
            'gift_card' => 'GC',
            'voucher' => 'V',
            'credit' => 'CR',
            'comp' => 'COMP',
        ];
        $prefix = $prefixes[$cardType] ?? 'CP';

        do {
            $code = $prefix.'-'.strtoupper(bin2hex(random_bytes(4)));
        } while (Coupons_model::query()->whereRaw('UPPER(code) = ?', [$code])->exists());

        return $code;
    }
}
