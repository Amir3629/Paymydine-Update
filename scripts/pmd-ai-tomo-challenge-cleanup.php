<?php

/**
 * Scoped cleanup for PMD_AI_CHALLENGE_V1 synthetic TOMO fixtures.
 * Deletes only rows identified by the fixture marker/prefix or children of
 * fixture order/reservation/shift/menu IDs.
 *
 * php scripts/pmd-ai-tomo-challenge-cleanup.php \
 *   --apply --tenant=tomo --location=1 \
 *   --confirm=DELETE_PMD_AI_TEST_DATA_FROM_TOMO
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only.\n");
    exit(2);
}

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

const PMD_CLEAN_MARKER = 'PMD_AI_CHALLENGE_V1';
const PMD_CLEAN_PREFIX = 'PMD AI Fixture · ';
const PMD_CLEAN_DOMAIN = 'pmd-ai-fixture.invalid';
const PMD_CLEAN_CONFIRM = 'DELETE_PMD_AI_TEST_DATA_FROM_TOMO';

$options = getopt('', ['apply','tenant:','location:','confirm:']);
$apply = array_key_exists('apply', $options);
$tenant = (string)($options['tenant'] ?? '');
$locationId = (int)($options['location'] ?? 0);
$confirm = (string)($options['confirm'] ?? '');

if ($tenant !== 'tomo' || $locationId !== 1) {
    fwrite(STDERR, "STOP: hard-locked to --tenant=tomo --location=1.\n");
    exit(3);
}
if ($confirm !== PMD_CLEAN_CONFIRM) {
    fwrite(STDERR, "STOP: cleanup confirmation token missing or incorrect.\n");
    exit(4);
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

function cleanCols(string $table): array
{
    global $schema;
    return $schema->hasTable($table) ? $schema->getColumnListing($table) : [];
}
function cleanHas(string $table, string $column): bool
{
    return in_array($column, cleanCols($table), true);
}
function cleanFirst(string $table, array $names): ?string
{
    foreach ($names as $name) if (cleanHas($table, $name)) return $name;
    return null;
}

$orderIds = [];
if ($schema->hasTable('orders')) {
    $pk = cleanFirst('orders',['order_id','id']);
    $comment = cleanFirst('orders',['comment','order_comment','notes']);
    $email = cleanFirst('orders',['email','order_email']);
    if ($pk && ($comment || $email)) {
        $q = $db->table('orders')->where(function($w) use ($comment,$email) {
            $used = false;
            if ($comment) {
                $w->where($comment,'like','%'.PMD_CLEAN_MARKER.'%');
                $used = true;
            }
            if ($email) {
                $method = $used ? 'orWhere' : 'where';
                $w->{$method}($email,'like','%@'.PMD_CLEAN_DOMAIN);
            }
        });
        $orderIds = $q->pluck($pk)->map('intval')->filter()->values()->all();
    }
}

$reservationIds = [];
if ($schema->hasTable('reservations')) {
    $pk = cleanFirst('reservations',['reservation_id','id']);
    $email = cleanFirst('reservations',['email','reservation_email']);
    $comment = cleanFirst('reservations',['comment','notes','reservation_notes']);
    if ($pk && ($email || $comment)) {
        $q = $db->table('reservations')->where(function($w) use ($email,$comment) {
            $used = false;
            if ($comment) {
                $w->where($comment,'like','%'.PMD_CLEAN_MARKER.'%');
                $used = true;
            }
            if ($email) {
                $method = $used ? 'orWhere' : 'where';
                $w->{$method}($email,'like','%@'.PMD_CLEAN_DOMAIN);
            }
        });
        $reservationIds = $q->pluck($pk)->map('intval')->filter()->values()->all();
    }
}

$menuIds = $schema->hasTable('menus') && cleanHas('menus','menu_name')
    ? $db->table('menus')->where('menu_name','like',PMD_CLEAN_PREFIX.'%')->pluck('menu_id')->map('intval')->filter()->values()->all()
    : [];
$categoryIds = $schema->hasTable('categories') && cleanHas('categories','name')
    ? $db->table('categories')->where('name','like',PMD_CLEAN_PREFIX.'%')->pluck('category_id')->map('intval')->filter()->values()->all()
    : [];
$shiftIds = $schema->hasTable('pmd_operational_shifts') && cleanHas('pmd_operational_shifts','notes')
    ? $db->table('pmd_operational_shifts')->where('notes','like','%'.PMD_CLEAN_MARKER.'%')->pluck('id')->map('intval')->filter()->values()->all()
    : [];
$personIds = $schema->hasTable('pmd_operational_people') && cleanHas('pmd_operational_people','display_name')
    ? $db->table('pmd_operational_people')->where('display_name','like',PMD_CLEAN_PREFIX.'%')->pluck('id')->map('intval')->filter()->values()->all()
    : [];

$preview = [
    'orders'=>count($orderIds),
    'reservations'=>count($reservationIds),
    'menus'=>count($menuIds),
    'categories'=>count($categoryIds),
    'operational_shifts'=>count($shiftIds),
    'operational_people'=>count($personIds),
];

echo "DATABASE=tomo\nLOCATION=1\n";
echo "CLEANUP_PREVIEW=".json_encode($preview, JSON_UNESCAPED_SLASHES)."\n";

if (!$apply) {
    echo "CLEANUP_RESULT=DRY_RUN\n";
    exit(0);
}

$db->beginTransaction();
try {
    $deleted = [];

    if ($schema->hasTable('status_history') && cleanHas('status_history','comment')) {
        $deleted['status_history'] = $db->table('status_history')
            ->where('comment','like','%'.PMD_CLEAN_MARKER.'%')
            ->delete();
    }

    foreach (['payment_logs','order_notes','order_totals','order_menus','pmd_order_eta_events'] as $table) {
        if ($orderIds && $schema->hasTable($table) && cleanHas($table,'order_id')) {
            $deleted[$table] = $db->table($table)->whereIn('order_id',$orderIds)->delete();
        }
    }

    if ($schema->hasTable('reviews')) {
        $reviewCols = cleanCols('reviews');
        $commentCols = array_values(array_intersect(['review_text','comment','review','message'],$reviewCols));
        if ($commentCols) {
            $deleted['reviews'] = $db->table('reviews')->where(function($q) use ($commentCols) {
                foreach ($commentCols as $index=>$column) {
                    if ($index === 0) $q->where($column,'like','%'.PMD_CLEAN_MARKER.'%');
                    else $q->orWhere($column,'like','%'.PMD_CLEAN_MARKER.'%');
                }
            })->delete();
        }
    }

    if ($orderIds && $schema->hasTable('orders')) {
        $pk = cleanFirst('orders',['order_id','id']);
        $deleted['orders'] = $db->table('orders')->whereIn($pk,$orderIds)->delete();
    }

    if ($reservationIds && $schema->hasTable('reservation_tables')) {
        $deleted['reservation_tables'] = $db->table('reservation_tables')->whereIn('reservation_id',$reservationIds)->delete();
    }
    if ($reservationIds && $schema->hasTable('reservations')) {
        $pk = cleanFirst('reservations',['reservation_id','id']);
        $deleted['reservations'] = $db->table('reservations')->whereIn($pk,$reservationIds)->delete();
    }

    if ($shiftIds && $schema->hasTable('pmd_operational_shift_people')) {
        $deleted['pmd_operational_shift_people'] = $db->table('pmd_operational_shift_people')->whereIn('shift_id',$shiftIds)->delete();
    }
    if ($shiftIds) {
        $deleted['pmd_operational_shifts'] = $db->table('pmd_operational_shifts')->whereIn('id',$shiftIds)->delete();
    }
    if ($personIds) {
        $deleted['pmd_operational_people'] = $db->table('pmd_operational_people')->whereIn('id',$personIds)->delete();
    }

    if ($schema->hasTable('tips_shifts') && cleanHas('tips_shifts','notes')) {
        $deleted['tips_shifts'] = $db->table('tips_shifts')->where('notes','like','%'.PMD_CLEAN_MARKER.'%')->delete();
    }

    if ($schema->hasTable('locationables')) {
        if ($menuIds) {
            $deleted['locationables_menus'] = $db->table('locationables')
                ->where('location_id',1)->where('locationable_type','menus')->whereIn('locationable_id',$menuIds)->delete();
        }
        if ($categoryIds) {
            $deleted['locationables_categories'] = $db->table('locationables')
                ->where('location_id',1)->where('locationable_type','categories')->whereIn('locationable_id',$categoryIds)->delete();
        }
    }

    if ($schema->hasTable('menu_categories')) {
        if ($menuIds) {
            $deleted['menu_categories'] = $db->table('menu_categories')->whereIn('menu_id',$menuIds)->delete();
        } elseif ($categoryIds) {
            $deleted['menu_categories'] = $db->table('menu_categories')->whereIn('category_id',$categoryIds)->delete();
        }
    }
    if ($menuIds) $deleted['menus'] = $db->table('menus')->whereIn('menu_id',$menuIds)->delete();
    if ($categoryIds) $deleted['categories'] = $db->table('categories')->whereIn('category_id',$categoryIds)->delete();

    $db->commit();
    echo "CLEANUP_RESULT=PASS\n";
    echo json_encode($deleted, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
} catch (Throwable $error) {
    try { $db->rollBack(); } catch (Throwable $ignore) {}
    fwrite(STDERR, "CLEANUP_RESULT=FAIL\n".$error->getMessage()."\n");
    exit(10);
}
