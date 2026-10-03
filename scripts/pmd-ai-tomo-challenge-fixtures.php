<?php

/**
 * PMD Intelligence TOMO challenge fixtures.
 *
 * Creates a deliberately rich, synthetic, removable test dataset in the TOMO
 * tenant so Ask PMD can be challenged against sales, menu, payments, tips,
 * reservations, reviews, live orders and workforce data.
 *
 * SAFETY:
 * - CLI only.
 * - Hard locked to database `tomo` and location 1.
 * - Requires an explicit confirmation token.
 * - Uses raw DB inserts for transactional fixtures, so no emails, notifications,
 *   payment-provider calls or fiscal side effects are fired.
 * - Every created record is tagged and --cleanup removes only tagged fixtures.
 *
 * Create / replace:
 *   php scripts/pmd-ai-tomo-challenge-fixtures.php \
 *     --apply --replace --tenant=tomo --location=1 \
 *     --confirm=WRITE_PMD_AI_TEST_DATA_TO_TOMO
 *
 * Cleanup only:
 *   php scripts/pmd-ai-tomo-challenge-fixtures.php \
 *     --cleanup --tenant=tomo --location=1 \
 *     --confirm=WRITE_PMD_AI_TEST_DATA_TO_TOMO
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only.\n");
    exit(2);
}

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

const PMD_FIXTURE_MARKER = 'PMD_AI_CHALLENGE_V1';
const PMD_FIXTURE_PREFIX = 'PMD AI Fixture · ';
const PMD_FIXTURE_EMAIL_DOMAIN = 'pmd-ai-fixture.invalid';
const PMD_CONFIRM = 'WRITE_PMD_AI_TEST_DATA_TO_TOMO';

$options = getopt('', [
    'apply', 'cleanup', 'replace', 'tenant:', 'location:', 'confirm:'
]);

$tenant = (string)($options['tenant'] ?? '');
$locationId = (int)($options['location'] ?? 0);
$confirm = (string)($options['confirm'] ?? '');
$apply = array_key_exists('apply', $options);
$cleanupOnly = array_key_exists('cleanup', $options);
$replace = array_key_exists('replace', $options);

if ($tenant !== 'tomo' || $locationId !== 1) {
    fwrite(STDERR, "STOP: this fixture generator is hard-locked to --tenant=tomo --location=1.\n");
    exit(3);
}
if ($confirm !== PMD_CONFIRM) {
    fwrite(STDERR, "STOP: confirmation token missing or incorrect.\n");
    exit(4);
}
if (!$apply && !$cleanupOnly) {
    echo "DRY RUN ONLY\n";
    echo "Target database: tomo\nLocation: 1\n";
    echo "Use --apply to create fixtures or --cleanup to remove them.\n";
    exit(0);
}

config([
    'database.default' => 'tenant',
    'database.connections.tenant.database' => 'tomo',
]);
DB::purge('tenant');
DB::setDefaultConnection('tenant');
DB::reconnect('tenant');

$db = DB::connection('tenant');
$schema = Schema::connection('tenant');
if ((string)$db->getDatabaseName() !== 'tomo') {
    throw new RuntimeException('STOP: connected database is not tomo.');
}

$timezone = 'Europe/Berlin';
$now = Carbon::now($timezone);
$today = $now->copy()->startOfDay();
$lastMonth = $now->copy()->subMonthNoOverflow()->startOfMonth();

$metaCache = [];
$columnsCache = [];

function cols(string $table): array
{
    global $schema, $columnsCache;
    if (!isset($columnsCache[$table])) {
        $columnsCache[$table] = $schema->hasTable($table)
            ? $schema->getColumnListing($table)
            : [];
    }
    return $columnsCache[$table];
}

function hasCol(string $table, string $column): bool
{
    return in_array($column, cols($table), true);
}

function tableMeta(string $table): array
{
    global $db, $metaCache;
    if (isset($metaCache[$table])) return $metaCache[$table];

    $full = $db->getTablePrefix().$table;
    $rows = $db->select('SHOW COLUMNS FROM `'.str_replace('`', '``', $full).'`');
    $meta = [];
    foreach ($rows as $row) {
        $r = (array)$row;
        $meta[(string)$r['Field']] = [
            'type' => strtolower((string)$r['Type']),
            'nullable' => strtoupper((string)$r['Null']) === 'YES',
            'key' => strtoupper((string)$r['Key']),
            'default' => $r['Default'],
            'has_default' => array_key_exists('Default', $r) && $r['Default'] !== null,
            'auto' => stripos((string)$r['Extra'], 'auto_increment') !== false,
        ];
    }
    return $metaCache[$table] = $meta;
}

function fallbackValue(string $column, array $meta)
{
    $type = $meta['type'];
    if (str_starts_with($type, 'enum(')) {
        if (preg_match("/^enum\\('([^']*)'/", $type, $m)) return $m[1];
        return '';
    }
    if (preg_match('/int|decimal|numeric|float|double|real|bit|bool/', $type)) return 0;
    if (str_contains($type, 'datetime') || str_contains($type, 'timestamp')) return date('Y-m-d H:i:s');
    if (preg_match('/^date/', $type)) return date('Y-m-d');
    if (preg_match('/^time/', $type)) return '00:00:00';
    if (str_contains($type, 'json')) return '{}';
    if (str_contains($column, 'email')) return 'fixture@'.PMD_FIXTURE_EMAIL_DOMAIN;
    return '';
}

function templateRow(string $table): array
{
    global $db;
    if (!cols($table)) return [];
    $row = $db->table($table)->orderByDesc(array_key_exists('created_at', tableMeta($table)) ? 'created_at' : array_key_first(tableMeta($table)))->first();
    return $row ? (array)$row : [];
}

function insertFlexible(string $table, array $overrides, array $base = []): int
{
    global $db;
    $meta = tableMeta($table);
    if (!$meta) throw new RuntimeException("Missing table: {$table}");

    $insert = [];
    foreach ($meta as $column => $m) {
        if ($m['auto']) continue;
        if (array_key_exists($column, $overrides)) {
            $insert[$column] = $overrides[$column];
            continue;
        }
        if (array_key_exists($column, $base) && $m['key'] !== 'UNI') {
            $insert[$column] = $base[$column];
            continue;
        }
        if ($m['nullable'] || $m['has_default']) continue;
        $insert[$column] = fallbackValue($column, $m);
    }

    return (int)$db->table($table)->insertGetId($insert);
}

function firstExisting(string $table, array $names): ?string
{
    foreach ($names as $name) if (hasCol($table, $name)) return $name;
    return null;
}

function taggedOrderIds(): array
{
    global $db;
    if (!cols('orders')) return [];
    $q = $db->table('orders');
    $comment = firstExisting('orders', ['comment','order_comment','notes']);
    $email = firstExisting('orders', ['email','order_email']);
    $q->where(function ($w) use ($comment, $email) {
        $used = false;
        if ($comment) { $w->where($comment, 'like', '%'.PMD_FIXTURE_MARKER.'%'); $used = true; }
        if ($email) {
            $method = $used ? 'orWhere' : 'where';
            $w->{$method}($email, 'like', '%@'.PMD_FIXTURE_EMAIL_DOMAIN);
        }
    });
    $pk = firstExisting('orders', ['order_id','id']);
    return $pk ? $q->pluck($pk)->map('intval')->all() : [];
}

function taggedReservationIds(): array
{
    global $db;
    if (!cols('reservations')) return [];
    $pk = firstExisting('reservations', ['reservation_id','id']);
    $email = firstExisting('reservations', ['email','reservation_email']);
    $comment = firstExisting('reservations', ['comment','notes','reservation_notes']);
    if (!$pk || (!$email && !$comment)) return [];
    $q = $db->table('reservations')->where(function ($w) use ($email, $comment) {
        $used = false;
        if ($comment) { $w->where($comment, 'like', '%'.PMD_FIXTURE_MARKER.'%'); $used = true; }
        if ($email) {
            $method = $used ? 'orWhere' : 'where';
            $w->{$method}($email, 'like', '%@'.PMD_FIXTURE_EMAIL_DOMAIN);
        }
    });
    return $q->pluck($pk)->map('intval')->all();
}

function cleanupFixtures(): array
{
    global $db, $schema;
    $deleted = [];
    $orderIds = taggedOrderIds();
    $reservationIds = taggedReservationIds();

    if ($orderIds && $schema->hasTable('status_history') && hasCol('status_history','object_id')) {
        $deleted['status_history'] = $db->table('status_history')->whereIn('object_id', $orderIds)->delete();
    }
    foreach (['payment_logs','order_notes','order_totals','order_menus','pmd_order_eta_events'] as $table) {
        if ($orderIds && $schema->hasTable($table) && hasCol($table,'order_id')) {
            $deleted[$table] = $db->table($table)->whereIn('order_id', $orderIds)->delete();
        }
    }
    if ($schema->hasTable('reviews')) {
        $q = $db->table('reviews');
        $comment = firstExisting('reviews',['review_text','comment','review','message']);
        if ($comment) $q->where($comment,'like','%'.PMD_FIXTURE_MARKER.'%');
        elseif ($orderIds && hasCol('reviews','sale_id')) $q->whereIn('sale_id',$orderIds);
        else $q = null;
        if ($q) $deleted['reviews'] = $q->delete();
    }
    if ($orderIds && $schema->hasTable('orders')) {
        $pk = firstExisting('orders',['order_id','id']);
        $deleted['orders'] = $db->table('orders')->whereIn($pk,$orderIds)->delete();
    }

    if ($reservationIds && $schema->hasTable('reservation_tables')) {
        $deleted['reservation_tables'] = $db->table('reservation_tables')->whereIn('reservation_id',$reservationIds)->delete();
    }
    if ($reservationIds && $schema->hasTable('reservations')) {
        $pk = firstExisting('reservations',['reservation_id','id']);
        $deleted['reservations'] = $db->table('reservations')->whereIn($pk,$reservationIds)->delete();
    }

    $menuIds = [];
    if ($schema->hasTable('menus') && hasCol('menus','menu_name')) {
        $menuIds = $db->table('menus')->where('menu_name','like',PMD_FIXTURE_PREFIX.'%')->pluck('menu_id')->map('intval')->all();
    }
    $categoryIds = [];
    if ($schema->hasTable('categories') && hasCol('categories','name')) {
        $categoryIds = $db->table('categories')->where('name','like',PMD_FIXTURE_PREFIX.'%')->pluck('category_id')->map('intval')->all();
    }
    if ($schema->hasTable('menu_categories')) {
        $q = $db->table('menu_categories');
        if ($menuIds) $q->whereIn('menu_id',$menuIds);
        elseif ($categoryIds) $q->whereIn('category_id',$categoryIds);
        else $q = null;
        if ($q) $deleted['menu_categories'] = $q->delete();
    }
    if ($menuIds) $deleted['menus'] = $db->table('menus')->whereIn('menu_id',$menuIds)->delete();
    if ($categoryIds) $deleted['categories'] = $db->table('categories')->whereIn('category_id',$categoryIds)->delete();

    if ($schema->hasTable('pmd_operational_shifts')) {
        $shiftIds = $db->table('pmd_operational_shifts')->where('notes','like','%'.PMD_FIXTURE_MARKER.'%')->pluck('id')->map('intval')->all();
        if ($shiftIds && $schema->hasTable('pmd_operational_shift_people')) {
            $deleted['pmd_operational_shift_people'] = $db->table('pmd_operational_shift_people')->whereIn('shift_id',$shiftIds)->delete();
        }
        if ($shiftIds) $deleted['pmd_operational_shifts'] = $db->table('pmd_operational_shifts')->whereIn('id',$shiftIds)->delete();
    }
    if ($schema->hasTable('pmd_operational_people')) {
        $deleted['pmd_operational_people'] = $db->table('pmd_operational_people')->where('display_name','like',PMD_FIXTURE_PREFIX.'%')->delete();
    }
    if ($schema->hasTable('tips_shifts') && hasCol('tips_shifts','notes')) {
        $deleted['tips_shifts'] = $db->table('tips_shifts')->where('notes','like','%'.PMD_FIXTURE_MARKER.'%')->delete();
    }

    return $deleted;
}

function statusId(array $needles, ?int $fallback = null): ?int
{
    global $db, $schema;
    if (!$schema->hasTable('statuses')) return $fallback;
    $rows = $db->table('statuses')->get(['status_id','status_name']);
    foreach ($needles as $needle) {
        foreach ($rows as $row) {
            if (str_contains(strtolower((string)$row->status_name), strtolower($needle))) return (int)$row->status_id;
        }
    }
    return $fallback ?: (int)optional($rows->first())->status_id;
}

function createCategory(string $name, int $priority): int
{
    global $db;
    $base = templateRow('categories');
    $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i','-', $name), '-')).'-'.substr(md5($name),0,6);
    return insertFlexible('categories', [
        'name'=>$name,
        'description'=>'Synthetic PMD Intelligence challenge fixture. '.PMD_FIXTURE_MARKER,
        'parent_id'=>null,
        'priority'=>$priority,
        'status'=>1,
        'frontend_visible'=>1,
        'permalink_slug'=>$slug,
        'nest_left'=>0,
        'nest_right'=>0,
        'created_at'=>date('Y-m-d H:i:s'),
        'updated_at'=>date('Y-m-d H:i:s'),
    ], $base);
}

function createMenu(string $name, float $price, int $categoryId, int $priority, bool $stockOut = false): int
{
    global $db, $schema;
    $base = templateRow('menus');
    $id = insertFlexible('menus', [
        'menu_name'=>$name,
        'menu_description'=>'Synthetic PMD Intelligence challenge item. '.PMD_FIXTURE_MARKER,
        'menu_price'=>$price,
        'menu_category_id'=>$categoryId,
        'menu_status'=>1,
        'menu_priority'=>$priority,
        'minimum_qty'=>1,
        'is_stock_out'=>$stockOut ? 1 : 0,
        'is_chef_recommended'=>$stockOut ? 0 : 1,
        'is_manual_bestseller'=>0,
        'created_at'=>date('Y-m-d H:i:s'),
        'updated_at'=>date('Y-m-d H:i:s'),
    ], $base);
    if ($schema->hasTable('menu_categories')) {
        $db->table('menu_categories')->insert(['menu_id'=>$id,'category_id'=>$categoryId]);
    }
    return $id;
}

function addOrderTotal(int $orderId, string $code, string $title, $value, int $priority = 0): void
{
    $base = templateRow('order_totals');
    insertFlexible('order_totals', [
        'order_id'=>$orderId,
        'code'=>$code,
        'title'=>$title,
        'value'=>$value,
        'priority'=>$priority,
        'created_at'=>date('Y-m-d H:i:s'),
        'updated_at'=>date('Y-m-d H:i:s'),
    ], $base);
}

function createOrder(array $scenario, array $menus, array $tableIds): array
{
    global $db, $schema, $locationId;
    $base = templateRow('orders');
    $when = $scenario['when'];
    $items = $scenario['items'];
    $food = 0.0;
    $qty = 0;
    foreach ($items as [$key,$quantity]) {
        $food += $menus[$key]['price'] * $quantity;
        $qty += $quantity;
    }
    $tip = (float)($scenario['tip'] ?? 0);
    $gross = round($food + $tip, 2);
    $state = $scenario['settlement'];
    $method = $scenario['method'] ?? 'cash';
    $processed = $scenario['processed'] ?? ($state === 'paid' ? 1 : 0);
    $status = $scenario['status_id'];
    $tableId = $scenario['table_id'] ?? ($tableIds[0] ?? null);
    $orderType = $scenario['order_type'] ?? ($tableId ? (string)$tableId : 'delivery');
    $comment = PMD_FIXTURE_MARKER.' | '.$scenario['label'];

    $settledAmount = $state === 'paid' ? $gross : ($state === 'partial' ? round($gross / 2, 2) : 0);
    $settledAt = in_array($state,['paid','partial'],true) ? $when->copy()->addMinutes(28)->format('Y-m-d H:i:s') : null;

    $overrides = [
        'location_id'=>$locationId,
        'table_id'=>$tableId,
        'order_type'=>$orderType,
        'status_id'=>$status,
        'processed'=>$processed,
        'settlement_status'=>$state,
        'settlement_method'=>$method,
        'settled_amount'=>$settledAmount,
        'settled_at'=>$settledAt,
        'payment'=>$method,
        'order_total'=>$gross,
        'total_items'=>$qty,
        'first_name'=>'PMD',
        'last_name'=>'AI Fixture',
        'email'=>'order-'.substr(md5($scenario['label'].$when->timestamp),0,10).'@'.PMD_FIXTURE_EMAIL_DOMAIN,
        'telephone'=>'0000000000',
        'comment'=>$comment,
        'hash'=>md5($comment.uniqid('',true)),
        'order_date'=>$when->format('Y-m-d'),
        'order_time'=>$when->format('H:i:s'),
        'created_at'=>$when->format('Y-m-d H:i:s'),
        'updated_at'=>$when->copy()->addMinutes(30)->format('Y-m-d H:i:s'),
    ];

    if ($schema->hasColumn('orders','kitchen_released_at')) $overrides['kitchen_released_at']=$when->copy()->addMinute()->format('Y-m-d H:i:s');
    if ($schema->hasColumn('orders','kitchen_preparing_at')) $overrides['kitchen_preparing_at']=$when->copy()->addMinutes(3)->format('Y-m-d H:i:s');
    if ($schema->hasColumn('orders','kitchen_ready_at') && $processed) $overrides['kitchen_ready_at']=$when->copy()->addMinutes($scenario['kitchen_minutes'] ?? 16)->format('Y-m-d H:i:s');
    if ($schema->hasColumn('orders','eta_initial_minutes')) $overrides['eta_initial_minutes']=$scenario['eta_minutes'] ?? 20;
    if ($schema->hasColumn('orders','eta_due_at')) $overrides['eta_due_at']=$when->copy()->addMinutes($scenario['eta_minutes'] ?? 20)->format('Y-m-d H:i:s');
    if ($schema->hasColumn('orders','eta_extension_count')) $overrides['eta_extension_count']=$scenario['eta_extensions'] ?? 0;

    $orderId = insertFlexible('orders', $overrides, $base);

    $orderMenuBase = templateRow('order_menus');
    foreach ($items as [$key,$quantity]) {
        $menu = $menus[$key];
        $subtotal = round($menu['price'] * $quantity,2);
        insertFlexible('order_menus', [
            'order_id'=>$orderId,
            'menu_id'=>$menu['id'],
            'name'=>$menu['name'],
            'menu_name'=>$menu['name'],
            'quantity'=>$quantity,
            'price'=>$menu['price'],
            'subtotal'=>$subtotal,
            'comment'=>PMD_FIXTURE_MARKER,
            'kds_status'=>$processed ? 'ready' : 'preparing',
            'status'=>$processed ? 'ready' : 'preparing',
            'is_ready'=>$processed ? 1 : 0,
            'created_at'=>$when->format('Y-m-d H:i:s'),
            'updated_at'=>$when->copy()->addMinutes(15)->format('Y-m-d H:i:s'),
        ], $orderMenuBase);
    }

    addOrderTotal($orderId,'subtotal','Subtotal',$food,100);
    if ($tip > 0) addOrderTotal($orderId,'tip','Tip',$tip,700);
    addOrderTotal($orderId,'payment_method','Payment method',$method,710);
    addOrderTotal($orderId,'total','Total',$gross,900);

    if ($schema->hasTable('status_history')) {
        $historyBase = templateRow('status_history');
        insertFlexible('status_history', [
            'object_id'=>$orderId,
            'object_type'=>'Admin\\Models\\Orders_model',
            'status_id'=>$status,
            'staff_id'=>null,
            'comment'=>PMD_FIXTURE_MARKER.' | '.$scenario['label'],
            'notify'=>0,
            'created_at'=>$when->copy()->addMinutes(2)->format('Y-m-d H:i:s'),
            'updated_at'=>$when->copy()->addMinutes(2)->format('Y-m-d H:i:s'),
        ], $historyBase);
    }

    if (!$processed && $schema->hasTable('pmd_order_eta_events')) {
        insertFlexible('pmd_order_eta_events', [
            'order_id'=>$orderId,
            'location_id'=>$locationId,
            'event_type'=>'eta_set',
            'reason'=>PMD_FIXTURE_MARKER,
            'new_eta_minutes'=>$scenario['eta_minutes'] ?? 20,
            'extension_minutes'=>0,
            'snapshot_json'=>json_encode(['fixture'=>PMD_FIXTURE_MARKER]),
            'created_at'=>$when->copy()->addMinute()->format('Y-m-d H:i:s'),
            'updated_at'=>$when->copy()->addMinute()->format('Y-m-d H:i:s'),
        ]);
    }

    return compact('orderId','food','tip','gross','state','method','qty');
}

function createReservation(Carbon $when, int $guests, ?int $tableId, int $statusId, string $label): int
{
    global $schema, $db, $locationId;
    $base = templateRow('reservations');
    $email = 'reservation-'.substr(md5($label.$when->timestamp),0,10).'@'.PMD_FIXTURE_EMAIL_DOMAIN;
    $id = insertFlexible('reservations', [
        'location_id'=>$locationId,
        'table_id'=>$tableId,
        'status_id'=>$statusId,
        'first_name'=>'PMD',
        'last_name'=>'AI Guest',
        'email'=>$email,
        'telephone'=>'0000000000',
        'guest_num'=>$guests,
        'occasion_id'=>str_contains(strtolower($label),'birthday') ? 1 : 0,
        'reserve_date'=>$when->format('Y-m-d'),
        'reserve_time'=>$when->format('H:i:s'),
        'duration'=>120,
        'processed'=>1,
        'notify'=>0,
        'comment'=>PMD_FIXTURE_MARKER.' | '.$label,
        'notes'=>PMD_FIXTURE_MARKER.' | '.$label,
        'hash'=>md5(PMD_FIXTURE_MARKER.$label.uniqid('',true)),
        'created_at'=>$when->copy()->subDays(2)->format('Y-m-d H:i:s'),
        'updated_at'=>$when->copy()->subDays(2)->format('Y-m-d H:i:s'),
    ], $base);
    if ($tableId && $schema->hasTable('reservation_tables')) {
        $exists = $db->table('reservation_tables')->where('reservation_id',$id)->where('table_id',$tableId)->exists();
        if (!$exists) $db->table('reservation_tables')->insert(['reservation_id'=>$id,'table_id'=>$tableId]);
    }
    return $id;
}

function createReview(int $saleId, Carbon $when, int $rating, string $message): int
{
    global $locationId;
    $base = templateRow('reviews');
    return insertFlexible('reviews', [
        'location_id'=>$locationId,
        'customer_id'=>0,
        'sale_id'=>$saleId,
        'sale_type'=>'Admin\\Models\\Orders_model',
        'quality'=>$rating,
        'service'=>$rating,
        'delivery'=>$rating,
        'rating'=>$rating,
        'review_status'=>1,
        'review_text'=>$message.' ['.PMD_FIXTURE_MARKER.']',
        'comment'=>$message.' ['.PMD_FIXTURE_MARKER.']',
        'review'=>$message.' ['.PMD_FIXTURE_MARKER.']',
        'message'=>$message.' ['.PMD_FIXTURE_MARKER.']',
        'created_at'=>$when->format('Y-m-d H:i:s'),
        'updated_at'=>$when->format('Y-m-d H:i:s'),
    ], $base);
}

$required = ['orders','order_menus','order_totals','menus','categories','menu_categories','reservations'];
$missing = array_values(array_filter($required, fn($t) => !$schema->hasTable($t)));
if ($missing) throw new RuntimeException('STOP: required tables missing: '.implode(', ', $missing));

if ($cleanupOnly) {
    $db->beginTransaction();
    try {
        $deleted = cleanupFixtures();
        $db->commit();
        echo "CLEANUP_RESULT=PASS\n";
        echo json_encode($deleted, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
        exit(0);
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
}

$existing = taggedOrderIds();
if ($existing && !$replace) {
    throw new RuntimeException('Fixtures already exist. Re-run with --replace or use --cleanup first.');
}

$db->beginTransaction();
try {
    if ($replace) cleanupFixtures();

    // Menu catalogue: three categories, five items, one intentional stock-out.
    $catStarters = createCategory(PMD_FIXTURE_PREFIX.'Starters', 9101);
    $catMains = createCategory(PMD_FIXTURE_PREFIX.'Mains', 9102);
    $catDrinks = createCategory(PMD_FIXTURE_PREFIX.'Drinks & Desserts', 9103);

    $menus = [];
    $menus['burger'] = ['id'=>createMenu(PMD_FIXTURE_PREFIX.'Smash Burger',16.00,$catMains,9201),'name'=>PMD_FIXTURE_PREFIX.'Smash Burger','price'=>16.00];
    $menus['pasta'] = ['id'=>createMenu(PMD_FIXTURE_PREFIX.'Truffle Pasta',18.00,$catMains,9202),'name'=>PMD_FIXTURE_PREFIX.'Truffle Pasta','price'=>18.00];
    $menus['salad'] = ['id'=>createMenu(PMD_FIXTURE_PREFIX.'Garden Salad',12.00,$catStarters,9203),'name'=>PMD_FIXTURE_PREFIX.'Garden Salad','price'=>12.00];
    $menus['lemonade'] = ['id'=>createMenu(PMD_FIXTURE_PREFIX.'House Lemonade',5.00,$catDrinks,9204),'name'=>PMD_FIXTURE_PREFIX.'House Lemonade','price'=>5.00];
    $menus['cheesecake'] = ['id'=>createMenu(PMD_FIXTURE_PREFIX.'Cheesecake SOLD OUT',8.00,$catDrinks,9205,true),'name'=>PMD_FIXTURE_PREFIX.'Cheesecake SOLD OUT','price'=>8.00];

    $tableIds = $schema->hasTable('tables')
        ? $db->table('tables')->where(function($q) use ($locationId) {
            if (hasCol('tables','location_id')) $q->where('location_id',$locationId);
        })->orderBy('table_id')->limit(5)->pluck('table_id')->map('intval')->all()
        : [];

    $received = statusId(['received'], 1);
    $preparing = statusId(['preparation','preparing'], $received);
    $completed = statusId(['completed','complete','closed','paid'], $received);
    $canceled = statusId(['canceled','cancelled'], $received);
    $reservationConfirmed = statusId(['confirmed','booked','received'], $received);

    // Keep all today's timestamps safely in the past, even when run shortly after midnight.
    $safeToday = function(int $minutesAgo) use ($now, $today) {
        $candidate = $now->copy()->subMinutes($minutesAgo);
        $minimum = $today->copy()->addMinutes(2);
        if ($candidate->lt($minimum)) $candidate = $minimum->copy()->addMinutes(max(0, 120-$minutesAgo));
        if ($candidate->gt($now)) $candidate = $now->copy()->subMinute();
        return $candidate;
    };

    $scenarios = [
        ['label'=>'today paid cash burger rush','when'=>$safeToday(70),'items'=>[['burger',2],['lemonade',2]],'tip'=>5,'settlement'=>'paid','method'=>'cash','processed'=>1,'status_id'=>$completed,'table_id'=>$tableIds[0]??null],
        ['label'=>'today paid terminal delivery','when'=>$safeToday(60),'items'=>[['pasta',1],['lemonade',1]],'tip'=>3,'settlement'=>'paid','method'=>'direct_terminal','processed'=>1,'status_id'=>$completed,'order_type'=>'delivery'],
        ['label'=>'today paid cash lunch','when'=>$safeToday(50),'items'=>[['burger',1],['salad',1]],'tip'=>4,'settlement'=>'paid','method'=>'cash','processed'=>1,'status_id'=>$completed,'table_id'=>$tableIds[1]??($tableIds[0]??null)],
        ['label'=>'today paid wero pasta','when'=>$safeToday(42),'items'=>[['pasta',2]],'tip'=>6,'settlement'=>'paid','method'=>'wero','processed'=>1,'status_id'=>$completed,'table_id'=>$tableIds[2]??($tableIds[0]??null)],
        ['label'=>'today paid terminal delivery two','when'=>$safeToday(34),'items'=>[['lemonade',3],['salad',1]],'tip'=>2,'settlement'=>'paid','method'=>'direct_terminal','processed'=>1,'status_id'=>$completed,'order_type'=>'delivery'],
        ['label'=>'today paid cash mixed','when'=>$safeToday(26),'items'=>[['burger',1],['pasta',1],['lemonade',2]],'tip'=>6,'settlement'=>'paid','method'=>'cash','processed'=>1,'status_id'=>$completed,'table_id'=>$tableIds[3]??($tableIds[0]??null)],
        ['label'=>'today live overdue kitchen','when'=>$safeToday(80),'items'=>[['burger',1],['pasta',1]],'tip'=>0,'settlement'=>'unpaid','method'=>'cash','processed'=>0,'status_id'=>$preparing,'table_id'=>$tableIds[4]??($tableIds[0]??null),'eta_minutes'=>20,'eta_extensions'=>1],
        ['label'=>'today live new delivery','when'=>$safeToday(12),'items'=>[['salad',1],['lemonade',1]],'tip'=>0,'settlement'=>'unpaid','method'=>'direct_terminal','processed'=>0,'status_id'=>$received,'order_type'=>'delivery','eta_minutes'=>25],
        ['label'=>'today partial table','when'=>$safeToday(20),'items'=>[['burger',2]],'tip'=>4,'settlement'=>'partial','method'=>'cash','processed'=>1,'status_id'=>$received,'table_id'=>$tableIds[1]??($tableIds[0]??null)],
        ['label'=>'today failed payment','when'=>$safeToday(16),'items'=>[['salad',1],['lemonade',1]],'tip'=>0,'settlement'=>'failed','method'=>'direct_terminal','processed'=>1,'status_id'=>$received,'order_type'=>'delivery'],
    ];

    $lastMonthDays = [5,9,13,18,22,24,27,28];
    $lastMonthItems = [
        [['burger',1],['salad',1],['lemonade',1]],
        [['pasta',2],['lemonade',2]],
        [['burger',2]],
        [['burger',2],['pasta',1],['lemonade',1]],
        [['salad',1],['lemonade',2]],
        [['pasta',2],['salad',1]],
        [['burger',3],['lemonade',2]],
        [['pasta',1],['burger',1]],
    ];
    $lastTips = [4,5,3,7,2,4,6,3];
    $lastMethods = ['cash','direct_terminal','cash','wero','cash','direct_terminal','cash','wero'];
    foreach ($lastMonthDays as $i=>$day) {
        $scenarios[] = [
            'label'=>'last month paid sample '.($i+1),
            'when'=>$lastMonth->copy()->day(min($day,$lastMonth->daysInMonth))->setTime(12+$i, 10),
            'items'=>$lastMonthItems[$i],
            'tip'=>$lastTips[$i],
            'settlement'=>'paid',
            'method'=>$lastMethods[$i],
            'processed'=>1,
            'status_id'=>$completed,
            'table_id'=>$tableIds[$i % max(1,count($tableIds))]??null,
            'order_type'=>($i===2 || $i===6) ? 'delivery' : null,
            'kitchen_minutes'=>12+($i%4)*4,
        ];
    }
    $scenarios[] = ['label'=>'last month unpaid anomaly','when'=>$lastMonth->copy()->day(min(25,$lastMonth->daysInMonth))->setTime(20,15),'items'=>[['burger',1],['lemonade',1]],'tip'=>0,'settlement'=>'unpaid','method'=>'cash','processed'=>1,'status_id'=>$received,'table_id'=>$tableIds[0]??null];
    $scenarios[] = ['label'=>'last month partial anomaly','when'=>$lastMonth->copy()->day(min(26,$lastMonth->daysInMonth))->setTime(19,30),'items'=>[['pasta',1],['salad',1]],'tip'=>3,'settlement'=>'partial','method'=>'direct_terminal','processed'=>1,'status_id'=>$preparing,'table_id'=>$tableIds[1]??($tableIds[0]??null)];

    $createdOrders = [];
    foreach ($scenarios as $scenario) $createdOrders[] = createOrder($scenario,$menus,$tableIds);

    $fixtureOrderIds = array_column($createdOrders,'orderId');
    if ($schema->hasTable('reviews') && $fixtureOrderIds) {
        createReview($fixtureOrderIds[0],$safeToday(18),5,'Fantastic food and friendly service.');
        createReview($fixtureOrderIds[1],$safeToday(14),2,'Food was good, but the wait felt too long.');
        createReview($fixtureOrderIds[10]??$fixtureOrderIds[0],$lastMonth->copy()->day(min(24,$lastMonth->daysInMonth))->setTime(21,0),4,'Really enjoyable dinner, would come back.');
    }

    if ($schema->hasTable('reservations')) {
        $futureToday = $now->copy()->addHours(3);
        if (!$futureToday->isSameDay($now)) $futureToday = $now->copy()->addDay()->setTime(18,30);
        createReservation($futureToday,8,$tableIds[0]??null,$reservationConfirmed,'birthday dinner tonight');
        createReservation($now->copy()->addDay()->setTime(20,0),4,$tableIds[1]??($tableIds[0]??null),$reservationConfirmed,'tomorrow dinner');
        createReservation($now->copy()->subDay()->setTime(18,30),2,$tableIds[2]??($tableIds[0]??null),$reservationConfirmed,'yesterday completed visit');
        createReservation($lastMonth->copy()->day(min(24,$lastMonth->daysInMonth))->setTime(19,0),6,$tableIds[3]??($tableIds[0]??null),$reservationConfirmed,'last month group');
        if ($canceled) createReservation($now->copy()->addDays(2)->setTime(19,30),5,$tableIds[4]??($tableIds[0]??null),$canceled,'future canceled test');
    }

    // Operational roster + shifts. No login accounts are created.
    if ($schema->hasTable('pmd_operational_people') && $schema->hasTable('pmd_operational_shifts') && $schema->hasTable('pmd_operational_shift_people')) {
        $people = [
            ['name'=>'Lina','department'=>'kitchen','role'=>'Head Chef','attendance'=>'present'],
            ['name'=>'Marco','department'=>'kitchen','role'=>'Chef','attendance'=>'present'],
            ['name'=>'Nora','department'=>'kitchen','role'=>'Kitchen Assistant','attendance'=>'absent'],
            ['name'=>'Sofia','department'=>'reception','role'=>'Reservations','attendance'=>'present'],
            ['name'=>'Ben','department'=>'bar','role'=>'Bartender','attendance'=>'present'],
            ['name'=>'Mila','department'=>'floor','role'=>'Waiter','attendance'=>'present'],
        ];
        $personIds=[];
        foreach($people as $person){
            $personIds[$person['name']] = $db->table('pmd_operational_people')->insertGetId([
                'location_id'=>$locationId,'staff_id'=>null,'display_name'=>PMD_FIXTURE_PREFIX.$person['name'],
                'department'=>$person['department'],'job_role'=>$person['role'],'station_slug'=>null,'is_active'=>1,
                'created_at'=>$now->format('Y-m-d H:i:s'),'updated_at'=>$now->format('Y-m-d H:i:s'),
            ]);
        }
        $start = $now->copy()->subHour(); if (!$start->isSameDay($now)) $start=$today->copy();
        $end = $now->copy()->addHours(6);
        $todayShift = $db->table('pmd_operational_shifts')->insertGetId([
            'location_id'=>$locationId,'shift_date'=>$now->toDateString(),'label'=>'PMD AI Challenge Shift',
            'starts_at'=>$start->format('H:i:s'),'ends_at'=>$end->format('H:i:s'),'break_minutes'=>30,
            'notes'=>PMD_FIXTURE_MARKER.' | confirmed shift with one missing kitchen person',
            'status'=>'confirmed','quick_counts_json'=>null,'confirmed_at'=>$now->copy()->subMinutes(30)->format('Y-m-d H:i:s'),
            'confirmed_by_staff_id'=>null,'created_at'=>$now->format('Y-m-d H:i:s'),'updated_at'=>$now->format('Y-m-d H:i:s'),
        ]);
        foreach($people as $person){
            $db->table('pmd_operational_shift_people')->insert([
                'shift_id'=>$todayShift,'person_id'=>$personIds[$person['name']],
                'display_name_snapshot'=>PMD_FIXTURE_PREFIX.$person['name'],'department_snapshot'=>$person['department'],
                'job_role_snapshot'=>$person['role'],'attendance_status'=>$person['attendance'],'is_replacement'=>0,
                'created_at'=>$now->format('Y-m-d H:i:s'),'updated_at'=>$now->format('Y-m-d H:i:s'),
            ]);
        }
        $tomorrowShift = $db->table('pmd_operational_shifts')->insertGetId([
            'location_id'=>$locationId,'shift_date'=>$now->copy()->addDay()->toDateString(),'label'=>'PMD AI Tomorrow Shift',
            'starts_at'=>'17:00:00','ends_at'=>'23:00:00','break_minutes'=>30,'notes'=>PMD_FIXTURE_MARKER.' | tomorrow plan',
            'status'=>'planned','quick_counts_json'=>null,'confirmed_at'=>null,'confirmed_by_staff_id'=>null,
            'created_at'=>$now->format('Y-m-d H:i:s'),'updated_at'=>$now->format('Y-m-d H:i:s'),
        ]);
        foreach(array_slice($people,0,4) as $person){
            $db->table('pmd_operational_shift_people')->insert([
                'shift_id'=>$tomorrowShift,'person_id'=>$personIds[$person['name']],
                'display_name_snapshot'=>PMD_FIXTURE_PREFIX.$person['name'],'department_snapshot'=>$person['department'],
                'job_role_snapshot'=>$person['role'],'attendance_status'=>'planned','is_replacement'=>0,
                'created_at'=>$now->format('Y-m-d H:i:s'),'updated_at'=>$now->format('Y-m-d H:i:s'),
            ]);
        }
        $pastShift = $db->table('pmd_operational_shifts')->insertGetId([
            'location_id'=>$locationId,'shift_date'=>$lastMonth->copy()->day(min(24,$lastMonth->daysInMonth))->toDateString(),'label'=>'PMD AI Historical Shift',
            'starts_at'=>'17:00:00','ends_at'=>'23:00:00','break_minutes'=>30,'notes'=>PMD_FIXTURE_MARKER.' | historical shift',
            'status'=>'confirmed','quick_counts_json'=>null,'confirmed_at'=>$lastMonth->copy()->day(min(24,$lastMonth->daysInMonth))->setTime(16,0)->format('Y-m-d H:i:s'),
            'confirmed_by_staff_id'=>null,'created_at'=>$now->format('Y-m-d H:i:s'),'updated_at'=>$now->format('Y-m-d H:i:s'),
        ]);
        foreach(array_slice($people,0,5) as $person){
            $db->table('pmd_operational_shift_people')->insert([
                'shift_id'=>$pastShift,'person_id'=>$personIds[$person['name']],
                'display_name_snapshot'=>PMD_FIXTURE_PREFIX.$person['name'],'department_snapshot'=>$person['department'],
                'job_role_snapshot'=>$person['role'],'attendance_status'=>'present','is_replacement'=>0,
                'created_at'=>$now->format('Y-m-d H:i:s'),'updated_at'=>$now->format('Y-m-d H:i:s'),
            ]);
        }
    }

    if ($schema->hasTable('tips_shifts')) {
        insertFlexible('tips_shifts', ['shift_date'=>$now->toDateString(),'location_id'=>$locationId,'description'=>'PMD AI challenge tips','notes'=>PMD_FIXTURE_MARKER,'created_at'=>$now->format('Y-m-d H:i:s'),'updated_at'=>$now->format('Y-m-d H:i:s')]);
        insertFlexible('tips_shifts', ['shift_date'=>$lastMonth->copy()->day(min(24,$lastMonth->daysInMonth))->toDateString(),'location_id'=>$locationId,'description'=>'PMD AI historical challenge tips','notes'=>PMD_FIXTURE_MARKER,'created_at'=>$now->format('Y-m-d H:i:s'),'updated_at'=>$now->format('Y-m-d H:i:s')]);
    }

    $db->commit();

    $todayCreated = collect($createdOrders)->take(10);
    $todayPaid = $todayCreated->where('state','paid');
    $lastCreated = collect($createdOrders)->slice(10);
    $lastPaid = $lastCreated->where('state','paid');

    echo "FIXTURE_RESULT=PASS\n";
    echo "DATABASE=tomo\nLOCATION=1\nMARKER=".PMD_FIXTURE_MARKER."\n";
    echo "TODAY_PAID_ORDERS=".$todayPaid->count()."\n";
    echo "TODAY_SETTLED_GROSS=".number_format((float)$todayPaid->sum('gross'),2,'.','')."\n";
    echo "TODAY_TIPS=".number_format((float)$todayPaid->sum('tip'),2,'.','')."\n";
    echo "TODAY_NET_SALES_EXPECTED=".number_format((float)$todayPaid->sum('food'),2,'.','')."\n";
    echo "TODAY_LIVE_ORDERS=2\nTODAY_PARTIAL_ORDERS=1\nTODAY_FAILED_PAYMENTS=1\n";
    echo "LAST_MONTH_PAID_ORDERS=".$lastPaid->count()."\n";
    echo "LAST_MONTH_SETTLED_GROSS=".number_format((float)$lastPaid->sum('gross'),2,'.','')."\n";
    echo "LAST_MONTH_TIPS=".number_format((float)$lastPaid->sum('tip'),2,'.','')."\n";
    echo "LAST_MONTH_NET_SALES_EXPECTED=".number_format((float)$lastPaid->sum('food'),2,'.','')."\n";
    echo "KITCHEN_EXPECTED=3\nKITCHEN_PRESENT=2\nKITCHEN_MISSING=1\n";
    echo "STOCK_OUT_ITEMS=1\nLOW_REVIEW_FIXTURES=1\n";
    echo "NOTE=All fixtures are synthetic and removable with --cleanup. No login accounts or external payment/fiscal calls were created.\n";
} catch (Throwable $e) {
    try { $db->rollBack(); } catch (Throwable $ignore) {}
    fwrite(STDERR, "FIXTURE_RESULT=FAIL\n".$e->getMessage()."\n");
    exit(10);
}
