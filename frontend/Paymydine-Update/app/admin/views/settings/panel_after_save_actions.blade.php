@php
    $saveActions = ['continue', 'close', 'new'];
    $fieldValue = $field->value;
    $selectedAction = in_array($fieldValue, $saveActions, true) ? $fieldValue : 'continue';
    $actionLabels = [
        'continue' => lang('admin::lang.form.save_actions.continue'),
        'close' => lang('admin::lang.form.save_actions.close'),
        'new' => lang('admin::lang.form.save_actions.new'),
    ];
@endphp

@once
    <style>
        .panel-save-option {
            color: #202938 !important;
        }

        .panel-save-option input[type="radio"] {
            position: relative;
            appearance: none;
            width: 20px;
            height: 20px;
            border: 2px solid #364a63 !important;
            border-radius: 50%;
            cursor: pointer;
            margin: 0;
        }

        .panel-save-option input[type="radio"]::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: transparent;
            transform: translate(-50%, -50%);
            transition: background-color 0.2s ease;
        }

        .panel-save-option input[type="radio"]:checked::after {
            background-color: #364a63 !important;
        }

        .panel-save-option .option-label {
            font-weight: 600;
            color: #202938;
        }
    </style>
@endonce

<div class="card bg-light shadow-sm">
    <div class="card-body">
        <p class="text-muted mb-3">@lang('admin::lang.settings.text_after_save_description')</p>

        <div class="list-group" data-control="panel-save-actions">
            @foreach ($saveActions as $action)
                <label class="panel-save-option list-group-item d-flex align-items-center gap-3">
                    <input
                        type="radio"
                        name="{{ $field->getName() }}"
                        value="{{ $action }}"
                        {{ $selectedAction === $action ? 'checked' : '' }}
                    >
                    <span class="option-label">{{ $actionLabels[$action] ?? $action }}</span>
                </label>
            @endforeach
        </div>
    </div>
</div>

