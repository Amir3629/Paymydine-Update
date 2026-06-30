<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }}</title>
<!-- PMD_KDS_NO_EXTERNAL_FA_V83_START -->
    <style id="pmd-kds-no-external-fa-v83">
      .fa,.fas{font-style:normal;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;line-height:1;display:inline-block}
      .fa-tv:before{content:"▣"}.fa-utensils:before{content:"🍽"}.fa-volume-up:before{content:"🔔"}.fa-volume-mute:before{content:"🔕"}
      .fa-sync:before{content:"↻"}.fa-spin{animation:pmd-fa-spin-v83 1s linear infinite}.fa-cog:before{content:"⚙"}.fa-times:before{content:"×"}
      .fa-check-circle:before{content:"✓"}.fa-sticky-note:before{content:"▤"}.fa-circle:before{content:"•"}
      @keyframes pmd-fa-spin-v83{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    </style>
    <!-- PMD_KDS_NO_EXTERNAL_FA_V83_END -->
    <style>
        :root {
            --theme-color: {{ $themeColor ?? '#4CAF50' }};
            --theme-color-light: {{ $themeColor ?? '#4CAF50' }}33;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #ffffff;
            color: #1a1a1a;
            overflow-x: hidden;
        }

        .kds-container {
            padding: 20px;
            max-width: 100%;
        }

        .kds-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 30px;
            background: #f5f5f5;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border-left: 6px solid var(--theme-color);
        }
        
        .kds-header-left {
            display: flex;
            gap: 30px;
            align-items: center;
        }
        
        .kds-header-right {
            display: flex;
            gap: 15px;
            align-items: center;
        }

        .kds-station-name {
            font-size: 24px;
            font-weight: 700;
            color: var(--theme-color);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .kds-station-name i {
            font-size: 20px;
        }

        .kds-clock {
            font-size: 28px;
            font-weight: 600;
            color: #90CAF9;
            font-variant-numeric: tabular-nums;
        }

        .mute-btn-icon {
            background: #e0e0e0;
            color: #1a1a1a;
            border: none;
            padding: 8px;
            border-radius: 6px;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            transition: background 0.2s ease;
        }

        .mute-btn-icon:hover {
            background: #d0d0d0;
        }

        .mute-btn-icon.muted {
            background: #F44336;
        }

        .mute-btn-icon.muted:hover {
            background: #E53935;
        }

        .mute-btn-icon i {
            font-size: 18px;
        }

        .station-selector {
            background: #ffffff;
            color: #1a1a1a;
            border: 1px solid #d0d0d0;
            padding: 8px 15px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            min-width: 150px;
        }

        .station-selector:hover {
            background: #f5f5f5;
        }

        .kds-stats {
            display: flex;
            gap: 30px;
            font-size: 18px;
            color: #666666;
        }

        .kds-stat {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .kds-stat-value {
            font-size: 32px;
            font-weight: 700;
            color: #1a1a1a;
        }

        .orders-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
            gap: 25px;
            padding: 10px;
        }

        .order-card {
            background: #ffffff;
            border-radius: 16px;
            padding: 25px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
            border-left: 6px solid var(--theme-color);
            border-right: 1px solid #e0e0e0;
            border-top: 1px solid #e0e0e0;
            border-bottom: 1px solid #e0e0e0;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            position: relative;
        }

        .order-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
        }

        /* Color coding by order age */
        .order-card.age-new {
            border-left-color: #4CAF50; /* Green - fresh order */
        }

        .order-card.age-normal {
            border-left-color: #FFC107; /* Yellow - normal */
        }

        .order-card.age-late {
            border-left-color: #F44336; /* Red - late */
            animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
            0%, 100% {
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
            }
            50% {
                box-shadow: 0 8px 32px rgba(244, 67, 54, 0.4);
            }
        }

        .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e0e0e0;
        }

        .order-number {
            font-size: 42px;
            font-weight: 900;
            color: #1a1a1a;
            line-height: 1;
        }

        .order-table {
            font-size: 22px;
            color: #90CAF9;
            font-weight: 600;
        }

        .order-time {
            text-align: right;
        }

        .order-time-label {
            font-size: 14px;
            color: #666666;
            display: block;
            margin-bottom: 4px;
        }

        .order-elapsed {
            font-size: 32px;
            font-weight: 700;
            color: #FFC107;
            font-variant-numeric: tabular-nums;
        }

        .order-elapsed.late {
            color: #F44336;
            animation: pulse-text 1s ease-in-out infinite;
        }

        @keyframes pulse-text {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }

        .order-items {
            margin: 20px 0;
        }

        .order-item {
            background: #f9f9f9;
            padding: 18px;
            border-radius: 10px;
            margin-bottom: 15px;
            border-left: 3px solid var(--theme-color);
            border-right: 1px solid #e8e8e8;
            border-top: 1px solid #e8e8e8;
            border-bottom: 1px solid #e8e8e8;
        }

        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .item-name {
            font-size: 24px;
            font-weight: 700;
            color: #1a1a1a;
        }

        .item-quantity {
            font-size: 28px;
            font-weight: 900;
            color: var(--theme-color);
            background: var(--theme-color-light);
            padding: 8px 20px;
            border-radius: 8px;
            min-width: 60px;
            text-align: center;
        }

        .item-modifiers {
            margin-top: 12px;
            padding-left: 15px;
        }

        .item-modifier {
            font-size: 18px;
            color: #666666;
            margin: 6px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .modifier-icon {
            color: #FFC107;
            font-size: 14px;
        }

        .item-comment {
            margin-top: 12px;
            padding: 12px;
            background: #FFF3E0;
            color: #1a1a1a;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            font-style: italic;
            border: 1px solid #FFB74D;
        }

        .item-comment::before {
            content: '✏️ Note: ';
            font-weight: 700;
        }

        .order-notes {
            background: #E3F2FD;
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
            border-left: 3px solid #2196F3;
        }

        .order-notes-title {
            font-size: 16px;
            color: #90CAF9;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .order-note {
            font-size: 18px;
            color: #1a1a1a;
            margin: 8px 0;
        }

        .order-status-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            flex-wrap: wrap;
        }

        .status-btn {
            flex: 1;
            min-width: 120px;
            padding: 14px 20px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-transform: uppercase;
        }

        /* Cancel button should be smaller and less prominent */
        .status-btn.status-cancel,
        .status-btn.status-canceled {
            flex: 0 0 auto;
            min-width: 70px;
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 500;
            opacity: 0.75;
            border: 1px solid rgba(0, 0, 0, 0.2);
        }

        .status-btn.status-cancel:hover,
        .status-btn.status-canceled:hover {
            opacity: 1;
            transform: translateY(-1px);
        }

        .status-btn.status-cancel i,
        .status-btn.status-canceled i {
            font-size: 10px;
            margin-right: 4px;
        }

        .status-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .status-btn.status-preparing {
            background: #FFC107;
            color: #1a1a1a;
        }

        .status-btn.status-preparation {
            background: #FFC107;
            color: #1a1a1a;
        }

        .status-btn.status-cancel {
            background: #F44336;
            color: #ffffff;
            font-size: 12px;
            padding: 8px 12px;
            min-width: 80px;
            flex: 0 0 auto;
        }

        .status-btn.status-canceled {
            background: #F44336;
            color: #ffffff;
            font-size: 12px;
            padding: 8px 12px;
            min-width: 80px;
            flex: 0 0 auto;
        }

        .status-btn.status-completed {
            background: #2196F3;
            color: #ffffff;
        }

        .status-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .empty-state {
            text-align: center;
            padding: 100px 20px;
        }

        .empty-state i {
            font-size: 120px;
            color: #b0b0b0;
            margin-bottom: 30px;
        }

        .empty-state h2 {
            font-size: 36px;
            color: #666666;
            margin-bottom: 15px;
        }

        .empty-state p {
            font-size: 20px;
            color: #888888;
        }

        /* Responsive design for smaller displays */
        @media (max-width: 1200px) {
            .orders-grid {
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            }
        }

        @media (max-width: 768px) {
            .orders-grid {
                grid-template-columns: 1fr;
            }
            
            .kds-header {
                flex-direction: column;
                gap: 15px;
            }
        }

        /* Loading indicator */
        .loading-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
        }

        .loading-indicator.active {
            opacity: 1;
        }
        
        .loading-indicator i {
            font-size: 18px;
            color: #90CAF9;
        }

        /* Settings/Back button */
        .settings-btn {
            background: #ffffff;
            color: #1a1a1a;
            border: 1px solid #d0d0d0;
            padding: 8px 15px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .settings-btn:hover {
            background: #f5f5f5;
            color: #1a1a1a;
        }

    </style>

<!-- PMD_KDS_SOURCE_CLEAN_V36_CSS_START -->
<style id="pmd-kds-source-clean-v36">
  :root {
    --pmd-kds-ink: #111827;
    --pmd-kds-muted: #64748b;
    --pmd-kds-line: #dfe7ef;
    --pmd-kds-soft: #f6f8fb;
    --pmd-kds-green: #16a34a;
    --pmd-kds-green-soft: #eaf7ef;
    --pmd-kds-yellow: #f59e0b;
    --pmd-kds-yellow-soft: #fff7e6;
    --pmd-kds-red: #ef4444;
    --pmd-kds-red-soft: #fff1f1;
    --pmd-kds-blue: #2563eb;
    --pmd-kds-blue-soft: #eff6ff;
  }

  html,
  body {
    background: var(--pmd-kds-soft) !important;
    color: var(--pmd-kds-ink) !important;
    overflow-x: hidden !important;
  }

  .pmd-final-admin-logo-v20,
  .pmd-final-sidebar-logo-v20,
  .pmd-final-sidebar-logo-img-v20,
  .pmd-final-login-logo-img-v20,
  img[alt*="PayMyDine"],
  img[src*="pmd-logo-final"],
  .logo,
  .brand-logo,
  .navbar-brand {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    width: 0 !important;
    height: 0 !important;
    max-width: 0 !important;
    max-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

  .kds-container {
    padding: 18px !important;
    max-width: 100% !important;
  }

  .kds-header {
    background: rgba(255,255,255,.94) !important;
    border: 1px solid var(--pmd-kds-line) !important;
    border-left: 5px solid var(--pmd-kds-green) !important;
    border-radius: 18px !important;
    box-shadow: 0 18px 40px rgba(15, 23, 42, .06) !important;
    margin-bottom: 24px !important;
    padding: 16px 22px !important;
  }

  .kds-station-name {
    color: var(--pmd-kds-green) !important;
    font-weight: 900 !important;
    letter-spacing: -.02em !important;
  }

  .kds-stat {
    color: var(--pmd-kds-ink) !important;
    font-weight: 700 !important;
  }

  .kds-stat-value {
    color: var(--pmd-kds-ink) !important;
    font-weight: 900 !important;
    letter-spacing: -.04em !important;
  }

  .kds-clock {
    color: #60a5fa !important;
    font-weight: 900 !important;
  }

  .orders-grid {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)) !important;
    gap: 22px !important;
    padding: 8px !important;
  }

  .order-card {
    background: #ffffff !important;
    border-radius: 20px !important;
    padding: 22px !important;
    border: 1px solid var(--pmd-kds-line) !important;
    border-left: 5px solid var(--pmd-kds-green) !important;
    box-shadow: 0 18px 38px rgba(15, 23, 42, .07) !important;
    animation: none !important;
    transform: none !important;
  }

  .order-card:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 22px 46px rgba(15, 23, 42, .10) !important;
  }

  .order-card.age-new {
    border-left-color: var(--pmd-kds-green) !important;
  }

  .order-card.age-normal {
    border-left-color: var(--pmd-kds-yellow) !important;
  }

  .order-card.age-late {
    border-left-color: var(--pmd-kds-red) !important;
    box-shadow: 0 18px 38px rgba(15, 23, 42, .08) !important;
    animation: none !important;
  }

  .order-header {
    border-bottom: 1px solid #e5e7eb !important;
    margin-bottom: 18px !important;
    padding-bottom: 16px !important;
  }

  .order-number {
    color: var(--pmd-kds-ink) !important;
    font-size: 38px !important;
    letter-spacing: -.05em !important;
  }

  .order-table {
    color: #60a5fa !important;
    font-weight: 900 !important;
  }

  .order-time-label {
    color: var(--pmd-kds-muted) !important;
    font-weight: 700 !important;
  }

  .order-elapsed {
    color: var(--pmd-kds-yellow) !important;
    font-weight: 900 !important;
    animation: none !important;
  }

  .order-elapsed.late {
    color: var(--pmd-kds-red) !important;
    animation: none !important;
  }

  .order-item {
    background: #fbfdff !important;
    border: 1px solid #e5eaf0 !important;
    border-left: 3px solid var(--pmd-kds-green) !important;
    border-radius: 14px !important;
    box-shadow: 0 8px 20px rgba(15, 23, 42, .035) !important;
  }

  .item-name {
    color: var(--pmd-kds-ink) !important;
    font-weight: 900 !important;
  }

  .item-quantity {
    color: var(--pmd-kds-green) !important;
    background: var(--pmd-kds-green-soft) !important;
    border-radius: 12px !important;
  }

  .item-comment {
    background: var(--pmd-kds-yellow-soft) !important;
    border-color: #fed7aa !important;
  }

  .order-notes {
    background: var(--pmd-kds-blue-soft) !important;
    border-left-color: var(--pmd-kds-blue) !important;
  }

  .status-btn {
    border-radius: 13px !important;
    font-weight: 900 !important;
    box-shadow: none !important;
    text-transform: none !important;
  }

  .status-btn:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 10px 22px rgba(15, 23, 42, .12) !important;
  }

  .status-btn.status-preparing,
  .status-btn.status-preparation {
    background: #facc15 !important;
    color: #111827 !important;
  }

  .status-btn.status-completed {
    background: #2563eb !important;
    color: #ffffff !important;
  }

  .status-btn.status-cancel,
  .status-btn.status-canceled {
    background: #fee2e2 !important;
    color: #b91c1c !important;
    border: 1px solid #fecaca !important;
    opacity: 1 !important;
  }

  .settings-btn,
  .mute-btn-icon,
  .station-selector {
    border-radius: 12px !important;
    border: 1px solid var(--pmd-kds-line) !important;
    background: #ffffff !important;
    box-shadow: 0 8px 18px rgba(15, 23, 42, .05) !important;
  }

  @media (min-width: 1600px) {
    .orders-grid {
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)) !important;
    }
  }
