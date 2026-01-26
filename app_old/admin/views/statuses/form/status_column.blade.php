@empty($value)
    <span
        class="label {{ $value ? 'label-default' : '' }}"
        style="background-color: {{ $record->status_color }};"
    >{{ $value ?? lang('admin::lang.text_incomplete') }}</span>
@else
    <div class="dropdown">
        <button
            class="btn font-weight-bold p-0 dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
            style="border-bottom: 1px dashed;color: {{ $record->status_color }};"
        >{{ $value ?? lang('admin::lang.text_incomplete') }}</button>
        <div class="dropdown-menu" style="min-width: 150px;">
            @foreach ($statusesOptions as $index => $statusName)
                @continue($record->status_id == $index)
                @php
                    // Get the color for this status
                    $statusColor = $statusesColors[$index] ?? '#6c757d';
                    
                    // Convert hex to RGB for lighter background
                    $hex = ltrim($statusColor, '#');
                    if (strlen($hex) == 3) {
                        $r = hexdec(substr($hex, 0, 1) . substr($hex, 0, 1));
                        $g = hexdec(substr($hex, 1, 1) . substr($hex, 1, 1));
                        $b = hexdec(substr($hex, 2, 1) . substr($hex, 2, 1));
                    } else {
                        $r = hexdec(substr($hex, 0, 2));
                        $g = hexdec(substr($hex, 2, 2));
                        $b = hexdec(substr($hex, 4, 2));
                    }
                    
                    // Create background with 100% SOLID (no transparency)
                    $backgroundColor = "rgba($r, $g, $b, 1)";
                    $hoverBackgroundColor = "rgba($r, $g, $b, 1)";
                @endphp
                <a
                    class="dropdown-item status-dropdown-item"
                    data-request="onUpdateStatus"
                    data-request-data="recordId: '{{ $record->getKey() }}', statusId: '{{ $index }}'"
                    style="background-color: {{ $backgroundColor }}; color: #000000; font-weight: 500; border-left: 4px solid {{ $statusColor }}; padding: 8px 12px; margin: 2px 0; transition: background-color 0.2s ease;"
                    onmouseover="this.style.backgroundColor='{{ $hoverBackgroundColor }}'"
                    onmouseout="this.style.backgroundColor='{{ $backgroundColor }}'"
                >{{ $statusName }}</a>
            @endforeach
        </div>
    </div>
@endempty
