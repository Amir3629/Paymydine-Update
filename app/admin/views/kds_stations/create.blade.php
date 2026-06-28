<!-- PMD_KDS_SETTINGS_UI_POLISH_V57_START -->
<style id="pmd-kds-settings-ui-polish-v57">
  .pmd-kds-settings-v57 .card-body {
    padding-top: 22px !important;
  }

  .pmd-kds-settings-v57 .form-group,
  .pmd-kds-settings-v57 .field-container,
  .pmd-kds-settings-v57 .control-group {
    margin-bottom: 24px !important;
  }

  .pmd-kds-settings-v57 label,
  .pmd-kds-settings-v57 .control-label {
    margin-bottom: 8px !important;
    font-weight: 800 !important;
    letter-spacing: .01em !important;
  }

  .pmd-kds-settings-v57 .help-block,
  .pmd-kds-settings-v57 .form-text,
  .pmd-kds-settings-v57 small.text-muted {
    margin-top: 7px !important;
    line-height: 1.35 !important;
  }

  .pmd-kds-settings-v57 textarea {
    min-height: 118px !important;
  }

  .pmd-kds-settings-v57 input[type="text"],
  .pmd-kds-settings-v57 input[type="number"],
  .pmd-kds-settings-v57 select,
  .pmd-kds-settings-v57 .select2-container,
  .pmd-kds-settings-v57 .selectize-control {
    max-width: 840px !important;
  }

  .pmd-kds-settings-v57 input[name*="[slug]"],
  .pmd-kds-settings-v57 input[name="slug"] {
    display: none !important;
  }
</style>
<!-- PMD_KDS_SETTINGS_UI_POLISH_V57_END -->

<div class="row-fluid pmd-kds-settings-v57">
    <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="mb-1"><i class="fa fa-plus-circle text-primary"></i> Create KDS Station</h3>
                <p class="text-muted mb-0">Configure routing, workflow buttons and display behavior for this station.</p>
            </div>
            <a href="{{ admin_url('kds_stations') }}" class="btn btn-outline-secondary">
                <i class="fa fa-arrow-left"></i> Back to Stations
            </a>
        </div>

        <div class="card">
            <div class="card-body">
                {!! $this->renderForm() !!}
            </div>
        </div>
    </div>
</div>
