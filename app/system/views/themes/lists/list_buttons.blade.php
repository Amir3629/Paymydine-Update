<span class="d-none">
{!! $this->makePartial('lists/list_button', ['record' => $theme, 'column' => $this->getColumn('source')]) !!}
</span>

@if ($theme->getTheme()->isActive() && $theme->getTheme()->hasCustomData())
    {!! $this->makePartial('lists/list_button', ['record' => $theme, 'column' => $this->getColumn('edit')]) !!}
@endif

{!! $this->makePartial('lists/list_button', ['record' => $theme, 'column' => $this->getColumn('default')]) !!}

