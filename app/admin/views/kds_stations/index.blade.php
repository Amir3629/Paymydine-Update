<div class="row-fluid">
    <div class="container-fluid">
        <!-- Page Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="mb-1">
                    <i class="fa fa-tv text-primary"></i> 
                    Manage KDS Stations
                </h3>
                <p class="text-muted mb-0">
                    Create and configure multiple Kitchen Display System stations for different areas (Kitchen, Bar, etc.)
                </p>
            </div>
            <div>
                <a href="{{ admin_url('kds_stations/create') }}" class="btn btn-primary">
                    <i class="fa fa-plus"></i> New KDS Station
                </a>
            </div>
        </div>

        <!-- Info Card -->
        <div class="card mb-4 bg-light border-0">
            <div class="card-body py-3">
                <div class="row">
                    <div class="col-md-4">
                        <div class="d-flex align-items-center">
                            <div class="bg-success text-white rounded-circle p-2 me-3" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                                <i class="fa fa-utensils"></i>
                            </div>
                            <div>
                                <strong>Kitchen Station</strong>
                                <div class="small text-muted">For food preparation</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="d-flex align-items-center">
                            <div class="bg-primary text-white rounded-circle p-2 me-3" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                                <i class="fa fa-glass-martini-alt"></i>
                            </div>
                            <div>
                                <strong>Bar Station</strong>
                                <div class="small text-muted">For drinks & beverages</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="d-flex align-items-center">
                            <div class="bg-warning text-white rounded-circle p-2 me-3" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                                <i class="fa fa-fire"></i>
                            </div>
                            <div>
                                <strong>Custom Stations</strong>
                                <div class="small text-muted">Grill, Desserts, etc.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Stations List -->
        <div class="card">
            <div class="card-body">
                {!! $this->renderList() !!}
            </div>
        </div>

        <!-- Help Section -->
        <div class="card mt-4">
            <div class="card-header">
                <h5 class="mb-0"><i class="fa fa-question-circle"></i> How KDS Stations Work</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <h6><i class="fa fa-check text-success"></i> Setup Steps</h6>
                        <ol class="mb-0">
                            <li>Create a new KDS station (e.g., "Kitchen", "Bar")</li>
                            <li>Assign menu categories to each station</li>
                            <li>Configure which statuses the station can set</li>
                            <li>Open the KDS link on your kitchen/bar display</li>
                        </ol>
                    </div>
                    <div class="col-md-6">
                        <h6><i class="fa fa-info-circle text-primary"></i> How It Works</h6>
                        <ul class="mb-0">
                            <li>Orders are automatically split by category</li>
                            <li>Each station only sees items from their assigned categories</li>
                            <li>Status updates trigger notifications with station name</li>
                            <li>Staff knows which station completed which items</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

