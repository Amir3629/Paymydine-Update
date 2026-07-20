<!-- PMD_MENU_FORM_V170_CREATE_EDIT_CARDS_START -->
@php
    $pmdMenuIsEdit = true;
    $pmdMenuMethod = 'PATCH';
    $pmdMenuTitle = $pmdMenuIsEdit ? 'Edit Menu Item' : 'Create Menu Item';
    $pmdMenuSubtitle = $pmdMenuIsEdit
        ? 'Update item details, image, pricing, availability, nutrition, and frontend visibility.'
        : 'Create a beautiful menu item with image, price, categories, nutrition, and customer badges.';

    $pmdMenuForm = $this->widgets['form'] ?? null;
    $pmdMenuRendered = [];
    $pmdMenuFormOk = false;

    try {
        if ($pmdMenuForm) {
            $pmdMenuForm->render(['useContainer' => false]);
            $pmdMenuFormOk = count($pmdMenuForm->getFields()) > 0;
        }
    } catch (\Throwable $e) {
        $pmdMenuFormOk = false;
    }

    $pmdMenuField = function ($name, $classes = '') use ($pmdMenuForm, &$pmdMenuRendered, &$pmdMenuFormOk) {
        try {
            if (!$pmdMenuFormOk || !$pmdMenuForm) {
                return '';
            }

            $field = $pmdMenuForm->getField($name);

            if (!$field) {
                return '';
            }

            $pmdMenuRendered[$name] = true;

            if ($classes !== '') {
                $existing = isset($field->cssClass) ? (string)$field->cssClass : '';
                $merged = trim($existing.' '.$classes);
                $field->cssClass = trim(implode(' ', array_unique(array_filter(preg_split('/\s+/', $merged)))));
            }

            return $pmdMenuForm->renderField($field);
        } catch (\Throwable $e) {
            return '';
        }
    };

    $pmdMenuHasField = function ($name) use ($pmdMenuForm, $pmdMenuFormOk) {
        try {
            return $pmdMenuFormOk && $pmdMenuForm && $pmdMenuForm->getField($name);
        } catch (\Throwable $e) {
            return false;
        }
    };
@endphp

<div class="pmd-menu-form-v170">
    {!! form_open([
        'id' => 'edit-form',
        'role' => 'form',
        'method' => $pmdMenuMethod,
    ]) !!}

    <div style="display:none">
        {!! $pmdMenuField('special[special_id]') !!}
    </div>

    <header class="pmd-menu-form-v170-hero" style="display:none!important">
        <div class="pmd-menu-form-v170-title-wrap">
            <div class="pmd-menu-form-v170-icon">🍽️</div>
            <div>
                <h1>{{ $pmdMenuTitle }}</h1>
                <p>{{ $pmdMenuSubtitle }}</p>
            </div>
        </div>

        <div class="pmd-menu-form-v170-actions">
            <a href="{{ admin_url('menus') }}" class="pmd-menu-form-v170-btn ghost">
                <i class="fa fa-arrow-left"></i>
                Back
            </a>

            @if($pmdMenuIsEdit && isset($formModel) && $formModel && $formModel->menu_id)
                <a href="{{ admin_url('menus/edit/'.$formModel->menu_id) }}" class="pmd-menu-form-v170-btn ghost">
                    <i class="fa fa-refresh"></i>
                    Reload
                </a>
            @endif

            <button type="submit"
                    class="pmd-menu-form-v170-btn primary"
                    data-request="onSave"
                    data-progress-indicator="Saving menu item...">
                <i class="fa fa-save"></i>
                Save Item
            </button>
        </div>
    </header>

    <nav class="pmd-menu-form-v171-nav" aria-label="Menu form sections">
        <button type="button" class="active" data-pmd-menu-section="Menu Essentials"><span>✨</span> Essentials</button>
        <button type="button" data-pmd-menu-section="Preview & Media"><span>🖼️</span> Media</button>
        <button type="button" data-pmd-menu-section="Dietary & Safety"><span>🥗</span> Dietary</button>
        <button type="button" data-pmd-menu-section="Nutrition & AI Assistant"><span>🧠</span> Nutrition</button>
        <button type="button" data-pmd-menu-section="Availability & Stock"><span>📍</span> Availability</button>
        <button type="button" data-pmd-menu-section="Guest Badges"><span>🏷️</span> Badges</button>
        <button type="button" data-pmd-menu-section="Special Offer"><span>💸</span> Special</button>
        <button type="button" data-pmd-menu-section="Finish & Save"><span>✅</span> Save</button>
    </nav>

    <div class="pmd-menu-form-v171-progress" aria-hidden="true">
        <div class="pmd-menu-form-v171-progress-bar"></div>
    </div>


    <div class="pmd-menu-form-v170-shell">
        <main class="pmd-menu-form-v170-main">
            <section class="pmd-menu-form-v170-card pmd-menu-form-v170-card-main">
                <div class="pmd-menu-form-v170-section-head">
                    <div class="pmd-menu-form-v170-section-icon">✨</div>
                    <div>
                        <h2>Item &amp; Media</h2>
                        <p>Food name, category, price, image, preparation time, and customer description.</p>
                    </div>
                </div>

                <div class="pmd-menu-form-v170-grid two pmd-menu-form-clean-v9-item-grid">
                    {!! $pmdMenuField('menu_name', 'pmd-v170-field-main') !!}
                    {!! $pmdMenuField('menu_price', 'pmd-v170-field-price') !!}
                    {!! $pmdMenuField('categories') !!}
                    {!! $pmdMenuField('prep_time_minutes') !!}
                </div>

                <div class="pmd-menu-form-v170-grid one">
                    {!! $pmdMenuField('menu_description', 'pmd-v170-field-description') !!}
                </div>
            </section>

            <section class="pmd-menu-form-v170-card pmd-menu-form-clean-v9-food-details">
                <div class="pmd-menu-form-v170-section-head">
                    <div class="pmd-menu-form-v170-section-icon">🥗</div>
                    <div>
                        <h2>Food Details &amp; AI</h2>
                        <p>Dietary badges, allergens, AI assistance, and nutrition values in one clean section.</p>
                    </div>
                </div>

                <div class="pmd-menu-form-v170-grid one pmd-menu-form-clean-v9-ai-row">
                    {!! $pmdMenuField('ai_nutrition_assistant') !!}
                </div>

                <div class="pmd-menu-form-v170-grid two compact-switches pmd-menu-form-clean-v9-diet-grid">
                    {!! $pmdMenuField('is_halal') !!}
                    {!! $pmdMenuField('is_vegetarian') !!}
                    {!! $pmdMenuField('is_vegan') !!}
                    {!! $pmdMenuField('allergens') !!}
                    {!! $pmdMenuField('color') !!}
                    {!! $pmdMenuField('spice_level') !!}
                </div>

                <div class="pmd-menu-form-v170-grid two pmd-menu-form-clean-v9-nutrition-grid">
                    {!! $pmdMenuField('calories') !!}
                    {!! $pmdMenuField('serving_size') !!}
                    {!! $pmdMenuField('protein') !!}
                    {!! $pmdMenuField('carbs') !!}
                    {!! $pmdMenuField('fat') !!}
                    {!! $pmdMenuField('sugar') !!}
                </div>
            </section>

            <section class="pmd-menu-form-v170-card">
                <div class="pmd-menu-form-v170-section-head">
                    <div class="pmd-menu-form-v170-section-icon">📍</div>
                    <div>
                        <h2>Availability</h2>
                        <p>Status, stock, prep time, locations, mealtimes, and order rules.</p>
                    </div>
                </div>

                <div class="pmd-menu-form-v170-grid two">
                    {!! $pmdMenuField('mealtimes') !!}
                    {!! $pmdMenuField('locations') !!}
                    {!! $pmdMenuField('minimum_qty') !!}
                    {!! $pmdMenuField('stock_qty') !!}
                    {!! $pmdMenuField('order_restriction') !!}
                    {!! $pmdMenuField('menu_status') !!}
                    {!! $pmdMenuField('is_stock_out') !!}
                </div>
            </section>

            <details class="pmd-menu-form-v170-card pmd-menu-form-clean-v9-advanced">
                <summary>
                    <span><strong>Advanced settings</strong><small>Badges, add-ons, special offer, priority, and compatibility fields</small></span>
                    <em>Open</em>
                </summary>
                <div class="pmd-menu-form-clean-v9-advanced-body">
            <section class="pmd-menu-form-v170-card pmd-menu-form-clean-v9-advanced-inner">
                <div class="pmd-menu-form-v170-section-head">
                    <div class="pmd-menu-form-v170-section-icon">🏷️</div>
                    <div>
                        <h2>Guest Badges</h2>
                        <p>Chef choice and bestseller badges that make an item stand out to guests.</p>
                    </div>
                </div>

                <div class="pmd-menu-form-v170-grid two compact-switches">
                    {!! $pmdMenuField('is_chef_recommended') !!}
                    {!! $pmdMenuField('bestseller_override_mode') !!}
                    {!! $pmdMenuField('is_manual_bestseller') !!}
                </div>
            </section>

            @if($pmdMenuIsEdit)
            <section class="pmd-menu-form-v170-card pmd-menu-form-clean-v9-advanced-inner">
                <div class="pmd-menu-form-v170-section-head">
                    <div class="pmd-menu-form-v170-section-icon">🧩</div>
                    <div>
                        <h2>Options & Add-ons</h2>
                        <p>Attach modifiers, choices, and menu option groups.</p>
                    </div>
                </div>

                <div class="pmd-menu-form-v170-grid one">
                    {!! $pmdMenuField('_options') !!}
                    {!! $pmdMenuField('menu_options') !!}
                </div>
            </section>
            @endif

            <section class="pmd-menu-form-v170-card pmd-menu-form-clean-v9-advanced-inner">
                <div class="pmd-menu-form-v170-section-head">
                    <div class="pmd-menu-form-v170-section-icon">💸</div>
                    <div>
                        <h2>Special Offer</h2>
                        <p>Optional discount, validity, and scheduled promotion settings.</p>
                    </div>
                </div>

                <div class="pmd-menu-form-v170-grid two">
                    {!! $pmdMenuField('special[type]') !!}
                    {!! $pmdMenuField('special[special_price]') !!}
                    {!! $pmdMenuField('special[validity]') !!}
                    {!! $pmdMenuField('special[start_date]') !!}
                    {!! $pmdMenuField('special[end_date]') !!}
                    {!! $pmdMenuField('special[recurring_every]') !!}
                    {!! $pmdMenuField('special[recurring_from]') !!}
                    {!! $pmdMenuField('special[recurring_to]') !!}
                </div>
            </section>

            @php
                $pmdMenuRemaining = [];

                try {
                    if ($pmdMenuFormOk && $pmdMenuForm) {
                        foreach ($pmdMenuForm->getFields() as $name => $field) {
                            if (!isset($pmdMenuRendered[$name])) {
                                $pmdMenuRemaining[$name] = $field;
                            }
                        }
                    }
                } catch (\Throwable $e) {
                    $pmdMenuRemaining = [];
                }
            @endphp

            @if(count($pmdMenuRemaining))
                <details class="pmd-menu-form-v170-card pmd-menu-form-v170-advanced pmd-menu-form-clean-v9-advanced-inner">
                    <summary>
                        <span>Advanced / Remaining Fields</span>
                        <small>{{ count($pmdMenuRemaining) }} fields kept for compatibility</small>
                    </summary>

                    <div class="pmd-menu-form-v170-grid two">
                        @foreach($pmdMenuRemaining as $name => $field)
                            <div class="pmd-menu-form-v170-leftover" data-leftover-field="{{ e($name) }}">
                                {!! $pmdMenuForm->renderField($field) !!}
                            </div>
                        @endforeach
                    </div>
                </details>
            @endif

                </div>
            </details>
        </main>

        <aside class="pmd-menu-form-v170-side">
            <section class="pmd-menu-form-v170-card sticky">
                <div class="pmd-menu-form-v170-section-head">
                    <div class="pmd-menu-form-v170-section-icon">🖼️</div>
                    <div>
                        <h2>Preview & Media</h2>
                        <p>See the customer card, upload the hero image, and manage gallery images.</p>
                    </div>
                </div>

                <div class="pmd-menu-form-v170-grid one">
                    {!! $pmdMenuField('live_frontend_preview') !!}
                    {!! $pmdMenuField('thumb') !!}
                    {!! $pmdMenuField('menu_images_inline') !!}
                </div>
            </section>

            <section class="pmd-menu-form-v170-card pmd-menu-form-v170-save-card">
                <h2>Finish & Save</h2>
                <p>Review the item, then save. The original save/delete logic is unchanged.</p>

                <button type="submit"
                        class="pmd-menu-form-v170-btn primary wide"
                        data-request="onSave"
                        data-progress-indicator="Saving menu item...">
                    <i class="fa fa-save"></i>
                    Save Item
                </button>

                @if($pmdMenuIsEdit)
                    <button type="button"
                            class="pmd-menu-form-v170-btn danger wide"
                            data-request="onDelete"
                            data-request-data="_method:'DELETE'"
                            data-request-confirm="Delete this menu item?"
                            data-progress-indicator="Deleting menu item...">
                        <i class="fa fa-trash"></i>
                        Delete
                    </button>
                @endif
            </section>
        </aside>
    </div>

    {!! form_close() !!}
</div>

<style id="pmd-menu-form-v170-style">
.pmd-menu-form-v170,
.pmd-menu-form-v170 * {
  box-sizing: border-box;
}

.pmd-menu-form-v170 {
  --pmd-ink: #082f2b;
  --pmd-muted: #64748b;
  --pmd-border: #cfe8f6;
  --pmd-soft: #f8fcfb;
  --pmd-green: #006b55;
  --pmd-green-dark: #06483d;
  max-width: 1540px;
  margin: 28px auto 90px;
  padding: 0 22px;
  color: var(--pmd-ink);
}

.pmd-menu-form-v170-hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  margin-bottom: 20px;
}

.pmd-menu-form-v170-title-wrap {
  display: flex;
  gap: 18px;
  align-items: center;
}

.pmd-menu-form-v170-icon,
.pmd-menu-form-v170-section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.pmd-menu-form-v170-icon {
  width: 60px;
  height: 60px;
  border-radius: 22px;
  background: linear-gradient(135deg, #e7fff6 0%, #f4fffb 100%);
  border: 1px solid #bff2df;
  box-shadow: 0 14px 34px rgba(0, 107, 85, .12);
  font-size: 29px;
}

.pmd-menu-form-v170 h1 {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
  font-weight: 950;
  letter-spacing: -.04em;
}

.pmd-menu-form-v170 p {
  margin: 7px 0 0;
  color: var(--pmd-muted);
  font-weight: 700;
}

.pmd-menu-form-v170-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.pmd-menu-form-v170-btn {
  border: 1px solid var(--pmd-border);
  background: #fff;
  color: var(--pmd-ink);
  min-height: 46px;
  border-radius: 16px;
  padding: 0 18px;
  font-weight: 950;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  text-decoration: none !important;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(15, 23, 42, .04);
}

.pmd-menu-form-v170-btn.primary {
  background: var(--pmd-green);
  border-color: var(--pmd-green);
  color: #fff;
  box-shadow: 0 14px 32px rgba(0, 107, 85, .18);
}

.pmd-menu-form-v170-btn.ghost {
  background: #fff;
}

.pmd-menu-form-v170-btn.danger {
  background: #fff4f4;
  border-color: #ffcaca;
  color: #a31d1d;
}

.pmd-menu-form-v170-btn.wide {
  width: 100%;
}

.pmd-menu-form-v170-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 410px;
  gap: 20px;
  align-items: start;
}

.pmd-menu-form-v170-main {
  display: grid;
  gap: 18px;
}

.pmd-menu-form-v170-side {
  display: grid;
  gap: 18px;
}

.pmd-menu-form-v170-card {
  background: linear-gradient(180deg, #ffffff 0%, #fbfffd 100%);
  border: 1px solid var(--pmd-border);
  border-radius: 24px;
  padding: 22px;
  box-shadow: 0 18px 45px rgba(20, 45, 55, .07);
}

.pmd-menu-form-v170-card.sticky {
  position: sticky;
  top: 18px;
  z-index: 5;
}

.pmd-menu-form-v170-section-head {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  margin-bottom: 18px;
}

.pmd-menu-form-v170-section-icon {
  width: 42px;
  height: 42px;
  border-radius: 16px;
  background: #effdf7;
  border: 1px solid #c8f1df;
  font-size: 22px;
}

.pmd-menu-form-v170-section-head h2,
.pmd-menu-form-v170-save-card h2 {
  margin: 0;
  color: var(--pmd-ink);
  font-size: 20px;
  line-height: 1.15;
  font-weight: 950;
  letter-spacing: -.03em;
}

.pmd-menu-form-v170-section-head p {
  margin-top: 5px;
  font-size: 13px;
}

.pmd-menu-form-v170-grid {
  display: grid;
  gap: 16px;
}

.pmd-menu-form-v170-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pmd-menu-form-v170-grid.one {
  grid-template-columns: 1fr;
}

.pmd-menu-form-v170 .form-group {
  margin-bottom: 0 !important;
}

.pmd-menu-form-v170 label,
.pmd-menu-form-v170 .control-label {
  color: #24443f !important;
  font-weight: 900 !important;
  font-size: 12px !important;
  letter-spacing: .01em;
}

.pmd-menu-form-v170 input:not([type="checkbox"]):not([type="radio"]),
.pmd-menu-form-v170 textarea,
.pmd-menu-form-v170 select,
.pmd-menu-form-v170 .form-control {
  min-height: 44px !important;
  border-radius: 14px !important;
  border: 1px solid #d8edf7 !important;
  background: #fff !important;
  color: #0f2f2b !important;
  box-shadow: none !important;
}

.pmd-menu-form-v170 textarea {
  min-height: 128px !important;
}

.pmd-menu-form-v170 .help-block,
.pmd-menu-form-v170 .form-text,
.pmd-menu-form-v170 small,
.pmd-menu-form-v170 .text-muted {
  color: #6b7f96 !important;
  font-weight: 650 !important;
}

.pmd-menu-form-v170 .switch-field,
.pmd-menu-form-v170 .checkbox-field,
.pmd-menu-form-v170 .checkboxtoggle-field {
  padding: 13px 14px !important;
  border: 1px solid #d8edf7 !important;
  border-radius: 16px !important;
  background: #fbfffd !important;
}

.pmd-menu-form-v170 .pmd-ai-nutrition.card,
.pmd-menu-form-v170 .pmd-live-preview-details {
  border-radius: 20px !important;
  border-color: #d8edf7 !important;
  box-shadow: none !important;
}

.pmd-menu-form-v170 .pmd-live-preview-image-wrap {
  border-radius: 18px !important;
}

.pmd-menu-form-v170 .pmd-main-thumb-gallery-wrap,
.pmd-menu-form-v170 #menu-inline-gallery.menu-inline-gallery {
  margin-top: 8px !important;
}

