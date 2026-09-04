@php
    /**
     * PMD tenant-safe settings reader.
     *
     * In this multi-tenant setup, setting('invoice_*') may read the base/default
     * settings context instead of the active tenant context. The customer invoice
     * page is already rendered under the tenant request/connection, so DB::table('settings')
     * is the reliable source here. Laravel automatically applies the ti_ prefix.
     */
    $pmdSetting = function ($key, $default = null) {
        static $pmdSettings = null;

        if ($pmdSettings === null) {
            $pmdSettings = [];

            try {
                $rows = \Illuminate\Support\Facades\DB::table('settings')
                    ->get(['item', 'value', 'serialized']);

                foreach ($rows as $row) {
                    $value = $row->value;

                    if ((int)($row->serialized ?? 0) === 1 && is_string($value)) {
                        $decoded = @unserialize($value);
                        if ($decoded !== false || $value === 'b:0;') {
                            $value = $decoded;
                        }
                    }

                    $pmdSettings[(string)$row->item] = $value;
                }
            } catch (\Throwable $e) {
                $pmdSettings = [];
            }
        }

        if (array_key_exists($key, $pmdSettings) && $pmdSettings[$key] !== null && $pmdSettings[$key] !== '') {
            return $pmdSettings[$key];
        }

        try {
            $fallback = setting($key, $default);
            return ($fallback !== null && $fallback !== '') ? $fallback : $default;
        } catch (\Throwable $e) {
            return $default;
        }
    };
