<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

class History_model extends Model
{
    protected $table = 'notifications';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'type','title','table_id','table_name','payload','status','created_at','updated_at',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    /**
     * Format the type for display
     */
    public function getTypeAttribute($value)
    {
        if ($value === 'general_staff_note') {
            return 'Staff Note';
        }
        
        // Format other types: convert snake_case to Title Case
        return str_replace('_', ' ', ucwords($value, '_'));
    }

    /**
     * Format table_name to show staff name for general_staff_note
     */
    public function getTableNameAttribute($value)
    {
        // For general_staff_note, show staff name from payload
        $rawType = $this->attributes['type'] ?? $this->getOriginal('type') ?? '';
        if ($rawType === 'general_staff_note') {
            $p = $this->payload ?? [];
            $staffName = trim((string)($p['staff_name'] ?? ''));
            if ($staffName !== '') {
                return $staffName;
            }
        }
        
        // For other types, return the original value
        return $value;
    }

    public function getDetailsAttribute(): array
    {
        $p = $this->payload ?? [];

        // Use raw type attribute to avoid calling getTypeAttribute accessor
        $rawType = $this->attributes['type'] ?? $this->getOriginal('type') ?? '';

        switch ($rawType) {
            case 'waiter_call':
                $msg = trim((string)($p['message'] ?? ''));
                $full = $msg && $msg !== '.' ? $msg : 'Waiter Call';
                break;

            case 'table_note':
                $note = trim((string)($p['note'] ?? ''));
                $full = $note !== '' ? $note : 'Table Note';
                break;

            case 'staff_note':
                // For staff notes: show "Staff Note: [note text]"
                $note = trim((string)($p['note'] ?? ''));
                $orderId = $p['order_id'] ?? '';
                
                if ($note !== '') {
                    // Show the note text with Staff Note prefix
                    $full = 'Staff Note: ' . $note;
                } else {
                    // Fallback if note is empty
                    $full = $orderId ? "Staff Note for Order #{$orderId}" : 'Staff Note';
                }
                break;

            case 'valet_request':
                $name  = trim((string)($p['name'] ?? ''));
                $plate = trim((string)($p['license_plate'] ?? ''));
                $make  = trim((string)($p['car_make'] ?? ''));
                $parts = array_filter([$name, $plate, $make], fn($v) => $v !== '');
                $full = $parts ? ('Valet • '.implode(' • ', $parts)) : 'Valet Request';
                break;

            case 'order_status':
                $orderId = $p['order_id'] ?? 'Unknown';
                $statusName = $p['status_name'] ?? 'Unknown Status';
                $status = $p['status'] ?? '';
                
                // Create descriptive message based on status
                $statusMessages = [
                    'received' => 'New order received',
                    'preparation' => 'Order is being prepared',
                    'ready' => 'Order is ready for pickup',
                    'delivered' => 'Order has been delivered',
                    'cancelled' => 'Order was cancelled'
                ];
                
                $message = $statusMessages[$status] ?? "Order status changed to {$statusName}";
                $full = "Order #{$orderId} - {$message}";
                break;

            case 'table_move':
                // For table move: format as "Table X move to Table Y"
                $sourceTable = $p['source_table_name'] ?? '';
                $destTable = $p['dest_table_name'] ?? '';
                if ($sourceTable && $destTable) {
                    $full = $sourceTable . ' move to ' . $destTable;
                } else {
                    // Fallback to title if payload doesn't have the info
                    $full = $this->title ?: 'Table Move';
                }
                break;

            case 'stock_out':
                // For stock out: use the title directly (e.g., "Item name is not in stock anymore")
                $full = $this->title ?: 'Item stock status changed';
                break;

            case 'general_staff_note':
                // For general staff notes: show only the note text (no prefix)
                $note = trim((string)($p['note'] ?? ''));
                
                if ($note !== '') {
                    $full = $note;
                } else {
                    $full = 'Note';
                }
                break;

            default:
                $full = $this->title ?: ($p ? json_encode($p) : '');
        }

        // Normalize whitespace
        $full = preg_replace('/\s+/u', ' ', (string)$full);
        
        // Build preview (120 chars max)
        $preview = mb_strlen($full) <= 120 ? $full : mb_substr($full, 0, 120).'…';
        
        // Check if truncated (length > 120 OR unbroken run >= 30)
        $isTruncated = mb_strlen($full) > 120 || (bool)preg_match('/\S{30,}/u', $full);

        return [
            'preview'       => $preview,
            'full'          => $full,
            'is_truncated'  => $isTruncated,
            'metadata'      => [
                'type'    => $this->type,
                'table'   => $this->table_name,
                'created' => $this->created_at,
            ]
        ];
    }

}