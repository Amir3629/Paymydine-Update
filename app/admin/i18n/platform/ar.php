<?php

declare(strict_types=1);

/*
 * Canonical PayMyDine-owned Admin UI copy (Arabic).
 *
 * PMD_OMAN_ADMIN_AR_COMPLETE_R10
 *
 * English remains the structural key authority. Arabic wording is owned by
 * this base catalogue plus the reviewed R10 modules in app/admin/i18n/arabic.
 * This keeps canonical key parity while allowing large Arabic coverage to stay
 * maintainable by product area. Stable legacy PMD copy lives as literal::*
 * entries in the R10 compatibility module; restaurant/customer content is
 * intentionally excluded from every platform catalogue.
 */

$english = require __DIR__.'/en.php';

$base = [
    'shared.add_item' => 'إضافة عنصر',
    'shared.apply' => 'تطبيق',
    'shared.cancel' => 'إلغاء',
    'shared.close' => 'إغلاق',
    'shared.coupon' => 'قسيمة',
    'shared.custom' => 'مخصص',
    'shared.edit_order' => 'تعديل الطلب',
    'shared.optional' => 'اختياري',
    'shared.options' => 'الخيارات',
    'shared.payment' => 'الدفع',
    'shared.payment_history' => 'سجل الدفع',
    'shared.payment_method' => 'طريقة الدفع',
    'shared.payment_summary' => 'ملخص الدفع',
    'shared.print' => 'طباعة',
    'shared.table' => 'الطاولة',
    'shared.tip' => 'الإكرامية',
    'shared.view_order' => 'عرض الطلب',
    'shared.waiter' => 'النادل',

    'nav.admin_navigation' => 'التنقل في لوحة الإدارة',
    'nav.expand_menu' => 'توسيع القائمة',
    'nav.dashboard' => 'لوحة التحكم',
    'nav.manager' => 'المدير',
    'nav.accountant' => 'المحاسب',
    'nav.orders' => 'الطلبات',
    'nav.reservations' => 'الحجوزات',
    'nav.coupons_gifts' => 'القسائم والهدايا',
    'nav.menu' => 'القائمة',
    'nav.settings' => 'الإعدادات',
    'nav.account_actions' => 'إجراءات الحساب',
    'nav.logout' => 'تسجيل الخروج',
    'nav.open_navigation' => 'فتح التنقل',
    'nav.close_navigation' => 'إغلاق التنقل',
    'nav.logout_confirm' => 'هل أنت متأكد أنك تريد تسجيل الخروج؟',

    'coupons.smart_add.title' => 'إضافة قسيمة / بطاقة جديدة',
    'coupons.smart_add.help' => 'أنشئ قسيمة أو بطاقة هدية أو سنداً.',

    'payment.title' => 'الدفع',
    'payment.pay_now' => 'ادفع الآن',
    'payment.split_part' => 'تقسيم / دفع جزئي',
    'payment.choose_payer_now' => 'اختر ما سيدفعه هذا الشخص الآن',
    'payment.full' => 'كامل',
    'payment.equal' => 'بالتساوي',
    'payment.custom_amount' => 'مبلغ مخصص',
    'payment.full_balance' => 'الرصيد الكامل',
    'payment.pay_remaining' => 'ادفع كامل المبلغ المتبقي لهذا الطلب.',
    'payment.equal_share' => 'حصة واحدة من :count حصص متساوية',
    'payment.reopen_next_payer' => 'أعد فتح الدفع للدافع التالي.',
    'payment.amount' => 'المبلغ',
    'payment.max_amount' => 'الحد الأقصى :amount',
    'payment.cash' => 'نقداً',
    'payment.cash_payment' => 'دفع نقدي',
    'payment.terminal' => 'جهاز الدفع',
    'payment.pay_connected_terminal' => 'الدفع عبر جهاز متصل',
    'payment.choose_where_customer_pays' => 'اختر أين سيدفع العميل',
    'payment.ready' => 'جاهز',
    'payment.no_terminal_online' => 'لا يوجد جهاز دفع متصل',
    'payment.terminal_offline' => 'جهاز الدفع غير متصل',
    'payment.choose_terminal' => 'اختر جهاز الدفع',
    'payment.online' => 'عبر الإنترنت',
    'payment.total' => 'الإجمالي',
    'payment.amount_due' => 'المبلغ المستحق',
    'payment.order_total' => 'إجمالي الطلب',
    'payment.paid' => 'مدفوع',
    'payment.order_number' => 'الطلب رقم :id',
    'payment.table_order' => 'طلب الطاولة',
    'payment.charge' => 'تحصيل',
    'payment.change' => 'الباقي: :amount',
    'payment.pay' => 'دفع',
    'payment.checking_terminal' => 'جارٍ التحقق من جهاز الدفع…',
    'payment.record_cash' => 'تسجيل الدفع النقدي',
    'payment.loading' => 'جارٍ التحميل…',
    'payment.status_updated' => 'تم تحديث حالة الدفع',
    'payment.load_error' => 'تعذر تحميل تفاصيل الدفع.',
    'payment.receipt_printed' => 'تمت طباعة الإيصال',
    'payment.receipt_print_error' => 'تم تسجيل الدفع، لكن تعذرت طباعة الإيصال: :error',
    'payment.unknown_print_error' => 'خطأ طباعة غير معروف',
    'payment.save_order_first' => 'احفظ الطلب قبل تحصيل الدفع.',
    'payment.save_items_first' => 'احفظ العناصر الجديدة قبل تحصيل الدفع.',
    'payment.coupon_applied' => 'تم تطبيق :code: −:amount',
    'payment.item_available' => ':quantity متاح · :price',
    'payment.backspace' => 'حذف',
    'payment.exact' => 'المبلغ بالضبط',
    'payment.one_payment' => ':count دفعة',
    'payment.many_payments' => ':count دفعات',
    'payment.method_question' => 'كيف سيدفع العميل؟',
    'payment.terminal_offline_help' => 'جهاز الدفع غير متصل. شغّله أو اختر جهازاً آخر.',

    'cashier.order_composer' => 'الكاشير · إنشاء الطلب',
    'cashier.new_order' => 'طلب جديد',
    'cashier.select_table_add_items' => 'اختر طاولة وأضف العناصر.',
    'cashier.delivery_no_table' => 'توصيل / بدون طاولة',
    'cashier.order_items' => 'عناصر الطلب',
    'cashier.new_items' => 'عناصر جديدة',
    'cashier.sent_items' => 'العناصر المرسلة',
    'cashier.no_new_items' => 'لا توجد عناصر جديدة',
    'cashier.choose_food_menu' => 'اختر الطعام من القائمة.',
    'cashier.note' => 'ملاحظة',
    'cashier.add_note' => 'أضف ملاحظة…',
    'cashier.pending' => 'معلّق',
    'cashier.pending_total' => 'إجمالي المعلّق',
    'cashier.current_bill' => 'الفاتورة الحالية',
    'cashier.delivery_total' => 'إجمالي التوصيل',
    'cashier.cancel_order' => 'إلغاء الطلب',
    'cashier.cannot_cancel_settlement' => 'لا يمكن إلغاء هذا الطلب في حالة التسوية الحالية.',
    'cashier.confirm' => 'تأكيد',
    'cashier.confirming' => 'جارٍ التأكيد…',
];

$coverage = [];
$coverageFiles = glob(dirname(__DIR__).'/arabic/r10-*.php') ?: [];
sort($coverageFiles, SORT_STRING);

foreach ($coverageFiles as $coverageFile) {
    $module = require $coverageFile;
    if (!is_array($module)) {
        throw new RuntimeException('Arabic Admin coverage module must return an array: '.$coverageFile);
    }
    $coverage = array_replace($coverage, $module);
}

return array_replace($english, $base, $coverage);
