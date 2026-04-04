<div class="row-fluid">
    {!! form_open([
        'id'     => 'edit-form',
        'role'   => 'form',
        'method' => 'PATCH',
    ]) !!}

    {!! $this->renderForm() !!}

    {!! form_close() !!}
</div>

<style>
.order-info-item.note {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
}

.order-info-item.note .order-info-label {
    width: 100% !important;
    text-align: center !important;
    position: relative !important;
    left: -8px !important;
}

.order-info-item.note .note-button-container {
    width: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: relative !important;
    left: -10px !important;
}

.order-info-item.note .note-icon-btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
}
</style>
