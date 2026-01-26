<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Models\Notifications_model;
use Admin\Models\General_staff_notes_model;
use App\Helpers\NotificationHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class Notifications extends AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Notifications_model',
            'title' => 'lang:admin::lang.notifications.text_title',
            'emptyMessage' => 'lang:admin::lang.notifications.text_empty',
            'defaultSort' => ['created_at', 'desc'],
            'showSorting' => true,
            'showSetup' => true,
            'showFilter' => true,
            'showSearch' => true,
            'showPagination' => true,
            'perPage' => 20,
        ],
    ];

    public $formConfig = [
        'name' => 'lang:admin::lang.notifications.text_form_name',
        'model' => 'Admin\Models\Notifications_model',
        'request' => 'Admin\Requests\NotificationRequest',
        'create' => [
            'title' => 'lang:admin::lang.notifications.text_create_title',
            'redirect' => 'notifications/edit/{id}',
            'redirectClose' => 'notifications',
        ],
        'edit' => [
            'title' => 'lang:admin::lang.notifications.text_edit_title',
            'redirect' => 'notifications/edit/{id}',
            'redirectClose' => 'notifications',
        ],
        'preview' => [
            'title' => 'lang:admin::lang.notifications.text_preview_title',
            'redirect' => 'notifications',
        ],
        'delete' => [
            'redirect' => 'notifications',
        ],
    ];

    protected $requiredPermissions = ['Admin.Notifications'];

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Get notifications for admin header
     */
    public function index()
    {
        try {
            $request = request();
            $status = $request->get('status', 'new');
            $type = $request->get('type');
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 20);

            // Ensure we're using tenant database
            $this->ensureTenantDatabase();

            $query = Notifications_model::query();

            // Filter by status
            if ($status !== 'all') {
                $query->where('status', $status);
            }

            // Filter by type
            if ($type) {
                $query->where('type', $type);
            }

            // Get paginated results
            $notifications = $query->orderBy('created_at', 'desc')
                ->paginate($limit, ['*'], 'page', $page);

            // Get counts by status
            $counts = NotificationHelper::getNotificationCounts($this->getCurrentTenantId());

            return response()->json([
                'success' => true,
                'data' => [
                    'notifications' => $notifications->items(),
                    'pagination' => [
                        'current_page' => $notifications->currentPage(),
                        'per_page' => $notifications->perPage(),
                        'total' => $notifications->total(),
                        'last_page' => $notifications->lastPage(),
                        'has_more' => $notifications->hasMorePages(),
                    ],
                    'counts' => $counts
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get notifications', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to get notifications'
            ], 500);
        }
    }

    /**
     * Get notification count for badge
     */
    public function count()
    {
        try {
            $this->ensureTenantDatabase();

            $counts = NotificationHelper::getNotificationCounts($this->getCurrentTenantId());

            return response()->json([
                'success' => true,
                'data' => $counts
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get notification count', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to get notification count'
            ], 500);
        }
    }

    /**
     * Update notification status
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:seen,in_progress,resolved',
            'acted_by' => 'nullable|integer'
        ]);

        try {
            $this->ensureTenantDatabase();

            $notification = Notifications_model::findOrFail($id);

            // Check permissions
            if (!$this->canUpdateNotification($notification)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Insufficient permissions'
                ], 403);
            }

            $staffId = $request->get('acted_by', $this->getCurrentStaffId());

            // Update status based on action
            switch ($request->status) {
                case 'seen':
                    $notification->markAsSeen($staffId);
                    break;
                case 'in_progress':
                    $notification->markInProgress($staffId);
                    break;
                case 'resolved':
                    $notification->markResolved($staffId);
                    break;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'notification_id' => $notification->notification_id,
                    'status' => $notification->status,
                    'seen_at' => $notification->seen_at,
                    'acted_by' => $notification->acted_by,
                    'acted_at' => $notification->acted_at
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update notification status', [
                'error' => $e->getMessage(),
                'notification_id' => $id
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to update notification status'
            ], 500);
        }
    }

    /**
     * Mark all notifications as seen
     */
    public function markAllSeen(Request $request)
    {
        $request->validate([
            'acted_by' => 'nullable|integer'
        ]);

        try {
            $this->ensureTenantDatabase();

            $staffId = $request->get('acted_by', $this->getCurrentStaffId());

            $updatedCount = Notifications_model::where('status', 'new')
                ->update([
                    'status' => 'seen',
                    'seen_at' => now(),
                    'acted_by' => $staffId,
                    'acted_at' => now(),
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'updated_count' => $updatedCount,
                    'acted_by' => $staffId,
                    'acted_at' => now()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to mark all notifications as seen', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to mark all notifications as seen'
            ], 500);
        }
    }

    /**
     * Ensure we're using tenant database
     */
    private function ensureTenantDatabase()
    {
        $currentDb = DB::connection()->getDatabaseName();
        
        // Check if we're using a tenant database (not the main database)
        if (strpos($currentDb, 'tenant_') === false && $currentDb !== 'paymydine') {
            Log::warning('Notification operation on non-tenant database', [
                'database' => $currentDb
            ]);
        }
    }

    /**
     * Get current tenant ID
     */
    private function getCurrentTenantId()
    {
        try {
            $currentDb = DB::connection()->getDatabaseName();
            
            // Extract tenant ID from database name (assuming format: tenant_1_db)
            if (preg_match('/tenant_(\d+)_db/', $currentDb, $matches)) {
                return (int) $matches[1];
            }
            
            // Fallback: try to get from ti_tenants table
            $tenant = DB::table('tenants')
                ->where('database', $currentDb)
                ->first();
                
            return $tenant ? $tenant->id : 1; // Default to 1 if not found
        } catch (\Exception $e) {
            return 1; // Default to 1 if error
        }
    }

    /**
     * Get current staff ID
     */
    private function getCurrentStaffId()
    {
        try {
            // Get from session or auth
            return admin_auth()->user()->staff_id ?? 1;
        } catch (\Exception $e) {
            return 1; // Default to 1 if error
        }
    }

    /**
     * Check if user can update notification
     */
    private function canUpdateNotification($notification)
    {
        // Super admin can update all notifications
        if (admin_auth()->user()->is_super_user) {
            return true;
        }

        // Regular admin can update table-related notifications
        if (in_array($notification->type, ['waiter_call', 'valet_request', 'table_note'])) {
            return true;
        }

        // System alerts require super admin
        return false;
    }

    /**
     * Add general staff note
     */
    public function onAddGeneralStaffNote()
    {
        $noteText = post('note');

        if (empty($noteText)) {
            flash()->error('Note cannot be empty')->now();
            return ['#notification' => $this->makePartial('flash')];
        }

        try {
            DB::beginTransaction();

            // Get current user
            $user = $this->getUser();
            $staffId = $user ? $user->staff_id : null;

            // Create the general staff note
            $note = new General_staff_notes_model();
            $note->staff_id = $staffId;
            $note->note = $noteText;
            $note->status = 'active';
            $note->save();

            // Get tenant ID
            $tenantId = $this->getCurrentTenantId();

            // Create notification for general staff note
            try {
                NotificationHelper::createGeneralStaffNoteNotification([
                    'tenant_id' => $tenantId,
                    'staff_id' => $staffId,
                    'note' => $noteText,
                ]);
            } catch (\Exception $e) {
                // Log notification error but don't fail the note creation
                Log::warning('Failed to create general staff note notification', [
                    'note_id' => $note->note_id,
                    'error' => $e->getMessage()
                ]);
            }

            DB::commit();

            flash()->success('Note added successfully!')->now();
            return [
                '#notification' => $this->makePartial('flash'),
                'success' => true
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to add general staff note', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            flash()->error('Failed to add note. Please try again.')->now();
            return ['#notification' => $this->makePartial('flash')];
        }
    }
}