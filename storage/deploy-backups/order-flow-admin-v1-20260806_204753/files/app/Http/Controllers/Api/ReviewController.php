<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
    public function store(Request $request)
    {
        if (!Schema::hasTable('reviews')) {
            return response()->json(['success' => false, 'error' => 'Reviews are not available for this tenant yet.'], 503);
        }

        $validator = Validator::make($request->all(), [
            'order_id' => ['nullable', 'integer', 'min:1'],
            'menu_id' => ['nullable', 'integer', 'min:1'],
            'customer_name' => ['nullable', 'string', 'max:120'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'review' => ['nullable', 'string', 'max:2000'],
            'comment' => ['nullable', 'string', 'max:2000'],
            'public_share_consent' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $orderId = $request->filled('order_id') ? (int)$request->input('order_id') : null;
        $menuId = $request->filled('menu_id') ? (int)$request->input('menu_id') : null;

        if ($orderId && (!Schema::hasTable('orders') || !DB::table('orders')->where('order_id', $orderId)->exists())) {
            return response()->json(['success' => false, 'error' => 'Order not found for this tenant.'], 422);
        }

        if ($menuId && (!Schema::hasTable('menus') || !DB::table('menus')->where('menu_id', $menuId)->exists())) {
            return response()->json(['success' => false, 'error' => 'Menu item not found for this tenant.'], 422);
        }

        $columns = Schema::getColumnListing('reviews');
        $rating = (int)$request->input('rating');
        $comment = trim((string)($request->input('comment', $request->input('review', ''))));
        $now = now();
        $payload = [];

        $map = [
            'order_id' => $orderId,
            'sale_id' => $orderId,
            'sale_type' => $orderId ? 'orders' : null,
            'menu_id' => $menuId,
            'customer_name' => $request->input('customer_name'),
            'author' => $request->input('customer_name'),
            'rating' => $rating,
            'quality' => $rating,
            'service' => $rating,
            'delivery' => $rating,
            'comment' => $comment !== '' ? $comment : null,
            'review_text' => $comment !== '' ? $comment : null,
            'status' => 'pending',
            'review_status' => 0,
            'source' => 'frontend',
            'public_share_consent' => $request->has('public_share_consent') ? $request->boolean('public_share_consent') : null,
            'tenant_host' => $request->getHost(),
            'created_at' => $now,
            'updated_at' => $now,
        ];

        foreach ($map as $column => $value) {
            if (in_array($column, $columns, true)) {
                $payload[$column] = $value;
            }
        }

        $reviewId = DB::table('reviews')->insertGetId($payload);

        return response()->json(['success' => true, 'message' => 'Review submitted for moderation.', 'data' => ['review_id' => $reviewId, 'status' => 'pending']], 201);
    }
}
