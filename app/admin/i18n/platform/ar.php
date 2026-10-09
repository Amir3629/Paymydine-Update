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

    // PMD_GUEST_COMMUNICATIONS_R28
    "settings.communication.guest_communications_r28" => "التواصل مع الضيوف",
    "settings.communication.fast_help_r28" => "أرسل رسائل الحجز عبر البريد الإلكتروني وواتساب دون إبطاء صفحة الحجز.",
    "settings.communication.ready_r28" => "جاهز",
    "settings.communication.setup_needed_r28" => "يتطلب إعداداً",
    "settings.communication.reservation_messages_r28" => "رسائل الحجز",
    "settings.communication.transactional_only_r28" => "رسائل الحجز التشغيلية فقط. رسائل التسويق تتطلب موافقة منفصلة.",
    "settings.communication.send_when_r28" => "الإرسال عند",
    "settings.communication.new_reservation_r28" => "حجز جديد",
    "settings.communication.reservation_changed_r28" => "تم تعديل الحجز",
    "settings.communication.reservation_canceled_r28" => "تم إلغاء الحجز",
    "settings.communication.channel_r28" => "القناة",
    "settings.communication.email_help_r28" => "تُرسل رسائل التأكيد والتعديلات والإلغاء إلى بريد الضيف الإلكتروني.",
    "settings.communication.enable_email_r28" => "تفعيل رسائل الحجز عبر البريد الإلكتروني للضيوف",
    "settings.communication.reply_to_r28" => "تظل ردود الضيوف موجهة إلى بريد المطعم أعلاه.",
    "settings.communication.delivery_setup_r28" => "إعداد إرسال البريد الإلكتروني",
    "settings.communication.send_test_email_r28" => "إرسال بريد تجريبي",
    "settings.communication.whatsapp_help_r28" => "يمكن أيضاً إرسال تحديثات الحجز إلى هاتف الضيف عبر قناة واتساب للأعمال الخاصة بك.",
    "settings.communication.enable_whatsapp_r28" => "تفعيل رسائل الحجز عبر واتساب",
    "settings.communication.whatsapp_provider_r28" => "مزود واتساب",
    "settings.communication.webhook_gateway_r28" => "Webhook / بوابة البوت",
    "settings.communication.sender_reference_r28" => "مرجع النشاط / المرسل",
    "settings.communication.whatsapp_endpoint_r28" => "نقطة نهاية WhatsApp API",
    "settings.communication.whatsapp_endpoint_help_r28" => "استخدم عنوان HTTPS الكامل لإرسال الرسائل من مزودك. يمكن لوضع Webhook الإشارة إلى بوابة بوت واتساب الخاصة بك.",
    "settings.communication.access_token_r28" => "رمز الوصول / رمز Webhook",
    "settings.communication.test_recipient_r28" => "مستلم اختبار واتساب",
    "settings.communication.international_number_r28" => "استخدم رقماً دولياً مع رمز الدولة.",
    "settings.communication.approved_templates_r28" => "قوالب واتساب المعتمدة",
    "settings.communication.template_help_r28" => "للرسائل الاستباقية عبر واتساب، أدخل أسماء قوالب Meta المعتمدة. يتلقى كل قالب بالترتيب اسم المطعم ورقم الحجز والتاريخ والوقت وعدد الضيوف ورابط الإدارة.",
    "settings.communication.created_template_r28" => "قالب الحجز الجديد",
    "settings.communication.updated_template_r28" => "قالب تعديل الحجز",
    "settings.communication.canceled_template_r28" => "قالب إلغاء الحجز",
    "settings.communication.send_test_whatsapp_r28" => "إرسال رسالة واتساب تجريبية",
    "settings.communication.secrets_help_r28" => "لا يتم عرض البيانات السرية مرة أخرى في الصفحة. احفظ الصفحة قبل إجراء اختبار الإرسال.",
    "settings.communication.test_email_sent_r28" => "تم إرسال البريد التجريبي.",
    "settings.communication.test_whatsapp_sent_r28" => "تم إرسال رسالة واتساب التجريبية.",
    "settings.communication.amazon_ses_region_r28" => "منطقة Amazon SES",
    "settings.communication.amazon_ses_access_key_r28" => "مفتاح وصول Amazon SES",
    "settings.communication.amazon_ses_secret_r28" => "سر Amazon SES",
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
