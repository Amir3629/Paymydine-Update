@php
    $saveActions = array_get($button->config, 'saveActions', ['continue', 'close', 'new']);
    $preferredAction = setting('admin_after_save_action', 'continue');
    $selectedAction = in_array($preferredAction, $saveActions) ? $preferredAction : 'continue';
@endphp
<div class="btn-group">
    <button
        type="button"
        tabindex="0"
        {!! $button->getAttributes() !!}
    >{!! $button->label ?: $button->name !!}</button>
</div>
<input type="hidden" data-form-save-action="" name="{{$selectedAction}}" value="1">
