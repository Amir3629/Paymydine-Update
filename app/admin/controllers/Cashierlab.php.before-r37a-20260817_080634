<?php

namespace Admin\Controllers;

use Admin\Classes\PmdCleanWorkspaceControllerV1;
use Admin\Services\PmdCleanWorkspaceSharedV1;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Clean Cashier workspace:
 * shared shell + cashier finance KPIs + Floor + date-scoped real orders.
 *
 * PMD_CASHIER_LAB_REAL_DAY_ORDERS_V2
 * - selected business day/range uses canonical orders.order_date
 * - Berlin business timezone matches Dashboard2
 * - closed/paid orders are included (unlike V151 current_orders)
 * - V150/V151 remains the canonical table-reference resolver
 * - server-first; no browser data fetch/polling
 */
class Cashierlab extends PmdCleanWorkspaceControllerV1
{
    protected $requiredPermissions = 'Admin.Dashboard';

    private const PMD_TIMEZONE = 'Europe/Berlin';
    private const PMD_MAX_RANGE_DAYS = 90;

    public function __construct()
    {
        parent::__construct();
        $this->addCss('css/pmd-cashier-lab-orders-v1.css');
    }

    protected function pmdWorkspaceKey(): string
    {
        return 'cashier';
    }

    protected function pmdKpiMode(): string
    {
        return 'cashier';
    }

    protected function pmdKpiDefaults(): array
    {
        return [
            'open_bills',
            'average_settlement_time',
            'failed_transactions',
            'cash_percent',
        ];
    }

    protected function pmdAfterFloorPartial(): ?string
    {
        return 'admin::_partials.pmd_cashier_lab_current_orders_v1';
    }