.pmd-menu-form-v170-advanced {
  padding: 0;
  overflow: hidden;
}

.pmd-menu-form-v170-advanced > summary {
  cursor: pointer;
  padding: 18px 22px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-weight: 950;
  color: var(--pmd-ink);
}

.pmd-menu-form-v170-advanced > .pmd-menu-form-v170-grid {
  padding: 0 22px 22px;
}

.pmd-menu-form-v170-leftover {
  min-width: 0;
}

.pmd-menu-form-v170-save-card {
  display: grid;
  gap: 12px;
}

.pmd-menu-form-v170-save-card p {
  margin-bottom: 4px;
}

@media (max-width: 1180px) {
  .pmd-menu-form-v170-shell {
    grid-template-columns: 1fr;
  }

  .pmd-menu-form-v170-card.sticky {
    position: relative;
    top: auto;
  }
}

@media (max-width: 760px) {
  .pmd-menu-form-v170 {
    padding: 0 12px;
    margin-top: 16px;
  }

  .pmd-menu-form-v170-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .pmd-menu-form-v170-grid.two {
    grid-template-columns: 1fr;
  }

  .pmd-menu-form-v170 h1 {
    font-size: 27px;
  }
}

/* PMD_MENU_FORM_V171_NAV_POLISH_START */
.pmd-menu-form-v171-nav {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: -2px 0 20px;
  padding: 12px;
  border: 1px solid #d8edf7;
  border-radius: 24px;
  background: rgba(255, 255, 255, .82);
  backdrop-filter: blur(16px);
  box-shadow: 0 18px 45px rgba(20, 45, 55, .07);
}

.pmd-menu-form-v171-nav button {
  border: 1px solid #cfe8f6;
  background: #fff;
  color: #082f2b;
  min-height: 42px;
  border-radius: 999px;
  padding: 0 17px;
  font-weight: 950;
  letter-spacing: -.01em;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform .16s ease, box-shadow .16s ease, background .16s ease, border-color .16s ease;
}

.pmd-menu-form-v171-nav button:hover {
  transform: translateY(-1px);
  border-color: #9fe8cf;
  box-shadow: 0 12px 28px rgba(0, 107, 85, .10);
}

.pmd-menu-form-v171-nav button.active {
  background: #006b55;
  border-color: #006b55;
  color: #fff;
  box-shadow: 0 16px 34px rgba(0, 107, 85, .20);
}

.pmd-menu-form-v171-progress {
  position: sticky;
  top: 76px;
  z-index: 29;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(207, 232, 246, .65);
  margin: -10px 0 18px;
}

.pmd-menu-form-v171-progress-bar {
  width: 0%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #006b55, #61d9a7);
  transition: width .18s ease;
}

.pmd-menu-form-v170-card {
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}

.pmd-menu-form-v170-card:hover {
  transform: translateY(-1px);
  border-color: #aeead6;
  box-shadow: 0 24px 58px rgba(20, 45, 55, .10);
}

.pmd-menu-form-v170-card.pmd-v171-active-card {
  border-color: #60d5b0 !important;
  box-shadow: 0 28px 70px rgba(0, 107, 85, .13) !important;
}

.pmd-menu-form-v170-section-icon {
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.75), 0 10px 24px rgba(0, 107, 85, .10);
}

.pmd-menu-form-v170 .pmd-menu-form-v170-card-main {
  background:
    radial-gradient(circle at 0% 0%, rgba(0, 107, 85, .07), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #fbfffd 100%) !important;
}

.pmd-menu-form-v170-save-card {
  background:
    radial-gradient(circle at 100% 0%, rgba(0, 107, 85, .10), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #fbfffd 100%) !important;
}

.pmd-menu-form-v170-save-card .pmd-menu-form-v170-btn.primary {
  min-height: 52px;
}

.pmd-menu-form-v170 .select2-container .select2-selection,
.pmd-menu-form-v170 .select2-selection {
  min-height: 44px !important;
  border-radius: 14px !important;
  border-color: #d8edf7 !important;
  background: #fff !important;
}

.pmd-menu-form-v170 .field-thumb .mediafinder,
.pmd-menu-form-v170 [data-control="mediafinder"] {
  border-radius: 18px !important;
}

.pmd-menu-form-v170 .pmd-live-preview-card {
  background:
    radial-gradient(circle at 50% 0%, rgba(255,255,255,.95), transparent 42%),
    linear-gradient(180deg, #f7fbff 0%, #eef6ff 100%) !important;
}

@media (max-width: 760px) {
  .pmd-menu-form-v171-nav {
    position: relative;
    top: auto;
    overflow-x: auto;
    flex-wrap: nowrap;
    border-radius: 18px;
  }

  .pmd-menu-form-v171-nav button {
    white-space: nowrap;
  }

  .pmd-menu-form-v171-progress {
    display: none;
  }
}

/* PMD_MENU_FORM_V172_CATEGORY_CHOOSER_START */
.pmd-menu-form-v170 .pmd172-category-enhanced {
  grid-column: 1 / -1 !important;
}

.pmd-menu-form-v170 .pmd172-category-enhanced > label,
.pmd-menu-form-v170 .pmd172-category-enhanced > .control-label,
.pmd-menu-form-v170 .pmd172-category-enhanced .select2-container,
.pmd-menu-form-v170 .pmd172-category-enhanced .select2,
.pmd-menu-form-v170 .pmd172-category-enhanced select {
  display: none !important;
}

.pmd172-category-panel {
  border: 1px solid #cfe8f6;
  border-radius: 20px;
  background:
    radial-gradient(circle at 0% 0%, rgba(0,107,85,.06), transparent 32%),
    linear-gradient(180deg, #ffffff 0%, #fbfffd 100%);
  padding: 14px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.75);
}

.pmd172-category-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.pmd172-category-head strong {
  display: block;
  color: #082f2b;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: -.01em;
}

.pmd172-category-head small {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
}

.pmd172-category-count {
  flex: 0 0 auto;
  border: 1px solid #bfead8;
  background: #effdf7;
  color: #006b55;
  border-radius: 999px;
  padding: 6px 10px;
  font-weight: 950;
  font-size: 12px;
}

.pmd172-category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(178px, 1fr));
  gap: 10px;
}

.pmd172-category-choice {
  position: relative;
  min-height: 48px;
  border: 1px solid #d8edf7;
  border-radius: 16px;
  background: #fff;
  color: #193c37;
  padding: 11px 12px 11px 42px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-weight: 900;
  line-height: 1.2;
  box-shadow: 0 8px 18px rgba(15, 23, 42, .035);
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease;
  user-select: none;
}

.pmd172-category-choice:hover {
  transform: translateY(-1px);
  border-color: #8be2c4;
  box-shadow: 0 14px 28px rgba(0,107,85,.09);
}

.pmd172-category-choice input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.pmd172-category-check {
  position: absolute;
  left: 12px;
  top: 50%;
  width: 20px;
  height: 20px;
  transform: translateY(-50%);
  border-radius: 8px;
  border: 2px solid #bddbea;
  background: #f8fcfb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pmd172-category-check:after {
  content: "";
  width: 8px;
  height: 5px;
  border-left: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(-45deg) translateY(-1px);
  opacity: 0;
}

.pmd172-category-choice.is-checked {
  background: linear-gradient(135deg, #006b55 0%, #06483d 100%);
  border-color: #006b55;
  color: #fff;
  box-shadow: 0 16px 34px rgba(0,107,85,.18);
}

.pmd172-category-choice.is-checked .pmd172-category-check {
  background: #0fd18a;
  border-color: #0fd18a;
}

.pmd172-category-choice.is-checked .pmd172-category-check:after {
  opacity: 1;
}

.pmd172-category-choice span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
}

.pmd172-category-empty {
  border: 1px dashed #cfe8f6;
  border-radius: 16px;
  padding: 14px;
  color: #64748b;
  font-weight: 800;
  background: #fff;
}

/* PMD_MENU_FORM_V173_HIDE_NATIVE_CATEGORY_START */
.pmd-menu-form-v170 .pmd173-category-native-hidden > label,
.pmd-menu-form-v170 .pmd173-category-native-hidden > .control-label,
.pmd-menu-form-v170 .pmd173-category-native-hidden select,
.pmd-menu-form-v170 .pmd173-category-native-hidden .select2,
.pmd-menu-form-v170 .pmd173-category-native-hidden .select2-container,
.pmd-menu-form-v170 .pmd173-category-native-hidden .select2-selection,
.pmd-menu-form-v170 .pmd173-category-native-hidden .select2-selection__rendered {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

.pmd-menu-form-v170 .pmd172-category-panel {
  margin-top: 0 !important;
  border-color: #bfead8 !important;
  background:
    radial-gradient(circle at 0% 0%, rgba(0,107,85,.08), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f8fffc 100%) !important;
}

.pmd-menu-form-v170 .pmd172-category-grid {
  grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)) !important;
}

.pmd-menu-form-v170 .pmd172-category-choice {
  min-height: 46px !important;
  border-radius: 15px !important;
}

.pmd-menu-form-v170 .pmd172-category-choice.is-checked {
  background:
    radial-gradient(circle at 0% 0%, rgba(255,255,255,.16), transparent 42%),
    linear-gradient(135deg, #006b55 0%, #053f36 100%) !important;
}
/* PMD_MENU_FORM_V173_HIDE_NATIVE_CATEGORY_END */

/* PMD_MENU_FORM_V172_CATEGORY_CHOOSER_END */

/* PMD_MENU_FORM_V171_NAV_POLISH_END */

</style>

@php
    $pmdMenuCategoryChoicesV172 = [];
    $pmdMenuSelectedCategoryIdsV172 = [];

    try {
        foreach (\Admin\Models\Categories_model::query()->orderBy('name', 'asc')->get() as $cat) {
            $id = (string)($cat->category_id ?? $cat->id ?? '');
            $name = (string)($cat->name ?? $cat->category_name ?? '');

            if ($id !== '' && $name !== '') {
                $pmdMenuCategoryChoicesV172[] = [
                    'id' => $id,
                    'name' => $name,
                ];
            }
        }
    } catch (\Throwable $e) {
        $pmdMenuCategoryChoicesV172 = [];
    }

    try {
        foreach (($formModel->categories ?? []) as $cat) {
            $id = (string)($cat->category_id ?? $cat->id ?? '');

            if ($id !== '') {
                $pmdMenuSelectedCategoryIdsV172[] = $id;
            }
        }
    } catch (\Throwable $e) {
        $pmdMenuSelectedCategoryIdsV172 = [];
    }
@endphp

<style id="pmd-menu-form-clean-v9-style">
/* PMD_MENU_FORM_CLEAN_V9_START
   Final visual cleanup for /admin/menus/create and /admin/menus/edit.
   Scope: hide duplicate category select, stabilize preview/media, clean sticky actions,
   and polish broken native TI fields without changing save/delete/backend logic.
*/

/* Old section navigator was useful for debugging, but the final page uses one natural scroll. */
.pmd-menu-form-v171-nav,
.pmd-menu-form-v171-progress {
  display: none !important;
}

/* Keep original save button in DOM for TastyIgniter request logic, but use the fixed top action bar. */
.pmd-menu-form-v170-actions {
  display: none !important;
}

/* Remove duplicate bottom save/advanced UI from the final page. Hidden fields remain rendered/submitted. */
.pmd-menu-form-v170-save-card,
.pmd-menu-form-v170-advanced {
  display: none !important;
}

/* Give the form a steadier two-column layout and avoid right-column content jumps. */
.pmd-menu-form-v170 {
  padding-bottom: 80px !important;
}

.pmd-menu-form-v170-shell {
  grid-template-columns: minmax(0, 1fr) 390px !important;
  gap: 22px !important;
  align-items: start !important;
}

.pmd-menu-form-v170-main {
  min-width: 0 !important;
}

.pmd-menu-form-v170-side {
  min-width: 0 !important;
}

.pmd-menu-form-v170-card.sticky {
  position: sticky !important;
  top: 112px !important;
  max-height: calc(100vh - 138px) !important;
  overflow: auto !important;
  scrollbar-width: thin !important;
}

/* Clean Preview & Media chrome. */
.pmd-menu-form-v170-side .pmd-menu-form-v170-section-head p,
.pmd-menu-form-v170 [data-field-name="live_frontend_preview"] > label,
.pmd-menu-form-v170 [data-field-name="live_frontend_preview"] > .form-label,
.pmd-menu-form-v170 [data-field-name="live_frontend_preview"] > .control-label,
.pmd-live-preview-details > summary {
  display: none !important;
}

.pmd-menu-form-v170-side .pmd-menu-form-v170-section-head {
  margin-bottom: 12px !important;
}

.pmd-live-preview-details,
.pmd-live-preview-card {
  border-radius: 22px !important;
  overflow: hidden !important;
}

.pmd-live-preview-image-wrap {
  height: 188px !important;
  min-height: 188px !important;
  border-radius: 18px !important;
  background:
    radial-gradient(circle at 12% 0%, rgba(255,255,255,.96), transparent 42%),
    linear-gradient(135deg, #f8fbff 0%, #edf5ff 100%) !important;
}

#pmd-prev-img {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  padding: 10px !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.pmd-menu-form-clean-v9-no-image #pmd-prev-img {
  opacity: .42 !important;
  filter: saturate(.85) !important;
}

/* Hide the duplicate native category select/tag row completely. The real select stays in the form; only its UI is hidden. */
.pmd-menu-form-v170 .pmd-menu-form-clean-v9-category-field,
.pmd-menu-form-v170 .pmd174c-category-field {
  grid-column: 1 / -1 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  min-height: 0 !important;
}

.pmd-menu-form-v170 .pmd-menu-form-clean-v9-category-field > :not(.pmd172-category-panel),
.pmd-menu-form-v170 .pmd174c-category-field > :not(.pmd172-category-panel) {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  max-height: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

.pmd-menu-form-v170 .pmd-menu-form-clean-v9-category-field .pmd172-category-panel,
.pmd-menu-form-v170 .pmd174c-category-field .pmd172-category-panel {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  height: auto !important;
  width: 100% !important;
  margin: 0 !important;
}

.pmd-menu-form-v170 .pmd172-category-choice {
  padding: 11px 12px 11px 42px !important;
}

/* MediaFinder + inline gallery: make the image area compact and intentional instead of broken/duplicated. */
.pmd-menu-form-v170 [data-field-name="thumb"] {
  margin-top: 10px !important;
}

.pmd-menu-form-v170 [data-field-name="thumb"] > label,
.pmd-menu-form-v170 [data-field-name="thumb"] > .control-label,
.pmd-menu-form-v170 [data-field-name="thumb"] > .form-label {
  display: block !important;
  margin-bottom: 10px !important;
  color: #132522 !important;
  font-size: 12px !important;
  font-weight: 950 !important;
}

.pmd-menu-form-v170 [data-control="mediafinder"],
.pmd-menu-form-v170 .field-mediafinder,
.pmd-menu-form-v170 .mediafinder-field,
.pmd-menu-form-v170 .mediafinder {
  max-width: 100% !important;
}

.pmd-menu-form-v170 [data-control="mediafinder"] img,
.pmd-menu-form-v170 .field-mediafinder img,
.pmd-menu-form-v170 .mediafinder img {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  display: block !important;
}

#menu-inline-gallery.menu-inline-gallery {
  gap: 10px !important;
  margin-top: 10px !important;
}

.pmd-menu-form-v170 [data-field-name="menu_images_inline"]::before,
.pmd-menu-images-inline-field::before {
  content: "Additional images";
  display: block !important;
  margin: 12px 0 8px !important;
  color: #132522 !important;
  font-size: 12px !important;
  font-weight: 950 !important;
}

#menu-inline-gallery .menu-inline-gallery__item,
#menu-inline-gallery .menu-inline-gallery__add {
  width: 118px !important;
  height: 118px !important;
  min-width: 118px !important;
  min-height: 118px !important;
  border-radius: 20px !important;
}

#menu-inline-gallery .menu-inline-gallery__item {
  padding: 8px !important;
}

