#!/usr/bin/env bash
set -euo pipefail

# مسیر پایه پروژه
BASE_DIR="/var/www/paymydine"

# مسیرهایی که معمولا فایل TenantDatabaseMiddleware یا DetectTenant توشونه
SEARCH_DIRS=(
    "$BASE_DIR/vendor/tastyigniter/flame/src/Database"
    "$BASE_DIR/app/Http/Middleware"
)

echo "=== جستجو و اصلاح ارجاعات tenant1 ==="

for DIR in "${SEARCH_DIRS[@]}"; do
    if [ -d "$DIR" ]; then
        echo "جستجو در $DIR ..."
        # پیدا کردن فایل‌هایی که 'tenant1' دارند
        FILES=$(grep -Rl "tenant1" "$DIR" || true)
        for FILE in $FILES; do
            echo "اصلاح $FILE ..."
            # backup سریع قبل از تغییر
            cp "$FILE" "$FILE.bak_$(date +%Y%m%d_%H%M%S)"
            # جایگزینی tenant1 با null یا حذف default
            sed -i 's/tenant1//g' "$FILE"
        done
    fi
done

echo "تمام ارجاعات tenant1 حذف شد. اگر نیاز داری default مشخص شود، فقط tenant های واقعی را تعریف کن."
