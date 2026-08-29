@php
    // PMD_ALLERGEN_DISPLAY_I18N_V14
    $pmdMenuAllergenIcon = static function ($name) {
        $key = mb_strtolower(trim((string)$name));
        if (str_contains($key, 'celery')) return '<path d="M12 21V9"></path><path d="M12 13c-4 0-7-2.5-7-6 4 0 7 2.5 7 6z"></path><path d="M12 10c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6z"></path>';
        if (str_contains($key, 'crust')) return '<path d="M4 14c2-5 6-8 11-8 3 0 5 2 5 5 0 4-4 7-9 7H6"></path><path d="M8 10 5 7M12 8 10 4M16 8l2-3"></path><circle cx="16.5" cy="11" r=".8"></circle>';
        if (str_contains($key, 'egg')) return '<path d="M12 3c3 0 6 6 6 10a6 6 0 0 1-12 0c0-4 3-10 6-10z"></path>';
        if (str_contains($key, 'fish')) return '<path d="M4 12c3-4 7-6 12-4l4-3v14l-4-3c-5 2-9 0-12-4z"></path><circle cx="15.5" cy="11" r=".7"></circle>';
        if (str_contains($key, 'gluten') || str_contains($key, 'wheat')) return '<path d="M12 21V5"></path><path d="M12 8c-3 0-5-2-5-4 3 0 5 2 5 4zM12 12c-3 0-5-2-5-4 3 0 5 2 5 4zM12 16c-3 0-5-2-5-4 3 0 5 2 5 4z"></path><path d="M12 8c3 0 5-2 5-4-3 0-5 2-5 4zM12 12c3 0 5-2 5-4-3 0-5 2-5 4zM12 16c3 0 5-2 5-4-3 0-5 2-5 4z"></path>';
        if (str_contains($key, 'milk') || str_contains($key, 'lactose')) return '<path d="M8 3h8l1 4v14H7V7z"></path><path d="M7 8h10M10 3v4"></path>';
        if (str_contains($key, 'mollusc')) return '<path d="M4 18c1-6 4-10 8-12 4 2 7 6 8 12z"></path><path d="M12 6v12M8 8l2 10M16 8l-2 10M5 14h14"></path>';
        if (str_contains($key, 'nut') && !str_contains($key, 'pea')) return '<path d="M12 4c4 0 7 3 7 7 0 5-3 9-7 9s-7-4-7-9c0-4 3-7 7-7z"></path><path d="M8 7c2 1 6 1 8 0M9 11c2 1 4 1 6 0M10 15c1 .5 3 .5 4 0"></path>';
        if (str_contains($key, 'peanut')) return '<path d="M9 3c3 0 4 2 4 4 3 0 5 2 5 5 0 5-4 9-8 9-3 0-5-2-5-5 0-2 1-4 3-5-2-1-3-2-3-4 0-2 2-4 4-4z"></path><path d="m8 8 6 6M7 13l4 4M11 5l5 5"></path>';
        if (str_contains($key, 'sesame')) return '<ellipse cx="8" cy="9" rx="2" ry="3"></ellipse><ellipse cx="15.5" cy="7" rx="2" ry="3"></ellipse><ellipse cx="13" cy="15" rx="2" ry="3"></ellipse><ellipse cx="18" cy="14" rx="1.5" ry="2.3"></ellipse>';
        if (str_contains($key, 'soy')) return '<path d="M5 15c4-7 9-9 14-7-1 7-6 11-14 7z"></path><circle cx="9" cy="13" r="1"></circle><circle cx="13" cy="11" r="1"></circle><circle cx="17" cy="9" r="1"></circle>';
        if (str_contains($key, 'mustard')) return '<path d="M9 3h6l1 4 2 4v10H6V11l2-4z"></path><path d="M8 11h8M10 3v4h4V3"></path>';
        if (str_contains($key, 'sulph') || str_contains($key, 'sulf')) return '<path d="M9 3h6M10 3v5l-5 9a3 3 0 0 0 3 4h8a3 3 0 0 0 3-4l-5-9V3"></path><path d="M8 15h8"></path>';
        if (str_contains($key, 'lupin')) return '<path d="M12 21V7"></path><path d="M12 8c-3 0-5-2-5-5 3 0 5 2 5 5z"></path><path d="M12 12c3 0 5-2 5-5-3 0-5 2-5 5z"></path><path d="M12 16c-3 0-5-2-5-5 3 0 5 2 5 5z"></path>';
        return '<path d="M12 3 2.5 20h19L12 3z"></path><path d="M12 9v4M12 17h.01"></path>';
    };
