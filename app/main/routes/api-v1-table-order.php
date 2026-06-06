<?php

                Route::get('/table-order-draft', function (\Illuminate\Http\Request $request) use ($ensureTableOrderDraftTable, $resolveTableDraftContext, $formatTableOrderResponse, $findActiveSubmittedTableOrder) {
                    $ensureTableOrderDraftTable();
                    $context = $resolveTableDraftContext($request);
                    if (($context['table_id'] ?? '') === '' && ($context['table_no'] ?? '') === '' && ($context['qr'] ?? '') === '') {
                        return response()->json(['success' => false, 'error' => 'table_id, table_no, or qr is required'], 422);
                    }
                    $draft = DB::table('pmd_table_order_drafts')
                        ->where('status', 'draft')
                        ->where(function ($q) use ($context) {
                            if (($context['table_id'] ?? '') !== '') $q->orWhere('table_id', $context['table_id']);
                            if (($context['table_no'] ?? '') !== '') $q->orWhere('table_no', $context['table_no']);
                            if (($context['qr'] ?? '') !== '') $q->orWhere('qr', $context['qr']);
                        })
                        ->orderByDesc('id')
                        ->first();
                    if ($draft) return $formatTableOrderResponse($draft, null, $context);
                    $order = $findActiveSubmittedTableOrder($context);
                    return $formatTableOrderResponse(null, $order, $context);
                });

                Route::post('/table-order-draft/confirm-items', function (\Illuminate\Http\Request $request) use ($ensureTableOrderDraftTable, $resolveTableDraftContext, $normalizeDraftItems, $formatTableOrderResponse) {
                    $ensureTableOrderDraftTable();
                    $request->validate(['guest_session_id' => 'required|string|max:191', 'items' => 'required|array|min:1']);
                    $context = $resolveTableDraftContext($request);
                    $items = $normalizeDraftItems((array)$request->input('items', []));
                    if (empty($items)) return response()->json(['success' => false, 'error' => 'No valid menu items'], 422);
                    $draft = DB::transaction(function () use ($context, $items) {
                        $query = DB::table('pmd_table_order_drafts')->where('status', 'draft')->where(function ($q) use ($context) {
                            if (($context['table_id'] ?? '') !== '') $q->orWhere('table_id', $context['table_id']);
                            if (($context['table_no'] ?? '') !== '') $q->orWhere('table_no', $context['table_no']);
                            if (($context['qr'] ?? '') !== '') $q->orWhere('qr', $context['qr']);
                        });
                        $draft = $query->lockForUpdate()->orderByDesc('id')->first();
                        $payload = $draft ? (json_decode((string)$draft->payload, true) ?: []) : [];
                        $existing = is_array($payload['items'] ?? null) ? $payload['items'] : [];
                        $merged = array_values(array_merge($existing, $items));
                        $data = [
                            'table_id' => $context['table_id'] ?: null,
                            'table_no' => $context['table_no'] ?: null,
                            'table_name' => $context['table_name'] ?: null,
                            'qr' => $context['qr'] ?: null,
                            'status' => 'draft',
                            'payload' => json_encode(['items' => $merged], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
                            'updated_at' => now(),
                        ];
                        if ($draft) {
                            DB::table('pmd_table_order_drafts')->where('id', $draft->id)->update($data);
                            return DB::table('pmd_table_order_drafts')->where('id', $draft->id)->first();
                        }
                        $data['created_at'] = now();
                        $id = DB::table('pmd_table_order_drafts')->insertGetId($data);
                        return DB::table('pmd_table_order_drafts')->where('id', $id)->first();
                    });
                    return $formatTableOrderResponse($draft, null, $context);
                });

                Route::post('/table-order-draft/submit', function (\Illuminate\Http\Request $request) use ($ensureTableOrderDraftTable, $resolveTableDraftContext, $formatTableOrderResponse, $findActiveSubmittedTableOrder) {
                    $ensureTableOrderDraftTable();
                    $context = $resolveTableDraftContext($request);
                    $draftId = (int)$request->input('draft_id', 0);
                    $orderId = null;
                    $draft = null;
                    DB::transaction(function () use (&$draft, &$orderId, $draftId, $context, $request) {
                        $query = DB::table('pmd_table_order_drafts')->where('status', 'draft');
                        if ($draftId > 0) $query->where('id', $draftId); else $query->where(function ($q) use ($context) {
                            if (($context['table_id'] ?? '') !== '') $q->orWhere('table_id', $context['table_id']);
                            if (($context['table_no'] ?? '') !== '') $q->orWhere('table_no', $context['table_no']);
                            if (($context['qr'] ?? '') !== '') $q->orWhere('qr', $context['qr']);
                        });
                        $draft = $query->lockForUpdate()->orderByDesc('id')->first();
                        if (!$draft) return;
                        $payload = json_decode((string)$draft->payload, true) ?: [];
                        $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
                        if (empty($items)) return;
                        // PMD_TABLE_ORDER_VAT_TOTALS_SUBMIT_SCOPE_20260604
                        // Table-order submit source of truth:
                        // item subtotal already includes priced options from frontend payload.
                        // We add VAT rows here so Admin / Order Status / Payment / Split all read the same totals.
                        $resolvedTotals = pmd_table_order_calculate_totals($items);
                        $itemsSubtotal = (float)$resolvedTotals['subtotal'];
                        $taxAmount = (float)$resolvedTotals['tax'];
                        $total = (float)$resolvedTotals['total'];
                        $orderNumber = (int)DB::table('orders')->max('order_id') + 1;
                        $comment = trim('Table Draft Basket | Table ID: '.($context['table_id'] ?? '').' | Table: '.(($context['table_name'] ?? '') ?: ($context['table_no'] ?? '')).' | [table_draft_id:'.$draft->id.']'.($request->input('guest_session_id') ? ' | [submitted_by:'.$request->input('guest_session_id').']' : ''), ' |');
                        $insert = [
                            'order_id' => $orderNumber,
                            'first_name' => 'Table',
                            'last_name' => 'Customer',
                            'email' => '',
                            'telephone' => '',
                            'location_id' => (int)(($context['table']->location_id ?? null) ?: $request->input('location_id', 1)),
                            'order_type' => (string)(($context['table_id'] ?? '') ?: ($context['table_no'] ?? 'table')),
                            'order_total' => round($total, 4),
                            'order_date' => now()->format('Y-m-d'),
                            'order_time' => now()->format('H:i:s'),
                            'status_id' => 1,
                            'comment' => $comment,
                            'processed' => 1,
                            'payment' => 'qr_pay_later',
                            'total_items' => array_sum(array_map(fn($i) => (int)($i['quantity'] ?? 1), $items)),
                            'ip_address' => $request->ip(),
                            'user_agent' => $request->userAgent() ?? 'API Client',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                        if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settlement_status')) $insert['settlement_status'] = 'unpaid';
                        if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settled_amount')) $insert['settled_amount'] = 0;
                        $orderId = DB::table('orders')->insertGetId($insert);
                        foreach ($items as $item) {
                            DB::table('order_menus')->insert([
                                'order_id' => $orderId,
                                'menu_id' => (int)($item['menu_id'] ?? 0),
                                'name' => (string)($item['name'] ?? 'Item'),
                                'quantity' => max(1, (int)($item['quantity'] ?? 1)),
                                'price' => (float)($item['price'] ?? 0),
                                'subtotal' => (float)($item['subtotal'] ?? 0),
                                'comment' => '[guest_session:'.(string)($item['guest_session_id'] ?? '').']',
                                'option_values' => !empty($item['options']) ? json_encode($item['options'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) : null,
                            ]);
                        }
                        $totalsRows = array_map(function ($row) use ($orderId) {
                            return array_merge(['order_id' => $orderId], $row);
                        }, $resolvedTotals['rows']);

                        DB::table('order_totals')->insert($totalsRows);
                        DB::table('pmd_table_order_drafts')->where('id', $draft->id)->update(['status' => 'submitted', 'order_id' => $orderId, 'updated_at' => now()]);
                        try {
                            DB::table('notifications')->insert(['type' => 'order', 'title' => 'New table order #'.$orderId, 'table_id' => (int)($context['table_id'] ?: 0), 'table_name' => (string)(($context['table_name'] ?? '') ?: ($context['table_no'] ?? '')), 'payload' => json_encode(['order_id' => $orderId, 'draft_id' => (int)$draft->id]), 'status' => 'new', 'created_at' => now(), 'updated_at' => now()]);
                        } catch (\Throwable $ignored) {}
                    });
                    if (!$orderId) {
                        $existing = $findActiveSubmittedTableOrder($context);
                        if ($existing) return $formatTableOrderResponse(null, $existing, $context);
                        return response()->json(['success' => false, 'error' => 'No draft items to submit'], 422);
                    }
                    $order = DB::table('orders')->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')->where('orders.order_id', $orderId)->first(['orders.*', 'statuses.status_name']);
                    return $formatTableOrderResponse(null, $order, $context);
                });


                function syncOrderToPOS($orderId)
                {
                    try {
                        $order = DB::table('orders')->where('order_id', $orderId)->first();
                        $items = DB::table('order_menus')->where('order_id', $orderId)->get();

                        if (!$order) {
                            \Log::warning('API: Order not found for POS sync', ['order_id' => $orderId]);
                            return;
                        }

                        $configs = \Admin\Models\Pos_configs_model::with('devices')->get();

                        if ($configs->isEmpty()) {
                            \Log::warning('API: No POS configs found');
                            return;
                        }

                        // Recriar payloads
                        $squarePayload     = formatOrderForSquareAPI($order, $items);
                        $cloverPayload     = formatOrderForCloverAPI($order, $items);
                        $lightspeedPayload = formatOrderForLightspeedAPI($order, $items);

                        $baseUrl = 'https://api.ready2order.com/v1';

                        foreach ($configs as $config) {

                            $device      = $config->devices;
                            $posCode     = strtolower($device->code ?? '');
                            $accessToken = $config->access_token ?? null;

                            if (!$posCode || !$accessToken) continue;

                            $url = null;
                            $payload = null;

                            // PMD_ORACLE_SIMPHONY_PUSH_GUARD
                            if ($posCode === 'oracle_simphony') {
                                $isOraclePlaceholder =
                                    ($config->url ?? '') === 'https://placeholder.oracle.simphony.api'
                                    || ($config->username ?? '') === 'CLIENT_ID_PLACEHOLDER'
                                    || ($config->access_token ?? '') === 'CLIENT_SECRET_PLACEHOLDER'
                                    || ($config->id_application ?? '') === 'ORACLE_ORG_OR_GATEWAY_PLACEHOLDER';

                                if ($isOraclePlaceholder) {
                                    \Log::warning('API: Oracle Simphony push skipped - placeholder config', [
                                        'order_id' => $orderId,
                                        'config_id' => $config->config_id ?? null,
                                    ]);
                                    continue;
                                }
                            }

                            switch ($posCode) {
                                case 'square':
                                    $url = "$baseUrl/api/pos/square/order/create";
                                    $payload = $squarePayload;
                                    break;

                                case 'clover':
                                    $url = "$baseUrl/api/pos/clover/order/create";
                                    if (!empty($config->id_application)) {
                                        $url .= '?merchantId=' . urlencode($config->id_application);
                                    }
                                    $payload = $cloverPayload;
                                    break;

                                case 'lightspeed':
                                    $url = "$baseUrl/api/pos/lightspeed/order/create";
                                    if (!empty($config->id_application)) {
                                        $url .= '?domainPrefix=' . urlencode($config->id_application);
                                    }
                                    $payload = $lightspeedPayload;
                                    break;


                                // PMD_HELLOCASH_SYNC_ORDER_START
                                case 'hellocash':
                                // PMD_HYPERSOFT_SYNC_ORDER_START
                                case 'hypersoft':
                                    $baseUrl = trim((string)($config->url ?? ''));
                                    $cusToken = trim((string)($config->username ?? ''));
                                    $authToken = trim((string)($config->access_token ?? ''));

                                    $isPlaceholder =
                                        $baseUrl === '' ||
                                        str_contains($baseUrl, 'placeholder.hypersoft') ||
                                        $cusToken === '' ||
                                        $cusToken === 'CUS_TOKEN_PLACEHOLDER' ||
                                        $authToken === '' ||
                                        $authToken === 'AUTH_TOKEN_PLACEHOLDER';

                                    if ($isPlaceholder) {
                                        \Log::warning('API: Hypersoft sync skipped - placeholder config', [
                                            'order_id' => $orderId,
                                            'pos' => 'hypersoft',
                                            'config_id' => $config->config_id ?? null,
                                        ]);
                                        continue 2;
                                    }

                                    \Log::warning('API: Hypersoft sync skipped - live connector not finalized yet', [
                                        'order_id' => $orderId,
                                        'pos' => 'hypersoft',
                                        'config_id' => $config->config_id ?? null,
                                    ]);
                                    continue 2;

                                    $url = rtrim(($config->url ?? 'https://api.hellocash.business/api/v1'), '/') . '/invoices';
                                    $payload = formatOrderForHelloCashAPI($order, $items, $config);
                                    break;
                                // PMD_HELLOCASH_SYNC_ORDER_END

                                default:
                                    continue 2;
                            }

                            $response = Http::withToken($accessToken)
                                ->acceptJson()
                                ->post($url, $payload);

                            \Log::info('API: POS sync sent', [
                                'order_id' => $orderId,
                                'pos'      => $posCode,
                                'status'   => $response->status(),
                                'response' => $response->json()
                            ]);
                        }

                    } catch (\Exception $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
                        \Log::error('API: POS sync failed', [
                            'order_id' => $orderId,
                            'error'    => $e->getMessage()
                        ]);
                    }
                }


                // PMD_HELLOCASH_FORMATTER_START
                function formatOrderForHelloCashAPI($order, $items, $config)
                {
                    $cashierId = trim((string)($config->username ?? ''));

                    if ($cashierId === '') {
                        throw new \RuntimeException('helloCash requires cashier_id in pos_configs.username');
                    }

                    $helloItems = collect($items)->map(function ($item) {
                        $name = trim((string)($item->name ?? 'POS Item'));

                        $quantity = (float)($item->quantity ?? 1);
                        if ($quantity <= 0) {
                            $quantity = 1;
                        }

                        $price = round((float)($item->price ?? 0), 2);

                        $taxRate = null;
                        foreach (['tax_rate', 'tax', 'vat', 'menu_tax', 'item_tax_rate'] as $field) {
                            if (isset($item->$field) && $item->$field !== null && $item->$field !== '') {
                                $taxRate = (string)$item->$field;
                                break;
                            }
                        }

                        if ($taxRate === null) {
                            $taxRate = '19';
                        }

                        return [
                            'item_name'     => $name,
                            'item_quantity' => number_format($quantity, 3, '.', ''),
                            'item_price'    => number_format($price, 2, '.', ''),
                            'item_taxRate'  => (string)$taxRate,
                        ];
                    })->filter(function ($row) {
                        return trim((string)($row['item_name'] ?? '')) !== '';
                    })->values()->toArray();

                    if (empty($helloItems)) {
                        throw new \RuntimeException('helloCash payload has no items');
                    }

                    return [
                        'invoice_testMode' => true,
                        'cashier_id'       => $cashierId,
                        'items'            => $helloItems,
                    ];
                }
                // PMD_HELLOCASH_FORMATTER_END

                function formatOrderForSquareAPI($order, $items)
                {
                    return [
                        'order_id' => $order->order_id,
                        'location_id' => null,
                        'customer' => [
                            'name'  => $order->first_name,
                            'email' => $order->email,
                        ],
                        'total_money' => [
                            'amount'   => intval($order->order_total * 100),
                            'currency' => 'USD',
                        ],
                        'line_items' => collect($items)->map(function ($item) {
                            return [
                                'name' => $item->name,
                                'quantity' => strval($item->quantity),
                                'base_price_money' => [
                                    'amount'   => intval($item->price * 100),
                                    'currency' => 'USD',
                                ],
                            ];
                        })->toArray(),
                        'created_at' => now()->toIso8601String(),
                        'provider'   => 'square',
                    ];
                }

                function formatOrderForCloverAPI($order, $items)
                {
                    return [
                        'order_id' => $order->order_id,
                        'customer' => [
                            'name'  => $order->first_name,
                            'email' => $order->email,
                        ],
                        'line_items' => collect($items)->map(function ($item) {
                            return [
                                'name'     => $item->name,
                                'price'    => intval($item->price * 100),
                                'quantity' => (int) $item->quantity,
                            ];
                        })->toArray(),
                        'created_at' => now()->toIso8601String(),
                        'provider'   => 'clover',
                    ];
                }

                function formatOrderForLightspeedAPI($order, $items)
                {
                    return [
                        'payload' => [
                            'id' => (string) $order->order_id,
                            'totals' => [
                                'total_price' => (float) $order->order_total,
                            ],
                            'register_sale_products' => collect($items)->map(function ($item) {
                                return [
                                    'name'        => $item->name,
                                    'quantity'    => (int)$item->quantity,
                                    'price'       => (float)$item->price,
                                    'price_total' => $item->quantity * $item->price,
                                ];
                            })->toArray(),
                            'created_at' => now()->toIso8601String(),
                        ],
                        'provider' => 'lightspeed',
                    ];
                }

                // Orders endpoint

