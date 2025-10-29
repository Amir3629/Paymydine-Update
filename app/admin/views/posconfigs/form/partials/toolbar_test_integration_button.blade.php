<button id="btn-test-integration" type="button" class="btn btn-info">
    Test Integration POS
</button>

<!-- Modal -->
<div id="testIntegrationModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">API Response</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <pre id="testIntegrationResult">Carregando...</pre>
            </div>
        </div>
    </div>
</div>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        const btn = document.getElementById('btn-test-integration');
        if (!btn) return;

        btn.addEventListener('click', function() {
            // Pega o ID do registro da URL
            let segments = window.location.pathname.split('/');
            let recordId = segments.pop() || segments.pop(); // último segmento não vazio

            $.request('onTestIntegration', {
                data: {
                    config_id: recordId
                },
                success: function(response) {
                    document.getElementById('testIntegrationResult').textContent = JSON
                        .stringify(response, null, 2);
                    new bootstrap.Modal(document.getElementById('testIntegrationModal'))
                        .show();
                },
                error: function(xhr) {
                    document.getElementById('testIntegrationResult').textContent =
                        'Erro: ' + xhr.responseText;
                    new bootstrap.Modal(document.getElementById('testIntegrationModal'))
                        .show();
                }
            });
        });
    });
</script>
