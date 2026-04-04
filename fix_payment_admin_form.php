<?php

$file = __DIR__ . '/app/admin/models/config/payments_model.php';

if (!file_exists($file)) {
    fwrite(STDERR, "ERROR: File not found: {$file}\n");
    exit(1);
}

$content = file_get_contents($file);
if ($content === false) {
    fwrite(STDERR, "ERROR: Cannot read file: {$file}\n");
    exit(1);
}

$original = $content;
$backup = $file . '.bak.' . date('Ymd_His');

if (!copy($file, $backup)) {
    fwrite(STDERR, "ERROR: Could not create backup: {$backup}\n");
    exit(1);
}

$changes = [];

/*
 * 1) description => disabled true  -> false
 */
$new = preg_replace(
    "/('description'\\s*=>\\s*\\[[\\s\\S]*?'disabled'\\s*=>\\s*)true([\\s\\S]*?\\])/m",
    '$1false$2',
    $content,
    1,
    $count
);
if ($count > 0) {
    $content = $new;
    $changes[] = "description.disabled: true -> false";
}

/*
 * 2) code => readOnly true -> false
 */
$new = preg_replace(
    "/('code'\\s*=>\\s*\\[[\\s\\S]*?'readOnly'\\s*=>\\s*)true([\\s\\S]*?\\])/m",
    '$1false$2',
    $content,
    1,
    $count
);
if ($count > 0) {
    $content = $new;
    $changes[] = "code.readOnly: true -> false";
}

/*
 * 3) code => readonly true -> false
 */
$new = preg_replace(
    "/('code'\\s*=>\\s*\\[[\\s\\S]*?'readonly'\\s*=>\\s*)true([\\s\\S]*?\\])/mi",
    '$1false$2',
    $content,
    1,
    $count
);
if ($count > 0) {
    $content = $new;
    $changes[] = "code.readonly: true -> false";
}

/*
 * 4) code => disabled true -> false
 */
$new = preg_replace(
    "/('code'\\s*=>\\s*\\[[\\s\\S]*?'disabled'\\s*=>\\s*)true([\\s\\S]*?\\])/m",
    '$1false$2',
    $content,
    1,
    $count
);
if ($count > 0) {
    $content = $new;
    $changes[] = "code.disabled: true -> false";
}

/*
 * 5) status => disabled true -> false
 */
$new = preg_replace(
    "/('status'\\s*=>\\s*\\[[\\s\\S]*?'disabled'\\s*=>\\s*)true([\\s\\S]*?\\])/m",
    '$1false$2',
    $content,
    1,
    $count
);
if ($count > 0) {
    $content = $new;
    $changes[] = "status.disabled: true -> false";
}

/*
 * 6) is_default => disabled true -> false
 */
$new = preg_replace(
    "/('is_default'\\s*=>\\s*\\[[\\s\\S]*?'disabled'\\s*=>\\s*)true([\\s\\S]*?\\])/m",
    '$1false$2',
    $content,
    1,
    $count
);
if ($count > 0) {
    $content = $new;
    $changes[] = "is_default.disabled: true -> false";
}

if ($content === $original) {
    echo "NO CHANGE NEEDED\n";
    echo "Backup created at: {$backup}\n";
    exit(0);
}

if (file_put_contents($file, $content) === false) {
    fwrite(STDERR, "ERROR: Could not write patched file.\n");
    exit(1);
}

echo "PATCHED FILE: {$file}\n";
echo "BACKUP FILE: {$backup}\n";
echo "CHANGES:\n";
foreach ($changes as $c) {
    echo " - {$c}\n";
}