#menu-inline-gallery .menu-inline-gallery__thumb-wrap {
  width: 100% !important;
  height: 100% !important;
  border-radius: 16px !important;
}

#menu-inline-gallery .menu-inline-gallery__add {
  border: 2px dashed #344966 !important;
  font-size: 28px !important;
  background: rgba(255,255,255,.86) !important;
}

/* Native relation/select fields such as Mealtime/Location/Allergens should not look like broken empty boxes. */
.pmd-menu-form-v170 .select2-container .select2-selection,
.pmd-menu-form-v170 .select2-selection,
.pmd-menu-form-v170 .selectize-input,
.pmd-menu-form-v170 .filter-option-inner-inner {
  border-radius: 15px !important;
  min-height: 42px !important;
}

.pmd-menu-form-v170 [data-field-name="mealtimes"] .select2-container,
.pmd-menu-form-v170 [data-field-name="locations"] .select2-container,
.pmd-menu-form-v170 [data-field-name="allergens"] .select2-container {
  width: 100% !important;
}

/* Stock buttons and option buttons: prevent the ugly flat segmented overflow visible in screenshots. */
.pmd-menu-form-v170 [data-field-name="stock_qty"] .input-group,
.pmd-menu-form-v170 [data-field-name="_options"] .input-group {
  display: flex !important;
  align-items: stretch !important;
  width: 100% !important;
  max-width: 100% !important;
}

.pmd-menu-form-v170 [data-field-name="stock_qty"] .input-group > .form-control,
.pmd-menu-form-v170 [data-field-name="_options"] .input-group > .form-control {
  min-width: 0 !important;
  flex: 1 1 auto !important;
}

.pmd-menu-form-v170 [data-field-name="stock_qty"] .btn,
.pmd-menu-form-v170 [data-field-name="_options"] .btn,
.pmd-menu-form-v170 [data-field-name="_options"] button {
  min-height: 42px !important;
  height: 42px !important;
  border-color: #d5e6f4 !important;
  color: #213b55 !important;
  background: #fff !important;
  font-weight: 900 !important;
  box-shadow: none !important;
}

.pmd-menu-form-v170 [data-field-name="_options"] .input-group {
  overflow-x: auto !important;
  scrollbar-width: thin !important;
}

.pmd-menu-form-v170 [data-field-name="_options"] .input-group .btn,
.pmd-menu-form-v170 [data-field-name="_options"] .input-group button {
  flex: 0 0 auto !important;
  white-space: nowrap !important;
}

/* Safe floating top actions. */
.pmd-menu-form-clean-v9-actions,
.pmd-v174b-top-actions {
  position: fixed !important;
  top: 58px !important;
  right: 112px !important;
  z-index: 1065 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 6px !important;
  border: 1px solid rgba(207, 232, 246, .95) !important;
  border-radius: 999px !important;
  background: rgba(255, 255, 255, .90) !important;
  backdrop-filter: blur(16px) !important;
  box-shadow: 0 16px 38px rgba(15, 23, 42, .10) !important;
}

.pmd-menu-form-clean-v9-btn,
.pmd-v174b-top-btn {
  height: 42px !important;
  min-height: 42px !important;
  border-radius: 999px !important;
  padding: 0 17px !important;
  border: 1px solid transparent !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  font-weight: 950 !important;
  cursor: pointer !important;
  white-space: nowrap !important;
  transition: transform .16s ease, box-shadow .16s ease !important;
}

.pmd-menu-form-clean-v9-btn:hover,
.pmd-v174b-top-btn:hover {
  transform: translateY(-1px) !important;
}

.pmd-menu-form-clean-v9-btn.ai,
.pmd-v174b-top-btn.ai {
  background: #fff8e7 !important;
  border-color: #ffe2a6 !important;
  color: #6a4400 !important;
  box-shadow: 0 10px 24px rgba(214, 143, 20, .10) !important;
}

.pmd-menu-form-clean-v9-btn.save,
.pmd-v174b-top-btn.save {
  background: #006b55 !important;
  border-color: #006b55 !important;
  color: #fff !important;
  box-shadow: 0 14px 32px rgba(0,107,85,.20) !important;
}

@media (max-width: 1200px) {
  .pmd-menu-form-v170-shell {
    grid-template-columns: 1fr !important;
  }

  .pmd-menu-form-v170-card.sticky {
    position: relative !important;
    top: 0 !important;
    max-height: none !important;
  }
}

@media (max-width: 900px) {
  .pmd-menu-form-clean-v9-actions,
  .pmd-v174b-top-actions {
    right: 14px !important;
    top: auto !important;
    bottom: 18px !important;
  }
}


/* PMD_MENU_FORM_CLEAN_V9_STICKY_SIDE_FIX_START
   Keep Preview & Media stable while scrolling. v2 cleaned the old JS; v4 compacts the final page into fewer visible sections and locks the media panel.
*/
.pmd-menu-form-v170-shell {
  grid-template-columns: minmax(720px, 1fr) 370px !important;
  gap: 24px !important;
}

.pmd-menu-form-v170-side {
  position: sticky !important;
  top: 130px !important;
  align-self: start !important;
  height: fit-content !important;
  z-index: 12 !important;
}

.pmd-menu-form-v170-card.sticky {
  position: relative !important;
  top: auto !important;
  max-height: calc(100vh - 156px) !important;
  overflow: auto !important;
  padding: 20px !important;
  scrollbar-width: thin !important;
}

.pmd-menu-form-clean-v9-actions,
.pmd-v174b-top-actions {
  top: 58px !important;
  right: 112px !important;
  z-index: 1080 !important;
}

.pmd-menu-form-v170-side .pmd-menu-form-v170-section-head {
  margin-bottom: 10px !important;
}

.pmd-menu-form-v170-side .pmd-menu-form-v170-section-icon {
  width: 38px !important;
  height: 38px !important;
  border-radius: 14px !important;
}

.pmd-menu-form-v170-side .pmd-menu-form-v170-section-head h2 {
  font-size: 19px !important;
}

.pmd-live-preview-image-wrap {
  height: 164px !important;
  min-height: 164px !important;
}

.pmd-live-preview-card {
  border-radius: 20px !important;
}

.pmd-live-preview-title,
.pmd-live-preview-name {
  font-size: 18px !important;
  line-height: 1.15 !important;
}

.pmd-live-preview-description,
.pmd-live-preview-subtitle {
  font-size: 12px !important;
  line-height: 1.35 !important;
}

.pmd-menu-form-v170 [data-field-name="thumb"] {
  margin-top: 8px !important;
}

.pmd-menu-form-v170 [data-field-name="thumb"] .mediafinder,
.pmd-menu-form-v170 [data-field-name="thumb"] [data-control="mediafinder"],
.pmd-menu-form-v170 [data-field-name="thumb"] .field-mediafinder {
  max-width: 118px !important;
}

#menu-inline-gallery .menu-inline-gallery__item,
#menu-inline-gallery .menu-inline-gallery__add {
  width: 96px !important;
  height: 96px !important;
  min-width: 96px !important;
  min-height: 96px !important;
  border-radius: 18px !important;
}

#menu-inline-gallery .menu-inline-gallery__add {
  font-size: 24px !important;
}

/* Better styling for the remaining native TI widgets visible in screenshots. */
.pmd-menu-form-v170 [data-field-name="color"] .input-group,
.pmd-menu-form-v170 [data-field-name="color"] .minicolors,
.pmd-menu-form-v170 [data-field-name="color"] .form-control {
  width: auto !important;
  max-width: 118px !important;
}

.pmd-menu-form-v170 [data-field-name="color"] input[type="color"] {
  width: 56px !important;
  height: 42px !important;
  padding: 4px !important;
  border-radius: 14px !important;
}

.pmd-menu-form-v170 [data-field-name="bestseller_override_mode"] .select2-container,
.pmd-menu-form-v170 [data-field-name="bestseller_override_mode"] .select2-selection,
.pmd-menu-form-v170 [data-field-name="bestseller_override_mode"] select,
.pmd-menu-form-v170 [data-field-name="allergens"] .select2-container,
.pmd-menu-form-v170 [data-field-name="allergens"] .select2-selection,
.pmd-menu-form-v170 [data-field-name="mealtimes"] .select2-container,
.pmd-menu-form-v170 [data-field-name="mealtimes"] .select2-selection,
.pmd-menu-form-v170 [data-field-name="locations"] .select2-container,
.pmd-menu-form-v170 [data-field-name="locations"] .select2-selection {
  min-height: 42px !important;
  border-radius: 14px !important;
  border-color: #d8edf7 !important;
  box-shadow: 0 8px 18px rgba(15,23,42,.035) !important;
}

.pmd-menu-form-v170 [data-field-name="bestseller_override_mode"] .select2-selection__rendered,
.pmd-menu-form-v170 [data-field-name="allergens"] .select2-selection__rendered,
.pmd-menu-form-v170 [data-field-name="mealtimes"] .select2-selection__rendered,
.pmd-menu-form-v170 [data-field-name="locations"] .select2-selection__rendered {
  line-height: 42px !important;
  color: #41526a !important;
  font-weight: 750 !important;
}

.pmd-menu-form-v170 .switch-field,
.pmd-menu-form-v170 .checkbox-field,
.pmd-menu-form-v170 .checkboxtoggle-field {
  min-height: 74px !important;
}

@media (max-width: 1200px) {
  .pmd-menu-form-v170-shell {
    grid-template-columns: 1fr !important;
  }

  .pmd-menu-form-v170-side {
    position: relative !important;
    top: auto !important;
    z-index: auto !important;
  }

  .pmd-menu-form-v170-card.sticky {
    max-height: none !important;
    overflow: visible !important;
  }
}
/* PMD_MENU_FORM_CLEAN_V9_STICKY_SIDE_FIX_END */



/* PMD_MENU_FORM_CLEAN_V9_COMPACT_FLOW_START
   Final compact flow requested earlier: visible sections are Item & Media, Food Details & AI, Availability, and collapsed Advanced.
*/
/* v9: reserve a real grid column for Preview & Media instead of floating it over the form. */
@media (min-width: 1201px) {
  .pmd-menu-form-v170 {
    max-width: 1380px !important;
    padding-left: 22px !important;
    padding-right: 22px !important;
  }

  .pmd-menu-form-v170-shell {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 360px !important;
    gap: 24px !important;
    align-items: start !important;
  }

  .pmd-menu-form-v170-main {
    max-width: none !important;
    min-width: 0 !important;
    display: grid !important;
    gap: 18px !important;
  }

  .pmd-menu-form-v170-side {
    position: sticky !important;
    top: 118px !important;
    right: auto !important;
    width: auto !important;
    max-height: calc(100vh - 144px) !important;
    overflow: auto !important;
    z-index: 24 !important;
    scrollbar-width: thin !important;
  }

  .pmd-menu-form-v170-side .pmd-menu-form-v170-card.sticky {
    position: relative !important;
    top: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
}

@media (min-width: 1201px) and (max-width: 1380px) {
  .pmd-menu-form-v170 {
    max-width: calc(100vw - 150px) !important;
    margin-left: 118px !important;
    margin-right: 24px !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .pmd-menu-form-v170-shell {
    grid-template-columns: minmax(0, 1fr) 326px !important;
    gap: 18px !important;
  }

  .pmd-live-preview-image-wrap {
    height: 142px !important;
    min-height: 142px !important;
  }

  #menu-inline-gallery .menu-inline-gallery__item,
  #menu-inline-gallery .menu-inline-gallery__add {
    width: 82px !important;
    height: 82px !important;
    min-width: 82px !important;
    min-height: 82px !important;
  }
}

.pmd-menu-form-clean-v9-actions,
.pmd-v174b-top-actions {
  top: 58px !important;
  right: 112px !important;
  z-index: 1090 !important;
}

.pmd-menu-form-clean-v9-item-grid [data-field-name="categories"],
.pmd-menu-form-clean-v9-item-grid .field-categories,
.pmd-menu-form-clean-v9-item-grid .pmd-menu-form-clean-v9-category-field {
  grid-column: 1 / -1 !important;
}

.pmd-menu-form-clean-v9-ai-row {
  margin-bottom: 14px !important;
}

.pmd-menu-form-clean-v9-diet-grid {
  margin-bottom: 14px !important;
}

.pmd-menu-form-clean-v9-nutrition-grid {
  padding-top: 14px !important;
  border-top: 1px solid rgba(207,232,246,.78) !important;
}

.pmd-menu-form-clean-v9-advanced {
  padding: 0 !important;
  overflow: hidden !important;
  border-color: #c7ebdc !important;
}

.pmd-menu-form-clean-v9-advanced > summary {
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 14px !important;
  padding: 18px 22px !important;
  list-style: none !important;
}

.pmd-menu-form-clean-v9-advanced > summary::-webkit-details-marker {
  display: none !important;
}

.pmd-menu-form-clean-v9-advanced > summary strong {
  display: block !important;
  color: #082f2b !important;
  font-size: 20px !important;
  font-weight: 950 !important;
  letter-spacing: -.03em !important;
}

.pmd-menu-form-clean-v9-advanced > summary small {
  display: block !important;
  margin-top: 4px !important;
  color: #64748b !important;
  font-weight: 750 !important;
}

.pmd-menu-form-clean-v9-advanced > summary em {
  flex: 0 0 auto !important;
  font-style: normal !important;
  border: 1px solid #bfead8 !important;
  background: #effdf7 !important;
  color: #006b55 !important;
  border-radius: 999px !important;
  padding: 8px 13px !important;
  font-weight: 950 !important;
}

.pmd-menu-form-clean-v9-advanced[open] > summary em::before {
  content: "Close" !important;
}

.pmd-menu-form-clean-v9-advanced[open] > summary em {
  font-size: 0 !important;
}

.pmd-menu-form-clean-v9-advanced[open] > summary em::before {
  font-size: 13px !important;
}

.pmd-menu-form-clean-v9-advanced-body {
  display: grid !important;
  gap: 14px !important;
  padding: 0 18px 18px !important;
}

.pmd-menu-form-clean-v9-advanced-inner {
  box-shadow: none !important;
  border-radius: 18px !important;
  padding: 18px !important;
  background: rgba(255,255,255,.82) !important;
}

.pmd-menu-form-clean-v9-advanced-inner .pmd-menu-form-v170-section-head {
  margin-bottom: 12px !important;
}

.pmd-menu-form-clean-v9-advanced-inner .pmd-menu-form-v170-section-head h2 {
  font-size: 17px !important;
}

/* Do not completely hide advanced compatibility fields anymore; they are available inside Advanced when needed. */
.pmd-menu-form-v170-advanced {
  display: block !important;
}

/* Compact the color picker so it no longer breaks into the small second-row arrow seen in screenshots. */
.pmd-menu-form-v170 [data-field-name="color"] .input-group,
.pmd-menu-form-v170 [data-field-name="color"] .minicolors,
.pmd-menu-form-v170 [data-field-name="color"] .field-colorpicker {
  display: inline-flex !important;
  align-items: center !important;
  width: auto !important;
  max-width: 96px !important;
}

.pmd-menu-form-v170 [data-field-name="color"] .input-group-append,
.pmd-menu-form-v170 [data-field-name="color"] .input-group-prepend,
.pmd-menu-form-v170 [data-field-name="color"] button,
.pmd-menu-form-v170 [data-field-name="color"] .btn {
  display: none !important;
}

.pmd-menu-form-v170 [data-field-name="color"] input:not([type="checkbox"]):not([type="radio"]),
.pmd-menu-form-v170 [data-field-name="color"] .form-control {
  width: 64px !important;
  max-width: 64px !important;
  min-width: 64px !important;
  min-height: 42px !important;
  padding: 4px !important;
}

/* The internal unavailable AI note is noisy; keep fields editable and let the top AI button handle attempts. */
.pmd-menu-form-v170 .pmd-ai-unavailable,
.pmd-menu-form-v170 .ai-unavailable,
.pmd-menu-form-v170 [data-pmd-ai-unavailable] {
  display: none !important;
}

@media (max-width: 1200px) {
  .pmd-menu-form-v170 {
    padding-right: 18px !important;
  }

  .pmd-menu-form-v170-side {
    position: relative !important;
    top: auto !important;
    right: auto !important;
    width: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
}


/* PMD_MENU_FORM_CLEAN_V9_NO_OVERLAY_FINAL_START
   Hard override: Preview & Media must never overlap the main form on desktop. */
@media (min-width: 1201px) {
  .pmd-menu-form-v170-shell {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 360px !important;
    gap: 24px !important;
  }

  .pmd-menu-form-v170-main {
    max-width: none !important;
    width: auto !important;
  }

  .pmd-menu-form-v170-side {
    position: sticky !important;
    top: 118px !important;
    right: auto !important;
    width: auto !important;
    max-width: 360px !important;
    transform: none !important;
  }
}

@media (min-width: 1201px) and (max-width: 1380px) {
  .pmd-menu-form-v170-shell {
    grid-template-columns: minmax(0, 1fr) 326px !important;
    gap: 18px !important;
  }

  .pmd-menu-form-v170-side {
    max-width: 326px !important;
  }
}
/* PMD_MENU_FORM_CLEAN_V9_NO_OVERLAY_FINAL_END */

/* PMD_MENU_FORM_CLEAN_V9_COMPACT_FLOW_END */



/* PMD_MENU_FORM_CLEAN_V9_HEADER_MEDIA_AI_Diet_START
   v9: header-native actions, preview image upload overlay, no visible AI assistant block,
   live-preview sync, and category-style dietary/allergen controls.
*/
/* The AI partial is kept in DOM for backend compatibility, but its old card UI is removed from the page. */
.pmd-menu-form-v170 [data-field-name="ai_nutrition_assistant"],
.pmd-menu-form-clean-v9-ai-row {
  display: none !important;
}

/* Header actions now live inside the native navbar, not as a floating overlay over the page. */
#menu-mainmenu #pmd-menu-form-clean-v9-header-actions-item,
.navbar-nav #pmd-menu-form-clean-v9-header-actions-item {
  display: flex !important;
  align-items: center !important;
  margin: 0 8px 0 0 !important;
  padding: 0 !important;
  list-style: none !important;
}

#menu-mainmenu .pmd-menu-form-clean-v9-actions,
.navbar-nav .pmd-menu-form-clean-v9-actions {
  position: static !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  z-index: auto !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 5px !important;
  border: 1px solid rgba(207, 232, 246, .95) !important;
  border-radius: 999px !important;
  background: rgba(255, 255, 255, .92) !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, .08) !important;
  backdrop-filter: blur(12px) !important;
  white-space: nowrap !important;
}

