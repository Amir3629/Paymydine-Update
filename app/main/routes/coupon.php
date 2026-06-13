<?php

        // Validate coupon code - same pattern as /vat-settings
        Route::post('/validate-coupon', function (\Illuminate\Http\Request $request) {
            try {
                $code = strtoupper(trim($request->input('code', '')));
                $subtotal = floatval($request->input('subtotal', $request->input('amount', 0)));

                if (empty($code)) {
                    return response()->json([
                        'success' => false,
                        'valid' => false,
                        'message' => 'Coupon code is required'
                    ]);
                }

                // Find coupon by code
                // Use 'igniter_coupons' - Laravel will automatically add the 'ti_' prefix
                $coupon = DB::table('igniter_coupons')
                    ->where('code', $code)
                    ->where('status', 1)
                    ->first();

                if (!$coupon) {
                    return response()->json([
                        'success' => false,
                        'valid' => false,
                        'message' => 'Invalid coupon code'
                    ]);
                }

                // Check minimum total requirement
                if ($coupon->min_total && $subtotal < $coupon->min_total) {
                    return response()->json([
                        'success' => false,
                        'valid' => false,
                        'message' => 'Minimum order total of $' . number_format($coupon->min_total, 2) . ' required'
                    ]);
                }

                // Calculate discount
                $discount = 0;
                if ($coupon->type === 'F') {
                    // Fixed amount
                    $discount = min(floatval($coupon->discount), $subtotal);
                } else {
                    // Percentage
                    $discount = $subtotal * (floatval($coupon->discount) / 100);
                }

                return response()->json([
                    'success' => true,
                    'valid' => true,
                    'message' => 'Coupon applied',
                    'code' => $coupon->code,
                    'discountAmount' => $coupon->type === 'F' ? floatval($coupon->discount) : null,
                    'discountPercent' => $coupon->type === 'P' ? floatval($coupon->discount) : null,
                    'discountType' => $coupon->type,
                    'finalDiscountAmount' => round($discount, 2),
                    'data' => [
                        'coupon_id' => $coupon->coupon_id,
                        'code' => $coupon->code,
                        'name' => $coupon->name,
                        'type' => $coupon->type,
                        'discount' => round($discount, 2),
                        'discount_value' => floatval($coupon->discount),
                        'min_total' => floatval($coupon->min_total ?? 0),
                    ]
                ]);
            } catch (Exception $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
                return response()->json([
                    'success' => false,
                    'valid' => false,
                    'message' => 'Failed to validate coupon: ' . $e->getMessage()
                ]);
            }
        });