    protected function pmdPrepareWorkspaceVars(
        PmdCleanWorkspaceSharedV1 $shared,
        string $locale,
        array $floorBootstrap
    ): void {
        $isGerman = strtolower($locale) === 'de';
        [$from, $to] = $this->pmdResolveDateRange();

        $source = new class extends PmdWaiterDashboardV151 {
            public function pmdCashierOrdersForRange(
                Carbon $from,
                Carbon $to
            ): array {
                $base = $this->payload(false);
                $tables = array_values((array)($base['tables'] ?? []));

                if (!Schema::hasTable('orders') || !$tables) {
                    return [
                        'orders' => [],
                        'currency' => $base['currency'] ?? '€',
                        'debug' => [
                            'reason' => 'orders-or-tables-unavailable',
                            'source_rows' => 0,
                            'mapped_rows' => 0,
                            'unmapped_rows' => 0,
                            'date_column' => null,
                        ],
                    ];
                }

                $columns = Schema::getColumnListing('orders');
                $primaryKey = $this->firstCol($columns, ['order_id', 'id']);
                $tableColumn = $this->firstCol($columns, [
                    'table_id',
                    'dining_table_id',
                    'location_table_id',
                    'table_no',
                    'table_name',
                    'order_type',
                ]);

                if (!$primaryKey || !$tableColumn) {
                    return [
                        'orders' => [],
                        'currency' => $base['currency'] ?? '€',
                        'debug' => [
                            'reason' => 'required-order-columns-unavailable',
                            'source_rows' => 0,
                            'mapped_rows' => 0,
                            'unmapped_rows' => 0,
                            'date_column' => null,
                        ],
                    ];
                }

                /*
                 * The native Admin Orders list filters by order_date.
                 * Use that exact business-date column whenever it exists.
                 */
                $dateColumn = in_array('order_date', $columns, true)
                    ? 'order_date'
                    : $this->firstCol($columns, ['created_at', 'updated_at']);

                $timeColumn = $this->firstCol($columns, [
                    'order_time',
                    'created_at',
                    'updated_at',
                ]);

                if (!$dateColumn) {
                    return [
                        'orders' => [],
                        'currency' => $base['currency'] ?? '€',
                        'debug' => [
                            'reason' => 'order-date-column-unavailable',
                            'source_rows' => 0,
                            'mapped_rows' => 0,
                            'unmapped_rows' => 0,
                            'date_column' => null,
                        ],
                    ];
                }

                $statusColumn = $this->firstCol($columns, [
                    'status',
                    'order_status',
                    'status_name',
                    'status_id',
                ]);

                $paymentColumn = $this->firstCol($columns, [
                    'payment_status',
                    'pay_status',
                    'is_paid',
                    'payment',
                ]);

                $totalColumn = $this->firstCol($columns, [
                    'order_total',
                    'total',
                    'total_amount',
                    'grand_total',
                ]);

                $maps = $this->tableReferenceMaps($tables);
                $statusMap = $this->orderStatusMap();

                $query = DB::table('orders');

                if (in_array('deleted_at', $columns, true)) {
                    $query->whereNull('deleted_at');
                }

                if ($dateColumn === 'order_date') {
                    $query
                        ->where($dateColumn, '>=', $from->toDateString())
                        ->where($dateColumn, '<=', $to->toDateString());
                } else {
                    /*
                     * Timestamp fallback only. Stored framework timestamps are
                     * UTC; convert Berlin business boundaries to UTC.
                     */
                    $query->whereBetween($dateColumn, [
                        $from->copy()->startOfDay()->utc()->format('Y-m-d H:i:s'),
                        $to->copy()->endOfDay()->utc()->format('Y-m-d H:i:s'),
                    ]);
                }

                if ($timeColumn && $timeColumn !== $dateColumn) {
                    $query->orderByDesc($dateColumn)->orderByDesc($timeColumn);
                } else {
                    $query->orderByDesc($dateColumn)->orderByDesc($primaryKey);
                }

                $sourceRows = 0;
                $unmappedRows = 0;
                $rows = [];

                foreach ($query->limit(500)->get() as $order) {
                    $sourceRows++;
                    $row = (array)$order;

                    $orderId = (int)($row[$primaryKey] ?? 0);
                    if ($orderId < 1) {
                        continue;
                    }

                    $table = $this->resolveOrderTable(
                        $row,
                        $tableColumn,
                        $maps
                    );

                    /*
                     * PMD_CASHIER_LAB_UNMAPPED_ORDER_KEEP_V2_1
                     *
                     * The browser audit proved today's query is correct:
                     * sourceRows=5, mappedRows=0, unmappedRows=5.
                     * A missing/legacy table reference must NOT erase a real
                     * order from Cashier. Keep every selected-date order and
                     * resolve the best honest display label available.
                     */
                    if (!$table) {
                        $unmappedRows++;

                        $fallbackLabel = '';
                        $fallbackNumber = '';
                        $comment = (string)($row['comment'] ?? '');
                        $rawOrderType = trim((string)($row['order_type'] ?? ''));

                        foreach ([
                            '/mapped_local_table_name=([^|]+)/iu',
                            '/table_name=([^|]+)/iu',
                            '/(?:^|\\|)\\s*Table\\s*:\\s*([^|]+)/iu',
                        ] as $pattern) {
                            if (preg_match($pattern, $comment, $match)) {
                                $candidate = trim((string)($match[1] ?? ''));
                                if ($candidate !== '') {
                                    $fallbackLabel = $candidate;
                                    break;
                                }
                            }
                        }

                        if (
                            $fallbackLabel === ''
                            && preg_match('/Table\\s*ID\\s*:\\s*(\\d+)/iu', $comment, $match)
                        ) {
                            $fallbackNumber = trim((string)$match[1]);
                            $fallbackLabel = 'Table '.$fallbackNumber;
                        }

                        if ($fallbackLabel === '' && $rawOrderType !== '') {
                            try {
                                $model = new \Admin\Models\Orders_model;
                                $model->setRawAttributes($row, true);
                                $fallbackLabel = trim((string)$model->order_type_name);
                            } catch (\Throwable $ignored) {
                                $fallbackLabel = $rawOrderType;
                            }
                        }

                        if (
                            $fallbackNumber === ''
                            && preg_match('/(?:table\\s*)?#?\\s*(\\d+)$/iu', $fallbackLabel, $match)
                        ) {
                            $fallbackNumber = trim((string)$match[1]);
                        }

                        if ($fallbackNumber === '' && ctype_digit($rawOrderType)) {
                            $fallbackNumber = $rawOrderType;
                        }

                        $generic = strtolower(trim($fallbackLabel));
                        if (in_array($generic, [
                            '',
                            'table',
                            'dinein',
                            'dine-in',
                            'dine in',
                            'restaurant',
                        ], true)) {
                            $fallbackLabel = '__PMD_TABLE_UNASSIGNED__';
                        }

                        $table = [
                            'id' => 0,
                            'number' => $fallbackNumber,
                            'label' => $fallbackLabel,
                            '_reference_source' => 'unresolved-order-kept',
                        ];
                    }

                    $status = $this->resolvedOrderStatus(
                        $row,
                        $statusColumn,
                        $statusMap
                    );

                    $settlement = strtolower(
                        trim((string)($row['settlement_status'] ?? ''))
                    );

                    $payment = strtolower(
                        trim(
                            (string)(
                                $paymentColumn
                                    ? ($row[$paymentColumn] ?? '')
                                    : ''
                            )
                        )
                    );

                    $total = (float)(
                        $totalColumn
                            ? ($row[$totalColumn] ?? 0)
                            : 0
                    );

                    $rows[] = [
                        'id' => $orderId,
                        'order_id' => $orderId,
                        'table_id' => (int)$table['id'],
                        'table_number' => (string)$table['number'],
                        'table_label' => (string)$table['label'],
                        'status' => $status ?: 'open',
                        'status_id' => isset($row['status_id'])
                            ? (int)$row['status_id']
                            : null,
                        'processed' => (int)($row['processed'] ?? 0),
                        'payment' => $payment,
                        'settlement_status' => $settlement ?: 'unpaid',
                        'settled_amount' => (float)($row['settled_amount'] ?? 0),
                        'total_items' => (int)($row['total_items'] ?? 0),
                        'total' => $total,
                        'comment' => (string)($row['comment'] ?? ''),
                        'order_date' => (string)($row['order_date'] ?? ''),
                        'order_time' => (string)(
                            $timeColumn
                                ? ($row[$timeColumn] ?? '')
                                : ''
                        ),
                        'created_at' => (string)($row['created_at'] ?? ''),
                        'edit_url' => '/admin/orders/edit/'.$orderId,
                        'table_reference_source' =>
                            $table['_reference_source'] ?? $tableColumn,
                    ];
                }

                $this->attachOrderItems($rows);

                return [
                    'orders' => $rows,
                    'currency' => $base['currency'] ?? '€',
                    'debug' => [
                        'reason' => 'ok',
                        'source_rows' => $sourceRows,
                        'mapped_rows' => count($rows),
                        'unmapped_rows' => $unmappedRows,
                        'date_column' => $dateColumn,
                        'table_column' => $tableColumn,
                        'limit' => 500,
                    ],
                ];
            }
        };

        try {
            $payload = $source->pmdCashierOrdersForRange($from, $to);
        } catch (\Throwable $error) {
            logger()->warning('Cashier Lab real day orders render failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ]);

            $payload = [
                'orders' => [],
                'currency' => '€',
                'debug' => [
                    'reason' => 'runtime-error',
                    'message' => $error->getMessage(),
                ],
            ];
        }

        $text = $isGerman
            ? [
                'title_today' => 'Heutige Bestellungen',
                'title_range' => 'Bestellungen',
                'subtitle_today' => 'Bestellungen vom heutigen Geschäftstag · neueste zuerst',
                'subtitle_range' => 'Bestellungen im gewählten Zeitraum · neueste zuerst',
                'order' => 'Bestellung',
                'orders' => 'Bestellungen',
                'table' => 'Tisch',
                'table_unassigned' => 'Tisch nicht zugeordnet',
                'cashier' => 'Kasse',
                'items' => 'Artikel',
                'total' => 'Gesamt',
                'paid' => 'Bezahlt',
                'due' => 'Offen',
                'open_order' => 'Bestellung öffnen',
                'note' => 'Hinweis',
                'empty_title' => 'Keine Bestellungen in diesem Zeitraum',
                'empty_text' => 'Für den ausgewählten Zeitraum wurden keine Tischbestellungen gefunden.',
                'status_open' => 'Offen',
                'status_partial' => 'Teilbezahlt',
                'status_progress' => 'In Bearbeitung',
                'status_ready' => 'Bereit',
                'status_served' => 'Serviert',
                'status_paid' => 'Bezahlt',
                'status_closed' => 'Geschlossen',
                'status_problem' => 'Problem',
                'date_range' => 'Datumsbereich',
                'today' => 'Heute',
                'yesterday' => 'Gestern',
                'last_7_days' => 'Letzte 7 Tage',
                'from' => 'Von',
                'to' => 'Bis',
                'apply' => 'Anwenden',
            ]
            : [
                'title_today' => "Today's orders",
                'title_range' => 'Orders',
                'subtitle_today' => "Orders from today's business day · newest first",
                'subtitle_range' => 'Orders in the selected date range · newest first',
                'order' => 'Order',
                'orders' => 'Orders',
                'table' => 'Table',
                'table_unassigned' => 'Table not assigned',
                'cashier' => 'Cashier',
                'items' => 'Items',
                'total' => 'Total',
                'paid' => 'Paid',
                'due' => 'Due',
                'open_order' => 'Open order',
                'note' => 'Note',
                'empty_title' => 'No orders in this date range',
                'empty_text' => 'No table orders were found for the selected date range.',
                'status_open' => 'Open',
                'status_partial' => 'Part paid',
                'status_progress' => 'In progress',
                'status_ready' => 'Ready',
                'status_served' => 'Served',
                'status_paid' => 'Paid',
                'status_closed' => 'Closed',
                'status_problem' => 'Problem',
                'date_range' => 'Date range',
                'today' => 'Today',
                'yesterday' => 'Yesterday',
                'last_7_days' => 'Last 7 days',
                'from' => 'From',
                'to' => 'To',
                'apply' => 'Apply',
            ];

        $currency = trim((string)($payload['currency'] ?? '€'));
        if ($currency === '' || strtoupper($currency) === 'EUR') {
            $currency = '€';
        }

        $money = static function (
            float $amount
        ) use ($currency, $isGerman): string {
            $formatted = number_format(
                $amount,
                2,
                $isGerman ? ',' : '.',
                $isGerman ? '.' : ','
            );

            return $currency === '€'
                ? $formatted.' '.$currency
                : $currency.$formatted;
        };

        $normalizeTable = static function (
            string $label,
            string $number
        ) use ($text): string {
            $label = trim($label);
            $number = trim($number);
            $generic = strtolower($label);

            if (
                $label === '__PMD_TABLE_UNASSIGNED__'
                || in_array($generic, ['table', 'dinein', 'dine-in', 'dine in', 'restaurant'], true)
            ) {
                return $text['table_unassigned'];
            }

            if ($generic === 'cashier') {
                return $text['cashier'];
            }

            if ($number !== '') {
                if (
                    $label === ''
                    || preg_match('/^(?:table|tisch)\s*#?\s*\d+$/iu', $label)
                ) {
                    return $text['table'].' '.$number;
                }
            }

            if (preg_match('/^(?:table|tisch)\s*#?\s*(\d+)$/iu', $label, $match)) {
                return $text['table'].' '.$match[1];
            }

            if ($label !== '') {
                return $label;
            }

            return $number !== ''
                ? $text['table'].' '.$number
                : $text['table_unassigned'];
        };

        $cards = [];

        foreach ((array)($payload['orders'] ?? []) as $order) {
            if (!is_array($order)) {
                continue;
            }

            $orderId = (int)($order['order_id'] ?? $order['id'] ?? 0);
            if ($orderId < 1) {
                continue;
            }

            $total = max(0, (float)($order['total'] ?? 0));
            $settled = max(0, (float)($order['settled_amount'] ?? 0));
            $due = max(0, $total - $settled);

            $settlement = strtolower(
                trim((string)($order['settlement_status'] ?? 'unpaid'))
            );

            $statusRaw = strtolower(
                trim((string)($order['status'] ?? ''))
            );

            $paymentRaw = strtolower(
                trim((string)($order['payment'] ?? ''))
            );

            $isPaid =
                in_array($settlement, ['paid', 'settled'], true)
                || (
                    $total > 0
                    && $due <= 0.009
                )
                || preg_match('/paid|settled|bezahlt/i', $paymentRaw);

            $isClosed =
                in_array($settlement, ['closed'], true)
                || preg_match('/closed|complete|completed|finished/i', $statusRaw);

            if (preg_match('/cancel|failed|declin|reject|void/', $statusRaw)) {
                $statusKey = 'problem';
            } elseif ($isPaid) {
                $statusKey = 'paid';
            } elseif ($isClosed) {
                $statusKey = 'closed';
            } elseif ($settled > 0 && $due > 0) {
                $statusKey = 'partial';
            } elseif (preg_match('/ready/', $statusRaw)) {
                $statusKey = 'ready';
            } elseif (preg_match('/served|delivered/', $statusRaw)) {
                $statusKey = 'served';
            } elseif (preg_match('/kitchen|cook|prepar|process|received|sent/', $statusRaw)) {
                $statusKey = 'progress';
            } else {
                $statusKey = 'open';
            }

            $items = is_array($order['items'] ?? null)
                ? (array)$order['items']
                : [];

            $itemCount = (int)($order['total_items'] ?? 0);

            if ($itemCount < 1 && $items) {
                $itemCount = (int)round(
                    array_sum(
                        array_map(
                            static fn ($item) =>
                                max(0, (float)($item['quantity'] ?? 0)),
                            $items
                        )
                    )
                );
            }

            $rawTime = trim((string)($order['order_time'] ?? ''));
            $time = '';

            if (preg_match('/(\d{1,2}):(\d{2})/', $rawTime, $match)) {
                $time = sprintf('%02d:%02d', (int)$match[1], (int)$match[2]);
            } elseif (
                preg_match(
                    '/(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/',
                    (string)($order['created_at'] ?? ''),
                    $match
                )
            ) {
                try {
                    $time = Carbon::parse(
                        (string)$order['created_at'],
                        'UTC'
                    )
                        ->timezone(self::PMD_TIMEZONE)
                        ->format('H:i');
                } catch (\Throwable $error) {
                    $time = sprintf('%02d:%02d', (int)$match[2], (int)$match[3]);
                }
            }

            $date = trim((string)($order['order_date'] ?? ''));
            $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)
                ? $date
                : $from->toDateString();

            $hasNote =
                trim((string)($order['comment'] ?? '')) !== ''
                || (
                    is_array($order['item_notes'] ?? null)
                    && count($order['item_notes']) > 0
                );

            $cards[] = [
                'id' => $orderId,
                'table' => $normalizeTable(
                    (string)($order['table_label'] ?? ''),
                    (string)($order['table_number'] ?? '')
                ),
                'status_key' => $statusKey,
                'status_label' => $text['status_'.$statusKey],
                'items' => max(0, $itemCount),
                'time' => $time,
                'date' => $date,
                'sort_key' => $date.' '.($time ?: '00:00').' '.str_pad(
                    (string)$orderId,
                    12,
                    '0',
                    STR_PAD_LEFT
                ),
                'total' => $money($total),
                'paid' => $money(min($settled, $total)),
                'due' => $money($due),
                'has_note' => $hasNote,
                'edit_url' => admin_url('orders/edit/'.$orderId),
            ];
        }

        usort(
            $cards,
            static fn (array $left, array $right): int =>
                strcmp($right['sort_key'], $left['sort_key'])
        );

        $today = Carbon::now(self::PMD_TIMEZONE)->startOfDay();
        $isToday =
            $from->toDateString() === $today->toDateString()
            && $to->toDateString() === $today->toDateString();

        $this->vars['pmdCashierCurrentOrders'] = $cards;
        $this->vars['pmdCashierCurrentOrdersText'] = $text;
        $this->vars['pmdCashierOrdersTitle'] = $isToday
            ? $text['title_today']
            : $text['title_range'];
        $this->vars['pmdCashierOrdersSubtitle'] = $isToday
            ? $text['subtitle_today']
            : $text['subtitle_range'];
        $this->vars['pmdCashierOrdersDebug'] = (array)($payload['debug'] ?? []);
        $this->vars['pmdCashierOrdersRange'] = $this->pmdRangeContract(
            $from,
            $to,
            admin_url('cashierlab'),
            $text
        );
    }

