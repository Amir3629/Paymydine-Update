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
@endphp

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
