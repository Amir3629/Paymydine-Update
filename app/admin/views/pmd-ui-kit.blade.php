<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PMD Admin UI Kit</title>
  <link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-ui-kit-v1.css?v=2_1783119816">
</head>
<body class="pmd-ui-kit-page">
  <div class="pmd-ui-shell">
    <aside class="pmd-ui-sidebar">
      <div class="pmd-ui-sidebar-inner">
        <div class="pmd-ui-logo">P</div>
        <div class="pmd-ui-nav-dot is-active">⌂</div>
        <div class="pmd-ui-nav-dot">▣</div>
        <div class="pmd-ui-nav-dot">☷</div>
        <div class="pmd-ui-nav-dot">✎</div>
        <div class="pmd-ui-nav-dot">⚙</div>
        <div style="flex:1"></div>
        <div class="pmd-ui-nav-dot">⏻</div>
      </div>
    </aside>

    <main class="pmd-ui-main">
      <header class="pmd-ui-topbar">
        <div class="pmd-ui-title-row">
          <a class="pmd-ui-back" href="/admin">←</a>
          <div>
            <h1 class="pmd-ui-page-title">PMD Admin UI Kit</h1>
            <p class="pmd-ui-page-sub">Development / QA reference based on the KDS create page.</p>
          </div>
        </div>

        <div class="pmd-ui-toolbar">
          <button class="pmd-ui-btn pmd-ui-btn-secondary">Preview</button>
          <button class="pmd-ui-btn pmd-ui-btn-primary">Save</button>
          <button class="pmd-ui-btn pmd-ui-btn-icon">🔔</button>
        </div>
      </header>

      <div class="pmd-ui-grid">
        <section class="pmd-ui-card">
          <div class="pmd-ui-section-head">
            <div class="pmd-ui-section-icon">🧱</div>
            <div>
              <p class="pmd-ui-eyebrow">Foundation</p>
              <h2 class="pmd-ui-h2">Design Tokens</h2>
              <p class="pmd-ui-desc">These are the shared PMD admin rules: green actions, soft blue borders, 50px controls, rounded cards, readable labels.</p>
            </div>
          </div>

          <div class="pmd-ui-token-list">
            <div class="pmd-ui-token">#087762 <small>Primary green</small></div>
            <div class="pmd-ui-token">#60bee8 <small>Soft PMD blue border</small></div>
            <div class="pmd-ui-token">50px <small>Control height</small></div>
            <div class="pmd-ui-token">24px <small>Section card radius</small></div>
            <div class="pmd-ui-token">14–16px <small>Input/button radius</small></div>
            <div class="pmd-ui-token">0 18px 44px <small>Card shadow</small></div>
          </div>
        </section>

        <section class="pmd-ui-card">
          <div class="pmd-ui-section-head">
            <div class="pmd-ui-section-icon">🖱️</div>
            <div>
              <p class="pmd-ui-eyebrow">Actions</p>
              <h2 class="pmd-ui-h2">Buttons & Toolbar</h2>
              <p class="pmd-ui-desc">Every admin page should use these button sizes and states.</p>
            </div>
          </div>

          <div class="pmd-ui-toolbar">
            <button class="pmd-ui-btn pmd-ui-btn-primary">Primary Action</button>
            <button class="pmd-ui-btn pmd-ui-btn-secondary">Secondary</button>
            <button class="pmd-ui-btn pmd-ui-btn-danger">Delete</button>
            <button class="pmd-ui-btn">Default</button>
            <button class="pmd-ui-btn pmd-ui-btn-icon">💾</button>
            <button class="pmd-ui-btn pmd-ui-btn-icon">🗑️</button>
            <a class="pmd-ui-back" href="#">←</a>
          </div>
        </section>

        <section class="pmd-ui-card">
          <div class="pmd-ui-section-head">
            <div class="pmd-ui-section-icon">📝</div>
            <div>
              <p class="pmd-ui-eyebrow">Forms</p>
              <h2 class="pmd-ui-h2">Inputs, Selects, Textarea</h2>
              <p class="pmd-ui-desc">Base form controls for reservations, coupons, locations, categories, mealtimes, tables, themes, mail layouts.</p>
            </div>
          </div>

          <div class="pmd-ui-two">
            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Text input</label>
              <input class="pmd-ui-input" value="Main Kitchen">
              <div class="pmd-ui-help">Example helper text should be readable.</div>
            </div>

            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Select</label>
              <select class="pmd-ui-select">
                <option>Kitchen / Hot Food</option>
                <option>Bar</option>
                <option>Dessert</option>
              </select>
              <div class="pmd-ui-help">Dropdowns keep the same height and radius.</div>
            </div>
          </div>

          <div class="pmd-ui-field">
            <label class="pmd-ui-label">Textarea</label>
            <textarea class="pmd-ui-textarea">Internal note only. Customers will not see this.</textarea>
          </div>
        </section>

        <section class="pmd-ui-card">
          <div class="pmd-ui-section-head">
            <div class="pmd-ui-section-icon">✅</div>
            <div>
              <p class="pmd-ui-eyebrow">Choices</p>
              <h2 class="pmd-ui-h2">Checkbox, Radio Cards, Switch</h2>
              <p class="pmd-ui-desc">Coupon type, discount type, category assignment and KDS station options should follow this style.</p>
            </div>
          </div>

          <div class="pmd-ui-choice-grid">
            <label class="pmd-ui-choice is-active"><input type="radio" checked> Kitchen</label>
            <label class="pmd-ui-choice"><input type="radio"> Bar</label>
            <label class="pmd-ui-choice"><input type="radio"> Dessert</label>
            <label class="pmd-ui-choice"><input type="checkbox"> Appetizer</label>
            <label class="pmd-ui-choice"><input type="checkbox"> Drinks</label>
            <label class="pmd-ui-choice"><span class="pmd-ui-switch is-on"></span> Enabled</label>
          </div>
        </section>

        <section class="pmd-ui-card">
          <div class="pmd-ui-section-head">
            <div class="pmd-ui-section-icon">🧭</div>
            <div>
              <p class="pmd-ui-eyebrow">Navigation</p>
              <h2 class="pmd-ui-h2">Tabs</h2>
              <p class="pmd-ui-desc">Tabs should be simple, clear, and green when active.</p>
            </div>
          </div>

          <div class="pmd-ui-tabs">
            <div class="pmd-ui-tab is-active">Reservation</div>
            <div class="pmd-ui-tab">Settings</div>
            <div class="pmd-ui-tab">Advanced</div>
          </div>

          <div class="pmd-ui-help">Active tab uses green text, white background, soft blue border.</div>
        </section>

        <section class="pmd-ui-card">
          <div class="pmd-ui-section-head">
            <div class="pmd-ui-section-icon">📊</div>
            <div>
              <p class="pmd-ui-eyebrow">Data</p>
              <h2 class="pmd-ui-h2">Table</h2>
              <p class="pmd-ui-desc">Tables inside forms/settings should use soft row cards and readable labels.</p>
            </div>
          </div>

          <table class="pmd-ui-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Main Kitchen</td>
                <td>KDS Station</td>
                <td><span class="pmd-ui-badge">Enabled</span></td>
                <td><button class="pmd-ui-btn pmd-ui-btn-secondary">Edit</button></td>
              </tr>
              <tr>
                <td>Voucher Summer</td>
                <td>Coupon</td>
                <td><span class="pmd-ui-badge">Active</span></td>
                <td><button class="pmd-ui-btn pmd-ui-btn-secondary">Edit</button></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="pmd-ui-card">
          <div class="pmd-ui-section-head">
            <div class="pmd-ui-section-icon">🖼️</div>
            <div>
              <p class="pmd-ui-eyebrow">Media</p>
              <h2 class="pmd-ui-h2">Media Preview</h2>
              <p class="pmd-ui-desc">Image/media/upload widgets should keep the same card frame without breaking native controls.</p>
            </div>
          </div>

          <div class="pmd-ui-media">Media preview / upload area</div>
        </section>

        <section class="pmd-ui-card">
          <div class="pmd-ui-section-head">
            <div class="pmd-ui-section-icon">🪟</div>
            <div>
              <p class="pmd-ui-eyebrow">Overlay</p>
              <h2 class="pmd-ui-h2">Modal Mock</h2>
              <p class="pmd-ui-desc">Modal spacing and buttons should also follow the kit.</p>
            </div>
          </div>

          <div class="pmd-ui-modal-mock">
            <div class="pmd-ui-modal-head">
              <strong>Confirm action</strong>
              <button class="pmd-ui-btn pmd-ui-btn-icon">×</button>
            </div>
            <div class="pmd-ui-modal-body">
              This is the modal body. It should be readable, calm, and consistent with the rest of PMD admin.
            </div>
            <div class="pmd-ui-modal-foot">
              <button class="pmd-ui-btn">Cancel</button>
              <button class="pmd-ui-btn pmd-ui-btn-primary">Confirm</button>
            </div>
          </div>
        </section>

        <!-- PMD_UI_KIT_REAL_ADMIN_COMPONENTS_V2_START -->
        <section class="pmd-ui-card">
          <div class="pmd-ui-section-head">
            <div class="pmd-ui-section-icon">🧩</div>
            <div>
              <p class="pmd-ui-eyebrow">Real Admin Controls</p>
              <h2 class="pmd-ui-h2">Complete Form Components</h2>
              <p class="pmd-ui-desc">These are based on the actual admin form controls: relation, selectlist, currency, date/time, radiotoggle, checkboxlist, mediafinder, colorpicker, code editor, rich editor, schedule editor, map, status editor and datatable.</p>
            </div>
          </div>

          <div class="pmd-ui-two">
            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Native Dropdown / Select</label>
              <select class="pmd-ui-select">
                <option>Kitchen / Hot Food</option>
                <option>Bar</option>
                <option>Dessert</option>
                <option>Outdoor Area</option>
              </select>
              <div class="pmd-ui-help">Fixed v2: 50px height, custom arrow, no tiny native select.</div>
            </div>

            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Relation / Select2 / Selectize Mock</label>
              <div class="pmd-ui-mock-select">
                <strong>Main Location</strong>
                <span>SELECT</span>
              </div>
              <div class="pmd-ui-help">For relation, selectlist and plugin dropdown fields.</div>
            </div>
          </div>

          <div class="pmd-ui-three">
            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Currency Input</label>
              <div class="pmd-ui-control-row">
                <div class="pmd-ui-addon">€</div>
                <input class="pmd-ui-input" value="0.00">
              </div>
            </div>

            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Datepicker</label>
              <div class="pmd-ui-control-row">
                <input class="pmd-ui-input" type="text" value="2026-07-04">
                <div class="pmd-ui-addon">📅</div>
              </div>
            </div>

            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Timepicker</label>
              <div class="pmd-ui-control-row">
                <input class="pmd-ui-input" type="text" value="18:30">
                <div class="pmd-ui-addon">🕒</div>
              </div>
            </div>
          </div>

          <div class="pmd-ui-two">
            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Datetime / Date Range</label>
              <div class="pmd-ui-control-row">
                <input class="pmd-ui-input" value="2026-07-04 18:30 → 20:00">
                <div class="pmd-ui-addon">↔</div>
              </div>
            </div>

            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Permalink</label>
              <div class="pmd-ui-control-row">
                <div class="pmd-ui-addon">/</div>
                <input class="pmd-ui-input" value="main-kitchen">
              </div>
            </div>
          </div>

          <div class="pmd-ui-field">
            <label class="pmd-ui-label">Radiotoggle / Segmented Buttons</label>
            <div class="pmd-ui-segmented">
              <div class="pmd-ui-segment is-active">Coupon</div>
              <div class="pmd-ui-segment">Gift Card</div>
              <div class="pmd-ui-segment">Voucher</div>
              <div class="pmd-ui-segment">Credit</div>
              <div class="pmd-ui-segment">Comp</div>
            </div>
            <div class="pmd-ui-help">This is the rule for Coupon Type and Discount Type.</div>
          </div>

          <div class="pmd-ui-field">
            <label class="pmd-ui-label">Checkboxlist / Category Assignment</label>
            <div class="pmd-ui-choice-grid">
              <label class="pmd-ui-choice"><input type="checkbox"> Appetizers</label>
              <label class="pmd-ui-choice is-active"><input type="checkbox" checked> Main Courses</label>
              <label class="pmd-ui-choice"><input type="checkbox"> Desserts</label>
              <label class="pmd-ui-choice"><input type="checkbox"> Drinks</label>
            </div>
          </div>

          <div class="pmd-ui-two">
            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Mediafinder / Upload</label>
              <div class="pmd-ui-media">Image / file upload preview</div>
            </div>

            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Colorpicker</label>
              <div class="pmd-ui-color-row">
                <div class="pmd-ui-color-swatch"></div>
                <input class="pmd-ui-input" value="#087762">
              </div>
            </div>
          </div>

          <div class="pmd-ui-two">
            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Rich Editor</label>
              <div class="pmd-ui-editor">
                <div class="pmd-ui-editor-toolbar">
                  <button class="pmd-ui-btn pmd-ui-btn-icon">B</button>
                  <button class="pmd-ui-btn pmd-ui-btn-icon">I</button>
                  <button class="pmd-ui-btn pmd-ui-btn-icon">🔗</button>
                </div>
                <div class="pmd-ui-editor-body">Editable content area for rich text fields.</div>
              </div>
            </div>

            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Code Editor / Template Editor</label>
              <pre class="pmd-ui-code">&lt;h1&gt;Hello {{ customer_name }}&lt;/h1&gt;
