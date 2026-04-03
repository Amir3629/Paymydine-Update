<?php

$file = __DIR__ . '/app/admin/models/config/payments_model.php';

if (!is_file($file)) {
    fwrite(STDERR, "ERROR: file not found: $file\n");
    exit(1);
}

$src = file_get_contents($file);
if ($src === false) {
    fwrite(STDERR, "ERROR: cannot read file: $file\n");
    exit(1);
}

$backup = $file . '.bak.' . date('Ymd_His');
if (!copy($file, $backup)) {
    fwrite(STDERR, "ERROR: cannot create backup: $backup\n");
    exit(1);
}

$replacements = [
    // code
    "/'code'\\s*=>\\s*\\[(?:[^\\[\\]]|\\[(?:[^\\[\\]]|\\[[^\\]]*\\])*\\])*?\\],/s" =>
"'code' => [
        'label' => 'lang:admin::lang.payments.label_code',
        'type' => 'text',
        'span' => 'right',
        'cssClass' => 'flex-width',
        'readOnly' => false,
    ],",

    // description
    "/'description'\\s*=>\\s*\\[(?:[^\\[\\]]|\\[(?:[^\\[\\]]|\\[[^\\]]*\\])*\\])*?\\],/s" =>
"'description' => [
        'label'    => 'lang:admin::lang.label_description',
        'type'     => 'textarea',
        'disabled' => false,
        'span'     => 'left',
    ],",

    // is_default
    "/'is_default'\\s*=>\\s*\\[(?:[^\\[\\]]|\\[(?:[^\\[\\]]|\\[[^\\]]*\\])*\\])*?\\],/s" =>
"'is_default' => [
        'label' => 'lang:admin::lang.payments.label_default',
        'type' => 'switch',
        'span' => 'right',
        'cssClass' => 'flex-width',
        'onText' => 'admin::lang.text_yes',
        'offText' => 'admin::lang.text_no',
        'disabled' => false,
    ],",

    // status
    "/'status'\\s*=>\\s*\\[(?:[^\\[\\]]|\\[(?:[^\\[\\]]|\\[[^\\]]*\\])*\\])*?\\],/s" =>
"'status' => [
        'label' => 'lang:admin::lang.label_status',
        'type' => 'switch',
        'span' => 'right',
        'cssClass' => 'flex-width',
        'onText' => 'admin::lang.text_enabled',
        'offText' => 'admin::lang.text_disabled',
        'disabled' => false,
    ],",
];

$markerStart = "config['form']['fields'] = [";
$startPos = strpos($src, $markerStart);
if ($startPos === false) {
    fwrite(STDERR, "ERROR: form fields block not found\n");
    exit(1);
}

$returnPos = strrpos($src, "return \$config;");
if ($returnPos === false || $returnPos <= $startPos) {
    fwrite(STDERR, "ERROR: return \$config not found\n");
    exit(1);
}

$formBlock = substr($src, $startPos, $returnPos - $startPos);

$originalFormBlock = $formBlock;
foreach ($replacements as $pattern => $replacement) {
    $formBlock = preg_replace($pattern, $replacement, $formBlock, 1);
}

if ($formBlock === null) {
    fwrite(STDERR, "ERROR: preg_replace failed\n");
    exit(1);
}

if ($formBlock === $originalFormBlock) {
    echo "NO FORM FIELD CHANGES APPLIED\n";
    echo "Backup: $backup\n";
} else {
    $src = substr($src, 0, $startPos) . $formBlock . substr($src, $returnPos);
    if (file_put_contents($file, $src) === false) {
        fwrite(STDERR, "ERROR: failed writing patched file\n");
        exit(1);
    }
    echo "PATCHED FILE: $file\n";
    echo "BACKUP FILE:  $backup\n";
}

echo "\n=== CURRENT FORM FIELD BLOCK ===\n";
if (preg_match("/\\\$config\\['form'\\]\\['fields'\\]\\s*=\\s*\\[(.*?)\\n\\];/s", $src, $m)) {
    echo $m[0] . "\n";
} else {
    echo "Could not print form block\n";
}
