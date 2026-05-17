#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/var/www/paymydine"
BACKUP_DIR="$BASE_DIR/.tenant1_backup_$(date +%Y%m%d_%H%M%S)"

echo "=== ایجاد backup از فایل‌ها ==="
mkdir -p "$BACKUP_DIR"
rsync -av --include='*/' --include='*.php' --exclude='*' "$BASE_DIR/" "$BACKUP_DIR/"

echo "=== جستجوی خطوط حاوی 'tenant1' ==="
grep -rnw "$BASE_DIR" -e 'tenant1' --include \*.php > tenant1_refs.txt

echo "تمام ارجاعات به tenant1 در فایل tenant1_refs.txt ذخیره شد."
echo "Backup فایل‌ها در: $BACKUP_DIR"

echo "=== نمونه: علامت‌گذاری lines به جای حذف مستقیم ==="
while IFS= read -r line
do
    FILE=$(echo "$line" | cut -d: -f1)
    LINENO=$(echo "$line" | cut -d: -f2)
    echo "علامت‌گذاری $FILE:$LINENO"
    # کامنت کردن خط (می‌توانید # را حذف کنید و تغییر واقعی بدهید)
    sed -i "${LINENO}s/^/\/\/ FIXME tenant1 removed: /" "$FILE"
done < tenant1_refs.txt

echo "تمام خطوط tenant1 علامت‌گذاری شدند."
