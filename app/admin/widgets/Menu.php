<?php

namespace Admin\Widgets;

use Admin\Classes\BaseWidget;
use Admin\Classes\MenuItem;
use Admin\Classes\UserState;
use Admin\Facades\AdminLocation;
use Admin\Models\Locations_model;
use Carbon\Carbon;
use Igniter\Flame\Exception\ApplicationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class Menu extends BaseWidget
{
    /**
     * @var array Item definition configuration.
     */
    public $items;

    /**
     * @var string The context of this menu, items that do not belong
     * to this context will not be shown.
     */
    public $context = null;

    protected $defaultAlias = 'top-menu';

    /**
     * @var bool Determines if item definitions have been created.
     */
    protected $itemsDefined = false;

    /**
     * @var array Collection of all items used in this menu.
     */
    protected $allItems = [];

    /**
     * @var array List of CSS classes to apply to the menu container element
     */
    public $cssClasses = [];

    public function initialize()
    {
        $this->fillFromConfig([
            'items',
            'context',
        ]);
    }

    public function render()
    {
        $this->prepareVars();

        return $this->makePartial('menu/top_menu');
    }

    protected function prepareVars()
    {
        $this->defineMenuItems();
        $this->vars['cssClasses'] = implode(' ', $this->cssClasses);
        $this->vars['items'] = $this->getItems();
    }

    public function loadAssets()
    {
        $this->addJs('js/mainmenu.js', 'mainmenu-js');
    }

    /**
     * Renders the HTML element for a item
     *
     * @param $item
     *
     * @return string
     */
    public function renderItemElement($item)
    {
        $params = ['item' => $item];

        return $this->makePartial('menu/item_'.$item->type, $params);
    }

    /**
     * Creates a flat array of menu items from the configuration.
     */
    protected function defineMenuItems()
    {
        if ($this->itemsDefined)
            return;

        if (!isset($this->items) || !is_array($this->items)) {
            $this->items = [];
        }

        $this->addItems($this->items);

        $this->itemsDefined = true;
    }

    /**
     * Programatically add items, used internally and for extensibility.
     *
     * @param array $items
     */
    public function addItems(array $items)
    {
        foreach ($items as $name => $config) {

            $itemObj = $this->makeMenuItem($name, $config);

            // Check that the menu item matches the active context
            if ($itemObj->context !== null) {
                $context = (is_array($itemObj->context)) ? $itemObj->context : [$itemObj->context];
                if (!in_array($this->getContext(), $context)) {
                    continue;
                }
            }

            $this->allItems[$name] = $itemObj;
        }
    }

    /**
     * Creates a menu item object from name and configuration.
     *
     * @param $name
     * @param $config
     *
     * @return \Admin\Classes\MenuItem
     */
    protected function makeMenuItem($name, $config)
    {
        $label = $config['label'] ?? null;
        $itemType = $config['type'] ?? null;

        $item = new MenuItem($name, $label);
        $item->displayAs($itemType, $config);

        // Defer the execution of badge unread count
        $item->unreadCount(function () use ($item, $config) {
            $itemBadgeCount = $config['badgeCount'] ?? null;

            return $this->getUnreadCountFromModel($item, $itemBadgeCount);
        });

        // Get menu item options from model
        $optionModelTypes = ['dropdown', 'partial'];
        if (in_array($item->type, $optionModelTypes, false)) {

            // Defer the execution of option data collection
            $item->options(function () use ($item, $config) {
                $itemOptions = $config['options'] ?? null;
                $itemOptions = $this->getOptionsFromModel($item, $itemOptions);

                return $itemOptions;
            });
        }

        return $item;
    }

    /**
     * Get all the registered items for the instance.
     * @return array
     */
    public function getItems()
    {
        return $this->allItems;
    }

    /**
     * Get a specified item object
     *
     * @param string $item
     *
     * @return mixed
     * @throws \Exception
     */
    public function getItem($item)
    {
        if (!isset($this->allItems[$item])) {
            throw new ApplicationException(sprintf(lang('admin::lang.side_menu.alert_no_definition'), $item));
        }

        return $this->allItems[$item];
    }

    public function getLoggedUser()
    {
        if (!$this->getController()->checkUser())
            return false;

        return $this->getController()->getUser();
    }

    //
    // Event handlers
    //

    /**
     * Update a menu item value.
     * @return array
     * @throws \Exception
     */
    public function onGetDropdownOptions()
    {
        if (!strlen($itemName = input('item')))
            throw new ApplicationException(lang('admin::lang.side_menu.alert_invalid_menu'));

        $this->defineMenuItems();

        if (!$item = $this->getItem($itemName))
            throw new ApplicationException(sprintf(lang('admin::lang.side_menu.alert_menu_not_found'), $itemName));

        $itemOptions = $item->options();

        // Return a partial if item has a path defined
        if (strlen($item->partial)) {
            return [
                '#'.$item->getId($item->itemName.'-options') => $this->makePartial(
                    $item->partial, ['item' => $item, 'itemOptions' => $itemOptions]
                ),
            ];
        }

        return [
            'options' => $itemOptions,
        ];
    }

    /**
     * Mark menu items as read.
     * @return array
     * @throws \Exception
     */
    public function onMarkOptionsAsRead()
    {
        if (!strlen($itemName = post('item')))
            throw new ApplicationException(lang('admin::lang.side_menu.alert_invalid_menu'));

        $this->defineMenuItems();

        if (!$item = $this->getItem($itemName))
            throw new ApplicationException(sprintf(lang('admin::lang.side_menu.alert_menu_not_found'), $itemName));

        $this->resolveMarkAsReadFromModel($item);
    }

    public function onChooseLocation()
    {
        $location = null;
        if (is_numeric($locationId = post('location')))
            $location = Locations_model::find($locationId);

        if ($location && AdminLocation::hasAccess($location)) {
            AdminLocation::setCurrent($location);
        }
        else {
            AdminLocation::clearCurrent();
        }

        return $this->controller->redirectBack();
    }

    public function onSetUserStatus()
    {
        $status = (int)post('status');
        $message = (string)post('message');
        $clearAfterMinutes = (int)post('clear_after');

        if ($status < 1 && !strlen($message))
            throw new ApplicationException(lang('admin::lang.side_menu.alert_invalid_status'));

        $user = $this->controller->getUser();
        
        // Get old status before updating
        $oldState = UserState::forUser($user);
        $oldStatus = $oldState->getStatus();
        $oldMessage = $oldState->getMessage();
        $oldClearAfter = $oldState->getClearAfterMinutes();
        
        $stateData['status'] = $status;
        $stateData['isAway'] = $status !== 1;
        $stateData['updatedAt'] = Carbon::now();
        $stateData['awayMessage'] = e($message);
        $stateData['clearAfterMinutes'] = $clearAfterMinutes;

        UserState::forUser($user)->updateState($stateData);
        
        // Create notification if:
        // 1. Status changed (e.g., Online to Away)
        // 2. OR custom status message changed (e.g., "lunch break" to "meeting")
        // 3. OR custom status time period changed (e.g., 30 mins to 60 mins)
        $statusChanged = ($oldStatus != $status);
        $messageChanged = ($status == 4 && trim($oldMessage) != trim($message));
        $timeChanged = ($status == 4 && $oldClearAfter != $clearAfterMinutes);
        
        if ($statusChanged || $messageChanged || $timeChanged) {
            $this->createStatusChangeNotification($user, $status, $message, $clearAfterMinutes);
        }
    }

    /**
     * Create notification when staff status changes
     *
     * @param \Admin\Models\Users_model $user
     * @param int $status
     * @param string $message
     * @param int $clearAfterMinutes
     * @return void
     */
    protected function createStatusChangeNotification($user, $status, $message, $clearAfterMinutes = 0)
    {
        try {
            $statusLabels = [
                1 => 'Online',
                2 => 'Back Soon',
                3 => 'Away',
                4 => 'Custom Status'
            ];
            
            $statusName = $statusLabels[$status] ?? 'Unknown';
            
            // Get staff name
            $staffName = 'Staff';
            if ($user && $user->staff) {
                $staffName = $user->staff->staff_name ?? $user->staff_name ?? 'Staff';
            } elseif ($user) {
                $staffName = $user->staff_name ?? 'Staff';
            }
            
            // Format time period for display
            $timePeriod = $this->formatTimePeriod($clearAfterMinutes);
            
            // Build title and message based on status
            if ($status === 1) {
                // Online
                $title = "{$staffName} is online again";
            } elseif ($status === 2) {
                // Back Soon
                $title = "{$staffName} will back soon";
            } elseif ($status === 3) {
                // Away
                $title = "{$staffName} is away";
            } elseif ($status === 4 && $message) {
                // Custom status - add time period if set
                if ($timePeriod) {
                    $title = "{$staffName} is {$message} {$timePeriod}";
                } else {
                    $title = "{$staffName} is {$message}";
                }
            } else {
                $title = "{$staffName} is now {$statusName}";
            }
            
            // Build payload
            $payload = [
                'staff_id' => $user->user_id ?? null,
                'staff_name' => $staffName,
                'status' => $status,
                'status_name' => $statusName,
                'message' => $message,
                'clear_after_minutes' => $clearAfterMinutes,
                'time_period' => $timePeriod,
                'changed_at' => Carbon::now()->toDateTimeString()
            ];
            
            // Create notification directly in database (consistent with other notifications)
            DB::table('notifications')->insertGetId([
                'type' => 'staff_status_change',
                'title' => $title,
                'table_id' => null,
                'table_name' => 'Staff Status', // Set to "Staff Status" instead of null
                'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE),
                'status' => 'new',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
            
            Log::info('Staff status change notification created', [
                'staff_name' => $staffName,
                'status' => $status,
                'status_name' => $statusName
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create status change notification', [
                'error' => $e->getMessage(),
                'user_id' => $user->user_id ?? null,
                'status' => $status,
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Format time period for display
     *
     * @param int $minutes
     * @return string
     */
    protected function formatTimePeriod($minutes)
    {
        if ($minutes <= 0) {
            return '';
        }
        
        if ($minutes >= 1440) {
            return 'tomorrow';
        } elseif ($minutes >= 60) {
            $hours = floor($minutes / 60);
            return "{$hours} " . ($hours == 1 ? 'hour' : 'hours');
        } else {
            return "{$minutes} mins";
        }
    }

    /**
     * Returns the active context for displaying the menu.
     * @return string
     */
    public function getContext()
    {
        return $this->context;
    }

    protected function getOptionsFromModel($item, $itemOptions)
    {
        if (is_array($itemOptions) && is_callable($itemOptions)) {
            $user = $this->getLoggedUser();
            $itemOptions = call_user_func($itemOptions, $this, $item, $user);
        }

        return $itemOptions;
    }

    protected function getUnreadCountFromModel($item, $itemBadgeCount)
    {
        if (is_array($itemBadgeCount) && is_callable($itemBadgeCount)) {
            $user = $this->getLoggedUser();
            $itemBadgeCount = $itemBadgeCount($this, $item, $user);
        }

        return $itemBadgeCount;
    }

    protected function resolveMarkAsReadFromModel($item)
    {
        $callback = array_get($item->config, 'markAsRead');
        if (is_array($callback) && is_callable($callback)) {
            $user = $this->getLoggedUser();
            $callback($this, $item, $user);
        }
    }
}
