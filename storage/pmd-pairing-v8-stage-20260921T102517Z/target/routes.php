<?php

/*
 * Root route orchestrator. Route definitions live in focused modules under routes/.
 */
require_once __DIR__.'/routes/root-app-before.php';
// PMD_MOBILE_SYNC_EARLY_ROOT_LOADER_V8
// Register native Android browser/API routes before the Admin catch-all.
require_once __DIR__.'/routes/pmd-mobile-sync-v1.php';
require_once __DIR__.'/routes/admin-notifications.php';
require_once __DIR__.'/routes/root-fiskaly-markers.php';
