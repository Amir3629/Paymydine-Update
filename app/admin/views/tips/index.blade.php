<div class="row-fluid">
    <div class="container-fluid" style="padding-top: 20px;">
        <!-- Statistics Cards -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card bg-primary text-white" style="border-radius: 12px !important; overflow: hidden;">
                    <div class="card-body">
                        <h5 class="card-title">Total Tips</h5>
                        <h2 class="mb-0">${{ number_format($stats['total'] ?? 0, 2) }}</h2>
                        <small>{{ $stats['count'] ?? 0 }} transactions</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-success text-white" style="border-radius: 12px !important; overflow: hidden;">
                    <div class="card-body">
                        <h5 class="card-title">Cash Tips</h5>
                        <h2 class="mb-0">${{ number_format($stats['cash'] ?? 0, 2) }}</h2>
                        <small>{{ $stats['cash_count'] ?? 0 }} transactions</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-info text-white" style="border-radius: 12px !important; overflow: hidden;">
                    <div class="card-body">
                        <h5 class="card-title">Card Tips</h5>
                        <h2 class="mb-0">${{ number_format($stats['card'] ?? 0, 2) }}</h2>
                        <small>{{ $stats['card_count'] ?? 0 }} transactions</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-secondary text-white" style="border-radius: 12px !important; overflow: hidden;">
                    <div class="card-body">
                        <h5 class="card-title">Selected Date</h5>
                        <h4 class="mb-0">{{ date('M d, Y', strtotime($filterDate)) }}</h4>
                    </div>
                </div>
            </div>
        </div>

        <!-- Date Filter -->
        <div class="row mb-3">
            <div class="col-md-12">
                <form method="GET" action="{{ admin_url('tips') }}" class="form-inline">
                    <div class="form-group mr-3">
                        <label for="date" class="mr-2">Select Date:</label>
                        <input type="date" 
                               name="date" 
                               id="date" 
                               class="form-control" 
                               value="{{ $filterDate }}"
                               onchange="this.form.submit()">
                    </div>
                    <button type="button" 
                            class="btn btn-sm btn-ice-white" 
                            onclick="document.getElementById('date').value='{{ date('Y-m-d') }}'; this.form.submit();">
                        Today
                    </button>
                    <button type="button" 
                            class="btn btn-sm btn-ice-white ml-2" 
                            onclick="document.getElementById('date').value='{{ date('Y-m-d', strtotime('-1 day')) }}'; this.form.submit();">
                        Yesterday
                    </button>
                </form>
            </div>
        </div>

        <!-- Tips List -->
        <div class="panel panel-default">
            <div class="panel-heading">
                <h3 class="panel-title">Shifts & Notes</h3>
            </div>
            <div class="panel-body">
                {!! $this->renderList() !!}
            </div>
        </div>
    </div>
</div>

<style>
    /* Cards with rounded corners - more specific selectors */
    .container-fluid .card,
    .container-fluid .card.bg-primary,
    .container-fluid .card.bg-success,
    .container-fluid .card.bg-info,
    .container-fluid .card.bg-secondary {
        border-radius: 12px !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        transition: transform 0.2s;
        overflow: hidden !important;
    }
    .container-fluid .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
    }
    .container-fluid .card-body {
        border-radius: 12px !important;
    }
    .container-fluid .card-body h2 {
        font-weight: bold;
    }
    
    /* Buttons with rounded corners */
    .btn, .btn-sm, .btn-lg {
        border-radius: 12px !important;
    }
    .btn-ice-white {
        background-color: #f0f8ff;
        border-color: #d0e8ff;
        color: #2c3e50;
        border-radius: 12px !important;
    }
    .btn-ice-white:hover {
        background-color: #e0f0ff;
        border-color: #b0d8ff;
        color: #1a252f;
    }
    
    /* Panels with rounded corners */
    .panel {
        border-radius: 15px !important;
        overflow: hidden;
    }
    .panel-default {
        border-radius: 15px !important;
    }
    .panel-heading {
        border-radius: 15px 15px 0 0 !important;
    }
    
    /* Form inputs with rounded corners */
    .form-control, input[type="date"], input[type="text"], textarea, select {
        border-radius: 10px !important;
    }
    
    /* Table with rounded corners */
    .table, .list-table {
        border-radius: 12px !important;
        overflow: hidden;
    }
    
    /* All boxes and frames */
    .container-fluid, .row, .col-md-3, .col-md-12 {
        border-radius: 12px;
    }
</style>

