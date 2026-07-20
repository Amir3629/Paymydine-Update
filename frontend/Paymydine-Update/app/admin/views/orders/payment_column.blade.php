@php
    $rawStatus = strtolower((string)($record->settlement_status ?? ''));
    $orderTotal = (float)($record->order_total ?? 0);
    $settledAmount = (float)($record->settled_amount ?? 0);

    if (!in_array($rawStatus, ['unpaid', 'partial', 'paid'], true)) {
        if ($settledAmount <= 0.0001) {
            $rawStatus = 'unpaid';
        } elseif ($orderTotal > 0 && $settledAmount + 0.0001 < $orderTotal) {
            $rawStatus = 'partial';
        } else {
            $rawStatus = 'paid';
        }
    }

    $badgeMap = [
        'unpaid' => ['label' => 'Unpaid', 'bg' => '#dc3545', 'color' => '#fff'],
        'partial' => ['label' => 'Partial', 'bg' => '#ffc107', 'color' => '#212529'],
        'paid' => ['label' => 'Paid', 'bg' => '#198754', 'color' => '#fff'],
    ];
    $badge = $badgeMap[$rawStatus] ?? $badgeMap['unpaid'];

    $baseMethod = trim((string)($value ?? ''));
    if ($baseMethod === '') {
        $baseMethod = trim((string)($record->payment ?? ''));
    }
    $settlementMethod = trim((string)($record->settlement_method ?? ''));

    $methodText = $baseMethod !== '' ? $baseMethod : '—';
    if ($settlementMethod !== '' && strcasecmp($settlementMethod, $baseMethod) !== 0) {
        $methodText .= ' → '.$settlementMethod;
    }

    $showAmounts = ($rawStatus === 'partial');
@endphp

<div class="d-flex flex-column gap-1">
    <div>
        <span
            class="badge"
            style="background-color: {{ $badge['bg'] }}; color: {{ $badge['color'] }}; font-weight: 600;"
        >{{ $badge['label'] }}</span>
    </div>
    <div class="text-muted" style="font-size: 12px;">
        {{ $methodText }}
    </div>
    @if($showAmounts)
        <div class="text-muted" style="font-size: 11px;">
            {{ currency_format($settledAmount) }} / {{ currency_format($orderTotal) }}
        </div>
    @endif
</div>

