<?php

                // PMD_PUBLIC_API_V1_VALIDATE_COUPON_FIX
                // Public tenant-scoped coupon validation for Next.js customer frontend.
                Route::post('/validate-coupon', function (\Illuminate\Http\Request $request) {
                    try {
                        $code = strtoupper(trim((string)$request->input('code', '')));
                        $amount = (float)$request->input('amount', $request->input('subtotal', 0));

                        if ($code === '') {
                            return response()->json([
                                'success' => false,
                                'valid' => false,
                                'message' => 'Coupon code is required',
                            ]);
                        }

                        if (!\Illuminate\Support\Facades\Schema::hasTable('igniter_coupons')) {
                            return response()->json([
                                'success' => false,
                                'valid' => false,
                                'message' => 'Coupons are not available',
                            ]);
                        }

                        $query = \Illuminate\Support\Facades\DB::table('igniter_coupons')
                            ->where('code', $code);

                        if (\Illuminate\Support\Facades\Schema::hasColumn('igniter_coupons', 'status')) {
                            $query->where('status', 1);
                        }

                        if (\Illuminate\Support\Facades\Schema::hasColumn('igniter_coupons', 'card_type')) {
                            $query->where(function ($q) {
                                $q->where('card_type', 'coupon')
                                  ->orWhereNull('card_type')
                                  ->orWhere('card_type', '');
                            });
                        }

                        $coupon = $query->first();

                        if (!$coupon) {
                            return response()->json([
                                'success' => false,
                                'valid' => false,
                                'message' => 'Invalid coupon code',
                            ]);
                        }

                        $minTotal = isset($coupon->min_total) ? (float)$coupon->min_total : 0.0;
                        if ($minTotal > 0 && $amount < $minTotal) {
                            return response()->json([
                                'success' => false,
                                'valid' => false,
                                'message' => 'Minimum order total of €'.number_format($minTotal, 2).' required',
                            ]);
                        }

                        $type = strtoupper((string)($coupon->type ?? 'F'));
                        $rawDiscount = (float)($coupon->discount ?? 0);
                        $discount = 0.0;

                        if ($type === 'P') {
                            $discount = $amount * ($rawDiscount / 100);
                        } else {
                            $discount = $rawDiscount;
                        }

                        if (isset($coupon->max_discount_cap) && (float)$coupon->max_discount_cap > 0) {
                            $discount = min($discount, (float)$coupon->max_discount_cap);
                        }

                        $discount = max(0, min($discount, $amount));
                        $discount = round($discount, 2);

                        return response()->json([
                            'success' => true,
                            'valid' => true,
                            'message' => 'Coupon applied',
                            'code' => $code,
                            'discountType' => $type,
                            'discountAmount' => $type === 'F' ? $rawDiscount : null,
                            'discountPercent' => $type === 'P' ? $rawDiscount : null,
                            'finalDiscountAmount' => $discount,
                            'data' => [
                                'coupon_id' => $coupon->coupon_id ?? null,
                                'code' => $code,
                                'name' => $coupon->name ?? $code,
                                'type' => $type,
                                'discount' => $discount,
                                'discount_value' => $rawDiscount,
                                'min_total' => $minTotal,
                                'finalDiscountAmount' => $discount,
                            ],
                        ]);
                    } catch (\Throwable $e) {
                        \Log::error('PMD coupon validation failed', [
                            'message' => $e->getMessage(),
                            'file' => $e->getFile(),
                            'line' => $e->getLine(),
                            'payload' => $request->all(),
                        ]);

                        return response()->json([
                            'success' => false,
                            'valid' => false,
                            'message' => 'Failed to validate coupon',
                        ], 500);
                    }
                });

