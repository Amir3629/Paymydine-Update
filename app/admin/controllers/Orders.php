<?php

namespace Admin\Controllers;

use Admin\ActivityTypes\StatusUpdated;
use Admin\Facades\AdminMenu;
use Admin\Models\Orders_model;
use Admin\Models\Statuses_model;
use Igniter\Flame\Exception\ApplicationException;
use App\Helpers\NotificationHelper;

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

}
