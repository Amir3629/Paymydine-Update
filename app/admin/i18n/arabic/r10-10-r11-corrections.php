<?php

declare(strict_types=1);

// PMD_OMAN_ADMIN_AR_R11_FINAL_CORRECTIONS
// Final canonical overrides plus stable technical source copy that is exposed
// by legacy Manager/Dashboard tooltips. Restaurant/customer content is not
// included here.
return [
    // These three values were the only nontechnical English fallbacks reported
    // by the strict R10 staged audit.
    'settings.ui.fiskaly_tse' => 'Fiskaly / TSE · الامتثال المالي',
    'settings.ui.paymydine_cashier' => 'كاشير PayMyDine',
    'settings.runtime_v17.webhooks' => 'إشعارات Webhook',

    // Manager/Dashboard source/tool-tip copy that can be emitted dynamically
    // after server first paint.
    'literal::unprocessed current-location orders excluding terminal status names' => 'طلبات الموقع الحالي غير المعالجة مع استبعاد حالات أجهزة الدفع',
    'literal::enabled visible location tables; operational_status occupied plus unique active-order table references' => 'الطاولات المفعلة والظاهرة في الموقع؛ تشمل الطاولات المشغولة ومراجع الطاولات الفريدة للطلبات النشطة',
    'literal::customer menu scope: location/global, enabled, in stock' => 'نطاق قائمة العميل: الموقع أو العام، مفعّل ومتوافر في المخزون',
    'literal::first Received/Preparation -> first Ready/Served/Delivery status history (1-240 min)' => 'من أول حالة استلام/تحضير إلى أول حالة جاهز/تم التقديم/التوصيل ضمن سجل الحالات (1–240 دقيقة)',
    'literal::order_totals.code=tip joined once per paid order, grouped by orders.settled_at' => 'الإكراميات المسجلة لكل طلب مدفوع، مجمعة حسب وقت التسوية',
    'literal::location-scoped tables/open orders unavailable' => 'بيانات طاولات الموقع أو الطلبات المفتوحة غير متاحة',
    'literal::location-scoped menus unavailable' => 'قوائم الموقع غير متاحة',
    'literal::authenticated admin location missing' => 'موقع الإدارة المصادق عليه غير متاح',
    'literal::Authenticated admin location unavailable' => 'موقع الإدارة المصادق عليه غير متاح',
    'literal::No completed kitchen tickets' => 'لا توجد تذاكر مطبخ مكتملة',
    'literal::Analytics source unavailable' => 'مصدر التحليلات غير متاح',
    'literal::Invalid analytics payload' => 'بيانات التحليلات غير صالحة',
];