    private function pmdResolveDateRange(): array
    {
        $today = Carbon::now(self::PMD_TIMEZONE)->startOfDay();

        $parse = static function ($value) use ($today): Carbon {
            $value = trim((string)$value);

            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                return $today->copy();
            }

            try {
                $date = Carbon::createFromFormat(
                    'Y-m-d',
                    $value,
                    self::PMD_TIMEZONE
                )->startOfDay();

                return $date->format('Y-m-d') === $value
                    ? $date
                    : $today->copy();
            } catch (\Throwable $error) {
                return $today->copy();
            }
        };

        $from = $parse(request()->query('pmd_from', $today->toDateString()));
        $to = $parse(request()->query('pmd_to', $from->toDateString()));

        if ($to->lt($from)) {
            [$from, $to] = [$to, $from];
        }

        if ($from->diffInDays($to) >= self::PMD_MAX_RANGE_DAYS) {
            $from = $to->copy()->subDays(self::PMD_MAX_RANGE_DAYS - 1);
        }

        return [$from, $to];
    }

    private function pmdRangeContract(
        Carbon $from,
        Carbon $to,
        string $baseUrl,
        array $text
    ): array {
        $today = Carbon::now(self::PMD_TIMEZONE)->startOfDay();
        $yesterday = $today->copy()->subDay();
        $last7From = $today->copy()->subDays(6);

        $isSingle = $from->toDateString() === $to->toDateString();
        $isToday =
            $isSingle
            && $from->toDateString() === $today->toDateString();

        $format = static function (Carbon $date): string {
            return $date->format('d.m.Y');
        };

        return [
            'base_url' => $baseUrl,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'today' => $today->toDateString(),
            'yesterday' => $yesterday->toDateString(),
            'last7_from' => $last7From->toDateString(),
            'label' => $isToday
                ? $text['today']
                : (
                    $isSingle
                        ? $format($from)
                        : $format($from).' – '.$format($to)
                ),
            'text' => [
                'date_range' => $text['date_range'],
                'today' => $text['today'],
                'yesterday' => $text['yesterday'],
                'last_7_days' => $text['last_7_days'],
                'from' => $text['from'],
                'to' => $text['to'],
                'apply' => $text['apply'],
            ],
        ];
    }
}
