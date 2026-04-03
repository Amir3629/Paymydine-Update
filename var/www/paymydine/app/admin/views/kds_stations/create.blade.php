<div class="row-fluid">
    <div class="container-fluid">
        <!-- Page Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="mb-1">
                    <i class="fa fa-plus-circle text-primary"></i> 
                    Create KDS Station
                </h3>
                <p class="text-muted mb-0">
                    Set up a new Kitchen Display System station for your restaurant
                </p>
            </div>
            <div>
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

        <!-- Tips Card -->
        <div class="card mt-4 bg-light border-0">
            <div class="card-body">
                <h6><i class="fa fa-lightbulb text-warning"></i> Tips for Setting Up Stations</h6>
                <div class="row">
                    <div class="col-md-4">
                        <strong>Kitchen Station</strong>
                        <p class="small text-muted mb-0">Assign food categories like Appetizers, Main Courses, Sides</p>
                    </div>
                    <div class="col-md-4">
                        <strong>Bar Station</strong>
                        <p class="small text-muted mb-0">Assign drink categories like Beverages, Cocktails, Wine</p>
                    </div>
                    <div class="col-md-4">
                        <strong>Specialty Stations</strong>
                        <p class="small text-muted mb-0">Create stations for Grill, Desserts, Sushi, etc.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

