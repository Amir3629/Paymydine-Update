@php
    // PMD_R71_SPLIT_INVOICE_PRESENTATION
    $invoiceMode = (bool)($invoiceMode ?? false);

    $pmdInvoiceSetting = function ($key, $default = null) {
        try {
            $row = \Illuminate\Support\Facades\DB::table('settings')
                ->where('item', $key)
                ->orderByDesc('setting_id')
                ->first();
            if ($row && $row->value !== null && $row->value !== '') {
                $value = $row->value;
                if ((int)($row->serialized ?? 0) === 1 && is_string($value)) {
                    $decoded = @unserialize($value);
                    if ($decoded !== false || $value === 'b:0;') $value = $decoded;
                }
                return $value;
            }
        } catch (\Throwable $e) {}
        try { return setting($key, $default); } catch (\Throwable $e) { return $default; }
    };

    $resolveLogoPathR71 = function ($val) {
        if (is_string($val)) return trim($val);
        if (is_array($val)) return trim((string)($val['path'] ?? $val['publicUrl'] ?? $val['url'] ?? ''));
        if (is_object($val)) return trim((string)($val->path ?? $val->publicUrl ?? $val->url ?? ''));
        return '';
    };

    $logoPathR71 = $resolveLogoPathR71($pmdInvoiceSetting('invoice_logo'));
    if ($logoPathR71 === '') $logoPathR71 = $resolveLogoPathR71($pmdInvoiceSetting('site_logo'));
    if ($logoPathR71 === '') $logoPathR71 = $resolveLogoPathR71($pmdInvoiceSetting('dashboard_logo'));

    $embedTenantMediaR71 = function ($path) {
        $path = trim((string)$path);
        if ($path === '' || preg_match('#^https?://#i', $path)) return '';
        $clean = preg_replace('~[?#].*$~', '', $path);
        $relative = $clean;
        if (strpos($relative, '/api/media/') === 0) {
            $relative = substr($relative, strlen('/api/media/'));
        }
        $relative = ltrim($relative, '/');
        $base = base_path('assets/media/attachments/public');
        $candidate = $base.'/'.$relative;
        if (!is_file($candidate)) {
            $name = basename($relative);
            if ($name !== '' && is_dir($base)) {
                try {
                    $it = new RecursiveIteratorIterator(
                        new RecursiveDirectoryIterator($base, RecursiveDirectoryIterator::SKIP_DOTS)
                    );
                    foreach ($it as $file) {
                        if ($file->isFile() && $file->getFilename() === $name) {
                            $candidate = $file->getPathname();
                            break;
                        }
                    }
                } catch (\Throwable $e) {}
            }
        }
        if (!is_file($candidate) || !is_readable($candidate)) return '';
        $mime = @mime_content_type($candidate) ?: 'image/png';
        $bytes = @file_get_contents($candidate);
        if ($bytes === false || $bytes === '') return '';
        return 'data:'.$mime.';base64,'.base64_encode($bytes);
    };

    $logoDataR71 = $embedTenantMediaR71($logoPathR71);
    $logoUrlR71 = $logoDataR71 !== ''
        ? $logoDataR71
        : ($logoPathR71 !== ''
            ? (preg_match('#^https?://#i', $logoPathR71) ? $logoPathR71 : uploads_url($logoPathR71))
            : '');

    $siteNameR71 = trim((string)$pmdInvoiceSetting('site_name', ''));
    $invoicePrefixR71 = trim((string)$pmdInvoiceSetting('invoice_prefix', 'INV-'));
    if ($invoicePrefixR71 === '' || $invoicePrefixR71 === 'custom') $invoicePrefixR71 = 'INV-';
    $splitInvoiceNoR71 = $invoicePrefixR71.'S'.(int)($transaction->id ?? 0);
    $taxRateR71 = max(0, (float)$pmdInvoiceSetting('tax_percentage', 0));
    $grossPaidR71 = max(0, (float)($transaction->amount ?? 0));
    $netPaidR71 = $taxRateR71 > 0
        ? round($grossPaidR71 / (1 + ($taxRateR71 / 100)), 2)
        : $grossPaidR71;
    $vatPaidR71 = max(0, round($grossPaidR71 - $netPaidR71, 2));
