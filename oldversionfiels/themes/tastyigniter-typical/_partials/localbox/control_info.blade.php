<div class="pb">
    <div class="mw">
        <span class="d-block" style="white-space: nowrap;">
            <strong>{{ $orderType->getLabel() }}</strong>
        </span>
        @if ($orderType->getSchedule()->isOpen())
        <span class="small-t d-block lh-0">            
                @if ($orderType->getLeadTime())
                    {!! sprintf(lang('igniter.local::default.text_in_min'), $orderType->getLeadTime()) !!}
                @endif            
        </span>
        @endif
    </div>
</div>


