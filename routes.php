<?php

/*
 * Root route orchestrator. Route definitions live in focused modules under routes/.
 */
require_once __DIR__.'/routes/root-app-before.php';
require_once __DIR__.'/routes/admin-notifications.php';
require_once __DIR__.'/routes/root-fiskaly-markers.php';
