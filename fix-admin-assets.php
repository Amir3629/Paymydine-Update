<?php
// fix-admin-assets.php
// مسیر پروژه
$baseDir = __DIR__; // یا مسیر اصلی پروژه، مثل /var/www/paymydine

// مسیر فایل‌های blade یا JS که لینک‌ها در آن هستند
$paths = [
    $baseDir . '/app/admin/views',    // اگر Blade views دارید
    $baseDir . '/app/admin/assets/js',// اگر JS فایل‌ها لینک مستقیم دارند
];

// regex برای پیدا کردن لینک JS/CSS با http:// دامنه
$pattern = '#(href|src)=["\']http://[^"\']+/app/admin/assets/([^"\']+)["\']#i';

foreach ($paths as $dir) {
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));
    foreach ($files as $file) {
        if ($file->isFile() && preg_match('/\.(php|blade\.php|js)$/', $file->getFilename())) {
            $contents = file_get_contents($file->getPathname());
            $newContents = preg_replace_callback($pattern, function($matches) {
                // تغییر لینک به relative path
                return $matches[1] . '="/app/admin/assets/' . $matches[2] . '"';
            }, $contents);

            if ($contents !== $newContents) {
                file_put_contents($file->getPathname(), $newContents);
                echo "[Fixed] " . $file->getPathname() . PHP_EOL;
            }
        }
    }
}
echo "✅ تمام لینک‌های HTTP → relative اصلاح شدند.\n";
