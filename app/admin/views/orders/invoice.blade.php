@php
$__s=function($k,$d=null){try{return \Illuminate\Support\Facades\DB::table('settings')->where('item',$k)->orderByDesc('setting_id')->value('value')??$d;}catch(\Throwable $e){return setting($k,$d);} };
$__showQr=(string)$__s('invoice_show_qr','1')==='1';
$__showFiskalyCfg=(string)$__s('invoice_show_fiskaly','1')==='1';
$__showLogo=(string)$__s('invoice_show_logo','1')==='1';
$__autoPrint=(string)$__s('invoice_auto_print_dialog','0')==='1';
@endphp

@php

if (!function_exists('pmdCleanGuestSessionComment')) {
    function pmdCleanGuestSessionComment($comment) {
        $comment = trim((string)($comment ?? ''));
        if ($comment === '') return '';
        $comment = trim(preg_replace('/\s*\[guest_session:\s*\]\s*/u', ' ', $comment));
        if ($comment === '' || preg_match('/^\[guest_session:[^\]]*\]$/u', $comment)) return '';
        return $comment;
    }
}
    $__pmdOrderCommentRaw = (string) ($model->comment ?? '');
    $__pmdIsPosImport = stripos($__pmdOrderCommentRaw, 'ready2order') !== false
        || stripos($__pmdOrderCommentRaw, 'r2o-invoice') !== false
        || stripos($__pmdOrderCommentRaw, 'Imported from ready2order') !== false;

    $__pmdPosMeta = ['gross' => null, 'net' => null, 'vat' => null];
    $__pmdPosLineTotals = [];

    if ($__pmdIsPosImport && $__pmdOrderCommentRaw !== '') {
        foreach (array_keys($__pmdPosMeta) as $__key) {
            if (preg_match('/'. $__key .'=([^|]+)/u', $__pmdOrderCommentRaw, $__m)) {
                $__pmdPosMeta[$__key] = trim($__m[1]);
            }
        }

        if (preg_match_all('/item_total_([0-9]+)=([^|]+)/u', $__pmdOrderCommentRaw, $__m2, PREG_SET_ORDER)) {
            foreach ($__m2 as $__row2) {
                $__pmdPosLineTotals[(int)$__row2[1]] = (float) trim($__row2[2]);
            }
        }
    }

    $__pmdPosGross = isset($__pmdPosMeta['gross']) && $__pmdPosMeta['gross'] !== null ? (float) $__pmdPosMeta['gross'] : null;
    $__pmdPosVat   = isset($__pmdPosMeta['vat']) && $__pmdPosMeta['vat'] !== null ? (float) $__pmdPosMeta['vat'] : null;

    /* PMD_SAFE_INCLUDED_TAX_INVOICE_START */
    $__orderTotals = collect($model->getOrderTotals() ?? []);

    $__subtotalTotal = $__subtotalTotal ?? $__orderTotals->firstWhere('code', 'subtotal');
    $__taxTotal = $__taxTotal ?? $__orderTotals->firstWhere('code', 'tax');
    $__tipTotal = $__tipTotal ?? $__orderTotals->firstWhere('code', 'tip');
    $__finalTotal = $__finalTotal ?? $__orderTotals->firstWhere('code', 'total');
    $__discountTotal = $__discountTotal ?? $__orderTotals->firstWhere('code', 'discount');
    $__couponTotal = $__couponTotal ?? $__discountTotal ?? null;
    $__couponCode = $__couponCode ?? (($model->coupon_code ?? null) ?: ($model->coupon ?? null));

    $__fQr = $__fQr ?? ($__orderRow->fiskaly_qr_code_data ?? ($model->fiskaly_qr_code_data ?? null));
    $__fStatus = $__fStatus ?? ($__orderRow->fiskaly_status ?? ($model->fiskaly_status ?? null));
    $__fTxNo = $__fTxNo ?? ($__orderRow->fiskaly_tx_number ?? ($model->fiskaly_tx_number ?? null));
    $__fSigCounter = $__fSigCounter ?? ($__orderRow->fiskaly_signature_counter ?? ($model->fiskaly_signature_counter ?? null));
    $__fSerial = $__fSerial ?? ($__orderRow->fiskaly_serial_number ?? ($model->fiskaly_serial_number ?? null));

    $__pmdTaxLabelFromTotals = (string)($__taxTotal->title ?? 'VAT');
    $__pmdTaxIncluded = stripos($__pmdTaxLabelFromTotals, 'included') !== false;

    $__pmdNetSubtotal = 0.0;
    foreach (($model->getOrderMenusWithOptions() ?? []) as $__menuCalc) {
        $__pmdNetSubtotal += (float)($__menuCalc->subtotal ?? 0);
    }
    $__pmdNetSubtotal = round($__pmdNetSubtotal, 2);

    $__pmdDisplayedSubtotal = round((float)($__subtotalTotal->value ?? $__pmdNetSubtotal), 2);
    $__pmdDisplayedTax = round((float)($__taxTotal->value ?? 0), 2);
    $__pmdDisplayedTip = round((float)($__tipTotal->value ?? 0), 2);
    $__pmdDisplayedDiscount = round((float)($__couponTotal->value ?? 0), 2);
    $__pmdDisplayedTotal = round((float)($__finalTotal->value ?? ($__pmdDisplayedSubtotal + $__pmdDisplayedTip + $__pmdDisplayedDiscount)), 2);

    if ($__pmdIsPosImport) {
        if ($__pmdPosGross !== null) {
            $__pmdDisplayedSubtotal = round($__pmdPosGross, 2);
            $__pmdDisplayedTotal = round($__pmdPosGross, 2);
        }
        if ($__pmdPosVat !== null) {
            $__pmdDisplayedTax = round($__pmdPosVat, 2);
        }
    }

    $__pmdTaxLabel = $__pmdTaxLabelFromTotals !== '' ? $__pmdTaxLabelFromTotals : ($__pmdTaxIncluded ? 'VAT included' : 'VAT');
    /* PMD_SAFE_INCLUDED_TAX_INVOICE_END */