body > .pmd-menu-form-clean-v9-actions,
body > .pmd-v174b-top-actions,
body > .pmd-menu-form-clean-v5-actions,
body > .pmd-menu-form-clean-v4-actions {
  display: none !important;
}

.pmd-menu-form-clean-v9-btn {
  height: 38px !important;
  min-height: 38px !important;
  border-radius: 999px !important;
  padding: 0 15px !important;
  border: 1px solid transparent !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  font-weight: 950 !important;
  cursor: pointer !important;
  white-space: nowrap !important;
  line-height: 1 !important;
  font-size: 13px !important;
  transition: transform .16s ease, box-shadow .16s ease, opacity .16s ease !important;
}

.pmd-menu-form-clean-v9-btn:hover { transform: translateY(-1px) !important; }
.pmd-menu-form-clean-v9-btn[disabled] { opacity: .62 !important; cursor: wait !important; transform: none !important; }
.pmd-menu-form-clean-v9-btn.ai {
  background: #fff8e7 !important;
  border-color: #ffe2a6 !important;
  color: #6a4400 !important;
  box-shadow: 0 8px 20px rgba(214, 143, 20, .10) !important;
}
.pmd-menu-form-clean-v9-btn.save {
  background: #006b55 !important;
  border-color: #006b55 !important;
  color: #fff !important;
  box-shadow: 0 12px 26px rgba(0,107,85,.18) !important;
}

/* Preview & Media: keep a real right column, sticky while scrolling, but never overlay the form. */
@media (min-width: 1201px) {
  .pmd-menu-form-v170-shell {
    grid-template-columns: minmax(0, 1fr) 360px !important;
    gap: 26px !important;
  }
  .pmd-menu-form-v170-side {
    position: sticky !important;
    top: 106px !important;
    max-width: 360px !important;
    width: auto !important;
    max-height: calc(100vh - 126px) !important;
    overflow: auto !important;
    z-index: 10 !important;
    scrollbar-width: thin !important;
  }
}

.pmd-menu-form-v170-side .pmd-menu-form-v170-card.sticky {
  padding: 20px !important;
  border-color: #bfead8 !important;
}

.pmd-live-preview-image-wrap {
  position: relative !important;
  cursor: default !important;
}

.pmd-menu-form-clean-v9-preview-action {
  position: absolute !important;
  right: 12px !important;
  bottom: 12px !important;
  width: 46px !important;
  height: 46px !important;
  border-radius: 16px !important;
  border: 1px solid rgba(207,232,246,.95) !important;
  background: rgba(255,255,255,.95) !important;
  color: #1e3147 !important;
  box-shadow: 0 12px 26px rgba(15,23,42,.12) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  z-index: 8 !important;
  font-size: 18px !important;
}

.pmd-menu-form-clean-v9-preview-action span {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0,0,0,0) !important;
  border: 0 !important;
}

.pmd-live-preview-image-wrap:not(.pmd-menu-form-clean-v9-has-image) .pmd-menu-form-clean-v9-preview-action {
  left: 50% !important;
  top: 50% !important;
  right: auto !important;
  bottom: auto !important;
  transform: translate(-50%, -50%) !important;
  width: 70px !important;
  height: 70px !important;
  border-radius: 24px !important;
  border: 2px dashed #344966 !important;
  background: rgba(255,255,255,.88) !important;
  font-size: 30px !important;
}

/* Native main-image uploader is still used for the click action, but visually merged into the preview image. */
.pmd-menu-form-v170 [data-field-name="thumb"] > label,
.pmd-menu-form-v170 [data-field-name="thumb"] > .control-label,
.pmd-menu-form-v170 [data-field-name="thumb"] > .form-label,
.pmd-menu-form-v170 [data-field-name="thumb"] .help-block,
.pmd-menu-form-v170 [data-field-name="thumb"] .form-text {
  display: none !important;
}
.pmd-menu-form-v170 [data-field-name="thumb"] .mediafinder,
.pmd-menu-form-v170 [data-field-name="thumb"] [data-control="mediafinder"],
.pmd-menu-form-v170 [data-field-name="thumb"] .field-mediafinder {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  min-width: 1px !important;
  min-height: 1px !important;
  max-width: 1px !important;
  max-height: 1px !important;
  opacity: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}
.pmd-menu-form-v170 [data-field-name="thumb"] {
  min-height: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Additional images stay below the live card as the second uploader. */
.pmd-menu-form-v170 [data-field-name="menu_images_inline"]::before,
.pmd-menu-images-inline-field::before {
  content: "Additional images" !important;
  display: block !important;
  margin: 16px 0 8px !important;
  color: #132522 !important;
  font-size: 12px !important;
  font-weight: 950 !important;
}
#menu-inline-gallery .menu-inline-gallery__add {
  width: 94px !important;
  height: 94px !important;
  min-width: 94px !important;
  min-height: 94px !important;
}

/* Dietary controls: replace separate switch boxes with category-style cards. */
.pmd-menu-form-clean-v9-diet-panel {
  grid-column: 1 / -1 !important;
  border: 1px solid #cfe8f6 !important;
  border-radius: 20px !important;
  background: radial-gradient(circle at 0% 0%, rgba(0,107,85,.06), transparent 32%), linear-gradient(180deg, #ffffff 0%, #fbfffd 100%) !important;
  padding: 14px !important;
  margin: 0 0 14px !important;
}
.pmd-menu-form-clean-v9-diet-panel .pmd172-category-head { margin-bottom: 12px !important; }
.pmd-menu-form-clean-v9-diet-main-grid,
.pmd-menu-form-clean-v9-allergen-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)) !important;
  gap: 10px !important;
}
.pmd-menu-form-clean-v9-diet-panel .pmd172-category-choice small {
  display: block !important;
  font-size: 11px !important;
  font-weight: 850 !important;
  color: #64748b !important;
  margin-top: 2px !important;
}
.pmd-menu-form-clean-v9-diet-panel .pmd172-category-choice.is-checked small {
  color: rgba(255,255,255,.82) !important;
}
.pmd-menu-form-clean-v9-diet-native,
.pmd-menu-form-clean-v9-allergen-native-hidden {
  display: none !important;
}
.pmd-menu-form-clean-v9-allergen-section {
  display: none !important;
  margin-top: 12px !important;
  padding-top: 12px !important;
  border-top: 1px solid rgba(207,232,246,.78) !important;
}
.pmd-menu-form-clean-v9-allergen-section.is-open,
.pmd-menu-form-clean-v9-allergen-section.has-choices {
  display: block !important;
}
.pmd-menu-form-clean-v9-allergen-native-holder {
  margin-top: 10px !important;
}
.pmd-menu-form-clean-v9-allergen-native-holder > [data-field-name="allergens"] > label,
.pmd-menu-form-clean-v9-allergen-native-holder > [data-field-name="allergens"] > .control-label,
.pmd-menu-form-clean-v9-allergen-native-holder > [data-field-name="allergens"] > .form-label {
  display: none !important;
}

@media (max-width: 1200px) {
  #menu-mainmenu #pmd-menu-form-clean-v9-header-actions-item {
    order: -10 !important;
  }
  #menu-mainmenu .pmd-menu-form-clean-v9-actions {
    padding: 4px !important;
  }
  .pmd-menu-form-clean-v9-btn {
    height: 36px !important;
    min-height: 36px !important;
    padding: 0 12px !important;
  }
}

/* v9: make main image picker unmistakably part of the preview image itself. */
.pmd-live-preview-image-wrap.pmd-menu-form-clean-v9-preview-wrap-bound {
  position: relative !important;
  overflow: hidden !important;
  cursor: pointer !important;
}
.pmd-live-preview-image-wrap.pmd-menu-form-clean-v9-preview-wrap-bound #pmd-prev-img,
.pmd-live-preview-image-wrap.pmd-menu-form-clean-v9-preview-wrap-bound img {
  position: relative !important;
  z-index: 1 !important;
  pointer-events: none !important;
}
.pmd-live-preview-image-wrap.pmd-menu-form-clean-v9-preview-wrap-bound:before {
  content: "";
  position: absolute !important;
  inset: 0 !important;
  z-index: 2 !important;
  border-radius: inherit !important;
  pointer-events: none !important;
}
.pmd-live-preview-image-wrap.pmd-menu-form-clean-v9-preview-wrap-bound:not(.pmd-menu-form-clean-v9-has-image):before {
  background: radial-gradient(circle at 50% 50%, rgba(0,107,85,.10), transparent 34%) !important;
}
.pmd-menu-form-clean-v9-preview-action {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  z-index: 50 !important;
}
.pmd-menu-form-clean-v9-preview-action i {
  display: block !important;
  width: auto !important;
  height: auto !important;
  font-size: inherit !important;
  line-height: 1 !important;
  color: currentColor !important;
  pointer-events: none !important;
}
.pmd-live-preview-image-wrap:not(.pmd-menu-form-clean-v9-has-image) .pmd-menu-form-clean-v9-preview-action {
  color: #10233d !important;
  box-shadow: 0 18px 38px rgba(15,23,42,.16) !important;
}
.pmd-live-preview-image-wrap.pmd-menu-form-clean-v9-has-image .pmd-menu-form-clean-v9-preview-action {
  right: 12px !important;
  top: 12px !important;
  bottom: auto !important;
  left: auto !important;
  transform: none !important;
  width: 44px !important;
  height: 44px !important;
  border-radius: 15px !important;
}


/* PMD_MENU_FORM_CLEAN_V9_FINAL_POLISH_START
   Small visual hardening after browser test: keep the main uploader integrated,
   reduce placeholder text behind the plus button, and make Advanced closed cleanly.
*/
.pmd-live-preview-image-wrap.pmd-menu-form-clean-v9-preview-wrap-bound:not(.pmd-menu-form-clean-v9-has-image) #pmd-prev-img {
  opacity: .14 !important;
  filter: saturate(.75) !important;
  transform: scale(.94) !important;
}
.pmd-live-preview-image-wrap.pmd-menu-form-clean-v9-preview-wrap-bound:not(.pmd-menu-form-clean-v9-has-image) .pmd-menu-form-clean-v9-preview-action {
  width: 74px !important;
  height: 74px !important;
  border-radius: 24px !important;
  background: rgba(255,255,255,.94) !important;
  backdrop-filter: blur(12px) !important;
}
.pmd-menu-form-clean-v9-advanced:not([open]) .pmd-menu-form-clean-v9-advanced-body {
  display: none !important;
}
.pmd-menu-form-clean-v9-advanced:not([open]) {
  padding-bottom: 0 !important;
}
.pmd-menu-form-clean-v9-advanced:not([open]) > summary em::before {
  content: "Open" !important;
}
.pmd-menu-form-clean-v9-advanced:not([open]) > summary em {
  font-size: 0 !important;
}
.pmd-menu-form-clean-v9-advanced:not([open]) > summary em::before {
  font-size: 13px !important;
}
/* PMD_MENU_FORM_CLEAN_V9_FINAL_POLISH_END */

/* PMD_MENU_FORM_CLEAN_V9_FUNCTIONAL_QA_FIX_START
   Keep Preview & Media visible while the long form scrolls, and style live preview injected badges. */
@media (min-width: 1201px) {
  .pmd-menu-form-v170-side {
    position: relative !important;
    top: auto !important;
    align-self: start !important;
    overflow: visible !important;
    max-height: none !important;
  }
  .pmd-menu-form-v170-side > .pmd-menu-form-v170-card.sticky {
    position: sticky !important;
    top: 106px !important;
    max-height: calc(100vh - 126px) !important;
    overflow: auto !important;
  }
}
.pmd-live-preview-badges {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 6px !important;
  justify-content: center !important;
  margin-top: 10px !important;
}
.pmd-live-preview-badge {
  display: inline-flex !important;
  align-items: center !important;
  min-height: 24px !important;
  padding: 4px 9px !important;
  border-radius: 999px !important;
  background: rgba(0, 107, 85, .10) !important;
  border: 1px solid rgba(0, 107, 85, .22) !important;
  color: #005844 !important;
  font-size: 11px !important;
  font-weight: 800 !important;
}
.pmd-live-preview-nutrition {
  margin-top: 10px !important;
  font-size: 12px !important;
  color: #64748b !important;
  line-height: 1.45 !important;
  text-align: center !important;
}
/* PMD_MENU_FORM_CLEAN_V9_FUNCTIONAL_QA_FIX_END */


/* PMD_MENU_FORM_CLEAN_V9_HEADER_MEDIA_AI_Diet_END */

