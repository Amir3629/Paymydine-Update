@empty($value)
    <span
        class="label label-default"
        style="background-color: {{ $record->status_color ?? '#6c757d' }}; color: #fff; padding: 6px 10px; border-radius: 6px; font-weight: 500;"
    >{{ $value ?? lang('admin::lang.text_incomplete') }}</span>
@else
    @php
        $currentId = $record->status_id ?? null;
        $options = [];
        foreach ($statusesOptions ?? [] as $id => $name) {
            if ((int)$id === (int)$currentId) continue;
            $options[] = [
                'id' => (int)$id,
                'name' => $name,
                'color' => $statusesColors[$id] ?? '#6c757d',
            ];
        }
    @endphp
    <div class="orders-status-cell">
        <button
            type="button"
            class="orders-status-trigger btn btn-link p-0 text-decoration-none font-weight-bold border-0 rounded px-2 py-1"
            style="border-bottom: 2px dashed {{ $record->status_color ?? '#6c757d' }} !important; color: {{ $record->status_color ?? '#6c757d' }} !important; font-size: 1em;"
            data-record-id="{{ $record->getKey() }}"
            data-current-status-id="{{ $currentId }}"
            data-current-name="{{ e($value) }}"
            data-current-color="{{ $record->status_color ?? '#6c757d' }}"
            data-options="{{ json_encode($options, JSON_HEX_APOS | JSON_HEX_QUOT) }}"
            aria-haspopup="true"
            aria-expanded="false"
        >{{ $value }}</button>
    </div>
@endif
