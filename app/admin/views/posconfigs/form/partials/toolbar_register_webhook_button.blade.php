<?php
// Get the current form record
$record = $this->controller->widgets['form']->model ?? null;

// If the webhook already exists, do not display the button
if ($record && $record->exists_webhook == 1) {
    return;
}
?>
<button id="btn-register-webhook" type="button" class="btn btn-success">
    Register Webhook
</button>

<!-- Modal -->
<div id="registerWebhookModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Webhook Registration Result</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <pre id="registerWebhookResult">Loading...</pre>
            </div>
        </div>
    </div>
</div>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        const btn = document.getElementById('btn-register-webhook');
        if (!btn) return;

        btn.addEventListener('click', function() {
            // Get the record ID from the URL
            let segments = window.location.pathname.split('/');
            let recordId = segments.pop() || segments.pop();

            // Call the controller's AJAX handler
            $.request('onRegisterWebhook', {
                data: {
                    config_id: recordId
                },
                success: function(response) {
                    document.getElementById('registerWebhookResult').textContent =
                        JSON.stringify(response, null, 2);

                    const modal = new bootstrap.Modal(document.getElementById(
                        'registerWebhookModal'));
                    modal.show();

                    // Reload the page after 2 seconds (to give the user time to read the modal)
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                },
                error: function(xhr) {
                    let msg = 'Error: ' + (xhr.responseText || xhr.statusText);
                    document.getElementById('registerWebhookResult').textContent = msg;
                    new bootstrap.Modal(document.getElementById('registerWebhookModal'))
                        .show();
                }
            });
        });
    });
</script>
