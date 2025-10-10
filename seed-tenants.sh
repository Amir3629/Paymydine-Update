#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"
APP_USER="${APP_USER:-paymydine}"
APP_PASS="${APP_PASS:-P@ssw0rd@123}"

echo "=========================================="
echo "TENANT DATABASE SEEDING SCRIPT"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  DB Host: $DB_HOST:$DB_PORT"
echo "  DB User: $DB_USER"
echo "  App User: $APP_USER"
echo "  Tenants: rosana, mimoza"
echo ""

echo "[1/4] Creating databases (rosana, mimoza)..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} <<SQL
CREATE DATABASE IF NOT EXISTS rosana CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS mimoza CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL
echo "✅ Databases created"
echo ""

echo "[2/4] Granting privileges to ${APP_USER}..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} <<SQL
GRANT ALL PRIVILEGES ON rosana.* TO '${APP_USER}'@'localhost' IDENTIFIED BY '${APP_PASS}';
GRANT ALL PRIVILEGES ON rosana.* TO '${APP_USER}'@'%' IDENTIFIED BY '${APP_PASS}';
GRANT ALL PRIVILEGES ON mimoza.* TO '${APP_USER}'@'localhost' IDENTIFIED BY '${APP_PASS}';
GRANT ALL PRIVILEGES ON mimoza.* TO '${APP_USER}'@'%' IDENTIFIED BY '${APP_PASS}';
FLUSH PRIVILEGES;
SQL
echo "✅ Privileges granted"
echo ""

# Function to run migrations + minimal seed into a tenant DB
migrate_and_seed () {
  local DBNAME="$1"
  echo "[3/${2}] Migrating & seeding ${DBNAME}..."
  
  # Backup current .env
  cp .env .env.bak
  
  # Temporarily patch .env for this tenant
  if grep -q '^DB_DATABASE=' .env; then
    sed -i.tmp "s/^DB_DATABASE=.*/DB_DATABASE=${DBNAME}/" .env
  else
    echo "DB_DATABASE=${DBNAME}" >> .env
  fi
  
  if grep -q '^DB_USERNAME=' .env; then
    sed -i.tmp "s/^DB_USERNAME=.*/DB_USERNAME=${APP_USER}/" .env
  else
    echo "DB_USERNAME=${APP_USER}" >> .env
  fi
  
  if grep -q '^DB_PASSWORD=' .env; then
    sed -i.tmp "s/^DB_PASSWORD=.*/DB_PASSWORD=${APP_PASS}/" .env
  else
    echo "DB_PASSWORD=${APP_PASS}" >> .env
  fi
  
  # Run migrations
  echo "  → Running migrations..."
  php artisan migrate --force 2>&1 | grep -E "Migrated|Nothing|Error" || echo "  Migration output: check manually"
  
  # Seed minimal data directly via MySQL
  echo "  → Seeding data..."
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} "$DBNAME" <<SQL
-- Ensure categories table exists with correct columns
CREATE TABLE IF NOT EXISTS ti_categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status TINYINT DEFAULT 1,
  frontend_visible TINYINT DEFAULT 1,
  priority INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ensure menus table exists
CREATE TABLE IF NOT EXISTS ti_menus (
  menu_id INT AUTO_INCREMENT PRIMARY KEY,
  menu_name VARCHAR(255) NOT NULL,
  menu_description TEXT,
  menu_price DECIMAL(10,2) NOT NULL,
  menu_status TINYINT DEFAULT 1,
  menu_photo VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ensure junction table
CREATE TABLE IF NOT EXISTS ti_menu_categories (
  menu_id INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (menu_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert tenant-specific categories
INSERT INTO ti_categories (name, description, status, frontend_visible, priority)
VALUES 
  ('Starters (${DBNAME})','Appetizers and small plates',1,1,1),
  ('Mains (${DBNAME})','Main courses',1,1,2),
  ('Desserts (${DBNAME})','Sweet treats',1,1,3)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert tenant-specific menu items
INSERT INTO ti_menus (menu_name, menu_description, menu_price, menu_status)
VALUES
  ('Soup ${DBNAME} Special','House special soup',5.50,1),
  ('${DBNAME} Signature Salad','Fresh greens',7.90,1),
  ('Grilled Fish ${DBNAME}','Daily catch',15.90,1),
  ('${DBNAME} Pasta','Handmade pasta',12.50,1),
  ('${DBNAME} Cake','Homemade dessert',6.00,1)
ON DUPLICATE KEY UPDATE menu_name=VALUES(menu_name);

-- Link menus to categories
INSERT IGNORE INTO ti_menu_categories (menu_id, category_id)
  SELECT m.menu_id, c.category_id 
  FROM ti_menus m 
  CROSS JOIN ti_categories c
  WHERE m.menu_name LIKE '%${DBNAME}%' 
  AND c.name LIKE '%${DBNAME}%'
  LIMIT 5;
SQL
  
  echo "✅ ${DBNAME} ready"
  echo ""
  
  # Restore .env
  mv .env.bak .env
  rm -f .env.tmp
}

migrate_and_seed rosana 4
migrate_and_seed mimoza 5

echo "[4/4] Verifying seeded data..."
echo ""
echo "Rosana menu count:"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -e "SELECT COUNT(*) as count FROM ti_menus WHERE menu_name LIKE '%rosana%'" rosana
echo ""
echo "Mimoza menu count:"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -e "SELECT COUNT(*) as count FROM ti_menus WHERE menu_name LIKE '%mimoza%'" mimoza
echo ""

echo "=========================================="
echo "✅ TENANT SEEDING COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start server: php artisan serve"
echo "2. Run tests: ./supermax-test.sh"

