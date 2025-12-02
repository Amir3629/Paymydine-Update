<?php

namespace Admin\Controllers;

use Admin\ActivityTypes\StatusUpdated;
use Admin\Facades\AdminMenu;
use Admin\Models\Orders_model;
use Admin\Models\Statuses_model;
use Admin\Models\Payments_model;
use Igniter\Flame\Exception\ApplicationException;
use App\Helpers\NotificationHelper;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\DB;

class Orders extends \Admin\Classes\AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
        'Admin\Actions\LocationAwareController',
        'Admin\Actions\AssigneeController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Orders_model',
            'title' => 'lang:admin::lang.orders.text_title',
            'emptyMessage' => 'lang:admin::lang.orders.text_empty',
            'defaultSort' => ['order_id', 'DESC'],
            'configFile' => 'orders_model',
        ],
    ];

    public $formConfig = [
        'name' => 'lang:admin::lang.orders.text_form_name',
        'model' => 'Admin\Models\Orders_model',
        'request' => 'Admin\Requests\Order',
        'create' => [
            'title' => 'lang:admin::lang.form.create_title',
            'redirect' => 'orders/edit/{order_id}',
            'redirectClose' => 'orders',
            'redirectNew' => 'orders/create',
        ],
        'edit' => [
            'title' => 'lang:admin::lang.form.edit_title',
            'redirect' => 'orders/edit/{order_id}',
            'redirectClose' => 'orders',
        ],
        'preview' => [
            'title' => 'lang:admin::lang.form.preview_title',
            'redirect' => 'orders',
        ],
        'delete' => [
            'redirect' => 'orders',
        ],
        'configFile' => 'orders_model',
    ];

    protected $requiredPermissions = [
        'Admin.Orders',
        'Admin.AssignOrders',
        'Admin.DeleteOrders',
    ];

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('orders', 'sales');
    }

    public function index()
    {
        $this->asExtension('ListController')->index();

        // Get all statuses with their colors for the dropdown
        $statuses = \Admin\Models\Statuses_model::isForOrder()->get();
        $statusesOptions = [];
        $statusesColors = [];
        
        foreach ($statuses as $status) {
            $statusesOptions[$status->status_id] = $status->status_name;
            $statusesColors[$status->status_id] = $status->status_color;
        }
        
        $this->vars['statusesOptions'] = $statusesOptions;
        $this->vars['statusesColors'] = $statusesColors;
    }

    public function create()
    {
        // Load payment methods
        $paymentMethods = Payments_model::isEnabled()
            ->orderBy('priority')
            ->get(['code', 'name', 'priority']);
        
        // Load tax settings
        $settings = DB::table('settings')->get()->keyBy('item');
        $taxSettings = [
            'enabled' => ($settings['tax_mode']->value ?? '0') === '1',
            'percentage' => floatval($settings['tax_percentage']->value ?? '0'),
            'menu_price' => intval($settings['tax_menu_price']->value ?? '1'),
        ];
        
        // Check if editing existing order
        $orderId = request()->get('order_id');
        $existingOrder = null;
        $existingOrderItems = [];
        
        if ($orderId) {
            $existingOrder = Orders_model::find($orderId);
            if ($existingOrder) {
                // Load existing order items
                $existingOrderItems = $existingOrder->getOrderMenusWithOptions();
            }
        }
        
        $this->vars['paymentMethods'] = $paymentMethods;
        $this->vars['taxSettings'] = $taxSettings;
        $this->vars['existingOrder'] = $existingOrder;
        $this->vars['existingOrderItems'] = $existingOrderItems;
        
        return $this->asExtension('FormController')->create();
    }

    public function index_onDelete()
    {
        if (!$this->getUser()->hasPermission('Admin.DeleteOrders'))
            throw new ApplicationException(lang('admin::lang.alert_user_restricted'));

        return $this->asExtension('Admin\Actions\ListController')->index_onDelete();
    }

    public function index_onUpdateStatus()
    {
        $model = Orders_model::find((int)post('recordId'));
        $status = Statuses_model::find((int)post('statusId'));
        if (!$model || !$status)
            return;

        if ($record = $model->addStatusHistory($status))
            StatusUpdated::log($record, $this->getUser());

        // Create notification for order status update (only if status change notifications are enabled)
        try {
            if (\App\Helpers\SettingsHelper::areOrderStatusChangeNotificationsEnabled()) {
                $notificationData = [
                    'tenant_id' => $model->location_id ?? 1,
                    'order_id' => $model->order_id,
                    'table_id' => $model->table_id,
                    'status' => strtolower($status->status_name),
                    'status_name' => $status->status_name,
                    'message' => "Order status changed to {$status->status_name}",
                    'priority' => 'medium'
                ];
                
                // Use the order's order_type_name attribute if available
                if (!empty($model->order_type_name)) {
                    $notificationData['table_name'] = $model->order_type_name;
                }
                
                NotificationHelper::createOrderNotification($notificationData);
            }
        } catch (\Exception $e) {
            // Log notification error but don't fail the status update
            \Log::warning('Failed to create order status notification', [
                'order_id' => $model->order_id,
                'status' => $status->status_name,
                'error' => $e->getMessage()
            ]);
        }

        flash()->success(sprintf(lang('admin::lang.alert_success'), lang('admin::lang.statuses.text_form_name').' updated'))->now();

        return $this->redirectBack();
    }

    public function edit_onDelete($context, $recordId)
    {
        if (!$this->getUser()->hasPermission('Admin.DeleteOrders'))
            throw new ApplicationException(lang('admin::lang.alert_user_restricted'));

        return $this->asExtension('Admin\Actions\FormController')->edit_onDelete($context, $recordId);
    }

    public function invoice($context, $recordId = null)
    {
        $model = $this->formFindModelObject($recordId);

        if (!$model->hasInvoice())
            throw new ApplicationException(lang('admin::lang.orders.alert_invoice_not_generated'));

        $this->vars['model'] = $model;

        $this->suppressLayout = true;
    }

    public function edit_onSendInvoiceEmail($context, $recordId = null)
    {
        $model = $this->formFindModelObject($recordId);

        if (!$model->hasInvoice()) {
            flash()->error('Invoice not generated for this order.')->now();
            return $this->redirectBack();
        }

        // Get customer email
        $customerEmail = $model->email;
        
        if (empty($customerEmail)) {
            flash()->error('Customer email not found for this order.')->now();
            return $this->redirectBack();
        }

        // Get restaurant email from location
        $locationEmail = $model->location->location_email ?? setting('site_email');
        
        if (empty($locationEmail)) {
            flash()->error('Restaurant email not configured. Please configure it in Settings > Locations.')->now();
            return $this->redirectBack();
        }

        try {
            // Generate invoice HTML - render the invoice view
            $invoiceHtml = View::make('orders.invoice', ['model' => $model])->render();
            
            // Build email body
            $emailBody = $this->buildInvoiceEmailBody($model);
            
            // Get location info
            $locationName = $model->location->location_name ?? setting('site_name');
            $invoiceFileName = 'Invoice-' . $model->invoice_number . '.html';
            
            // Send email using Mail::raw() method
            Mail::raw('', function ($message) use ($customerEmail, $model, $locationEmail, $locationName, $invoiceHtml, $invoiceFileName, $emailBody) {
                $swiftMessage = $message->getSwiftMessage();
                $swiftMessage->setBody($emailBody, 'text/html');
                
                // Create attachment from data using Swift_Attachment constructor
                $attachment = new \Swift_Attachment($invoiceHtml, $invoiceFileName, 'text/html');
                $swiftMessage->attach($attachment);
                
                $message->to($customerEmail, $model->customer_name)
                    ->from($locationEmail, $locationName)
                    ->replyTo($locationEmail, $locationName)
                    ->subject('Invoice for Order #' . $model->order_id . ' - ' . $locationName);
            });

            flash()->success('Invoice sent successfully to ' . $customerEmail . '!')->now();
        } catch (\Exception $e) {
            Log::error('Failed to send invoice email', [
                'order_id' => $model->order_id,
                'email' => $customerEmail,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            flash()->error('Failed to send invoice email: ' . $e->getMessage())->now();
        }

        return $this->redirectBack();
    }

    protected function buildInvoiceEmailBody($model)
    {
        $locationName = $model->location->location_name ?? setting('site_name');
        $locationAddress = $model->location ? format_address($model->location->getAddress()) : '';
        $locationPhone = $model->location->location_telephone ?? '';
        
        return View::make('orders.invoice_email_body', [
            'model' => $model,
            'locationName' => $locationName,
            'locationAddress' => $locationAddress,
            'locationPhone' => $locationPhone,
        ])->render();
    }

    public function listExtendQuery($query)
    {
        // Eager load status relationship for row background colors
        $query->with('status');
    }

    public function formExtendQuery($query)
    {
        $query->with([
            'status_history' => function ($q) {
                $q->orderBy('created_at', 'desc');
            },
        ]);
    }

    /**
     * Extend list columns to hide specific columns from the List Setup modal
     * This hides Customer Name and Order Time is ASAP from being selectable
     */
    public function listExtendColumns($host)
    {
        // Define columns to hide from the setup modal
        $hiddenColumns = [
            'full_name',           // Customer Name
            'order_time_is_asap',  // Order Time is ASAP
        ];
        
        // Remove the hidden columns from the list widget
        foreach ($hiddenColumns as $columnName) {
            $host->removeColumn($columnName);
        }
    }

    public function edit_onUpdateField($context, $recordId = null)
    {
        $model = $this->formFindModelObject($recordId);
        $field = post('field');
        $value = post('value');

        if (!in_array($field, ['email', 'telephone'])) {
            flash()->error('Invalid field')->now();
            return ['#notification' => $this->makePartial('flash')];
        }

        try {
            $model->$field = $value;
            $model->save();

            flash()->success(ucfirst($field) . ' updated successfully')->now();
            return [
                '#notification' => $this->makePartial('flash'),
                'success' => true,
                'value' => $value
            ];
        } catch (\Exception $e) {
            Log::error('Failed to update order field', [
                'order_id' => $model->order_id,
                'field' => $field,
                'error' => $e->getMessage()
            ]);

            flash()->error('Failed to update ' . $field . ': ' . $e->getMessage())->now();
            return ['#notification' => $this->makePartial('flash')];
        }
    }

    /**
     * Update order item quantity
     */
    public function edit_onUpdateItemQuantity($context, $recordId = null)
    {
        $order = $this->formFindModelObject($recordId);
        $orderMenuId = post('order_menu_id');
        $quantity = (int)post('quantity');

        if ($quantity < 0) {
            return [
                'success' => false,
                'error' => 'Quantity cannot be negative'
            ];
        }

        try {
            DB::beginTransaction();

            // Get order menu item
            $orderMenu = DB::table('order_menus')
                ->where('order_menu_id', $orderMenuId)
                ->where('order_id', $order->order_id)
                ->first();

            if (!$orderMenu) {
                return [
                    'success' => false,
                    'error' => 'Order item not found'
                ];
            }

            // Update quantity and subtotal
            $price = (float)$orderMenu->price;
            $newSubtotal = $price * $quantity;

            DB::table('order_menus')
                ->where('order_menu_id', $orderMenuId)
                ->update([
                    'quantity' => $quantity,
                    'subtotal' => $newSubtotal
                ]);

            // Recalculate order totals
            $order->calculateTotals();
            $order->refresh();

            // Get updated totals
            $totals = $order->getOrderTotals();
            $subtotalTotal = $totals->firstWhere('code', 'subtotal');
            $taxTotal = $totals->firstWhere('code', 'tax');
            $tipTotal = $totals->firstWhere('code', 'tip');
            $couponTotal = $totals->firstWhere('code', 'coupon');
            $finalTotal = $totals->firstWhere('code', 'total');

            DB::commit();

            return [
                'success' => true,
                'totals' => [
                    'subtotal' => $subtotalTotal ? (float)$subtotalTotal->value : 0,
                    'tax' => $taxTotal ? (float)$taxTotal->value : 0,
                    'tip' => $tipTotal ? (float)$tipTotal->value : 0,
                    'coupon' => $couponTotal ? (float)$couponTotal->value : 0,
                    'total' => $finalTotal ? (float)$finalTotal->value : 0,
                    'total_items' => (int)$order->total_items
                ]
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update order item quantity', [
                'order_id' => $order->order_id,
                'order_menu_id' => $orderMenuId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Failed to update quantity: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Remove order item
     */
    public function edit_onRemoveItem($context, $recordId = null)
    {
        $order = $this->formFindModelObject($recordId);
        $orderMenuId = post('order_menu_id');

        try {
            DB::beginTransaction();

            // Verify item belongs to this order
            $orderMenu = DB::table('order_menus')
                ->where('order_menu_id', $orderMenuId)
                ->where('order_id', $order->order_id)
                ->first();

            if (!$orderMenu) {
                return [
                    'success' => false,
                    'error' => 'Order item not found'
                ];
            }

            // Delete order menu options first
            DB::table('order_menu_options')
                ->where('order_menu_id', $orderMenuId)
                ->delete();

            // Delete order menu item
            DB::table('order_menus')
                ->where('order_menu_id', $orderMenuId)
                ->delete();

            // Recalculate order totals
            $order->calculateTotals();
            $order->refresh();

            // Get updated totals
            $totals = $order->getOrderTotals();
            $subtotalTotal = $totals->firstWhere('code', 'subtotal');
            $taxTotal = $totals->firstWhere('code', 'tax');
            $tipTotal = $totals->firstWhere('code', 'tip');
            $couponTotal = $totals->firstWhere('code', 'coupon');
            $finalTotal = $totals->firstWhere('code', 'total');

            DB::commit();

            return [
                'success' => true,
                'totals' => [
                    'subtotal' => $subtotalTotal ? (float)$subtotalTotal->value : 0,
                    'tax' => $taxTotal ? (float)$taxTotal->value : 0,
                    'tip' => $tipTotal ? (float)$tipTotal->value : 0,
                    'coupon' => $couponTotal ? (float)$couponTotal->value : 0,
                    'total' => $finalTotal ? (float)$finalTotal->value : 0,
                    'total_items' => (int)$order->total_items
                ]
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to remove order item', [
                'order_id' => $order->order_id,
                'order_menu_id' => $orderMenuId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Failed to remove item: ' . $e->getMessage()
            ];
        }
    }

}
