<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use App\Helpers\SettingsHelper;
use App\Helpers\NotificationHelper;
use Illuminate\Routing\Controller;
use Admin\Models\Notifications_model;
use Admin\Models\General_staff_notes_model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class NotificationsApi extends Controller
{
    public function count()
    {
        try {
            $user = AdminAuth::getUser();
            
            // If user has notifications disabled, return 0
            if ($user && !SettingsHelper::areOrderNotificationsEnabledForUser($user)) {
                return response()->json(['ok' => true, 'new' => 0]);
            }
            
            // Use the correct table name - notifications (Laravel will add ti_ prefix)
            $new = \Illuminate\Support\Facades\DB::table('notifications')->where('status', 'new')->count();
            return response()->json(['ok' => true, 'new' => $new]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request)
    {
        try {
            $user = AdminAuth::getUser();
            
            // If user has notifications disabled, return empty array
            if ($user && !SettingsHelper::areOrderNotificationsEnabledForUser($user)) {
                return response()->json(['ok' => true, 'items' => []]);
            }
            
            $status = $request->query('status', 'new');
            $limit  = min((int)$request->query('limit', 20), 50);

            // Use the correct table name - notifications (Laravel will add ti_ prefix) and match JavaScript expected format
            $rows = \Illuminate\Support\Facades\DB::table('notifications')
                ->when($status, fn($q) => $q->where('status', $status))
                ->orderByDesc('created_at')
                ->limit($limit)
                ->get();

            return response()->json(['ok' => true, 'items' => $rows]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $status = $request->input('status', 'seen');
            
            // Use the correct table name - notifications (Laravel will add ti_ prefix)
            \Illuminate\Support\Facades\DB::table('notifications')->where('id', $id)->update([
                'status'     => $status,
                'updated_at' => now(),
            ]);
            
            return response()->json(['ok' => true, 'id' => (int)$id, 'status' => $status]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function markAllSeen()
    {
        try {
            // Use the correct table name - notifications (Laravel will add ti_ prefix)
            \Illuminate\Support\Facades\DB::table('notifications')->where('status', 'new')->update([
                'status' => 'seen', 
                'seen_at' => now(),
                'updated_at' => now()
            ]);
            return response()->json(['ok' => true]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create general staff note
     */
    public function createGeneralStaffNote(Request $request)
    {
        try {
            $request->validate([
                'note' => 'required|string|max:5000'
            ]);

            $noteText = $request->input('note');
            $user = AdminAuth::getUser();
            $staffId = $user ? $user->staff_id : null;

            DB::beginTransaction();

            // Check if general_staff_notes table exists
            // Try both with and without ti_ prefix
            $dbName = DB::connection()->getDatabaseName();
            $tableName = null;
            
            // Simple approach: try both table names directly
            $possibleTables = ['ti_general_staff_notes', 'general_staff_notes'];
            
            foreach ($possibleTables as $possibleTable) {
                try {
                    // Quick test: try to select from the table (will fail if it doesn't exist)
                    DB::table($possibleTable)->limit(0)->get();
                    $tableName = $possibleTable;
                    break;
                } catch (\Exception $e) {
                    // Table doesn't exist, try next one
                    continue;
                }
            }
            
            // If table doesn't exist, create it automatically
            if (empty($tableName)) {
                try {
                    // Determine which table name to use (check if ti_ prefix is used)
                    $notificationsTable = DB::select("
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = ? 
                        AND table_name IN ('notifications', 'ti_notifications')
                        LIMIT 1
                    ", [$dbName]);
                    
                    $usePrefix = false;
                    if (!empty($notificationsTable)) {
                        $firstTable = $notificationsTable[0];
                        $notifTableName = null;
                        if (is_object($firstTable)) {
                            $notifTableName = $firstTable->table_name ?? $firstTable->TABLE_NAME ?? null;
                        } elseif (is_array($firstTable)) {
                            $notifTableName = $firstTable['table_name'] ?? $firstTable['TABLE_NAME'] ?? null;
                        }
                        if ($notifTableName) {
                            $usePrefix = (strpos($notifTableName, 'ti_') === 0);
                        }
                    }
                    
                    $tableName = $usePrefix ? 'ti_general_staff_notes' : 'general_staff_notes';
                    
                    // Create the table
                    DB::statement("
                        CREATE TABLE IF NOT EXISTS `{$tableName}` (
                            `note_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
                            `staff_id` bigint(20) unsigned DEFAULT NULL,
                            `note` text NOT NULL,
                            `status` enum('active','archived') NOT NULL DEFAULT 'active',
                            `created_at` timestamp NULL DEFAULT NULL,
                            `updated_at` timestamp NULL DEFAULT NULL,
                            PRIMARY KEY (`note_id`),
                            KEY `idx_staff_id` (`staff_id`),
                            KEY `idx_status` (`status`),
                            KEY `idx_created_at` (`created_at`)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    ");
                    
                    Log::info('Auto-created general_staff_notes table', [
                        'table' => $tableName,
                        'database' => $dbName
                    ]);
                } catch (\Exception $e) {
                    DB::rollBack();
                    Log::error('Failed to auto-create general_staff_notes table', [
                        'database' => $dbName,
                        'error' => $e->getMessage()
                    ]);
                    return response()->json([
                        'ok' => false,
                        'error' => 'Failed to create table. Please run the SQL migration file (2PRODUCTION_GENERAL_STAFF_NOTE_SETUP.sql) manually.',
                        'database' => $dbName,
                        'error_details' => config('app.debug') ? $e->getMessage() : null
                    ], 500);
                }
            }

            // Final safety check: ensure tableName is set
            if (empty($tableName)) {
                DB::rollBack();
                Log::error('tableName is still null after all checks', [
                    'database' => $dbName
                ]);
                return response()->json([
                    'ok' => false,
                    'error' => 'Unable to determine table name. Please contact support.',
                    'database' => $dbName
                ], 500);
            }

            // Create the general staff note directly using DB to avoid model issues
            try {
                $noteId = DB::table($tableName)->insertGetId([
                    'staff_id' => $staffId,
                    'note' => $noteText,
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Failed to insert general staff note', [
                    'table' => $tableName,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }

            // Get tenant ID (try to get from current database context)
            $tenantId = 1; // Default
            try {
                $currentDb = DB::connection()->getDatabaseName();
                if (preg_match('/tenant_(\d+)_db/', $currentDb, $matches)) {
                    $tenantId = (int) $matches[1];
                }
            } catch (\Exception $e) {
                // Use default
            }

            // Create notification for general staff note
            try {
                $notificationId = NotificationHelper::createGeneralStaffNoteNotification([
                    'tenant_id' => $tenantId,
                    'staff_id' => $staffId,
                    'note' => $noteText,
                ]);

                Log::info('General staff note created', [
                    'note_id' => $noteId,
                    'notification_id' => $notificationId,
                    'staff_id' => $staffId
                ]);
            } catch (\Exception $e) {
                // Log notification error but don't fail the note creation
                Log::warning('Failed to create general staff note notification', [
                    'note_id' => $noteId,
                    'error' => $e->getMessage()
                ]);
            }

            DB::commit();

            return response()->json([
                'ok' => true,
                'message' => 'Note added successfully!',
                'note_id' => $noteId
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
                'errors' => $e->errors()
            ], 422);
        } catch (\Throwable $e) {
            DB::rollBack();
            
            $errorDetails = [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'database' => DB::connection()->getDatabaseName(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
            ];
            
            Log::error('Failed to create general staff note', $errorDetails);
            
            // Check if it's a table doesn't exist error
            $errorMessage = $e->getMessage();
            if (stripos($errorMessage, "doesn't exist") !== false || 
                stripos($errorMessage, "Table") !== false && stripos($errorMessage, "not found") !== false) {
                $errorMessage = 'general_staff_notes table does not exist. Please run the SQL migration file (2PRODUCTION_GENERAL_STAFF_NOTE_SETUP.sql) first.';
            } elseif (!config('app.debug')) {
                $errorMessage = 'Failed to save note. Please try again.';
            }
            
            return response()->json([
                'ok' => false,
                'error' => $errorMessage,
                'debug' => config('app.debug') ? $errorDetails : null
            ], 500);
        }
    }

    /**
     * Get note suggestion sentences from panel settings
     * 
     * TastyIgniter stores settings using SettingStore which uses array_dot() to flatten data.
     * Repeater fields are stored as: note_suggestion_sentences.0.sentence, note_suggestion_sentences.1.sentence, etc.
     */
    public function getNoteSuggestions()
    {
        try {
            $suggestions = [];
            
            // TastyIgniter stores core settings in settings table with sort='config'
            // Settings are flattened using array_dot(), so repeater data looks like:
            // note_suggestion_sentences.0.sentence => 'text1'
            // note_suggestion_sentences.1.sentence => 'text2'
            try {
                $settings = DB::table('settings')
                    ->where('sort', 'config')
                    ->where('item', 'like', 'note_suggestion_sentences.%')
                    ->get();
                
                if ($settings && $settings->count() > 0) {
                    // Group by index and extract sentences
                    $indexedData = [];
                    foreach ($settings as $setting) {
                        // Parse item like "note_suggestion_sentences.1.sentence" or "note_suggestion_sentences.2.sentence"
                        if (preg_match('/^note_suggestion_sentences\.(\d+)\.sentence$/', $setting->item, $matches)) {
                            $index = (int)$matches[1];
                            
                            // Get value - handle serialized and non-serialized
                            $value = $setting->value;
                            if (isset($setting->serialized) && $setting->serialized) {
                                $unserialized = @unserialize($value);
                                if ($unserialized !== false) {
                                    $value = $unserialized;
                                }
                            }
                            
                            // Only add non-empty string values
                            if (is_string($value) && !empty(trim($value))) {
                                $indexedData[$index] = trim($value);
                            }
                        }
                    }
                    
                    // Sort by index and add to suggestions (maintain order)
                    ksort($indexedData);
                    $suggestions = array_values($indexedData);
                    
                    Log::info('Note suggestions loaded from settings table', [
                        'count' => count($suggestions),
                        'suggestions' => $suggestions
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('Error reading settings table for suggestions', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
            
            // Fallback: Try extension_settings table (if panel uses SettingsModel)
            if (empty($suggestions)) {
                try {
                    $extensionSettings = DB::table('extension_settings')
                        ->where('item', 'core.panel')
                        ->first();
                    
                    if ($extensionSettings && $extensionSettings->data) {
                        $data = is_string($extensionSettings->data) 
                            ? json_decode($extensionSettings->data, true)
                            : $extensionSettings->data;
                        
                        if (is_array($data) && isset($data['note_suggestion_sentences'])) {
                            $repeaterData = $data['note_suggestion_sentences'];
                            
                            if (is_array($repeaterData)) {
                                foreach ($repeaterData as $item) {
                                    if (is_array($item) && isset($item['sentence']) && !empty(trim($item['sentence']))) {
                                        $suggestions[] = trim($item['sentence']);
                                    }
                                }
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning('Error reading extension_settings for suggestions', [
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            // Return default suggestions only if NO custom suggestions found
            if (empty($suggestions)) {
                $suggestions = [
                    'Please check table',
                    'Customer needs assistance',
                    'Order ready for pickup',
                    'Special request from customer',
                    'Table needs cleaning'
                ];
            }
            
            return response()->json([
                'ok' => true,
                'suggestions' => $suggestions
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to get note suggestions', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Return default suggestions on error
            return response()->json([
                'ok' => true,
                'suggestions' => [
                    'Please check table',
                    'Customer needs assistance',
                    'Order ready for pickup',
                    'Special request from customer',
                    'Table needs cleaning'
                ]
            ]);
        }
    }
}