@endphp

<div class="pmd-menu-modal" data-pmd-menu-modal hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="pmd-menu-modal-title">
    <div class="pmd-menu-modal__backdrop" data-pmd-menu-close></div>
    <section class="pmd-menu-modal__card" role="document">
        <header class="pmd-menu-modal__header">
            <div>
                <span class="pmd-menu-modal__eyebrow" data-pmd-menu-modal-eyebrow>{{ $pmdT('menu_item') }}</span>
                <h2 id="pmd-menu-modal-title" data-pmd-menu-modal-title>{{ $pmdT('create_food') }}</h2>
            </div>
            <button type="button" class="pmd-menu-modal__close" data-pmd-menu-close aria-label="{{ $pmdT('close') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
            </button>
        </header>

        <div class="pmd-menu-modal__body">
            <div data-pmd-food-modal-content>
                <form class="pmd-menu-form" data-pmd-menu-form enctype="multipart/form-data">
                    <input type="hidden" name="_token" value="{{ csrf_token() }}">
                    <input type="hidden" name="menu_id" value="" data-pmd-menu-id>
                    <input type="hidden" name="allergen_ids_present" value="1">

                    <section class="pmd-menu-form__section">
                        <div class="pmd-menu-form__image-row">
                            <div class="pmd-menu-form__preview" data-pmd-menu-image-preview>
                                <div class="pmd-menu-form__preview-placeholder">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"></path><circle cx="9" cy="10" r="2"></circle><path d="m5 17 4-4 3 3 2-2 5 4"></path></svg>
                                    <span>{{ $pmdT('food_image') }}</span>
                                </div>
                                <img src="" alt="{{ $pmdT('food_preview') }}" hidden>
                            </div>
                            <div class="pmd-menu-form__image-copy">
                                <h3>{{ $pmdT('food_image') }}</h3>
                                <p>{{ $pmdT('food_image_help') }}</p>
                                <label class="pmd-menu-form__upload">
                                    <input type="file" name="image" accept="image/jpeg,image/png,image/webp" data-pmd-menu-image-input>
                                    <span>{{ $pmdT('choose_image') }}</span>
                                </label>
                            </div>
                        </div>
                    </section>

                    <section class="pmd-menu-form__section">
                        <div class="pmd-menu-form__section-head">
                            <h3>{{ $pmdT('food_details') }}</h3>
                            <p>{{ $pmdT('food_details_help') }}</p>
                        </div>
                        <div class="pmd-menu-form__grid">
                            <label class="pmd-menu-field pmd-menu-field--wide">
                                <span>{{ $pmdT('name') }}</span>
                                <input type="text" name="menu_name" maxlength="128" required autocomplete="off" data-pmd-menu-name>
                            </label>
                            <label class="pmd-menu-field">
                                <span>{{ $pmdT('price') }}</span>
                                <input type="number" name="menu_price" min="0" step="0.01" required inputmode="decimal" data-pmd-menu-price>
                            </label>
                            <label class="pmd-menu-field pmd-menu-field--full">
                                <span>{{ $pmdT('description') }}</span>
                                <textarea name="menu_description" maxlength="1028" rows="4" placeholder="{{ $pmdT('food_description_placeholder') }}" data-pmd-menu-description></textarea>
                            </label>
                        </div>
                    </section>

                    <section class="pmd-menu-form__section">
                        <div class="pmd-menu-form__section-head">
                            <h3>{{ $pmdT('categories') }}</h3>
                            <p>{{ $pmdT('categories_help') }}</p>
                        </div>
                        <div class="pmd-menu-choice-grid pmd-menu-choice-grid--categories" data-pmd-menu-category-choices>
                            @foreach(($pmdMenuManagerCategories ?? collect()) as $category)
                                <label class="pmd-menu-choice">
                                    <input type="checkbox" name="category_ids[]" value="{{ (int)$category->category_id }}" data-pmd-menu-category-choice>
                                    <span>
                                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13 13 20l-9-9V4h7l9 9z"></path><circle cx="8.5" cy="8.5" r="1"></circle></svg>
                                        <b>{{ $category->name }}</b>
                                    </span>
                                </label>
                            @endforeach
                            @if(!count($pmdMenuManagerCategories ?? []))
                                <p class="pmd-menu-form__empty-note">{{ $pmdT('no_categories') }}</p>
                            @endif
                        </div>
                    </section>

                    <section class="pmd-menu-form__section">
                        <div class="pmd-menu-form__section-head">
                            <h3>{{ $pmdT('food_features') }}</h3>
                            <p>{{ $pmdT('food_features_help') }}</p>
                        </div>

                        <div class="pmd-menu-choice-grid pmd-menu-choice-grid--dietary" aria-label="{{ $pmdT('dietary_attributes') }}">
                            <label class="pmd-menu-choice pmd-menu-choice--dietary">
                                <input type="hidden" name="is_halal" value="0">
                                <input type="checkbox" name="is_halal" value="1" data-pmd-menu-halal>
                                <span>
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 1 1-9-9z"></path><path d="m17 4 .7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2L17 4z"></path></svg>
                                    <b>{{ $pmdT('halal') }}</b>
                                </span>
                            </label>
                            <label class="pmd-menu-choice pmd-menu-choice--dietary">
                                <input type="hidden" name="is_vegetarian" value="0">
                                <input type="checkbox" name="is_vegetarian" value="1" data-pmd-menu-vegetarian>
                                <span>
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4c-8 0-14 3-14 10 0 3 2 6 6 6 7 0 8-10 8-16z"></path><path d="M4 20c3-5 7-8 12-11"></path></svg>
                                    <b>{{ $pmdT('vegetarian') }}</b>
                                </span>
                            </label>
                            <label class="pmd-menu-choice pmd-menu-choice--dietary">
                                <input type="hidden" name="is_vegan" value="0">
                                <input type="checkbox" name="is_vegan" value="1" data-pmd-menu-vegan>
                                <span>
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V10"></path><path d="M12 14c-5 0-8-3-8-8 5 0 8 3 8 8z"></path><path d="M12 11c0-5 3-8 8-8 0 5-3 8-8 8z"></path></svg>
                                    <b>{{ $pmdT('vegan') }}</b>
                                </span>
                            </label>
                        </div>

                        <div class="pmd-menu-form__subhead">
                            <div>
                                <strong>{{ $pmdT('allergens') }}</strong>
                                <small>{{ $pmdT('allergens_help') }}</small>
                            </div>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.5 20h19L12 3z"></path><path d="M12 9v4M12 17h.01"></path></svg>
                        </div>
                        <div class="pmd-menu-choice-grid pmd-menu-choice-grid--allergens" data-pmd-menu-allergen-choices>
                            @foreach(($pmdMenuManagerAllergens ?? collect()) as $allergen)
                                <label class="pmd-menu-choice pmd-menu-choice--allergen">
                                    <input type="checkbox" name="allergen_ids[]" value="{{ (int)$allergen->allergen_id }}" data-pmd-menu-allergen-choice>
                                    <span>
                                        <svg viewBox="0 0 24 24" aria-hidden="true">{!! $pmdMenuAllergenIcon($allergen->name) !!}</svg>
                                        <b>{{ $pmdAllergenLabel($allergen->name) }}</b>
                                    </span>
                                </label>
                            @endforeach
                            @if(!count($pmdMenuManagerAllergens ?? []))
                                <p class="pmd-menu-form__empty-note">{{ $pmdT('no_allergens') }}</p>
                            @endif
                        </div>
                    </section>

                    <section class="pmd-menu-form__section">
                        <div class="pmd-menu-form__section-head">
                            <h3>{{ $pmdT('nutrition_prep') }}</h3>
                            <p>{{ $pmdT('nutrition_prep_help') }}</p>
                        </div>
                        <div class="pmd-menu-nutrition-grid">
                            <label class="pmd-menu-field"><span>{{ $pmdT('calories') }}</span><input type="number" name="calories" min="0" max="5000" step="1" inputmode="numeric" data-pmd-menu-calories></label>
                            <label class="pmd-menu-field"><span>{{ $pmdT('serving_size') }}</span><input type="text" name="serving_size" maxlength="64" placeholder="{{ $pmdT('serving_example') }}" data-pmd-menu-serving-size></label>
                            <label class="pmd-menu-field"><span>{{ $pmdT('protein') }}</span><input type="number" name="protein" min="0" max="1000" step="0.1" inputmode="decimal" data-pmd-menu-protein></label>
                            <label class="pmd-menu-field"><span>{{ $pmdT('carbs') }}</span><input type="number" name="carbs" min="0" max="1000" step="0.1" inputmode="decimal" data-pmd-menu-carbs></label>
                            <label class="pmd-menu-field"><span>{{ $pmdT('fat') }}</span><input type="number" name="fat" min="0" max="1000" step="0.1" inputmode="decimal" data-pmd-menu-fat></label>
                            <label class="pmd-menu-field"><span>{{ $pmdT('sugar') }}</span><input type="number" name="sugar" min="0" max="1000" step="0.1" inputmode="decimal" data-pmd-menu-sugar></label>
                            <div class="pmd-menu-field pmd-menu-field--prep-time" data-pmd-prep-field>
                                <span>{{ $pmdT('prep_time') }}</span>
                                <div class="pmd-menu-prep-presets" role="group" aria-label="{{ $pmdT('prep_time') }}">
                                    <button type="button" data-pmd-prep-preset data-store="10"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l3 2M9 2h6M12 2v3"></path></svg><span>5–10 min</span></button>
                                    <button type="button" data-pmd-prep-preset data-store="20"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l3 2M9 2h6M12 2v3"></path></svg><span>10–20 min</span></button>
                                    <button type="button" data-pmd-prep-preset data-store="30"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l3 2M9 2h6M12 2v3"></path></svg><span>20–30 min</span></button>
                                    <button type="button" data-pmd-prep-preset data-store="45"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l3 2M9 2h6M12 2v3"></path></svg><span>30–45 min</span></button>
                                    <button type="button" data-pmd-prep-custom>Custom</button>
                                </div>
                                <label class="pmd-menu-prep-custom" data-pmd-prep-custom-wrap hidden>
                                    <span>Custom minutes</span>
                                    <input type="number" name="prep_time_minutes" min="1" max="240" step="1" inputmode="numeric" value="20" data-pmd-menu-prep-time>
                                </label>
                            </div>
                        </div>
                    </section>
                </form>
            </div>

            <div data-pmd-category-modal-content hidden>
                <form class="pmd-menu-form pmd-category-form" data-pmd-category-form>
                    <input type="hidden" name="_token" value="{{ csrf_token() }}">
                    <section class="pmd-menu-form__section pmd-menu-form__section--compact">
                        <div class="pmd-menu-form__section-head">
                            <p>{{ $pmdT('category_name_help') }}</p>
                        </div>
                        <div class="pmd-menu-form__grid pmd-menu-form__grid--category">
                            <label class="pmd-menu-field pmd-menu-field--full">
                                <span>{{ $pmdT('category_name') }}</span>
                                <input type="text" name="name" maxlength="128" minlength="2" required autocomplete="off" placeholder="{{ $pmdT('category_name_placeholder') }}" data-pmd-category-name>
                            </label>
                        </div>
                    </section>
                </form>
            </div>

            <div data-pmd-combo-modal-content hidden>
                <form class="pmd-menu-form pmd-combo-form" data-pmd-combo-form enctype="multipart/form-data">
                    <input type="hidden" name="_token" value="{{ csrf_token() }}">
                    <input type="hidden" name="combo_id" value="" data-pmd-combo-id>

                    <section class="pmd-menu-form__section">
                        <div class="pmd-combo-cover-row">
                            <div class="pmd-combo-cover" data-pmd-combo-cover aria-label="{{ $pmdT('combo_image_preview') }}">
                                <div class="pmd-combo-cover__placeholder">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l8-4 8 4-8 4-8-4z"></path><path d="m4 12 8 4 8-4"></path><path d="m4 17 8 4 8-4"></path></svg>
                                </div>
                            </div>
                            <div class="pmd-combo-cover-copy">
                                <h3>{{ $pmdT('combo_image') }}</h3>
                                <p>{{ $pmdT('combo_image_help') }}</p>
                                <label class="pmd-menu-form__upload pmd-combo-cover-upload">
                                    <input type="file" name="image" accept="image/jpeg,image/png,image/webp" data-pmd-combo-image-input>
                                    <span>{{ $pmdT('choose_image') }}</span>
                                </label>
                            </div>
                        </div>
                    </section>

                    <section class="pmd-menu-form__section">
                        <div class="pmd-menu-form__section-head">
                            <h3>{{ $pmdT('selected_foods') }}</h3>
                            <p>{{ $pmdT('selected_foods_help') }}</p>
                        </div>
                        <div class="pmd-combo-form__items" data-pmd-combo-form-items></div>
                    </section>

                    <section class="pmd-menu-form__section pmd-combo-derived" data-pmd-combo-derived-section>
                        <div class="pmd-menu-form__section-head">
                            <h3>{{ $pmdT('inherited_info') }}</h3>
                            <p>{{ $pmdT('inherited_info_help') }}</p>
                        </div>

                        <div class="pmd-combo-derived__features" aria-label="{{ $pmdT('combo_dietary_profile') }}">
                            <div class="pmd-combo-derived-choice" data-pmd-combo-derived-choice="halal">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 1 1-9-9z"></path><path d="m17 4 .7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2L17 4z"></path></svg><b>{{ $pmdT('halal') }}</b><small>{{ $pmdT('all_selected_foods') }}</small>
                            </div>
                            <div class="pmd-combo-derived-choice" data-pmd-combo-derived-choice="vegetarian">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4c-8 0-14 3-14 10 0 3 2 6 6 6 7 0 8-10 8-16z"></path><path d="M4 20c3-5 7-8 12-11"></path></svg><b>{{ $pmdT('vegetarian') }}</b><small>{{ $pmdT('all_selected_foods') }}</small>
                            </div>
                            <div class="pmd-combo-derived-choice" data-pmd-combo-derived-choice="vegan">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V10"></path><path d="M12 14c-5 0-8-3-8-8 5 0 8 3 8 8z"></path><path d="M12 11c0-5 3-8 8-8 0 5-3 8-8 8z"></path></svg><b>{{ $pmdT('vegan') }}</b><small>{{ $pmdT('all_selected_foods') }}</small>
                            </div>
                        </div>

                        <div class="pmd-menu-form__subhead pmd-combo-derived__allergen-head">
                            <div><strong>{{ $pmdT('combo_allergens') }}</strong><small>{{ $pmdT('combo_allergens_help') }}</small></div>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.5 20h19L12 3z"></path><path d="M12 9v4M12 17h.01"></path></svg>
                        </div>
                        <div class="pmd-combo-derived__allergens" data-pmd-combo-derived-allergens></div>

                        <div class="pmd-menu-form__subhead pmd-combo-derived__nutrition-head">
                            <div><strong>{{ $pmdT('calculated_nutrition') }}</strong><small>{{ $pmdT('calculated_nutrition_help') }}</small></div>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18 12h3M6 18h12"></path><path d="M8 21h8"></path><path d="M8 16a6 6 0 1 1 8 0"></path></svg>
                        </div>
                        <div class="pmd-combo-derived__nutrition" data-pmd-combo-derived-nutrition></div>
                    </section>

                    <section class="pmd-menu-form__section">
                        <div class="pmd-menu-form__section-head">
                            <h3>{{ $pmdT('combo_details') }}</h3>
                            <p>{{ $pmdT('combo_details_help') }}</p>
                        </div>
                        <div class="pmd-menu-form__grid">
                            <label class="pmd-menu-field pmd-menu-field--wide">
                                <span>{{ $pmdT('combo_name') }}</span>
                                <input type="text" name="combo_name" maxlength="255" required autocomplete="off" data-pmd-combo-name>
                            </label>
                            <label class="pmd-menu-field">
                                <span>{{ $pmdT('bundle_price') }}</span>
                                <input type="number" name="combo_price" min="0" step="0.01" required inputmode="decimal" data-pmd-combo-price>
                            </label>
                            <label class="pmd-menu-field pmd-menu-field--full">
                                <span>{{ $pmdT('description') }}</span>
                                <textarea name="combo_description" maxlength="1028" rows="4" placeholder="{{ $pmdT('combo_description_placeholder') }}" data-pmd-combo-description></textarea>
                            </label>
                        </div>
                    </section>
                </form>
            </div>
        </div>

        <footer class="pmd-menu-modal__footer">
            <div class="pmd-menu-modal__footer-left">
                <button type="button" class="pmd-menu-modal__delete" data-pmd-menu-delete hidden>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="m7 7 1 13h8l1-13"></path><path d="M10 11v5M14 11v5"></path></svg>
                    <span data-pmd-menu-delete-label>{{ $pmdT('delete_food') }}</span>
                </button>
                <span class="pmd-menu-modal__status" data-pmd-menu-modal-status aria-live="polite"></span>
            </div>
            <div class="pmd-menu-modal__buttons">
                <button type="button" class="pmd-menu-modal__cancel" data-pmd-menu-close>{{ $pmdT('cancel') }}</button>
                <button type="button" class="pmd-menu-modal__save" data-pmd-menu-save>{{ $pmdT('save_food') }}</button>
            </div>
        </footer>
    </section>
</div>
