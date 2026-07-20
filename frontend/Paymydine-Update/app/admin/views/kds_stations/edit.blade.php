
<!-- PMD_KDS_SETTINGS_V143_SERVER_SHELL_START -->
<style id="pmd-kds-settings-v143-server-shell-style">
/* v143: server shell exists before JS, so user never sees old cards swapping into final cards */
.pmd92-server-shell-v143 {
  display: block !important;
}

.pmd92-server-shell-v143 [data-pmd92-slot]:empty {
  min-height: 64px !important;
}

body.pmd-kds-onepage-v92 .pmd92-server-shell-v143 {
  visibility: visible !important;
  opacity: 1 !important;
}

body.pmd-kds-onepage-v92 .pmd-kds-modern-v58 {
  position: absolute !important;
  left: -100000px !important;
  top: auto !important;
  width: 1px !important;
  height: 1px !important;
  overflow: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>
<!-- PMD_KDS_SETTINGS_V143_SERVER_SHELL_END -->


<!-- PMD_KDS_SETTINGS_V138_PREPAINT_FINAL_CSS_START -->
<script id="pmd-kds-settings-v138-prepaint-script">
(function () {
  if (!/^\/admin\/kds_stations\/(create|edit\/\d+)/.test(location.pathname)) return;

  document.documentElement.classList.add('pmd-kds-settings-v138-prepaint');

  function addBodyClasses() {
    if (!document.body) return;
    document.body.classList.add(
      'pmd-kds-modern-body-v58',
      'pmd-kds-onepage-v92',
      'pmd-kds-onepage-v931',
      'pmd-kds-onepage-v95',
      'pmd-kds-settings-v138-prepaint-body'
    );
  }

  addBodyClasses();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addBodyClasses, true);
  }
})();
</script>

<style id="pmd-kds-settings-v138-prepaint-final-css">
/* PMD KDS v138: prepaint final visual baseline.
   No delay, no observer, no hiding. Makes first server paint look like final UI. */

html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] {
  max-width: 1280px !important;
  width: calc(100vw - 190px) !important;
  margin: 24px auto 80px !important;
  padding: 0 10px !important;
  color: #10252c !important;
  box-sizing: border-box !important;
}

html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 *,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] * {
  box-sizing: border-box !important;
  animation: none !important;
  transition-property: background-color, border-color, color, box-shadow !important;
  transition-duration: 120ms !important;
}

/* Kill old tab/card look on first paint */
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .nav-tabs,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .nav-tabs {
  display: none !important;
}

html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .tab-content,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .tab-content {
  border: 0 !important;
  background: transparent !important;
  padding: 0 !important;
  box-shadow: none !important;
}

/* Modern first-paint cards */
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .card,
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .panel,
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .form-widget,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .card,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .panel,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .form-widget {
  border: 1px solid #dbeaf3 !important;
  border-radius: 22px !important;
  background: #ffffff !important;
  box-shadow: 0 18px 45px rgba(20, 45, 55, .08) !important;
  overflow: hidden !important;
}

/* Modern first-paint field spacing */
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .form-group,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .form-group {
  margin-bottom: 18px !important;
  min-width: 0 !important;
}

html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 label,
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .control-label,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] label,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .control-label {
  color: #64748b !important;
  font-size: 12px !important;
  line-height: 1.25 !important;
  font-weight: 900 !important;
  letter-spacing: .06em !important;
  text-transform: uppercase !important;
  margin-bottom: 8px !important;
}

/* Modern first-paint inputs/selects */
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 input,
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 select,
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 textarea,
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .form-control,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] input,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] select,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] textarea,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .form-control {
  min-height: 44px !important;
  border-radius: 14px !important;
  border: 1px solid #dbeaf3 !important;
  background: #ffffff !important;
  color: #10252c !important;
  box-shadow: none !important;
  font-weight: 750 !important;
}

html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 textarea,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] textarea {
  min-height: 96px !important;
}

/* Select plugins before final JS */
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .select2-container,
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .select2-selection,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .select2-container,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .select2-selection {
  min-height: 44px !important;
  border-radius: 14px !important;
}

/* Checkbox/check-card first paint */
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .checkbox,
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .custom-checkbox,
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .pmd-kds-check-card-v58,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .checkbox,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .custom-checkbox,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .pmd-kds-check-card-v58 {
  border-radius: 16px !important;
  border-color: #dbeaf3 !important;
  background: #fbfdff !important;
}

/* Buttons first paint */
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .btn,
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 button,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .btn,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] button {
  min-height: 42px !important;
  border-radius: 14px !important;
  font-weight: 900 !important;
  transform: none !important;
}