</style>
<!-- PMD_KDS_SOURCE_CLEAN_V36_CSS_END -->

<!-- PMD_KDS_BALANCED_COLORS_V38_CSS_START -->
<style id="pmd-kds-balanced-colors-v38">
  :root {
    --pmd-kds-ink: #101827;
    --pmd-kds-muted: #667085;
    --pmd-kds-line: #dce5ef;
    --pmd-kds-card: #ffffff;
    --pmd-kds-page: #f5f7fa;

    --pmd-kds-green: #064e3b;
    --pmd-kds-green-soft: #e8f4ee;

    --pmd-kds-blue: #2563eb;
    --pmd-kds-blue-soft: #eff6ff;

    --pmd-kds-amber: #f59e0b;
    --pmd-kds-amber-soft: #fff7e6;

    --pmd-kds-red: #dc2626;
    --pmd-kds-red-soft: #fff1f1;

    --pmd-kds-slate-soft: #f8fafc;
  }

  html,
  body,
  .kds-container {
    background: var(--pmd-kds-page) !important;
    color: var(--pmd-kds-ink) !important;
  }

  /* Top station bar */
  .kds-header {
    background: rgba(255,255,255,.97) !important;
    border: 1px solid var(--pmd-kds-line) !important;
    border-left: 4px solid var(--pmd-kds-green) !important;
    box-shadow: 0 12px 32px rgba(16,24,40,.055) !important;
  }

  .kds-station-name {
    color: var(--pmd-kds-green) !important;
  }

  .kds-stat,
  .kds-stat span,
  .order-time-label {
    color: var(--pmd-kds-muted) !important;
  }

  .kds-stat-value {
    color: var(--pmd-kds-ink) !important;
  }

  .kds-clock {
    color: var(--pmd-kds-blue) !important;
  }

  /* Order cards: clean, not all green */
  .order-card,
  .order-card.age-new,
  .order-card.age-normal,
  .order-card.age-late {
    background: var(--pmd-kds-card) !important;
    border: 1px solid var(--pmd-kds-line) !important;
    border-left: 4px solid #cbd5e1 !important;
    border-radius: 18px !important;
    box-shadow: 0 14px 34px rgba(16,24,40,.065) !important;
    animation: none !important;
  }

  .order-card.age-late {
    border-left-color: #ef4444 !important;
  }

  .order-card.age-normal {
    border-left-color: var(--pmd-kds-amber) !important;
  }

  .order-card.age-new {
    border-left-color: var(--pmd-kds-green) !important;
  }

  .order-card:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 18px 42px rgba(16,24,40,.09) !important;
  }

  .order-number,
  .item-name {
    color: var(--pmd-kds-ink) !important;
  }

  .order-table {
    color: var(--pmd-kds-blue) !important;
  }

  .order-elapsed,
  .order-elapsed.late {
    color: var(--pmd-kds-red) !important;
    animation: none !important;
  }

  /* Item rows: readable, less green */
  .order-item {
    background: var(--pmd-kds-slate-soft) !important;
    border: 1px solid var(--pmd-kds-line) !important;
    border-left: 3px solid #94a3b8 !important;
    border-radius: 14px !important;
    box-shadow: none !important;
  }

  .item-quantity {
    color: var(--pmd-kds-green) !important;
    background: var(--pmd-kds-green-soft) !important;
    border: 1px solid rgba(6,78,59,.08) !important;
  }

  .item-comment {
    background: var(--pmd-kds-amber-soft) !important;
    color: #92400e !important;
    border: 1px solid #fde2a8 !important;
  }

  .order-notes {
    background: #f8fafc !important;
    border-left-color: var(--pmd-kds-blue) !important;
  }

  .order-notes-title {
    color: var(--pmd-kds-blue) !important;
  }

  /* Buttons: useful color meaning, not too much */
  .status-btn {
    border-radius: 13px !important;
    font-weight: 900 !important;
    box-shadow: none !important;
    text-transform: none !important;
    letter-spacing: 0 !important;
  }

  .status-btn.status-preparing,
  .status-btn.status-preparation {
    background: var(--pmd-kds-amber-soft) !important;
    color: #92400e !important;
    border: 1px solid #f4c76b !important;
  }

  .status-btn.status-preparing:hover,
  .status-btn.status-preparation:hover {
    background: #fbbf24 !important;
    color: #111827 !important;
  }

  .status-btn.status-completed {
    background: var(--pmd-kds-blue) !important;
    color: #ffffff !important;
    border: 1px solid var(--pmd-kds-blue) !important;
  }

  .status-btn.status-completed:hover {
    background: #1d4ed8 !important;
  }

  .status-btn.status-cancel,
  .status-btn.status-canceled {
    background: var(--pmd-kds-red-soft) !important;
    color: var(--pmd-kds-red) !important;
    border: 1px solid #fecaca !important;
    opacity: 1 !important;
  }

  .status-btn.status-cancel:hover,
  .status-btn.status-canceled:hover {
    background: #fee2e2 !important;
  }

  .mute-btn-icon,
  .settings-btn,
  .station-selector {
    background: #ffffff !important;
    color: var(--pmd-kds-ink) !important;
    border: 1px solid var(--pmd-kds-line) !important;
    box-shadow: none !important;
  }

  .loading-indicator i,
  .modifier-icon {
    color: var(--pmd-kds-blue) !important;
  }

  .empty-state h3 {
    color: var(--pmd-kds-ink) !important;
  }

  .empty-state p {
    color: var(--pmd-kds-muted) !important;
  }
