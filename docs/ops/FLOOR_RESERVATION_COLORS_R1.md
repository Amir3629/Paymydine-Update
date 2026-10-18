# Floor reservation colors R1 — audit, tests and deployment

## Scope
Two distinct floor engines exist:
- The shared exact Floor for Dashboard Lab, Reservations, Manager, Cashier and Quick POS (pmd-dashboard-lab-exact-floor-v1.js, shared Blade).
- The legacy Floor engine for standalone /admin/floor and Ownerboard (pmd-floor-v1.js).

The shared CSS previously forced all non-available statuses red on Dashboard Lab while other pages kept different colors. Physical operational_status was mixed with historical order links, making some free tables red. Dashboard Lab omitted reservation busy windows and its refresh handler.

This patch uses the physical table status, location-scoped non-canceled reservation windows, and a shared JavaScript status classifier. It adds one tenant setting in Restaurant profile, Reservations — Floor map alerts, default 15 minutes, choices 0, 5, 10, 15, 20, 30, 45, 60, 90 or 120.

Green: available.
Blue: a future non-canceled assigned reservation starts within the configured lead time.
Red: physically occupied or active reservation.
Amber: cleaning or attention when not occupied.
Grey: disabled.

A busy reservation is stronger than a note but the note/waiter-call badge remains. Disabled and cleaning states stay protected. The canonical location clock handles timezone. No database migrations or Nginx edits.

## Read-only automated tests
Run before deployment in staging or test checkout:

    node scripts/test-pmd-floor-reservation-r1.js
    php scripts/test-pmd-floor-reservation-r1.php
    php -l app/admin/services/PmdFloorReservationWindowsV1.php
    php -l app/admin/controllers/Dashboardlab.php
    php -l app/admin/controllers/PmdQuickPosV1.php
    php -l app/admin/controllers/PmdFloorV1.php
    php -l app/admin/controllers/Pmdsettings.php
    php -l app/admin/controllers/Ownerboard.php
    php -l app/admin/classes/PmdCleanWorkspaceControllerV1.php

GitHub source inspection and JS syntax/behavior tests were performed, but PHP lint and live browser integration must still run in a runtime with PHP.

## Manual QA — test tenant only

1. Verify the same table statuses on Dashboard, Reservations, Manager, Cashier, Quick POS, standalone Floor and Ownerboard.
2. A physically free table with a historical completed order is green, not red.
3. A physically occupied table stays red until staff explicitly releases it, independent of payment/KDS.
4. Create a future reservation on a test table; observe green, then blue at selected notice time, then red at reservation start, then return to physical state after reservation ends.
5. Canceled reservations must not color any table. Test overlap with two future reservations.
6. Disabled grey, cleaning amber, attention amber unless an active booking (red), and waiter badges still visible.
7. Switch 0, 5, 15, and 30 minutes in the restaurant profile; ensure saved values apply across pages after reload.
8. Verify active-floor filtering, table ID uniqueness, merged tables, One Row and Full Floor, all without floor position jumps.
9. Verify colors change on reservation lead/start/end boundaries without page refresh and update when tab regains focus.
10. Verify locations with different timezone and that another location's reservation never affects current tables.
11. Verify non-Owner table-management permissions remain unchanged and bookings/orders/QR/merges still work.

Android packaged/offline parity is not part of this web-only patch; test native APK before claiming Android parity.

## Production rollout, only after review and staging QA

Do not overwrite local VPS edits. Preserve a backup branch and use fast-forward merge:

    cd /var/www/paymydine
    git status --short
    git branch "backup/floor-colors-$(date +%Y%m%d-%H%M%S)"
    git -c gc.auto=0 fetch origin main
    git -c gc.auto=0 merge --ff-only origin/main
    node scripts/test-pmd-floor-reservation-r1.js
    php scripts/test-pmd-floor-reservation-r1.php
    php artisan view:clear

If merge conflicts, stop and inspect. Never use sudo git pull or git reset --hard on production. Roll back through a reviewed Git revert, not a destructive reset.
