
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservation-kds-create-v2.css?v=6_1783169333">
<script defer src="/app/admin/assets/js/pmd-reservation-kds-create-v2.js?v=6_1783169333"></script>

<div class="row-fluid">
    {!! form_open([
            'id'     => 'edit-form',
            'role'   => 'form',
            'method' => 'POST',
    ]) !!}

    {!! $this->renderForm() !!}

    {!! form_close() !!}
</div>
