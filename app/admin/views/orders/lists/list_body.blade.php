@foreach ($records as $record)
    @php
        // Get status color and create a lighter version for row background
        $statusColor = null;
        $lightBackground = 'transparent';
        $hoverBackground = 'rgba(0, 0, 0, 0.02)';
        
        if ($record->status && $record->status_color) {
            $statusColor = $record->status_color;
            
            // Convert hex to RGB and add opacity for lighter background
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
            
            // Create a very light background color (12% opacity for subtle effect)
            $lightBackground = "rgba($r, $g, $b, 0.12)";
            // Create hover background (20% opacity for slight emphasis)
            $hoverBackground = "rgba($r, $g, $b, 0.20)";
        }
        
        $rowId = 'order-row-' . $record->getKey();
        $statusName = $record->status ? $record->status->status_name : '';
        $isHistory = in_array(strtolower($statusName), ['delivery', 'completed']);
    @endphp
    <tr id="{{ $rowId }}" 
        data-status-name="{{ strtolower($statusName) }}" 
        data-is-history="{{ $isHistory ? '1' : '0' }}"
        class="order-row {{ $isHistory ? 'history-order' : 'active-order' }}"
        style="background-color: {{ $lightBackground }}; transition: all 0.3s ease, opacity 0.3s ease, transform 0.3s ease;" 
        onmouseover="this.style.backgroundColor='{{ $hoverBackground }}'" 
        onmouseout="this.style.backgroundColor='{{ $lightBackground }}'"
    >
        @if ($showDragHandle)
            <td class="list-action">
                <div class="btn btn-handle">
                    <i class="fa fa-arrows-alt-v"></i>
                </div>
            </td>
        @endif

        @if ($showCheckboxes)
            <td class="list-action">
                <div class="form-check">
                    <input
                        type="checkbox"
                        id="{{ 'checkbox-'.$record->getKey() }}"
                        class="form-check-input"
                        value="{{ $record->getKey()}}" name="checked[]"
                    />
                    <label class="form-check-label" for="{{ 'checkbox-'.$record->getKey() }}">&nbsp;</label>
                </div>
            </td>
        @endif

        @foreach ($columns as $key => $column)
            @continue ($column->type != 'button')
            <td class="list-action {{ $column->cssClass }}">
                {!! $this->makePartial('lists/list_button', ['record' => $record, 'column' => $column]) !!}
            </td>
        @endforeach

        @foreach ($columns as $key => $column)
            @continue($column->type == 'button')
            <td
                class="list-col-index-{{ $loop->index }} list-col-name-{{ $column->getName() }} list-col-type-{{ $column->type }} {{ $column->cssClass }}"
            >
                {!! $this->getColumnValue($record, $column) !!}
            </td>
        @endforeach

        @if ($showFilter)
            <td class="list-setup">&nbsp;</td>
        @endif

        @if ($showSetup)
            <td class="list-setup">&nbsp;</td>
        @endif
    </tr>
@endforeach