/* PMD_MENU_FORM_CLEAN_V9_END */
</style>
<script id="pmd-menu-form-clean-v9-script">
(function () {
  if (window.__PMD_MENU_FORM_CLEAN_V9__) return;
  window.__PMD_MENU_FORM_CLEAN_V9__ = true;

  var categoryChoices = @json(isset($pmdMenuCategoryChoicesV172) ? $pmdMenuCategoryChoicesV172 : []);
  var serverSelected = @json(isset($pmdMenuSelectedCategoryIdsV172) ? array_values(array_unique($pmdMenuSelectedCategoryIdsV172)) : []);


  function pmdFlash(message, kind) {
    var jq = window.jQuery || window.$;
    if (jq && jq.ti && jq.ti.flashMessage) {
      jq.ti.flashMessage({ class: kind || 'info', text: message, interval: 4, allowDismiss: true });
      return;
    }
    console.log('[PMD menu form clean v9]', kind || 'info', message);
  }

  function cssEscapeValue(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function field(name) {
    var direct = document.querySelector('[name="Menu[' + name + ']"], [name="' + name + '"]');
    if (direct) return direct;

    var slug = String(name || '').replace(/_/g, '-');
    var wrap = document.querySelector('[data-field-name="' + cssEscapeValue(name) + '"], .field-' + cssEscapeValue(slug) + ', .field-' + cssEscapeValue(name));
    if (!wrap) return null;

    var preferred = wrap.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])');
    if (preferred) return preferred;

    return wrap.querySelector('input, textarea, select');
  }

  function fieldValue(name) {
    var el = field(name);
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked ? '1' : '';
    return String(el.value || '').trim();
  }

  function setFieldValue(name, value) {
    var el = field(name);
    if (!el || value === null || value === undefined) return false;
    el.value = value;
    if (window.jQuery) window.jQuery(el).trigger('change');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function formatPreviewPrice(value) {
    value = String(value || '').trim();
    if (!value) value = '0';
    var num = parseFloat(value.replace(',', '.'));
    if (isNaN(num)) return value;
    return '€' + num.toFixed(2);
  }

  function isRtlText(text) {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text || '');
  }

  function selectedAllergenLabels() {
    var out = [];
    var wrap = document.querySelector('[data-field-name="allergens"]');
    if (!wrap) return out;
    wrap.querySelectorAll('select option:checked').forEach(function (opt) {
      if (opt.value && opt.textContent.trim()) out.push(opt.textContent.trim());
    });
    wrap.querySelectorAll('.select2-selection__choice').forEach(function (chip) {
      var text = (chip.getAttribute('title') || chip.textContent || '').replace(/^×\s*/, '').trim();
      if (text) out.push(text);
    });
    return Array.from(new Set(out));
  }

  function textLooksLike(el, re) {
    return !!(el && re.test(String(el.textContent || '').trim()));
  }

  function firstVisible(root, selector) {
    root = root || document;
    var nodes = Array.from(root.querySelectorAll(selector));
    return nodes.find(function (el) {
      var cs = window.getComputedStyle ? getComputedStyle(el) : null;
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
      var r = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 1, height: 1 };
      return r.width > 0 && r.height > 0;
    }) || nodes[0] || null;
  }

  function ensurePreviewTargets() {
    var panel = findPreviewPanel && findPreviewPanel();
    var root = panel || document.querySelector('[data-field-name="live_frontend_preview"]') || document;

    var nameEl = document.getElementById('pmd-prev-name')
      || firstVisible(root, '.pmd-live-preview-name, .pmd-live-preview-title, [data-pmd-preview-name]')
      || Array.from(root.querySelectorAll('h1,h2,h3,h4,strong,b,.h1,.h2,.h3,.h4')).find(function (el) {
        var txt = String(el.textContent || '').trim();
        return /^Item name$/i.test(txt) || /^Menu item$/i.test(txt);
      });

    var descEl = document.getElementById('pmd-prev-desc')
      || firstVisible(root, '.pmd-live-preview-description, .pmd-live-preview-subtitle, [data-pmd-preview-description]')
      || Array.from(root.querySelectorAll('p,small,div,span')).find(function (el) {
        return /Description preview will appear here/i.test(String(el.textContent || ''));
      });

    var priceEl = document.getElementById('pmd-prev-price')
      || firstVisible(root, '.pmd-live-preview-price, .pmd-live-preview-money, [data-pmd-preview-price]')
      || Array.from(root.querySelectorAll('span,div,strong,b')).find(function (el) {
        var txt = String(el.textContent || '').trim();
        return /^€\s*0(?:[.,]00)?$/.test(txt) || /^€/.test(txt);
      });

    var badgesEl = document.getElementById('pmd-prev-badges') || root.querySelector('.pmd-live-preview-badges, [data-pmd-preview-badges]');
    if (!badgesEl && priceEl && priceEl.parentElement) {
      badgesEl = document.createElement('div');
      badgesEl.className = 'pmd-live-preview-badges';
      priceEl.parentElement.insertAdjacentElement('afterend', badgesEl);
    }

    var nutritionEl = document.getElementById('pmd-prev-nutrition') || root.querySelector('.pmd-live-preview-nutrition, [data-pmd-preview-nutrition]');
    if (!nutritionEl && root && root !== document) {
      nutritionEl = document.createElement('div');
      nutritionEl.className = 'pmd-live-preview-nutrition';
      root.appendChild(nutritionEl);
    }

    if (nameEl && !nameEl.id) nameEl.id = 'pmd-prev-name';
    if (descEl && !descEl.id) descEl.id = 'pmd-prev-desc';
    if (priceEl && !priceEl.id) priceEl.id = 'pmd-prev-price';
    if (badgesEl && !badgesEl.id) badgesEl.id = 'pmd-prev-badges';
    if (nutritionEl && !nutritionEl.id) nutritionEl.id = 'pmd-prev-nutrition';

    return { name: nameEl, desc: descEl, price: priceEl, badges: badgesEl, nutrition: nutritionEl };
  }

  function updateLivePreview() {
    var name = fieldValue('menu_name') || 'Item name';
    var desc = fieldValue('menu_description') || 'Description preview will appear here.';
    var price = fieldValue('menu_price');

    var previewTargets = ensurePreviewTargets();
    var nameEl = document.getElementById('pmd-prev-name') || previewTargets.name;
    var descEl = document.getElementById('pmd-prev-desc') || previewTargets.desc;
    var priceEl = document.getElementById('pmd-prev-price') || previewTargets.price;
    var badgesEl = document.getElementById('pmd-prev-badges') || previewTargets.badges;
    var nutritionEl = document.getElementById('pmd-prev-nutrition') || previewTargets.nutrition;

    if (nameEl) nameEl.textContent = name;
    if (descEl) {
      descEl.textContent = desc;
      var rtl = isRtlText(desc);
      descEl.style.direction = rtl ? 'rtl' : 'ltr';
      descEl.style.textAlign = rtl ? 'right' : 'left';
    }
    if (priceEl) priceEl.textContent = formatPreviewPrice(price);

    if (badgesEl) {
      var badges = [];
      if (fieldValue('is_halal') === '1') badges.push('Halal');
      if (fieldValue('is_vegetarian') === '1') badges.push('Vegetarian');
      if (fieldValue('is_vegan') === '1') badges.push('Vegan');
      selectedAllergenLabels().slice(0, 4).forEach(function (a) { badges.push(a); });
      badgesEl.innerHTML = badges.map(function (b) {
        return '<span class="pmd-live-preview-badge">' + String(b).replace(/</g, '&lt;') + '</span>';
      }).join('');
    }

    if (nutritionEl) {
      var facts = [];
      ['calories','protein','carbs','fat','sugar'].forEach(function (key) {
        var value = fieldValue(key);
        if (value === '') return;
        if (key === 'calories') facts.push(value + ' kcal');
        if (key === 'protein') facts.push('Protein ' + value + 'g');
        if (key === 'carbs') facts.push('Carbs ' + value + 'g');
        if (key === 'fat') facts.push('Fat ' + value + 'g');
        if (key === 'sugar') facts.push('Sugar ' + value + 'g');
      });
      var serving = fieldValue('serving_size');
      if (!facts.length && !serving) {
        nutritionEl.innerHTML = '';
        nutritionEl.style.display = 'none';
      } else {
        nutritionEl.innerHTML = '<div><strong>Nutrition</strong> · ' + facts.join(' · ') + '</div>' + (serving ? '<div>Serving: ' + serving.replace(/</g, '&lt;') + '</div>' : '');
        nutritionEl.style.display = 'block';
      }
    }
  }

  function previewHasRealImage() {
    var img = document.getElementById('pmd-prev-img');
    var src = img ? String(img.getAttribute('src') || '') : '';
    if (!src) return false;
    if (/^data:image\//i.test(src)) return false;
    if (/Menu%20image%20preview|Menu image preview/i.test(src)) return false;
    return true;
  }


  function pmdVisibleScore(el) {
    if (!el) return 0;
    var cs = window.getComputedStyle ? getComputedStyle(el) : null;
    if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') === 0)) return 0;
    var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0, top: 99999, left: 99999 };
    var score = Math.max(0, rect.width) * Math.max(0, rect.height);
    if (el.closest('.pmd-menu-form-v170-side')) score += 100000000;
    if (el.closest('[data-field-name="live_frontend_preview"]')) score += 10000000;
    if (rect.top >= -20 && rect.top <= window.innerHeight + 300) score += 1000000;
    return score;
  }

  function findPreviewWrap() {
    var wraps = Array.from(document.querySelectorAll('.pmd-live-preview-image-wrap'));
    if (!wraps.length) return null;
    wraps.sort(function (a, b) { return pmdVisibleScore(b) - pmdVisibleScore(a); });
    return wraps[0];
  }

  function findPreviewPanel() {
    var wrap = findPreviewWrap();
    return (wrap && (wrap.closest('#pmd-live-preview-panel') || wrap.closest('.pmd-live-preview-card') || wrap.closest('.pmd-menu-edit-preview-panel'))) || document.getElementById('pmd-live-preview-panel') || document.querySelector('.pmd-menu-edit-preview-panel');
  }

  function findMainImagePickerButton() {
    return document.querySelector('[data-field-name="thumb"] .find-button.blank-cover')
      || document.querySelector('[data-field-name="thumb"] .find-button')
      || document.querySelector('[data-field-name="thumb"] [data-control="mediafinder"] a')
      || document.querySelector('[data-control="mediafinder"] .find-button.blank-cover')
      || document.querySelector('[data-control="mediafinder"] .find-button');
  }

  function triggerMainImagePicker() {
    var btn = findMainImagePickerButton();
    if (btn) {
      if (typeof btn.click === 'function') btn.click();
      else btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return;
    }
    pmdFlash('Image uploader button was not found on this page.', 'warning');
  }



  function findAdditionalImagePickerButton() {
    return document.querySelector('[data-field-name="menu_images_inline"] .find-button.blank-cover')
      || document.querySelector('[data-field-name="menu_images_inline"] .find-button')
      || document.querySelector('[data-field-name="menu_images_inline"] [data-control="mediafinder"] a')
      || document.querySelector('#menu-inline-gallery .find-button.blank-cover')
      || document.querySelector('#menu-inline-gallery .find-button')
      || document.querySelector('#menu-inline-gallery [data-control="mediafinder"] a');
  }

  function triggerAdditionalImagePicker() {
    var btn = findAdditionalImagePickerButton();
    if (btn) {
      if (typeof btn.click === 'function') btn.click();
      else btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return true;
    }
    pmdFlash('Additional image uploader button was not found on this page.', 'warning');
    return false;
  }

  function ensureAdditionalUploadBinding() {
    var wrap = document.querySelector('[data-field-name="menu_images_inline"], #menu-inline-gallery');
    if (!wrap) return false;
    wrap.setAttribute('data-pmd-additional-gallery-bound', '1');
    var btn = findAdditionalImagePickerButton();
    if (btn) {
      btn.setAttribute('data-pmd-additional-image-upload', '1');
      btn.setAttribute('title', btn.getAttribute('title') || 'Add gallery image');
      btn.setAttribute('aria-label', btn.getAttribute('aria-label') || 'Add gallery image');
    }
    return !!btn;
  }

  function ensurePreviewUpload() {
    var wrap = findPreviewWrap();
    if (!wrap) return false;
    wrap.classList.add('pmd-menu-form-clean-v9-preview-wrap-bound');
    var action = wrap.querySelector('.pmd-menu-form-clean-v9-preview-action');
    if (!action) {
      action = document.createElement('button');
      action.type = 'button';
      action.className = 'pmd-menu-form-clean-v9-preview-action';
      action.setAttribute('data-pmd-main-image-upload', '1');
      action.setAttribute('aria-label', 'Add or edit menu image');
      action.setAttribute('title', 'Add or edit menu image');
      wrap.appendChild(action);
    }
    var has = previewHasRealImage();
    wrap.classList.toggle('pmd-menu-form-clean-v9-has-image', has);
    action.innerHTML = has ? '<i class="fa fa-pencil"></i><span>Edit image</span>' : '<i class="fa fa-plus"></i><span>Add image</span>';
    return true;
  }

  function findBoolInput(name) {
    var inputs = Array.from(document.querySelectorAll('input[name="Menu[' + name + ']"], input[name="' + name + '"]'));
    return inputs.find(function (el) { return el.type === 'checkbox'; }) || inputs[inputs.length - 1] || null;
  }

  function getBool(name) {
    var input = findBoolInput(name);
    if (!input) return false;
    if (input.type === 'checkbox') return !!input.checked;
    return String(input.value || '') === '1';
  }

  function setBool(name, value) {
    var inputs = Array.from(document.querySelectorAll('input[name="Menu[' + name + ']"], input[name="' + name + '"]'));
    inputs.forEach(function (input) {
      if (input.type === 'checkbox') input.checked = !!value;
      else input.value = value ? '1' : '0';
      if (window.jQuery) window.jQuery(input).trigger('change');
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function findAllergensSelect() {
    return document.querySelector('[data-field-name="allergens"] select, select[name*="allergens"]');
  }

  function allergenSelectedSet(select) {
    return new Set(Array.from((select && select.options) || []).filter(function (opt) { return opt.selected && opt.value !== ''; }).map(function (opt) { return String(opt.value); }));
  }

  function syncAllergenSelect(select, values) {
    values = new Set(Array.from(values).map(String));
    Array.from((select && select.options) || []).forEach(function (opt) { opt.selected = values.has(String(opt.value)); });
    if (select) {
      if (window.jQuery) window.jQuery(select).trigger('change');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function updateDietPanel() {
    var panel = document.querySelector('.pmd-menu-form-clean-v9-diet-panel');
    if (!panel) return;
    ['is_halal','is_vegetarian','is_vegan'].forEach(function (name) {
      var choice = panel.querySelector('[data-pmd-diet-choice="' + name + '"]');
      if (!choice) return;
      var checked = getBool(name);
      choice.classList.toggle('is-checked', checked);
      var input = choice.querySelector('input');
      if (input) input.checked = checked;
      var small = choice.querySelector('small');
      if (small) small.textContent = checked ? 'Enabled' : 'Disabled';
    });

    var select = findAllergensSelect();
    var selected = allergenSelectedSet(select);
    panel.querySelectorAll('[data-pmd-allergen-choice]').forEach(function (choice) {
      var value = choice.getAttribute('data-pmd-allergen-choice');
      var checked = selected.has(String(value));
      choice.classList.toggle('is-checked', checked);
      var input = choice.querySelector('input');
      if (input) input.checked = checked;
    });
    var main = panel.querySelector('[data-pmd-diet-allergens-main]');
    if (main) {
      main.classList.toggle('is-checked', selected.size > 0);
      var small = main.querySelector('small');
      if (small) small.textContent = selected.size ? (selected.size + ' selected') : 'Select allergens';
    }
    updateLivePreview();
  }

  function ensureDietChoicePanel() {
    var dietGrid = document.querySelector('.pmd-menu-form-clean-v9-diet-grid');
    if (!dietGrid) return false;

    ['is_halal','is_vegetarian','is_vegan'].forEach(function (name) {
      var f = document.querySelector('[data-field-name="' + name + '"]');
      if (f) f.classList.add('pmd-menu-form-clean-v9-diet-native');
    });

    var panel = dietGrid.querySelector('.pmd-menu-form-clean-v9-diet-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'pmd-menu-form-clean-v9-diet-panel';
      panel.innerHTML =
        '<div class="pmd172-category-head"><div><strong>Dietary & Allergens</strong><small>Choose badges and allergy warnings guests should see.</small></div><div class="pmd172-category-count">Live</div></div>' +
        '<div class="pmd-menu-form-clean-v9-diet-main-grid"></div>' +
        '<div class="pmd-menu-form-clean-v9-allergen-section"><div class="pmd-menu-form-clean-v9-allergen-grid"></div><div class="pmd-menu-form-clean-v9-allergen-native-holder"></div></div>';
      dietGrid.insertBefore(panel, dietGrid.firstChild);
    }

    var mainGrid = panel.querySelector('.pmd-menu-form-clean-v9-diet-main-grid');
    if (mainGrid && !mainGrid.children.length) {
      [
        ['is_halal', 'Halal'],
        ['is_vegetarian', 'Vegetarian'],
        ['is_vegan', 'Vegan']
      ].forEach(function (item) {
        var label = document.createElement('label');
        label.className = 'pmd172-category-choice';
        label.setAttribute('data-pmd-diet-choice', item[0]);
        label.innerHTML = '<input type="checkbox"><span class="pmd172-category-check"></span><span>' + item[1] + '<small>Disabled</small></span>';
        mainGrid.appendChild(label);
      });
      var allergens = document.createElement('label');
      allergens.className = 'pmd172-category-choice';
      allergens.setAttribute('data-pmd-diet-allergens-main', '1');
      allergens.innerHTML = '<input type="checkbox"><span class="pmd172-category-check"></span><span>Allergens<small>Select allergens</small></span>';
      mainGrid.appendChild(allergens);
    }

    var select = findAllergensSelect();
    var allergyField = document.querySelector('[data-field-name="allergens"]');
    var nativeHolder = panel.querySelector('.pmd-menu-form-clean-v9-allergen-native-holder');
    var allergySection = panel.querySelector('.pmd-menu-form-clean-v9-allergen-section');
    var allergyGrid = panel.querySelector('.pmd-menu-form-clean-v9-allergen-grid');

    if (allergyField && nativeHolder && allergyField.parentElement !== nativeHolder) nativeHolder.appendChild(allergyField);

    var options = Array.from((select && select.options) || []).filter(function (opt) { return opt.value !== ''; });
    if (allergyGrid && options.length && allergyGrid.getAttribute('data-built-count') !== String(options.length)) {
      allergyGrid.innerHTML = '';
      options.forEach(function (opt) {
        var label = document.createElement('label');
        label.className = 'pmd172-category-choice';
        label.setAttribute('data-pmd-allergen-choice', String(opt.value));
        label.innerHTML = '<input type="checkbox" value="' + String(opt.value).replace(/"/g, '&quot;') + '"><span class="pmd172-category-check"></span><span>' + String(opt.textContent || opt.label || opt.value).replace(/</g, '&lt;') + '</span>';
        allergyGrid.appendChild(label);
      });
      allergyGrid.setAttribute('data-built-count', String(options.length));
      if (allergySection) allergySection.classList.add('has-choices');
      if (allergyField) allergyField.classList.add('pmd-menu-form-clean-v9-allergen-native-hidden');
    } else if (allergySection && !options.length) {
      allergySection.classList.remove('has-choices');
      if (allergyField) allergyField.classList.remove('pmd-menu-form-clean-v9-allergen-native-hidden');
    }

    updateDietPanel();
    return true;
  }


  function isBadMediaValue(value) {
    value = String(value || '').trim();
    if (!value) return true;
    if (value === '[]' || value === '{}' || value === 'null' || value === 'undefined') return true;
    if (/^\[\s*\]$/.test(value) || /^\{\s*\}$/.test(value)) return true;
    if (/^default-image\.png$/i.test(value)) return true;
    if (/^javascript:|^mailto:|^tel:/i.test(value)) return true;
    return false;
  }

  function mediaUrlCandidates(value) {
    value = String(value || '').trim();
    if (isBadMediaValue(value)) return [];

    var raw = value;
    var out = [];

    function add(v) {
      v = String(v || '').trim();
      if (isBadMediaValue(v)) return;
      if (out.indexOf(v) === -1) out.push(v);
    }

    if (/^data:image\//i.test(raw)) {
      add(raw);
      return out;
    }

    if (/^https?:\/\//i.test(raw)) {
      add(raw);
    } else if (raw.charAt(0) === '/') {
      add(window.location.origin + raw);
    }

    var path = raw;
    try {
      path = new URL(raw, window.location.origin).pathname;
    } catch (e) {}

    path = String(path || raw)
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/^\/+/, '')
      .trim();

    if (isBadMediaValue(path)) return out;

    if (/^assets\/media\//i.test(path)) add(window.location.origin + '/' + path);
    if (/^api\/media\//i.test(path)) add(window.location.origin + '/' + path);
    if (/^attachments\/public\//i.test(path)) add(window.location.origin + '/assets/media/' + path);
    if (/^uploads\//i.test(path)) add(window.location.origin + '/assets/media/' + path);

    if (path && /\.(png|jpe?g|webp|gif|svg)$/i.test(path)) {
      add(window.location.origin + '/assets/media/uploads/' + path.replace(/^uploads\//i, ''));
      add(window.location.origin + '/assets/media/' + path);
      add(window.location.origin + '/api/media/' + path.replace(/^uploads\//i, ''));
    }

    var base = path.split('/').pop();
    if (base && /\.(png|jpe?g|webp|gif|svg)$/i.test(base)) {
      add(window.location.origin + '/assets/media/uploads/' + base);
      add(window.location.origin + '/api/media/' + base);
      add(window.location.origin + '/assets/media/' + base);
    }

    return out;
  }

  function collectImageCandidates() {
    var values = [];

    function add(v) {
      v = String(v || '').trim();
      if (isBadMediaValue(v)) return;
      if (values.indexOf(v) === -1) values.push(v);
    }

    var selectors = [
      '#pmd-prev-img[src]',
      '[data-control="mediafinder"] img[src]',
      '[data-field-name="thumb"] img[src]',
      '.field-thumb img[src]',
      '#menu-inline-gallery img[src]',
      '[data-control="mediafinder"] a[href]',
      '[data-field-name="thumb"] a[href]',
      '[data-control="mediafinder"] [data-path]',
      '[data-control="mediafinder"] [data-url]',
      '[data-control="mediafinder"] [data-media-item-path]',
      '[data-control="mediafinder"] [data-media-item-url]'
    ];

    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        add(el.getAttribute('src'));
        add(el.getAttribute('href'));
        add(el.getAttribute('data-path'));
        add(el.getAttribute('data-url'));
        add(el.getAttribute('data-media-item-path'));
        add(el.getAttribute('data-media-item-url'));
      });
    });

    // Do not read generic input[name*=image] values blindly: hidden gallery payloads often contain [] and caused /[] 404 probes.
    document.querySelectorAll('[data-control="mediafinder"] input, [data-field-name="thumb"] input, input[name*="thumb"]').forEach(function (el) {
      add(el.value);
      add(el.getAttribute('value'));
    });

    var mediaText = '';
    document.querySelectorAll('[data-control="mediafinder"], [data-field-name="thumb"], #menu-inline-gallery').forEach(function (el) {
      mediaText += ' ' + (el.innerText || el.textContent || '');
    });

    (mediaText.match(/[A-Za-z0-9][A-Za-z0-9._ -]{1,160}\.(?:png|jpe?g|webp|gif|svg)/gi) || []).forEach(function (name) {
      add(name.trim().replace(/\s+/g, ' '));
    });

    var expanded = [];
    values.forEach(function (v) {
      mediaUrlCandidates(v).forEach(function (u) {
        if (expanded.indexOf(u) === -1) expanded.push(u);
      });
    });

    expanded.sort(function (a, b) {
      var ad = /^data:image/i.test(a) ? 1 : 0;
      var bd = /^data:image/i.test(b) ? 1 : 0;
      return ad - bd;
    });

    return expanded.slice(0, 24);
  }

  var lastPreviewKey = '';

  function testAndSetPreview(candidates) {
    var prev = document.getElementById('pmd-prev-img');
    var panel = findPreviewPanel();
    if (!prev) return;

    candidates = (candidates || []).filter(function (url) { return !isBadMediaValue(url); });
    var key = candidates.join('|');
    if (key && key === lastPreviewKey && prev.getAttribute('src')) return;
    lastPreviewKey = key;

    if (!candidates.length) {
      if (panel) panel.classList.add('pmd-menu-form-clean-v9-no-image');
      return;
    }

    var i = 0;
    function tryNext() {
      if (i >= candidates.length) {
        if (panel) panel.classList.add('pmd-menu-form-clean-v9-no-image');
        return;
      }

      var url = candidates[i++];
      if (isBadMediaValue(url)) return tryNext();

      if (/^data:image\//i.test(url)) {
        prev.src = url;
        if (panel) panel.classList.add('pmd-menu-form-clean-v9-no-image');
        return;
      }

      var probe = new Image();
      probe.onload = function () {
        prev.src = url;
        prev.style.display = 'block';
        prev.style.opacity = '1';
        prev.style.visibility = 'visible';
        if (panel) panel.classList.remove('pmd-menu-form-clean-v9-no-image');
      };
      probe.onerror = tryNext;
      probe.src = url;
    }

    tryNext();
  }

  function ensurePreviewImage() {
    var wrap = findPreviewWrap();
    if (!wrap) return null;

    var img = document.getElementById('pmd-prev-img');
    if (!img) {
      img = document.createElement('img');
      img.id = 'pmd-prev-img';
      img.alt = 'Preview image';
      wrap.appendChild(img);
    }

    testAndSetPreview(collectImageCandidates());
    return img;
  }

  function findCategorySelect() {
    return document.querySelector('[data-field-name="categories"] select, .field-categories select, select[name*="categories"], select[name*="category"]');
  }

  function closestCategoryField(select) {
    return select && (select.closest('[data-field-name="categories"]') || select.closest('.field-categories') || select.closest('.form-group') || select.parentElement);
  }

  function selectedValues(select) {
    var values = new Set((serverSelected || []).map(String));
    Array.from((select && select.options) || []).forEach(function (opt) {
      if (opt.selected && opt.value !== '') values.add(String(opt.value));
    });
    return values;
  }

  function ensureOptions(select, choices, selected) {
    var existing = new Set(Array.from(select.options || []).map(function (opt) { return String(opt.value); }));
    (choices || []).forEach(function (item) {
      if (!item || !item.id || existing.has(String(item.id))) return;
      var opt = new Option(item.name, item.id, false, selected.has(String(item.id)));
      select.add(opt);
    });
  }

  function getChoicesFromSelect(select) {
    return Array.from((select && select.options) || [])
      .filter(function (opt) { return opt.value !== ''; })
      .map(function (opt) { return { id: String(opt.value), name: (opt.textContent || opt.label || opt.value).trim() }; });
  }

  function updateCategoryState(select, grid) {
    var selected = selectedValues(select);
    var count = 0;
    Array.from(grid.querySelectorAll('.pmd172-category-choice')).forEach(function (choice) {
      var input = choice.querySelector('input');
      var checked = input && selected.has(String(input.value));
      if (input) input.checked = checked;
      choice.classList.toggle('is-checked', !!checked);
      if (checked) count++;
    });
    var badge = grid.closest('.pmd172-category-panel') && grid.closest('.pmd172-category-panel').querySelector('.pmd172-category-count');
    if (badge) badge.textContent = count + ' selected';
  }

  function syncCategorySelect(select, grid) {
    var checked = new Set(Array.from(grid.querySelectorAll('input[type="checkbox"]:checked')).map(function (input) { return String(input.value); }));
    Array.from(select.options || []).forEach(function (opt) { opt.selected = checked.has(String(opt.value)); });
    if (window.jQuery) window.jQuery(select).trigger('change');
    else select.dispatchEvent(new Event('change', { bubbles: true }));
    updateCategoryState(select, grid);
  }

  function ensureCategoryPanel() {
    var select = findCategorySelect();
    if (!select) return false;

    var field = closestCategoryField(select);
    if (!field) return false;

    // Remove duplicate/legacy panels so the page has exactly one category UI.
    Array.from(field.querySelectorAll('.pmd172-category-panel')).forEach(function (panel) { panel.remove(); });

    var selected = selectedValues(select);
    ensureOptions(select, categoryChoices, selected);
    var choices = (categoryChoices && categoryChoices.length) ? categoryChoices : getChoicesFromSelect(select);
    if (!choices.length) return false;

    var panel = document.createElement('div');
    panel.className = 'pmd172-category-panel';
    panel.innerHTML =
      '<div class="pmd172-category-head">' +
        '<div><strong>Food Category</strong><small>Choose where this item appears on the customer menu.</small></div>' +
        '<div class="pmd172-category-count">0 selected</div>' +
      '</div>' +
      '<div class="pmd172-category-grid"></div>';

    var grid = panel.querySelector('.pmd172-category-grid');
    choices.forEach(function (item) {
      var label = document.createElement('label');
      label.className = 'pmd172-category-choice';

      var input = document.createElement('input');
      input.type = 'checkbox';
      input.value = String(item.id);
      input.checked = selected.has(String(item.id));

      var tick = document.createElement('span');
      tick.className = 'pmd172-category-check';

      var text = document.createElement('span');
      text.textContent = item.name || item.id;

      label.appendChild(input);
      label.appendChild(tick);
      label.appendChild(text);
      grid.appendChild(label);
    });

    field.appendChild(panel);
    field.classList.add('pmd-menu-form-clean-v9-category-field');
    field.classList.add('pmd174c-category-field');

    grid.addEventListener('change', function () { syncCategorySelect(select, grid); });
    if (window.jQuery) window.jQuery(select).off('change.pmdCleanV8').on('change.pmdCleanV8', function () { updateCategoryState(select, grid); });
    else select.addEventListener('change', function () { updateCategoryState(select, grid); });

    updateCategoryState(select, grid);
    return true;
  }

  function finalizeCategoryField() {
    if (!document.querySelector('.pmd172-category-panel')) ensureCategoryPanel();

    var select = findCategorySelect();
    var panel = document.querySelector('.pmd172-category-panel');
    if (!select || !panel) return false;

    var field = closestCategoryField(select) || panel.parentElement;
    if (!field) return false;

    field.classList.add('pmd-menu-form-clean-v9-category-field');
    field.classList.add('pmd174c-category-field');
    if (panel.parentElement !== field) field.appendChild(panel);

    panel.style.setProperty('display', 'block', 'important');
    panel.style.setProperty('visibility', 'visible', 'important');
    panel.style.setProperty('opacity', '1', 'important');
    panel.style.setProperty('height', 'auto', 'important');

    Array.from(field.children).forEach(function (child) {
      if (child === panel) return;
      child.style.setProperty('display', 'none', 'important');
      child.style.setProperty('visibility', 'hidden', 'important');
      child.style.setProperty('opacity', '0', 'important');
      child.style.setProperty('height', '0', 'important');
      child.style.setProperty('min-height', '0', 'important');
      child.style.setProperty('max-height', '0', 'important');
      child.style.setProperty('margin', '0', 'important');
      child.style.setProperty('padding', '0', 'important');
      child.style.setProperty('overflow', 'hidden', 'important');
    });

    return true;
  }

  function findOriginalSaveButton() {
    return document.querySelector('.pmd-menu-form-v170-actions button[data-request="onSave"]')
      || document.querySelector('.pmd-menu-form-v170-save-card button[data-request="onSave"]')
      || document.querySelector('button[data-request="onSave"]');
  }

  function triggerSave() {
    var btn = findOriginalSaveButton();
    if (btn) { btn.click(); return; }
    var form = document.querySelector('.pmd-menu-form-v170 form, form#edit-form, form');
    if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
  }

  function setHeaderAiBusy(isBusy) {
    var btn = document.querySelector('[data-pmd-clean-ai]');
    if (!btn) return;
    btn.disabled = !!isBusy;
    btn.innerHTML = isBusy ? '<i class="fa fa-spinner fa-spin"></i> Generating' : '<span>✨</span>AI Fill';
  }

  function triggerAiFill() {
    var menuName = fieldValue('menu_name');
    if (!menuName) {
      var nameInput = field('menu_name');
      if (nameInput) nameInput.focus();
      pmdFlash('Enter a food name first, then use AI Fill.', 'warning');
      return;
    }

    if (!(window.jQuery && typeof window.jQuery.request === 'function')) {
      pmdFlash('AI request helper is unavailable on this page.', 'warning');
      return;
    }

    setHeaderAiBusy(true);
    window.jQuery.request('onEstimateNutritionAssistant', {
      data: {
        action: 'auto-fill',
        menu_name: menuName,
        description: fieldValue('menu_description'),
        serving_size: fieldValue('serving_size'),
        calories: fieldValue('calories'),
        protein: fieldValue('protein'),
        carbs: fieldValue('carbs'),
        fat: fieldValue('fat'),
        sugar: fieldValue('sugar'),
        ingredients: '',
        preparation_notes: '',
        language: 'auto'
      },
      success: function (resp) {
        setHeaderAiBusy(false);
        if (!resp || resp.enabled === false || !resp.suggestions || typeof resp.suggestions !== 'object') {
          pmdFlash((resp && resp.message) || 'AI assistant is unavailable. You can still enter values manually.', 'warning');
          return;
        }
        var s = resp.suggestions;
        var changed = 0;
        [
          ['menu_description', s.description],
          ['serving_size', s.serving_size],
          ['calories', s.calories],
          ['protein', s.protein],
          ['carbs', s.carbs],
          ['fat', s.fat],
          ['sugar', s.sugar],
          ['prep_time_minutes', s.prep_time_minutes]
        ].forEach(function (pair) {
          if (pair[1] !== null && pair[1] !== undefined && pair[1] !== '') {
            if (setFieldValue(pair[0], pair[1])) changed++;
          }
        });
        updateLivePreview();
        pmdFlash(changed ? 'AI filled the menu fields. Review before saving.' : 'AI responded, but did not return usable values.', changed ? 'success' : 'warning');
      },
      error: function () {
        setHeaderAiBusy(false);
        pmdFlash('AI assistant is unavailable. You can still enter values manually.', 'warning');
      }
    });
  }

  function ensureTopActions() {
    document.querySelectorAll('.pmd-v174b-top-actions, .pmd-menu-form-clean-v1-actions, body > .pmd-menu-form-clean-v9-actions, body > .pmd-menu-form-clean-v5-actions, body > .pmd-menu-form-clean-v4-actions').forEach(function (el) { el.remove(); });

    var mainMenu = document.querySelector('#menu-mainmenu.navbar-nav, #menu-mainmenu, .navbar-right #menu-mainmenu, .navbar-nav[data-control="mainmenu"]');
    if (!mainMenu) return false;

    var li = document.getElementById('pmd-menu-form-clean-v9-header-actions-item');
    if (!li) {
      li = document.createElement('li');
      li.id = 'pmd-menu-form-clean-v9-header-actions-item';
      li.className = 'nav-item pmd-menu-form-clean-v9-header-actions-item';
      var anchor = document.getElementById('pmd-header-toolbar-actions-item');
      if (anchor && anchor.parentElement === mainMenu) mainMenu.insertBefore(li, anchor.nextSibling);
      else mainMenu.insertBefore(li, mainMenu.firstChild);
    }

    if (!li.querySelector('.pmd-menu-form-clean-v9-actions')) {
      li.innerHTML = '<div class="pmd-menu-form-clean-v9-actions" aria-label="Menu form actions">' +
        '<button type="button" class="pmd-menu-form-clean-v9-btn ai" data-pmd-clean-ai><span>✨</span>AI Fill</button>' +
        '<button type="button" class="pmd-menu-form-clean-v9-btn save" data-pmd-clean-save><i class="fa fa-save"></i>Save Item</button>' +
      '</div>';
    }
    return true;
  }

  function polishOptionsRow() {
    document.querySelectorAll('[data-field-name="_options"] .btn, [data-field-name="_options"] button').forEach(function (btn) {
      var text = (btn.textContent || '').trim();
      if (!text && btn.title) btn.textContent = btn.title;
    });
  }

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-pmd-clean-save]')) { event.preventDefault(); triggerSave(); }
    if (event.target.closest('[data-pmd-clean-ai]')) { event.preventDefault(); triggerAiFill(); }
    if (event.target.closest('[data-pmd-main-image-upload]')) { event.preventDefault(); triggerMainImagePicker(); }
    if (event.target.closest('[data-pmd-additional-image-upload]')) { event.preventDefault(); triggerAdditionalImagePicker(); }
    var previewWrapClick = event.target.closest('.pmd-live-preview-image-wrap');
    if (previewWrapClick && previewWrapClick.closest('.pmd-menu-form-v170-side') && !event.target.closest('[data-pmd-main-image-upload]')) {
      event.preventDefault();
      triggerMainImagePicker();
    }

    var dietChoice = event.target.closest('[data-pmd-diet-choice]');
    if (dietChoice) {
      event.preventDefault();
      var key = dietChoice.getAttribute('data-pmd-diet-choice');
      setBool(key, !getBool(key));
      updateDietPanel();
    }

    var allergyMain = event.target.closest('[data-pmd-diet-allergens-main]');
    if (allergyMain) {
      event.preventDefault();
      var section = document.querySelector('.pmd-menu-form-clean-v9-allergen-section');
      if (section) section.classList.toggle('is-open');
      var select = findAllergensSelect();
      if (select && window.jQuery && section && !section.querySelector('[data-pmd-allergen-choice]')) window.jQuery(select).select2 && window.jQuery(select).select2('open');
    }
  });


  function closeAdvancedOnce() {
    if (window.__PMD_MENU_FORM_CLEAN_V9_ADVANCED_INIT__) return;
    window.__PMD_MENU_FORM_CLEAN_V9_ADVANCED_INIT__ = true;
    document.querySelectorAll('.pmd-menu-form-clean-v9-advanced').forEach(function (details) {
      details.open = false;
    });
  }

  function run() {
    ensureTopActions();
    finalizeCategoryField();
    ensureDietChoicePanel();
    ensurePreviewImage();
    ensurePreviewUpload();
    ensureAdditionalUploadBinding();
    updateLivePreview();
    polishOptionsRow();
  }

  function start() {
    closeAdvancedOnce();
    run();
    [80, 180, 400, 900, 1600, 2600].forEach(function (ms) { setTimeout(run, ms); });
  }

  document.addEventListener('input', function (event) {
    if (event.target.matches('input, textarea, select')) updateLivePreview();
  });

  document.addEventListener('change', function (event) {
    if (event.target.closest('[data-control="mediafinder"]') || event.target.closest('[data-field-name="thumb"]') || event.target.closest('[data-field-name="menu_images_inline"]') || event.target.closest('#menu-inline-gallery')) {
      [80, 300, 800].forEach(function (ms) { setTimeout(function () { ensurePreviewImage(); ensurePreviewUpload(); updateLivePreview(); }, ms); });
    }
    if (event.target.closest('[data-field-name="categories"]') || event.target.matches('select[name*="categories"], select[name*="category"]')) {
      setTimeout(finalizeCategoryField, 80);
    }
    var allergenChoice = event.target.closest('[data-pmd-allergen-choice]');
    if (allergenChoice) {
      var select = findAllergensSelect();
      var values = new Set(Array.from(document.querySelectorAll('[data-pmd-allergen-choice] input:checked')).map(function (input) { return String(input.value); }));
      syncAllergenSelect(select, values);
      updateDietPanel();
    }
    if (event.target.closest('[data-field-name="allergens"]')) setTimeout(updateDietPanel, 80);
    if (event.target.matches('input, textarea, select')) setTimeout(updateLivePreview, 40);
  });

  // Lightweight observers only where the native widgets change content; no whole-form observer.
  if (window.MutationObserver) {
    ['[data-field-name="thumb"]', '[data-control="mediafinder"]', '#menu-inline-gallery'].forEach(function (sel) {
      var node = document.querySelector(sel);
      if (!node) return;
      var scheduled = false;
      new MutationObserver(function () {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(function () { scheduled = false; ensurePreviewImage(); ensurePreviewUpload(); updateLivePreview(); });
      }).observe(node, { childList: true, subtree: true });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.PMDMenuFormCleanV9 = {
    run: run,
    closeAdvanced: closeAdvancedOnce,
    preview: ensurePreviewImage,
    categories: finalizeCategoryField,
    save: triggerSave,
    ai: triggerAiFill,
    candidates: collectImageCandidates,
    mediaDebug: function () { return { main: findMainImagePickerButton(), additional: findAdditionalImagePickerButton(), candidates: collectImageCandidates(), thumbField: document.querySelector('[data-field-name="thumb"]'), gallery: document.querySelector('[data-field-name="menu_images_inline"], #menu-inline-gallery') }; },
    check: function () {
      var field = document.querySelector('.pmd-menu-form-clean-v9-category-field');
      var panel = document.querySelector('.pmd172-category-panel');
      var previewImg = document.querySelector('#pmd-prev-img');
      var visibleNative = 0;
      if (field) {
        Array.from(field.children).forEach(function (child) {
          if (child === panel) return;
          var cs = getComputedStyle(child);
          if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.height || '0') > 2) visibleNative++;
        });
      }
      return {
        mark: 'PMD_MENU_FORM_CLEAN_V9',
        path: location.pathname,
        topActions: !!document.querySelector('#pmd-menu-form-clean-v9-header-actions-item .pmd-menu-form-clean-v9-actions'),
        headerActions: !!document.querySelector('#menu-mainmenu #pmd-menu-form-clean-v9-header-actions-item'),
        previewUploadButton: !!document.querySelector('.pmd-menu-form-clean-v9-preview-action'),
        previewWraps: document.querySelectorAll('.pmd-live-preview-image-wrap').length,
        previewWrapBound: !!document.querySelector('.pmd-menu-form-clean-v9-preview-wrap-bound'),
        livePreviewTargets: !!(document.getElementById('pmd-prev-name') && document.getElementById('pmd-prev-price') && document.getElementById('pmd-prev-desc')),
        additionalUploadButton: !!document.querySelector('[data-pmd-additional-image-upload]'),
        advancedOpen: !!document.querySelector('.pmd-menu-form-clean-v9-advanced[open]'),
        dietPanel: !!document.querySelector('.pmd-menu-form-clean-v9-diet-panel'),
        categoryPanel: !!panel,
        categoryChoices: panel ? panel.querySelectorAll('.pmd172-category-choice').length : 0,
        checked: panel ? panel.querySelectorAll('.pmd172-category-choice.is-checked').length : 0,
        hiddenNativeCategoryRows: !!field,
        visibleNativeCategoryRows: visibleNative,
        previewImg: !!previewImg,
        previewImgSrc: previewImg ? previewImg.getAttribute('src') : '',
        mediaCandidates: collectImageCandidates().slice(0, 8),
        status: (!!panel && visibleNative === 0 && !!document.querySelector('#pmd-menu-form-clean-v9-header-actions-item .pmd-menu-form-clean-v9-actions')) ? 'OK' : 'CHECK'
      };
    }
  };

  window.PMDMenuFormCleanV8 = window.PMDMenuFormCleanV9;
  window.PMDMenuFormCleanV7 = window.PMDMenuFormCleanV9;
  window.PMDMenuFormCleanV6 = window.PMDMenuFormCleanV9;
  window.PMDMenuFormCleanV5 = window.PMDMenuFormCleanV9;
  window.PMDMenuFormCleanV4 = window.PMDMenuFormCleanV9;
  window.PMDMenuFormCleanV3 = window.PMDMenuFormCleanV9;
  window.PMDMenuFormCleanV2 = window.PMDMenuFormCleanV9;
  console.info('✅ PMD Menu Form clean v9 active', window.PMDMenuFormCleanV9.check());
})();
</script>

<!-- PMD_MENU_FORM_V170_CREATE_EDIT_CARDS_END -->

{{-- PMD_MENU_FORM_CLEAN_V10_FORMOPTIONS_MEDIA_GUARD_START --}}
<style>
  /* PMD v10: keep broken legacy option-widget AJAX from looking active on pages where it is not bound. */
  [data-pmd-v10-disabled="formOptions"] {
    opacity: .62 !important;
    cursor: not-allowed !important;
    filter: grayscale(.15);
  }
  [data-pmd-v10-disabled="formOptions"] * {
    pointer-events: none !important;
  }
</style>
<script>
(function () {
  if (window.__PMD_MENU_FORM_CLEAN_V10_GUARD__) return;
  window.__PMD_MENU_FORM_CLEAN_V10_GUARD__ = true;

  var MARK = 'PMD_MENU_FORM_CLEAN_V10';
  var ajaxErrors = [];
  var ajaxBlocked = 0;
  var clickBlocked = 0;

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function isMenuFormPage() {
    return /\/admin\/menus\/(create|edit\/\d+)/.test(location.pathname || '');
  }

  function isFormOptionsRequest(value) {
    return /(^|[^a-z0-9_])formOptions::/i.test(String(value || ''));
  }

  function disableFormOptionsTriggers() {
    if (!isMenuFormPage()) return 0;

    var changed = 0;
    qsa('[data-request]').forEach(function (el) {
      var req = el.getAttribute('data-request') || '';
      if (!isFormOptionsRequest(req)) return;

      if (!el.hasAttribute('data-pmd-v10-original-request')) {
        el.setAttribute('data-pmd-v10-original-request', req);
      }
      el.removeAttribute('data-request');
      el.setAttribute('data-pmd-v10-disabled', 'formOptions');
      el.setAttribute('aria-disabled', 'true');
      el.setAttribute('title', 'Disabled on this menu page: legacy formOptions widget is not bound to this controller.');
      if ((el.tagName || '').toLowerCase() === 'button') {
        el.setAttribute('type', 'button');
      }
      changed++;
    });

    return changed;
  }

  document.addEventListener('click', function (event) {
    var el = event.target && event.target.closest ? event.target.closest('[data-request],[data-pmd-v10-original-request]') : null;
    if (!el) return;

    var req = el.getAttribute('data-request') || el.getAttribute('data-pmd-v10-original-request') || '';
    if (!isFormOptionsRequest(req)) return;

    clickBlocked++;
    event.preventDefault();
    event.stopImmediatePropagation();
    console.warn('[PMD v10] blocked broken legacy formOptions click:', req, el);
    return false;
  }, true);

  function installAjaxGuards() {
    var $ = window.jQuery || window.$;
    if (!$ || $.__PMD_MENU_FORM_CLEAN_V10_AJAX_GUARD__) return false;
    $.__PMD_MENU_FORM_CLEAN_V10_AJAX_GUARD__ = true;

    $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
      var headers = '';
      try { headers = JSON.stringify(options.headers || {}); } catch (e) { headers = ''; }
      var haystack = [options.url || '', options.data || '', headers].join(' ');

      if (isMenuFormPage() && isFormOptionsRequest(haystack)) {
        ajaxBlocked++;
        console.warn('[PMD v10] aborting broken legacy formOptions AJAX:', haystack);
        try { jqXHR.abort('pmd-v10-formOptions-blocked'); } catch (e) {}
      }
    });

    $(document).ajaxError(function (event, jqXHR, settings, thrownError) {
      if (!isMenuFormPage()) return;
      var item = {
        time: new Date().toISOString(),
        status: jqXHR && jqXHR.status,
        url: settings && settings.url,
        type: settings && settings.type,
        data: String((settings && settings.data) || '').slice(0, 900),
        error: String(thrownError || '')
      };
      ajaxErrors.push(item);
      if (ajaxErrors.length > 25) ajaxErrors.shift();
      console.warn('[PMD v10] captured AJAX error:', item);
    });

    return true;
  }

  function refreshGuard() {
    var changed = disableFormOptionsTriggers();
    installAjaxGuards();
    return changed;
  }

  refreshGuard();
  setTimeout(refreshGuard, 200);
  setTimeout(refreshGuard, 800);
  setTimeout(refreshGuard, 1600);
  setInterval(refreshGuard, 2500);

  try {
    new MutationObserver(function () { refreshGuard(); }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}

  window.PMDMenuFormCleanV10 = {
    check: function () {
      var v9 = window.PMDMenuFormCleanV9 || window.PMDMenuFormCleanV8 || null;
      var preview = null;
      try { preview = v9 && v9.preview ? v9.preview() : document.querySelector('#pmd-prev-img,.pmd-menu-live-preview img'); } catch (e) {}
      return {
        mark: MARK,
        path: location.pathname,
        menuPage: isMenuFormPage(),
        previousControllerPresent: !!v9,
        disabledFormOptions: qsa('[data-pmd-v10-disabled="formOptions"]').length,
        originalFormOptionsRequests: qsa('[data-pmd-v10-original-request]').map(function (el) { return el.getAttribute('data-pmd-v10-original-request'); }),
        clickBlocked: clickBlocked,
        ajaxBlocked: ajaxBlocked,
        ajaxErrors: ajaxErrors.slice(),
        preview: preview
      };
    },
    mediaDebug: function () {
      var v9 = window.PMDMenuFormCleanV9 || window.PMDMenuFormCleanV8 || null;
      var prev = null;
      try { prev = v9 && v9.mediaDebug ? v9.mediaDebug() : null; } catch (e) { prev = String(e); }
      return {
        mark: MARK,
        previousMediaDebug: prev,
        ajaxErrors: ajaxErrors.slice(),
        currentPreviewImage: (document.querySelector('#pmd-prev-img') || {}).src || null,
        nativeMediaButtons: qsa('.find-button,.mediafinder-find-button,[data-control="mediafinder"] .find-button').length,
        disabledFormOptions: qsa('[data-pmd-v10-disabled="formOptions"]').length
      };
    }
  };

  console.info('✅ PMD Menu Form clean v10 guard active', window.PMDMenuFormCleanV10.check());
})();
</script>
{{-- PMD_MENU_FORM_CLEAN_V10_FORMOPTIONS_MEDIA_GUARD_END --}}

{{-- PMD_MENU_FORM_CLEAN_V39_REAL_IMAGE_SOURCES_START --}}
<style>
/* PMD_MENU_FORM_CLEAN_V39_REAL_IMAGE_SOURCES_START */

.pmd-v39-hidden-old-preview {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

.pmd-v39-card {
  overflow: visible !important;
}

.pmd-v39-root {
  width: 100% !important;
  display: block !important;
  margin: 18px 0 0 !important;
  visibility: visible !important;
  opacity: 1 !important;
}

.pmd-v39-live-row {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  margin: 0 0 10px !important;
  color: #53657f !important;
  font-size: 13px !important;
  font-weight: 850 !important;
}

.pmd-v39-box {
  background: linear-gradient(180deg, #f7fbff 0%, #eaf5ff 100%) !important;
  border: 1.5px solid #bfe1ff !important;
  border-radius: 24px !important;
  padding: 14px !important;
  box-shadow: 0 16px 40px rgba(31, 59, 93, .08) !important;
}

.pmd-v39-photo {
  position: relative !important;
  width: 100% !important;
  height: 160px !important;
  min-height: 160px !important;
  border-radius: 20px !important;
  overflow: hidden !important;
  border: 1.5px solid #b7dcff !important;
  background: #f8fbff !important;
}

.pmd-v39-photo img {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  border-radius: 20px !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.pmd-v39-empty {
  position: absolute !important;
  inset: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.pmd-v39-dashed {
  width: 72px !important;
  height: 72px !important;
  border-radius: 18px !important;
  border: 3px dashed #2e4569 !important;
  background: rgba(255,255,255,.78) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #1e3556 !important;
  font-size: 38px !important;
  font-weight: 900 !important;
}

.pmd-v39-edit {
  position: absolute !important;
  top: 12px !important;
  right: 12px !important;
  width: 54px !important;
  height: 54px !important;
  border-radius: 18px !important;
  border: 2px solid #bde3ff !important;
  background: rgba(255,255,255,.94) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #1f3b5d !important;
  z-index: 6 !important;
  cursor: pointer !important;
  box-shadow: 0 8px 24px rgba(31,59,93,.10) !important;
}

.pmd-v39-edit svg {
  width: 25px !important;
  height: 25px !important;
}

.pmd-v39-name {
  margin: 18px 0 4px !important;
  text-align: center !important;
  color: #083b34 !important;
  font-size: 24px !important;
  line-height: 1.1 !important;
  font-weight: 950 !important;
}

.pmd-v39-desc {
  margin: 0 auto 14px !important;
  text-align: center !important;
  color: #65748d !important;
  font-size: 14px !important;
  line-height: 1.3 !important;
  font-weight: 850 !important;
  max-width: 92% !important;
  overflow-wrap: anywhere !important;
}

.pmd-v39-price {
  width: fit-content !important;
  min-width: 88px !important;
  margin: 0 auto 14px !important;
  padding: 9px 18px !important;
  border-radius: 999px !important;
  border: 1.5px solid #ffc36b !important;
  background: #fff8ed !important;
  color: #a94e10 !important;
  text-align: center !important;
  font-size: 16px !important;
  font-weight: 950 !important;
}

.pmd-v39-bar {
  height: 14px !important;
  border-radius: 999px !important;
  border: 1.5px solid #bfe1ff !important;
  background: #fff !important;
}

.pmd-v39-additional-title {
  margin: 22px 0 10px !important;
  color: #0f2528 !important;
  font-size: 16px !important;
  font-weight: 950 !important;
}

.pmd-v39-gallery {
  display: grid !important;
  grid-template-columns: repeat(3, 86px) !important;
  gap: 12px !important;
  align-items: start !important;
  margin-top: 10px !important;
}

.pmd-v39-thumb,
.pmd-v39-add {
  position: relative !important;
  width: 86px !important;
  height: 86px !important;
  min-width: 86px !important;
  min-height: 86px !important;
  max-width: 86px !important;
  max-height: 86px !important;
  border-radius: 18px !important;
  border: 2px solid #dbe7f4 !important;
  background: #fff !important;
  overflow: hidden !important;
  box-shadow: 0 12px 28px rgba(31,59,93,.06) !important;
}

.pmd-v39-thumb img {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  object-fit: contain !important;
  padding: 8px !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.pmd-v39-remove {
  position: absolute !important;
  top: 6px !important;
  right: 6px !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: 999px !important;
  border: 3px solid #fff !important;
  background: #f05266 !important;
  color: #fff !important;
  font-size: 18px !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
}

.pmd-v39-add {
  border: 3px dashed #2e4569 !important;
  color: #1e3556 !important;
  font-size: 38px !important;
  font-weight: 900 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
}
/* PMD_MENU_FORM_CLEAN_V39_REAL_IMAGE_SOURCES_END */
</style>

<script>
/* PMD_MENU_FORM_CLEAN_V39_REAL_IMAGE_SOURCES_START */
(function () {
  if (window.__PMD_MENU_FORM_CLEAN_V39_REAL_IMAGE_SOURCES__) return;
  window.__PMD_MENU_FORM_CLEAN_V39_REAL_IMAGE_SOURCES__ = true;

  var MARK = 'PMD_MENU_FORM_CLEAN_V39';
  window.__PMD_V39_URL_CACHE__ = window.__PMD_V39_URL_CACHE__ || {};

  function qa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function txt(el) {
    return (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function visible(el) {
    if (!el) return false;
    var s = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  }

  function esc(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[c];
    });
  }

  function imageLike(v) {
    return /(attachments\/public|assets\/media|uploads\/|api\/media|\.png|\.jpe?g|\.webp|\.gif|\.svg)/i.test(String(v || ''));
  }

  function bgUrl(el) {
    if (!el) return '';
    var bg = getComputedStyle(el).backgroundImage || '';
    var m = bg.match(/url\(["']?(.+?)["']?\)/i);
    return m ? m[1] : '';
  }

  function toCandidates(v) {
    v = String(v || '').trim();
    if (!v) return [];

    if (/^https?:\/\//i.test(v)) return [v];

    v = v.replace(/^\/+/, '');

    var out = [];
    var file = v.split('/').pop();

    if (v.indexOf('assets/media/attachments/public/') === 0) out.push(location.origin + '/' + v);
    if (v.indexOf('attachments/public/') === 0) out.push(location.origin + '/assets/media/' + v);
    if (v.indexOf('assets/media/uploads/') === 0) out.push(location.origin + '/' + v);
    if (v.indexOf('uploads/') === 0) out.push(location.origin + '/assets/media/' + v);
    if (v.indexOf('api/media/') === 0) out.push(location.origin + '/' + v);

    if (file) {
      if (/^[a-f0-9]{18,}\.(png|jpe?g|webp|gif|svg)$/i.test(file)) {
        out.push(location.origin + '/api/media/' + encodeURIComponent(file));
        out.push(location.origin + '/assets/media/uploads/' + encodeURIComponent(file));
      } else {
        out.push(location.origin + '/assets/media/uploads/' + encodeURIComponent(file));
        out.push(location.origin + '/api/media/' + encodeURIComponent(file));
      }

      out.push(location.origin + '/assets/media/' + encodeURIComponent(file));
    }

    return Array.from(new Set(out));
  }

  function setSmartSrc(img, raw) {
    raw = String(raw || '').trim();
    if (!img || !raw) return;

    var candidates = toCandidates(raw);
    if (!candidates.length) return;

    var cacheKey = raw;
    if (window.__PMD_V39_URL_CACHE__[cacheKey]) {
      img.src = window.__PMD_V39_URL_CACHE__[cacheKey];
      return;
    }

    var i = 0;

    function tryNext() {
      if (!candidates[i]) return;

      var test = new Image();
      var url = candidates[i];

      test.onload = function () {
        window.__PMD_V39_URL_CACHE__[cacheKey] = url;
        img.src = url;
      };

      test.onerror = function () {
        i += 1;
        tryNext();
      };

      test.src = url;
    }

    tryNext();
  }

  function findInputNearLabel(labelText) {
    var labels = qa('label, .form-label, .control-label, div, span')
      .filter(function (el) {
        return visible(el) && new RegExp('^' + labelText + '$', 'i').test(txt(el));
      });

    for (var i = 0; i < labels.length; i++) {
      var p = labels[i];

      for (var depth = 0; p && depth < 5; depth++, p = p.parentElement) {
        var found = qa('input:not([type="hidden"]), textarea, select', p).filter(visible);
        if (found[0]) return found[0];
      }
    }

    return null;
  }

  function field(selectors, label) {
    for (var i = 0; i < selectors.length; i++) {
      var found = qa(selectors[i]).filter(function (el) {
        return el.type !== 'hidden';
      });

      if (found[0]) return found[0];
    }

    return findInputNearLabel(label);
  }

  function readName() {
    var el = field([
      'input[name="Menu[name]"]',
      'input[name="menu[name]"]',
      'input[name="name"]',
      'input[id="form-field-menu-name"]',
      'input[id*="menu"][id*="name"]'
    ], 'Name');

    return (el && el.value || '').trim() || 'Item name';
  }

  function readPrice() {
    var el = field([
      'input[name="Menu[price]"]',
      'input[name="menu[price]"]',
      'input[name="price"]',
      'input[id="form-field-menu-price"]',
      'input[id*="price"]'
    ], 'Price');

    var raw = (el && el.value || '').trim();
    var n = parseFloat(String(raw).replace(',', '.'));
    return Number.isFinite(n) ? '€' + n.toFixed(2) : '€0.00';
  }

  function readDesc() {
    var el = field([
      'textarea[name="Menu[description]"]',
      'textarea[name="menu[description]"]',
      'textarea[name="description"]',
      'textarea[id="form-field-menu-description"]',
      'textarea[id*="description"]'
    ], 'Description');

    return (el && el.value || '').trim() || 'Description preview will appear here.';
  }

  function scoreMainValue(el, raw) {
    var key = ((el.name || '') + ' ' + (el.id || '') + ' ' + String(el.className || '')).toLowerCase();
    var v = String(raw || '').trim();
    var score = 0;

    if (!imageLike(v)) return -9999;
    if (/^\[|\{/.test(v)) return -9999;

    if (/formthumb|thumb|main|image|media|file/.test(key)) score += 40;
    if (/form-field-menu-thumb-group|mediafinder-formthumb-thumb/.test(key)) score += 120;
    if (/menu_images_inline|inline_json|gallery/.test(key)) score -= 200;
    if (el.closest && el.closest('#menu-inline-gallery,.pmd-v39-gallery')) score -= 200;

    if (/attachments\/public/.test(v)) score += 100;
    if (/assets\/media\/attachments/.test(v)) score += 100;
    if (/api\/media/.test(v)) score += 90;
    if (/uploads\//.test(v)) score += 35;
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(v)) score += 20;

    return score;
  }

  function readMainSources() {
    var items = [];

    qa('input, textarea, img, a, button, div, span, [data-src], [data-path], [data-file]').forEach(function (el) {
      var attrs = [];

      if (el.value) attrs.push(['value', el.value]);
      if (el.src) attrs.push(['src', el.src]);
      if (el.href) attrs.push(['href', el.href]);

      var bg = bgUrl(el);
      if (bg) attrs.push(['background', bg]);

      ['data-src','data-path','data-file','data-url','data-media','data-request-data','title','data-original-title','aria-label'].forEach(function (a) {
        var v = el.getAttribute && el.getAttribute(a);
        if (v) attrs.push([a, v]);
      });

      attrs.forEach(function (pair) {
        var value = String(pair[1] || '').trim();
        var score = scoreMainValue(el, value);

        if (score > -9999) {
          items.push({ value: value, score: score, source: pair[0], key: (el.name || el.id || String(el.className || '')).slice(0, 120) });
        }
      });
    });

    items.sort(function (a, b) {
      return b.score - a.score;
    });

    return items;
  }

  function readMainRaw() {
    var items = readMainSources();
    return items[0] && items[0].value || '';
  }

  function readGallery() {
    var paths = [];

    qa('input[type="hidden"]').forEach(function (el) {
      var name = el.name || '';
      var val = String(el.value || '').trim();

      if (/^(menu_images_inline_json|Menu\[menu_images_inline_json\])$/.test(name)) {
        try {
          var arr = JSON.parse(val || '[]');
          if (Array.isArray(arr)) {
            arr.forEach(function (x) {
              var p = x && (x.image_path || x.path || x.url || x.src || '');
              if (imageLike(p)) paths.push(String(p));
            });
          }
        } catch (e) {}
      }

      if (/menu_images_inline\[\d+\]\[image_path\]/.test(name) && imageLike(val)) {
        paths.push(val);
      }
    });

    qa('#menu-inline-gallery img, .menu-inline-gallery__item img').forEach(function (img) {
      var v = img.currentSrc || img.src || img.getAttribute('src') || '';
      if (imageLike(v)) paths.push(v);
    });

    return Array.from(new Set(paths));
  }

  function writeGallery(paths) {
    paths = Array.from(new Set((paths || []).filter(imageLike)));
    var payload = JSON.stringify(paths.map(function (p, i) {
      return { image_path: p, sort_order: i + 1 };
    }));

    qa('input[type="hidden"]').filter(function (el) {
      return /^(menu_images_inline_json|Menu\[menu_images_inline_json\])$/.test(el.name || '');
    }).forEach(function (el) {
      el.value = payload;
      el.setAttribute('value', payload);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function findRightPreviewCard() {
    var headings = qa('h1,h2,h3,h4,h5,strong,.card-title,.pmd-section-title,div,span')
      .filter(function (el) {
        return visible(el) && /^Preview & Media$/i.test(txt(el));
      });

    var scored = [];

    headings.forEach(function (h) {
      var el = h;

      for (var depth = 0; el && el !== document.body && depth < 8; depth++, el = el.parentElement) {
        var r = rect(el);
        if (!r || r.w < 240 || r.h < 80) continue;

        var t = txt(el);
        var hasLeftFormText = /Item & Media|Food Category|Prep time|Dietary|Nutrition|Name Price/i.test(t);
        var score = 0;

        if (r.x > window.innerWidth * 0.45) score += 200;
        if (r.w >= 260 && r.w <= 700) score += 180;
        if (!hasLeftFormText) score += 160;
        if (/Additional images/i.test(t)) score += 80;
        if (el.matches('section,.card,aside,.pmd-menu-form-v170-card,.pmd-menu-edit-preview-panel')) score += 80;

        score -= Math.abs(r.w - 360) / 8;
        score -= Math.max(0, r.h - 900) / 20;

        scored.push({ el: el, score: score, rect: r, text: t.slice(0, 120) });
      }
    });

    scored.sort(function (a, b) {
      return b.score - a.score;
    });

    return scored[0] && scored[0].el || null;
  }

  function keepHeaderAndHideOld(card) {
    qa('.pmd-v36-root,.pmd-v37-root,.pmd-v38-root,.pmd-v39-root', card).forEach(function (el) {
      el.remove();
    });

    var direct = qa(':scope > *', card);
    var headerFound = false;

    direct.forEach(function (child) {
      var t = txt(child);

      if (!headerFound && /Preview & Media/i.test(t)) {
        headerFound = true;
        child.classList.remove('pmd-v39-hidden-old-preview');
        return;
      }

      child.classList.add('pmd-v39-hidden-old-preview');
    });
  }

  function findMainPickerButton() {
    var root = document.querySelector('#mediafinder-formthumb-thumb');
    var candidates = [];

    if (root) candidates = candidates.concat(qa('a,button,[role="button"]', root));
    candidates = candidates.concat(qa('[data-control="mediafinder"] a,[data-control="mediafinder"] button,.mediafinder a,.mediafinder button'));

    return candidates.filter(function (el) {
      var blob = (String(el.className || '') + ' ' + txt(el) + ' ' + Array.prototype.map.call(el.attributes || [], function (a) {
        return a.name + '=' + a.value;
      }).join(' ')).toLowerCase();

      if (/config|properties|find-config-button/.test(blob)) return false;
      return /find-button|blank-cover|choose|select|upload|media|plus|image|fa-plus|fa-image/.test(blob);
    })[0] || null;
  }

  function findGalleryNativeButton() {
    return qa('button.menu-inline-gallery__add,[data-gallery-add]').find(function (el) {
      return !el.closest('.pmd-v39-root');
    }) || null;
  }

  function openMainPicker() {
    var btn = findMainPickerButton();
    if (btn) {
      btn.click();
      return true;
    }

    alert('PMD v39: native main image picker not found.');
    return false;
  }

  function openGalleryPicker() {
    var btn = findGalleryNativeButton();
    if (btn) {
      btn.click();
      return true;
    }

    alert('PMD v39: native additional image picker not found.');
    return false;
  }

  function render() {
    var card = findRightPreviewCard();
    if (!card) return false;

    card.classList.add('pmd-v39-card');
    keepHeaderAndHideOld(card);

    var root = document.createElement('div');
    root.className = 'pmd-v39-root';
    root.setAttribute('data-pmd-v39-root', '1');

    card.appendChild(root);

    var mainRaw = readMainRaw();
    var gallery = readGallery();

    root.innerHTML =
      '<div class="pmd-v39-live-row"><span>Live Preview</span><span>Frontend card style</span></div>' +
      '<div class="pmd-v39-box">' +
        '<div class="pmd-v39-photo">' +
          (mainRaw ? '<img id="pmd-v39-main-img" alt="Preview image">' : '') +
          (!mainRaw ? '<div class="pmd-v39-empty"><div class="pmd-v39-dashed">+</div></div>' : '') +
          '<button type="button" class="pmd-v39-edit" aria-label="Edit main image">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
              '<path d="M4 20h4.7L19.1 9.6a2.1 2.1 0 0 0 0-3L17.4 4.9a2.1 2.1 0 0 0-3 0L4 15.3V20Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"></path>' +
              '<path d="M13.5 5.8l4.7 4.7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<div class="pmd-v39-name">' + esc(readName()) + '</div>' +
        '<div class="pmd-v39-desc">' + esc(readDesc()) + '</div>' +
        '<div class="pmd-v39-price">' + esc(readPrice()) + '</div>' +
        '<div class="pmd-v39-bar"></div>' +
      '</div>' +
      '<div class="pmd-v39-additional-title">Additional images</div>' +
      '<div class="pmd-v39-gallery">' +
        gallery.map(function (p, i) {
          return '<div class="pmd-v39-thumb" data-index="' + i + '">' +
            '<img alt="Additional image" data-raw="' + esc(p) + '">' +
            '<button type="button" class="pmd-v39-remove" data-remove="' + i + '">×</button>' +
          '</div>';
        }).join('') +
        '<button type="button" class="pmd-v39-add" aria-label="Add additional image">+</button>' +
      '</div>';

    var mainImg = root.querySelector('#pmd-v39-main-img');
    if (mainImg && mainRaw) setSmartSrc(mainImg, mainRaw);

    qa('.pmd-v39-thumb img', root).forEach(function (img) {
      setSmartSrc(img, img.getAttribute('data-raw') || '');
    });

    var edit = root.querySelector('.pmd-v39-edit');
    if (edit) edit.addEventListener('click', openMainPicker);

    var add = root.querySelector('.pmd-v39-add');
    if (add) add.addEventListener('click', openGalleryPicker);

    qa('.pmd-v39-remove', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var index = parseInt(btn.getAttribute('data-remove'), 10);
        writeGallery(readGallery().filter(function (_, i) {
          return i !== index;
        }));
        render();
      });
    });

    return true;
  }

  function bindFields() {
    qa('input,textarea,select').forEach(function (el) {
      if (el.__PMD_V39_BOUND__) return;
      el.__PMD_V39_BOUND__ = true;
      el.addEventListener('input', function () { setTimeout(render, 0); });
      el.addEventListener('change', function () { setTimeout(render, 0); });
    });
  }

  function check() {
    var card = findRightPreviewCard();
    var root = document.querySelector('.pmd-v39-root');
    var img = root && root.querySelector('#pmd-v39-main-img');
    var galleryImgs = root ? qa('.pmd-v39-gallery img', root) : [];
    var cr = rect(card);
    var rr = rect(root);
    var sources = readMainSources();

    return {
      mark: MARK,
      status: card && root && visible(root) ? 'OK' : 'FAIL',
      v9: !!window.PMDMenuFormCleanV9,
      v10: !!window.PMDMenuFormCleanV10,
      v38: !!window.PMDMenuFormCleanV38,
      v39: true,
      cardFound: !!card,
      cardRect: cr,
      rootFound: !!root,
      rootVisible: visible(root),
      rootRect: rr,
      rootInsideCard: !!(cr && rr && rr.x >= cr.x - 5 && rr.x + rr.w <= cr.x + cr.w + 5),
      duplicateRoots: qa('.pmd-v36-root,.pmd-v37-root,.pmd-v38-root,.pmd-v39-root').length,
      name: readName(),
      price: readPrice(),
      description: readDesc(),
      mainRaw: readMainRaw(),
      mainSources: sources.slice(0, 8),
      mainCandidates: toCandidates(readMainRaw()),
      mainImgFound: !!img,
      mainImgVisible: visible(img),
      mainImgNatural: img ? (img.naturalWidth + 'x' + img.naturalHeight) : '0x0',
      mainImgSrc: img ? (img.currentSrc || img.src || '') : '',
      galleryPayload: readGallery(),
      galleryImgCount: galleryImgs.length,
      galleryVisibleImgCount: galleryImgs.filter(visible).length,
      galleryImgs: galleryImgs.map(function (img) {
        return {
          src: img.currentSrc || img.src || '',
          natural: img.naturalWidth + 'x' + img.naturalHeight,
          visible: visible(img)
        };
      }),
      nativeMainPickerFound: !!findMainPickerButton(),
      nativeGalleryAddFound: !!findGalleryNativeButton()
    };
  }

  async function deepTest() {
    var before = check();
    var root = document.querySelector('.pmd-v39-root');
    var start = rect(root);
    var jumps = [];

    for (var i = 0; i < 20; i++) {
      await new Promise(function (r) { setTimeout(r, 100); });
      var now = rect(root);

      if (start && now && (
        Math.abs(start.x - now.x) > 2 ||
        Math.abs(start.y - now.y) > 2 ||
        Math.abs(start.w - now.w) > 2 ||
        Math.abs(start.h - now.h) > 2
      )) {
        jumps.push({ from: start, to: now });
        start = now;
      }
    }

    var after = check();
    var report = { mark: 'PMD_V39_DEEP_TEST', before: before, after: after, jumps: jumps };
    console.info(report);
    return report;
  }

  function boot() {
    bindFields();
    render();
    setTimeout(render, 80);
    setTimeout(render, 300);
    setTimeout(render, 900);
    setTimeout(render, 1800);
    return check();
  }

  window.PMDMenuFormCleanV39 = {
    mark: MARK,
    boot: boot,
    render: render,
    check: check,
    deepTest: deepTest,
    readMainSources: readMainSources,
    readGallery: readGallery,
    writeGallery: writeGallery,
    openMainPicker: openMainPicker,
    openGalleryPicker: openGalleryPicker
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  console.info('✅ PMD Menu Form clean v39 real image sources active', check());
})();
/* PMD_MENU_FORM_CLEAN_V39_REAL_IMAGE_SOURCES_END */
</script>
{{-- PMD_MENU_FORM_CLEAN_V39_REAL_IMAGE_SOURCES_END --}}


{
}


{
}

<script>

</script>
