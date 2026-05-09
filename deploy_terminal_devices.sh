#!/bin/bash
# ========================================
# 🚀 Deploy Terminal Devices Platform Updates
# ========================================

echo "🔧 شروع عملیات Deploy Terminal Devices Platform ..."

# مسیر پروژه اصلی روی سرور
PROJECT_DIR="/var/www/paymydine"
TMP_DIR="/tmp/paymydine_update"

# ریپازیتوری گیت
GIT_REPO="https://github.com/Amir3629/Paymydine-Update.git"
BRANCH="codex/create-terminal-devices-management-page"

# 1️⃣ کلون کردن شاخه در tmp
echo "📥 کلون کردن شاخه $BRANCH در $TMP_DIR ..."
rm -rf $TMP_DIR
git clone --branch $BRANCH $GIT_REPO $TMP_DIR

if [ $? -ne 0 ]; then
    echo "❌ خطا در کلون کردن ریپازیتوری"
    exit 1
fi

# 2️⃣ کپی کردن فایل‌ها به پروژه اصلی
echo "📂 کپی کردن فایل‌ها به $PROJECT_DIR ..."
rsync -av --exclude='.git' $TMP_DIR/ $PROJECT_DIR/

# 3️⃣ تنظیم دسترسی‌ها
echo "🔧 تنظیم دسترسی‌ها ..."
chown -R www-data:www-data $PROJECT_DIR
chmod -R 775 $PROJECT_DIR/storage $PROJECT_DIR/bootstrap/cache

# 4️⃣ پاکسازی کش لاراول
echo "♻️ پاکسازی کش لاراول ..."
cd $PROJECT_DIR
php artisan view:clear
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# 5️⃣ اجرای میگریشن‌ها
echo "🛠 اجرای میگریشن‌ها ..."
php artisan migrate --force

echo "✅ Deploy کامل شد! صفحه Terminal Devices Platform آماده است."
echo "🔗 بازدید از صفحه: https://your-domain.com/admin/terminal_devices_platform"
