#!/usr/bin/env bash
cd /var/www/paymydine || exit 1

# لیست فایل‌های احتمالی مرتبط با orders و تراکنش‌ها
files=(
    "app/admin/views/orders/edit.blade.php"
    "app/admin/views/orders/index.blade.php"
    "app/admin/controllers/Orders.php"
    "app/admin/controllers/OrderController.php"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "==================== محتویات فایل: $file ===================="
        cat "$file"
        echo
    else
        echo "⚠️ فایل پیدا نشد: $file"
    fi
done
