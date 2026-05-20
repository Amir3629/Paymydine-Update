<form
    id="subscribeForm"
    class="subscribe-form"
    method="POST" data-request="{{ $subscribeHandler }}">
    <div class="input-group input-group-lg form-floating subscribe-group">
        <input
            type="text"
            id="suscribe_id"
            class="form-control"
            name="subscribe_email"
            placeholder="@lang('admin::lang.label_email')..."
        >
        <label for="subscribe_id">@lang('admin::lang.label_email')...</label>       
        <button
            id="subscribeButton"
            class="btn btn-primary"
        ><i class="fs-6 bi bi-envelope-paper-heart-fill"></i></button>        
    </div>
</form>