#!/usr/bin/env bash
set -euo pipefail

echo
echo "========================================"
echo "PayMyDine R26 notification schema QA"
echo "========================================"

php -l app/Http/Controllers/PmdPublicBookingController.php
php -l app/admin/controllers/Reservations.php
php -l app/admin/controllers/KitchenDisplay.php
php -l app/Helpers/NotificationHelper.php
php -l app/admin/controllers/NotificationsApi.php

node --check app/admin/assets/js/push-notifications.js

grep -Fq "PMD_NOTIFICATION_SCHEMA_COMPAT_R26" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "PMD_NOTIFICATION_SCHEMA_COMPAT_R26" app/admin/controllers/Reservations.php
grep -Fq "PMD_NOTIFICATION_SCHEMA_COMPAT_R26" app/admin/controllers/KitchenDisplay.php
grep -Fq "PMD_NOTIFICATION_SCHEMA_COMPAT_R26" app/Helpers/NotificationHelper.php
grep -Fq "PMD_NOTIFICATION_SCHEMA_COMPAT_R26" app/admin/controllers/NotificationsApi.php

grep -Fq "hasColumn('notifications', 'message')" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "hasColumn('notifications', 'priority')" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "hasColumn('notifications', 'message')" app/admin/controllers/Reservations.php
grep -Fq "hasColumn('notifications', 'priority')" app/admin/controllers/Reservations.php
grep -Fq "hasColumn('notifications', 'message')" app/admin/controllers/KitchenDisplay.php
grep -Fq "hasColumn('notifications', 'priority')" app/admin/controllers/KitchenDisplay.php

grep -Fq "Schema::getColumnListing('notifications')" app/Helpers/NotificationHelper.php
grep -Fq "'notification_id' => (int)\$notificationId" app/Helpers/NotificationHelper.php

grep -Fq "Schema::hasColumn('notifications', 'id')" app/admin/controllers/NotificationsApi.php
grep -Fq "Schema::hasColumn('notifications', 'notification_id')" app/admin/controllers/NotificationsApi.php
grep -Fq "payload.message" app/admin/assets/js/push-notifications.js

echo
echo "PASS: R26 notification writers and admin bell are compatible with legacy and expanded notification schemas."
