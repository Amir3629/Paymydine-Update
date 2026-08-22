@php
    $details = is_array($record->details)
        ? $record->details
        : [
            'preview' => $record->details,
            'full' => $record->details,
            'is_truncated' => false,
            'metadata' => [],
        ];

    $modalId = 'pmd-history-details-'.$record->id;
    $type = $details['metadata']['type'] ?? 'Activity';
    $table = $details['metadata']['table'] ?? '';

    $pmdHistoryHeaderDeleteR19 = !defined('PMD_HISTORY_HEADER_DELETE_R19');
    if ($pmdHistoryHeaderDeleteR19) {
        define('PMD_HISTORY_HEADER_DELETE_R19', 1);
    }
@endphp

@if($pmdHistoryHeaderDeleteR19)
<style id="pmd-history-header-delete-r19">
/* PMD_HISTORY_HEADER_DELETE_R19 */
#pmd-history-page tr.bulk-actions[data-control="bulk-actions"] {
    display: none !important;
}

#pmd-history-page .pmd-history-delete-selected-r19[hidden] {
    display: none !important;
}

#pmd-history-page .pmd-history-delete-selected-r19 {
    background: #b42318 !important;
    border-color: #b42318 !important;
    color: #ffffff !important;
    box-shadow: 0 8px 18px rgba(180, 35, 24, 0.18) !important;
}

#pmd-history-page .pmd-history-delete-selected-r19:hover,
#pmd-history-page .pmd-history-delete-selected-r19:focus-visible {
    background: #97180f !important;
    border-color: #97180f !important;
    color: #ffffff !important;
}

#pmd-history-page .pmd-history-delete-selected-r19 svg {
    width: 20px !important;
    height: 20px !important;
    fill: none !important;
    stroke: currentColor !important;
    stroke-width: 2 !important;
    stroke-linecap: round !important;
    stroke-linejoin: round !important;
}
</style>

<script id="pmd-history-header-delete-r19-js">
(function () {
    'use strict';

    var root = document.getElementById('pmd-history-page');
    if (!root) return;

    var actions = root.querySelector('[data-pmd-owner-header-actions]');
    if (!actions) return;

    var button = root.querySelector('[data-pmd-history-delete-selected-r19]');

    if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'pmd-owner-header-button pmd-history-delete-selected-r19';
        button.setAttribute('data-pmd-history-delete-selected-r19', '');
        button.setAttribute('aria-label', 'Delete selected history records');
        button.title = 'Delete selected';
        button.hidden = true;
        button.disabled = true;
        button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5M14 11v5"></path></svg>';

        var refresh = actions.querySelector('[data-pmd-history-refresh]');
        actions.insertBefore(button, refresh || null);
    }

    function selectedCount() {
        return root.querySelectorAll(
            '#list-form input[name="checked[]"]:checked'
        ).length;
    }

    function syncDeleteButton() {
        var count = selectedCount();
        button.hidden = count < 1;
        button.disabled = count < 1;
        button.setAttribute('aria-hidden', count < 1 ? 'true' : 'false');
        button.title = count > 0
            ? 'Delete ' + count + ' selected'
            : 'Delete selected';
    }

    function originalDeleteAction() {
        return root.querySelector(
            'tr.bulk-actions[data-control="bulk-actions"] [data-control="bulk-action"]'
        ) || root.querySelector(
            'tr.bulk-actions[data-control="bulk-actions"] .text-danger'
        );
    }

    button.addEventListener('click', function () {
        if (selectedCount() < 1) {
            syncDeleteButton();
            return;
        }

        var original = originalDeleteAction();
        if (!original) {
            console.error('PMD History: bulk delete action was not found.');
            return;
        }

        original.click();
    });

    document.addEventListener('change', function (event) {
        var target = event.target;
        if (!target || !target.matches) return;

        if (
            target.matches('#list-form input[name="checked[]"]') ||
            target.matches('#list-form input[id^="checkboxAll-"]')
        ) {
            window.setTimeout(syncDeleteButton, 0);
        }
    }, true);

    if (window.jQuery) {
        window.jQuery(document).on('ajaxUpdate', function () {
            window.setTimeout(syncDeleteButton, 0);
        });
    }

    window.addEventListener('pageshow', syncDeleteButton);
    syncDeleteButton();
})();
</script>
@endif

<div class="pmd-history-details-cell">
    <div class="pmd-history-details-preview">
        {{ $details['preview'] ?? '' }}
    </div>

    @if(!empty($details['is_truncated']))
        <button
            type="button"
            class="pmd-history-see-more"
            data-pmd-history-open="{{ $modalId }}"
            aria-haspopup="dialog"
        >
            View
        </button>
    @endif
</div>

@if(!empty($details['is_truncated']))
    <div
        id="{{ $modalId }}"
        class="pmd-history-modal"
        data-pmd-history-modal
        hidden
    >
        <div
            class="pmd-history-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="{{ $modalId }}-title"
        >
            <div class="pmd-history-modal__header">
                <h3 id="{{ $modalId }}-title">
                    {{ $type }}{{ $table ? ' · '.$table : '' }}
                </h3>

                <button
                    type="button"
                    class="pmd-history-modal__close"
                    data-pmd-history-close
                    aria-label="Close"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 6l12 12M18 6 6 18"></path>
                    </svg>
                </button>
            </div>

            <div class="pmd-history-modal__body">
                <pre class="pmd-history-modal__text">{{ $details['full'] ?? $details['preview'] ?? '' }}</pre>
            </div>
        </div>
    </div>
@endif
