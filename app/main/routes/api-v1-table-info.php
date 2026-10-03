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

                        // PMD_TABLE_ENABLE_DISABLE_R40
                        if (!(bool)($table->table_status ?? true)) {
                            return response()->json([
                                'success' => false,
                                'error' => 'This table is currently unavailable.',
                                'code' => 'table_disabled',
                                'table_disabled' => true,
                                'data' => [
                                    'table_id' => (int)($table->table_id ?? 0),
                                    'table_no' => $table->table_no ?? null,
                                    'table_name' => $table->table_name ?? null,
                                    'status' => false,
                                ],
                            ], 200);
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
                    // PMD_CUSTOMER_TABLE_ENTRY_FALLBACK_R43
                    // Printed QR codes land here before Frontend V2. Every invalid,
                    // missing, removed or disabled table therefore needs the same
                    // branded guest-safe UI here too; never leak plain framework
                    // 404/422/500 pages into the QR journey.
                    $renderGuestFallback = static function (
                        ?string $tableLabel = null,
                        bool $technicalError = false
                    ) {
                        $cleanTable = trim((string)$tableLabel);
                        $safeTable = $cleanTable !== '' ? e($cleanTable) : '';
                        $title = $technicalError
                            ? 'We could not open this menu'
                            : 'This table is not active';
                        $message = $technicalError
                            ? 'Please try again, or ask a staff member to guide you with ordering.'
                            : 'Please ask a staff member to guide you with ordering.';
                        // QR fallback is a real guest-facing destination,
                        // not a browser/framework error document. Keep HTTP 200 so
                        // reverse proxies cannot replace the branded page with their
                        // own 404/5xx body; expose the state in a response header.
                        $status = 200;
                        $guestState = $technicalError ? 'menu-error' : 'table-inactive';

                        $tableChip = $safeTable !== ''
                            ? '<span class="n">Table '.$safeTable.'</span>'
                            : '';

                        $html = '<!doctype html><html><head><meta charset="utf-8">'
                            .'<meta name="viewport" content="width=device-width,initial-scale=1">'
                            .'<title>'.e($title).'</title>'
                            .'<style>*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Inter,Arial,Helvetica,sans-serif;background:#f8fbf9;color:#16312a}'
                            .'body{min-height:100vh;display:grid;place-items:center;padding:24px}'
                            .'.c{width:min(460px,100%);padding:34px 30px 30px;border:1px solid #d7e6df;border-radius:28px;background:rgba(255,255,255,.96);box-shadow:0 24px 64px rgba(24,57,47,.10);text-align:center}'
                            .'img{display:block;width:74px;height:74px;object-fit:contain;margin:0 auto 20px}'
                            .'h1{margin:0;color:#143c31;font-size:28px;line-height:1.15;font-weight:850;letter-spacing:-.025em}'
                            .'p{margin:14px auto 0;max-width:34ch;color:#65756f;line-height:1.65;font-size:15px}'
                            .'.n{display:inline-flex;align-items:center;justify-content:center;min-height:42px;margin-top:22px;padding:0 17px;border:1px solid #cce3d9;border-radius:999px;background:#eff8f4;color:#075f4b;font-size:14px;font-weight:850}</style>'
                            .'</head><body><main class="c"><img src="/brand/paymydine-logo.svg" alt="PayMyDine">'
                            .'<h1>'.e($title).'</h1>'
                            .'<p>'.e($message).'</p>'
                            .$tableChip
                            .'</main></body></html>';

                        return response($html, $status)
                            ->header('Content-Type', 'text/html; charset=UTF-8')
                            ->header('X-PMD-Guest-State', $guestState)
                            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
                    };

                    $tableNo = trim((string)request()->query('table_no', ''));
                    $locationId = max(0, (int)request()->query('location', 0));
                    $guest = max(1, min(999, (int)request()->query('guest', 1)));

                    if ($tableNo === '' || !ctype_digit($tableNo) || (int)$tableNo < 1) {
                        return $renderGuestFallback(null, false);
                    }

                    try {
                        $table = DB::table('tables')
                            ->where('table_no', (int)$tableNo)
                            ->first();

                        // Missing/removed and deliberately disabled tables share
                        // the same guest-facing inactive state.
                        $tableInactive = !$table
                            || (
                                property_exists($table, 'table_status')
                                && !(bool)$table->table_status
                            );

                        if ($tableInactive) {
                            return $renderGuestFallback($tableNo, false);
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
                    } catch (\Throwable $error) {
                        report($error);
                        return $renderGuestFallback($tableNo, true);
                    }
                });

