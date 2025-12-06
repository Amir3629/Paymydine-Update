<?php

namespace Admin\BulkActionWidgets;

use Admin\Classes\BaseBulkActionWidget;
use App\Helpers\NotificationHelper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Stock Out Bulk Action Widget
 * 
 * Allows marking menu items as stock-out (visible but not orderable)
 * Separate from enable/disable status
 */
class StockOut extends BaseBulkActionWidget
{
    public $stockOutColumn = 'is_stock_out';

    public function initialize()
    {
        $this->fillFromConfig([
            'stockOutColumn',
        ]);
    }

    /**
     * Handle the bulk action
     * 
     * @param array $requestData Request data containing action code
     * @param \Illuminate\Database\Eloquent\Collection $records Selected records
     * @return void
     */
    public function handleAction($requestData, $records)
    {
        $code = array_get($requestData, 'code');
        
        // Parse action code: "stockout.mark" or "stockout.restore"
        $parts = explode('.', $code, 2);
        $actionCode = array_shift($parts);
        $stockOutAction = array_shift($parts); // 'mark' or 'restore'
        
        $stockOutColumn = $this->stockOutColumn;

        if ($count = $records->count()) {
            DB::transaction(function () use ($records, $stockOutColumn, $stockOutAction) {
                foreach ($records as $record) {
                    // mark = set to 1 (stock out), restore = set to 0 (in stock)
                    $record->$stockOutColumn = ($stockOutAction === 'mark') ? 1 : 0;
                    $record->save();
                }
            });

            // Create notification for stock-out/stock-in action
            try {
                $action = ($stockOutAction === 'mark') ? 'stock_out' : 'stock_in';
                
                // Convert to objects for notification helper
                $menuItems = [];
                foreach ($records as $record) {
                    $menuItems[] = (object)[
                        'menu_id' => $record->menu_id,
                        'menu_name' => $record->menu_name
                    ];
                }
                
                Log::info('StockOut widget: Attempting to create notification', [
                    'action' => $action,
                    'count' => $count,
                    'menu_items_count' => count($menuItems),
                    'menu_names' => array_map(function($item) { return $item->menu_name; }, $menuItems)
                ]);
                
                $notificationId = NotificationHelper::createStockOutNotification([
                    'action' => $action,
                    'menu_items' => $menuItems
                ]);
                
                if ($notificationId) {
                    Log::info('StockOut widget: Notification created successfully', [
                        'notification_id' => $notificationId,
                        'action' => $action
                    ]);
                } else {
                    Log::warning('StockOut widget: Notification creation returned null', [
                        'action' => $action,
                        'count' => $count
                    ]);
                }
            } catch (\Exception $e) {
                // Log error but don't fail the bulk action
                Log::error('StockOut widget: Failed to create stock-out notification', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'action' => $stockOutAction,
                    'count' => $count,
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]);
            }

            $prefix = ($count > 1) ? ' records' : ' record';
            $actionText = ($stockOutAction === 'mark') ? 'marked as stock out' : 'restored to in stock';
            
            flash()->success(sprintf(lang('admin::lang.alert_success'),
                '['.$count.']'.$prefix.' '.$actionText
            ));
        }
        else {
            $actionText = ($stockOutAction === 'mark') ? 'marked as stock out' : 'restored';
            flash()->warning(sprintf(lang('admin::lang.alert_error_nothing'), $actionText));
        }
    }
}

