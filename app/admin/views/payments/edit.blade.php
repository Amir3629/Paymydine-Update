<div class="row-fluid">
    <style>
        .form-field[data-field-name="provider_code"] .ss-content,
        .form-field[data-field-name="provider_code"] .ss-list {
            max-height: 220px !important;
            height: auto !important;
            min-height: 0 !important;
        }
        .form-field[data-field-name="provider_code"] .ss-content.ss-open-below {
            overflow-y: auto !important;
        }
        .form-field[data-field-name="provider_code"] .ss-content .ss-list.ss-few-options {
            max-height: none !important;
            height: auto !important;
        }
        .form-field[data-field-name="provider_code"] .ss-content .ss-list .ss-option {
            line-height: 1.4 !important;
            padding-top: 8px !important;
            padding-bottom: 8px !important;
        }
    </style>
    {!! form_open([
        'id'     => 'edit-form',
        'role'   => 'form',
        'method' => 'PATCH',
    ]) !!}

    {!! $this->renderForm() !!}

    {!! form_close() !!}
</div>