@endphp

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $invoiceMode ? ('Invoice ' . $splitInvoiceNoR71) : ('Split Payment Receipt #' . (int)$transaction->id) }}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #222; margin: 24px; }
        .header { margin-bottom: 16px; }
        .muted { color: #666; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border-bottom: 1px solid #eee; text-align: left; padding: 8px 4px; font-size: 13px; }
        th { font-size: 12px; color: #555; text-transform: uppercase; letter-spacing: 0.04em; }
        .text-right { text-align: right; }
        .summary { margin-top: 16px; width: 320px; margin-left: auto; }
        .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
    </style>



<!-- PMD_KDS_INDEX_V130_INLINE_ADVANCED_NO_FLASH_START -->
<?php if (function_exists('request') && trim(request()->path(), '/') === 'admin/kds_stations'): ?>
<style id="pmd-kds-index-v130-inline-advanced-no-flash-style">
/* PMD KDS v130: kill Advanced table flash before paint */

/* Original server list/table: hidden but readable by JS */
.table-responsive,
.control-list,
.list-widget,
.list-table,
.list-footer,
.pagination,
.pagination-bar,
table {
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

/* Duplicate hero / advanced wrappers */
.pmd962-hero,
section.pmd962-hero,
.pmd962-advanced,
.pmd962-advanced-table,
.pmd962-table-panel,
.pmd962-table-toggle,
.pmd962-original-table-wrap,
[data-pmd-kds-v130-hidden="1"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

/* Modern cards/stats must stay visible */
.pmd962-shell,
.pmd962-page,
.pmd962-wrap,
.pmd962-stats,
.pmd962-stats-grid,
.pmd962-grid,
.pmd962-cards,
.pmd962-card,
.pmd962-station-card,
[class*="station-card"] {
  visibility: visible !important;
  opacity: 1 !important;
  max-height: none !important;
  overflow: visible !important;
  pointer-events: auto !important;
}
</style>

<script id="pmd-kds-index-v130-inline-advanced-no-flash-script">
(function () {
  var MARK = 'PMD_KDS_INDEX_V130_INLINE_ADVANCED_NO_FLASH';

  function isKdsIndex() {
    return location.pathname.replace(/\/+$/, '') === '/admin/kds_stations';
  }

  if (!isKdsIndex()) return;

  function qsa(sel, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    catch (e) { return []; }
  }

  function text(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function hasCardInside(el) {
    if (!el || !el.querySelector) return false;
    return !!el.querySelector('a[href*="/admin/kds_stations/edit/"]') ||
      text(el).indexOf('Edit station') !== -1 ||
      text(el).indexOf('Open display') !== -1;
  }

  function hardHide(el) {
    if (!el || !el.style) return false;

    el.setAttribute('data-pmd-kds-v130-hidden', '1');
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('height', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('max-height', '0', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('padding', '0', 'important');
    el.style.setProperty('overflow', 'hidden', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    return true;
  }

  function hideAdvancedAndHero(root) {
    root = root || document;

    qsa('.pmd962-hero, section.pmd962-hero, .pmd962-advanced, .pmd962-advanced-table, .pmd962-table-panel, .pmd962-table-toggle, .pmd962-original-table-wrap', root)
      .forEach(hardHide);

    qsa('section,article,div', root).forEach(function (el) {
      var t = text(el);

      if (
        t.indexOf('Advanced table') !== -1 &&
        t.indexOf('Use the original table only for filters') !== -1 &&
        !hasCardInside(el)
      ) {
        hardHide(el);
      }

      if (
        t.indexOf('Manage KDS Stations') !== -1 &&
        t.indexOf('Create, review, and manage kitchen display stations') !== -1 &&
        t.indexOf('New KDS Station') !== -1 &&
        !hasCardInside(el)
      ) {
        hardHide(el);
      }
    });
  }

  function visible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    return cs.display !== 'none' &&
      cs.visibility !== 'hidden' &&
      Number(cs.opacity || 1) > 0.01 &&
      r.width > 2 &&
      r.height > 2;
  }

  function findCards() {
    var out = [];
    var seen = [];

    qsa('a[href*="/admin/kds_stations/edit/"]').forEach(function (link) {
      var n = link;
      var best = null;

      for (var i = 0; i < 10 && n && n !== document.body; i++, n = n.parentElement) {
        var t = text(n);
        var r = n.getBoundingClientRect ? n.getBoundingClientRect() : { width: 0, height: 0 };

        if (
          r.width > 160 &&
          r.height > 70 &&
          t.indexOf('TYPE') !== -1 &&
          t.indexOf('ROUTING') !== -1
        ) {
          best = n;
        }
      }

      if (best && seen.indexOf(best) === -1) {
        seen.push(best);
        out.push(best);
      }
    });

    return out;
  }

  function check() {
    hideAdvancedAndHero(document);

    var advancedVisible = qsa('section,article,div').filter(function (el) {
      var t = text(el);
      return t.indexOf('Advanced table') !== -1 &&
        t.indexOf('Use the original table only for filters') !== -1 &&
        visible(el);
    }).length;

    var cards = findCards();

    var summary = {
      mark: MARK,
      styleLoaded: !!document.getElementById('pmd-kds-index-v130-inline-advanced-no-flash-style'),
      scriptLoaded: !!document.getElementById('pmd-kds-index-v130-inline-advanced-no-flash-script'),
      oldTablesVisible: qsa('table,.table-responsive,.control-list,.list-widget,.list-table').filter(visible).length,
      heroVisible: qsa('.pmd962-hero,section.pmd962-hero').filter(visible).length,
      advancedVisible: advancedVisible,
      cardsDetected: cards.length,
      cardsVisible: cards.filter(visible).length
    };

    summary.status = summary.oldTablesVisible === 0 &&
      summary.heroVisible === 0 &&
      summary.advancedVisible === 0 &&
      summary.cardsVisible > 0 ? 'OK' : 'CHECK';

    window.PMD_KDS_INDEX_V130_INLINE_ADVANCED_NO_FLASH_REPORT = summary;

    try {
      console.log('✅ PMD KDS INDEX v130 INLINE ADVANCED NO-FLASH');
      console.table([summary]);
    } catch (e) {}

    return summary;
  }

  hideAdvancedAndHero(document);

  try {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.target) hideAdvancedAndHero(m.target);
        Array.prototype.slice.call(m.addedNodes || []).forEach(function (n) {
          if (n && n.nodeType === 1) hideAdvancedAndHero(n);
        });
      });
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    window.PMD_KDS_INDEX_V130_OBSERVER = observer;
  } catch (e) {}

  window.PMDKdsIndexV130AdvancedNoFlash = {
    check: check
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      hideAdvancedAndHero(document);
      setTimeout(check, 50);
    }, true);
  } else {
    check();
  }

  window.addEventListener('load', function () {
    hideAdvancedAndHero(document);
    setTimeout(check, 100);
    setTimeout(check, 700);
    setTimeout(check, 1600);
  }, true);
})();
</script>
<?php endif; ?>
<!-- PMD_KDS_INDEX_V130_INLINE_ADVANCED_NO_FLASH_END -->






<!-- PMD_KDS_INDEX_V133_CLEAN_CSS_STABILITY_START -->
<?php if (function_exists('request') && trim(request()->path(), '/') === 'admin/kds_stations'): ?>
<style id="pmd-kds-index-v133-clean-css-stability">
/* PMD KDS v133: clean CSS-only stability. No JS. No observer. */

/* Reserve stable workspace so the page does not jump while v96 builds cards */
.pmd962-shell,
.pmd962-page,
.pmd962-wrap {
  min-height: 560px !important;
}

/* Stable stats/top summary area */
.pmd962-stats,
.pmd962-stats-grid {
  min-height: 112px !important;
  box-sizing: border-box !important;
}

/* Stable card grid */
.pmd962-grid,
.pmd962-cards {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)) !important;
  gap: 18px !important;
  align-items: stretch !important;
  box-sizing: border-box !important;
}

