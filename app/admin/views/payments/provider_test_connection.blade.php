<div class="form-group">
    <label class="control-label">Provider connectivity</label>
    <div>
        <button
            type="button"
            class="btn btn-outline-primary"
            data-request="onTestProviderConnection"
            data-request-form="#edit-form"
            data-request-success="if(data && data.message){$.ti && $.ti.flashMessage ? $.ti.flashMessage({text:data.message, class:data.success ? 'success' : 'danger'}) : alert(data.message)}"
        >
            Test API Connection
        </button>
        <p class="help-block" style="margin-top:8px;">Sends a lightweight API/auth check using the saved provider credentials.</p>
    </div>
</div>
