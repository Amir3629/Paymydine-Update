<?php

/*
 * Gift Card & Voucher API Routes
 * Add these routes to your main routes file
 */

use Admin\Models\Coupons_model;
use Admin\Models\GiftCardTransaction_model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

// Validate gift card or voucher
Route::post('/validate-gift-card', function (Request $request) {
    try {
        $code = strtoupper(trim($request->input('code', '')));
        $amount = floatval($request->input('amount', 0));
        
        if (empty($code)) {
            return response()->json([
                'success' => false,
                'message' => 'Gift card code is required'
            ]);
        }
        
        // Find gift card by code
        $giftCard = DB::table('igniter_coupons')
            ->where('code', $code)
            ->whereIn('card_type', ['gift_card', 'voucher', 'credit', 'comp'])
            ->where('status', 1)
            ->first();
        
        if (!$giftCard) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid gift card code'
            ]);
        }
        
        // Check expiry
        if ($giftCard->expiry_date && now()->greaterThan($giftCard->expiry_date)) {
            return response()->json([
                'success' => false,
                'message' => 'This gift card has expired'
            ]);
        }
        
        // Check balance
        $currentBalance = floatval($giftCard->current_balance ?? 0);
        if ($currentBalance <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'This gift card has no remaining balance'
            ]);
        }
        
        // Calculate redemption amount
        $amountToRedeem = min($currentBalance, $amount);
        $balanceAfter = $currentBalance - $amountToRedeem;
        
        return response()->json([
            'success' => true,
            'data' => [
                'coupon_id' => $giftCard->coupon_id,
                'code' => $giftCard->code,
                'name' => $giftCard->name,
                'card_type' => $giftCard->card_type,
                'balance' => $currentBalance,
                'can_redeem' => true,
                'amount_to_redeem' => $amountToRedeem,
                'balance_after' => $balanceAfter,
                'is_partial' => $amountToRedeem < $amount,
            ]
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to validate gift card: ' . $e->getMessage()
        ]);
    }
});

// Check gift card balance
Route::get('/gift-card/balance/{code}', function ($code) {
    try {
        $code = strtoupper(trim($code));
        
        $giftCard = DB::table('igniter_coupons')
            ->where('code', $code)
            ->whereIn('card_type', ['gift_card', 'voucher', 'credit', 'comp'])
            ->first();
        
        if (!$giftCard) {
            return response()->json([
                'success' => false,
                'message' => 'Gift card not found'
            ]);
        }
        
        $isExpired = $giftCard->expiry_date && now()->greaterThan($giftCard->expiry_date);
        $isActive = $giftCard->status == 1 && !$isExpired;
        
        return response()->json([
            'success' => true,
            'data' => [
                'code' => $giftCard->code,
                'name' => $giftCard->name,
                'card_type' => $giftCard->card_type,
                'balance' => floatval($giftCard->current_balance ?? 0),
                'initial_balance' => floatval($giftCard->initial_balance ?? 0),
                'is_active' => $isActive,
                'is_expired' => $isExpired,
                'expiry_date' => $giftCard->expiry_date,
                'first_use_date' => $giftCard->first_use_date,
                'last_use_date' => $giftCard->last_use_date,
            ]
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to check balance: ' . $e->getMessage()
        ]);
    }
});

// Purchase gift card
Route::post('/gift-card/purchase', function (Request $request) {
    try {
        $amount = floatval($request->input('amount', 0));
        $recipientName = $request->input('recipient_name');
        $recipientEmail = $request->input('recipient_email');
        $message = $request->input('message');
        $designId = intval($request->input('design_id', 1));
        $paymentMethod = $request->input('payment_method', 'stripe');
        $customerId = $request->input('customer_id');
        
        if ($amount <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid amount'
            ]);
        }
        
        // Generate unique code
        $code = 'GC' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 10));
        
        // Create gift card
        $couponId = DB::table('igniter_coupons')->insertGetId([
            'name' => '$' . number_format($amount, 2) . ' Gift Card',
            'code' => $code,
            'card_type' => 'gift_card',
            'type' => 'F',
            'initial_balance' => $amount,
            'current_balance' => $amount,
            'is_purchasable' => true,
            'is_reloadable' => true,
            'is_transferable' => true,
            'purchase_price' => $amount,
            'purchased_by' => $customerId,
            'purchase_date' => now(),
            'recipient_name' => $recipientName,
            'recipient_email' => $recipientEmail,
            'recipient_message' => $message,
            'is_digital' => true,
            'design_id' => $designId,
            'status' => 1,
            'created_at' => now(),
            'updated_at' => now(),
            'validity' => 'forever',
            'apply_coupon_on' => 'whole_cart',
        ]);
        
        // Create purchase transaction
        DB::table('gift_card_transactions')->insert([
            'coupon_id' => $couponId,
            'customer_id' => $customerId,
            'transaction_type' => 'purchase',
            'amount' => $amount,
            'balance_before' => 0,
            'balance_after' => $amount,
            'payment_method' => $paymentMethod,
            'notes' => 'Gift card purchased',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Gift card purchased successfully',
            'data' => [
                'coupon_id' => $couponId,
                'code' => $code,
                'balance' => $amount,
                'recipient_name' => $recipientName,
                'recipient_email' => $recipientEmail,
            ]
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to purchase gift card: ' . $e->getMessage()
        ]);
    }
});