/* Stop layout resize animations inside the KDS modern area */
.pmd962-shell *,
.pmd962-page *,
.pmd962-wrap * {
  box-sizing: border-box !important;
  animation: none !important;
  transition-property: background-color, border-color, color, box-shadow !important;
  transition-duration: 120ms !important;
}

/* Station cards only */
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]),
.pmd962-card:has(a[href*="/admin/kitchendisplay/"]),
[class*="station-card"]:has(a[href*="/admin/kds_stations/edit/"]),
[class*="station-card"]:has(a[href*="/admin/kitchendisplay/"]) {
  min-height: 258px !important;
  height: 100% !important;
  border-radius: 20px !important;
  overflow: hidden !important;
  transform: none !important;
  backface-visibility: hidden !important;
}

/* Keep text stable */
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) h1,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) h2,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) h3,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) p,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) span,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) small,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) a,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) button {
  line-height: 1.35 !important;
}

/* Keep actions from wrapping during font/layout load */
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) a,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) button {
  white-space: nowrap !important;
}

@media (max-width: 768px) {
  .pmd962-shell,
  .pmd962-page,
  .pmd962-wrap {
    min-height: 640px !important;
  }

  .pmd962-grid,
  .pmd962-cards {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  .pmd962-card:has(a[href*="/admin/kds_stations/edit/"]),
  .pmd962-card:has(a[href*="/admin/kitchendisplay/"]),
  [class*="station-card"]:has(a[href*="/admin/kds_stations/edit/"]),
  [class*="station-card"]:has(a[href*="/admin/kitchendisplay/"]) {
    min-height: 246px !important;
    border-radius: 18px !important;
  }
}
</style>
<?php endif; ?>
<!-- PMD_KDS_INDEX_V133_CLEAN_CSS_STABILITY_END -->





</head>
<body>
    <div class="header">
        @if($invoiceMode && $logoUrlR71 !== '')
            <div style="text-align:center;margin-bottom:10px;"><img src="{{ $logoUrlR71 }}" alt="logo" style="max-height:52px;max-width:220px;object-fit:contain;"></div>
        @endif
        @if($invoiceMode && $siteNameR71 !== '')
            <div style="text-align:center;font-weight:800;font-size:16px;margin-bottom:4px;">{{ $siteNameR71 }}</div>
        @endif
        <h2 style="margin:0;">{{ $invoiceMode ? 'Invoice' : 'Split Payment Receipt' }}</h2>
        @if($invoiceMode)
            <div class="muted">Invoice #{{ $splitInvoiceNoR71 }}</div>
        @endif
        <div class="muted">Transaction #{{ (int)$transaction->id }}</div>
        <div class="muted">Order #{{ (int)($order->order_id ?? 0) }} | Table: {{ $tableName ?: 'N/A' }}</div>
        <div class="muted">Paid at: {{ $transaction->paid_at ?: $transaction->created_at }}</div>
        <div class="muted">Payment: {{ strtoupper((string)$transaction->payment_method) }} @if(!empty($transaction->payment_reference)) (Ref: {{ $transaction->payment_reference }}) @endif</div>
    </div>

    <table>
        <thead>
        <tr>
            <th>Item</th>
            <th class="text-right">Qty Paid</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Line Total</th>
        </tr>
        </thead>
        <tbody>
        @foreach($items as $item)
            <tr>
                <td>{{ $item->name ?: ('Menu #'.$item->menu_id) }}</td>
                <td class="text-right">{{ rtrim(rtrim(number_format((float)$item->quantity_paid, 3, '.', ''), '0'), '.') }}</td>
                <td class="text-right">{{ currency_format((float)$item->unit_price) }}</td>
                <td class="text-right">{{ currency_format((float)$item->line_total) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <div class="summary">
        <div class="summary-row">
            <span>Amount paid</span>
            <strong>{{ currency_format((float)$transaction->amount) }}</strong>
        </div>
        @if($invoiceMode && $taxRateR71 > 0)
            <div class="summary-row"><span>Net</span><span>{{ currency_format($netPaidR71) }}</span></div>
            <div class="summary-row"><span>VAT {{ rtrim(rtrim(number_format($taxRateR71, 2, '.', ''), '0'), '.') }}%</span><span>{{ currency_format($vatPaidR71) }}</span></div>
        @endif
        <div class="summary-row">
            <span>Transaction status</span>
            <strong>{{ ucfirst((string)($transaction->settlement_status ?? 'partial')) }}</strong>
        </div>
    </div>
<script src="/app/admin/assets/js/pmd-waiter-v98-single-source.js?v=98"></script>







<!-- PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-final-single-logo-v20.css?v=20260625_154925">
<script defer src="/app/admin/assets/js/pmd-admin-final-single-logo-v20.js?v=20260625_154925"></script>
<!-- /PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->

</body>
</html>
