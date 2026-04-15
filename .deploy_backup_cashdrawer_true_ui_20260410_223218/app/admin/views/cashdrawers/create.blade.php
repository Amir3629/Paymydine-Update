<div class="row-fluid">
    <div class="alert alert-info" style="margin-bottom: 15px;">
        <strong>Quick setup:</strong>
        1) Name drawer, 2) select location and local POS terminal, 3) select printer, 4) save and test.
    </div>

    {!! form_open([
        'id'     => 'edit-form',
        'role'   => 'form',
        'method' => 'POST',
    ]) !!}

    {!! $this->renderForm() !!}

    {!! form_close() !!}
</div>
