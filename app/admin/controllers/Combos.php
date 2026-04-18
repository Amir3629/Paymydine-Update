<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Models\Menu_combos_model;
use Admin\Models\Menus_model;
use Illuminate\Support\Facades\DB;

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

