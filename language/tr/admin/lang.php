<?php

declare(strict_types=1);

use Admin\Classes\PmdPlatformI18n;

// Bridge only. Turkish wording is owned exclusively by:
// app/admin/i18n/platform/tr.php
$english = require base_path('app/admin/language/en/lang.php');

return PmdPlatformI18n::translateNativeTree(
    is_array($english) ? $english : [],
    'admin',
    'tr'
);
