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

    <header class="pmd-menu-form-v170-hero">
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
                        <h2>Menu Essentials</h2>
                        <p>Name, category, price, description, priority, and preparation timing.</p>
                    </div>
                </div>

                <div class="pmd-menu-form-v170-grid two">
                    {!! $pmdMenuField('menu_name', 'pmd-v170-field-main') !!}
                    {!! $pmdMenuField('menu_price', 'pmd-v170-field-price') !!}
                    {!! $pmdMenuField('food_name_autocomplete') !!}
                    {!! $pmdMenuField('menu_priority') !!}
                    {!! $pmdMenuField('categories') !!}
                    {!! $pmdMenuField('prep_time_minutes') !!}
                </div>

                <div class="pmd-menu-form-v170-grid one">
                    {!! $pmdMenuField('menu_description', 'pmd-v170-field-description') !!}
                </div>
            </section>

            <section class="pmd-menu-form-v170-card">
                <div class="pmd-menu-form-v170-section-head">
                    <div class="pmd-menu-form-v170-section-icon">🥗</div>
                    <div>
                        <h2>Dietary & Safety</h2>
                        <p>Halal, vegetarian, vegan, spice, color, and allergy warnings for guests.</p>
                    </div>
                </div>

                <div class="pmd-menu-form-v170-grid two compact-switches">
                    {!! $pmdMenuField('is_halal') !!}
                    {!! $pmdMenuField('is_vegetarian') !!}
                    {!! $pmdMenuField('is_vegan') !!}
                    {!! $pmdMenuField('allergens') !!}
                    {!! $pmdMenuField('color') !!}
                    {!! $pmdMenuField('spice_level') !!}
                </div>
            </section>

            <section class="pmd-menu-form-v170-card">
                <div class="pmd-menu-form-v170-section-head">
                    <div class="pmd-menu-form-v170-section-icon">🧠</div>
                    <div>
                        <h2>Nutrition & AI Assistant</h2>
                        <p>Draft descriptions faster and add optional nutrition values for the customer card.</p>
                    </div>
                </div>

                <div class="pmd-menu-form-v170-grid one">
                    {!! $pmdMenuField('ai_nutrition_assistant') !!}
                </div>

                <div class="pmd-menu-form-v170-grid two">
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
                        <h2>Availability & Stock</h2>
                        <p>Locations, mealtimes, stock, minimum quantity, order rules, and visibility.</p>
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

            <section class="pmd-menu-form-v170-card">
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
            <section class="pmd-menu-form-v170-card">
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

            <section class="pmd-menu-form-v170-card">
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
                <details class="pmd-menu-form-v170-card pmd-menu-form-v170-advanced">
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
  padding: fff;
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

<script id="pmd-menu-form-v170-script">
(function () {
  if (window.__PMD_MENU_FORM_V170__) return;
  window.__PMD_MENU_FORM_V170__ = true;

  window.PMDMenuFormV170 = {
    check: function () {
      var root = document.querySelector('.pmd-menu-form-v170');

      return {
        mark: 'PMD_MENU_FORM_V170_CREATE_EDIT_CARDS',
        path: location.pathname,
        root: !!root,
        cards: root ? root.querySelectorAll('.pmd-menu-form-v170-card').length : 0,
        fields: root ? root.querySelectorAll('.form-group').length : 0,
        rawDefaultRenderFormVisible: !!document.querySelector('.form-fields:not(.pmd-menu-form-v170 .form-fields)'),
        status: root ? 'OK' : 'MISSING'
      };
    }
  };

  console.info('✅ PMD Menu Form v170 card layout active', window.PMDMenuFormV170.check());
})();
</script>

