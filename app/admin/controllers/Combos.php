<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\AdminAuth;
use Admin\Models\Menu_combos_model;
use Admin\Models\Menus_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;

class Combos extends AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
        'Admin\Actions\LocationAwareController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Menu_combos_model',
            'title' => 'Combo Meals',
            'emptyMessage' => 'No combos found',
            'defaultSort' => ['combo_id', 'DESC'],
            'configFile' => 'menu_combos_model',
        ],
    ];

    public $formConfig = [
        'name' => 'Combo Meal',
        'model' => 'Admin\Models\Menu_combos_model',
        'request' => 'Admin\Requests\Combo',
        'create' => [
            'title' => 'Create Combo',
            'redirect' => 'combos/edit/{combo_id}',
            'redirectClose' => 'combos',
            'redirectNew' => 'combos/create',
        ],
        'edit' => [
            'title' => 'Edit Combo',
            'redirect' => 'combos/edit/{combo_id}',
            'redirectClose' => 'combos',
            'redirectNew' => 'combos/create',
        ],
        'preview' => [
            'title' => 'View Combo',
            'redirect' => 'combos',
        ],
        'delete' => [
            'redirect' => 'combos',
        ],
        'configFile' => 'menu_combos_model',
    ];

    protected $requiredPermissions = ['Admin.Combos'];

    public function __construct()
    {
        parent::__construct();
        AdminMenu::setContext('combos', 'restaurant');
    }

    public function index()
    {
        $this->asExtension('ListController')->index();
    }
    
    public function listExtendQuery($query, $alias = null)
    {
        // Eager load combo items for the list
        $query->with('combo_items');
    }

    public function create()
    {
        $this->asExtension('FormController')->create();
        
        // Get all available menu items for selection
        $menuItems = Menus_model::where('menu_status', 1)
            ->orderBy('menu_name')
            ->get(['menu_id', 'menu_name', 'menu_price']);
        
        $this->vars['menuItems'] = $menuItems;
    }

    public function edit($context = null, $recordId = null)
    {
        $this->asExtension('FormController')->edit($context, $recordId);
        
        // Get all available menu items for selection
        $menuItems = Menus_model::where('menu_status', 1)
            ->orderBy('menu_name')
            ->get(['menu_id', 'menu_name', 'menu_price']);
        
        $this->vars['menuItems'] = $menuItems;
        
        // Get selected items for this combo
        if ($recordId) {
            $combo = $this->formFindModelObject($recordId);
            $selectedItems = $combo->combo_items->map(function($item) {
                return [
                    'menu_id' => $item->menu_id,
                    'quantity' => $item->quantity,
                    'menu_name' => $item->menu->menu_name ?? '',
                ];
            })->toArray();
            
            $this->vars['selectedItems'] = $selectedItems;
        } else {
            $this->vars['selectedItems'] = [];
        }
    }

    public function formValidate($model, $form)
    {
        // Validate that at least one combo item is selected
        $items = post('ComboItems', []);
        $validItems = [];
        
        foreach ($items as $item) {
            if (isset($item['menu_id']) && !empty($item['menu_id']) && $item['menu_id'] > 0) {
                $validItems[] = $item;
            }
        }
        
        if (empty($validItems)) {
            $form->setFormValue('ComboItems', []);
            flash()->error('Please select at least one menu item for the combo.');
            return false;
        }
        
        return true;
    }
    
    public function formAfterSave($model)
    {
        // Save combo items - only save items that were actually checked
        $items = post('ComboItems', []);
        
        // Delete existing items
        $model->combo_items()->delete();
        
        // Add new items (only items with menu_id that are not disabled will be in POST)
        if (!empty($items)) {
            foreach ($items as $item) {
                if (isset($item['menu_id']) && !empty($item['menu_id']) && $item['menu_id'] > 0) {
                    $model->combo_items()->create([
                        'menu_id' => $item['menu_id'],
                        'quantity' => isset($item['quantity']) && $item['quantity'] > 0 ? $item['quantity'] : 1,
                    ]);
                }
            }
        }
        
        // Update description to include combo items
        $this->updateComboDescription($model);
    }
    
    /**
     * PMD Menu Manager V1.2 same-page combo write endpoint.
     * Existing Combos controller remains the only combo write authority.
     */
    public function onPmdMenuManagerSaveV12(): JsonResponse
    {
        $user = AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Combos')) abort(403);

        $validator = Validator::make(request()->all(), [
            'combo_id' => ['nullable', 'integer', 'min:1'],
            'combo_name' => ['required', 'string', 'min:2', 'max:255'],
            'combo_description' => ['nullable', 'string', 'max:1028'],
            'combo_price' => ['required', 'numeric', 'min:0', 'max:9999999'],
            'combo_status' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:2'],
            'items.*.menu_id' => ['required', 'integer', 'min:1', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
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
        $comboId = !empty($clean['combo_id']) ? (int)$clean['combo_id'] : null;
        $comboImage = request()->file('image');
        $comboImageBytes = null;
        $comboImageName = null;
        if ($comboImage) {
            $comboImageBytes = @file_get_contents($comboImage->getRealPath());
            $comboImageName = trim((string)$comboImage->getClientOriginalName()) ?: 'combo-image';
            if ($comboImageBytes === false || $comboImageBytes === '') {
                return response()->json(['ok' => false, 'message' => 'Combo image could not be read.'], 422);
            }
        }
        $items = array_values(array_map(static function ($item) {
            return [
                'menu_id' => (int)$item['menu_id'],
                'quantity' => max(1, min(99, (int)$item['quantity'])),
            ];
        }, (array)$clean['items']));

        $menuIds = array_values(array_unique(array_map(static fn($item) => (int)$item['menu_id'], $items)));
        if (count($menuIds) < 2) {
            return response()->json(['ok' => false, 'message' => 'Select at least two different foods for the combo.'], 422);
        }

        $validMenuIds = Menus_model::query()
            ->whereIn('menu_id', $menuIds)
            ->where('menu_status', 1)
            ->pluck('menu_id')
            ->map(static fn($id) => (int)$id)
            ->all();
        sort($validMenuIds);
        $expectedMenuIds = $menuIds;
        sort($expectedMenuIds);
        if ($validMenuIds !== $expectedMenuIds) {
            return response()->json(['ok' => false, 'message' => 'A selected food is missing or disabled.'], 422);
        }

        try {
            $saved = DB::transaction(function () use ($clean, $comboId, $items, $comboImageBytes, $comboImageName) {
                $combo = $comboId ? Menu_combos_model::query()->find($comboId) : new Menu_combos_model;
                if ($comboId && !$combo) {
                    throw new \RuntimeException('Combo not found.');
                }

                $combo->combo_name = trim((string)$clean['combo_name']);
                $combo->combo_description = trim((string)($clean['combo_description'] ?? ''));
                $combo->combo_price = (float)$clean['combo_price'];
                $combo->combo_status = 1; // PMD V1.2.1: published is product-default, not a user setting

                if (!$combo->exists) {
                    $combo->combo_priority = ((int)Menu_combos_model::query()->max('combo_priority')) + 1;
                    if (Schema::hasColumn($combo->getTable(), 'is_stock_out')) {
                        $combo->is_stock_out = 0;
                    }
                }

                $combo->save();
                $combo->combo_items()->delete();

                foreach ($items as $item) {
                    $combo->combo_items()->create([
                        'menu_id' => (int)$item['menu_id'],
                        'quantity' => (int)$item['quantity'],
                    ]);
                }

                if ($comboImageBytes !== null) {
                    $combo->getMedia('thumb')->each->delete();
                    $media = $combo->newMediaInstance();
                    $media->addFromRaw($comboImageBytes, $comboImageName, 'thumb');
                    $media->save();
                }

                $this->updateComboDescription($combo);
                return $combo->fresh(['combo_items.menu']);
            });
        } catch (\Throwable $e) {
            $notFound = $e instanceof \RuntimeException && $e->getMessage() === 'Combo not found.';
            $status = $notFound ? 404 : 500;
            return response()->json([
                'ok' => false,
                'message' => $notFound ? $e->getMessage() : 'Combo could not be saved.',
            ], $status);
        }

        return response()->json([
            'ok' => true,
            'combo_id' => (int)$saved->combo_id,
            'created' => !$comboId,
            'message' => $comboId ? 'Combo updated.' : 'Combo created.',
        ]);
    }


    /**
     * PMD Menu Manager V1.2.9 same-page combo delete.
     * Existing Combo model/media/item authorities remain the cleanup authority.
     */
    public function onPmdMenuManagerDeleteV129(): JsonResponse
    {
        $user = AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Combos')) abort(403);

        $comboId = (int)post('combo_id');
        if ($comboId < 1) {
            return response()->json(['ok' => false, 'message' => 'Invalid combo.'], 422);
        }

        $combo = Menu_combos_model::query()->find($comboId);
        if (!$combo) {
            return response()->json(['ok' => false, 'message' => 'Combo not found.'], 404);
        }

        try {
            DB::transaction(function () use ($combo) {
                $combo->combo_items()->delete();
                $combo->getMedia('thumb')->each->delete();
                $combo->delete();
            });
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'message' => 'Combo could not be deleted.'], 500);
        }

        return response()->json(['ok' => true, 'combo_id' => $comboId, 'message' => 'Combo deleted.']);
    }

    public function onPmdMenuManagerSaveOrderV123(): JsonResponse
    {
        $user = AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Menus')) {
            abort(403);
        }

        $ordered = (array)post('ordered_combo_ids', []);
        $ordered = array_values(array_unique(array_filter(array_map('intval', $ordered))));
        if (!count($ordered)) {
            return response()->json(['ok' => false, 'message' => 'No combos provided.'], 422);
        }

        $validIds = Menu_combos_model::query()
            ->whereIn('combo_id', $ordered)
            ->pluck('combo_id')
            ->map(static fn($id) => (int)$id)
            ->all();
        $validSet = array_flip($validIds);
        $sequence = array_values(array_filter($ordered, static fn($id) => isset($validSet[$id])));
        if (!count($sequence)) {
            return response()->json(['ok' => false, 'message' => 'No valid combos provided.'], 422);
        }

        DB::transaction(function () use ($sequence) {
            foreach ($sequence as $index => $comboId) {
                Menu_combos_model::query()->where('combo_id', $comboId)->update(['combo_priority' => $index + 1]);
            }
        });

        return response()->json(['ok' => true, 'updated' => count($sequence)]);
    }

    protected function updateComboDescription($model)
    {
        // Reload combo with items
        $model->load('combo_items.menu');
        
        $itemsList = [];
        foreach ($model->combo_items as $item) {
            $qty = $item->quantity > 1 ? " (x{$item->quantity})" : '';
            $itemsList[] = ($item->menu ? $item->menu->menu_name : 'Unknown') . $qty;
        }
        
        if (!empty($itemsList)) {
            $itemsText = "Includes: " . implode(", ", $itemsList);
            
            // Remove old "Includes:" line if it exists
            $description = $model->combo_description ?? '';
            $description = preg_replace('/\n*Includes:.*$/m', '', $description);
            $description = trim($description);
            
            // Add or update the items list
            if (!empty($description)) {
                $model->combo_description = $description . "\n\n" . $itemsText;
            } else {
                $model->combo_description = $itemsText;
            }
            $model->save();
        }
    }
}

