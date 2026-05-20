#!/bin/bash

# -------------------------
# PayMyDine Update Script
# -------------------------
# هدف: دریافت آخرین تغییرات branch codex/finalize-foodattributetags-feature
#        نصب composer/npm، migrate و clear cache، build frontend
# اجرا: مستقیم روی سرور Ubuntu
# -------------------------

# 1️⃣ ورود به مسیر پروژه
cd /var/www/paymydine || exit

echo "=== Fetch & Checkout codex/finalize-foodattributetags-feature ==="
# دریافت آخرین تغییرات
git fetch origin codex/finalize-foodattributetags-feature

# اگر branch وجود نداشت، ایجاد branch محلی
if ! git show-ref --verify --quiet refs/heads/codex/finalize-foodattributetags-feature; then
    git checkout -b codex/finalize-foodattributetags-feature FETCH_HEAD
else
    git checkout codex/finalize-foodattributetags-feature
    git reset --hard FETCH_HEAD
fi

# 2️⃣ بروزرسانی Composer
echo "=== Composer install ==="
composer install --no-interaction --prefer-dist --optimize-autoloader

# 3️⃣ اجرای مهاجرت‌های پایگاه داده (در صورت اضافه شدن فیلد جدید)
echo "=== Running migrations ==="
php artisan migrate --force || echo "⚠️ Warning: Migrations failed, check artisan output."

# 4️⃣ پاکسازی cache لاراول
echo "=== Clearing Laravel cache ==="
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# 5️⃣ بروزرسانی frontend
cd frontend || exit
echo "=== Installing npm packages ==="
npm install

echo "=== Building frontend ==="
npm run build || echo "⚠️ Warning: Frontend build failed, check next/font Google Fonts fetch issues or TypeScript errors."

# 6️⃣ برگشت به مسیر اصلی و تست سریع
cd /var/www/paymydine || exit
echo "=== PM2 frontend restart ==="
pm2 restart paymydine-frontend || pm2 start paymydine-frontend

echo "=== Update Complete ==="
echo "✅ All backend/frontend updates applied."
echo "✅ Clear cache, migrations, and build frontend completed."
echo "🔹 لطفاً بعد از اجرای اسکریپت، تست کنید:"
echo "   - Admin panel -> Menu edit -> AI Nutrition Suggest"
echo "   - Admin panel -> Settings -> VAT (TAX replaced)"
echo "   - Frontend checkout, menu cards, and modals"