</style>
<!-- PMD_KDS_BALANCED_COLORS_V38_CSS_END -->
<!-- PMD_KDS_EMBED_HIDE_HEADER_V44_CSS_START -->
<style id="pmd-kds-embed-hide-header-v44">
  html.pmd-kds-embedded-clean-v44 .kds-header,
  html.pmd-kds-embedded-clean-v44 .pmd-kds-toolbar-cards-v39,
  html.pmd-kds-embedded-clean-v44 [data-pmd-kds-top-card-v40],
  html.pmd-kds-embedded-clean-v44 #pmd-kds-actions-card-v41,
  html.pmd-kds-embedded-clean-v44 .pmd-kds-stable-v34-head,
  html.pmd-kds-embedded-clean-v44 .pmd-kds-final-v33-head,
  html.pmd-kds-embedded-clean-v44 .pmd-kds-livefix-v34-head {
    display: none !important;
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    overflow: hidden !important;
    visibility: hidden !important;
  }

  html.pmd-kds-embedded-clean-v44 body {
    padding-top: 0 !important;
    margin-top: 0 !important;
  }

  html.pmd-kds-embedded-clean-v44 .kds-container,
  html.pmd-kds-embedded-clean-v44 .kds-wrapper,
  html.pmd-kds-embedded-clean-v44 main {
    margin-top: 0 !important;
    padding-top: 0 !important;
  }