<script id="pmd-menu-form-v171-script">
(function () {
  if (window.__PMD_MENU_FORM_V171__) return;
  window.__PMD_MENU_FORM_V171__ = true;

  function cards() {
    return Array.from(document.querySelectorAll('.pmd-menu-form-v170-card'));
  }

  function titleOf(card) {
    var h = card.querySelector('h2');
    return h ? h.textContent.trim() : '';
  }

  function findCard(label) {
    var all = cards();

    if (label === 'Finish & Save') {
      return document.querySelector('.pmd-menu-form-v170-save-card');
    }

    return all.find(function (card) {
      return titleOf(card) === label;
    }) || null;
  }

  function setActive(label) {
    document.querySelectorAll('.pmd-menu-form-v171-nav button').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.pmdMenuSection === label);
    });

    cards().forEach(function (card) {
      card.classList.toggle('pmd-v171-active-card', titleOf(card) === label || (label === 'Finish & Save' && card.classList.contains('pmd-menu-form-v170-save-card')));
    });
  }

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('.pmd-menu-form-v171-nav button[data-pmd-menu-section]');
    if (!btn) return;

    var label = btn.dataset.pmdMenuSection || '';
    var card = findCard(label);
    if (!card) return;

    event.preventDefault();
    setActive(label);

    var y = card.getBoundingClientRect().top + window.scrollY - 112;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  });

  function onScroll() {
    var all = cards().filter(function (card) {
      return !!card.querySelector('h2') || card.classList.contains('pmd-menu-form-v170-save-card');
    });

    var current = all[0];
    var best = Infinity;

    all.forEach(function (card) {
      var d = Math.abs(card.getBoundingClientRect().top - 150);
      if (d < best) {
        best = d;
        current = card;
      }
    });

    var label = current && current.classList.contains('pmd-menu-form-v170-save-card')
      ? 'Finish & Save'
      : titleOf(current);

    if (label) setActive(label);

    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    var pct = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
    var bar = document.querySelector('.pmd-menu-form-v171-progress-bar');
    if (bar) bar.style.width = pct + '%';
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  setTimeout(onScroll, 80);

  window.PMDMenuFormV171 = {
    check: function () {
      return {
        mark: 'PMD_MENU_FORM_V171_NAV_POLISH',
        path: location.pathname,
        navButtons: document.querySelectorAll('.pmd-menu-form-v171-nav button').length,
        cards: document.querySelectorAll('.pmd-menu-form-v170-card').length,
        progress: !!document.querySelector('.pmd-menu-form-v171-progress-bar'),
        defaultImage404Fixed: !document.documentElement.innerHTML.includes('/app/admin/assets/images/default-image.png'),
        status: document.querySelector('.pmd-menu-form-v171-nav') ? 'OK' : 'MISSING'
      };
    }
  };

  console.info('✅ PMD Menu Form v171 nav polish active', window.PMDMenuFormV171.check());
})();
</script>


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

