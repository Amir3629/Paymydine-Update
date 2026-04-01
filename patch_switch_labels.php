<?php

$file = __DIR__ . '/app/admin/models/config/payments_model.php';
if (!file_exists($file)) { fwrite(STDERR, "Missing: $file\n"); exit(1); }

$src = file_get_contents($file);
if ($src === false) { fwrite(STDERR, "Cannot read: $file\n"); exit(1); }

$backup = $file . '.bak.' . date('Ymd_His');
copy($file, $backup);

$changed = false;

/**
 * داخل آرایه‌ی 'is_default' در form.fields، onText/offText اضافه کن اگر ندارن
 */
$src2 = preg_replace_callback(
    "/('is_default'\\s*=>\\s*\\[)([\\s\\S]*?)(\\n\\s*\\],)/m",
    function($m) use (&$changed) {
        $body = $m[2];
        if (preg_match("/'onText'\\s*=>/m", $body) || preg_match("/'offText'\\s*=>/m", $body)) {
            return $m[0];
        }
        $insert = "        'onText'  => 'admin::lang.text_yes',\n".
                  "        'offText' => 'admin::lang.text_no',\n";
        $changed = true;
        return $m[1] . $body . $insert . $m[3];
    },
    $src
);
$src = $src2;

/**
 * داخل آرایه‌ی 'status' در form.fields، onText/offText اضافه کن اگر ندارن
 */
$src2 = preg_replace_callback(
    "/('status'\\s*=>\\s*\\[)([\\s\\S]*?)(\\n\\s*\\],)/m",
    function($m) use (&$changed) {
        $body = $m[2];
        if (preg_match("/'onText'\\s*=>/m", $body) || preg_match("/'offText'\\s*=>/m", $body)) {
            return $m[0];
        }
        // اگر ترجیح می‌دی به جای Enabled/Disabled، Yes/No باشه، این دو خط رو مثل بالا کن
        $insert = "        'onText'  => 'admin::lang.text_enabled',\n".
                  "        'offText' => 'admin::lang.text_disabled',\n";
        $changed = true;
        return $m[1] . $body . $insert . $m[3];
    },
    $src
);
$src = $src2;

if (!$changed) {
    echo "NO CHANGES NEEDED\n";
    echo "Backup: $backup\n";
    exit(0);
}

if (file_put_contents($file, $src) === false) {
    fwrite(STDERR, "Failed to write file (permissions?)\n");
    exit(1);
}

echo "PATCHED: $file\n";
echo "BACKUP:  $backup\n";
echo "DONE\n";
