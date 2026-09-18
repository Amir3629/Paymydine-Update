<?php

/**
 * PMD_TOMO_REMOVE_IMAGELESS_FOODS_R1
 *
 * Preview by default. Applies only with:
 *   --apply --confirm=DELETE_TOMO_IMAGELESS_FOODS
 *
 * Safety:
 * - CLI only
 * - Hard locked to tenant database "tomo"
 * - Detects real menu images from menu_images and media_attachments
 * - Refuses apply if any target food is still used by a combo
 * - Writes a JSON backup of target and related rows before deleting
 * - Uses Menus_model::delete() so the canonical model delete lifecycle runs
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "RESULT=STOP_CLI_ONLY\n");
    exit(2);
}

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Admin\Models\Menus_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$options = getopt('', ['apply', 'confirm:']);
$apply = array_key_exists('apply', $options);
$confirm = (string)($options['confirm'] ?? '');

config([
    'database.default' => 'tenant',
    'database.connections.tenant.database' => 'tomo',
]);

DB::purge('tenant');
DB::setDefaultConnection('tenant');
DB::reconnect('tenant');

$db = DB::connection('tenant');
$schema = Schema::connection('tenant');
$dbName = (string)$db->getDatabaseName();

echo "DATABASE={$dbName}\n";

if ($dbName !== 'tomo') {
    fwrite(STDERR, "RESULT=STOP_WRONG_DATABASE\n");
    exit(3);
}

if (!$schema->hasTable('menus')) {
    fwrite(STDERR, "RESULT=STOP_MISSING_MENUS_TABLE\n");
    exit(4);
}

$menuColumns = $schema->getColumnListing('menus');
if (!in_array('menu_id', $menuColumns, true) || !in_array('menu_name', $menuColumns, true)) {
    fwrite(STDERR, "RESULT=STOP_UNEXPECTED_MENUS_SCHEMA\n");
    exit(5);
}

$hasMenuImages = $schema->hasTable('menu_images');
$hasMedia = $schema->hasTable('media_attachments');

$galleryIds = [];
if ($hasMenuImages) {
    $cols = $schema->getColumnListing('menu_images');
    if (in_array('menu_id', $cols, true) && in_array('image_path', $cols, true)) {
        $galleryIds = $db->table('menu_images')
            ->whereNotNull('image_path')
            ->whereRaw("TRIM(image_path) <> ''")
            ->pluck('menu_id')
            ->map(static fn($id) => (int)$id)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}

$mediaIds = [];
if ($hasMedia) {
    $cols = $schema->getColumnListing('media_attachments');
    if (in_array('attachment_id', $cols, true) && in_array('attachment_type', $cols, true)) {
        $q = $db->table('media_attachments')
            ->whereIn('attachment_type', [
                'menus',
                'Admin\\Models\\Menus_model',
            ]);

        if (in_array('file_name', $cols, true)) {
            $q->whereNotNull('file_name')->whereRaw("TRIM(file_name) <> ''");
        }

        $mediaIds = $q->pluck('attachment_id')
            ->map(static fn($id) => (int)$id)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}

$imageIds = array_values(array_unique(array_merge($galleryIds, $mediaIds)));

$targetQuery = $db->table('menus')
    ->select('menu_id', 'menu_name');

if ($imageIds) {
    $targetQuery->whereNotIn('menu_id', $imageIds);
}

$targets = $targetQuery
    ->orderBy('menu_id')
    ->get();

echo "IMAGE_SOURCE_MENU_IMAGES=".count($galleryIds)."\n";
echo "IMAGE_SOURCE_MEDIA_ATTACHMENTS=".count($mediaIds)."\n";
echo "IMAGELESS_FOODS=".$targets->count()."\n";

foreach ($targets as $row) {
    echo "TARGET #".(int)$row->menu_id." | ".trim((string)$row->menu_name)."\n";
}

if ($targets->isEmpty()) {
    echo "RESULT=PASS_NOTHING_TO_DELETE\n";
    exit(0);
}

$targetIds = $targets->pluck('menu_id')->map(static fn($id) => (int)$id)->all();

$comboRefs = collect();
if ($schema->hasTable('menu_combo_items')) {
    $comboCols = $schema->getColumnListing('menu_combo_items');
    if (in_array('menu_id', $comboCols, true)) {
        $comboRefs = $db->table('menu_combo_items')
            ->whereIn('menu_id', $targetIds)
            ->get();

        if ($comboRefs->isNotEmpty()) {
            echo "COMBO_REFERENCES=".$comboRefs->count()."\n";
            foreach ($comboRefs as $ref) {
                echo "COMBO_REF menu_id=".(int)($ref->menu_id ?? 0)
                    ." combo_id=".(int)($ref->combo_id ?? 0)."\n";
            }
        }
    }
}

if (!$apply) {
    echo "RESULT=PREVIEW_ONLY\n";
    echo "APPLY_COMMAND=php scripts/pmd-tomo-remove-imageless-foods.php --apply --confirm=DELETE_TOMO_IMAGELESS_FOODS\n";
    exit(0);
}

if ($confirm !== 'DELETE_TOMO_IMAGELESS_FOODS') {
    fwrite(STDERR, "RESULT=STOP_BAD_CONFIRMATION\n");
    exit(6);
}

if ($comboRefs->isNotEmpty()) {
    fwrite(STDERR, "RESULT=STOP_COMBO_REFERENCES\n");
    fwrite(STDERR, "NOTE=No data was changed. These foods are still used by combos.\n");
    exit(7);
}

$backup = [
    'database' => $dbName,
    'created_at' => date('c'),
    'target_ids' => $targetIds,
    'targets' => $db->table('menus')->whereIn('menu_id', $targetIds)->get()->map(fn($r) => (array)$r)->all(),
    'related' => [],
];

$relatedTables = [
    'menu_categories',
    'menu_mealtimes',
    'menu_images',
    'menu_item_options',
    'menu_prices',
    'menus_specials',
];

foreach ($relatedTables as $table) {
    if (!$schema->hasTable($table)) {
        continue;
    }

    $cols = $schema->getColumnListing($table);
    if (!in_array('menu_id', $cols, true)) {
        continue;
    }

    $backup['related'][$table] = $db->table($table)
        ->whereIn('menu_id', $targetIds)
        ->get()
        ->map(fn($r) => (array)$r)
        ->all();
}

if ($schema->hasTable('locationables')) {
    $cols = $schema->getColumnListing('locationables');
    if (
        in_array('locationable_type', $cols, true)
        && in_array('locationable_id', $cols, true)
    ) {
        $backup['related']['locationables'] = $db->table('locationables')
            ->whereIn('locationable_type', ['menus', 'Admin\\Models\\Menus_model'])
            ->whereIn('locationable_id', $targetIds)
            ->get()
            ->map(fn($r) => (array)$r)
            ->all();
    }
}

if ($schema->hasTable('allergenables')) {
    $cols = $schema->getColumnListing('allergenables');
    if (
        in_array('allergenable_type', $cols, true)
        && in_array('allergenable_id', $cols, true)
    ) {
        $backup['related']['allergenables'] = $db->table('allergenables')
            ->whereIn('allergenable_type', ['menus', 'Admin\\Models\\Menus_model'])
            ->whereIn('allergenable_id', $targetIds)
            ->get()
            ->map(fn($r) => (array)$r)
            ->all();
    }
}

$backupDir = dirname(__DIR__).'/storage/pmd-patch-backups';
if (!is_dir($backupDir)) {
    @mkdir($backupDir, 0775, true);
}

$backupFile = $backupDir.'/tomo-imageless-foods-'.date('Ymd_His').'.json';
file_put_contents(
    $backupFile,
    json_encode($backup, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
);

echo "BACKUP={$backupFile}\n";

$deleted = 0;

$db->beginTransaction();

try {
    foreach ($targetIds as $menuId) {
        $menu = (new Menus_model)->setConnection('tenant')->newQuery()->find($menuId);

        if (!$menu) {
            continue;
        }

        $name = trim((string)$menu->menu_name);
        $menu->delete();
        $deleted++;

        echo "DELETED #{$menuId} | {$name}\n";
    }

    $db->commit();
} catch (Throwable $e) {
    $db->rollBack();
    fwrite(STDERR, "RESULT=ERROR_ROLLED_BACK\n");
    fwrite(STDERR, "ERROR=".$e->getMessage()."\n");
    exit(8);
}

$remaining = $db->table('menus')->whereIn('menu_id', $targetIds)->count();

echo "DELETED_COUNT={$deleted}\n";
echo "REMAINING_TARGETS={$remaining}\n";

if ($remaining === 0) {
    echo "RESULT=SUCCESS\n";
    exit(0);
}

echo "RESULT=WARNING_REMAINING_TARGETS\n";
exit(9);