/* Prevent old sharp top boxes */
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .card-header,
html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58 .panel-heading,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .card-header,
html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] .panel-heading {
  border: 0 !important;
  background: linear-gradient(135deg,#ffffff 0%,#f8fbfa 100%) !important;
  color: #082f2b !important;
}

/* Mobile */
@media (max-width: 900px) {
  html.pmd-kds-settings-v138-prepaint .pmd-kds-modern-v58,
  html.pmd-kds-settings-v138-prepaint [data-pmd-kds-modern-v58="1"] {
    width: 100% !important;
    max-width: 100% !important;
    margin: 16px 0 70px !important;
    padding: 0 12px !important;
  }
}
</style>
<!-- PMD_KDS_SETTINGS_V138_PREPAINT_FINAL_CSS_END -->

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
                

<!-- PMD_KDS_SETTINGS_V150_SERVER_FIELDS_START -->
@php
    /*
     * v150: render KDS fields directly inside final cards on the server.
     * This avoids the visible empty-card -> appendChild(fields) jump after refresh.
     */
    $pmdKdsFormWidget = $this->widgets['form'] ?? null;
    $pmdKdsServerRenderedOk = false;

    try {
        if ($pmdKdsFormWidget) {
            // Warm up Form widget so getField()/renderField() can work safely.
            $pmdKdsFormWidget->render(['useContainer' => false]);
            $pmdKdsServerRenderedOk = count($pmdKdsFormWidget->getFields()) > 0;
        }
    }
    catch (\Throwable $e) {
        $pmdKdsServerRenderedOk = false;
    }

    $pmdKdsField = function ($name, $classes = '') use ($pmdKdsFormWidget, &$pmdKdsServerRenderedOk) {
        try {
            if (!$pmdKdsServerRenderedOk || !$pmdKdsFormWidget) {
                return '';
            }

            $field = $pmdKdsFormWidget->getField($name);

            if (!$field) {
                return '';
            }

            $existing = isset($field->cssClass) ? (string)$field->cssClass : '';
            $merged = trim($existing.' '.$classes);
            $field->cssClass = trim(implode(' ', array_unique(array_filter(preg_split('/\s+/', $merged)))));

            return $pmdKdsFormWidget->renderField($field);
        }
        catch (\Throwable $e) {
            $pmdKdsServerRenderedOk = false;
            return '';
        }
    };
@endphp
<!-- PMD_KDS_SETTINGS_V150_SERVER_FIELDS_END -->

<div class="pmd92-shell pmd92-server-shell-v143" data-pmd92-server-fields="1">

      <div class="pmd92-top">
        <div class="pmd92-title">
          <h2>Edit KDS Station</h2>
          <p>Configure the station once. Preview, routing, workflow, sound, and display settings stay visible on one page.</p>
        </div>
        <div class="pmd92-save-hint">Use the page save button when finished</div>
      </div>

      <div class="pmd92-layout">
        <div class="pmd92-main">
          <section class="pmd92-card pmd92-card-pad" data-pmd92-section="basics">
            <div class="pmd92-section-head">
              <div class="pmd92-icon">🖥️</div>
              <div>
                <h3>Basic Information</h3>
                <p>Name the station, choose its template, and control whether it receives orders.</p>
              </div>
            </div>
            <div class="pmd92-grid" data-pmd92-slot="basics">
              {!! $pmdKdsField('name', 'pmd-kds-form-field-v58 pmd-kds-field-name-v58 pmd92-field') !!}
              {!! $pmdKdsField('station_type', 'pmd-kds-form-field-v58 pmd-kds-field-station_type-v58 pmd92-field') !!}
              {!! $pmdKdsField('is_active', 'pmd-kds-form-field-v58 pmd-kds-field-is_active-v58 pmd92-field') !!}
              {!! $pmdKdsField('internal_note', 'pmd-kds-form-field-v58 pmd-kds-field-internal_note-v58 pmd92-field pmd92-full') !!}
              {!! $pmdKdsField('description', 'pmd-kds-form-field-v58 pmd-kds-field-description-v58 pmd92-field pmd92-full') !!}
              {!! $pmdKdsField('sort_order', 'pmd-kds-form-field-v58 pmd-kds-field-sort_order-v58 pmd92-field') !!}
              {!! $pmdKdsField('priority', 'pmd-kds-form-field-v58 pmd-kds-field-priority-v58 pmd92-field') !!}
              {!! $pmdKdsField('location_id', 'pmd-kds-form-field-v58 pmd-kds-field-location_id-v58 pmd92-field') !!}
            </div>
          </section>

          <section class="pmd92-card pmd92-card-pad" data-pmd92-section="routing">
            <div class="pmd92-section-head">
              <div class="pmd92-icon blue">🧭</div>
              <div>
                <h3>Routing & Categories</h3>
                <p>Choose which menu categories are routed to this station. Leave empty for all categories.</p>
              </div>
            </div>
            <div class="pmd92-grid one" data-pmd92-slot="routing">
              {!! $pmdKdsField('category_ids', 'pmd-kds-form-field-v58 pmd-kds-field-category_ids-v58 pmd92-field pmd92-full') !!}
            </div>
          </section>

          <section class="pmd92-card pmd92-card-pad" data-pmd92-section="workflow">
            <div class="pmd92-section-head">
              <div class="pmd92-icon gold">⚡</div>
              <div>
                <h3>Workflow & Timing</h3>
                <p>Choose kitchen actions and timing behavior for reservations, pickup warnings, and completed orders.</p>
              </div>
            </div>
            <div class="pmd92-grid" data-pmd92-slot="workflow">
              {!! $pmdKdsField('can_change_status', 'pmd-kds-form-field-v58 pmd-kds-field-can_change_status-v58 pmd92-field') !!}
              {!! $pmdKdsField('show_reservations', 'pmd-kds-form-field-v58 pmd-kds-field-show_reservations-v58 pmd92-field') !!}
              {!! $pmdKdsField('status_ids', 'pmd-kds-form-field-v58 pmd-kds-field-status_ids-v58 pmd92-field pmd92-full') !!}
              {!! $pmdKdsField('reservation_window_minutes', 'pmd-kds-form-field-v58 pmd-kds-field-reservation_window_minutes-v58 pmd92-field') !!}
              {!! $pmdKdsField('ready_pickup_warning_minutes', 'pmd-kds-form-field-v58 pmd-kds-field-ready_pickup_warning_minutes-v58 pmd92-field') !!}
              {!! $pmdKdsField('hide_completed_after_minutes', 'pmd-kds-form-field-v58 pmd-kds-field-hide_completed_after_minutes-v58 pmd92-field') !!}
            </div>
          </section>

          <section class="pmd92-card pmd92-card-pad" data-pmd92-section="display">
            <div class="pmd92-section-head">
              <div class="pmd92-icon">🔔</div>
              <div>
                <h3>Display & Sound</h3>
                <p>Control notifications, refresh speed, screen density, and KDS display limits.</p>
              </div>
            </div>
            <div class="pmd92-grid" data-pmd92-slot="display">
              {!! $pmdKdsField('notification_sound', 'pmd-kds-form-field-v58 pmd-kds-field-notification_sound-v58 pmd92-field') !!}
              {!! $pmdKdsField('sound_enabled', 'pmd-kds-form-field-v58 pmd-kds-field-sound_enabled-v58 pmd92-field') !!}
              {!! $pmdKdsField('refresh_interval_seconds', 'pmd-kds-form-field-v58 pmd-kds-field-refresh_interval_seconds-v58 pmd92-field') !!}
              {!! $pmdKdsField('max_orders', 'pmd-kds-form-field-v58 pmd-kds-field-max_orders-v58 pmd92-field') !!}
              {!! $pmdKdsField('theme_color', 'pmd-kds-form-field-v58 pmd-kds-field-theme_color-v58 pmd92-field') !!}
              {!! $pmdKdsField('display_density', 'pmd-kds-form-field-v58 pmd-kds-field-display_density-v58 pmd92-field') !!}
            </div>
          </section>
        </div>

        <aside class="pmd92-aside">
          <section class="pmd92-card pmd92-card-pad">
            <div class="pmd92-preview-head">
              <h3>Live KDS Preview</h3>
              <span class="pmd92-badge">Preview</span>
            </div>
            <div class="pmd92-preview">
              <div class="pmd92-preview-top">
                <div>
                  <div class="pmd92-preview-title" data-pmd92="name">MAIN KITCHEN</div>
                  <span class="pmd92-badge">12 Orders</span>
                </div>
                <span class="pmd92-badge">● <span data-pmd92="status">Active</span></span>
              </div>
              <div class="pmd92-orders">
                <div class="pmd92-order"><strong>#1054 <em>2m ago</em></strong><span>1x Classic Burger</span><span>1x French Fries</span><span>1x Coke</span><b class="pmd92-time">03:45</b></div>
                <div class="pmd92-order"><strong>#1055 <em>4m ago</em></strong><span>1x Grilled Salmon</span><span>1x Steamed Veggies</span><span>1x Lemon Sauce</span><b class="pmd92-time">05:12</b></div>
                <div class="pmd92-order"><strong>#1056 <em>6m ago</em></strong><span>1x Chicken Pasta</span><span>1x Garlic Bread</span><b class="pmd92-time">06:30</b></div>
              </div>
            </div>
            <p class="pmd92-live-note">● Real-time preview of how orders will appear on this station.</p>
          </section>

          <div class="pmd92-side-grid">
            <section class="pmd92-card pmd92-card-pad">
              <div class="pmd92-section-head">
                <div>
                  <h3>Station Summary</h3>
                </div>
              </div>
              <div class="pmd92-summary-row"><span>Name</span><span data-pmd92="name-plain">Main Kitchen</span></div>
              <div class="pmd92-summary-row"><span>Type</span><span data-pmd92="type">Kitchen / Hot Food</span></div>
              <div class="pmd92-summary-row"><span>Status</span><span data-pmd92="status">Active</span></div>
              <div class="pmd92-summary-row"><span>Categories</span><span data-pmd92="categories">All</span></div>
              <div class="pmd92-summary-row"><span>Workflow</span><span data-pmd92="workflow">Default</span></div>
              <div class="pmd92-summary-row"><span>Sort Order</span><span data-pmd92="sort">0</span></div>
            </section>

            <section class="pmd92-card pmd92-card-pad">
              <div class="pmd92-section-head">
                <div>
                  <h3>AI Suggestions</h3>
                  <p>Recommended station ideas for this setup.</p>
                </div>
              </div>
              <div class="pmd92-suggestion"><span>🍸 Grill / Bar Station</span><span class="pmd92-plus">+</span></div>
              <div class="pmd92-suggestion"><span>🧁 Dessert Station</span><span class="pmd92-plus">+</span></div>
              <div class="pmd92-suggestion"><span>🧾 Expo / Pass Station</span><span class="pmd92-plus">+</span></div>
            </section>
          </div>
        </aside>
      </div>
    
</div>
<div class="pmd-kds-modern-v58" data-pmd-kds-modern-v58="1">
                @if(empty($pmdKdsServerRenderedOk))
                    {!! $this->renderForm() !!}
                @endif
            </div>
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

<!-- PMD_KDS_SETTINGS_MODERN_UI_V58_START -->
<style id="pmd-kds-settings-modern-ui-v58-style">
  body.pmd-kds-modern-body-v58 {
    background:
      radial-gradient(circle at 22% 8%, rgba(16, 185, 129, .075), transparent 30%),
      radial-gradient(circle at 82% 18%, rgba(212, 164, 75, .08), transparent 28%),
      #fbfaf6 !important;
  }

  body.pmd-kds-modern-body-v58 .page-wrapper,
  body.pmd-kds-modern-body-v58 .main-content,
  body.pmd-kds-modern-body-v58 .content-wrapper {
    background: transparent !important;
  }

  body.pmd-kds-modern-body-v58 .container-fluid > .d-flex:first-child,
  body.pmd-kds-modern-body-v58 .container-fluid > .d-flex.justify-content-between {
    margin-bottom: 28px !important;
  }

  body.pmd-kds-modern-body-v58 h3 {
    display: flex;
    align-items: center;
    gap: 18px;
    font-size: 30px !important;
    line-height: 1.12 !important;
    font-weight: 850 !important;
    letter-spacing: -.035em !important;
    color: #082f2a !important;
    margin-bottom: 8px !important;
  }

  body.pmd-kds-modern-body-v58 h3 > i {
    width: 58px !important;
    height: 58px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 20px !important;
    background:
      linear-gradient(145deg, rgba(236, 253, 245, .98), rgba(214, 245, 234, .92)) !important;
    color: #047857 !important;
    box-shadow:
      0 18px 38px rgba(16, 185, 129, .18),
      inset 0 0 0 1px rgba(16, 185, 129, .12) !important;
    font-size: 24px !important;
  }

  body.pmd-kds-modern-body-v58 .container-fluid > .d-flex p.text-muted {
    color: #667085 !important;
    font-size: 15px !important;
    font-weight: 520 !important;
    margin-left: 76px !important;
  }

  body.pmd-kds-modern-body-v58 a.btn,
  body.pmd-kds-modern-body-v58 button.btn {
    border-radius: 14px !important;
    min-height: 44px !important;
    padding: 10px 18px !important;
    font-weight: 750 !important;
    letter-spacing: -.01em !important;
    box-shadow: 0 12px 26px rgba(15, 23, 42, .06) !important;
  }

  body.pmd-kds-modern-body-v58 .btn-success,
  body.pmd-kds-modern-body-v58 .btn-primary {
    background: linear-gradient(135deg, #064e3b, #0f766e) !important;
    border-color: rgba(6, 78, 59, .9) !important;
    color: #fff !important;
  }

  .pmd-kds-modern-card-v58 {
    border: 1px solid rgba(218, 208, 191, .72) !important;
    border-radius: 26px !important;
    background: rgba(255, 255, 255, .88) !important;
    box-shadow:
      0 28px 70px rgba(15, 23, 42, .08),
      0 4px 18px rgba(15, 23, 42, .04) !important;
    overflow: visible !important;
  }

  .pmd-kds-modern-card-v58 > .card-body {
    padding: 26px !important;
  }

  .pmd-kds-modern-v58 {
    position: relative;
    isolation: isolate;
  }

  .pmd-kds-modern-v58 *,
  .pmd-kds-modern-v58 *::before,
  .pmd-kds-modern-v58 *::after {
    box-sizing: border-box;
  }

  .pmd-kds-modern-v58 .nav-tabs,
  .pmd-kds-modern-v58 ul.nav-tabs,
  .pmd-kds-modern-v58 .nav.nav-tabs {
    display: inline-flex !important;
    width: auto !important;
    max-width: 100% !important;
    gap: 4px !important;
    padding: 7px !important;
    margin: 0 0 28px 0 !important;
    border: 1px solid rgba(226, 232, 240, .9) !important;
    border-radius: 18px !important;
    background: rgba(255, 255, 255, .88) !important;
    box-shadow:
      0 16px 38px rgba(15, 23, 42, .07),
      inset 0 1px 0 rgba(255, 255, 255, .9) !important;
  }

  .pmd-kds-modern-v58 .nav-tabs::before,
  .pmd-kds-modern-v58 .nav-tabs::after {
    display: none !important;
  }

  .pmd-kds-modern-v58 .nav-tabs > li,
  .pmd-kds-modern-v58 .nav-tabs .nav-item {
    margin: 0 !important;
  }

  .pmd-kds-modern-v58 .nav-tabs a,
  .pmd-kds-modern-v58 .nav-tabs .nav-link,
  .pmd-kds-modern-v58 .nav-tabs button {
    border: 0 !important;
    border-radius: 14px !important;
    padding: 12px 30px !important;
    min-height: 44px !important;
    color: #475569 !important;
    font-weight: 800 !important;
    letter-spacing: -.012em !important;
    background: transparent !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 9px !important;
    transition: all .18s ease !important;
  }

  .pmd-kds-modern-v58 .nav-tabs a:hover,
  .pmd-kds-modern-v58 .nav-tabs .nav-link:hover,
  .pmd-kds-modern-v58 .nav-tabs button:hover {
    background: rgba(236, 253, 245, .8) !important;
    color: #064e3b !important;
  }

  .pmd-kds-modern-v58 .nav-tabs li.active > a,
  .pmd-kds-modern-v58 .nav-tabs .active,
  .pmd-kds-modern-v58 .nav-tabs .nav-link.active {
    background: linear-gradient(180deg, rgba(240, 253, 244, .98), rgba(255, 255, 255, .96)) !important;
    color: #065f46 !important;
    box-shadow:
      0 10px 24px rgba(16, 185, 129, .14),
      inset 0 -3px 0 #10b981 !important;
  }

  .pmd-kds-tab-icon-v58,
  .pmd-kds-field-icon-v58,
  .pmd-kds-check-icon-v58 {
    flex: 0 0 auto;
  }

  .pmd-kds-tab-icon-v58 svg,
  .pmd-kds-field-icon-v58 svg,
  .pmd-kds-check-icon-v58 svg {
    width: 18px;
    height: 18px;
    display: block;
    stroke-width: 2.1;
  }

  .pmd-kds-modern-v58 .tab-content,
  .pmd-kds-modern-v58 .tab-pane,
  .pmd-kds-modern-v58 .form-fields,
  .pmd-kds-modern-v58 fieldset {
    min-height: 0 !important;
    height: auto !important;
  }

  .pmd-kds-modern-v58 .tab-pane {
    padding-top: 4px !important;
  }

  .pmd-kds-modern-v58 .form-group {
    min-height: 0 !important;
    margin: 0 0 26px 0 !important;
  }

  .pmd-kds-modern-v58 .form-group:empty,
  .pmd-kds-modern-v58 .pmd-kds-hidden-v58 {
    display: none !important;
    height: 0 !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-form-field-v58 {
    position: relative !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-has-icon-v58 {
    padding-left: 70px !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-field-icon-v58 {
    position: absolute !important;
    left: 0 !important;
    top: 4px !important;
    width: 46px !important;
    height: 46px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 15px !important;
    box-shadow:
      0 16px 30px rgba(15, 23, 42, .08),
      inset 0 0 0 1px rgba(255, 255, 255, .7) !important;
    pointer-events: none !important;
  }

  .pmd-kds-modern-v58 .tone-mint { background: #e9fff5 !important; color: #059669 !important; }
  .pmd-kds-modern-v58 .tone-blue { background: #eaf5ff !important; color: #1d75d8 !important; }
  .pmd-kds-modern-v58 .tone-green { background: #e9fbea !important; color: #16a34a !important; }
  .pmd-kds-modern-v58 .tone-purple { background: #f1eaff !important; color: #7c3aed !important; }
  .pmd-kds-modern-v58 .tone-gold { background: #fff5db !important; color: #c48717 !important; }
  .pmd-kds-modern-v58 .tone-orange { background: #fff0e2 !important; color: #ea580c !important; }

  .pmd-kds-modern-v58 label {
    color: #0f1f24 !important;
    font-weight: 850 !important;
    letter-spacing: -.012em !important;
  }

  .pmd-kds-modern-v58 .form-text,
  .pmd-kds-modern-v58 small,
  .pmd-kds-modern-v58 .help-block,
  .pmd-kds-modern-v58 .text-muted {
    color: #6b7280 !important;
    font-weight: 520 !important;
    line-height: 1.55 !important;
  }

  .pmd-kds-modern-v58 input.form-control,
  .pmd-kds-modern-v58 textarea.form-control,
  .pmd-kds-modern-v58 select.form-control,
  .pmd-kds-modern-v58 .select2-selection,
  .pmd-kds-modern-v58 .select2-container--default .select2-selection--single,
  .pmd-kds-modern-v58 .select2-container--default .select2-selection--multiple {
    border-radius: 16px !important;
    border: 1px solid #dde7ef !important;
    background: rgba(255, 255, 255, .98) !important;
    min-height: 50px !important;
    box-shadow:
      0 12px 26px rgba(15, 23, 42, .045),
      inset 0 1px 0 rgba(255, 255, 255, .9) !important;
    color: #0f172a !important;
    font-weight: 620 !important;
    transition: all .16s ease !important;
  }

  .pmd-kds-modern-v58 input.form-control:focus,
  .pmd-kds-modern-v58 textarea.form-control:focus,
  .pmd-kds-modern-v58 select.form-control:focus,
  .pmd-kds-modern-v58 .select2-container--focus .select2-selection {
    border-color: rgba(16, 185, 129, .65) !important;
    box-shadow:
      0 0 0 4px rgba(16, 185, 129, .11),
      0 16px 32px rgba(15, 23, 42, .055) !important;
  }

  .pmd-kds-modern-v58 textarea.form-control {
    min-height: 110px !important;
    resize: vertical !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-field-description-v58 textarea.form-control {
    min-height: 86px !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-field-category_ids-v58,
  .pmd-kds-modern-v58 .pmd-kds-field-status_ids-v58 {
    padding: 24px !important;
    border: 1px solid rgba(226, 232, 240, .95) !important;
    border-radius: 22px !important;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, .96), rgba(255, 255, 255, .88)) !important;
    box-shadow:
      0 22px 50px rgba(15, 23, 42, .055),
      inset 0 1px 0 rgba(255, 255, 255, .9) !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-field-category_ids-v58.pmd-kds-has-icon-v58,
  .pmd-kds-modern-v58 .pmd-kds-field-status_ids-v58.pmd-kds-has-icon-v58 {
    padding-left: 86px !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-check-grid-v58,
  .pmd-kds-modern-v58 .pmd-kds-check-grid-host-v58 .checkboxlist,
  .pmd-kds-modern-v58 .pmd-kds-check-grid-host-v58 .field-checkboxlist,
  .pmd-kds-modern-v58 .pmd-kds-check-grid-host-v58 .control-checkboxlist,
  .pmd-kds-modern-v58 .pmd-kds-check-grid-host-v58 ul {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)) !important;
    gap: 14px !important;
    list-style: none !important;
    padding: 0 !important;
    margin: 16px 0 0 0 !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-check-card-v58 {
    position: relative !important;
    min-height: 58px !important;
    border: 1px solid #e4ebf2 !important;
    border-radius: 16px !important;
    background: rgba(255, 255, 255, .96) !important;
    box-shadow: 0 14px 30px rgba(15, 23, 42, .045) !important;
    padding: 16px 52px 16px 54px !important;
    display: flex !important;
    align-items: center !important;
    color: #17212b !important;
    font-weight: 780 !important;
    cursor: pointer !important;
    transition: all .16s ease !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-check-card-v58:hover {
    transform: translateY(-1px);
    border-color: rgba(16, 185, 129, .35) !important;
    box-shadow: 0 18px 38px rgba(15, 23, 42, .075) !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-check-card-v58.is-checked {
    background: linear-gradient(180deg, rgba(240, 253, 244, .98), rgba(255, 255, 255, .96)) !important;
    border-color: rgba(16, 185, 129, .42) !important;
    box-shadow:
      0 18px 36px rgba(16, 185, 129, .12),
      inset 0 0 0 1px rgba(16, 185, 129, .12) !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-check-card-v58 input[type="checkbox"] {
    position: absolute !important;
    right: 18px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    width: 18px !important;
    height: 18px !important;
    margin: 0 !important;
    accent-color: #10b981 !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-check-icon-v58 {
    position: absolute !important;
    left: 18px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    width: 24px !important;
    height: 24px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: #0f766e !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-check-card-v58 label,
  .pmd-kds-modern-v58 label.pmd-kds-check-card-v58 {
    margin: 0 !important;
  }

  .pmd-kds-modern-v58 .custom-switch,
  .pmd-kds-modern-v58 .switch,
  .pmd-kds-modern-v58 .field-switch {
    min-height: 34px !important;
  }

  .pmd-kds-modern-v58 .pmd-kds-soft-note-v58 {
    margin-top: 18px;
    padding: 16px 18px;
    border-radius: 18px;
    border: 1px solid rgba(16, 185, 129, .18);
    background: linear-gradient(135deg, rgba(236, 253, 245, .86), rgba(255, 255, 255, .8));
    color: #31524c;
    font-weight: 650;
  }

  .pmd-kds-modern-v58 .form-buttons,
  .pmd-kds-modern-v58 .form-actions,
  .pmd-kds-modern-v58 .card-footer {
    border-radius: 20px !important;
    background: rgba(255, 251, 235, .74) !important;
    border: 1px solid rgba(226, 206, 166, .6) !important;
    padding: 18px !important;
    margin-top: 26px !important;
  }

  @media (min-width: 1180px) {
    .pmd-kds-modern-v58 .pmd-kds-field-name-v58,
    .pmd-kds-modern-v58 .pmd-kds-field-station_type-v58,
    .pmd-kds-modern-v58 .pmd-kds-field-is_active-v58,
    .pmd-kds-modern-v58 .pmd-kds-field-priority-v58,
    .pmd-kds-modern-v58 .pmd-kds-field-location_id-v58 {
      max-width: 760px;
    }

    .pmd-kds-modern-v58 .pmd-kds-field-description-v58 {
      max-width: 100%;
    }
  }

  @media (max-width: 900px) {
    .pmd-kds-modern-v58 .pmd-kds-has-icon-v58 {
      padding-left: 0 !important;
      padding-top: 58px !important;
    }

    .pmd-kds-modern-v58 .pmd-kds-field-icon-v58 {
      left: 0 !important;
      top: 0 !important;
    }

    .pmd-kds-modern-v58 .nav-tabs,
    .pmd-kds-modern-v58 ul.nav-tabs,
    .pmd-kds-modern-v58 .nav.nav-tabs {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      width: 100% !important;
    }

    .pmd-kds-modern-v58 .nav-tabs a,
    .pmd-kds-modern-v58 .nav-tabs .nav-link,
    .pmd-kds-modern-v58 .nav-tabs button {
      justify-content: center !important;
      padding: 12px 14px !important;
    }
  }
</style>

<script id="pmd-kds-settings-modern-ui-v58-script">
(function () {
  'use strict';

  if (window.PMDKdsSettingsModernUIV58Started) return;
  window.PMDKdsSettingsModernUIV58Started = true;

  var ROOT_SELECTOR = '[data-pmd-kds-modern-v58="1"]';

  var svg = {
    monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    routing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/><path d="M18 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/><path d="M9 8h3a4 4 0 0 1 4 4v1"/></svg>',
    workflow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z"/></svg>',
    display: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M9 21h6M12 17v4"/></svg>',
    station: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16v10H4z"/><path d="M8 21h8M12 17v4"/><path d="M8 11h2M14 11h2"/></svg>',
    type: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 3v18M10 3v18M18 4v7a4 4 0 0 1-4 4h-1"/></svg>',
    active: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6 9 17l-5-5"/><path d="M4 6h7M13 18h7"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4M9 12h6M9 16h4"/></svg>',
    sort: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 6h12M4 6h1M4 12h12M19 12h1M8 18h12M4 18h1"/></svg>',
    location: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    categories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><path d="M14 17h6M17 14v6"/></svg>',
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 9v6h4l5 4V5L9 9H5Z"/><path d="M17 9a4 4 0 0 1 0 6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    color: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="8" cy="13" r="2"/><circle cx="16" cy="15" r="3"/><path d="M5 5c6-4 15 1 14 8-.8 6.2-8.5 9.5-13 5-4-4-5-10 1-13"/></svg>',
    density: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 7h14M5 12h14M5 17h14"/></svg>',
    defaultIcon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>'
  };

  var fieldSpecs = [
    { key: 'name', rx: /Station Name/i, icon: 'station', tone: 'mint' },
    { key: 'station_type', rx: /Station Type/i, icon: 'type', tone: 'blue' },
    { key: 'is_active', rx: /^Active$/i, icon: 'active', tone: 'green' },
    { key: 'description', rx: /Internal Note|Description/i, icon: 'note', tone: 'purple' },
    { key: 'priority', rx: /Sort Order|Display Priority/i, icon: 'sort', tone: 'gold' },
    { key: 'location_id', rx: /^Location$/i, icon: 'location', tone: 'blue' },
    { key: 'category_ids', rx: /Assigned Menu Categories/i, icon: 'categories', tone: 'mint', checkGrid: true },
    { key: 'can_change_status', rx: /Allow KDS Buttons|Allow KDS Status Buttons/i, icon: 'workflow', tone: 'green' },
    { key: 'status_ids', rx: /Allowed KDS Buttons|KDS Action Buttons/i, icon: 'workflow', tone: 'gold', checkGrid: true },
    { key: 'show_reservations', rx: /Show Reservations Counter/i, icon: 'clock', tone: 'green' },
    { key: 'reservation_window_minutes', rx: /Reservation Window/i, icon: 'clock', tone: 'gold' },
    { key: 'ready_pickup_timeout_minutes', rx: /Ready Pickup Warning/i, icon: 'clock', tone: 'orange' },
    { key: 'auto_hide_completed_minutes', rx: /Hide Completed/i, icon: 'clock', tone: 'purple' },
    { key: 'notification_sound', rx: /Notification Sound/i, icon: 'sound', tone: 'mint' },
    { key: 'sound_enabled', rx: /Sound Enabled/i, icon: 'sound', tone: 'green' },
    { key: 'refresh_interval', rx: /Refresh Interval/i, icon: 'clock', tone: 'blue' },
    { key: 'order_limit', rx: /Max Orders/i, icon: 'display', tone: 'purple' },
    { key: 'theme_color', rx: /Accent Color/i, icon: 'color', tone: 'gold' },
    { key: 'display_density', rx: /Display Density/i, icon: 'density', tone: 'blue' }
  ];

  function textOf(el) {
    return (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function labelText(group) {
    var label = group.querySelector('label');
    return textOf(label);
  }

  function safeClass(key) {
    return 'pmd-kds-field-' + key.replace(/[^a-z0-9_]+/gi, '_') + '-v58';
  }

  function addIcon(group, spec) {
    if (group.querySelector(':scope > .pmd-kds-field-icon-v58')) return;

    var badge = document.createElement('span');
    badge.className = 'pmd-kds-field-icon-v58 tone-' + (spec.tone || 'mint');
    badge.innerHTML = svg[spec.icon] || svg.defaultIcon;
    group.insertBefore(badge, group.firstChild);
    group.classList.add('pmd-kds-has-icon-v58');
  }

  function iconForText(label) {
    var t = (label || '').toLowerCase();
    if (t.indexOf('drink') >= 0 || t.indexOf('bar') >= 0) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 3h12l-1 8a5 5 0 0 1-10 0L6 3Z"/><path d="M12 16v5M9 21h6"/></svg>';
    if (t.indexOf('dessert') >= 0 || t.indexOf('cake') >= 0) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 14h16v6H4z"/><path d="M6 10h12v4H6z"/><path d="M8 10V7M12 10V7M16 10V7"/></svg>';
    if (t.indexOf('breakfast') >= 0 || t.indexOf('brunch') >= 0) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></svg>';
    if (t.indexOf('special') >= 0) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>';
    if (t.indexOf('main') >= 0 || t.indexOf('course') >= 0 || t.indexOf('kitchen') >= 0) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 17h16"/><path d="M6 17a6 6 0 0 1 12 0"/><path d="M12 7V5"/><path d="M4 19h16"/></svg>';
    if (t.indexOf('test') >= 0) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10 2v6L5 19a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3L14 8V2"/><path d="M8 2h8"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 11h16M6 11a6 6 0 0 1 12 0M8 15h8M7 19h10"/></svg>';
  }

  function checkboxItem(input) {
    var label = null;
    if (input.id) {
      try {
        label = document.querySelector('label[for="' + input.id.replace(/"/g, '\\"') + '"]');
      } catch (e) {}
    }

    return input.closest('label') ||
           input.closest('.custom-control') ||
           input.closest('.form-check') ||
           input.closest('.checkbox') ||
           input.closest('li') ||
           label ||
           input.parentElement;
  }

  function refreshCheckboxCard(input, item) {
    if (!item) return;
    item.classList.toggle('is-checked', !!input.checked);
  }

  function styleCheckboxes(group) {
    group.classList.add('pmd-kds-check-grid-host-v58');

    var list =
      group.querySelector('.checkboxlist') ||
      group.querySelector('.field-checkboxlist') ||
      group.querySelector('.control-checkboxlist') ||
      group.querySelector('ul') ||
      group;

    list.classList.add('pmd-kds-check-grid-v58');

    Array.prototype.forEach.call(group.querySelectorAll('input[type="checkbox"]'), function (input) {
      var item = checkboxItem(input);
      if (!item) return;

      item.classList.add('pmd-kds-check-card-v58');

      if (!item.querySelector('.pmd-kds-check-icon-v58')) {
        var icon = document.createElement('span');
        icon.className = 'pmd-kds-check-icon-v58';
        icon.innerHTML = iconForText(textOf(item));
        item.insertBefore(icon, item.firstChild);
      }

      refreshCheckboxCard(input, item);

      if (!input.dataset.pmdKdsV58ChangeBound) {
        input.dataset.pmdKdsV58ChangeBound = '1';
        input.addEventListener('change', function () {
          refreshCheckboxCard(input, item);
        });
      }
    });
  }

  function addTabIcons(root) {
    var tabIcon = {
      general: svg.monitor,
      routing: svg.routing,
      workflow: svg.workflow,
      display: svg.display
    };

    Array.prototype.forEach.call(root.querySelectorAll('.nav-tabs a, .nav-tabs button, .nav-tabs .nav-link'), function (tab) {
      if (tab.querySelector('.pmd-kds-tab-icon-v58')) return;

      var t = textOf(tab).toLowerCase();
      var key = null;

      if (t.indexOf('general') >= 0) key = 'general';
      else if (t.indexOf('routing') >= 0) key = 'routing';
      else if (t.indexOf('workflow') >= 0) key = 'workflow';
      else if (t.indexOf('display') >= 0) key = 'display';

      if (!key) return;

      var icon = document.createElement('span');
      icon.className = 'pmd-kds-tab-icon-v58';
      icon.innerHTML = tabIcon[key];
      tab.insertBefore(icon, tab.firstChild);
    });
  }

  function modernize() {
    var root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;

    document.body.classList.add('pmd-kds-modern-body-v58');

    var card = root.closest('.card');
    if (card) card.classList.add('pmd-kds-modern-card-v58');

    addTabIcons(root);

    var groups = Array.prototype.slice.call(root.querySelectorAll('.form-group, .field-section, .field-row'));

    groups.forEach(function (group) {
      var txt = labelText(group) || textOf(group).slice(0, 140);

      if (/URL Slug|System URL Slug/i.test(txt)) {
        group.classList.add('pmd-kds-hidden-v58');
        return;
      }

      for (var i = 0; i < fieldSpecs.length; i++) {
        var spec = fieldSpecs[i];
        if (spec.rx.test(txt)) {
          group.classList.add('pmd-kds-form-field-v58');
          group.classList.add(safeClass(spec.key));
          addIcon(group, spec);

          if (spec.checkGrid) styleCheckboxes(group);
          break;
        }
      }
    });

    window.PMDKdsSettingsModernUIV58 = {
      active: true,
      version: 'v58',
      path: location.pathname,
      enhancedFields: root.querySelectorAll('.pmd-kds-form-field-v58').length,
      checkboxCards: root.querySelectorAll('.pmd-kds-check-card-v58').length
    };
  }

  function schedule() {
    modernize();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule);
  } else {
    schedule();
  }

  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('.nav-tabs a, .nav-tabs button, .nav-tabs .nav-link')) {
    }
  }, true);

  console.info('[PMD] KDS settings modern UI v58 active');
})();
</script>
<!-- PMD_KDS_SETTINGS_MODERN_UI_V58_END -->


<!-- PMD_KDS_SETTINGS_CLEAN_ONEPAGE_V92_START -->
<style id="pmd-kds-settings-clean-onepage-v92-style">
body.pmd-kds-onepage-v92 {
  --pmd92-ink: #082f2b;
  --pmd92-text: #10252c;
  --pmd92-muted: #66778c;
  --pmd92-line: #dbeaf3;
  --pmd92-soft: #f8fbfa;
  --pmd92-mint: #e9fff4;
  --pmd92-green: #16a37a;
  --pmd92-gold: #c9953b;
  --pmd92-shadow: 0 18px 45px rgba(20, 45, 55, .08);
}

body.pmd-kds-onepage-v92 .pmd-kds-modern-v58 {
  display: none !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell,
body.pmd-kds-onepage-v92 .pmd92-shell * {
  box-sizing: border-box !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell {
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
  padding: 18px;
  color: var(--pmd92-text);
}

body.pmd-kds-onepage-v92 .pmd92-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

body.pmd-kds-onepage-v92 .pmd92-title h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--pmd92-ink);
}

body.pmd-kds-onepage-v92 .pmd92-title p {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 700;
  color: var(--pmd92-muted);
}

body.pmd-kds-onepage-v92 .pmd92-save-hint {
  padding: 10px 14px;
  border: 1px solid var(--pmd92-line);
  border-radius: 14px;
  background: #fff;
  font-size: 13px;
  font-weight: 800;
  color: var(--pmd92-muted);
  white-space: nowrap;
}

body.pmd-kds-onepage-v92 .pmd92-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 22px;
  align-items: start;
}

body.pmd-kds-onepage-v92 .pmd92-main {
  display: grid;
  gap: 18px;
  min-width: 0;
}

body.pmd-kds-onepage-v92 .pmd92-aside {
  display: grid;
  gap: 18px;
  position: sticky;
  top: 88px;
  min-width: 0;
}

body.pmd-kds-onepage-v92 .pmd92-card {
  background: rgba(255, 255, 255, .94);
  border: 1px solid var(--pmd92-line);
  border-radius: 22px;
  box-shadow: var(--pmd92-shadow);
  overflow: hidden;
}

body.pmd-kds-onepage-v92 .pmd92-card-pad {
  padding: 22px;
}

body.pmd-kds-onepage-v92 .pmd92-section-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 18px;
}

body.pmd-kds-onepage-v92 .pmd92-icon {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  font-size: 22px;
  background: var(--pmd92-mint);
  color: var(--pmd92-green);
  box-shadow: 0 12px 30px rgba(22, 163, 122, .12);
}

body.pmd-kds-onepage-v92 .pmd92-icon.gold {
  background: #fff3d7;
  color: #d29226;
}

body.pmd-kds-onepage-v92 .pmd92-icon.blue {
  background: #eaf4ff;
  color: #1d75d4;
}

body.pmd-kds-onepage-v92 .pmd92-section-head h3 {
  margin: 0;
  color: var(--pmd92-ink);
  font-size: 25px;
  line-height: 1.08;
  font-weight: 950;
  letter-spacing: -0.04em;
}

body.pmd-kds-onepage-v92 .pmd92-section-head p {
  margin: 7px 0 0;
  color: var(--pmd92-muted);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.45;
}

body.pmd-kds-onepage-v92 .pmd92-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 22px;
  align-items: start;
}

body.pmd-kds-onepage-v92 .pmd92-grid.one {
  grid-template-columns: 1fr;
}

body.pmd-kds-onepage-v92 .pmd92-full {
  grid-column: 1 / -1;
}

/* field reset */
body.pmd-kds-onepage-v92 .pmd92-shell .pmd-kds-form-field-v58 {
  position: relative !important;
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  overflow: visible !important;
  grid-column: auto !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell .pmd-kds-field-icon-v58,
body.pmd-kds-onepage-v92 .pmd92-shell [class*="field-icon"] {
  display: none !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell label,
body.pmd-kds-onepage-v92 .pmd92-shell .control-label {
  display: block !important;
  margin: 0 0 9px !important;
  padding: 0 !important;
  color: var(--pmd92-text) !important;
  font-size: 13px !important;
  line-height: 1.25 !important;
  font-weight: 900 !important;
  letter-spacing: -0.01em !important;
  text-decoration: none !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell input[type="text"],
body.pmd-kds-onepage-v92 .pmd92-shell input[type="number"],
body.pmd-kds-onepage-v92 .pmd92-shell select,
body.pmd-kds-onepage-v92 .pmd92-shell textarea {
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  height: 52px !important;
  min-height: 52px !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 16px !important;
  border: 1px solid var(--pmd92-line) !important;
  border-radius: 15px !important;
  background: #fff !important;
  color: var(--pmd92-text) !important;
  font-size: 14px !important;
  line-height: 50px !important;
  font-weight: 800 !important;
  box-shadow: 0 8px 22px rgba(20, 45, 55, .04) !important;
  outline: none !important;
  overflow: visible !important;
  appearance: auto !important;
  -webkit-appearance: auto !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell textarea {
  height: 92px !important;
  min-height: 92px !important;
  padding: 14px 16px !important;
  line-height: 1.45 !important;
  resize: vertical !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell input:focus,
body.pmd-kds-onepage-v92 .pmd92-shell select:focus,
body.pmd-kds-onepage-v92 .pmd92-shell textarea:focus {
  border-color: rgba(22, 163, 122, .6) !important;
  box-shadow: 0 0 0 4px rgba(22, 163, 122, .12) !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell .help-block,
body.pmd-kds-onepage-v92 .pmd92-shell .form-text,
body.pmd-kds-onepage-v92 .pmd92-shell small,
body.pmd-kds-onepage-v92 .pmd92-shell .text-muted,
body.pmd-kds-onepage-v92 .pmd92-shell .field-help {
  display: block !important;
  position: static !important;
  margin: 8px 0 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  color: var(--pmd92-muted) !important;
  font-size: 12px !important;
  line-height: 1.45 !important;
  font-weight: 750 !important;
  overflow: visible !important;
  transform: none !important;
}

/* kill select plugin ghosts */
body.pmd-kds-onepage-v92 .pmd92-shell .selectonic,
body.pmd-kds-onepage-v92 .pmd92-shell .selectonic-input,
body.pmd-kds-onepage-v92 .pmd92-shell .select2-container,
body.pmd-kds-onepage-v92 .pmd92-shell .chosen-container,
body.pmd-kds-onepage-v92 .pmd92-shell .selectize-control,
body.pmd-kds-onepage-v92 .pmd92-shell .ts-wrapper,
body.pmd-kds-onepage-v92 .pmd92-shell .choices,
body.pmd-kds-onepage-v92 .pmd92-shell .bootstrap-select,
body.pmd-kds-onepage-v92 .pmd92-shell [class*="selectonic"]:not(select),
body.pmd-kds-onepage-v92 .pmd92-shell [class*="select2"]:not(select),
body.pmd-kds-onepage-v92 .pmd92-shell [class*="chosen"]:not(select),
body.pmd-kds-onepage-v92 .pmd92-shell [class*="selectize"]:not(select) {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

/* station type tiles */
body.pmd-kds-onepage-v92 .pmd92-type-tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

body.pmd-kds-onepage-v92 .pmd92-type-tile {
  min-height: 74px;
  border: 1px solid var(--pmd92-line);
  border-radius: 16px;
  background: #fff;
  display: grid;
  place-items: center;
  gap: 4px;
  padding: 8px;
  font-weight: 900;
  color: var(--pmd92-text);
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(20, 45, 55, .04);
  transition: .16s ease;
}

body.pmd-kds-onepage-v92 .pmd92-type-tile b {
  font-size: 13px;
}

body.pmd-kds-onepage-v92 .pmd92-type-tile span {
  font-size: 22px;
  line-height: 1;
}

body.pmd-kds-onepage-v92 .pmd92-type-tile.is-active {
  border-color: rgba(22, 163, 122, .65);
  background: linear-gradient(90deg, #eafff4, #fff);
  box-shadow: 0 12px 28px rgba(22, 163, 122, .14);
}

/* compact switches */
body.pmd-kds-onepage-v92 .pmd92-shell .switch-field .form-check,
body.pmd-kds-onepage-v92 .pmd92-shell .switch-field .form-switch {
  display: inline-flex !important;
  align-items: center !important;
  gap: 12px !important;
  width: auto !important;
  min-width: 0 !important;
  max-width: max-content !important;
  height: auto !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell .switch-field input[type="checkbox"] {
  width: 44px !important;
  height: 24px !important;
  min-width: 44px !important;
  margin: 0 !important;
  cursor: pointer !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell .switch-field .form-check-label,
body.pmd-kds-onepage-v92 .pmd92-shell .switch-field label.form-check-label {
  display: inline-block !important;
  margin: 0 !important;
  color: var(--pmd92-text) !important;
  font-size: 14px !important;
  font-weight: 900 !important;
}

/* check grids */
body.pmd-kds-onepage-v92 .pmd92-shell .checkboxlist-field {
  grid-column: 1 / -1 !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell .checkboxlist-field .form-check {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 54px !important;
  margin: 0 !important;
  padding: 12px 14px !important;
  border: 1px solid var(--pmd92-line) !important;
  border-radius: 15px !important;
  background: #fff !important;
  color: var(--pmd92-text) !important;
  box-shadow: 0 8px 22px rgba(20,45,55,.04) !important;
  overflow: hidden !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell .checkboxlist-field .form-check.is-checked,
body.pmd-kds-onepage-v92 .pmd92-shell .checkboxlist-field .form-check:has(input:checked) {
  border-color: rgba(22, 163, 122, .65) !important;
  background: linear-gradient(90deg, #eafff4, #fff) !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell .checkboxlist-field .form-check label,
body.pmd-kds-onepage-v92 .pmd92-shell .checkboxlist-field .form-check .form-check-label {
  display: block !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
  margin: 0 !important;
  font-size: 13px !important;
  font-weight: 900 !important;
  line-height: 1.25 !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
}

body.pmd-kds-onepage-v92 .pmd92-shell .checkboxlist-field input[type="checkbox"] {
  flex: 0 0 auto !important;
  width: 20px !important;
  height: 20px !important;
  margin: 0 !important;
  position: static !important;
}

body.pmd-kds-onepage-v92 .pmd92-check-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));
  gap: 12px;
}

/* preview */
body.pmd-kds-onepage-v92 .pmd92-preview-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

body.pmd-kds-onepage-v92 .pmd92-preview-head h3 {
  margin: 0;
  color: var(--pmd92-ink);
  font-size: 24px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

body.pmd-kds-onepage-v92 .pmd92-preview {
  background: #111820;
  border-radius: 18px;
  padding: 18px;
  color: #fff;
  overflow: hidden;
}

body.pmd-kds-onepage-v92 .pmd92-preview-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

body.pmd-kds-onepage-v92 .pmd92-preview-title {
  color: #4ade80;
  font-size: 22px;
  font-weight: 950;
  letter-spacing: .03em;
}

body.pmd-kds-onepage-v92 .pmd92-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 7px 11px;
  background: rgba(74, 222, 128, .14);
  color: #66f0a3;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

body.pmd-kds-onepage-v92 .pmd92-orders {
  display: grid;
  grid-template-columns: repeat(3, minmax(145px, 1fr));
  gap: 12px;
  overflow: hidden;
}

body.pmd-kds-onepage-v92 .pmd92-order {
  background: #1c2630;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 13px;
  padding: 13px;
  min-width: 0;
}

body.pmd-kds-onepage-v92 .pmd92-order strong {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: #fff;
  font-size: 13px;
  margin-bottom: 10px;
}

body.pmd-kds-onepage-v92 .pmd92-order span {
  display: block;
  color: #d7dee6;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.5;
}

body.pmd-kds-onepage-v92 .pmd92-time {
  display: inline-block;
  margin-top: 10px;
  border-radius: 8px;
  padding: 5px 8px;
  background: rgba(201, 149, 59, .28);
  color: #ffd56a;
  font-weight: 900;
  font-size: 12px;
}

body.pmd-kds-onepage-v92 .pmd92-live-note {
  margin: 10px 0 0;
  color: var(--pmd92-muted);
  font-size: 12px;
  font-weight: 800;
}

body.pmd-kds-onepage-v92 .pmd92-side-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

body.pmd-kds-onepage-v92 .pmd92-summary-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(219,234,243,.7);
  font-size: 13px;
  font-weight: 850;
}

body.pmd-kds-onepage-v92 .pmd92-summary-row:last-child {
  border-bottom: 0;
}

body.pmd-kds-onepage-v92 .pmd92-summary-row span:first-child {
  color: var(--pmd92-muted);
}

body.pmd-kds-onepage-v92 .pmd92-summary-row span:last-child {
  color: var(--pmd92-text);
  text-align: right;
}

body.pmd-kds-onepage-v92 .pmd92-suggestion {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid rgba(219,234,243,.9);
  font-size: 13px;
  font-weight: 900;
}

body.pmd-kds-onepage-v92 .pmd92-suggestion:last-child {
  border-bottom: 0;
}

body.pmd-kds-onepage-v92 .pmd92-plus {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(22,163,122,.35);
  color: var(--pmd92-green);
  font-size: 18px;
  font-weight: 900;
}

body.pmd-kds-onepage-v92 .pmd92-color-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

body.pmd-kds-onepage-v92 .pmd92-color-chip {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 3px solid #fff;
  box-shadow: 0 0 0 1px rgba(16,37,44,.12), 0 8px 18px rgba(16,37,44,.08);
  cursor: pointer;
}

body.pmd-kds-onepage-v92 .pmd92-color-chip.is-active {
  box-shadow: 0 0 0 3px rgba(22,163,122,.25), 0 8px 18px rgba(16,37,44,.08);
}

body.pmd-kds-onepage-v92 .pmd92-hidden {
  display: none !important;
}

/* responsive */
@media (max-width: 1380px) {
  body.pmd-kds-onepage-v92 .pmd92-layout {
    grid-template-columns: minmax(0, 1fr) 390px;
  }
  body.pmd-kds-onepage-v92 .pmd92-orders {
    grid-template-columns: repeat(2, minmax(135px, 1fr));
  }
}

@media (max-width: 1180px) {
  body.pmd-kds-onepage-v92 .pmd92-layout {
    grid-template-columns: 1fr;
  }
  body.pmd-kds-onepage-v92 .pmd92-aside {
    position: static;
  }
  body.pmd-kds-onepage-v92 .pmd92-side-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 820px) {
  body.pmd-kds-onepage-v92 .pmd92-shell {
    padding: 12px;
  }
  body.pmd-kds-onepage-v92 .pmd92-top {
    align-items: flex-start;
    flex-direction: column;
  }
  body.pmd-kds-onepage-v92 .pmd92-grid,
  body.pmd-kds-onepage-v92 .pmd92-side-grid {
    grid-template-columns: 1fr;
  }
  body.pmd-kds-onepage-v92 .pmd92-type-tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  body.pmd-kds-onepage-v92 .pmd92-check-grid {
    grid-template-columns: repeat(2, minmax(130px, 1fr));
  }
  body.pmd-kds-onepage-v92 .pmd92-orders {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  body.pmd-kds-onepage-v92 .pmd92-title h2 {
    font-size: 23px;
  }
  body.pmd-kds-onepage-v92 .pmd92-section-head h3 {
    font-size: 21px;
  }
  body.pmd-kds-onepage-v92 .pmd92-card-pad {
    padding: 16px;
  }
  body.pmd-kds-onepage-v92 .pmd92-type-tiles,
  body.pmd-kds-onepage-v92 .pmd92-check-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script id="pmd-kds-settings-clean-onepage-v92-script">
(function(){
  var MARK = 'PMD_KDS_SETTINGS_CLEAN_ONEPAGE_V92';

  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function text(el){ return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g,' ').trim(); }

  function visible(el){
    if (!el) return false;
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 && r.width > 0 && r.height > 0;
  }

  function fieldBy(cls){
    return q('.pmd-kds-field-' + cls + '-v58') || q('[class*="pmd-kds-field-' + cls + '"]');
  }

  function appendField(target, field, extraClass){
    if (!target || !field) return false;
    field.classList.add('pmd92-field');
    if (extraClass) field.classList.add(extraClass);
    if (field.parentElement === target) return true;
    target.appendChild(field);
    return true;
  }

  function labelOf(field){
    return text(q(':scope > label', field)) || text(q(':scope > .control-label', field)) || text(q('label', field)) || '';
  }

  function hideGhosts(scope){
    qa('.selectonic,.selectonic-input,.select2-container,.chosen-container,.selectize-control,.ts-wrapper,.choices,.bootstrap-select,[class*="selectonic"],[class*="select2"],[class*="chosen"],[class*="selectize"]', scope || document)
      .forEach(function(el){
        if (el.tagName && el.tagName.toLowerCase() === 'select') return;
        el.style.setProperty('display','none','important');
        el.style.setProperty('visibility','hidden','important');
        el.style.setProperty('opacity','0','important');
        el.style.setProperty('height','0','important');
        el.style.setProperty('max-height','0','important');
        el.style.setProperty('overflow','hidden','important');
      });
  }

  function makeStationTypeTiles(field){
    if (!field || field.querySelector('.pmd92-type-tiles')) return;
    var select = q('select', field);
    if (!select) return;

    var tiles = document.createElement('div');
    tiles.className = 'pmd92-type-tiles';

    var map = [
      {key:'kitchen', icon:'👨‍🍳', title:'Kitchen'},
      {key:'hot', icon:'👨‍🍳', title:'Kitchen'},
      {key:'grill', icon:'🔥', title:'Grill'},
      {key:'bar', icon:'🍸', title:'Bar'},
      {key:'dessert', icon:'🧁', title:'Dessert'},
      {key:'salad', icon:'🥗', title:'Salad'},
      {key:'expo', icon:'🧾', title:'Expo'}
    ];

    function guess(opt){
      var t = (opt.text || opt.value || '').toLowerCase();
      for (var i=0;i<map.length;i++) {
        if (t.indexOf(map[i].key) >= 0) return map[i];
      }
      return null;
    }

    Array.prototype.slice.call(select.options).forEach(function(opt){
      if (!opt.value && !opt.text) return;
      var g = guess(opt);
      if (!g) return;

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pmd92-type-tile';
      b.dataset.value = opt.value;
      b.innerHTML = '<span>'+g.icon+'</span><b>'+g.title+'</b>';
      b.addEventListener('click', function(){
        select.value = opt.value;
        select.dispatchEvent(new Event('change', {bubbles:true}));
        updateTiles();
        updateSummary();
      });
      tiles.appendChild(b);
    });

    if (!tiles.children.length) return;

    var firstControl = q('select', field);
    field.insertBefore(tiles, firstControl);

    function updateTiles(){
      qa('.pmd92-type-tile', tiles).forEach(function(tile){
        tile.classList.toggle('is-active', String(tile.dataset.value) === String(select.value));
      });
    }

    select.addEventListener('change', updateTiles);
    updateTiles();
  }

  function makeColorChips(field){
    if (!field || field.querySelector('.pmd92-color-chips')) return;
    var select = q('select', field);
    if (!select) return;

    var colors = {
      green:'#36c985',
      blue:'#3488ed',
      orange:'#fb923c',
      purple:'#8b5cf6',
      dessert:'#e85d8a',
      red:'#ef4444',
      yellow:'#f5c84c',
      teal:'#50bda5',
      gray:'#66737d',
      grey:'#66737d'
    };

    var chips = document.createElement('div');
    chips.className = 'pmd92-color-chips';

    Array.prototype.slice.call(select.options).forEach(function(opt){
      if (!opt.value && !opt.text) return;
      var key = (opt.text || opt.value || '').toLowerCase();
      var color = '#36c985';
      Object.keys(colors).forEach(function(k){
        if (key.indexOf(k) >= 0) color = colors[k];
      });

      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'pmd92-color-chip';
      chip.title = opt.text || opt.value;
      chip.dataset.value = opt.value;
      chip.style.background = color;
      chip.addEventListener('click', function(){
        select.value = opt.value;
        select.dispatchEvent(new Event('change', {bubbles:true}));
        updateChips();
      });
      chips.appendChild(chip);
    });

    field.appendChild(chips);

    function updateChips(){
      qa('.pmd92-color-chip', chips).forEach(function(chip){
        chip.classList.toggle('is-active', String(chip.dataset.value) === String(select.value));
      });
    }

    select.addEventListener('change', updateChips);
    updateChips();
  }

  function normalizeCheckGrid(field, hostClass){
    if (!field) return;
    field.classList.add('pmd92-full');

    var cards = qa('.pmd-kds-check-card-v58,.form-check', field).filter(function(el){
      return q('input[type="checkbox"]', el);
    });

    if (!cards.length) return;

    var grid = document.createElement('div');
    grid.className = 'pmd92-check-grid ' + (hostClass || '');

    var first = cards[0];
    first.parentNode.insertBefore(grid, first);

    cards.forEach(function(card){
      grid.appendChild(card);
      var input = q('input[type="checkbox"]', card);
      if (input) {
        card.classList.toggle('is-checked', input.checked);
        input.addEventListener('change', function(){
          card.classList.toggle('is-checked', input.checked);
          updateSummary();
        });
      }
    });
  }

  function compactSwitch(field){
    if (!field) return;
    field.classList.add('pmd92-compact-switch');
    var input = q('input[type="checkbox"]', field);
    if (input) {
      input.addEventListener('change', updateSummary);
    }
  }

  function val(cls, fallback){
    var f = fieldBy(cls);
    if (!f) return fallback || '';
    var input = q('input:not([type="hidden"]),select,textarea', f);
    if (!input) return fallback || '';
    if (input.type === 'checkbox') return input.checked ? 'Active' : 'Disabled';
    if (input.tagName && input.tagName.toLowerCase() === 'select') {
      return input.options[input.selectedIndex] ? input.options[input.selectedIndex].text : (fallback || '');
    }
    return input.value || fallback || '';
  }

  function checkedLabels(cls){
    var f = fieldBy(cls);
    if (!f) return [];
    return qa('input[type="checkbox"]', f).filter(function(i){ return i.checked; }).map(function(i){
      var wrap = i.closest('.form-check') || i.closest('label') || i.parentElement;
      return text(wrap).replace(/\s+/g,' ').trim();
    }).filter(Boolean);
  }

  function updateSummary(){
    var shell = q('.pmd92-shell');
    if (!shell) return;

    var name = val('name','Main Kitchen') || 'Main Kitchen';
    var type = val('station_type','Kitchen / Hot Food') || 'Kitchen / Hot Food';
    var status = val('is_active','Active');
    var cats = checkedLabels('category_ids');
    var buttons = checkedLabels('status_ids');
    var sort = val('sort_order','0') || '0';

    qa('[data-pmd92="name"]', shell).forEach(function(el){ el.textContent = name.toUpperCase(); });
    qa('[data-pmd92="name-plain"]', shell).forEach(function(el){ el.textContent = name; });
    qa('[data-pmd92="type"]', shell).forEach(function(el){ el.textContent = type; });
    qa('[data-pmd92="status"]', shell).forEach(function(el){ el.textContent = status; });
    qa('[data-pmd92="categories"]', shell).forEach(function(el){ el.textContent = cats.length ? cats.length + ' selected' : 'All'; });
    qa('[data-pmd92="workflow"]', shell).forEach(function(el){ el.textContent = buttons.length ? buttons.join(', ') : 'Default'; });
    qa('[data-pmd92="sort"]', shell).forEach(function(el){ el.textContent = sort; });
  }

  function build(){
    var base = q('.pmd-kds-modern-v58');
    if (!base) return false;

    /* PMD_KDS_SETTINGS_V143_REUSE_SERVER_SHELL: do not remove existing shell */

    var parent = base.parentElement;
    if (!parent) return false;

    document.body.classList.add('pmd-kds-onepage-v92');
    document.body.classList.remove('pmd-kds-onepage-v89', 'pmd-kds-onepage-v90-hotfixed', 'pmd-kds-card-visual-v86');

    var shell = q('.pmd92-server-shell-v143') || q('.pmd92-shell');
    if (!shell) {
      shell = document.createElement('div');
      shell.className = 'pmd92-shell pmd92-server-shell-v143';
      shell.innerHTML = `
      <div class="pmd92-top">
        <div class="pmd92-title">
          <h2>Create KDS Station</h2>
          <p>Configure the station once. Preview, routing, workflow, sound, and display settings stay visible on one page.</p>
        </div>
        <div class="pmd92-save-hint">Use the page save button when finished</div>
      </div>

      <div class="pmd92-layout">
        <div class="pmd92-main">
          <section class="pmd92-card pmd92-card-pad" data-pmd92-section="basics">
            <div class="pmd92-section-head">
              <div class="pmd92-icon">🖥️</div>
              <div>
                <h3>Basic Information</h3>
                <p>Name the station, choose its template, and control whether it receives orders.</p>
              </div>
            </div>
            <div class="pmd92-grid" data-pmd92-slot="basics"></div>
          </section>

          <section class="pmd92-card pmd92-card-pad" data-pmd92-section="routing">
            <div class="pmd92-section-head">
              <div class="pmd92-icon blue">🧭</div>
              <div>
                <h3>Routing & Categories</h3>
                <p>Choose which menu categories are routed to this station. Leave empty for all categories.</p>
              </div>
            </div>
            <div class="pmd92-grid one" data-pmd92-slot="routing"></div>
          </section>

          <section class="pmd92-card pmd92-card-pad" data-pmd92-section="workflow">
            <div class="pmd92-section-head">
              <div class="pmd92-icon gold">⚡</div>
              <div>
                <h3>Workflow & Timing</h3>
                <p>Choose kitchen actions and timing behavior for reservations, pickup warnings, and completed orders.</p>
              </div>
            </div>
            <div class="pmd92-grid" data-pmd92-slot="workflow"></div>
          </section>

          <section class="pmd92-card pmd92-card-pad" data-pmd92-section="display">
            <div class="pmd92-section-head">
              <div class="pmd92-icon">🔔</div>
              <div>
                <h3>Display & Sound</h3>
                <p>Control notifications, refresh speed, screen density, and KDS display limits.</p>
              </div>
            </div>
            <div class="pmd92-grid" data-pmd92-slot="display"></div>
          </section>
        </div>

        <aside class="pmd92-aside">
          <section class="pmd92-card pmd92-card-pad">
            <div class="pmd92-preview-head">
              <h3>Live KDS Preview</h3>
              <span class="pmd92-badge">Preview</span>
            </div>
            <div class="pmd92-preview">
              <div class="pmd92-preview-top">
                <div>
                  <div class="pmd92-preview-title" data-pmd92="name">MAIN KITCHEN</div>
                  <span class="pmd92-badge">12 Orders</span>
                </div>
                <span class="pmd92-badge">● <span data-pmd92="status">Active</span></span>
              </div>
              <div class="pmd92-orders">
                <div class="pmd92-order"><strong>#1054 <em>2m ago</em></strong><span>1x Classic Burger</span><span>1x French Fries</span><span>1x Coke</span><b class="pmd92-time">03:45</b></div>
                <div class="pmd92-order"><strong>#1055 <em>4m ago</em></strong><span>1x Grilled Salmon</span><span>1x Steamed Veggies</span><span>1x Lemon Sauce</span><b class="pmd92-time">05:12</b></div>
                <div class="pmd92-order"><strong>#1056 <em>6m ago</em></strong><span>1x Chicken Pasta</span><span>1x Garlic Bread</span><b class="pmd92-time">06:30</b></div>
              </div>
            </div>
            <p class="pmd92-live-note">● Real-time preview of how orders will appear on this station.</p>
          </section>

          <div class="pmd92-side-grid">
            <section class="pmd92-card pmd92-card-pad">
              <div class="pmd92-section-head">
                <div>
                  <h3>Station Summary</h3>
                </div>
              </div>
              <div class="pmd92-summary-row"><span>Name</span><span data-pmd92="name-plain">Main Kitchen</span></div>
              <div class="pmd92-summary-row"><span>Type</span><span data-pmd92="type">Kitchen / Hot Food</span></div>
              <div class="pmd92-summary-row"><span>Status</span><span data-pmd92="status">Active</span></div>
              <div class="pmd92-summary-row"><span>Categories</span><span data-pmd92="categories">All</span></div>
              <div class="pmd92-summary-row"><span>Workflow</span><span data-pmd92="workflow">Default</span></div>
              <div class="pmd92-summary-row"><span>Sort Order</span><span data-pmd92="sort">0</span></div>
            </section>

            <section class="pmd92-card pmd92-card-pad">
              <div class="pmd92-section-head">
                <div>
                  <h3>AI Suggestions</h3>
                  <p>Recommended station ideas for this setup.</p>
                </div>
              </div>
              <div class="pmd92-suggestion"><span>🍸 Grill / Bar Station</span><span class="pmd92-plus">+</span></div>
              <div class="pmd92-suggestion"><span>🧁 Dessert Station</span><span class="pmd92-plus">+</span></div>
              <div class="pmd92-suggestion"><span>🧾 Expo / Pass Station</span><span class="pmd92-plus">+</span></div>
            </section>
          </div>
        </aside>
      </div>
    `;
      parent.insertBefore(shell, base);
    } else {
      shell.classList.add('pmd92-shell');
      shell.classList.add('pmd92-server-shell-v143');
      if (shell.parentElement !== parent) parent.insertBefore(shell, base);
    }

    var slots = {
      basics: q('[data-pmd92-slot="basics"]', shell),
      routing: q('[data-pmd92-slot="routing"]', shell),
      workflow: q('[data-pmd92-slot="workflow"]', shell),
      display: q('[data-pmd92-slot="display"]', shell)
    };

    var fields = {
      name: fieldBy('name'),
      stationType: fieldBy('station_type'),
      active: fieldBy('is_active'),
      note: fieldBy('internal_note'),
      sort: fieldBy('sort_order'),
      location: fieldBy('location_id'),
      categories: fieldBy('category_ids'),
      canChange: fieldBy('can_change_status'),
      statuses: fieldBy('status_ids'),
      showReservations: fieldBy('show_reservations'),
      reservationWindow: fieldBy('reservation_window_minutes'),
      readyWarning: fieldBy('ready_pickup_warning_minutes'),
      hideCompleted: fieldBy('hide_completed_after_minutes'),
      sound: fieldBy('notification_sound'),
      soundEnabled: fieldBy('sound_enabled'),
      refresh: fieldBy('refresh_interval_seconds'),
      maxOrders: fieldBy('max_orders'),
      color: fieldBy('theme_color'),
      density: fieldBy('display_density')
    };

    appendField(slots.basics, fields.name);
    appendField(slots.basics, fields.stationType);
    appendField(slots.basics, fields.active);
    appendField(slots.basics, fields.note, 'pmd92-full');
    appendField(slots.basics, fields.sort);
    appendField(slots.basics, fields.location);

    appendField(slots.routing, fields.categories, 'pmd92-full');

    appendField(slots.workflow, fields.canChange);
    appendField(slots.workflow, fields.showReservations);
    appendField(slots.workflow, fields.statuses, 'pmd92-full');
    appendField(slots.workflow, fields.reservationWindow);
    appendField(slots.workflow, fields.readyWarning);
    appendField(slots.workflow, fields.hideCompleted);

    appendField(slots.display, fields.sound);
    appendField(slots.display, fields.soundEnabled);
    appendField(slots.display, fields.refresh);
    appendField(slots.display, fields.maxOrders);
    appendField(slots.display, fields.color);
    appendField(slots.display, fields.density);

    makeStationTypeTiles(fields.stationType);
    makeColorChips(fields.color);
    normalizeCheckGrid(fields.categories, 'pmd92-category-grid');
    normalizeCheckGrid(fields.statuses, 'pmd92-status-grid');

    [fields.active, fields.canChange, fields.showReservations, fields.soundEnabled].forEach(compactSwitch);

    hideGhosts(shell);

    qa('input,select,textarea', shell).forEach(function(el){
      el.addEventListener('input', updateSummary);
      el.addEventListener('change', function(){
        hideGhosts(shell);
        updateSummary();
      });
    });

    updateSummary();

    window.PMDKdsSettingsCleanOnePageV92 = {
      mark: MARK,
      apply: build,
      check: check,
      updateSummary: updateSummary
    };

    console.info('[PMD] KDS settings clean one-page v92 active', window.PMDKdsSettingsCleanOnePageV92);
    return true;
  }

  function rect(el){
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),left:Math.round(r.left),right:Math.round(r.right),top:Math.round(r.top),bottom:Math.round(r.bottom)};
  }

  function overlaps(a,b){
    if (!a || !b) return false;
    return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  }

  function check(){
    var shell = q('.pmd92-shell');
    var bad = [];

    if (!shell) {
      console.error('PMD v92 shell not found');
      return;
    }

    var fields = qa('.pmd-kds-form-field-v58', shell).filter(visible);
    var oldVisible = qa('.pmd-kds-modern-v58, .pmd89-designer').filter(visible);

    if (oldVisible.length) bad.push({type:'OLD_UI_VISIBLE', count:oldVisible.length});

    fields.forEach(function(field){
      var fr = rect(field);
      var label = labelOf(field);
      if (!fr || fr.w < 230) bad.push({type:'FIELD_TOO_NARROW', label:label, rect:fr});

      qa('input:not([type="hidden"]),select,textarea', field).filter(visible).forEach(function(control){
        var cr = rect(control);
        if (cr && cr.w < 80) bad.push({type:'CONTROL_TOO_NARROW', label:label, rect:cr});
      });

      var help = qa('.help-block,.form-text,small,.text-muted,.field-help,p', field).filter(visible)[0];
      var control = qa('input:not([type="hidden"]),select,textarea', field).filter(visible)[0];
      if (help && control && overlaps(rect(help), rect(control))) {
        bad.push({type:'HELP_OVERLAPS_CONTROL', label:label, help:rect(help), control:rect(control)});
      }

      qa('.selectonic,.selectonic-input,.select2-container,.chosen-container,.selectize-control,.ts-wrapper,.choices,.bootstrap-select,[class*="selectonic"],[class*="select2"],[class*="chosen"],[class*="selectize"]', field)
        .filter(visible)
        .filter(function(el){ return el.tagName.toLowerCase() !== 'select'; })
        .forEach(function(el){ bad.push({type:'SELECT_GHOST_VISIBLE', label:label, rect:rect(el)}); });

      qa('.pmd-kds-check-card-v58,.form-check', field)
        .filter(visible)
        .filter(function(el){ return q('input[type="checkbox"]', el); })
        .forEach(function(card){
          if (card.scrollWidth > card.clientWidth + 6) bad.push({type:'CHECK_CARD_TEXT_CLIPPED', label:label, text:text(card), rect:rect(card)});
        });
    });

    var summary = {
      mark: MARK,
      path: location.pathname,
      viewport: innerWidth + 'x' + innerHeight,
      bodyHasV92: document.body.classList.contains('pmd-kds-onepage-v92'),
      shellExists: !!shell,
      fieldsInsideShell: fields.length,
      oldVisible: oldVisible.length,
      badItems: bad.length,
      status: bad.length ? 'NEEDS_FIX' : 'OK'
    };

    window.PMD_KDS_SETTINGS_CLEAN_ONEPAGE_V92_REPORT = {summary:summary, badItems:bad};

    console.log('✅ PMD KDS CLEAN ONE-PAGE v92 SUMMARY');
    console.table([summary]);
    console.log('📌 BAD ITEMS');
    console.table(bad);
    console.log('Copy summary: copy(JSON.stringify(window.PMD_KDS_SETTINGS_CLEAN_ONEPAGE_V92_REPORT.summary, null, 2))');
    console.log('Copy bad items: copy(JSON.stringify(window.PMD_KDS_SETTINGS_CLEAN_ONEPAGE_V92_REPORT.badItems, null, 2))');

    try { copy(JSON.stringify(summary, null, 2)); } catch(e) {}

    return window.PMD_KDS_SETTINGS_CLEAN_ONEPAGE_V92_REPORT;
  }

  ready(function(){
    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      if (build() || tries > 40) clearInterval(timer);
    }, 120);
  });
})();
</script>
<!-- PMD_KDS_SETTINGS_CLEAN_ONEPAGE_V92_END -->


<!-- PMD_KDS_SETTINGS_ONEPAGE_V93_1_CLEANUP_START -->
<style id="pmd-kds-settings-onepage-v93-1-cleanup-style">
body.pmd-kds-onepage-v93-1-clean .pmd92-aside,
body.pmd-kds-onepage-v93-1-clean [class*="preview"],
body.pmd-kds-onepage-v93-1-clean [class*="summary"],
body.pmd-kds-onepage-v93-1-clean [class*="suggestion"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

body.pmd-kds-onepage-v93-1-clean .pmd92-shell {
  max-width: 1480px !important;
  padding: 18px !important;
}

body.pmd-kds-onepage-v93-1-clean .pmd92-layout {
  display: block !important;
  grid-template-columns: none !important;
}

body.pmd-kds-onepage-v93-1-clean .pmd92-main {
  width: 100% !important;
  max-width: none !important;
  display: grid !important;
  gap: 18px !important;
}

body.pmd-kds-onepage-v93-1-clean .pmd92-card {
  width: 100% !important;
}

body.pmd-kds-onepage-v93-1-clean .pmd92-card-pad {
  padding: 26px 30px !important;
}

body.pmd-kds-onepage-v93-1-clean .pmd92-grid {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 22px 28px !important;
  align-items: start !important;
}

body.pmd-kds-onepage-v93-1-clean .pmd92-full,
body.pmd-kds-onepage-v93-1-clean .checkboxlist-field {
  grid-column: 1 / -1 !important;
}

body.pmd-kds-onepage-v93-1-clean .pmd92-shell .pmd-kds-form-field-v58 {
  min-height: 0 !important;
  height: auto !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
}

/* Hide duplicated select plugin UI */
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field .selectonic,
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field .selectonic-input,
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field .select2,
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field .select2-container,
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field .chosen-container,
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field .selectize-control,
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field .ts-wrapper,
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field .choices,
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field .bootstrap-select,
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field .dropdown-menu,
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field .dropdown-toggle,
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field [class*="selectonic"]:not(select),
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field [class*="select2"]:not(select),
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field [class*="chosen"]:not(select),
body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field [class*="selectize"]:not(select) {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

body.pmd-kds-onepage-v93-1-clean .pmd92-shell .select-field select {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  width: 100% !important;
  height: 52px !important;
  min-height: 52px !important;
  max-height: 52px !important;
  margin: 0 !important;
}

body.pmd-kds-onepage-v93-1-clean .switch-field .form-check,
body.pmd-kds-onepage-v93-1-clean .switch-field .form-switch {
  display: inline-flex !important;
  width: auto !important;
  max-width: max-content !important;
  height: auto !important;
  min-height: 24px !important;
  align-items: center !important;
  gap: 12px !important;
  background: transparent !important;
  border: 0 !important;
}

body.pmd-kds-onepage-v93-1-clean .switch-field input[type="checkbox"] {
  width: 46px !important;
  min-width: 46px !important;
  height: 26px !important;
  min-height: 26px !important;
}

body.pmd-kds-onepage-v93-1-clean .checkboxlist-field input[type="checkbox"] {
  width: 22px !important;
  min-width: 22px !important;
  height: 22px !important;
  min-height: 22px !important;
}

body.pmd-kds-onepage-v93-1-clean .pmd92-check-grid {
  grid-template-columns: repeat(4, minmax(180px, 1fr)) !important;
}

@media (max-width: 1100px) {
  body.pmd-kds-onepage-v93-1-clean .pmd92-grid {
    grid-template-columns: 1fr !important;
  }
  body.pmd-kds-onepage-v93-1-clean .pmd92-check-grid {
    grid-template-columns: repeat(2, minmax(160px, 1fr)) !important;
  }
}

@media (max-width: 520px) {
  body.pmd-kds-onepage-v93-1-clean .pmd92-check-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>

<script id="pmd-kds-settings-onepage-v93-1-cleanup-script">
(function(){
  var MARK = 'PMD_KDS_SETTINGS_ONEPAGE_V93_1_CLEANUP';

  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function text(el){ return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g,' ').trim(); }

  function visible(el){
    if (!el) return false;
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 && r.width > 0 && r.height > 0;
  }

  function rect(el){
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x), y: Math.round(r.y),
      left: Math.round(r.left), right: Math.round(r.right),
      top: Math.round(r.top), bottom: Math.round(r.bottom),
      w: Math.round(r.width), h: Math.round(r.height)
    };
  }

  function hardHide(el){
    if (!el) return;
    [
      ['display','none'],
      ['visibility','hidden'],
      ['opacity','0'],
      ['height','0'],
      ['min-height','0'],
      ['max-height','0'],
      ['width','0'],
      ['margin','0'],
      ['padding','0'],
      ['border','0'],
      ['overflow','hidden'],
      ['pointer-events','none']
    ].forEach(function(x){ el.style.setProperty(x[0], x[1], 'important'); });
  }

  function removeRightColumn(){
    qa('.pmd92-aside').forEach(function(el){ el.remove(); });

    var badTexts = [
      'Live KDS Preview',
      'Station Summary',
      'AI Suggestions',
      'Classic Burger',
      'Grill / Bar Station',
      'Dessert Station',
      'Expo / Pass Station'
    ];

    qa('section,aside,div,article').forEach(function(el){
      var t = text(el);
      if (!t) return;
      for (var i = 0; i < badTexts.length; i++) {
        if (t.indexOf(badTexts[i]) >= 0) {
          if (!el.closest('.pmd92-main')) hardHide(el);
          break;
        }
      }
    });
  }

  function killSelectDuplicates(){
    var shell = q('.pmd92-shell') || document;

    qa('.select-field', shell).forEach(function(field){
      var select = q('select', field);
      if (!select) return;

      qa('.selectonic,.selectonic-input,.select2,.select2-container,.chosen-container,.selectize-control,.ts-wrapper,.choices,.bootstrap-select,.dropdown-menu,.dropdown-toggle,[class*="selectonic"],[class*="select2"],[class*="chosen"],[class*="selectize"]', field)
        .forEach(function(el){
          if (el === select) return;
          if (el.tagName && el.tagName.toLowerCase() === 'select') return;
          hardHide(el);
        });

      qa('div,span,a,button', field).forEach(function(el){
        if (el.closest('.pmd92-type-tiles')) return;
        if (el.closest('.pmd92-color-chips')) return;
        if (el === select) return;

        var t = text(el);
        var r = rect(el);
        if (!t || !r) return;

        var looksClone =
          /\-\- All Locations \-\-|Doorbell|Green \(Kitchen\)|Normal|Pass \/ Expo|Kitchen \/ Hot Food/.test(t) &&
          r.h <= 80 &&
          r.w > 100;

        if (looksClone) hardHide(el);
      });

      select.style.setProperty('display','block','important');
      select.style.setProperty('visibility','visible','important');
      select.style.setProperty('opacity','1','important');
      select.style.setProperty('width','100%','important');
      select.style.setProperty('height','52px','important');
      select.style.setProperty('min-height','52px','important');
      select.style.setProperty('max-height','52px','important');
    });
  }

  function fieldLabel(field){
    return text(q(':scope > label', field)) ||
      text(q(':scope > .control-label', field)) ||
      text(q('label', field)) ||
      '-';
  }

  function apply(){
    document.body.classList.add('pmd-kds-onepage-v93-1-clean');

    if (!q('.pmd92-shell') && window.PMDKdsSettingsCleanOnePageV92 && typeof window.PMDKdsSettingsCleanOnePageV92.apply === 'function') {
      window.PMDKdsSettingsCleanOnePageV92.apply();
    }

    removeRightColumn();
    killSelectDuplicates();

    window.PMDKdsSettingsOnePageV931Cleanup = {
      mark: MARK,
      apply: apply,
      check: check,
      killSelectDuplicates: killSelectDuplicates
    };

    return true;
  }

  function check(){
    apply();

    var shell = q('.pmd92-shell');
    var bad = [];

    if (!shell) {
      bad.push({type:'SHELL_NOT_FOUND'});
    }

    if (shell) {
      var removedTexts = [
        'Live KDS Preview',
        'Station Summary',
        'AI Suggestions',
        'Classic Burger',
        'Grill / Bar Station',
        'Dessert Station',
        'Expo / Pass Station'
      ];

      removedTexts.forEach(function(t){
        if (text(shell).indexOf(t) >= 0) bad.push({type:'REMOVED_TEXT_STILL_VISIBLE', text:t});
      });

      qa('.select-field', shell).forEach(function(field){
        var label = fieldLabel(field);
        var ghosts = qa('.selectonic,.selectonic-input,.select2,.select2-container,.chosen-container,.selectize-control,.ts-wrapper,.choices,.bootstrap-select,.dropdown-menu,.dropdown-toggle,[class*="selectonic"],[class*="select2"],[class*="chosen"],[class*="selectize"]', field)
          .filter(visible)
          .filter(function(el){ return el.tagName.toLowerCase() !== 'select'; });

        if (ghosts.length) {
          bad.push({type:'SELECT_GHOST_VISIBLE', label:label, count:ghosts.length, rect:rect(ghosts[0])});
        }

        var select = q('select', field);
        if (select && visible(select)) {
          var sr = rect(select);
          if (sr.h > 70) bad.push({type:'SELECT_TOO_TALL', label:label, rect:sr});
        }
      });

      qa('.pmd-kds-form-field-v58', shell).filter(visible).forEach(function(field){
        var label = fieldLabel(field);
        var fr = rect(field);
        if (fr && fr.w < 240) bad.push({type:'FIELD_TOO_NARROW', label:label, rect:fr});
      });
    }

    var summary = {
      mark: MARK,
      path: location.pathname,
      viewport: innerWidth + 'x' + innerHeight,
      bodyHasV92: document.body.classList.contains('pmd-kds-onepage-v92'),
      bodyHasV931: document.body.classList.contains('pmd-kds-onepage-v93-1-clean'),
      shellExists: !!shell,
      rightColumnVisible: qa('.pmd92-aside').filter(visible).length,
      selectGhostProblems: bad.filter(function(x){ return String(x.type).indexOf('SELECT') >= 0; }).length,
      badItems: bad.length,
      status: bad.length ? 'NEEDS_FIX' : 'OK'
    };

    window.PMD_KDS_SETTINGS_ONEPAGE_V93_1_CLEANUP_REPORT = {
      summary: summary,
      badItems: bad
    };

    console.log('✅ PMD KDS ONE-PAGE v93.1 CLEANUP SUMMARY');
    console.table([summary]);
    console.log('📌 BAD ITEMS');
    console.table(bad);
    console.log('Copy summary: copy(JSON.stringify(window.PMD_KDS_SETTINGS_ONEPAGE_V93_1_CLEANUP_REPORT.summary, null, 2))');
    console.log('Copy bad items: copy(JSON.stringify(window.PMD_KDS_SETTINGS_ONEPAGE_V93_1_CLEANUP_REPORT.badItems, null, 2))');

    try { copy(JSON.stringify(summary, null, 2)); } catch(e) {}

    return window.PMD_KDS_SETTINGS_ONEPAGE_V93_1_CLEANUP_REPORT;
  }

  var tries = 0;
  var timer = setInterval(function(){
    tries++;
    apply();
    if (q('.pmd92-shell') || tries > 40) {
      clearInterval(timer);
    }
  }, 150);
})();
</script>
<!-- PMD_KDS_SETTINGS_ONEPAGE_V93_1_CLEANUP_END -->


<!-- PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_START -->
<style id="pmd-kds-settings-onepage-v95-polish-style">
html,
body {
  overflow-x: hidden !important;
}

body.pmd-admin-theme-v1.pmd-kds-modern-body-v58 .page-content,
body.pmd-admin-theme-v1.pmd-kds-modern-body-v58 .container-fluid,
body.pmd-admin-theme-v1.pmd-kds-modern-body-v58 .card-body {
  max-width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-shell,
body.pmd-kds-onepage-v95-polish .pmd92-shell *,
body.pmd-kds-onepage-v95-polish .pmd92-shell *::before,
body.pmd-kds-onepage-v95-polish .pmd92-shell *::after {
  box-sizing: border-box !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-shell {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  overflow-x: clip !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-layout {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  grid-template-columns: 1fr !important;
  overflow-x: clip !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-main {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  overflow-x: clip !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-side,
body.pmd-kds-onepage-v95-polish .pmd92-preview,
body.pmd-kds-onepage-v95-polish .pmd92-station-summary,
body.pmd-kds-onepage-v95-polish .pmd92-summary,
body.pmd-kds-onepage-v95-polish .pmd92-ai,
body.pmd-kds-onepage-v95-polish [data-pmd92-side],
body.pmd-kds-onepage-v95-polish [data-pmd92-preview],
body.pmd-kds-onepage-v95-polish [data-pmd92-summary],
body.pmd-kds-onepage-v95-polish [data-pmd92-ai] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-top {
  width: 100% !important;
  min-height: 0 !important;
  height: auto !important;
-top {
  width: 100% !important;
  min-height: 0 !important;
  height: auto !important;
  padding: 20px 24px !important;
  margin: 0 0 18px 0 !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 18px !important;
  overflow: visible !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-title {
  min-width: 0 !important;
  max-width: 100% !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-title h2,
body.pmd-kds-onepage-v95-polish .pmd92-section-head h3 {
  line-height: 1.26 !important;
  min-height: 0 !important;
  height: auto !important;
  overflow: visible !important;
  white-space: normal !important;
  text-wrap: balance !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-title h2 {
  font-size: clamp(24px, 2vw, 28px) !important;
  margin: 0 0 8px 0 !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-title p,
body.pmd-kds-onepage-v95-polish .pmd92-section-head p,
body.pmd-kds-onepage-v95-polish .pmd92-help,
body.pmd-kds-onepage-v95-polish small,
body.pmd-kds-onepage-v95-polish .help-block,
body.pmd-kds-onepage-v95-polish .form-text,
body.pmd-kds-onepage-v95-polish .text-muted {
  line-height: 1.52 !important;
  min-height: 0 !important;
  height: auto !important;
  overflow: visible !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-card,
body.pmd-kds-onepage-v95-polish section.pmd92-card,
body.pmd-kds-onepage-v95-polish .pmd92-card-pad {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  padding: 26px 28px !important;
  margin: 0 0 20px 0 !important;
  overflow: visible !important;
  align-content: start !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-section-head {
  display: flex !important;
  align-items: flex-start !important;
  gap: 16px !important;
  margin: 0 0 24px 0 !important;
  min-height: 0 !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-section-head h3 {
  font-size: clamp(24px, 2.1vw, 30px) !important;
  margin: 0 0 6px 0 !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-section-head > div:last-child,
body.pmd-kds-onepage-v95-polish .pmd92-section-head .pmd92-section-copy {
  min-width: 0 !important;
  max-width: 100% !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-grid {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 24px 32px !important;
  align-items: start !important;
  align-content: start !important;
  justify-content: stretch !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-grid > *,
body.pmd-kds-onepage-v95-polish .pmd92-field,
body.pmd-kds-onepage-v95-polish .form-group,
body.pmd-kds-onepage-v95-polish .control-group {
  min-width: 0 !important;
  max-width: 100% !important;
  min-height: 0 !important;
  height: auto !important;
  margin: 0 !important;
  overflow: visible !important;
}

body.pmd-kds-onepage-v95-polish .span-full,
body.pmd-kds-onepage-v95-polish .pmd92-span-full,
body.pmd-kds-onepage-v95-polish .pmd92-field-full {
  grid-column: 1 / -1 !important;
}

body.pmd-kds-onepage-v95-polish input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
body.pmd-kds-onepage-v95-polish select,
body.pmd-kds-onepage-v95-polish textarea {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  font-size: 15px !important;
  line-height: 1.42 !important;
}

body.pmd-kds-onepage-v95-polish input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
body.pmd-kds-onepage-v95-polish select {
  height: 56px !important;
  min-height: 56px !important;
  max-height: 56px !important;
}

body.pmd-kds-onepage-v95-polish textarea {
  min-height: 96px !important;
  max-height: none !important;
  resize: vertical !important;
}

body.pmd-kds-onepage-v95-polish .selectonic,
body.pmd-kds-onepage-v95-polish .selectonic-input,
body.pmd-kds-onepage-v95-polish .select2-container,
body.pmd-kds-onepage-v95-polish .chosen-container,
body.pmd-kds-onepage-v95-polish .selectize-control,
body.pmd-kds-onepage-v95-polish .ts-wrapper,
body.pmd-kds-onepage-v95-polish .choices,
body.pmd-kds-onepage-v95-polish .bootstrap-select,
body.pmd-kds-onepage-v95-polish .dropdown-menu,
body.pmd-kds-onepage-v95-polish .dropdown-toggle,
body.pmd-kds-onepage-v95-polish [class*="selectonic"],
body.pmd-kds-onepage-v95-polish [class*="select2"],
body.pmd-kds-onepage-v95-polish [class*="chosen"],
body.pmd-kds-onepage-v95-polish [class*="selectize"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

body.pmd-kds-onepage-v95-polish select {
  display: block !important;
  appearance: auto !important;
  -webkit-appearance: auto !important;
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-type-tiles {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(118px, 1fr)) !important;
  gap: 12px !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-type-tile {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  min-height: 50px !important;
  height: auto !important;
  padding: 11px 12px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 7px !important;
  line-height: 1.32 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-type-tile span,
body.pmd-kds-onepage-v95-polish .pmd92-type-tile strong,
body.pmd-kds-onepage-v95-polish .pmd92-type-tile b {
  line-height: 1.32 !important;
  min-height: 0 !important;
  overflow: visible !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-check-grid,
body.pmd-kds-onepage-v95-polish .pmd92-card-grid,
body.pmd-kds-onepage-v95-polish .pmd-kds-check-grid-v58 {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(180px, 1fr)) !important;
  gap: 12px !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-check-card,
body.pmd-kds-onepage-v95-polish .pmd-kds-check-card-v58 {
  min-width: 0 !important;
  width: 100% !important;
  min-height: 54px !important;
  height: auto !important;
  padding: 12px 14px !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  overflow: hidden !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-check-card *,
body.pmd-kds-onepage-v95-polish .pmd-kds-check-card-v58 * {
  min-width: 0 !important;
  line-height: 1.35 !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-switch,
body.pmd-kds-onepage-v95-polish .form-switch,
body.pmd-kds-onepage-v95-polish .custom-switch {
  min-width: 44px !important;
  min-height: 24px !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-color-chips {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 10px !important;
  align-items: center !important;
  max-width: 100% !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-color-chip {
  width: 46px !important;
  height: 46px !important;
  min-width: 46px !important;
  min-height: 46px !important;
  max-width: 46px !important;
  max-height: 46px !important;
  border-radius: 999px !important;
}

@media (max-width: 1100px) {
  body.pmd-kds-onepage-v95-polish .pmd92-grid {
    gap: 22px 24px !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-check-grid,
  body.pmd-kds-onepage-v95-polish .pmd92-card-grid,
  body.pmd-kds-onepage-v95-polish .pmd-kds-check-grid-v58 {
    grid-template-columns: repeat(2, minmax(160px, 1fr)) !important;
  }
}

@media (max-width: 780px) {
  body.pmd-kds-onepage-v95-polish .pmd92-top {
    flex-direction: column !important;
    padding: 18px !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-grid {
    grid-template-columns: 1fr !important;
    gap: 20px !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-card,
  body.pmd-kds-onepage-v95-polish section.pmd92-card,
  body.pmd-kds-onepage-v95-polish .pmd92-card-pad {
    padding: 22px !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-type-tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-type-tile {
    font-size: 14px !important;
  }
}

@media (max-width: 520px) {
  body.pmd-kds-onepage-v95-polish .page-content,
  body.pmd-kds-onepage-v95-polish .container-fluid,
  body.pmd-kds-onepage-v95-polish .card-body {
    padding-left: 10px !important;
    padding-right: 10px !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-shell {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-top {
    padding: 16px !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-card,
  body.pmd-kds-onepage-v95-polish section.pmd92-card,
  body.pmd-kds-onepage-v95-polish .pmd92-card-pad {
    padding: 18px !important;
    border-radius: 20px !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-section-head {
    gap: 12px !important;
    margin-bottom: 18px !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-section-head h3 {
    font-size: 24px !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-type-tiles {
    grid-template-columns: 1fr !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-check-grid,
  body.pmd-kds-onepage-v95-polish .pmd92-card-grid,
  body.pmd-kds-onepage-v95-polish .pmd-kds-check-grid-v58 {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 420px) {
  body.pmd-kds-onepage-v95-polish .pmd92-title h2 {
    font-size: 23px !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-section-head h3 {
    font-size: 22px !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-card,
  body.pmd-kds-onepage-v95-polish section.pmd92-card,
  body.pmd-kds-onepage-v95-polish .pmd92-card-pad {
    padding: 16px !important;
  }

  body.pmd-kds-onepage-v95-polish input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
  body.pmd-kds-onepage-v95-polish select {
    height: 52px !important;
    min-height: 52px !important;
    max-height: 52px !important;
  }
}
</style>

<script id="pmd-kds-settings-onepage-v95-polish-script">
(function () {
  var MARK = 'PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH';

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function visible(el) {
    if (!el) return false;
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 && r.width > 0 && r.height > 0;
  }

  function txt(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      left: Math.round(r.left),
      top: Math.round(r.top),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom),
      w: Math.round(r.width),
      h: Math.round(r.height)
    };
  }

  function getRoot() {
    return document.querySelector('.pmd92-shell') ||
      document.querySelector('[data-pmd-kds-onepage]') ||
      document.querySelector('.pmd-kds-modern-v58') ||
      document.body;
  }

  function hideGhostSelects(root) {
    qsa('.selectonic,.selectonic-input,.select2-container,.chosen-container,.selectize-control,.ts-wrapper,.choices,.bootstrap-select,.dropdown-menu,.dropdown-toggle,[class*="selectonic"],[class*="select2"],[class*="chosen"],[class*="selectize"]', root).forEach(function (el) {
      if (el.tagName && el.tagName.toLowerCase() === 'select') return;
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    });

    qsa('select', root).forEach(function (el) {
      el.style.setProperty('display', 'block', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('pointer-events', 'auto', 'important');
    });
  }

  function hideRemovedRightPanelText() {
    var needles = [
      'Live KDS Preview',
      'Station Summary',
      'AI Suggestions',
      'MAIN KITCHEN',
      'Real-time preview'
    ];

    qsa('body *').forEach(function (el) {
      if (!visible(el)) return;
      var t = txt(el);
      if (!t) return;

      for (var i = 0; i < needles.length; i++) {
        if (t.indexOf(needles[i]) !== -1) {
          var card = el.closest('.pmd92-side,.pmd92-preview,.pmd92-summary,.pmd92-ai,.pmd92-card,[data-pmd92-side],[data-pmd92-preview],[data-pmd92-summary],[data-pmd92-ai]');
          if (card && !card.closest('.pmd92-main')) {
            card.style.setProperty('display', 'none', 'important');
            card.style.setProperty('visibility', 'hidden', 'important');
          }
        }
      }
    });
  }

  function apply() {
    document.body.classList.add('pmd-kds-onepage-v95-polish');

    var root = getRoot();
    if (!root) return;

    hideGhostSelects(root);
    hideRemovedRightPanelText();

    qsa('.pmd92-card, section.pmd92-card, .pmd92-card-pad', root).forEach(function (card) {
      card.style.setProperty('height', 'auto', 'important');
      card.style.setProperty('min-height', '0', 'important');
      card.style.setProperty('align-content', 'start', 'important');
    });

    qsa('.pmd92-grid', root).forEach(function (grid) {
      grid.style.setProperty('align-content', 'start', 'important');
      grid.style.setProperty('align-items', 'start', 'important');
    });

    qsa('.pmd92-color-chip', root).forEach(function (chip) {
      chip.style.setProperty('width', '46px', 'important');
      chip.style.setProperty('height', '46px', 'important');
      chip.style.setProperty('min-width', '46px', 'important');
      chip.style.setProperty('min-height', '46px', 'important');
    });
  }

  function check() {
    apply();

    var root = getRoot();
    var bad = [];

    function add(type, el, extra) {
      var item = {
        type: type,
        text: txt(el).slice(0, 140),
        rect: rect(el)
      };
      if (extra) {
        Object.keys(extra).forEach(function (k) { item[k] = extra[k]; });
      }
      bad.push(item);
    }

    if (!root) {
      bad.push({ type: 'ROOT_NOT_FOUND' });
    } else {
      qsa('.pmd92-side,.pmd92-preview,.pmd92-summary,.pmd92-ai,[data-pmd92-side],[data-pmd92-preview],[data-pmd92-summary],[data-pmd92-ai]').forEach(function (el) {
        if (visible(el)) add('RIGHT_PANEL_STILL_VISIBLE', el);
      });

      qsa('.selectonic,.selectonic-input,.select2-container,.chosen-container,.selectize-control,.ts-wrapper,.choices,.bootstrap-select,.dropdown-menu,.dropdown-toggle,[class*="selectonic"],[class*="select2"],[class*="chosen"],[class*="selectize"]', root).forEach(function (el) {
        if (el.tagName && el.tagName.toLowerCase() === 'select') return;
        if (visible(el)) add('SELECT_GHOST_STILL_VISIBLE', el);
      });

      qsa('.pmd92-card, section.pmd92-card, .pmd92-card-pad', root).forEach(function (card) {
        if (!visible(card)) return;
        var r = rect(card);
        var children = Array.prototype.slice.call(card.children).filter(visible);
        var maxBottom = 0;
        children.forEach(function (c) {
          var cr = rect(c);
          if (cr) maxBottom = Math.max(maxBottom, cr.bottom);
        });
        if (r && maxBottom && r.bottom - maxBottom > 180) {
          add('CARD_EMPTY_BOTTOM_SPACE', card, { emptyPx: Math.round(r.bottom - maxBottom) });
        }
      });

      qsa('h1,h2,h3,h4,h5,h6,p,span,label,button,a,small,strong,div', root).forEach(function (el) {
        if (!visible(el)) return;
        if (!txt(el) || txt(el).length < 2) return;
        if (qsa('*', el).length > 4) return;
        if (el.scrollWidth > el.clientWidth + 4 || el.scrollHeight > el.clientHeight + 4) {
          add('TEXT_CLIPPED', el, {
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight
          });
        }
      });

      qsa('.pmd92-color-chip', root).forEach(function (chip) {
        if (!visible(chip)) return;
        var r = rect(chip);
        if (r && (r.w < 44 || r.h < 44)) add('COLOR_CHIP_TOO_SMALL', chip);
      });

      var overflow = document.documentElement.scrollWidth - window.innerWidth;
      if (overflow > 8) {
        bad.push({ type: 'PAGE_HORIZONTAL_OVERFLOW', overflowPx: overflow });
      }
    }

    var summary = {
      mark: MARK,
      path: location.pathname,
      viewport: window.innerWidth + 'x' + window.innerHeight,
      bodyHasV92: document.body.classList.contains('pmd-kds-onepage-v92'),
      bodyHasV931: document.body.classList.contains('pmd-kds-onepage-v93-1-clean'),
      bodyHasV95: document.body.classList.contains('pmd-kds-onepage-v95-polish'),
      badItems: bad.length,
      status: bad.length ? 'NEEDS_FIX' : 'OK'
    };

    window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT = {
      summary: summary,
      badItems: bad
    };

    console.log('✅ PMD KDS ONE-PAGE v95 POLISH SUMMARY');
    console.table([summary]);
    console.log('📌 BAD ITEMS');
    console.table(bad);
    console.log('Copy summary: copy(JSON.stringify(window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT.summary, null, 2))');
    console.log('Copy bad items: copy(JSON.stringify(window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT.badItems, null, 2))');

    try {
      copy(JSON.stringify(summary, null, 2));
    } catch (e) {}

    return window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT;
  }

  window.PMDKdsSettingsOnePageV95Polish = {
    mark: MARK,
    apply: apply,
    check: check
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
    });
  } else {
  }

  
  console.info('[PMD] KDS settings one-page v95 polish active', window.PMDKdsSettingsOnePageV95Polish);
})();
</script>
<!-- PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_END -->

<!-- PMD_KDS_SETTINGS_V144_FINAL_BOOT_ONCE_START -->
<script id="pmd-kds-settings-v144-final-boot-once">
(function () {
  if (!/^\/admin\/kds_stations\/(create|edit\/\d+)/.test(location.pathname)) return;
  if (window.__PMD_KDS_SETTINGS_V144_FINAL_BOOT_ONCE__) return;
  window.__PMD_KDS_SETTINGS_V144_FINAL_BOOT_ONCE__ = true;

  function call(obj, method) {
    try {
      if (obj && typeof obj[method] === 'function') obj[method]();
    } catch (e) {
      try { console.warn('[PMD] v144 call failed', method, e); } catch (_) {}
    }
  }

  function runFinal() {
    requestAnimationFrame(function () {
      call(window.PMDKdsSettingsCleanOnePageV92, 'apply');
      call(window.PMDKdsSettingsOnePageV931Cleanup, 'apply');
      call(window.PMDKdsSettingsOnePageV95Polish, 'apply');

      requestAnimationFrame(function () {
        call(window.PMDKdsSettingsCleanOnePageV92, 'check');
        call(window.PMDKdsSettingsOnePageV931Cleanup, 'check');
        call(window.PMDKdsSettingsOnePageV95Polish, 'check');

        var shell = document.querySelector('.pmd92-shell');
        var oldVisible = Array.prototype.slice.call(document.querySelectorAll('.pmd-kds-modern-v58')).filter(function (el) {
          var cs = getComputedStyle(el);
          var r = el.getBoundingClientRect();
          return cs.display !== 'none' &&
            cs.visibility !== 'hidden' &&
            Number(cs.opacity || 1) > 0.01 &&
            r.width > 2 &&
            r.height > 2;
        }).length;

        window.PMD_KDS_SETTINGS_V144_FINAL_BOOT_ONCE_REPORT = {
          mark: 'PMD_KDS_SETTINGS_V144_FINAL_BOOT_ONCE',
          path: location.pathname,
          shellExists: !!shell,
          serverShells: document.querySelectorAll('.pmd92-server-shell-v143').length,
          shells: document.querySelectorAll('.pmd92-shell').length,
          oldVisible: oldVisible,
          bodyHasV92: document.body.classList.contains('pmd-kds-onepage-v92'),
          bodyHasV931: document.body.classList.contains('pmd-kds-onepage-v93-1-clean'),
          bodyHasV95: document.body.classList.contains('pmd-kds-onepage-v95-polish'),
          v95Status: window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT &&
            window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT.summary &&
            window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT.summary.status || 'PENDING',
          v95BadItems: window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT &&
            window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT.badItems &&
            window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT.badItems.length
        };

        try {
          console.log('✅ PMD KDS SETTINGS v144 FINAL BOOT ONCE');
          console.table([window.PMD_KDS_SETTINGS_V144_FINAL_BOOT_ONCE_REPORT]);
        } catch (e) {}
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runFinal, true);
  } else {
    runFinal();
  }

  window.PMDKdsSettingsV144FinalBootOnce = {
    check: function () {
      return window.PMD_KDS_SETTINGS_V144_FINAL_BOOT_ONCE_REPORT || {
        mark: 'PMD_KDS_SETTINGS_V144_FINAL_BOOT_ONCE',
        path: location.pathname,
        status: 'PENDING'
      };
    }
  };
})();
</script>
<!-- PMD_KDS_SETTINGS_V144_FINAL_BOOT_ONCE_END -->

<!-- PMD_KDS_SETTINGS_V146_FINAL_POLISH_AFTER_V144_START -->
<style id="pmd-kds-settings-v146-final-polish-style">
/* v146: final KDS settings polish after v143/v144 are complete */

body.pmd-kds-onepage-v95-polish .pmd92-card,
body.pmd-kds-onepage-v95-polish section.pmd92-card {
  margin-bottom: 18px !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-card-pad {
  padding: 24px 30px !important;
  min-height: 0 !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-section-head {
  margin-bottom: 18px !important;
}

/* Main grid */
body.pmd-kds-onepage-v95-polish .pmd92-grid {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  grid-auto-rows: auto !important;
  gap: 18px 28px !important;
  align-items: start !important;
}

/* Kill huge empty rows */
body.pmd-kds-onepage-v95-polish .pmd92-field,
body.pmd-kds-onepage-v95-polish .pmd-kds-form-field-v58,
body.pmd-kds-onepage-v95-polish .form-group,
body.pmd-kds-onepage-v95-polish .control-group {
  min-height: 0 !important;
  height: auto !important;
  margin-bottom: 0 !important;
  align-self: start !important;
}

/* Basic Information: force exact 2x2 placement */
body.pmd-kds-onepage-v95-polish .pmd92-card:first-of-type .pmd92-grid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  grid-template-rows: auto auto !important;
  gap: 18px 28px !important;
  align-items: start !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-card:first-of-type .pmd-kds-field-name-v58 {
  grid-column: 1 !important;
  grid-row: 1 !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-card:first-of-type .pmd-kds-field-station_type-v58 {
  grid-column: 2 !important;
  grid-row: 1 !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-card:first-of-type .pmd-kds-field-is_active-v58 {
  grid-column: 1 !important;
  grid-row:-kds-onepage-v95-polish .pmd92-card:first-of-type .pmd-kds-field-is_active 2 !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-card:first-of-type .pmd-kds-field-location_id-v58 {
  grid-column: 2 !important;
  grid-row: 2 !important;
}

/* Type tiles / checkbox cards */
body.pmd-kds-onepage-v95-polish .pmd92-type-tiles {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(120px, 1fr)) !important;
  gap: 10px !important;
  margin-bottom: 10px !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-type-tile {
  min-height: 40px !important;
  padding: 9px 12px !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-check-grid,
body.pmd-kds-onepage-v95-polish .pmd92-card-grid,
body.pmd-kds-onepage-v95-polish .pmd-kds-check-grid-v58 {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(180px, 1fr)) !important;
  gap: 12px !important;
  align-items: start !important;
}

body.pmd-kds-onepage-v95-polish .pmd-kds-check-card-v58,
body.pmd-kds-onepage-v95-polish .pmd92-check-card,
body.pmd-kds-onepage-v95-polish .form-check {
  min-height: 50px !important;
  padding: 13px 16px !important;
  margin: 0 !important;
}

/* Select/dropdown duplicate fix */
body.pmd-kds-onepage-v95-polish .pmd92-shell select {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  width: 100% !important;
  max-width: 100% !important;
  height: 48px !important;
  min-height: 48px !important;
  margin: 0 !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-shell .selectonic,
body.pmd-kds-onepage-v95-polish .pmd92-shell .selectonic-input,
body.pmd-kds-onepage-v95-polish .pmd92-shell .select2-container,
body.pmd-kds-onepage-v95-polish .pmd92-shell .chosen-container,
body.pmd-kds-onepage-v95-polish .pmd92-shell .selectize-control,
body.pmd-kds-onepage-v95-polish .pmd92-shell .ts-wrapper,
body.pmd-kds-onepage-v95-polish .pmd92-shell .choices,
body.pmd-kds-onepage-v95-polish .pmd92-shell .bootstrap-select,
body.pmd-kds-onepage-v95-polish .pmd92-shell .dropdown-toggle {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-shell input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
body.pmd-kds-onepage-v95-polish .pmd92-shell select,
body.pmd-kds-onepage-v95-polish .pmd92-shell textarea {
  border-radius: 14px !important;
  border: 1px solid #d7e9f2 !important;
  background: #fff !important;
  box-shadow: none !important;
}

body.pmd-kds-onepage-v95-polish .pmd92-shell .help-block,
body.pmd-kds-onepage-v95-polish .pmd92-shell .form-text,
body.pmd-kds-onepage-v95-polish .pmd92-shell small,
body.pmd-kds-onepage-v95-polish .pmd92-shell .text-muted {
  margin-top: 7px !important;
}

@media (max-width: 1100px) {
  body.pmd-kds-onepage-v95-polish .pmd92-grid,
  body.pmd-kds-onepage-v95-polish .pmd92-card:first-of-type .pmd92-grid,
  body.pmd-kds-onepage-v95-polish .pmd92-check-grid,
  body.pmd-kds-onepage-v95-polish .pmd92-card-grid,
  body.pmd-kds-onepage-v95-polish .pmd-kds-check-grid-v58 {
    grid-template-columns: 1fr !important;
  }

  body.pmd-kds-onepage-v95-polish .pmd92-card:first-of-type .pmd-kds-field-name-v58,
  body.pmd-kds-onepage-v95-polish .pmd92-card:first-of-type .pmd-kds-field-station_type-v58,
  body.pmd-kds-onepage-v95-polish .pmd92-card:first-of-type .pmd-kds-field-is_active-v58,
  body.pmd-kds-onepage-v95-polish .pmd92-card:first-of-type .pmd-kds-field-location_id-v58 {
    grid-column: auto !important;
    grid-row: auto !important;
  }
}
</style>

<script id="pmd-kds-settings-v146-final-polish-script">
(function () {
  if (!/^\/admin\/kds_stations\/(create|edit\/\d+)/.test(location.pathname)) return;
  if (window.__PMD_KDS_SETTINGS_V146_FINAL_POLISH__) return;
  window.__PMD_KDS_SETTINGS_V146_FINAL_POLISH__ = true;

  function visible(el) {
    if (!el) return false;
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    return cs.display !== 'none' &&
      cs.visibility !== 'hidden' &&
      Number(cs.opacity || 1) > 0.01 &&
      r.width > 2 &&
      r.height > 2;
  }

  function ready() {
    var shell = document.querySelector('.pmd92-shell');
    var v144 = window.PMD_KDS_SETTINGS_V144_FINAL_BOOT_ONCE_REPORT;
    var v95 = window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT;
    return !!shell &&
      shell.querySelectorAll('.pmd92-card').length > 0 &&
      v144 && v144.v95Status === 'OK' &&
      v95 && v95.summary && v95.summary.status === 'OK';
  }

  function cleanup() {
    var shell = document.querySelector('.pmd92-shell');
    if (!shell) return false;

    document.body.classList.add('pmd-kds-settings-v146-final-polish');

    shell.querySelectorAll('.selectonic,.selectonic-input,.select2-container,.chosen-container,.selectize-control,.ts-wrapper,.choices,.bootstrap-select,.dropdown-toggle').forEach(function (el) {
      el.setAttribute('data-pmd-v146-hidden-select-shell', '1');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('height', '0', 'important');
      el.style.setProperty('min-height', '0', 'important');
      el.style.setProperty('max-height', '0', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
    });

    shell.querySelectorAll('select').forEach(function (el) {
      el.style.setProperty('display', 'block', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('width', '100%', 'important');
      el.style.setProperty('height', '48px', 'important');
      el.style.setProperty('min-height', '48px', 'important');
    });

    var report = {
      mark: 'PMD_KDS_SETTINGS_V146_FINAL_POLISH_AFTER_V144',
      path: location.pathname,
      shellExists: !!shell,
      shells: document.querySelectorAll('.pmd92-shell').length,
      cards: shell.querySelectorAll('.pmd92-card').length,
      hiddenSelectShells: shell.querySelectorAll('[data-pmd-v146-hidden-select-shell="1"]').length,
      visibleSelects: Array.prototype.slice.call(shell.querySelectorAll('select')).filter(visible).length,
      visiblePluginSelects: Array.prototype.slice.call(shell.querySelectorAll('.selectonic,.select2-container,.chosen-container,.selectize-control,.choices,.bootstrap-select')).filter(visible).length,
      v144Status: window.PMD_KDS_SETTINGS_V144_FINAL_BOOT_ONCE_REPORT && window.PMD_KDS_SETTINGS_V144_FINAL_BOOT_ONCE_REPORT.v95Status,
      v95Status: window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT && window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT.summary && window.PMD_KDS_SETTINGS_ONEPAGE_V95_POLISH_REPORT.summary.status,
      status: 'OK'
    };

    window.PMD_KDS_SETTINGS_V146_FINAL_POLISH_REPORT = report;

    try {
      console.log('✅ PMD KDS SETTINGS v146 FINAL POLISH AFTER V144');
      console.table([report]);
    } catch (e) {}

    return true;
  }

  var tries = 0;
  function waitThenClean() {
    tries++;
    if (ready()) {
      cleanup();
      return;
    }

    if (tries < 35) {
      setTimeout(waitThenClean, 80);
      return;
    }

    cleanup();
  }

  waitThenClean();

  window.PMDKdsSettingsV146FinalPolish = {
    check: function () {
      return window.PMD_KDS_SETTINGS_V146_FINAL_POLISH_REPORT || {
        mark: 'PMD_KDS_SETTINGS_V146_FINAL_POLISH_AFTER_V144',
        tries: tries,
        ready: ready(),
        status: 'PENDING'
      };
    }
  };
})();
</script>
<!-- PMD_KDS_SETTINGS_V146_FINAL_POLISH_AFTER_V144_END -->






\n
\n