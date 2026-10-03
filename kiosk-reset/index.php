<?php
// PMD_KIOSK_BLADE_RESET_PHYSICAL_ENTRY_V8
// Nginx adds a slash when a physical directory wins try_files. Normalize the
// URI back to the Laravel route while preserving its query string.
if (isset($_SERVER['REQUEST_URI'])) {
    $_SERVER['REQUEST_URI'] = preg_replace(/^\/kiosk-reset\/(?=\?|$)/, '/kiosk-reset', $_SERVER['REQUEST_URI']);
}
require dirname(__DIR__).'/index.php';