@endphp

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Invoice #{{ $model->order_id }}</title>
    @php
        $tpl = (string)($pmdSetting('invoice_customer_template') ?: 'classic');
        $footerText = trim((string)($pmdSetting('invoice_customer_footer_text') ?: ''));

        $resolveLogoPath = function ($val) {
            if (is_string($val)) return trim($val);
            if (is_array($val)) return trim((string)($val['path'] ?? $val['publicUrl'] ?? $val['url'] ?? ''));
            if (is_object($val)) return trim((string)($val->path ?? $val->publicUrl ?? $val->url ?? ''));
            return '';
        };

        $invoiceLogoPath = $resolveLogoPath($pmdSetting('invoice_logo'));
        $siteLogoPath = $resolveLogoPath($pmdSetting('site_logo'));
        $dashboardLogoPath = $resolveLogoPath($pmdSetting('dashboard_logo'));
        $logoPath = $invoiceLogoPath !== '' ? $invoiceLogoPath : ($siteLogoPath !== '' ? $siteLogoPath : $dashboardLogoPath);
        // PMD_R71_EMBEDDED_INVOICE_LOGO
        $embedInvoiceLogo = function ($path) {
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

        $logoUrl = '';
        if ($logoPath !== '') {
            $embeddedLogo = $embedInvoiceLogo($logoPath);
            $logoUrl = $embeddedLogo !== ''
                ? $embeddedLogo
                : (preg_match('#^https?://#i', $logoPath) ? $logoPath : uploads_url($logoPath));
        }
    @endphp
    <style>
        @page { size: var(--pmd-page-width,80mm) auto; margin: 4mm; }
        body { margin:0; padding:8px; font-family: Arial, Helvetica, sans-serif; background:#f5f5f5; color:#111; }
        .receipt { width:var(--pmd-receipt-width,72mm); max-width:var(--pmd-receipt-width,72mm); margin:0 auto; background:#fff; padding:9px 7px; box-sizing:border-box; border:1px solid #ddd; }
        .center { text-align:center; }
        .small { font-size:11px; }
        .xs { font-size:10px; }
        .muted { color:#5d5d5d; }
        .sep { border-top:1px dashed #777; margin:7px 0; }
        .row { display:flex; justify-content:space-between; gap:6px; }
        .items td { font-size:11px; padding:2px 0; vertical-align:top; }
        .items td:first-child { width:76%; word-break:break-word; }
        .items td:last-child { width:24%; text-align:right; white-space:nowrap; }
        .items tr.option-row td { padding-top:0; color:#444; font-size:10px; }
        .items tr.option-row td:first-child { padding-left:12px; }
        .items tr.option-row td:last-child { font-weight:600; }
        .badge { display:inline-block; border:1px solid #222; padding:2px 7px; font-size:10px; margin-top:5px; border-radius:10px; }
        .print-btn { margin:10px auto 0; display:block; border:1px solid #222; background:#fff; color:#111; padding:7px 11px; font-size:12px; border-radius:6px; cursor:pointer; }
        .totals .row { margin:2px 0; }
        .totals .total { font-weight:700; font-size:12px; }

        body.template-modern .receipt { border-color:#cfcfcf; box-shadow:0 1px 2px rgba(0,0,0,0.06); }
        body.template-modern .sep { border-top-style:solid; border-top-color:#d7d7d7; }
        body.template-modern .badge { border-color:#444; }

        body.template-minimal .receipt { border:0; }
        body.template-minimal .sep { border-top-color:#c9c9c9; }
        body.template-minimal .badge { border-radius:0; padding:1px 6px; }

        @media print {
            body { background:#fff; padding:0; }
            .receipt { width:100%; max-width:100%; margin:0; padding:0; border:0; box-shadow:none; }
            .print-btn { display:none; }
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
@php
    $orderTotals = collect($model->getOrderTotals() ?? []);
    $orderTotal = (float)(optional($orderTotals->firstWhere('code', 'total'))->value ?? $model->order_total ?? 0);
    $statusName = strtolower((string)optional($model->status)->status_name);
    $isPaid = !empty($model->settled_at)
        || ($orderTotal > 0 && (float)($model->settled_amount ?? 0) >= $orderTotal)
        || ((bool)($model->processed ?? false) && in_array($statusName, ['paid', 'complete', 'completed'], true));
    $rows = $model->getOrderMenusWithOptions();

    // PMD_CUSTOMER_INVOICE_OPTION_LINES_V5
    // QR table orders store the configured unit price in order_menus.price and
    // decorate the item name (e.g. "Chicken — Ketchab"). The standard order
    // relation may expose menu_options directly. Build one display model that
    // supports both without changing historical order totals.
    $orderMenuOptionPayloads = collect();
    try {
        $orderMenuOptionPayloads = \Illuminate\Support\Facades\DB::table('order_menus')
            ->where('order_id', (int)$model->order_id)
            ->pluck('option_values', 'order_menu_id');
    } catch (\Throwable $e) {
        $orderMenuOptionPayloads = collect();
    }

    $invoiceItemLines = collect();
    $normalizeOptionName = function ($value) {
        $value = trim((string)$value);
        return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    };

    foreach ($rows as $row) {
        $qty = max(1, (float)($row->quantity ?? 1));
        $rawName = trim((string)($row->name ?? 'Item'));
        $nameParts = preg_split('/\s+—\s+/u', $rawName, 2);
        $baseName = trim((string)($nameParts[0] ?? $rawName));
        $decoratedNames = [];
        if (isset($nameParts[1]) && trim((string)$nameParts[1]) !== '') {
            $decoratedNames = array_values(array_filter(array_map('trim', explode(',', (string)$nameParts[1]))));
        }
        $isConfiguredQrLine = count($decoratedNames) > 0;

        $optionLines = [];
        $seen = [];

        // Standard TastyIgniter orders: preserve historical order option rows.
        foreach (collect($row->menu_options ?? []) as $option) {
            $name = trim((string)($option->order_option_name ?? ''));
            if ($name === '') continue;
            $unitPrice = (float)($option->order_option_price ?? $option->price ?? 0);
            $optionQty = max(1, (float)($option->quantity ?? 1));
            $key = $normalizeOptionName($name);
            if (isset($seen[$key])) continue;
            $seen[$key] = true;
            $optionLines[] = [
                'name' => $name,
                'unit_price' => $unitPrice,
                'line_total' => $optionQty * $unitPrice,
            ];
        }

        // QR orders currently keep selected value IDs in order_menus.option_values
        // while the human-readable names remain in the decorated order item name.
        // Resolve both against the canonical option tables so existing paid orders
        // can print a base food line plus separate modifier lines.
        if ($isConfiguredQrLine && empty($optionLines)) {
            $stored = $orderMenuOptionPayloads->get((int)($row->order_menu_id ?? 0));
            $selectedIds = [];
            if (is_string($stored) && trim($stored) !== '') {
                $decoded = json_decode($stored, true);
                if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
                    $decoded = @unserialize($stored);
                }
                if (is_array($decoded)) {
                    $walkIds = function ($value) use (&$walkIds, &$selectedIds) {
                        if (is_array($value)) {
                            foreach ($value as $child) $walkIds($child);
                            return;
                        }
                        if (is_numeric($value) && (int)$value > 0) $selectedIds[] = (int)$value;
                    };
                    $walkIds($decoded);
                }
            }
            $selectedIds = array_values(array_unique($selectedIds));

            $available = collect();
            try {
                $available = \Illuminate\Support\Facades\DB::table('menu_option_values as mov')
                    ->join('menu_item_option_values as miov', 'mov.option_value_id', '=', 'miov.option_value_id')
                    ->join('menu_item_options as mio', 'miov.menu_option_id', '=', 'mio.menu_option_id')
                    ->leftJoin('menu_options as mo', 'mio.option_id', '=', 'mo.option_id')
                    ->where('mio.menu_id', (int)($row->menu_id ?? 0))
                    ->get([
                        'mov.option_value_id',
                        'mov.value',
                        'mov.price as base_option_price',
                        'miov.new_price as menu_option_price',
                        'mo.option_name as option_group_name',
                    ]);
            } catch (\Throwable $e) {
                $available = collect();
            }

            $byName = [];
            $byId = [];
            foreach ($available as $candidate) {
                $candidateName = trim((string)($candidate->value ?? ''));
                $candidatePrice = $candidate->menu_option_price !== null
                    ? (float)$candidate->menu_option_price
                    : (float)($candidate->base_option_price ?? 0);
                $record = [
                    'name' => $candidateName,
                    'unit_price' => $candidatePrice,
                    'line_total' => $qty * $candidatePrice,
                ];
                if ($candidateName !== '') $byName[$normalizeOptionName($candidateName)] = $record;
                $byId[(int)($candidate->option_value_id ?? 0)] = $record;
            }

            // Decorated names preserve the customer's original display order and
            // also recover multi-select values even though the legacy QR ID map can
            // collapse duplicate group keys.
            foreach ($decoratedNames as $decoratedName) {
                $key = $normalizeOptionName($decoratedName);
                if (isset($seen[$key])) continue;
                $record = $byName[$key] ?? [
                    'name' => $decoratedName,
                    'unit_price' => null,
                    'line_total' => null,
                ];
                $optionLines[] = $record;
                $seen[$key] = true;
            }

            foreach ($selectedIds as $selectedId) {
                if (!isset($byId[$selectedId])) continue;
                $record = $byId[$selectedId];
                $key = $normalizeOptionName($record['name']);
                if (isset($seen[$key])) continue;
                $optionLines[] = $record;
                $seen[$key] = true;
            }
        }

        $fullUnitPrice = (float)($row->price ?? 0);
        $baseUnitPrice = $fullUnitPrice;

        if ($isConfiguredQrLine) {
            $knownOptionUnit = 0.0;
            $unpricedIndexes = [];
            foreach ($optionLines as $index => $optionLine) {
                if ($optionLine['unit_price'] === null) {
                    $unpricedIndexes[] = $index;
                } else {
                    $knownOptionUnit += (float)$optionLine['unit_price'];
                }
            }

            // Current canonical base price gives a safe fallback for historical QR
            // rows whose old option definition has since disappeared.
            $currentBasePrice = null;
            try {
                $currentBasePrice = \Illuminate\Support\Facades\DB::table('menus')
                    ->where('menu_id', (int)($row->menu_id ?? 0))
                    ->value('menu_price');
                $currentBasePrice = is_numeric($currentBasePrice) ? (float)$currentBasePrice : null;
            } catch (\Throwable $e) {
                $currentBasePrice = null;
            }

            if ($currentBasePrice !== null && $currentBasePrice >= 0 && $currentBasePrice <= $fullUnitPrice + 0.0001) {
                $baseUnitPrice = $currentBasePrice;
                $availableOptionUnit = max(0, $fullUnitPrice - $baseUnitPrice);
                $remainingOptionUnit = max(0, $availableOptionUnit - $knownOptionUnit);
                if (count($unpricedIndexes) === 1) {
                    $idx = $unpricedIndexes[0];
                    $optionLines[$idx]['unit_price'] = $remainingOptionUnit;
                    $optionLines[$idx]['line_total'] = $qty * $remainingOptionUnit;
                    $knownOptionUnit += $remainingOptionUnit;
                    $unpricedIndexes = [];
                }
                if (empty($unpricedIndexes) && abs(($baseUnitPrice + $knownOptionUnit) - $fullUnitPrice) > 0.01) {
                    $baseUnitPrice = max(0, $fullUnitPrice - $knownOptionUnit);
                }
            } else {
                $baseUnitPrice = max(0, $fullUnitPrice - $knownOptionUnit);
            }

            foreach ($optionLines as $index => $optionLine) {
                if ($optionLine['unit_price'] !== null) {
                    $optionLines[$index]['line_total'] = $qty * (float)$optionLine['unit_price'];
                }
            }
        }

        $invoiceItemLines->push((object)[
            'quantity' => $qty,
            'name' => $baseName !== '' ? $baseName : $rawName,
            'base_line_total' => $qty * $baseUnitPrice,
            'options' => $optionLines,
        ]);
    }

    $taxRow = $orderTotals->firstWhere('code', 'tax');
    $subtotal = (float)(optional($orderTotals->firstWhere('code', 'subtotal'))->value ?? 0);
    $vatAmount = (float)(optional($taxRow)->value ?? 0);
    $taxTitle = (string)(optional($taxRow)->title ?? 'VAT');
@endphp
@php
$receiptMode=(string)$pmdSetting('invoice_receipt_mode','1')==='1';
$paper=(string)$pmdSetting('invoice_paper_width','80mm');
$wMap=['58mm'=>'50mm','80mm'=>'72mm','112mm'=>'102mm','a4'=>'190mm'];
$rw=$wMap[$paper]??'72mm';
$compact=(string)$pmdSetting('invoice_compact_mode','1')==='1';
$font=(string)$pmdSetting('invoice_font_size_preset','normal');
$auto=(string)$pmdSetting('invoice_auto_print_dialog','0')==='1';
@endphp
<body style="--pmd-page-width:{{$paper}};--pmd-receipt-width:{{$rw}};" class="template-{{ $tpl === 'modern' ? 'modern' : ($tpl === 'minimal' ? 'minimal' : 'classic') }}">
<div class="receipt">
    <div class="center">
        @if(((string)$pmdSetting('invoice_show_logo','1')==='1') && $logoUrl !== '')
            <img src="{{ $logoUrl }}" alt="logo" style="max-height:42px; max-width:64mm; margin-bottom:5px; object-fit:contain;">
        @endif
        <div style="font-weight:700; font-size:14px;">{{ $pmdSetting('site_name') }}</div>
        <div class="small" style="font-weight:700; margin-top:4px; letter-spacing:.2px;">Invoice</div>
        <div class="badge">{{ $isPaid ? 'Paid' : 'Payment pending' }}</div>
    </div>

    <div class="sep"></div>

    <div class="small" style="line-height:1.45;">
        <div class="row"><span>Invoice #</span><strong>{{ $model->order_id }}</strong></div>
        <div class="row"><span>Date</span><span>{{ optional($model->created_at)->format('Y-m-d H:i') }}</span></div>
        <div class="row"><span>Context</span><span>{{ $model->order_type_name ?? $model->order_type }}</span></div>
        <div class="row"><span>Customer</span><span>{{ $model->customer_name ?: 'Guest' }}</span></div>
    </div>

    <div class="sep"></div>

    <table class="items" width="100%" cellspacing="0" cellpadding="0">
        @foreach($invoiceItemLines as $itemLine)
            @php
                $qtyLabel = rtrim(rtrim(number_format((float)$itemLine->quantity, 2, '.', ''), '0'), '.');
            @endphp
            <tr class="item-row">
                <td>{{ $qtyLabel }} x {{ $itemLine->name }}</td>
                <td>{{ number_format((float)$itemLine->base_line_total, 2) }}</td>
            </tr>
            @foreach($itemLine->options as $optionLine)
                <tr class="option-row">
                    <td>+ {{ $optionLine['name'] }}</td>
                    <td>
                        @if($optionLine['line_total'] !== null)
                            +{{ number_format((float)$optionLine['line_total'], 2) }}
                        @else
                            —
                        @endif
                    </td>
                </tr>
            @endforeach
        @endforeach
    </table>

    <div class="sep"></div>

    <div class="small totals" style="line-height:1.5;">
        @if($vatAmount > 0)
            <div class="row"><span>Subtotal</span><strong>{{ number_format($subtotal, 2) }}</strong></div>
            <div class="row"><span>{{ $taxTitle }}</span><span>{{ number_format($vatAmount,2) }}</span></div>
        @endif
        <div class="row total"><span>Total</span><strong>{{ number_format($orderTotal, 2) }}</strong></div>
    </div>

    @if($footerText !== '')
        <div class="sep"></div>
        <div class="xs muted center">{{ $footerText }}</div>
    @endif
</div>
<!-- PMD_DESKTOP_INVOICE_REPRINT_R1 -->
<button class="print-btn" onclick="return window.pmdPrintReceipt(event)">Print invoice</button>
<script>
window.pmdPrintReceipt = function (event) {
    if (event) event.preventDefault();
    try {
        if (
            window.parent && window.parent !== window &&
            window.parent.PMDCashierOrderCenter &&
            typeof window.parent.PMDCashierOrderCenter.printCurrentDocument === 'function'
        ) {
            window.parent.PMDCashierOrderCenter.printCurrentDocument();
            return false;
        }
    } catch (error) {}
    window.print();
    return false;
};
</script>
@if($auto)<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},250);});</script>@endif
<script src="/app/admin/assets/js/pmd-waiter-v98-single-source.js?v=98"></script>







<!-- PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-final-single-logo-v20.css?v=20260625_154925">
<script defer src="/app/admin/assets/js/pmd-admin-final-single-logo-v20.js?v=20260625_154925"></script>
<!-- /PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->


<!-- PMD_DESKTOP_STANDALONE_PRINT_BRIDGE_V108 -->
<script defer src="/app/admin/assets/js/pmd-desktop-print-bridge-v108.js?v=109"></script>
</body>
</html>
