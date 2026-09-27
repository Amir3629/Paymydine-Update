<?php

                // Table info endpoint
                Route::get('/table-info', function () {
                    try {
                        $table_id = request()->query('table_id');
                        $table_no = request()->query('table_no');
                        $qr_code = request()->query('qr_code');
                        $qr = request()->query('qr'); // Legacy support

                        // Priority order: qr_code  table_no  table_id
                        if ($qr_code) {
                            $table = DB::table('tables')->where('qr_code', $qr_code)->first();
                        } elseif ($qr) {
                            $table = DB::table('tables')->where('qr_code', $qr)->first();
                        } elseif ($table_no) {
                            $table = DB::table('tables')->where('table_no', $table_no)->first();
                        } elseif ($table_id) {
                            $table = DB::table('tables')->where('table_id', $table_id)->first();
                        } else {
                            return response()->json([
                                'success' => false,
                                'error' => 'table_id, table_no, or qr_code is required'
                            ], 400);
                        }

                        if (!$table) {
                            return response()->json([
                                'success' => false,
                                'error' => 'Table not found'
                            ], 404);
                        }

                        // PMD_TABLE_INFO_RESOLVED_LOCATION_R35
                        // Use the table we actually resolved (QR/table_no/table_id),
                        // not only the optional table_id query parameter.
                        $location = DB::table('locationables')
                            ->where('locationable_id', (int)($table->table_id ?? 0))
                            ->where('locationable_type', 'tables')
                            ->first();

                        $location_id = $location ? $location->location_id : 1;

                        return response()->json([
                            'success' => true,
                            'data' => [
                                'table_id' => $table->table_id,
                                'table_no' => $table->table_no,
                                'table_name' => $table->table_name,
                                'location_id' => $location_id,
                                'qr_code' => $table->qr_code,
                                'min_capacity' => $table->min_capacity,
                                'max_capacity' => $table->max_capacity,
                                'status' => $table->table_status
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
                            'error' => 'Internal server error: ' . $e->getMessage()
                        ], 500);
                    }
                });

                /*
                 * PMD_PREPARED_TABLE_QR_ENTRY_R35
                 *
                 * A QR may be printed before the table row exists. The QR points
                 * here permanently. Before Save we show a calm not-active-yet
                 * page; after Save the exact same QR redirects to the customer
                 * menu and includes the canonical Tables_model qr_code when one
                 * is available.
                 */
                Route::get('/table-entry', function () {
                    $tableNo = trim((string)request()->query('table_no', ''));
                    $locationId = max(0, (int)request()->query('location', 0));
                    $guest = max(1, min(999, (int)request()->query('guest', 1)));

                    if ($tableNo === '' || !ctype_digit($tableNo) || (int)$tableNo < 1) {
                        return response('Invalid table number.', 422)
                            ->header('Content-Type', 'text/plain; charset=UTF-8');
                    }

                    $table = DB::table('tables')
                        ->where('table_no', (int)$tableNo)
                        ->first();

                    if (!$table) {
                        $safeTableNo = e($tableNo);
                        $html = '<!doctype html><html><head><meta charset="utf-8">'
                            .'<meta name="viewport" content="width=device-width,initial-scale=1">'
                            .'<title>Table not active yet</title>'
                            .'<style>html,body{margin:0;min-height:100%;font-family:Arial,Helvetica,sans-serif;background:#f4faf7;color:#173b32}'
                            .'body{min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}'
                            .'.c{width:min(440px,100%);box-sizing:border-box;padding:30px;border:1px solid #d8e8e1;border-radius:22px;background:#fff;box-shadow:0 18px 48px rgba(7,92,71,.10);text-align:center}'
                            .'img{display:block;width:64px;height:64px;object-fit:contain;margin:0 auto 18px}'
                            .'h1{margin:0 0 10px;font-size:23px;line-height:1.2}p{margin:0;color:#60756f;line-height:1.55;font-size:15px}'
                            .'.n{display:inline-block;margin-top:18px;padding:8px 13px;border-radius:14px;background:#eef7f3;color:#075c47;font-weight:800}</style>'
                            .'</head><body><main class="c"><img src="/brand/paymydine-logo.svg" alt="PayMyDine">'
                            .'<h1>This table is not active yet</h1>'
                            .'<p>Please ask a staff member to finish setting up this table.</p>'
                            .'<span class="n">Table '.$safeTableNo.'</span></main></body></html>';

                        return response($html, 404)
                            ->header('Content-Type', 'text/html; charset=UTF-8')
                            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
                    }

                    $targetParams = [
                        'location' => $locationId,
                        'guest' => $guest,
                        'table_no' => $tableNo,
                        'table' => $tableNo,
                    ];

                    $qrCode = trim((string)($table->qr_code ?? ''));
                    if ($qrCode !== '') {
                        $targetParams['qr'] = $qrCode;
                    }

                    return redirect(
                        '/table/'.rawurlencode($tableNo).'?'.http_build_query($targetParams),
                        302
                    );
                });

