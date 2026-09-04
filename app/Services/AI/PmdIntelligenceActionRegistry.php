<?php

namespace App\Services\AI;

/**
 * Server-owned navigation suggestions for PMD Intelligence.
 *
 * The model never supplies URLs and cannot execute these actions. It may only
 * influence which already-known PMD data tools were used; this registry maps
 * those signals plus the visible question/answer to canonical read/navigation
 * destinations. The browser receives an allowlisted href and label only.
 */
final class PmdIntelligenceActionRegistry
{
    private const MAX_ACTIONS = 3;

    public function adminActions(array $signals, string $question, string $answer): array
    {
        $ids = [];
        $add = static function (string $id) use (&$ids): void {
            if ($id !== '' && !in_array($id, $ids, true)) $ids[] = $id;
        };

        foreach ($signals as $signal) {
            if (!is_array($signal)) continue;
            $kind = strtolower(trim((string)($signal['kind'] ?? '')));
            $report = strtolower(trim((string)($signal['report'] ?? '')));

            if ($kind === 'report' && $report !== '') {
                $add('report_'.$report);
                if ($report === 'liveorders') $add('orders');
                if ($report === 'reservations') $add('reservations');
                if ($report === 'attendance') $add('shifts');
                if ($report === 'topitems' || $report === 'categories') $add('menu');
            } elseif ($kind === 'order_integrity') {
                $add('orders');
                $add('report_transactions');
            } elseif ($kind === 'workforce_schedule') {
                $add('shifts');
                $add('report_attendance');
            } elseif ($kind === 'kitchen_workforce') {
                $add('report_liveorders');
                $add('shifts');
            } elseif ($kind === 'owner_kpis') {
                $add('owner_dashboard');
            }
        }

        $text = mb_strtolower(trim($question.' '.$answer));
        $rules = [
            'report_sales' => ['sales', 'revenue', 'turnover', 'umsatz', 'satış', 'فروش', 'درآمد'],
            'report_hourly' => ['hourly', 'busy hour', 'peak hour', 'service hour', 'stunden', 'saatlik', 'ساعت'],
            'report_categories' => ['category', 'categories', 'kategorie', 'kategori', 'دسته'],
            'report_payments' => ['payment', 'payments', 'refund', 'card', 'cash', 'zahlung', 'ödeme', 'پرداخت'],
            'report_transactions' => ['transaction', 'reconcile', 'mismatch', 'settlement', 'transaktion', 'mutabakat', 'تراکنش'],
            'report_channels' => ['channel', 'delivery', 'takeaway', 'dine-in', 'kanal', 'teslimat', 'کانال'],
            'report_tips' => ['tip', 'tips', 'trinkgeld', 'bahşiş', 'انعام'],
            'report_alerts' => ['alert', 'risk', 'exception', 'warning', 'alarm', 'uyarı', 'هشدار', 'ریسک'],
            'report_liveorders' => ['live order', 'open order', 'kitchen', 'prep time', 'ticket age', 'küche', 'mutfak', 'آشپزخانه', 'زمان آماده'],
            'report_topitems' => ['top item', 'top-selling', 'best seller', 'most sold', 'popular item', 'topseller', 'çok satan', 'پرفروش', 'محبوب'],
            'report_reviews' => ['review', 'rating', 'feedback', 'bewertung', 'yorum', 'نظر', 'امتیاز'],
            'reservations' => ['reservation', 'booking', 'guest arrival', 'reservierung', 'rezervasyon', 'رزرو'],
            'shifts' => ['shift', 'staffing', 'roster', 'workforce', 'attendance', 'schicht', 'vardiya', 'شیفت', 'پرسنل'],
            'menu' => ['menu', 'stock', 'sold out', 'availability', 'dish', 'item', 'menü', 'stok', 'منو', 'موجود'],
            'orders' => ['order', 'orders', 'ticket', 'bestellung', 'sipariş', 'سفارش'],
            'accountant_dashboard' => ['accountant', 'vat', 'tax', 'finance', 'buchhaltung', 'steuer', 'muhasebe', 'مالیات', 'حسابداری'],
        ];

        foreach ($rules as $id => $needles) {
            foreach ($needles as $needle) {
                if ($needle !== '' && str_contains($text, mb_strtolower($needle))) {
                    $add($id);
                    break;
                }
            }
        }

        $actions = [];
        foreach ($ids as $id) {
            $action = $this->resolve($id);
            if ($action === null) continue;
            $actions[] = $action;
            if (count($actions) >= self::MAX_ACTIONS) break;
        }

        return $actions;
    }

    private function resolve(string $id): ?array
    {
        $reports = [
            'sales' => ['Sales report', 'Open the sales trend behind this answer.', 'pmdreports/sales'],
            'hourly' => ['Sales by hour', 'See the service hours and peaks.', 'pmdreports/hourly'],
            'categories' => ['Category performance', 'Open sales by menu category.', 'pmdreports/categories'],
            'payments' => ['Payment methods', 'Review payment mix and payment issues.', 'pmdreports/payments'],
            'transactions' => ['Transactions', 'Inspect transaction and reconciliation details.', 'pmdreports/transactions'],
            'channels' => ['Sales channels', 'Compare dine-in, pickup and delivery channels.', 'pmdreportchannels'],
            'tips' => ['Tips report', 'Review tip performance and trends.', 'pmdreporttips'],
            'alerts' => ['Operational alerts', 'Open the exceptions that may need attention.', 'pmdreports/alerts'],
            'liveorders' => ['Live orders', 'Open current order and kitchen pressure details.', 'pmdreports/liveorders'],
            'topitems' => ['Top-selling items', 'See the items driving recent sales.', 'pmdreports/topitems'],
            'reviews' => ['Guest reviews', 'Open the review and rating details.', 'pmdreports/reviews'],
            'reservations' => ['Reservation report', 'Open reservation analytics for the period.', 'pmdreports/reservations'],
            'attendance' => ['Attendance report', 'Review presence and attendance details.', 'pmdreports/attendance'],
        ];

        if (str_starts_with($id, 'report_')) {
            $report = substr($id, 7);
            if (!isset($reports[$report])) return null;
            [$label, $description, $route] = $reports[$report];
            return $this->action($id, $label, $description, $route, 'report');
        }

        return match ($id) {
            'orders' => $this->action($id, 'Open Orders', 'Go to the canonical Orders workspace.', 'orders', 'workspace'),
            'reservations' => $this->action($id, 'Open Reservations', 'Review and manage the reservation workspace.', 'reservations', 'workspace'),
            'shifts' => $this->action($id, 'Open Shifts', 'Review staffing and shift coverage.', 'shifts', 'workspace'),
            'menu' => $this->action($id, 'Open Menu', 'Review items, availability and menu setup.', 'menu', 'workspace'),
            'owner_dashboard' => $this->action($id, 'Open Dashboard', 'Return to the owner overview.', 'ownerdashboard', 'workspace'),
            'manager_dashboard' => $this->action($id, 'Open Manager', 'Open the manager operations workspace.', 'managerdashboard', 'workspace'),
            'accountant_dashboard' => $this->action($id, 'Open Accountant', 'Open the finance and accounting workspace.', 'accountantdashboard', 'workspace'),
            'settings' => $this->action($id, 'Open Settings', 'Review restaurant configuration.', 'settings', 'workspace'),
            default => null,
        };
    }

    private function action(string $id, string $label, string $description, string $route, string $kind): array
    {
        return [
            'id' => $id,
            'label' => $label,
            'description' => $description,
            'href' => admin_url($route),
            'kind' => $kind,
            'read_only_navigation' => true,
        ];
    }
}
