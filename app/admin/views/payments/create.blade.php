<div class="row-fluid">
    <style>
        .form-field[data-field-name="provider_code"] .ss-main {
            min-height: 34px !important;
            height: 34px !important;
            padding-top: 2px !important;
            padding-bottom: 2px !important;
        }
        .form-field[data-field-name="provider_code"] .ss-values {
            line-height: 28px !important;
        }
        .form-field[data-field-name="provider_code"] .ss-content,
        .form-field[data-field-name="provider_code"] .ss-list {
            max-height: 180px !important;
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
            line-height: 1.2 !important;
            padding-top: 6px !important;
            padding-bottom: 6px !important;
        }
    </style>
    {!! form_open([
        'id'     => 'edit-form',
        'role'   => 'form',
        'method' => 'POST',
    ]) !!}

    {!! $this->renderForm() !!}

    {!! form_close() !!}
</div>