</style>
<!-- PMD_KDS_EMBED_HIDE_HEADER_V44_CSS_END -->

<!-- PMD_KDS_EMBED_HIDE_HEADER_V44_JS_START -->
<script id="pmd-kds-embed-hide-header-v44-js">
(function () {
  try {
    var params = new URLSearchParams(window.location.search || '');
    if (params.get('embed') === '1' || params.get('pmd_clean') === '1') {
      document.documentElement.classList.add('pmd-kds-embedded-clean-v44');
      document.body && document.body.classList.add('pmd-kds-embedded-clean-v44');

      function clean() {
        document.documentElement.classList.add('pmd-kds-embedded-clean-v44');
        document.body && document.body.classList.add('pmd-kds-embedded-clean-v44');

        document.querySelectorAll(
          '.kds-header, .pmd-kds-toolbar-cards-v39, [data-pmd-kds-top-card-v40], #pmd-kds-actions-card-v41, .pmd-kds-stable-v34-head, .pmd-kds-final-v33-head, .pmd-kds-livefix-v34-head'
        ).forEach(function (el) {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('height', '0', 'important');
          el.style.setProperty('margin', '0', 'important');
          el.style.setProperty('padding', '0', 'important');
          el.style.setProperty('overflow', 'hidden', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
        });
      }

      [0, 100, 300, 700, 1500, 3000].forEach(function (ms) {
        setTimeout(clean, ms);
      });

      new MutationObserver(clean).observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  } catch (e) {}
})();
</script>
<!-- PMD_KDS_EMBED_HIDE_HEADER_V44_JS_END -->


<!-- PMD_KDS_REMOVE_V39_TOOLBAR_V45_CSS_START -->
<style id="pmd-kds-remove-v39-toolbar-v45">
  .pmd-kds-toolbar-v39,
  .pmd-kds-toolbar-card-v39,
  .pmd-kds-toolbar-label-v39,
  .pmd-kds-toolbar-value-v39 {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    overflow: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
</style>
<!-- PMD_KDS_REMOVE_V39_TOOLBAR_V45_CSS_END -->




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

    <div class="kds-container">
        <!-- Header -->
        <div class="kds-header">
            <div class="kds-header-left">
                @if(isset($station) && $station)
                <div class="kds-station-name">
                    <i class="fas fa-tv"></i>
                    {{ $station->name }}
                </div>
                @else
                <div class="kds-station-name">
                    <i class="fas fa-utensils"></i>
                    Kitchen Display
                </div>
                @endif
                <div class="kds-stat">
                    <span>Orders:</span>
                    <span class="kds-stat-value" id="order-count">{{ count($orders) }}</span>
                </div>
                <div class="kds-stat">
                    <span>Reservations:</span>
                    <span class="kds-stat-value" id="reservations-count">{{ $reservationsCount }}</span>
                </div>
            </div>
            <div class="kds-header-right">
                @if(isset($allStations) && count($allStations) > 0)
                <select class="station-selector" id="station-selector" onchange="changeStation(this.value)">
                    <option value="">All Stations</option>
                    @foreach($allStations as $s)
                    <option value="{{ $s->slug }}" {{ (isset($station) && $station && $station->slug === $s->slug) ? 'selected' : '' }}>
                        {{ $s->name }}
                    </option>
                    @endforeach
                </select>
                @endif
                <div class="loading-indicator" id="loading-indicator">
                    <i class="fas fa-sync fa-spin"></i>
                </div>
                <button class="mute-btn-icon" id="mute-btn" onclick="toggleMute()" title="Toggle sound notifications">
                    <i class="fas fa-volume-up" id="mute-icon"></i>
                </button>
                <div class="kds-clock" id="clock">--:--:--</div>
                <a href="{{ admin_url('kds_stations') }}" class="settings-btn" title="Manage KDS Stations">
                    <i class="fas fa-cog"></i>
                </a>
            </div>
        </div>

        <!-- Orders Grid -->
        <div class="orders-grid" id="orders-grid">
            @if(count($orders) === 0)
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-check-circle"></i>
                    <h2>All Caught Up!</h2>
                    <p>No active orders {{ isset($station) && $station ? 'for ' . $station->name : 'in the kitchen' }}</p>
                </div>
            @else
                @foreach($orders as $order)
                    @php
                        // Determine order age class
                        $elapsedMinutes = $order['created_at']->diffInMinutes(now());
                        $ageClass = 'age-new';
                        if ($elapsedMinutes > 15) {
                            $ageClass = 'age-late';
                        } elseif ($elapsedMinutes > 5) {
                            $ageClass = 'age-normal';
                        }
                    @endphp
                    <div class="order-card {{ $ageClass }}" data-order-id="{{ $order['order_id'] }}">
                        <div class="order-header">
                            <div>
                                <div class="order-number">#{{ $order['order_id'] }}</div>
                                <div class="order-table">{{ $order['order_type_name'] }}</div>
                            </div>
                            <div class="order-time">
                                <span class="order-time-label">Time Elapsed</span>
                                <div class="order-elapsed {{ $elapsedMinutes > 15 ? 'late' : '' }}" 
                                     data-created="{{ $order['created_at']->timestamp }}">
                                    {{ $order['elapsed_time'] }}
                                </div>
                            </div>
                        </div>

                        <div class="order-items">
                            @foreach($order['items'] as $item)
                                <div class="order-item">
                                    <div class="item-header">
                                        <div class="item-name">{{ $item['name'] }}</div>
                                        <div class="item-quantity">{{ $item['quantity'] }}×</div>
                                    </div>

                                    @if(count($item['modifiers']) > 0)
                                        <div class="item-modifiers">
                                            @foreach($item['modifiers'] as $modifier)
                                                <div class="item-modifier">
                                                    <i class="fas fa-circle modifier-icon"></i>
                                                    @if($modifier['quantity'] > 1)
                                                        <strong>{{ $modifier['quantity'] }}×</strong>
                                                    @endif
                                                    {{ $modifier['name'] }}
                                                    @if($modifier['category'])
                                                        <span style="color: #707070; font-size: 14px;">({{ $modifier['category'] }})</span>
                                                    @endif
                                                </div>
                                            @endforeach
                                        </div>
                                    @endif

                                    @if(!empty($item['comment']))
                                        <div class="item-comment">
                                            {{ $item['comment'] }}
                                        </div>
                                    @endif
                                </div>
                            @endforeach
                        </div>

                        @if(count($order['notes']) > 0)
                            <div class="order-notes">
                                <div class="order-notes-title"><i class="fas fa-sticky-note"></i> Order Notes:</div>
                                @foreach($order['notes'] as $note)
                                    <div class="order-note">{{ $note['note'] }}</div>
                                @endforeach
                            </div>
                        @endif

                        <!-- Status Change Buttons -->
                        @if($canChangeStatus ?? true)
                        <div class="order-status-buttons">
                            @foreach($statuses as $status)
                                @if($status['status_id'] != $order['status_id'])
                                    <button 
                                        class="status-btn status-{{ strtolower($status['status_name']) }}"
                                        onclick="updateOrderStatus({{ $order['order_id'] }}, {{ $status['status_id'] }}, '{{ $status['status_name'] }}')">
                                        @if(strtolower($status['status_name']) === 'cancel')
                                            <i class="fas fa-times"></i> {{ $status['status_name'] }}
                                        @else
                                            {{ $status['status_name'] }}
                                        @endif
                                    </button>
                                @endif
                            @endforeach
                        </div>
                        @endif
                    </div>
                @endforeach
            @endif
        </div>
    </div>

    <script>
        // Station configuration
        const currentStationSlug = '{{ isset($station) && $station ? $station->slug : "" }}';
        const currentStationName = '{{ isset($station) && $station ? $station->name : "Kitchen" }}';
        const canChangeStatus = {{ ($canChangeStatus ?? true) ? 'true' : 'false' }};
        const refreshInterval = {{ $refreshInterval ?? 5 }} * 1000; // Convert to milliseconds

        // Update clock
        function updateClock() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            document.getElementById('clock').textContent = `${hours}:${minutes}:${seconds}`;
        }

        // Update elapsed times
        function updateElapsedTimes() {
            document.querySelectorAll('.order-elapsed').forEach(el => {
                const createdTimestamp = parseInt(el.dataset.created);
                const now = Math.floor(Date.now() / 1000);
                const elapsed = now - createdTimestamp;
                
                const hours = Math.floor(elapsed / 3600);
                const minutes = Math.floor((elapsed % 3600) / 60);
                const seconds = elapsed % 60;
                
                let timeString = '';
                if (hours > 0) {
                    timeString = `${hours}h ${minutes}m`;
                } else if (minutes > 0) {
                    timeString = `${minutes}m ${seconds}s`;
                } else {
                    timeString = `${seconds}s`;
                }
                
                el.textContent = timeString;
                
                // Add late class if over 15 minutes
                if (minutes > 15 || hours > 0) {
                    el.classList.add('late');
                    el.closest('.order-card').classList.remove('age-new', 'age-normal');
                    el.closest('.order-card').classList.add('age-late');
                } else if (minutes > 5) {
                    el.classList.remove('late');
                    el.closest('.order-card').classList.remove('age-new', 'age-late');
                    el.closest('.order-card').classList.add('age-normal');
                }
            });
        }

        // Sound notification management
        let isMuted = localStorage.getItem('kds-muted') === 'true';
        let previousOrderCount = {{ count($orders) }};
        let previousOrderIds = new Set([@foreach($orders as $order){{ $order['order_id'] }}{{ !$loop->last ? ',' : '' }}@endforeach]);
        let audioContext = null;
        let audioContextInitialized = false;
        const selectedSound = '{{ $kdsNotificationSound ?? "doorbell" }}';

        // Initialize sound using Web Audio API
        function initNotificationSound() {
            try {
                if (!audioContext) {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }
                audioContextInitialized = true;
                console.log('🔊 Audio context initialized');
            } catch (e) {
                console.warn('⚠️ Audio context initialization failed:', e);
                audioContextInitialized = false;
            }
        }

        // Resume audio context if suspended
        async function ensureAudioContext() {
            if (!audioContext) {
                initNotificationSound();
            }
            if (audioContext && audioContext.state === 'suspended') {
                try {
                    await audioContext.resume();
                    console.log('🔊 Audio context resumed');
                } catch (e) {
                    console.warn('⚠️ Failed to resume audio context:', e);
                }
            }
            return audioContext && audioContext.state === 'running';
        }

        // Helper function to play a tone
        function playTone(freq, startTime, duration, type = 'sine', volume = 0.5) {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.frequency.value = freq;
            osc.type = type;
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        }

        // Sound Library
        const soundLibrary = {
            'doorbell': function(now) {
                playTone(800, now, 0.2);
                playTone(600, now + 0.15, 0.3);
            },
            'chime': function(now) {
                playTone(523.25, now, 0.3);
                playTone(659.25, now + 0.2, 0.3);
                playTone(783.99, now + 0.4, 0.4);
            },
            'bell': function(now) {
                playTone(880, now, 0.4, 'sine', 0.6);
                playTone(1320, now + 0.1, 0.3, 'sine', 0.4);
            },
            'alert': function(now) {
                playTone(800, now, 0.1);
                playTone(800, now + 0.15, 0.1);
            },
            'notification': function(now) {
                playTone(800, now, 0.15);
                playTone(1000, now + 0.1, 0.2);
            },
            'ding': function(now) {
                playTone(800, now, 0.3);
            },
            'double-beep': function(now) {
                playTone(600, now, 0.1);
                playTone(600, now + 0.2, 0.1);
            },
            'triple-beep': function(now) {
                playTone(600, now, 0.1);
                playTone(600, now + 0.15, 0.1);
                playTone(600, now + 0.3, 0.1);
            },
            'whoosh': function(now) {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
                osc.connect(gain);
                gain.connect(audioContext.destination);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            },
            'pop': function(now) {
                playTone(400, now, 0.05, 'square', 0.3);
            },
            'success': function(now) {
                playTone(523.25, now, 0.15);
                playTone(659.25, now + 0.15, 0.15);
                playTone(783.99, now + 0.3, 0.2);
            },
            'warning': function(now) {
                playTone(783.99, now, 0.15);
                playTone(659.25, now + 0.15, 0.15);
                playTone(523.25, now + 0.3, 0.2);
            }
        };

        // Play notification sound
        async function playNotificationSound() {
            if (isMuted) return;
            
            const soundFunction = soundLibrary[selectedSound] || soundLibrary['doorbell'];
            
            const isReady = await ensureAudioContext();
            if (!audioContext || !audioContextInitialized) {
                initNotificationSound();
                if (!audioContext) return;
            }
            
            if (audioContext.state !== 'running') {
                try {
                    await audioContext.resume();
                } catch (e) {
                    return;
                }
            }
            
            try {
                const now = audioContext.currentTime;
                soundFunction(now);
            } catch (e) {
                console.error('❌ Sound notification failed:', e);
            }
        }

        // Toggle mute/unmute
        async function toggleMute() {
            isMuted = !isMuted;
            localStorage.setItem('kds-muted', isMuted);
            updateMuteButton();
            if (!isMuted) {
                const isReady = await ensureAudioContext();
                if (isReady) {
                    setTimeout(() => {
                        playNotificationSound().catch(e => {});
                    }, 100);
                }
            }
        }

        // Update mute button appearance
        function updateMuteButton() {
            const btn = document.getElementById('mute-btn');
            const icon = document.getElementById('mute-icon');
            
            if (isMuted) {
                btn.classList.add('muted');
                icon.className = 'fas fa-volume-mute';
                btn.title = 'Sound Off - Click to unmute';
            } else {
                btn.classList.remove('muted');
                icon.className = 'fas fa-volume-up';
                btn.title = 'Sound On - Click to mute';
            }
        }

        // Change station
        function changeStation(stationSlug) {
            if (stationSlug) {
                window.location.href = '{{ admin_url("kitchendisplay") }}/' + stationSlug;
            } else {
                window.location.href = '{{ admin_url("kitchendisplay") }}';
            }
        }

        // Auto-refresh orders from server
        async function refreshOrders() {
            const indicator = document.getElementById('loading-indicator');
            indicator.classList.add('active');

            try {
                const refreshUrl = '{{ admin_url("kitchendisplay/index") }}';
                
                const formData = new URLSearchParams();
                formData.append('_handler', 'onRefresh');
                if (currentStationSlug) {
                    formData.append('station_slug', currentStationSlug);
                }
                
                const response = await fetch(refreshUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: formData.toString()
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    throw new Error(`Expected JSON but got: ${contentType}. Response: ${text.substring(0, 100)}`);
                }

                const data = await response.json();
                
                if (data.orders && Array.isArray(data.orders)) {
                    const currentOrderCount = data.orders.length;
                    const currentOrderIds = new Set(data.orders.map(order => order.order_id));
                    
                    // Check if new orders arrived
                    let hasNewOrders = false;
                    currentOrderIds.forEach(orderId => {
                        if (!previousOrderIds.has(orderId)) {
                            hasNewOrders = true;
                            console.log(`🆕 New order detected: #${orderId}`);
                        }
                    });
                    
                    if (hasNewOrders) {
                        playNotificationSound().catch(e => {});
                    }
                    
                    previousOrderCount = currentOrderCount;
                    previousOrderIds = new Set(currentOrderIds);
                    
                    updateOrdersDisplay(data.orders);
                    document.getElementById('order-count').textContent = currentOrderCount;
                }
            } catch (error) {
                console.error('❌ Failed to refresh orders:', error);
            } finally {
                setTimeout(() => {
                    indicator.classList.remove('active');
                }, 500);
            }
        }

        // Parse date string to timestamp
        function parseDateToTimestamp(dateString) {
            if (typeof dateString === 'string') {
                return Math.floor(new Date(dateString).getTime() / 1000);
            }
            return dateString;
        }

        // Format elapsed time
        function formatElapsedTime(createdAtTimestamp) {
            const timestamp = parseDateToTimestamp(createdAtTimestamp);
            const now = Math.floor(Date.now() / 1000);
            const elapsed = now - timestamp;
            
            const hours = Math.floor(elapsed / 3600);
            const minutes = Math.floor((elapsed % 3600) / 60);
            const seconds = elapsed % 60;
            
            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            } else if (minutes > 0) {
                return `${minutes}m ${seconds}s`;
            } else {
                return `${seconds}s`;
            }
        }

        // Get age class for order card
        function getAgeClass(createdAtTimestamp) {
            const timestamp = parseDateToTimestamp(createdAtTimestamp);
            const now = Math.floor(Date.now() / 1000);
            const elapsed = now - timestamp;
            const minutes = Math.floor(elapsed / 60);
            
            if (minutes > 15) {
                return 'age-late';
            } else if (minutes > 5) {
                return 'age-normal';
            } else {
                return 'age-new';
            }
        }

        // Render order card HTML
        function renderOrderCard(order, statuses) {
            const createdAtTimestamp = parseDateToTimestamp(order.created_at);
            const elapsedTime = formatElapsedTime(createdAtTimestamp);
            const ageClass = getAgeClass(createdAtTimestamp);
            const now = Math.floor(Date.now() / 1000);
            const isLate = Math.floor((now - createdAtTimestamp) / 60) > 15;
            
            let itemsHtml = '';
            order.items.forEach(item => {
                let modifiersHtml = '';
                if (item.modifiers && item.modifiers.length > 0) {
                    modifiersHtml = '<div class="item-modifiers">';
                    item.modifiers.forEach(modifier => {
                        modifiersHtml += `
                            <div class="item-modifier">
                                <i class="fas fa-circle modifier-icon"></i>
                                ${modifier.quantity > 1 ? `<strong>${modifier.quantity}×</strong>` : ''}
                                ${modifier.name}
                                ${modifier.category ? `<span style="color: #707070; font-size: 14px;">(${modifier.category})</span>` : ''}
                            </div>
                        `;
                    });
                    modifiersHtml += '</div>';
                }
                
                const commentHtml = item.comment ? `
                    <div class="item-comment">${item.comment}</div>
                ` : '';
                
                itemsHtml += `
                    <div class="order-item">
                        <div class="item-header">
                            <div class="item-name">${item.name}</div>
                            <div class="item-quantity">${item.quantity}×</div>
                        </div>
                        ${modifiersHtml}
                        ${commentHtml}
                    </div>
                `;
            });
            
            let notesHtml = '';
            if (order.notes && order.notes.length > 0) {
                notesHtml = '<div class="order-notes"><div class="order-notes-title"><i class="fas fa-sticky-note"></i> Order Notes:</div>';
                order.notes.forEach(note => {
                    notesHtml += `<div class="order-note">${note.note}</div>`;
                });
                notesHtml += '</div>';
            }
            
            let statusButtonsHtml = '';
            if (canChangeStatus && statuses && Array.isArray(statuses)) {
                statuses.forEach(status => {
                    if (status.status_id != order.status_id) {
                        let displayName = status.status_name;
                        if (displayName === 'Canceled' || displayName === 'Cancelled') {
                            displayName = 'Cancel';
                        } else if (displayName === 'Preparation') {
                            displayName = 'Preparing';
                        }
                        
                        const statusClass = `status-${status.status_name.toLowerCase().replace(/\s+/g, '-')}`;
                        const buttonText = status.status_name === 'Canceled' || status.status_name === 'Cancelled' 
                            ? '<i class="fas fa-times"></i> Cancel' 
                            : status.status_name === 'Preparation' 
                            ? 'Preparing' 
                            : status.status_name;
                        statusButtonsHtml += `
                            <button 
                                class="status-btn ${statusClass}"
                                onclick="updateOrderStatus(${order.order_id}, ${status.status_id}, '${status.status_name}')">
                                ${buttonText}
                            </button>
                        `;
                    }
                });
            }
            
            return `
                <div class="order-card ${ageClass}" data-order-id="${order.order_id}">
                    <div class="order-header">
                        <div>
                            <div class="order-number">#${order.order_id}</div>
                            <div class="order-table">${order.order_type_name}</div>
                        </div>
                        <div class="order-time">
                            <span class="order-time-label">Time Elapsed</span>
                            <div class="order-elapsed ${isLate ? 'late' : ''}" data-created="${createdAtTimestamp}">
                                ${elapsedTime}
                            </div>
                        </div>
                    </div>
                    <div class="order-items">${itemsHtml}</div>
                    ${notesHtml}
                    ${statusButtonsHtml ? `<div class="order-status-buttons">${statusButtonsHtml}</div>` : ''}
                </div>
            `;
        }

        // Update orders display with new data
        function updateOrdersDisplay(orders) {
            const grid = document.getElementById('orders-grid');
            const orderCount = document.getElementById('order-count');
            
            if (!grid) return;
            
            orderCount.textContent = orders.length;

            if (orders.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <i class="fas fa-check-circle"></i>
                        <h2>All Caught Up!</h2>
                        <p>No active orders ${currentStationName ? 'for ' + currentStationName : 'in the kitchen'}</p>
                    </div>
                `;
                return;
            }

            const statuses = @json($statuses);
            
            grid.innerHTML = '';
            
            orders.forEach((order, index) => {
                try {
                    const cardHtml = renderOrderCard(order, statuses);
                    grid.insertAdjacentHTML('beforeend', cardHtml);
                } catch (error) {
                    console.error(`❌ Error rendering order ${order.order_id}:`, error);
                }
            });
            
            updateElapsedTimes();
        }

        // Update order status
        async function updateOrderStatus(orderId, statusId, statusName) {
            if (!confirm(`Update order #${orderId} to ${statusName}?`)) {
                return;
            }

            try {
                const updateUrl = '{{ admin_url("kitchendisplay/index") }}';
                
                const formData = new URLSearchParams();
                formData.append('_handler', 'onUpdateStatus');
                formData.append('order_id', orderId);
                formData.append('status_id', statusId);
                formData.append('station_slug', currentStationSlug);
                formData.append('station_name', currentStationName);
                
                const response = await fetch(updateUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: formData.toString()
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    throw new Error(`Expected JSON but got: ${contentType}. Response: ${text.substring(0, 100)}`);
                }

                const data = await response.json();
                
                if (data.success) {
                    // Refresh orders to reflect changes
                    refreshOrders();
                } else {
                    alert('Failed to update status: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Failed to update status:', error);
                alert('Failed to update status: ' + error.message);
            }
        }


        // Initialize
        // PMD v82: defer AudioContext until interaction/new order to keep KDS first paint fast.
        updateMuteButton();
        updateClock();
        updateElapsedTimes();
        
        // Set up intervals
        setInterval(updateClock, 1000);
        setInterval(updateElapsedTimes, 1000);
        
        // Start auto-refresh
        console.log('🔄 Starting auto-refresh...');
        // PMD v82: initial orders are already server-rendered. Avoid duplicate heavy POST during first paint.
        const firstRefreshDelay = Math.max(1500, Math.min(refreshInterval, 5000));
        setTimeout(refreshOrders, firstRefreshDelay);
        setInterval(refreshOrders, refreshInterval);

        // Enable audio on user interaction
        function enableAudioOnInteraction() {
            ensureAudioContext().then(isReady => {
                if (isReady) {
                    console.log('🔊 Audio enabled and ready');
                }
            });
        }
        
        ['click', 'touchstart', 'keydown'].forEach(eventType => {
            document.addEventListener(eventType, enableAudioOnInteraction, { once: true });
        });

        console.log('✅ Kitchen Display System initialized');
        console.log('📍 Station:', currentStationName || 'All Stations');
        console.log('🔄 Auto-refresh:', refreshInterval / 1000, 'seconds');
        console.log('🔔 Sound:', isMuted ? 'OFF' : 'ON');
    </script>
</body>
</html>
