<div class="row-fluid">
    <style>
        .form-field[data-field-name="provider_code"] .ss-content,
        .form-field[data-field-name="provider_code"] .ss-list {
            max-height: 220px !important;
            height: auto !important;
        }
        .form-field[data-field-name="provider_code"] .ss-content.ss-open-below {
            overflow-y: auto !important;
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