&lt;p&gt;Your reservation is confirmed.&lt;/p&gt;</pre>
            </div>
          </div>

          <div class="pmd-ui-two">
            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Schedule Editor</label>
              <div class="pmd-ui-mini-card-grid">
                <div class="pmd-ui-mini-card"><strong>Monday</strong><small>09:00 – 22:00</small></div>
                <div class="pmd-ui-mini-card"><strong>Tuesday</strong><small>09:00 – 22:00</small></div>
              </div>
            </div>

            <div class="pmd-ui-field">
              <label class="pmd-ui-label">Map Area</label>
              <div class="pmd-ui-map">Map / location picker area</div>
            </div>
          </div>

          <div class="pmd-ui-field">
            <label class="pmd-ui-label">Status Editor</label>
            <div class="pmd-ui-status-row">
              <span class="pmd-ui-badge">Received</span>
              <span class="pmd-ui-badge">Confirmed</span>
              <span class="pmd-ui-badge">Seated</span>
              <span class="pmd-ui-badge">Completed</span>
            </div>
          </div>

          <div class="pmd-ui-field">
            <label class="pmd-ui-label">Datatable / Relation Table</label>
            <table class="pmd-ui-table">
              <thead>
                <tr><th>Item</th><th>Value</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                <tr><td>Table 12</td><td>4 seats</td><td><span class="pmd-ui-badge">Available</span></td><td><button class="pmd-ui-btn pmd-ui-btn-secondary">Select</button></td></tr>
                <tr><td>Table 18</td><td>2 seats</td><td><span class="pmd-ui-badge">Reserved</span></td><td><button class="pmd-ui-btn pmd-ui-btn-secondary">View</button></td></tr>
              </tbody>
            </table>
          </div>

          <div class="pmd-ui-field">
            <label class="pmd-ui-label">Accordion / Advanced Sections</label>
            <div class="pmd-ui-accordion">
              <div class="pmd-ui-accordion-item">
                <div class="pmd-ui-accordion-head">Opening Hours <span>⌄</span></div>
                <div class="pmd-ui-accordion-body">Nested form fields live here.</div>
              </div>
              <div class="pmd-ui-accordion-item">
                <div class="pmd-ui-accordion-head">Advanced Settings <span>›</span></div>
              </div>
            </div>
          </div>

          <div class="pmd-ui-alert">Alert / validation / information message component.</div>
          <div style="height:12px"></div>
          <div class="pmd-ui-empty">Empty state / no records / upload placeholder</div>
        </section>
        <!-- PMD_UI_KIT_REAL_ADMIN_COMPONENTS_V2_END -->

      </div>
    </main>
  </div>

  <script>
    window.PMDUIKit = {
      report() {
        const css = getComputedStyle(document.documentElement);
        return {
          ready: true,
          page: location.pathname,
          buttons: document.querySelectorAll('.pmd-ui-btn').length,
          inputs: document.querySelectorAll('.pmd-ui-input,.pmd-ui-textarea,.pmd-ui-select').length,
          cards: document.querySelectorAll('.pmd-ui-card').length,
          choices: document.querySelectorAll('.pmd-ui-choice').length,
          tokens: {
            green: css.getPropertyValue('--pmd-ui-green').trim(),
            blue: css.getPropertyValue('--pmd-ui-blue').trim(),
            controlHeight: css.getPropertyValue('--pmd-ui-control-h').trim(),
            radiusLarge: css.getPropertyValue('--pmd-ui-radius-lg').trim()
          }
        };
      }
    };
  </script>
</body>
</html>
