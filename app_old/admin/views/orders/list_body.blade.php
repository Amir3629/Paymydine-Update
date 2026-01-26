@foreach ($records as $record)
    @php
        // Get status color and create a lighter version for row background
        $statusColor = $record->status_color ?? '#ffffff';
        
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
        
        // Create a very light background color (15% opacity)
        $lightBackground = "rgba($r, $g, $b, 0.15)";
    @endphp
    <tr style="background-color: {{ $lightBackground }}; transition: background-color 0.3s ease;">
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

