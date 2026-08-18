@php
    $pmdKdsEmbedded = function_exists('request') && in_array((string)request()->query('embed', request()->query('pmd_clean', '')), ['1', 'true'], true);
@endphp
<!DOCTYPE html>
<html lang="en" class="{{ $pmdKdsEmbedded ? 'pmd-kds-embedded-v1' : '' }}">
<head>
    <link rel="icon" type="image/svg+xml" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-exact-sidebar-logo-20260818-v2">
    <link rel="shortcut icon" type="image/svg+xml" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-exact-sidebar-logo-20260818-v2">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>{{ $title }}</title>

    <script id="pmd-kds-display-v1-first-paint">
    (function () {
        try {
            var allowed = ['80', '90', '100', '110', '120'];
            var saved = localStorage.getItem('pmd-kds-card-zoom-v1') || '100';
            if (allowed.indexOf(saved) === -1) saved = '100';
            document.documentElement.setAttribute('data-kds-zoom', saved);
        } catch (e) {
            document.documentElement.setAttribute('data-kds-zoom', '100');
        }
    })();
    </script>

    <style id="pmd-kds-display-v1-style">
        :root {
            --pmd-kds-page: #f4f7f8;
            --pmd-kds-surface: #ffffff;
            --pmd-kds-surface-soft: #f8fafb;
            --pmd-kds-ink: #10231e;
            --pmd-kds-muted: #687873;
            --pmd-kds-line: #dce7e3;
            --pmd-kds-line-strong: #c8d8d2;
            --pmd-kds-brand: #08745c;
            --pmd-kds-brand-dark: #055a48;
            --pmd-kds-brand-soft: #eaf5f1;
            --pmd-kds-warning: #9a5a16;
            --pmd-kds-warning-line: #efc979;
            --pmd-kds-warning-soft: #fff8e9;
            --pmd-kds-danger: #c9362b;
            --pmd-kds-danger-soft: #fff3f1;
            --pmd-kds-card-min: 360px;
            --pmd-kds-card-pad: 20px;
            --pmd-kds-item-pad: 14px;
            --pmd-kds-title-size: 34px;
            --pmd-kds-item-size: 20px;
            --pmd-kds-qty-size: 22px;
            --pmd-kds-gap: 12px;
            --pmd-kds-radius: 18px;
        }

        html[data-kds-zoom="80"] {
            --pmd-kds-card-min: 270px;
            --pmd-kds-card-pad: 14px;
            --pmd-kds-item-pad: 10px;
            --pmd-kds-title-size: 27px;
            --pmd-kds-item-size: 16px;
            --pmd-kds-qty-size: 18px;
            --pmd-kds-gap: 8px;
            --pmd-kds-radius: 15px;
        }

        html[data-kds-zoom="90"] {
            --pmd-kds-card-min: 315px;
            --pmd-kds-card-pad: 16px;
            --pmd-kds-item-pad: 12px;
            --pmd-kds-title-size: 30px;
            --pmd-kds-item-size: 18px;
            --pmd-kds-qty-size: 20px;
            --pmd-kds-gap: 10px;
            --pmd-kds-radius: 16px;
        }

        html[data-kds-zoom="110"] {
            --pmd-kds-card-min: 420px;
            --pmd-kds-card-pad: 23px;
            --pmd-kds-item-pad: 16px;
            --pmd-kds-title-size: 38px;
            --pmd-kds-item-size: 22px;
            --pmd-kds-qty-size: 25px;
            --pmd-kds-gap: 14px;
            --pmd-kds-radius: 20px;
        }

        html[data-kds-zoom="120"] {
            --pmd-kds-card-min: 480px;
            --pmd-kds-card-pad: 26px;
            --pmd-kds-item-pad: 18px;
            --pmd-kds-title-size: 42px;
            --pmd-kds-item-size: 24px;
            --pmd-kds-qty-size: 28px;
            --pmd-kds-gap: 16px;
            --pmd-kds-radius: 22px;
        }

        *, *::before, *::after { box-sizing: border-box; }

        html, body {
            min-height: 100%;
            margin: 0;
            background: var(--pmd-kds-page);
            color: var(--pmd-kds-ink);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
        }

        body { overflow-x: hidden; }

        button, select, a { font: inherit; }
        button, select { -webkit-tap-highlight-color: transparent; }

        .kds-container {
            width: 100%;
            max-width: 100%;
            padding: 18px;
        }

        .kds-header {
            min-height: 74px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            padding: 14px 18px;
            margin: 0 0 18px;
            border: 1px solid var(--pmd-kds-line);
            border-left: 4px solid var(--pmd-kds-brand);
            border-radius: 18px;
            background: rgba(255,255,255,.98);
            box-shadow: 0 10px 28px rgba(16,35,30,.055);
        }

        .kds-header-left,
        .kds-header-right {
            display: flex;
            align-items: center;
            min-width: 0;
        }

        .kds-header-left { gap: 24px; }
        .kds-header-right { gap: 10px; margin-left: auto; }

        .kds-station-name {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            color: var(--pmd-kds-brand-dark);
            font-size: 23px;
            font-weight: 850;
            letter-spacing: -.025em;
            white-space: nowrap;
        }

        .kds-station-mark {
            width: 18px;
            height: 18px;
            flex: 0 0 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 2px solid currentColor;
            border-radius: 4px;
        }

        .kds-station-mark::after {
            content: "";
            width: 6px;
            height: 6px;
            border-radius: 1px;
            background: currentColor;
        }

        .kds-stat {
            display: inline-flex;
            align-items: baseline;
            gap: 8px;
            color: var(--pmd-kds-muted);
            font-size: 15px;
            font-weight: 750;
            white-space: nowrap;
        }

        .kds-stat-value {
            min-width: 1.2ch;
            color: var(--pmd-kds-ink);
            font-size: 27px;
            font-weight: 850;
            font-variant-numeric: tabular-nums;
        }

        .station-selector,
        .kds-icon-btn,
        .kds-settings-btn,
        .kds-zoom-control {
            height: 40px;
            border: 1px solid var(--pmd-kds-line-strong);
            border-radius: 11px;
            background: #fff;
            color: var(--pmd-kds-ink);
            box-shadow: none;
        }

        .station-selector {
            min-width: 158px;
            max-width: 220px;
            padding: 0 34px 0 12px;
            cursor: pointer;
        }

        .kds-icon-btn,
        .kds-settings-btn {
            width: 40px;
            min-width: 40px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            cursor: pointer;
            text-decoration: none;
        }

        .kds-icon-btn:hover,
        .kds-settings-btn:hover,
        .station-selector:hover,
        .kds-zoom-control button:hover {
            border-color: #aac5bc;
            background: #f8fbfa;
        }

        .kds-icon-btn svg,
        .kds-settings-btn svg {
            width: 18px;
            height: 18px;
            fill: none;
            stroke: currentColor;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .kds-icon-btn.is-muted {
            color: #7d3630;
            background: var(--pmd-kds-danger-soft);
            border-color: #efc7c3;
        }

        .kds-zoom-control {
            display: inline-grid;
            grid-template-columns: 38px 54px 38px;
            overflow: hidden;
        }

        .kds-zoom-control button {
            width: 38px;
            height: 38px;
            padding: 0;
            border: 0;
            background: #fff;
            color: var(--pmd-kds-ink);
            cursor: pointer;
            font-size: 20px;
            line-height: 1;
        }

        .kds-zoom-control button:first-child { border-right: 1px solid var(--pmd-kds-line); }
        .kds-zoom-control button:last-child { border-left: 1px solid var(--pmd-kds-line); }

        .kds-zoom-label {
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--pmd-kds-muted);
            font-size: 12px;
            font-weight: 800;
            font-variant-numeric: tabular-nums;
            user-select: none;
        }

        .kds-clock {
            min-width: 118px;
            color: var(--pmd-kds-ink);
            font-size: 25px;
            font-weight: 850;
            text-align: center;
            font-variant-numeric: tabular-nums;
            letter-spacing: -.025em;
        }

        .loading-indicator {
            width: 24px;
            height: 24px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--pmd-kds-muted);
            opacity: 0;
            pointer-events: none;
        }

        .loading-indicator.active { opacity: 1; }
        .loading-indicator.active span { animation: pmd-kds-spin-v1 .75s linear infinite; }
        @keyframes pmd-kds-spin-v1 { to { transform: rotate(360deg); } }

        .orders-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--pmd-kds-card-min)), 1fr));
            grid-auto-flow: row;
            grid-auto-rows: 4px;
            column-gap: var(--pmd-kds-gap);
            row-gap: 0;
            align-items: start;
            width: 100%;
            padding: 0;
        }

        .order-card {
            min-width: 0;
            align-self: start;
            grid-row-end: span var(--pmd-kds-masonry-span, 1);
            padding: var(--pmd-kds-card-pad);
            border: 1px solid var(--pmd-kds-line);
            border-left: 4px solid var(--pmd-kds-brand);
            border-radius: var(--pmd-kds-radius);
            background: var(--pmd-kds-surface);
            box-shadow: 0 10px 28px rgba(16,35,30,.055);
            contain: layout style;
        }

        /* V1.2: card edge communicates workflow state, never elapsed age. */
        .order-card.status-received,
        .order-card.status-new { border-left-color: #94a3b8; }
        .order-card.status-preparing,
        .order-card.status-preparation { border-left-color: var(--pmd-kds-warning-line); }
        .order-card.status-ready,
        .order-card.status-delivery { border-left-color: var(--pmd-kds-brand); }
        .order-card.status-unknown { border-left-color: #b6c2be; }

        .order-card.is-kds-updating-v1 {
            box-shadow: 0 0 0 2px rgba(8,116,92,.10), 0 10px 28px rgba(16,35,30,.055);
        }

        .order-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            padding: 0 0 14px;
            margin: 0 0 14px;
            border-bottom: 1px solid var(--pmd-kds-line);
        }

        .order-number {
            color: var(--pmd-kds-ink);
            font-size: var(--pmd-kds-title-size);
            line-height: .95;
            font-weight: 900;
            letter-spacing: -.055em;
            font-variant-numeric: tabular-nums;
        }

        .order-table {
            margin-top: 5px;
            color: var(--pmd-kds-brand-dark);
            font-size: calc(var(--pmd-kds-item-size) * .9);
            line-height: 1.15;
            font-weight: 820;
        }

        .order-time {
            flex: 0 0 auto;
            min-width: 106px;
            text-align: right;
        }

        .order-time-label {
            display: block;
            margin-bottom: 4px;
            color: var(--pmd-kds-muted);
            font-size: 12px;
            line-height: 1.1;
            font-weight: 750;
        }

        .order-elapsed {
            display: block;
            min-width: 106px;
            color: #44524e;
            font-size: calc(var(--pmd-kds-title-size) * .72);
            line-height: 1;
            font-weight: 900;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }

        .order-elapsed.is-warning { color: var(--pmd-kds-warning); }
        .order-elapsed.is-late { color: var(--pmd-kds-danger); }

        .order-items {
            display: grid;
            gap: 10px;
            margin: 0;
        }

        .order-item {
            min-width: 0;
            padding: var(--pmd-kds-item-pad);
            border: 1px solid var(--pmd-kds-line);
            border-left: 3px solid #aebdb8;
            border-radius: 13px;
            background: var(--pmd-kds-surface-soft);
        }

        .item-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .item-name {
            min-width: 0;
            color: var(--pmd-kds-ink);
            font-size: var(--pmd-kds-item-size);
            line-height: 1.18;
            font-weight: 850;
            overflow-wrap: anywhere;
        }

        .item-quantity {
            min-width: 52px;
            height: 44px;
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 12px;
            border: 1px solid #cfe3dc;
            border-radius: 11px;
            background: var(--pmd-kds-brand-soft);
            color: var(--pmd-kds-brand-dark);
            font-size: var(--pmd-kds-qty-size);
            line-height: 1;
            font-weight: 900;
            font-variant-numeric: tabular-nums;
        }

        .item-modifiers {
            display: grid;
            gap: 5px;
            margin-top: 9px;
            padding: 9px 0 0;
            border-top: 1px dashed #d8e1de;
        }

        .item-modifier {
            display: flex;
            align-items: baseline;
            gap: 7px;
            color: #52615c;
            font-size: 13px;
            line-height: 1.35;
            font-weight: 650;
        }

        .modifier-dot {
            width: 5px;
            height: 5px;
            flex: 0 0 5px;
            border-radius: 999px;
            background: #9aaaa4;
            transform: translateY(-1px);
        }

        .modifier-category { color: #7b8984; font-size: 12px; font-weight: 600; }

        .item-comment {
            display: block;
            margin-top: 9px;
            padding: 9px 11px;
            border: 1px solid #ecd7a9;
            border-left: 3px solid #d99a37;
            border-radius: 10px;
            background: #fffaf0;
            color: #6f4314;
            font-size: 13px;
            line-height: 1.4;
            font-weight: 680;
            font-style: normal;
            overflow-wrap: anywhere;
        }

        .item-comment::before {
            content: "Note";
            display: inline-block;
            margin-right: 8px;
            color: #8a5418;
            font-size: 10px;
            line-height: 1;
            font-weight: 900;
            letter-spacing: .08em;
            text-transform: uppercase;
        }

        .order-notes {
            margin-top: 12px;
            padding: 11px 12px;
            border: 1px solid var(--pmd-kds-line);
            border-radius: 11px;
            background: #fbfcfc;
        }

        .order-notes-title {
            margin-bottom: 5px;
            color: var(--pmd-kds-muted);
            font-size: 10px;
            line-height: 1;
            font-weight: 900;
            letter-spacing: .08em;
            text-transform: uppercase;
        }

        .order-note {
            color: #41504b;
            font-size: 13px;
            line-height: 1.4;
            font-weight: 650;
            overflow-wrap: anywhere;
        }

        .order-note + .order-note { margin-top: 5px; }

        .order-status-buttons {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
            min-height: 46px;
            margin-top: 14px;
        }

        .status-btn {
            width: 100%;
            min-width: 0;
            height: 46px;
            padding: 0 12px;
            border-radius: 11px;
            border: 1px solid var(--pmd-kds-line-strong);
            background: #fff;
            color: var(--pmd-kds-ink);
            font-size: 14px;
            line-height: 1;
            font-weight: 850;
            cursor: pointer;
            box-shadow: none;
            transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
        }

        .status-btn.status-preparing,
        .status-btn.status-preparation {
            border-color: var(--pmd-kds-warning-line);
            background: var(--pmd-kds-warning-soft);
            color: #8a480f;
        }

        .status-btn.status-ready,
        .status-btn.status-delivery {
            border-color: #add9c8;
            background: var(--pmd-kds-brand-soft);
            color: var(--pmd-kds-brand-dark);
        }

        .status-btn:not(:disabled):hover { filter: brightness(.985); }

        .status-btn.is-current {
            box-shadow: inset 0 0 0 2px currentColor;
            cursor: default;
        }

        .status-btn:disabled {
            opacity: 1;
            pointer-events: none;
        }

        .order-card.is-kds-updating-v1 .status-btn { cursor: wait; pointer-events: none; }

        .kds-icon-btn.is-audio-locked {
            border-color: var(--pmd-kds-warning-line);
            background: var(--pmd-kds-warning-soft);
            color: #8a480f;
        }

        .kds-undo-toast {
            position: fixed;
            left: 50%;
            bottom: 18px;
            z-index: 80;
            max-width: calc(100vw - 24px);
            min-height: 48px;
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 8px 9px 8px 16px;
            border: 1px solid #cbd8d4;
            border-radius: 14px;
            background: rgba(16,35,30,.96);
            color: #fff;
            box-shadow: 0 18px 44px rgba(16,35,30,.20);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transform: translate(-50%, 10px);
            transition: opacity 140ms ease, transform 140ms ease, visibility 140ms linear;
        }

        .kds-undo-toast.is-visible {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
            transform: translate(-50%, 0);
        }

        .kds-undo-message {
            min-width: 0;
            font-size: 13px;
            line-height: 1.25;
            font-weight: 720;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .kds-undo-action {
            height: 34px;
            flex: 0 0 auto;
            padding: 0 12px;
            border: 1px solid rgba(255,255,255,.28);
            border-radius: 9px;
            background: #fff;
            color: var(--pmd-kds-brand-dark);
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
        }

        .empty-state {
            grid-column: 1 / -1;
            grid-row-end: span 82;
            min-height: 320px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 48px 20px;
            border: 1px dashed var(--pmd-kds-line-strong);
            border-radius: 18px;
            background: rgba(255,255,255,.55);
        }

        .empty-state-mark {
            width: 46px;
            height: 46px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 14px;
            border-radius: 999px;
            background: var(--pmd-kds-brand-soft);
            color: var(--pmd-kds-brand-dark);
            font-size: 24px;
            font-weight: 900;
        }

        .empty-state h2 { margin: 0; font-size: 24px; color: var(--pmd-kds-ink); }
        .empty-state p { margin: 7px 0 0; color: var(--pmd-kds-muted); font-size: 14px; }

        html.pmd-kds-embedded-v1 .kds-header { display: none; }
        html.pmd-kds-embedded-v1 .kds-container { padding-top: 0; }

        @media (max-width: 1050px) {
            .kds-header { align-items: flex-start; }
            .kds-header-left { gap: 14px; flex-wrap: wrap; }
            .kds-header-right { flex-wrap: wrap; justify-content: flex-end; }
            .kds-clock { min-width: 104px; font-size: 22px; }
        }

        @media (max-width: 760px) {
            .kds-container { padding: 10px; }
            .kds-header { flex-direction: column; padding: 12px; border-radius: 14px; }
            .kds-header-left, .kds-header-right { width: 100%; }
            .kds-header-right { margin-left: 0; justify-content: flex-start; }
            .kds-station-name { font-size: 20px; }
            .station-selector { flex: 1 1 150px; max-width: none; }
            .kds-clock { margin-left: auto; }
            .order-time { min-width: 90px; }
            .order-elapsed { min-width: 90px; }
        }

        @media (max-width: 480px) {
            .kds-stat { display: none; }
            .kds-clock { display: none; }
            .kds-zoom-control { grid-template-columns: 34px 48px 34px; }
            .kds-zoom-control button { width: 34px; }
            .order-status-buttons { gap: 7px; }
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
        }
    </style>
</head>
<body data-pmd-kds-display="v1">
<div class="kds-container">
    <header class="kds-header">
        <div class="kds-header-left">
            <div class="kds-station-name">
                <span class="kds-station-mark" aria-hidden="true"></span>
                <span>{{ isset($station) && $station ? $station->name : 'Kitchen Display' }}</span>
            </div>
            <div class="kds-stat">
                <span>Orders</span>
                <span class="kds-stat-value" id="order-count">{{ count($orders) }}</span>
            </div>
        </div>

        <div class="kds-header-right">
            @if(isset($allStations) && count($allStations) > 0)
                <select class="station-selector" id="station-selector" aria-label="KDS station" onchange="changeStation(this.value)">
                    <option value="">All stations</option>
                    @foreach($allStations as $s)
                        <option value="{{ $s->slug }}" {{ (isset($station) && $station && $station->slug === $s->slug) ? 'selected' : '' }}>{{ $s->name }}</option>
                    @endforeach
                </select>
            @endif

            <div class="kds-zoom-control" aria-label="Card size">
                <button type="button" id="kds-zoom-out" title="Zoom out / show more cards" aria-label="Zoom out">−</button>
                <span class="kds-zoom-label" id="kds-zoom-label">100%</span>
                <button type="button" id="kds-zoom-in" title="Zoom in / show fewer larger cards" aria-label="Zoom in">+</button>
            </div>

            <span class="loading-indicator" id="loading-indicator" aria-hidden="true"><span>↻</span></span>

            <button type="button" class="kds-icon-btn" id="mute-btn" onclick="toggleMute()" title="Toggle sound notifications" aria-label="Toggle sound notifications">
                <svg id="mute-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"></path><path data-pmd-sound-wave d="M15 9a4 4 0 0 1 0 6"></path><path data-pmd-sound-wave d="M18 6a8 8 0 0 1 0 12"></path></svg>
            </button>

            <div class="kds-clock" id="clock">--:--:--</div>

            <a href="{{ admin_url('pmddevices') }}#kds" class="kds-settings-btn" title="Manage KDS stations" aria-label="Manage KDS stations">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3.1h5l.4-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z"></path></svg>
            </a>
        </div>
    </header>

    <main class="orders-grid" id="orders-grid" aria-live="polite">
        @if(count($orders) === 0)
            <div class="empty-state">
                <div class="empty-state-mark">✓</div>
                <h2>All caught up</h2>
                <p>No active orders {{ isset($station) && $station ? 'for '.$station->name : 'in the kitchen' }}</p>
            </div>
        @else
            @foreach($orders as $order)
                @php
                    $elapsedMinutes = $order['created_at']->diffInMinutes(now());
                    $timerClass = $elapsedMinutes > 15 ? 'is-late' : ($elapsedMinutes > 5 ? 'is-warning' : '');
                    $rawStatusName = strtolower(trim((string)($order['status_name'] ?? '')));
                    $workflowClass = str_contains($rawStatusName, 'preparation') || str_contains($rawStatusName, 'preparing')
                        ? 'status-preparing'
                        : (str_contains($rawStatusName, 'delivery') || str_contains($rawStatusName, 'ready')
                            ? 'status-ready'
                            : (str_contains($rawStatusName, 'received') ? 'status-received' : 'status-unknown'));
                @endphp
                <article class="order-card {{ $workflowClass }}" data-order-id="{{ $order['order_id'] }}" data-status-id="{{ (int)$order['status_id'] }}" data-status-name="{{ $order['status_name'] }}">
                    <div class="order-header">
                        <div>
                            <div class="order-number">#{{ $order['order_id'] }}</div>
                            <div class="order-table">{{ $order['order_type_name'] }}</div>
                        </div>
                        <div class="order-time">
                            <span class="order-time-label">Time elapsed</span>
                            <span class="order-elapsed {{ $timerClass }}" data-created="{{ $order['created_at']->timestamp }}">{{ $order['elapsed_time'] }}</span>
                        </div>
                    </div>

                    <div class="order-items">
                        @foreach($order['items'] as $item)
                            <section class="order-item">
                                <div class="item-header">
                                    <div class="item-name">{{ $item['name'] }}</div>
                                    <div class="item-quantity">{{ $item['quantity'] }}×</div>
                                </div>

                                @if(count($item['modifiers']) > 0)
                                    <div class="item-modifiers">
                                        @foreach($item['modifiers'] as $modifier)
                                            <div class="item-modifier">
                                                <span class="modifier-dot" aria-hidden="true"></span>
                                                @if($modifier['quantity'] > 1)<strong>{{ $modifier['quantity'] }}×</strong>@endif
                                                <span>{{ $modifier['name'] }}</span>
                                                @if($modifier['category'])<span class="modifier-category">({{ $modifier['category'] }})</span>@endif
                                            </div>
                                        @endforeach
                                    </div>
                                @endif

                                @if(!empty($item['comment']))
                                    <div class="item-comment">{{ $item['comment'] }}</div>
                                @endif
                            </section>
                        @endforeach
                    </div>

                    @if(count($order['notes']) > 0)
                        <div class="order-notes">
                            <div class="order-notes-title">Order note</div>
                            @foreach($order['notes'] as $note)
                                <div class="order-note">{{ $note['note'] }}</div>
                            @endforeach
                        </div>
                    @endif

                    @if($canChangeStatus ?? true)
                        <div class="order-status-buttons">
                            @foreach($statuses as $status)
                                @php
                                    $statusName = (string)$status['status_name'];
                                    $statusClass = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $statusName));
                                    $isCurrentStatus = (int)$status['status_id'] === (int)$order['status_id'];
                                @endphp
                                <button
                                    type="button"
                                    class="status-btn status-{{ trim($statusClass, '-') }} {{ $isCurrentStatus ? 'is-current' : '' }}"
                                    data-kds-status-button
                                    data-order-id="{{ $order['order_id'] }}"
                                    data-status-id="{{ $status['status_id'] }}"
                                    data-status-name="{{ $statusName }}"
                                    @if($isCurrentStatus) disabled aria-current="true" @endif>{{ $statusName }}</button>
                            @endforeach
                        </div>
                    @endif
                </article>
            @endforeach
        @endif
    </main>
</div>

<div class="kds-undo-toast" id="kds-undo-toast" role="status" aria-live="polite" aria-atomic="true">
    <span class="kds-undo-message" id="kds-undo-message"></span>
    <button type="button" class="kds-undo-action" id="kds-undo-action">Undo</button>
</div>

<script id="pmd-kds-display-v1-script">
(function () {
    'use strict';

    const currentStationSlug = @json(isset($station) && $station ? (string)$station->slug : '');
    const currentStationName = @json(isset($station) && $station ? (string)$station->name : '');
    const canChangeStatus = {{ ($canChangeStatus ?? true) ? 'true' : 'false' }};
    const stationSoundEnabled = {{ ($soundEnabled ?? true) ? 'true' : 'false' }};
    const operationalLookbackHours = {{ (int)($operationalLookbackHours ?? 36) }};
    const configuredOrderLimit = {{ (int)($orderLimit ?? 50) }};
    const refreshInterval = Math.max(1000, {{ (int)($refreshInterval ?? 5) }} * 1000);
    const selectedSound = @json((string)($kdsNotificationSound ?? 'doorbell'));
    const statuses = @json($statuses);

    let refreshInFlightV1 = false;
    let initialRefreshHydrationPendingV1 = true;
    const statusUpdatesInFlightV1 = new Set();
    let previousOrderIds = new Set([@foreach($orders as $order){{ (int)$order['order_id'] }}{{ !$loop->last ? ',' : '' }}@endforeach]);

    let audioContext = null;
    let audioUnlockedV12 = false;
    let pendingNewOrderSoundV12 = false;
    let undoStateV12 = null;
    let undoExpiryTimerV12 = null;
    const undoWindowMsV12 = 12000;
    let isMuted = (function () {
        try {
            const stored = localStorage.getItem('kds-muted');
            return stored === null ? !stationSoundEnabled : stored === 'true';
        } catch (e) {
            return !stationSoundEnabled;
        }
    })();

    const zoomLevels = [80, 90, 100, 110, 120];
    const masonryRowUnitV11 = 4;

    function layoutMasonryV11() {
        const grid = document.getElementById('orders-grid');
        if (!grid || grid.querySelector('.empty-state')) return;

        const cards = Array.from(grid.querySelectorAll('.order-card[data-order-id]'));
        if (!cards.length) return;

        const styles = getComputedStyle(grid);
        const rowUnit = Math.max(1, parseFloat(styles.gridAutoRows) || masonryRowUnitV11);
        const visualGap = Math.max(0, parseFloat(styles.columnGap) || 0);

        // Reset spans first so every ticket is measured at its true content height.
        cards.forEach(card => {
            card.style.removeProperty('--pmd-kds-masonry-span');
            card.style.gridRowEnd = 'span 1';
        });

        // One synchronous layout read, then only style writes. No timer/observer repair loop.
        const spans = cards.map(card => Math.max(1, Math.ceil((card.getBoundingClientRect().height + visualGap) / rowUnit)));
        cards.forEach((card, index) => {
            card.style.setProperty('--pmd-kds-masonry-span', String(spans[index]));
            card.style.gridRowEnd = `span ${spans[index]}`;
        });
    }

    function currentZoomV1() {
        const raw = Number(document.documentElement.getAttribute('data-kds-zoom') || 100);
        return zoomLevels.includes(raw) ? raw : 100;
    }

    function applyZoomV1(value, persist) {
        const next = zoomLevels.includes(Number(value)) ? Number(value) : 100;
        document.documentElement.setAttribute('data-kds-zoom', String(next));
        const label = document.getElementById('kds-zoom-label');
        if (label) label.textContent = next + '%';
        if (persist) {
            try { localStorage.setItem('pmd-kds-card-zoom-v1', String(next)); } catch (e) {}
        }
        layoutMasonryV11();
    }

    function stepZoomV1(direction) {
        const current = currentZoomV1();
        const index = Math.max(0, zoomLevels.indexOf(current));
        const nextIndex = Math.max(0, Math.min(zoomLevels.length - 1, index + direction));
        applyZoomV1(zoomLevels[nextIndex], true);
    }

    function updateClockV1() {
        const node = document.getElementById('clock');
        if (!node) return;
        const now = new Date();
        node.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
            .map(value => String(value).padStart(2, '0'))
            .join(':');
    }

    function updateElapsedTimesV1() {
        const now = Math.floor(Date.now() / 1000);
        document.querySelectorAll('.order-elapsed[data-created]').forEach(node => {
            const created = Number(node.dataset.created || 0);
            if (!Number.isFinite(created) || created < 1) return;
            const elapsed = Math.max(0, now - created);
            const hours = Math.floor(elapsed / 3600);
            const minutes = Math.floor((elapsed % 3600) / 60);
            const seconds = elapsed % 60;
            node.textContent = hours > 0
                ? `${hours}h ${minutes}m`
                : (minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);

            const totalMinutes = Math.floor(elapsed / 60);
            node.classList.toggle('is-late', totalMinutes > 15);
            node.classList.toggle('is-warning', totalMinutes > 5 && totalMinutes <= 15);
        });
    }

    async function ensureAudioContextV1() {
        try {
            if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                try { await audioContext.resume(); } catch (e) {}
            }
            audioUnlockedV12 = !!audioContext && audioContext.state === 'running';
            updateMuteButtonV1();
            return audioContext;
        } catch (e) {
            audioUnlockedV12 = false;
            updateMuteButtonV1();
            return null;
        }
    }

    function playToneV1(freq, startTime, duration, type, volume) {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = type || 'sine';
        oscillator.frequency.value = freq;
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume == null ? .35 : volume, startTime + .01);
        gain.gain.exponentialRampToValueAtTime(.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    const soundLibraryV1 = {
        doorbell(now) { playToneV1(800, now, .2); playToneV1(600, now + .15, .3); },
        chime(now) { playToneV1(523.25, now, .3); playToneV1(659.25, now + .2, .3); playToneV1(783.99, now + .4, .4); },
        bell(now) { playToneV1(880, now, .35, 'sine', .5); playToneV1(1320, now + .1, .25, 'sine', .3); },
        alert(now) { playToneV1(800, now, .1); playToneV1(800, now + .15, .1); },
        notification(now) { playToneV1(800, now, .15); playToneV1(1000, now + .1, .2); },
        ding(now) { playToneV1(800, now, .3); },
        'double-beep'(now) { playToneV1(600, now, .1); playToneV1(600, now + .2, .1); },
        'triple-beep'(now) { playToneV1(600, now, .1); playToneV1(600, now + .15, .1); playToneV1(600, now + .3, .1); },
        pop(now) { playToneV1(400, now, .05, 'square', .25); },
        success(now) { playToneV1(523.25, now, .15); playToneV1(659.25, now + .15, .15); playToneV1(783.99, now + .3, .2); },
        warning(now) { playToneV1(783.99, now, .15); playToneV1(659.25, now + .15, .15); playToneV1(523.25, now + .3, .2); }
    };

    async function playNotificationSoundV1() {
        if (isMuted) return false;
        const context = await ensureAudioContextV1();
        if (!context || context.state !== 'running') {
            pendingNewOrderSoundV12 = true;
            updateMuteButtonV1();
            return false;
        }
        const sound = soundLibraryV1[selectedSound] || soundLibraryV1.doorbell;
        try {
            sound(context.currentTime);
            pendingNewOrderSoundV12 = false;
            return true;
        } catch (e) {
            pendingNewOrderSoundV12 = true;
            return false;
        }
    }

    async function unlockAudioFromGestureV12(playPending) {
        if (isMuted) return false;
        const context = await ensureAudioContextV1();
        if (!context || context.state !== 'running') return false;
        audioUnlockedV12 = true;
        updateMuteButtonV1();
        if (playPending && pendingNewOrderSoundV12) await playNotificationSoundV1();
        return true;
    }

    window.toggleMute = async function toggleMute() {
        // If browser autoplay is still locked, the sound button first arms audio
        // instead of unexpectedly muting an already-enabled KDS.
        if (!audioUnlockedV12) {
            isMuted = false;
            try { localStorage.setItem('kds-muted', 'false'); } catch (e) {}
            const armed = await unlockAudioFromGestureV12(false);
            if (armed) await playNotificationSoundV1();
            updateMuteButtonV1();
            return;
        }

        isMuted = !isMuted;
        try { localStorage.setItem('kds-muted', String(isMuted)); } catch (e) {}
        updateMuteButtonV1();
        if (!isMuted) await playNotificationSoundV1();
    };

    function updateMuteButtonV1() {
        const button = document.getElementById('mute-btn');
        const icon = document.getElementById('mute-icon');
        if (!button || !icon) return;
        button.classList.toggle('is-muted', isMuted);
        button.classList.toggle('is-audio-locked', !isMuted && !audioUnlockedV12);
        button.title = isMuted
            ? 'Sound off - click to enable'
            : (!audioUnlockedV12 ? 'Enable kitchen sound' : 'Sound on - click to mute');
        button.setAttribute('aria-label', button.title);
        icon.querySelectorAll('[data-pmd-sound-wave]').forEach(path => {
            path.style.display = isMuted ? 'none' : '';
        });
    }

    window.changeStation = function changeStation(slug) {
        const base = @json(admin_url('kitchendisplay'));
        window.location.href = slug ? base + '/' + encodeURIComponent(slug) : base;
    };

    function escapeHtmlV1(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        })[char]);
    }

    function parseDateToTimestampV1(value) {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        const parsed = Date.parse(String(value || ''));
        return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : Math.floor(Date.now() / 1000);
    }

    function getWorkflowClassV12(statusName) {
        const raw = String(statusName || '').toLowerCase();
        if (raw.includes('preparation') || raw.includes('preparing')) return 'status-preparing';
        if (raw.includes('delivery') || raw.includes('ready')) return 'status-ready';
        if (raw.includes('received')) return 'status-received';
        return 'status-unknown';
    }

    function getTimerClassV12(createdAt) {
        const minutes = Math.floor(Math.max(0, Math.floor(Date.now() / 1000) - parseDateToTimestampV1(createdAt)) / 60);
        if (minutes > 15) return 'is-late';
        if (minutes > 5) return 'is-warning';
        return '';
    }

    function formatElapsedV1(createdAt) {
        const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - parseDateToTimestampV1(createdAt));
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        return hours > 0 ? `${hours}h ${minutes}m` : (minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);
    }

    function renderSignatureV1(order) {
        return JSON.stringify({
            table: order.order_type_name || '',
            status: Number(order.status_id || 0),
            items: Array.isArray(order.items) ? order.items : [],
            notes: Array.isArray(order.notes) ? order.notes : []
        });
    }

    function statusButtonHtmlV1(status, order) {
        const statusId = Number(status.status_id || 0);
        const rawName = String(status.status_name || '');
        const className = 'status-' + rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const current = statusId === Number(order.status_id || 0);
        return `<button type="button"
            class="status-btn ${className}${current ? ' is-current' : ''}"
            data-kds-status-button
            data-order-id="${Number(order.order_id || 0)}"
            data-status-id="${statusId}"
            data-status-name="${escapeHtmlV1(rawName)}"
            ${current ? 'disabled aria-current="true"' : ''}>${escapeHtmlV1(rawName)}</button>`;
    }

    function renderOrderCardV1(order) {
        const created = parseDateToTimestampV1(order.created_at);
        const itemsHtml = (Array.isArray(order.items) ? order.items : []).map(item => {
            const modifiers = (Array.isArray(item.modifiers) ? item.modifiers : []).map(modifier => {
                const qty = Math.max(0, Number(modifier.quantity || 0));
                return `<div class="item-modifier"><span class="modifier-dot" aria-hidden="true"></span>${qty > 1 ? `<strong>${qty}×</strong>` : ''}<span>${escapeHtmlV1(modifier.name)}</span>${modifier.category ? `<span class="modifier-category">(${escapeHtmlV1(modifier.category)})</span>` : ''}</div>`;
            }).join('');
            const comment = item.comment ? `<div class="item-comment">${escapeHtmlV1(item.comment)}</div>` : '';
            return `<section class="order-item"><div class="item-header"><div class="item-name">${escapeHtmlV1(item.name)}</div><div class="item-quantity">${Math.max(0, Number(item.quantity || 0))}×</div></div>${modifiers ? `<div class="item-modifiers">${modifiers}</div>` : ''}${comment}</section>`;
        }).join('');

        const notes = (Array.isArray(order.notes) ? order.notes : []).map(note => `<div class="order-note">${escapeHtmlV1(note.note)}</div>`).join('');
        const buttons = canChangeStatus && Array.isArray(statuses) ? statuses.map(status => statusButtonHtmlV1(status, order)).join('') : '';

        return `<article class="order-card ${getWorkflowClassV12(order.status_name)}" data-order-id="${Number(order.order_id || 0)}" data-status-id="${Number(order.status_id || 0)}" data-status-name="${escapeHtmlV1(order.status_name || '')}">
            <div class="order-header"><div><div class="order-number">#${Number(order.order_id || 0)}</div><div class="order-table">${escapeHtmlV1(order.order_type_name)}</div></div><div class="order-time"><span class="order-time-label">Time elapsed</span><span class="order-elapsed ${getTimerClassV12(order.created_at)}" data-created="${created}">${formatElapsedV1(created)}</span></div></div>
            <div class="order-items">${itemsHtml}</div>
            ${notes ? `<div class="order-notes"><div class="order-notes-title">Order note</div>${notes}</div>` : ''}
            ${buttons ? `<div class="order-status-buttons">${buttons}</div>` : ''}
        </article>`;
    }

    function emptyStateHtmlV1() {
        const suffix = currentStationName ? 'for ' + currentStationName : 'in the kitchen';
        return `<div class="empty-state"><div class="empty-state-mark">✓</div><h2>All caught up</h2><p>No active orders ${escapeHtmlV1(suffix)}</p></div>`;
    }

    function updateOrdersDisplayV1(orders) {
        const grid = document.getElementById('orders-grid');
        const count = document.getElementById('order-count');
        if (!grid) return;
        if (count) count.textContent = String(orders.length);

        if (!orders.length) {
            if (grid.querySelector('.order-card') || !grid.querySelector('.empty-state')) grid.innerHTML = emptyStateHtmlV1();
            initialRefreshHydrationPendingV1 = false;
            return;
        }

        const empty = grid.querySelector('.empty-state');
        if (empty) empty.remove();

        const existing = new Map();
        grid.querySelectorAll('.order-card[data-order-id]').forEach(card => existing.set(String(card.dataset.orderId || ''), card));
        const wanted = new Set(orders.map(order => String(Number(order.order_id || 0))));
        existing.forEach((card, id) => { if (!wanted.has(id)) card.remove(); });

        let previousCard = null;

        orders.forEach(order => {
            const id = String(Number(order.order_id || 0));
            const signature = renderSignatureV1(order);
            let card = existing.get(id) || null;

            if (card && initialRefreshHydrationPendingV1 && !card.dataset.renderSignatureV1) {
                card.dataset.renderSignatureV1 = signature;
            } else if (!card || card.dataset.renderSignatureV1 !== signature) {
                const template = document.createElement('template');
                template.innerHTML = renderOrderCardV1(order).trim();
                const next = template.content.firstElementChild;
                next.dataset.renderSignatureV1 = signature;
                if (card && card.isConnected) card.replaceWith(next);
                card = next;
            }

            if (!previousCard) {
                const firstCard = grid.querySelector('.order-card');
                if (firstCard !== card) grid.insertBefore(card, firstCard || grid.firstChild);
            } else if (previousCard.nextElementSibling !== card) {
                grid.insertBefore(card, previousCard.nextElementSibling);
            }
            previousCard = card;
        });

        initialRefreshHydrationPendingV1 = false;
        updateElapsedTimesV1();
        layoutMasonryV11();
    }

    async function refreshOrdersV1(suppressNewOrderSound) {
        if (refreshInFlightV1) return;
        refreshInFlightV1 = true;
        const indicator = document.getElementById('loading-indicator');
        if (indicator) indicator.classList.add('active');

        try {
            const formData = new URLSearchParams();
            formData.append('_handler', 'onRefresh');
            if (currentStationSlug) formData.append('station_slug', currentStationSlug);

            const response = await fetch(@json(admin_url('kitchendisplay/index')), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': @json(csrf_token())
                },
                body: formData.toString()
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!data || data.success === false || !Array.isArray(data.orders)) throw new Error(data && data.error ? data.error : 'Invalid KDS refresh response');

            const currentIds = new Set(data.orders.map(order => Number(order.order_id || 0)));
            let hasNewOrder = false;
            currentIds.forEach(id => { if (!previousOrderIds.has(id)) hasNewOrder = true; });
            previousOrderIds = currentIds;

            updateOrdersDisplayV1(data.orders);
            if (hasNewOrder && !suppressNewOrderSound) playNotificationSoundV1().catch(() => {});
        } catch (error) {
            console.error('KDS refresh failed:', error);
        } finally {
            refreshInFlightV1 = false;
            if (indicator) indicator.classList.remove('active');
        }
    }

    function hideUndoV12() {
        const toast = document.getElementById('kds-undo-toast');
        if (undoExpiryTimerV12) {
            window.clearTimeout(undoExpiryTimerV12);
            undoExpiryTimerV12 = null;
        }
        undoStateV12 = null;
        if (toast) toast.classList.remove('is-visible');
    }

    function showUndoV12(state) {
        const toast = document.getElementById('kds-undo-toast');
        const message = document.getElementById('kds-undo-message');
        if (!toast || !message || !state) return;
        if (undoExpiryTimerV12) window.clearTimeout(undoExpiryTimerV12);
        undoStateV12 = state;
        message.textContent = `Order #${state.orderId} marked ${state.nextStatusName}`;
        toast.classList.add('is-visible');
        undoExpiryTimerV12 = window.setTimeout(hideUndoV12, undoWindowMsV12);
    }

    async function performStatusUpdateV12(orderId, statusId, statusName, options) {
        options = options || {};
        orderId = Number(orderId);
        statusId = Number(statusId);
        const expectedStatusId = Number(options.expectedStatusId || 0);
        if (!orderId || !statusId || statusUpdatesInFlightV1.has(orderId)) return null;

        const card = document.querySelector(`.order-card[data-order-id="${orderId}"]`);
        statusUpdatesInFlightV1.add(orderId);
        if (card) card.classList.add('is-kds-updating-v1');

        try {
            const formData = new URLSearchParams();
            formData.append('_handler', 'onUpdateStatus');
            formData.append('order_id', String(orderId));
            formData.append('status_id', String(statusId));
            formData.append('station_slug', currentStationSlug);
            if (expectedStatusId > 0) formData.append('expected_status_id', String(expectedStatusId));

            const response = await fetch(@json(admin_url('kitchendisplay/index')), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': @json(csrf_token())
                },
                body: formData.toString()
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || !data || data.success === false) throw new Error(data && data.error ? data.error : `HTTP ${response.status}`);
            return data;
        } finally {
            statusUpdatesInFlightV1.delete(orderId);
            if (card && card.isConnected) card.classList.remove('is-kds-updating-v1');
        }
    }

    async function updateOrderStatusV1(orderId, statusId, statusName) {
        orderId = Number(orderId);
        statusId = Number(statusId);
        if (!orderId || !statusId || statusUpdatesInFlightV1.has(orderId)) return;

        const card = document.querySelector(`.order-card[data-order-id="${orderId}"]`);
        const currentStatusId = card ? Number(card.dataset.statusId || 0) : 0;
        const currentStatusName = card ? String(card.dataset.statusName || '') : '';

        try {
            const data = await performStatusUpdateV12(orderId, statusId, statusName, {
                expectedStatusId: currentStatusId
            });
            if (!data) return;

            const previousStatusId = Number(data.previous_status_id || currentStatusId || 0);
            const previousStatusName = String(data.previous_status_name || currentStatusName || 'Previous');
            const nextStatusId = Number(data.status_id || statusId);
            const nextStatusName = String(data.display_status_name || statusName || data.status_name || 'Updated');

            showUndoV12({
                orderId,
                previousStatusId,
                previousStatusName,
                nextStatusId,
                nextStatusName
            });

            const becameReady = /ready|delivery/i.test(String(data.status_name || nextStatusName));
            if (becameReady && card && card.isConnected) {
                card.remove();
                previousOrderIds.delete(orderId);
                const count = document.getElementById('order-count');
                if (count) count.textContent = String(document.querySelectorAll('.order-card[data-order-id]').length);
                layoutMasonryV11();
            }

            // Server refresh is source-of-truth but must never ring the new-order bell
            // for our own status transition or an Undo reappearance.
            await refreshOrdersV1(true);
        } catch (error) {
            console.error('KDS status update failed:', error);
            window.alert('Failed to update status: ' + error.message);
            await refreshOrdersV1(true);
        }
    }

    async function undoLastStatusV12() {
        const state = undoStateV12;
        if (!state || !state.previousStatusId || !state.nextStatusId) return;
        hideUndoV12();

        try {
            const data = await performStatusUpdateV12(
                state.orderId,
                state.previousStatusId,
                state.previousStatusName,
                { expectedStatusId: state.nextStatusId }
            );
            if (!data) return;
            await refreshOrdersV1(true);
        } catch (error) {
            console.error('KDS undo failed:', error);
            window.alert('Undo was not applied: ' + error.message);
            await refreshOrdersV1(true);
        }
    }

    document.addEventListener('click', event => {
        if (event.target.closest('#kds-undo-action')) {
            event.preventDefault();
            undoLastStatusV12();
            return;
        }

        const statusButton = event.target.closest('[data-kds-status-button]');
        if (statusButton) {
            event.preventDefault();
            updateOrderStatusV1(
                Number(statusButton.dataset.orderId || 0),
                Number(statusButton.dataset.statusId || 0),
                String(statusButton.dataset.statusName || 'Updated')
            );
            return;
        }

        if (event.target.closest('#kds-zoom-out')) stepZoomV1(-1);
        if (event.target.closest('#kds-zoom-in')) stepZoomV1(1);
    });

    async function gestureAudioUnlockV12(event) {
        if (audioUnlockedV12 || isMuted) return;
        if (event && event.target && event.target.closest && event.target.closest('#mute-btn')) return;
        const unlocked = await unlockAudioFromGestureV12(true);
        if (unlocked) {
            document.removeEventListener('pointerdown', gestureAudioUnlockV12, true);
            document.removeEventListener('keydown', gestureAudioUnlockV12, true);
        }
    }

    document.addEventListener('pointerdown', gestureAudioUnlockV12, true);
    document.addEventListener('keydown', gestureAudioUnlockV12, true);

    applyZoomV1(currentZoomV1(), false);
    updateMuteButtonV1();
    ensureAudioContextV1().catch(() => {});
    updateClockV1();
    updateElapsedTimesV1();
    layoutMasonryV11();
    window.addEventListener('resize', layoutMasonryV11, { passive: true });

    window.setInterval(updateClockV1, 1000);
    window.setInterval(updateElapsedTimesV1, 1000);
    window.setTimeout(refreshOrdersV1, Math.max(1500, Math.min(refreshInterval, 5000)));
    window.setInterval(refreshOrdersV1, refreshInterval);

    window.PMDKdsOperationalCoreV134 = {
        version: '1.3.4',
        audit() {
            return {
                ready: true,
                operationalLookbackHours,
                configuredOrderLimit,
                overlappingRefreshBlocked: true,
                keyedRefresh: true,
                dynamicHtmlEscaped: true,
                canonicalStatusHistoryWrite: true
            };
        }
    };

    window.PMDKdsDisplayV1 = {
        version: '1.2.0',
        audit() {
            return {
                ready: true,
                singleVisualAuthority: true,
                stableStatusSlots: true,
                firstRefreshKeepsServerCards: true,
                unchangedCardsAreNotReappended: true,
                zoom: currentZoomV1(),
                zoomLevels: zoomLevels.slice(),
                zoomFirstPaintPersisted: true,
                itemNotesPreserved: true,
                itemNoteStyle: 'compact-attached',
                layoutMode: 'measured-grid-masonry',
                denseVariableHeightCards: true,
                fixedRowWhitespaceRemoved: true,
                masonryRowUnitPx: masonryRowUnitV11,
                cardGapPx: parseFloat(getComputedStyle(document.getElementById('orders-grid')).columnGap) || 0,
                domOrderPreserved: true,
                mutationObserver: false,
                resizeObserver: false,
                layoutRepairTimers: false,
                soundNewOrderQueuedUntilUnlocked: true,
                soundUnlocked: audioUnlockedV12,
                directStatusActions: true,
                readyLeavesKdsImmediately: true,
                undoWindowMs: undoWindowMsV12,
                undoAvailable: !!undoStateV12,
                cardEdgeMeaning: 'workflow-status',
                visibleWorkflow: ['Received', 'Preparing'],
                readyWorkflow: 'removed-with-undo'
            };
        },
        zoomIn() { stepZoomV1(1); },
        zoomOut() { stepZoomV1(-1); },
        setZoom(value) { applyZoomV1(Number(value), true); }
    };
})();
</script>
</body>
</html>
