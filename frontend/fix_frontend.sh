#!/bin/bash
set -e

echo "🚀 توقف PM2 apps..."
pm2 stop next-app
pm2 stop paymydine-frontend

echo "🧹 پاکسازی node_modules و cache..."
rm -rf node_modules package-lock.json
npm cache clean --force

echo "⬇️ نصب دوباره بسته‌ها..."
npm install

echo "🛡️ اجرای audit و رفع آسیب‌پذیری‌ها..."
npm audit fix || true
npm audit fix --force || true

echo "✅ همه بسته‌ها به‌روز و آسیب‌پذیری‌ها بررسی شدند."

echo "📦 راه‌اندازی مجدد PM2..."
pm2 start next-app
pm2 start paymydine-frontend

echo "🎉 اسکریپت تمام شد، لطفاً فرانت‌اند رو تست کن!"
