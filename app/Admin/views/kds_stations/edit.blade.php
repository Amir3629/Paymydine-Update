<div class="row-fluid">
    <div class="container-fluid">
        <!-- Page Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="mb-1">
                    <i class="fa fa-edit text-primary"></i> 
                    Edit KDS Station
                </h3>
                <p class="text-muted mb-0">
                    Modify settings for this Kitchen Display System station
                </p>
            </div>
            <div class="d-flex gap-2">
                @if(isset($formModel) && $formModel->slug)
                <a href="{{ admin_url('kitchendisplay/' . $formModel->slug) }}" class="btn btn-success" target="_blank">
                    <i class="fa fa-external-link"></i> Open KDS
                </a>
                @endif
                <a href="{{ admin_url('kds_stations') }}" class="btn btn-outline-secondary">
                    <i class="fa fa-arrow-left"></i> Back to Stations
                </a>
            </div>
        </div>

        <!-- Form Card -->
        <div class="card">
            <div class="card-body">
                {!! $this->renderForm() !!}
            </div>
        </div>

        <!-- KDS URL Info -->
        @if(isset($formModel) && $formModel->slug)
        <div class="card mt-4 border-primary">
            <div class="card-header bg-primary text-white">
                <h6 class="mb-0"><i class="fa fa-link"></i> KDS Access URL</h6>
            </div>
            <div class="card-body">
                <div class="input-group">
                    <input type="text" class="form-control" id="kds-url" 
                           value="{{ url('admin/kitchendisplay/' . $formModel->slug) }}" 
                           readonly>
                    <button class="btn btn-outline-primary" type="button" onclick="copyKdsUrl()">
                        <i class="fa fa-copy"></i> Copy
                    </button>
                    <a href="{{ admin_url('kitchendisplay/' . $formModel->slug) }}" 
                       class="btn btn-primary" target="_blank">
                        <i class="fa fa-external-link"></i> Open
                    </a>
                </div>
                <small class="text-muted mt-2 d-block">
                    Use this URL on your kitchen display device. Bookmark it for easy access.
                </small>
            </div>
        </div>
        @endif

        <!-- Delete Button -->
        @if(isset($formModel) && $formModel->station_id)
        <div class="card mt-4 border-danger">
            <div class="card-header bg-danger text-white">
                <h6 class="mb-0"><i class="fa fa-trash"></i> Danger Zone</h6>
            </div>
            <div class="card-body">
                <p class="mb-3">Deleting this station will remove it from the system. This action cannot be undone.</p>
                <form action="{{ admin_url('kds_stations/delete/' . $formModel->station_id) }}" method="POST" 
                      onsubmit="return confirm('Are you sure you want to delete this KDS station?');">
                    @csrf
                    <button type="submit" class="btn btn-danger">
                        <i class="fa fa-trash"></i> Delete Station
                    </button>
                </form>
            </div>
        </div>
        @endif
    </div>
</div>

<script>
function copyKdsUrl() {
    const urlInput = document.getElementById('kds-url');
    urlInput.select();
    document.execCommand('copy');
    alert('KDS URL copied to clipboard!');
}
</script>