@endphp

@php
    $__orderId = (int)($model->order_id ?? 0);

    $__decode = function ($value) {
        if ($value === null || $value === '') return null;
        if (is_array($value)) return $value;
        if (is_object($value)) return json_decode(json_encode($value), true);
        if (!is_string($value)) return null;
        $decoded = json_decode($value, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : null;
    };

    $__pick = function (array $sources, array $paths) {
        foreach ($sources as $src) {
            if (!is_array($src)) continue;
            foreach ($paths as $path) {
                $val = data_get($src, $path);
                if ($val !== null && $val !== '') return $val;
            }
        }
        return null;
    };

    $__orderRow = null;
    $__txRow = null;

    try {
        $__conn = method_exists($model, 'getConnectionName') ? ($model->getConnectionName() ?: config('database.default')) : config('database.default');

        if ($__orderId > 0) {
            $__orderRow = \Illuminate\Support\Facades\DB::connection($__conn)
                ->table('orders')
                ->where('order_id', $__orderId)
                ->first();

            $__txRow = \Illuminate\Support\Facades\DB::connection($__conn)
                ->table('fiskaly_transactions')
                ->where('order_id', $__orderId)
                ->orderByDesc('fiskaly_transaction_id')
                ->first();
        }
    } catch (\Throwable $e) {
        $__orderRow = null;
        $__txRow = null;
    }

    $__resp = $__decode($__txRow->response_payload ?? null);
    $__meta = $__decode($__txRow->meta ?? null);
    $__req  = $__decode($__txRow->request_payload ?? null);
    $__sources = [$__resp, $__meta, $__req];

    $__fStatus = $__orderRow->fiskaly_status
        ?? ($model->fiskaly_status ?? null)
        ?? ($__txRow->status ?? null);

    $__fQr = $__orderRow->fiskaly_qr_code_data
        ?? ($model->fiskaly_qr_code_data ?? null)
        ?? ($__txRow->qr_code_data ?? null)
        ?? $__pick($__sources, [
            'qr_code_data',
            'responses.update.qr_code_data',
            'responses.finish.qr_code_data',
            'responses.start.qr_code_data',
        ]);

    $__fTxNo = $__orderRow->fiskaly_tx_number
        ?? ($model->fiskaly_tx_number ?? null)
        ?? ($__txRow->tx_number ?? null)
        ?? $__pick($__sources, [
            'number',
            'responses.update.number',
            'responses.finish.number',
            'responses.start.number',
        ]);

    $__fCounter = $__orderRow->fiskaly_signature_counter
        ?? ($model->fiskaly_signature_counter ?? null)
        ?? ($__txRow->signature_counter ?? null)
        ?? $__pick($__sources, [
            'signature.counter',
            'responses.update.signature.counter',
            'responses.finish.signature.counter',
            'responses.start.signature.counter',
        ]);

    $__fAlgo = $__txRow->signature_algorithm
        ?? $__pick($__sources, [
            'signature.algorithm',
            'responses.update.signature.algorithm',
            'responses.finish.signature.algorithm',
            'responses.start.signature.algorithm',
        ]);

    $__fSerial = $__orderRow->fiskaly_serial_number
        ?? ($model->fiskaly_serial_number ?? null)
        ?? ($__txRow->serial_number ?? null)
        ?? $__pick($__sources, [
            'tss_serial_number',
            'serial_number',
            'responses.update.tss_serial_number',
            'responses.finish.tss_serial_number',
            'responses.start.tss_serial_number',
        ]);

    $__fTxId = $__txRow->tx_id
        ?? $__pick($__sources, ['_id', 'responses.update._id', 'responses.finish._id', 'responses.start._id']);

    $__fTssId = $__txRow->tss_id
        ?? $__pick($__sources, ['tss_id', 'responses.update.tss_id', 'responses.finish.tss_id', 'responses.start.tss_id']);

    $__fClientId = $__txRow->client_id
        ?? $__pick($__sources, ['client_id', 'responses.update.client_id', 'responses.finish.client_id', 'responses.start.client_id']);

    $__showFiskaly = !empty($__fQr) || !empty($__fTxNo) || !empty($__fCounter) || !empty($__fSerial) || !empty($__fTxId);
@endphp

<!DOCTYPE HTML>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>{!! $model->invoice_number.' - '.lang('admin::lang.orders.text_invoice').' - '.setting('site_name') !!}</title>
    {!! get_style_tags() !!}
    <style>
        body {
            background-color: #FFF;
            color: #000;
            margin: 0;
            padding: 0;
            font-size: 11px;
            font-family: Arial, sans-serif;
        }
        @media print {
            @page { size: 80mm auto; margin: 4mm; }
        }
        .container-fluid {
            max-width: 80mm;
            width: 80mm;
            margin: 0 auto;
            padding: 8px 8px !important;
            box-sizing: border-box;
        }
        .invoice-title { text-align: center; }
        .invoice-title h2 { font-size: 16px; margin: 0 0 3px 0; }
        .invoice-title h3 { font-size: 12px; margin: 0; }
        .row { margin: 0; }
        .col, .col-6, .col-12 { padding-left: 0; padding-right: 0; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .invoice-table th, .invoice-table td { padding: 3px 2px !important; vertical-align: top; }
        .invoice-table thead tr { border-bottom: 1px solid #000; }
        .invoice-table tbody tr { border-bottom: 1px solid #ddd; }
        .invoice-table tbody tr:last-child { border-bottom: 1px solid #000; }
        .invoice-table tfoot tr:first-child td { border-top: 1px solid #000; }
        address, p { font-size: 10px; line-height: 1.35; margin: 0 0 5px 0; }
        img.img-responsive { max-height: 55px !important; }
        hr { margin: 6px 0; border: 0; border-top: 1px solid #000; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }

        .pmd-fiskaly-box {
            margin-top: 14px;
            padding-top: 10px;
            border-top: 1px dashed #888;
            font-size: 10px;
        }
        .pmd-fiskaly-title {
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 6px;
        }
        .pmd-fiskaly-intro {
            font-size: 10px;
            color: #444;
            margin-bottom: 8px;
        }
        .pmd-fiskaly-grid {
            display: table;
            width: 100%;
            table-layout: fixed;
        }
        .pmd-fiskaly-qr,
        .pmd-fiskaly-meta {
            display: table-cell;
            vertical-align: top;
        }
        .pmd-fiskaly-qr {
            width: 38mm;
            padding-right: 6px;
        }
        .pmd-fiskaly-qr img {
            width: 100%;
            max-width: 140px;
            height: auto;
            border: 1px solid #ccc;
            background: #fff;
            padding: 3px;
            box-sizing: border-box;
        }
        .pmd-fiskaly-row {
            margin-bottom: 4px;
            word-break: break-word;
        }
        .pmd-fiskaly-label {
            font-weight: 700;
            display: block;
            margin-bottom: 1px;
        }
        .pmd-fiskaly-value {
            color: #333;
            word-break: break-word;
        }
        .thanks {
            margin-top: 10px;
            text-align: center;
            font-size: 11px;
        }
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
@if(request()->get('pmd_debug') == '1')
    @php
        $__dbgModel = $model ?? null;
        $__dbgConn = null;
        $__dbgOrderId = (int)($__dbgModel->order_id ?? 0);
        $__dbgMenus = collect();
        $__dbgTotals = collect();
        $__dbgMenuRows = [];
        $__dbgTotalRows = [];
        $__dbgError = null;

        try {
            $__dbgConn = method_exists($__dbgModel, 'getConnectionName')
                ? ($__dbgModel->getConnectionName() ?: config('database.default'))
                : config('database.default');

            $__dbgMenus = collect($__dbgModel ? ($__dbgModel->getOrderMenusWithOptions() ?? []) : []);
            $__dbgTotals = collect($__dbgModel ? ($__dbgModel->getOrderTotals() ?? []) : []);

            foreach ($__dbgMenus as $__m) {
                $__opts = [];
                foreach (($__m->menu_options ?? []) as $__o) {
                    $__opts[] = [
                        'order_option_category' => $__o->order_option_category ?? null,
                        'order_option_name' => $__o->order_option_name ?? null,
                        'quantity' => $__o->quantity ?? null,
                        'price' => $__o->price ?? ($__o->order_option_price ?? null),
                        'order_option_price' => $__o->order_option_price ?? null,
                    ];
                }

                $__dbgMenuRows[] = [
                    'menu_name' => $__m->name ?? ($__m->menu_name ?? null),
                    'quantity' => $__m->quantity ?? null,
                    'price' => $__m->price ?? null,
                    'subtotal' => $__m->subtotal ?? null,
                    'total' => $__m->total ?? null,
                    'comment' => $__m->comment ?? null,
                    'options_count' => count($__opts),
                    'options' => $__opts,
                ];
            }

            foreach ($__dbgTotals as $__t) {
                $__dbgTotalRows[] = [
                    'code' => $__t->code ?? null,
                    'title' => $__t->title ?? null,
                    'value' => $__t->value ?? null,
                    'priority' => $__t->priority ?? null,
                ];
            }
        } catch (\Throwable $__dbgEx) {
            $__dbgError = $__dbgEx->getMessage();
        }
    @endphp

    <!-- PMD_INVOICE_RUNTIME_DEBUG_PANEL_V1 -->
    <div style="max-width:900px;margin:10px auto 20px auto;padding:12px;border:2px solid #c00;background:#fff8f8;color:#111;font-family:monospace;font-size:12px;white-space:pre-wrap;">
PMD INVOICE RUNTIME DEBUG
-------------------------
order_id: {{ $__dbgOrderId }}
connection: {{ $__dbgConn ?: 'n/a' }}
menus_count: {{ count($__dbgMenuRows) }}
totals_count: {{ count($__dbgTotalRows) }}
error: {{ $__dbgError ?: 'none' }}

MENUS:
{{ json_encode($__dbgMenuRows, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) }}

TOTALS:
{{ json_encode($__dbgTotalRows, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) }}
    </div>
@endif

<div class="container-fluid">
    <div class="row">
        <div class="col">
            <div class="invoice-title">
                <h2>@lang('admin::lang.orders.text_invoice')</h2>
                <h3>@lang('admin::lang.orders.label_order_id') #{{ $model->order_id }}</h3>
            </div>
        </div>
    </div>

    <div class="row"><div class="col"><hr></div></div>

    <div class="row">
        <div class="col-12 text-center" style="margin-bottom: 8px;">
            @if($__showLogo && (setting('invoice_logo') || setting('site_logo')))
                <img class="img-responsive" src="{{ uploads_url(setting('invoice_logo') ?: setting('site_logo')) }}" alt="" style="max-height:50px; margin-bottom:5px;" />
                <br>
            @endif

            <p style="margin-bottom: 4px;">
                <span style="font-size: 13px; font-weight: 600;">{{ $model->location->location_name }}</span>
            </p>

            <address style="font-style: normal; font-size: 9px;">
                {{ format_address($model->location->getAddress(), true) }}
                @if($model->location->location_telephone)
                    <br><strong>Tel:</strong> {{ $model->location->location_telephone }}
                @endif
                @if($model->location->location_email)
                    <br><strong>Email:</strong> {{ $model->location->location_email }}
                @endif
            </address>
        </div>
    </div>

    <div class="row"><div class="col"><hr></div></div>

    <div class="row">
        <div class="col-6" style="width:50%; float:left;">
            <p style="font-size:9px;">
                <strong>@lang('admin::lang.orders.text_invoice_no')</strong><br>
                {{ $model->invoice_number }}
            </p>

            <p style="font-size:9px;">
                <strong>@lang('admin::lang.orders.text_invoice_date')</strong><br>
                @if($model->invoice_date)
                    {{ $model->invoice_date->format(lang('system::lang.php.date_format')) }}
                @elseif($model->order_date)
                    {{ $model->order_date->format(lang('system::lang.php.date_format')) }}
                @endif
            </p>
        </div>

        <div class="col-6" style="width:50%; float:left;">
            <p style="font-size:9px;">
                <strong>@lang('admin::lang.orders.text_payment')</strong><br>
                {{ $model->payment_method ? $model->payment_method->name : '' }}
            </p>

            <p style="font-size:9px;">
                <strong>@lang('admin::lang.orders.text_order_date')</strong><br>
                {{ $model->order_date->setTimeFromTimeString($model->order_time)->format(lang('system::lang.php.date_time_format')) }}
            </p>
        </div>
    </div>

    <div style="clear: both;"></div>
    <div class="row"><div class="col"><hr></div></div>

    <div class="row">
        <div class="col">
            <table class="invoice-table">
                <thead>
                <tr>
                    <th class="text-center" width="10%"></th>
                    <th class="text-left" width="48%"><b>NAME/OPTIONS</b></th>
                    <th class="text-right" width="21%"><b>PRICE</b></th>
                    <th class="text-right" width="21%"><b>TOTAL</b></th>
                </tr>
                </thead>


@php
    /* PMD_CANONICAL_GROSS_DISPLAY_V3 */
    $orderTotals = collect($model->getOrderTotals() ?? []);
    $pmdMenus = collect($model->getOrderMenusWithOptions() ?? []);

    $subtotalTotal = $subtotalTotal ?? $orderTotals->firstWhere('code', 'subtotal');
    $taxTotal = $taxTotal ?? $orderTotals->firstWhere('code', 'tax');
    $tipTotal = $tipTotal ?? $orderTotals->firstWhere('code', 'tip');
    $finalTotal = $finalTotal ?? $orderTotals->firstWhere('code', 'total');
    $discountTotal = $discountTotal ?? $orderTotals->firstWhere('code', 'discount');
    $couponTotal = $couponTotal ?? $discountTotal ?? null;
    $couponCode = $couponCode ?? (($model->coupon_code ?? null) ?: ($model->coupon ?? null));

    $pmdTaxLabelFromTotals = (string)($taxTotal->title ?? $__pmdTaxLabel ?? 'VAT');
    $pmdTaxIncluded = stripos($pmdTaxLabelFromTotals, 'included') !== false;

    $displayTotalItems = 0;
    $pmdDisplayedSubtotal = 0.0;

    foreach ($pmdMenus as $pmdMenuItem) {
        $qty = max(1, (int)($pmdMenuItem->quantity ?? 1));
        $displayTotalItems += $qty;

        $baseNetLine = round((float)($pmdMenuItem->subtotal ?? 0), 2);
        $optionsNetLine = 0.0;

        foreach (($pmdMenuItem->menu_options ?? []) as $pmdMenuItemOption) {
            $optValueNet = round(
                (float)($pmdMenuItemOption->quantity ?? 0) * (float)($pmdMenuItemOption->order_option_price ?? 0),
                2
            );
            $optionsNetLine += $optValueNet;
            $pmdMenuItemOption->__pmd_display_value = round($optValueNet, 2);
        }

        $fullNetLine = round($baseNetLine + $optionsNetLine, 2);
        $pmdMenuItem->__pmd_display_subtotal = round($fullNetLine, 2);
        $pmdMenuItem->__pmd_display_price = round($qty > 0 ? ($fullNetLine / $qty) : $fullNetLine, 2);

        $pmdDisplayedSubtotal += (float)$pmdMenuItem->__pmd_display_subtotal;
    }

    $pmdDisplayedSubtotal = round($pmdDisplayedSubtotal, 2);
    $pmdDisplayedTip = round((float)($tipTotal->value ?? 0), 2);
    $pmdDisplayedDiscount = round((float)($couponTotal->value ?? 0), 2);

    $pmdDisplayedTax = round((float)($taxTotal->value ?? 0), 2);
    $pmdDisplayedTotal = round((float)($finalTotal->value ?? ($pmdDisplayedSubtotal + $pmdDisplayedTip + $pmdDisplayedDiscount)), 2);
    $pmdTaxLabel = $pmdTaxLabelFromTotals !== '' ? $pmdTaxLabelFromTotals : ($pmdTaxIncluded ? 'VAT included' : 'VAT');
@endphp


<tbody>
                    @php
                        $__invoiceMenus = $model->getOrderMenusWithOptions();
                    @endphp
                    @foreach($__invoiceMenus as $menuItem)
                        @php
                            $__qty = (float)($menuItem->quantity ?? 0);
                            $__lineSubtotal = (float)($menuItem->subtotal ?? 0);

                            $__menuItemOptionGroup = collect($menuItem->menu_options ?? [])->groupBy('order_option_category');

                            $__lineDisplaySubtotal = round($__lineSubtotal, 2);
                            $__unitDisplayPrice = $__qty > 0
                                ? round($__lineDisplaySubtotal / $__qty, 2)
                                : $__lineDisplaySubtotal;
                        @endphp
                        <tr>
                            <td class="text-center">{{ (int)$menuItem->quantity }}x</td>
                            <td class="text-left">
                                <b>{{ $menuItem->name }}</b>

                                @if($__menuItemOptionGroup->isNotEmpty())
                                    @foreach($__menuItemOptionGroup as $__groupName => $__groupItems)
                                        <div style="font-size:8px; margin-top:3px; line-height:1.45;">
                                            @if(!empty($__groupName))
                                                <strong>{{ $__groupName }}:</strong><br>
                                            @endif

                                            @foreach($__groupItems as $__opt)
                                                @php
                                                    $__optQty = (float)($__opt->quantity ?? 1);
                                                    $__optPrice = round((float)($__opt->order_option_price ?? 0), 2);
                                                    $__optTotal = $__optQty * $__optPrice;
                                                @endphp

                                                &nbsp;&nbsp;— {{ $__opt->order_option_name }}
                                                @if($__optPrice > 0)
                                                    ({{ currency_format($__optTotal) }})
                                                @endif
                                                <br>
                                            @endforeach
                                        </div>
                                    @endforeach
                                @endif

                                @php($pmdMenuComment = pmdCleanGuestSessionComment($menuItem->comment ?? ''))
                                @if($pmdMenuComment !== '')
                                    <div style="margin-top:2px;">
                                        <small><b>{{ $pmdMenuComment }}</b></small>
                                    </div>
                                @endif
                            </td>
                            <td class="text-right">{{ currency_format($__unitDisplayPrice) }}</td>
                            <td class="text-right">{{ currency_format($__lineDisplaySubtotal ?? $__lineSubtotal) }}</td>
                        </tr>
                    @endforeach
                    </tbody>


                    <tfoot>
                    @php
                        $orderTotals = collect($model->getOrderTotals() ?? []);
                        $tipTotal = $orderTotals->firstWhere('code', 'tip');
                        $discountTotal = $orderTotals->firstWhere('code', 'discount');
                        $couponTotal = $couponTotal ?? $discountTotal ?? null;
                        $finalTotal = $orderTotals->firstWhere('code', 'total');

                        $displaySubtotal = round($__pmdDisplayedSubtotal, 2);
                        $displayTip = round((float)($tipTotal->value ?? 0), 2);
                        $displayDiscount = round((float)($couponTotal->value ?? 0), 2);
                        $displayFinal = round((float)($finalTotal->value ?? ($model->order_total ?? ($displaySubtotal + $displayTip + $displayDiscount))), 2);

                        $displayItems = 0;
                        foreach (($model->getOrderMenusWithOptions() ?? []) as $__mi) {
                            $displayItems += (int)($__mi->quantity ?? 0);
                        }

                        $couponCode = null;
                        if ($couponTotal) {
                            $couponTitle = $couponTotal->title ?? '';
                            if (preg_match('/\(([^)]+)\)/', $couponTitle, $matches)) {
                                $couponCode = $matches[1];
                            }
                        }
                    @endphp

                    @if($displaySubtotal > 0)
                        <tr>
                            <td class="thick-line"></td>
                            <td class="thick-line text-left">
                                {{ $model->order_type_name }}
                                @if($displayItems > 0)
                                    ({{ $displayItems }} item{{ $displayItems > 1 ? 's' : '' }})
                                @endif
                            </td>
                            <td class="thick-line"></td>
                            <td class="thick-line text-right">{{ currency_format($displaySubtotal) }}</td>
                        </tr>
                    @endif

                    @if($__pmdTaxIncluded)
                        <tr>
                            <td class="no-line"></td>
                            <td class="no-line text-left">{{ $__taxTotal->title ?: 'VAT included' }}</td>
                            <td class="no-line"></td>
                            <td class="no-line text-right">{{ currency_format((float)$__taxTotal->value) }}</td>
                        </tr>
                    @elseif($__taxTotal && (float)$__taxTotal->value > 0)
                        <tr>
                            <td class="no-line"></td>
                            <td class="no-line text-left">{{ $__taxTotal->title ?: 'VAT' }}</td>
                            <td class="no-line"></td>
                            <td class="no-line text-right">{{ currency_format((float)$__taxTotal->value) }}</td>
                        </tr>
                    @endif

                    @if($tipTotal && (float)$tipTotal->value > 0)
                        <tr>
                            <td class="no-line"></td>
                            <td class="no-line text-left">{{ $tipTotal->title ?: 'Tip' }}</td>
                            <td class="no-line"></td>
                            <td class="no-line text-right">{{ currency_format((float)$tipTotal->value) }}</td>
                        </tr>
                    @endif

                    @if($couponTotal && (float)$couponTotal->value != 0)
                        <tr>
                            <td class="no-line"></td>
                            <td class="no-line text-left">
                                {{ $couponTotal->title ?: 'Coupon' }}
                                @if($couponCode)
                                    ({{ $couponCode }})
                                @endif
                            </td>
                            <td class="no-line"></td>
                            <td class="no-line text-right">
                                {{ (float)$couponTotal->value < 0 ? '-' : '' }}{{ currency_format(abs((float)$couponTotal->value)) }}
                            </td>
                        </tr>
                    @endif

                    <tr>
                        <td class="thick-line"></td>
                        <td class="thick-line text-left"><strong>{{ $finalTotal->title ?? 'Total' }}</strong></td>
                        <td class="thick-line"></td>
                        <td class="thick-line text-right"><strong>{{ currency_format($displayFinal) }}</strong></td>
                    </tr>
                    </tfoot>

            </table>
        </div>
    </div>

    @if($__showFiskaly && $__showFiskalyCfg)
        <div class="pmd-fiskaly-box">
            <div class="pmd-fiskaly-title">TSE / Fiskaly Signaturdaten</div>
            <div class="pmd-fiskaly-intro">TSE/Fiskaly data loaded directly from order/transaction data.</div>

            <div class="pmd-fiskaly-grid">
                @if($__showQr && !empty($__fQr))
                    <div class="pmd-fiskaly-qr">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data={{ urlencode($__fQr) }}" alt="Fiskaly QR Code">
                    </div>
                @endif

                <div class="pmd-fiskaly-meta">
                    @if(!empty($__fStatus))
                        <div class="pmd-fiskaly-row">
                            <span class="pmd-fiskaly-label">Fiskaly Status</span>
                            <span class="pmd-fiskaly-value">{{ $__fStatus }}</span>
                        </div>
                    @endif

                    @if(!empty($__fTxId))
                        <div class="pmd-fiskaly-row">
                            <span class="pmd-fiskaly-label">Transaction Ref</span>
                            <span class="pmd-fiskaly-value">{{ $__fTxId }}</span>
                        </div>
                    @endif

                    @if(!empty($__fTxNo))
                        <div class="pmd-fiskaly-row">
                            <span class="pmd-fiskaly-label">TSE Transaction No.</span>
                            <span class="pmd-fiskaly-value">{{ $__fTxNo }}</span>
                        </div>
                    @endif

                    @if(!empty($__fCounter))
                        <div class="pmd-fiskaly-row">
                            <span class="pmd-fiskaly-label">Signature Counter</span>
                            <span class="pmd-fiskaly-value">{{ $__fCounter }}</span>
                        </div>
                    @endif

                    @if(!empty($__fSerial))
                        <div class="pmd-fiskaly-row">
                            <span class="pmd-fiskaly-label">Serial Number</span>
                            <span class="pmd-fiskaly-value">{{ $__fSerial }}</span>
                        </div>
                    @endif

                    @if(!empty($__fTssId))
                        <div class="pmd-fiskaly-row">
                            <span class="pmd-fiskaly-value">{{ $__fTssId }}</span>
                        </div>
                    @endif

                    @if(!empty($__fClientId))
                        <div class="pmd-fiskaly-row">
                            <span class="pmd-fiskaly-value">{{ $__fClientId }}</span>
                        </div>
                    @endif
                </div>
            </div>
        </div>
    @endif

    <p class="thanks">Thank you for your Visit</p>
</div>

@if($__autoPrint)<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},250);});</script>@endif
<script src="/app/admin/assets/js/pmd-waiter-v98-single-source.js?v=98"></script>







<!-- PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-final-single-logo-v20.css?v=20260625_154925">
<script defer src="/app/admin/assets/js/pmd-admin-final-single-logo-v20.js?v=20260625_154925"></script>
<!-- /PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->

</body>
</html>
