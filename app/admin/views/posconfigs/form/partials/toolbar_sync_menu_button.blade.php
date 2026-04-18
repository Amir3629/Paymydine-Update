<button
    type="button"
    class="btn btn-warning"
    data-request="onSyncMenu"
    data-request-data="config_id: '{{ $formModel->config_id }}'"
    data-progress-indicator="Synchronizing menu..."
    data-request-success="new bootstrap.Modal(document.getElementById('syncResultModal')).show();"
>
    <i class="fa fa-refresh"></i> Sync Menu
</button>

<!-- Modal -->
<div id="syncResultModal" class="modal fade" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header bg-warning text-white">
        <h4 class="modal-title">Menu Synchronization</h4>
         <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <p class="text-center text-muted mb-0">
          <i class="fa fa-spinner fa-spin fa-2x"></i><br>
          Waiting for synchronization results...
        </p>
      </div>
    </div>
  </div>
</div>
