#!/usr/bin/env bash
set -euo pipefail

echo "================ ALL-IN-ONE PAYMYDINE FIX ================="

BASE_DIR="/var/www/paymydine"
TENANTS=("mimoza" "rosana")
MYSQL_ROOT="root"
MYSQL_PASS="P@ssw0rd@123"

echo "=== پاکسازی cache لاراول ==="
cd "$BASE_DIR"
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

echo "=== ایجاد جدول‌ها و seed کردن داده‌ها برای tenant ها ==="
for DB in "${TENANTS[@]}"; do
    echo "--- Processing $DB ---"
    
    mysql -u "$MYSQL_ROOT" -p"$MYSQL_PASS" -e "
    CREATE DATABASE IF NOT EXISTS \`$DB\`;
    USE \`$DB\`;

    CREATE TABLE IF NOT EXISTS ti_menus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        menu_status TINYINT(1) DEFAULT 0,
        is_halal TINYINT(1) NOT NULL DEFAULT 0,
        is_vegetarian TINYINT(1) NOT NULL DEFAULT 0,
        is_vegan TINYINT(1) NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS allergens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        status TINYINT(1) DEFAULT 1,
        created_at DATETIME,
        updated_at DATETIME
    );

    INSERT IGNORE INTO allergens (name, description, status, created_at, updated_at) VALUES
    ('Gluten', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW()),
    ('Crustaceans', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW()),
    ('Eggs', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW()),
    ('Fish', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW()),
    ('Peanuts', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW()),
    ('Soy', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW()),
    ('Milk / Lactose', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW()),
    ('Nuts', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW()),
    ('Celery', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW()),
    ('Mustard', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW()),
    ('Sesame', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW()),
    ('Sulphites', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW()),
    ('Lupin', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW()),
    ('Molluscs', 'Display tag for restaurant-provided allergy information only.', 1, NOW(), NOW());
    "
done

echo "=== Build frontend ==="
cd "$BASE_DIR/frontend"
npm install
npm run build

echo "================ DONE! ================="
echo "تمام tenantها آماده و frontend ساخته شد. هیچ ارجاعی به tenant1 وجود ندارد."
