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
                $menuItemsArray = $records->toArray();
                
                // Convert to objects for notification helper
                $menuItems = [];
                foreach ($records as $record) {
                    $menuItems[] = (object)[
                        'menu_id' => $record->menu_id,
                        'menu_name' => $record->menu_name
                    ];
                }
                
                NotificationHelper::createStockOutNotification([
                    'action' => $action,
                    'menu_items' => $menuItems
                ]);
            } catch (\Exception $e) {
                // Log error but don't fail the bulk action
                Log::warning('Failed to create stock-out notification', [
                    'error' => $e->getMessage(),
                    'action' => $stockOutAction,
                    'count' => $count
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