<script id="pmd-menu-form-v172-category-script">
(function () {
  if (window.__PMD_MENU_FORM_V172_CATEGORY__) return;
  window.__PMD_MENU_FORM_V172_CATEGORY__ = true;

  var categoryChoices = @json($pmdMenuCategoryChoicesV172);
  var serverSelected = @json(array_values(array_unique($pmdMenuSelectedCategoryIdsV172)));

  function findCategorySelect() {
    return document.querySelector('select[name*="categories"]');
  }

  function closestField(select) {
    return select.closest('[data-field-name="categories"]')
      || select.closest('.field-categories')
      || select.closest('.form-group')
      || select.parentElement;
  }

  function selectedValues(select) {
    var values = new Set(serverSelected.map(String));

    Array.from(select.options || []).forEach(function (opt) {
      if (opt.selected && opt.value !== '') values.add(String(opt.value));
    });

    return values;
  }

  function ensureOptions(select, choices, selected) {
    var existing = new Set(Array.from(select.options || []).map(function (opt) {
      return String(opt.value);
    }));

    choices.forEach(function (item) {
      if (!item || !item.id || existing.has(String(item.id))) return;

      var opt = new Option(item.name, item.id, false, selected.has(String(item.id)));
      select.add(opt);
    });
  }

  function getChoicesFromSelect(select) {
    return Array.from(select.options || [])
      .filter(function (opt) { return opt.value !== ''; })
      .map(function (opt) {
        return {
          id: String(opt.value),
          name: (opt.textContent || opt.label || opt.value).trim(),
        };
      });
  }

  function syncSelect(select, grid) {
    var checked = new Set(
      Array.from(grid.querySelectorAll('input[type="checkbox"]:checked')).map(function (input) {
        return String(input.value);
      })
    );

    Array.from(select.options || []).forEach(function (opt) {
      opt.selected = checked.has(String(opt.value));
    });

    if (window.jQuery) {
      window.jQuery(select).trigger('change');
    } else {
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    updateState(select, grid);
  }

  function updateState(select, grid) {
    var selected = selectedValues(select);
    var count = 0;

    Array.from(grid.querySelectorAll('.pmd172-category-choice')).forEach(function (choice) {
      var input = choice.querySelector('input');
      var checked = input && selected.has(String(input.value));

      if (input) input.checked = checked;
      choice.classList.toggle('is-checked', !!checked);

      if (checked) count++;
    });

    var badge = grid.closest('.pmd172-category-panel')?.querySelector('.pmd172-category-count');

    if (badge) {
      badge.textContent = count + ' selected';
    }
  }

  function enhance() {
    var select = findCategorySelect();

    if (!select || select.dataset.pmd172Category === '1') return;

    var root = closestField(select);
    if (!root) return;

    var selected = selectedValues(select);
    ensureOptions(select, categoryChoices, selected);

    var choices = categoryChoices.length ? categoryChoices : getChoicesFromSelect(select);

    if (!choices.length) return;

    select.dataset.pmd172Category = '1';
    root.classList.add('pmd172-category-enhanced');

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

    root.appendChild(panel);

    grid.addEventListener('change', function () {
      syncSelect(select, grid);
    });

    if (window.jQuery) {
      window.jQuery(select).on('change', function () {
        updateState(select, grid);
      });
    } else {
      select.addEventListener('change', function () {
        updateState(select, grid);
      });
    }

    updateState(select, grid);
    syncSelect(select, grid);
  }

  function start() {
    enhance();
    setTimeout(enhance, 300);
    setTimeout(enhance, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.PMDMenuFormV172 = {
    check: function () {
      var select = findCategorySelect();
      var panel = document.querySelector('.pmd172-category-panel');

      return {
        mark: 'PMD_MENU_FORM_V172_CATEGORY_CHOOSER',
        path: location.pathname,
        categorySelect: !!select,
        enhanced: !!panel,
        choices: panel ? panel.querySelectorAll('.pmd172-category-choice').length : 0,
        checked: panel ? panel.querySelectorAll('.pmd172-category-choice.is-checked').length : 0,
        status: panel ? 'OK' : 'MISSING'
      };
    }
  };

  console.info('✅ PMD Menu Form v172 food category chooser active', window.PMDMenuFormV172.check());
})();
</script>


<script id="pmd-menu-form-v173-category-cleanup-script">
(function () {
  if (window.__PMD_MENU_FORM_V173_CATEGORY_CLEANUP__) return;
  window.__PMD_MENU_FORM_V173_CATEGORY_CLEANUP__ = true;

  function findCategorySelect() {
    return document.querySelector('select[name*="categories"]');
  }

  function hideNativeCategory() {
    var select = findCategorySelect();
    var panel = document.querySelector('.pmd172-category-panel');

    if (!select || !panel) return false;

    var field =
      select.closest('.form-group') ||
      select.closest('.field-categories') ||
      select.closest('[data-field-name="categories"]') ||
      panel.parentElement;

    if (!field) return false;

    field.classList.add('pmd173-category-native-hidden');

    // Sometimes Select2 renders siblings/wrappers around the hidden select.
    var scanRoot = field;
    Array.from(scanRoot.querySelectorAll('select, .select2, .select2-container, .select2-selection')).forEach(function (el) {
      if (el.closest('.pmd172-category-panel')) return;
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('height', '0', 'important');
      el.style.setProperty('min-height', '0', 'important');
      el.style.setProperty('max-height', '0', 'important');
      el.style.setProperty('margin', '0', 'important');
      el.style.setProperty('padding', '0', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
    });

    // Keep the panel visible no matter what global select2 fixes do.
    panel.style.setProperty('display', 'block', 'important');
    panel.style.setProperty('opacity', '1', 'important');
    panel.style.setProperty('visibility', 'visible', 'important');
    panel.style.setProperty('height', 'auto', 'important');

    return true;
  }

  function start() {
    hideNativeCategory();
    setTimeout(hideNativeCategory, 120);
    setTimeout(hideNativeCategory, 400);
    setTimeout(hideNativeCategory, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.PMDMenuFormV173 = {
    check: function () {
      var panel = document.querySelector('.pmd172-category-panel');
      var field = document.querySelector('.pmd173-category-native-hidden');
      var visibleNative = 0;

      if (field) {
        Array.from(field.querySelectorAll('.select2-container, .select2-selection')).forEach(function (el) {
          var cs = getComputedStyle(el);
          if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.height || '0') > 1) {
            visibleNative++;
          }
        });
      }

      return {
        mark: 'PMD_MENU_FORM_V173_HIDE_NATIVE_CATEGORY_SELECT',
        path: location.pathname,
        panel: !!panel,
        fieldHiddenClass: !!field,
        visibleNativeSelect2: visibleNative,
        choices: panel ? panel.querySelectorAll('.pmd172-category-choice').length : 0,
        checked: panel ? panel.querySelectorAll('.pmd172-category-choice.is-checked').length : 0,
        status: panel && visibleNative === 0 ? 'OK' : 'CHECK'
      };
    }
  };

  console.info('✅ PMD Menu Form v173 category native select cleanup active', window.PMDMenuFormV173.check());
})();
</script>


<style id="pmd-menu-form-v174b-surgical-style">
/* PMD_MENU_FORM_V174B_SURGICAL_CLEANUP_START */

/* Remove the top section navigation only visually. Do not touch field rendering. */
.pmd-menu-form-v171-nav,
.pmd-menu-form-v171-progress {
  display: none !important;
}

/* Hide old hero Back / Reload / Save actions. New safe floating actions trigger the original buttons. */
.pmd-menu-form-v170-actions {
  display: none !important;
}

/* Remove bottom save/delete and remaining fields UI without changing submitted hidden data. */
.pmd-menu-form-v170-save-card,
.pmd-menu-form-v170-advanced {
  display: none !important;
}

/* Clean Preview & Media text chrome. */
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

.pmd-live-preview-details {
  border-radius: 22px !important;
  overflow: hidden !important;
}

.pmd-live-preview-card {
  border-radius: 22px !important;
}

.pmd-live-preview-image-wrap {
  min-height: 188px !important;
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

/* Safe floating top actions. */
.pmd-v174b-top-actions {
  position: fixed;
  top: 58px;
  right: 112px;
  z-index: 1065;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  border: 1px solid rgba(207, 232, 246, .95);
  border-radius: 999px;
  background: rgba(255, 255, 255, .90);
  backdrop-filter: blur(16px);
  box-shadow: 0 16px 38px rgba(15, 23, 42, .10);
}

.pmd-v174b-top-btn {
  height: 42px;
  min-height: 42px;
  border-radius: 999px;
  padding: 0 17px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 950;
  cursor: pointer;
  white-space: nowrap;
  transition: transform .16s ease, box-shadow .16s ease;
}

.pmd-v174b-top-btn:hover {
  transform: translateY(-1px);
}

.pmd-v174b-top-btn.ai {
  background: #fff8e7;
  border-color: #ffe2a6;
  color: #6a4400;
  box-shadow: 0 10px 24px rgba(214, 143, 20, .10);
}

.pmd-v174b-top-btn.save {
  background: #006b55;
  border-color: #006b55;
  color: #fff;
  box-shadow: 0 14px 32px rgba(0,107,85,.20);
}

@media (max-width: 900px) {
  .pmd-v174b-top-actions {
    right: 14px;
    top: auto;
    bottom: 18px;
  }
}
/* PMD_MENU_FORM_V174B_SURGICAL_CLEANUP_END */
</style>


<script id="pmd-menu-form-v174b-surgical-script">
(function () {
  if (window.__PMD_MENU_FORM_V174B_SURGICAL__) return;
  window.__PMD_MENU_FORM_V174B_SURGICAL__ = true;

  function mediaUrlFromPath(value) {
    value = String(value || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.charAt(0) === '/') return window.location.origin + value;

    value = value.replace(/^\/+/, '');

    if (/^attachments\/public\//i.test(value)) {
      return window.location.origin + '/assets/media/' + value;
    }

    if (/^assets\/media\//i.test(value)) {
      return window.location.origin + '/' + value;
    }

    if (/^uploads\//i.test(value)) {
      return window.location.origin + '/assets/media/' + value;
    }

    return window.location.origin + '/assets/media/uploads/' + value;
  }

  function ensurePreviewImage() {
    var wrap = document.querySelector('.pmd-live-preview-image-wrap');
    if (!wrap) return null;

    var img = document.getElementById('pmd-prev-img');

    if (!img) {
      img = document.createElement('img');
      img.id = 'pmd-prev-img';
      img.alt = 'Preview image';
      wrap.appendChild(img);
    }

    var src = '';

    var visibleImg = document.querySelector('[data-control="mediafinder"] img[src]');
    if (visibleImg && visibleImg.getAttribute('src')) {
      src = visibleImg.getAttribute('src');
    }

    if (!src) {
      var hiddenPath = document.querySelector('[data-control="mediafinder"] [data-find-value]');
      if (hiddenPath && hiddenPath.value) {
        src = mediaUrlFromPath(hiddenPath.value);
      }
    }

    if (src) {
      img.src = src;
      img.style.display = 'block';
      img.style.opacity = '1';
      img.style.visibility = 'visible';
    }

    return img;
  }

  function findOriginalSaveButton() {
    return document.querySelector('.pmd-menu-form-v170-actions button[data-request="onSave"]')
      || document.querySelector('button[data-request="onSave"]');
  }

  function triggerSave() {
    var btn = findOriginalSaveButton();

    if (btn) {
      btn.click();
      return;
    }

    var form = document.querySelector('.pmd-menu-form-v170 form, form#edit-form, form');
    if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
  }

  function triggerAiFill() {
    var candidates = Array.from(document.querySelectorAll('button, a')).filter(function (el) {
      var t = (el.textContent || '').trim().toLowerCase();
      return t.includes('ai auto fill') || t.includes('ai fill');
    });

    var internal = candidates.find(function (el) {
      return !el.closest('.pmd-v174b-top-actions');
    });

    if (internal) {
      internal.click();
      return;
    }

    var name = document.querySelector('[name="Menu[menu_name]"], [name="menu_name"]');
    if (name) name.focus();

    console.warn('[PMD v174b] Internal AI button not found.');
  }

  function ensureTopActions() {
    if (document.querySelector('.pmd-v174b-top-actions')) return;

    var holder = document.createElement('div');
    holder.className = 'pmd-v174b-top-actions';
    holder.innerHTML =
      '<button type="button" class="pmd-v174b-top-btn ai" data-pmd-v174b-ai><span>✨</span>AI Fill</button>' +
      '<button type="button" class="pmd-v174b-top-btn save" data-pmd-v174b-save><i class="fa fa-save"></i>Save Item</button>';

    document.body.appendChild(holder);
  }

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-pmd-v174b-save]')) {
      event.preventDefault();
      triggerSave();
    }

    if (event.target.closest('[data-pmd-v174b-ai]')) {
      event.preventDefault();
      triggerAiFill();
    }
  });

  function start() {
    ensureTopActions();
    ensurePreviewImage();
    setTimeout(ensurePreviewImage, 150);
    setTimeout(ensurePreviewImage, 700);
    setTimeout(ensurePreviewImage, 1500);
  }

  document.addEventListener('change', function (event) {
    if (event.target.closest('[data-control="mediafinder"]')) {
      setTimeout(ensurePreviewImage, 80);
      setTimeout(ensurePreviewImage, 350);
    }
  });

  if (window.MutationObserver) {
    var form = document.querySelector('form');
    if (form) {
      var observer = new MutationObserver(function () {
        ensurePreviewImage();
      });
      observer.observe(form, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'value'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.PMDMenuFormV174B = {
    check: function () {
      var nav = document.querySelector('.pmd-menu-form-v171-nav');
      var actions = document.querySelector('.pmd-menu-form-v170-actions');
      var saveCard = document.querySelector('.pmd-menu-form-v170-save-card');
      var advanced = document.querySelector('.pmd-menu-form-v170-advanced');
      var previewImg = document.querySelector('#pmd-prev-img');

      return {
        mark: 'PMD_MENU_FORM_V174B_SURGICAL_CLEANUP',
        path: location.pathname,
        topActions: !!document.querySelector('.pmd-v174b-top-actions'),
        navHidden: !nav || getComputedStyle(nav).display === 'none',
        oldHeroActionsHidden: !actions || getComputedStyle(actions).display === 'none',
        saveCardHidden: !saveCard || getComputedStyle(saveCard).display === 'none',
        advancedHidden: !advanced || getComputedStyle(advanced).display === 'none',
        previewImg: !!previewImg,
        previewImgSrc: previewImg ? previewImg.getAttribute('src') : '',
        categoryPanelStillOk: !!document.querySelector('.pmd172-category-panel'),
        status: document.querySelector('.pmd-v174b-top-actions') ? 'OK' : 'CHECK'
      };
    }
  };

  console.info('✅ PMD Menu Form v174b surgical cleanup active', window.PMDMenuFormV174B.check());
})();
</script>

<!-- PMD_MENU_FORM_V170_CREATE_EDIT_CARDS_END -->