// Reload gift card
Route::post('/gift-card/reload', function (Request $request) {
    try {
        $code = strtoupper(trim($request->input('code', '')));
        $amount = floatval($request->input('amount', 0));
        $paymentMethod = $request->input('payment_method', 'stripe');
        $customerId = $request->input('customer_id');
        
        if (empty($code)) {
            return response()->json([
                'success' => false,
                'message' => 'Gift card code is required'
            ]);
        }
        
        if ($amount <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid reload amount'
            ]);
        }
        
        // Find gift card
        $giftCard = DB::table('igniter_coupons')
            ->where('code', $code)
            ->where('card_type', 'gift_card')
            ->where('status', 1)
            ->first();
        
        if (!$giftCard) {
            return response()->json([
                'success' => false,
                'message' => 'Gift card not found'
            ]);
        }
        
        if (!$giftCard->is_reloadable) {
            return response()->json([
                'success' => false,
                'message' => 'This gift card cannot be reloaded'
            ]);
        }
        
        $balanceBefore = floatval($giftCard->current_balance ?? 0);
        $balanceAfter = $balanceBefore + $amount;
        
        // Update balance
        DB::table('igniter_coupons')
            ->where('coupon_id', $giftCard->coupon_id)
            ->update([
                'current_balance' => $balanceAfter,
                'updated_at' => now(),
            ]);
        
        // Create reload transaction
        DB::table('gift_card_transactions')->insert([
            'coupon_id' => $giftCard->coupon_id,
            'customer_id' => $customerId,
            'transaction_type' => 'reload',
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'payment_method' => $paymentMethod,
            'notes' => 'Balance reloaded',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Gift card reloaded successfully',
            'data' => [
                'code' => $code,
                'balance_before' => $balanceBefore,
                'amount_added' => $amount,
                'balance_after' => $balanceAfter,
            ]
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to reload gift card: ' . $e->getMessage()
        ]);
    }
});

// Get gift card transactions
Route::get('/gift-card/transactions/{code}', function ($code) {
    try {
        $code = strtoupper(trim($code));
        
        $giftCard = DB::table('igniter_coupons')
            ->where('code', $code)
            ->whereIn('card_type', ['gift_card', 'voucher', 'credit', 'comp'])
            ->first();
        
        if (!$giftCard) {
            return response()->json([
                'success' => false,
                'message' => 'Gift card not found'
            ]);
        }
        
        $transactions = DB::table('gift_card_transactions')
            ->where('coupon_id', $giftCard->coupon_id)
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json([
            'success' => true,
            'data' => [
                'code' => $code,
                'current_balance' => floatval($giftCard->current_balance ?? 0),
                'transactions' => $transactions,
            ]
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to get transactions: ' . $e->getMessage()
        ]);
    }
});

// Get purchasable gift cards (for customer-facing page)
Route::get('/gift-cards/available', function () {
    try {
        $giftCards = DB::table('igniter_coupons')
            ->where('card_type', 'gift_card')
            ->where('is_purchasable', 1)
            ->where('status', 1)
            ->select([
                'coupon_id',
                'name',
                'description',
                'purchase_price',
                'design_id',
            ])
            ->orderBy('purchase_price')
            ->get();
        
        return response()->json([
            'success' => true,
            'data' => $giftCards
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to get gift cards: ' . $e->getMessage()
        ]);
    }
});

