#!/usr/bin/env php
<?php

require __DIR__ . '/bootstrap/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$p = DB::connection()->getTablePrefix();
$table = $p . 'media_attachments';

echo "\nFix media_attachments.disk column (set hash from name when disk='media')\n";
echo "Table: {$table}\n\n";

$count = DB::table('media_attachments')->where('disk', 'media')->count();
echo "Rows where disk='media': {$count}\n";

if ($count === 0) {
    echo "Nothing to fix.\n\n";
    exit(0);
}

// Use raw SQL to set disk = filename without extension where disk = 'media'
// MySQL: UPDATE ti_media_attachments SET disk = SUBSTRING_INDEX(name, '.', 1) WHERE disk = 'media';
$updated = DB::update("
    UPDATE {$table}
    SET disk = SUBSTRING_INDEX(name, '.', 1)
    WHERE disk = 'media'
    AND name IS NOT NULL
    AND name != ''
    AND CHAR_LENGTH(SUBSTRING_INDEX(name, '.', 1)) >= 9
");

echo "Updated {$updated} rows.\n";
echo "Run COMPREHENSIVE_IMAGE_DIAGNOSTIC.sh again to verify.\n\n";
