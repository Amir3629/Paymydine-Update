<?php

/**
 * Historical Worldline probe routes were retired in September 2026.
 *
 * This file remains because app/admin/routes.php requires it for backwards
 * compatibility with deployed route manifests. It intentionally registers no
 * routes.
 *
 * Removed legacy surfaces included:
 * - public/admin configuration diagnostics;
 * - standalone hosted-checkout creation using client-supplied amounts;
 * - unsigned webhook logging;
 * - a raw-card probe that accepted PAN/CVV in PayMyDine-owned inputs/server
 *   memory and could serialize sensitive card data into logs.
 *
 * Canonical Worldline integrations must use the shared PayMyDine payment
 * orchestration routes and Worldline-hosted secure UI. Never add raw PAN/CVV
 * handling back to this file.
 */
