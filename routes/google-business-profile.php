<?php

/*
 * PMD_GOOGLE_BUSINESS_LEGACY_ROUTE_STUB_V3
 *
 * Google Business Profile OAuth and Pub/Sub are tenant-owned integrations.
 * Their runtime endpoints live in routes/api.php under /api/v1 so requests
 * stay on the tenant Laravel/API authority instead of the Frontend V2
 * storefront catch-all.
 *
 * Kept as a compatibility stub because older overlay releases created this
 * file on production. Do not register public Google routes here.
 */
