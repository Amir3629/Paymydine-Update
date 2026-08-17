@php
    $cards = $pmdMenuManagerCards ?? [];
    $categories = $pmdMenuManagerCategories ?? collect();
    $combos = $pmdMenuManagerCombos ?? [];
    $canManageCategories = !empty($pmdMenuManagerCanManageCategories);
    $canManageCombos = !empty($pmdMenuManagerCanManageCombos);
    $hasCombos = !empty($pmdMenuManagerHasCombos) || count($combos) > 0;
    $stats = $pmdMenuManagerStats ?? ['total' => 0, 'published' => 0, 'stock_out' => 0, 'foods' => 0, 'combos' => 0];
    $disabledCount = max(0, (int)$stats['total'] - (int)$stats['published']);
    $categoryCount = (is_countable($categories) ? count($categories) : 0) + ($hasCombos ? 1 : 0);
    $totalCatalogueCards = count($cards) + count($combos);

    $pmdMenuLocale = strtolower(trim((string)request()->cookie('pmd_admin_locale', app()->getLocale())));
    $pmdMenuLocale = str_starts_with($pmdMenuLocale, 'de') ? 'de' : 'en';
    $pmdMenuCopy = [
        'en' => [
            'menu_header' => 'Menu header', 'menu_actions' => 'Menu actions', 'create_food' => 'Create food', 'create_combo' => 'Create combo', 'notifications' => 'Notifications',
            'menu_overview' => 'Menu overview', 'menu_items' => 'Menu items', 'foods_combos' => 'Foods + combos', 'categories' => 'Categories', 'enabled_categories' => 'Enabled categories',
            'stock_out' => 'Stock out', 'unavailable_foods' => 'Unavailable foods', 'disabled' => 'Disabled', 'legacy_hidden_items' => 'Legacy hidden items',
            'menu_catalogue' => 'Menu catalogue', 'search_menu' => 'Search menu...', 'stock_filter' => 'Stock filter', 'all' => 'All', 'in_stock' => 'In stock', 'stock_in' => 'Stock in',
            'menu_categories' => 'Menu categories', 'all_foods' => 'All foods', 'combos' => 'Combos', 'edit' => 'Edit', 'edit_combo' => 'Edit combo', 'no_description' => 'No description',
            'items' => 'items', 'more' => 'more', 'no_foods_yet' => 'No foods yet', 'create_first_food' => 'Create the first food item and it will appear here.',
            'no_results' => 'No menu items match these filters.', 'sort_edit' => 'Edit order', 'sort_done' => 'Done', 'sort_title' => 'Reorder menu cards',
            'sort_saving' => 'Saving order...', 'sort_saved' => 'Order saved', 'sort_failed' => 'Could not save order.', 'sort_food_hint' => 'Drag foods to set the frontend order.',
            'sort_combo_hint' => 'Drag combos to set their order.', 'sort_category_hint' => 'Drag categories to set their frontend order.', 'sort_mode_all' => 'All foods is opened for safe ordering.',
            'add_category' => 'Add category', 'create_category' => 'Create category', 'category_name' => 'Category name', 'category_name_help' => 'Create one menu category. You can reorder it immediately in Edit order mode.', 'category_name_placeholder' => 'e.g. Lunch', 'save_category' => 'Save category', 'category_created' => 'Category created', 'category_create_error' => 'Could not create category.',
            'combo_attrs' => 'Combo attributes inherited from foods', 'all_foods_halal' => 'All foods are Halal', 'all_foods_vegetarian' => 'All foods are vegetarian', 'all_foods_vegan' => 'All foods are vegan',
            'allergen_singular' => 'allergen', 'allergen_plural' => 'allergens', 'combo_foods' => 'Combo foods',
            'menu_item' => 'Menu item', 'close' => 'Close', 'food_image' => 'Food image', 'food_preview' => 'Food preview', 'food_image_help' => 'JPG, PNG or WEBP. The image fills the food card and a new upload becomes the primary image.', 'choose_image' => 'Choose image',
            'food_details' => 'Food details', 'food_details_help' => 'Name, price and guest-facing description.', 'name' => 'Name', 'price' => 'Price', 'description' => 'Description', 'food_description_placeholder' => 'Short guest-facing description',
            'categories_help' => 'A food can belong to more than one category. Select every category that applies.', 'diet_allergens' => 'Diet & allergens', 'diet_allergens_help' => 'Select dietary attributes and exact allergens shown to guests.', 'halal' => 'Halal', 'vegetarian' => 'Vegetarian', 'vegan' => 'Vegan', 'allergens' => 'Allergens', 'allergens_help' => 'Select each allergen contained in this food.', 'no_allergens' => 'No enabled allergens are configured.',
            'nutrition_prep' => 'Nutrition & preparation', 'nutrition_prep_help' => 'Nutrition and preparation information shown for this food.', 'calories' => 'Calories (kcal)', 'serving_size' => 'Serving size', 'protein' => 'Protein (g)', 'carbs' => 'Carbs (g)', 'fat' => 'Fat (g)', 'sugar' => 'Sugar (g)', 'prep_time' => 'Prep time (min)',
            'combo_image_preview' => 'Combo image preview', 'combo_image' => 'Combo image', 'combo_image_help' => 'Choose a custom cover, or leave it empty and PMD builds one from the selected food images.', 'selected_foods' => 'Selected foods', 'selected_foods_help' => 'Choose at least two foods. Set the quantity for each selected food.',
            'inherited_info' => 'Inherited food information', 'inherited_info_help' => 'Diet, allergens and nutrition are calculated from the selected foods.', 'all_selected_foods' => 'All selected foods', 'combo_allergens' => 'Allergens in this combo', 'combo_allergens_help' => 'Union of allergens from all selected foods.', 'calculated_nutrition' => 'Calculated nutrition', 'calculated_nutrition_help' => 'Totals include selected quantities. Prep time uses the slowest included food.',
            'combo_details' => 'Combo details', 'combo_details_help' => 'Name, bundle price and guest-facing description.', 'combo_name' => 'Combo name', 'bundle_price' => 'Bundle price', 'combo_description_placeholder' => 'Short guest-facing combo description', 'cancel' => 'Cancel', 'save_food' => 'Save food', 'save_combo' => 'Save combo', 'edit_food' => 'Edit food', 'edit_combo_title' => 'Edit combo',
            'saving' => 'Saving...', 'saved' => 'Saved', 'save_food_error' => 'Could not save food.', 'save_combo_error' => 'Could not save combo.', 'refresh_error' => 'Saved, but the Menu page could not refresh.', 'refresh_incomplete' => 'Menu refresh payload is incomplete.',
            'delete_food' => 'Delete food', 'delete_combo' => 'Delete combo', 'delete_permanently' => 'Delete permanently', 'delete_food_confirm' => 'Delete this food permanently? This cannot be undone.', 'delete_combo_confirm' => 'Delete this combo permanently? This cannot be undone.', 'deleting' => 'Deleting...', 'food_deleted' => 'Food deleted', 'combo_deleted' => 'Combo deleted', 'delete_food_error' => 'Could not delete food.', 'delete_combo_error' => 'Could not delete combo.',
            'select_foods_cover' => 'Select foods to build the cover', 'combo_cover_preview' => 'Combo cover preview', 'no_declared_allergens' => 'No declared allergens in the selected foods.', 'yes' => 'yes', 'not_confirmed_all' => 'not confirmed for all foods', 'decrease_quantity' => 'Decrease quantity', 'increase_quantity' => 'Increase quantity', 'quantity' => 'Quantity', 'no_categories' => 'No enabled categories are available.', 'food_features' => 'Food features', 'food_features_help' => 'Select dietary attributes and exact allergens shown to guests.', 'dietary_attributes' => 'Dietary attributes', 'uncategorized' => 'Uncategorized', 'serving_example' => 'e.g. 350 g', 'combo_dietary_profile' => 'Combo dietary profile', 'no_foods_selected' => 'No foods selected.', 'food_number' => 'Food #'
        ],
        'de' => [
            'menu_header' => 'Menü-Kopfbereich', 'menu_actions' => 'Menü-Aktionen', 'create_food' => 'Speise erstellen', 'create_combo' => 'Combo erstellen', 'notifications' => 'Benachrichtigungen',
            'menu_overview' => 'Menüübersicht', 'menu_items' => 'Menüartikel', 'foods_combos' => 'Speisen + Combos', 'categories' => 'Kategorien', 'enabled_categories' => 'Aktive Kategorien',
            'stock_out' => 'Ausverkauft', 'unavailable_foods' => 'Nicht verfügbare Speisen', 'disabled' => 'Deaktiviert', 'legacy_hidden_items' => 'Ausgeblendete Artikel',
            'menu_catalogue' => 'Menükatalog', 'search_menu' => 'Menü durchsuchen...', 'stock_filter' => 'Bestandsfilter', 'all' => 'Alle', 'in_stock' => 'Verfügbar', 'stock_in' => 'Wieder verfügbar',
            'menu_categories' => 'Menükategorien', 'all_foods' => 'Alle Speisen', 'combos' => 'Combos', 'edit' => 'Bearbeiten', 'edit_combo' => 'Combo bearbeiten', 'no_description' => 'Keine Beschreibung',
            'items' => 'Artikel', 'more' => 'weitere', 'no_foods_yet' => 'Noch keine Speisen', 'create_first_food' => 'Erstelle die erste Speise. Sie erscheint anschließend hier.',
            'no_results' => 'Keine Menüartikel entsprechen diesen Filtern.', 'sort_edit' => 'Reihenfolge bearbeiten', 'sort_done' => 'Fertig', 'sort_title' => 'Menükarten sortieren',
            'sort_saving' => 'Reihenfolge wird gespeichert...', 'sort_saved' => 'Reihenfolge gespeichert', 'sort_failed' => 'Reihenfolge konnte nicht gespeichert werden.', 'sort_food_hint' => 'Ziehe Speisen, um die Reihenfolge im Gästemenü festzulegen.',
            'sort_combo_hint' => 'Ziehe Combos, um ihre Reihenfolge festzulegen.', 'sort_category_hint' => 'Ziehe Kategorien, um ihre Reihenfolge im Gästemenü festzulegen.', 'sort_mode_all' => 'Für sicheres Sortieren wurde „Alle Speisen“ geöffnet.',
            'add_category' => 'Kategorie hinzufügen', 'create_category' => 'Kategorie erstellen', 'category_name' => 'Kategoriename', 'category_name_help' => 'Erstelle eine Menükategorie. Im Modus „Reihenfolge bearbeiten“ kannst du sie direkt sortieren.', 'category_name_placeholder' => 'z. B. Mittagessen', 'save_category' => 'Kategorie speichern', 'category_created' => 'Kategorie erstellt', 'category_create_error' => 'Kategorie konnte nicht erstellt werden.',
            'combo_attrs' => 'Vom Inhalt des Combos übernommene Eigenschaften', 'all_foods_halal' => 'Alle Speisen sind Halal', 'all_foods_vegetarian' => 'Alle Speisen sind vegetarisch', 'all_foods_vegan' => 'Alle Speisen sind vegan',
            'allergen_singular' => 'Allergen', 'allergen_plural' => 'Allergene', 'combo_foods' => 'Combo-Speisen',
            'menu_item' => 'Menüartikel', 'close' => 'Schließen', 'food_image' => 'Speisenbild', 'food_preview' => 'Speisenvorschau', 'food_image_help' => 'JPG, PNG oder WEBP. Das Bild füllt die Speisenkarte; ein neues Bild wird zum Hauptbild.', 'choose_image' => 'Bild auswählen',
            'food_details' => 'Speisendetails', 'food_details_help' => 'Name, Preis und Beschreibung für Gäste.', 'name' => 'Name', 'price' => 'Preis', 'description' => 'Beschreibung', 'food_description_placeholder' => 'Kurze Beschreibung für Gäste',
            'categories_help' => 'Eine Speise kann mehreren Kategorien angehören. Wähle alle passenden Kategorien aus.', 'diet_allergens' => 'Ernährung & Allergene', 'diet_allergens_help' => 'Wähle Ernährungsmerkmale und die genauen Allergene, die Gäste sehen sollen.', 'halal' => 'Halal', 'vegetarian' => 'Vegetarisch', 'vegan' => 'Vegan', 'allergens' => 'Allergene', 'allergens_help' => 'Wähle jedes Allergen aus, das in dieser Speise enthalten ist.', 'no_allergens' => 'Keine aktiven Allergene sind konfiguriert.',
            'nutrition_prep' => 'Nährwerte & Zubereitung', 'nutrition_prep_help' => 'Nährwert- und Zubereitungsangaben für diese Speise.', 'calories' => 'Kalorien (kcal)', 'serving_size' => 'Portionsgröße', 'protein' => 'Eiweiß (g)', 'carbs' => 'Kohlenhydrate (g)', 'fat' => 'Fett (g)', 'sugar' => 'Zucker (g)', 'prep_time' => 'Zubereitungszeit (Min.)',
            'combo_image_preview' => 'Combo-Bildvorschau', 'combo_image' => 'Combo-Bild', 'combo_image_help' => 'Wähle ein eigenes Titelbild oder lasse das Feld leer; PMD erstellt automatisch ein Cover aus den ausgewählten Speisenbildern.', 'selected_foods' => 'Ausgewählte Speisen', 'selected_foods_help' => 'Wähle mindestens zwei Speisen und lege die Menge je Speise fest.',
            'inherited_info' => 'Übernommene Speiseninformationen', 'inherited_info_help' => 'Ernährung, Allergene und Nährwerte werden aus den ausgewählten Speisen berechnet.', 'all_selected_foods' => 'Alle ausgewählten Speisen', 'combo_allergens' => 'Allergene in diesem Combo', 'combo_allergens_help' => 'Vereinigung der Allergene aller ausgewählten Speisen.', 'calculated_nutrition' => 'Berechnete Nährwerte', 'calculated_nutrition_help' => 'Die Summen berücksichtigen die ausgewählten Mengen. Die Zubereitungszeit nutzt die langsamste Speise.',
            'combo_details' => 'Combo-Details', 'combo_details_help' => 'Name, Paketpreis und Beschreibung für Gäste.', 'combo_name' => 'Combo-Name', 'bundle_price' => 'Paketpreis', 'combo_description_placeholder' => 'Kurze Combo-Beschreibung für Gäste', 'cancel' => 'Abbrechen', 'save_food' => 'Speise speichern', 'save_combo' => 'Combo speichern', 'edit_food' => 'Speise bearbeiten', 'edit_combo_title' => 'Combo bearbeiten',
            'saving' => 'Wird gespeichert...', 'saved' => 'Gespeichert', 'save_food_error' => 'Speise konnte nicht gespeichert werden.', 'save_combo_error' => 'Combo konnte nicht gespeichert werden.', 'refresh_error' => 'Gespeichert, aber die Menüseite konnte nicht aktualisiert werden.', 'refresh_incomplete' => 'Die Menü-Aktualisierung ist unvollständig.',
            'delete_food' => 'Speise löschen', 'delete_combo' => 'Combo löschen', 'delete_permanently' => 'Endgültig löschen', 'delete_food_confirm' => 'Diese Speise endgültig löschen? Dies kann nicht rückgängig gemacht werden.', 'delete_combo_confirm' => 'Dieses Combo endgültig löschen? Dies kann nicht rückgängig gemacht werden.', 'deleting' => 'Wird gelöscht...', 'food_deleted' => 'Speise gelöscht', 'combo_deleted' => 'Combo gelöscht', 'delete_food_error' => 'Speise konnte nicht gelöscht werden.', 'delete_combo_error' => 'Combo konnte nicht gelöscht werden.',
            'select_foods_cover' => 'Speisen auswählen, um das Cover zu erstellen', 'combo_cover_preview' => 'Combo-Cover-Vorschau', 'no_declared_allergens' => 'Keine deklarierten Allergene in den ausgewählten Speisen.', 'yes' => 'ja', 'not_confirmed_all' => 'nicht für alle Speisen bestätigt', 'decrease_quantity' => 'Menge verringern', 'increase_quantity' => 'Menge erhöhen', 'quantity' => 'Menge', 'no_categories' => 'Keine aktiven Kategorien sind verfügbar.', 'food_features' => 'Speisenmerkmale', 'food_features_help' => 'Wähle Ernährungsmerkmale und die genauen Allergene, die Gäste sehen sollen.', 'dietary_attributes' => 'Ernährungsmerkmale', 'uncategorized' => 'Nicht kategorisiert', 'serving_example' => 'z. B. 350 g', 'combo_dietary_profile' => 'Ernährungsprofil des Combos', 'no_foods_selected' => 'Keine Speisen ausgewählt.', 'food_number' => 'Speise #'
        ],
    ];
    $pmdT = static function ($key) use ($pmdMenuCopy, $pmdMenuLocale) {
        return $pmdMenuCopy[$pmdMenuLocale][$key] ?? $pmdMenuCopy['en'][$key] ?? $key;
    };
@endphp

<div
    id="pmd-menu-manager-main"
    class="pmd-owner-page pmd-menu-manager"
    data-pmd-menu-manager
    data-pmd-combo-builder="0"
    data-pmd-can-manage-combos="{{ $canManageCombos ? '1' : '0' }}"
    data-pmd-category-context="all"
>
    <header
        id="pmd-r2-clean-header"
        class="pmd-owner-header pmd-dashboard-lab__dashboard2-header pmd-menu-manager__topbar"
        aria-label="{{ $pmdT('menu_header') }}"
        data-pmd-menu-header-v122
    >
        <div class="pmd-owner-header__left">
            <h1 class="pmd-r2-clean-title">Menu</h1>
        </div>

        <div class="pmd-owner-header__actions pmd-r2-clean-actions" data-pmd-menu-header-actions aria-label="{{ $pmdT('menu_actions') }}">
            <button
                type="button"
                class="pmd-dashboard-lab__header-action pmd-menu-header-action pmd-menu-header-action--primary"
                data-pmd-menu-header-primary
                data-pmd-menu-create
                aria-label="{{ $pmdT('create_food') }}"
                title="{{ $pmdT('create_food') }}"
            >
                <svg class="pmd-menu-header-glyph" data-pmd-menu-primary-glyph data-pmd-glyph="create" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5v14"></path><path d="M5 12h14"></path>
                </svg>
                <span class="pmd-menu-header-action__count" data-pmd-combo-selection-count hidden>0</span>
            </button>

            @if($canManageCombos)
                <button
                    type="button"
                    class="pmd-dashboard-lab__header-action pmd-menu-header-action pmd-menu-header-action--secondary"
                    data-pmd-menu-header-secondary
                    data-pmd-combo-build
                    aria-label="{{ $pmdT('create_combo') }}"
                    title="{{ $pmdT('create_combo') }}"
                >
                    <svg class="pmd-menu-header-glyph" data-pmd-menu-secondary-glyph data-pmd-glyph="build" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 7l8-4 8 4-8 4-8-4z"></path><path d="m4 12 8 4 8-4"></path><path d="m4 17 8 4 8-4"></path><path d="M18 3v6"></path><path d="M15 6h6"></path>
                    </svg>
                </button>
            @endif

            <span class="pmd-owner-notif-slot pmd-dashboard-lab__notif-slot" data-pmd-menu-notif-slot aria-label="{{ $pmdT('notifications') }}">
                <span class="pmd-dashboard-lab__notif-fallback" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                </span>
            </span>
        </div>
    </header>

    <section class="pmd-menu-kpis" aria-label="{{ $pmdT('menu_overview') }}">
        <article class="pmd-menu-kpi" data-pmd-menu-kpi="foods">
            <div class="pmd-menu-kpi__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"></path><path d="M8 9h8M8 13h8M8 17h5"></path></svg>
            </div>
            <div class="pmd-menu-kpi__copy">
                <span>{{ $pmdT('menu_items') }}</span><strong data-pmd-stat-total>{{ (int)$stats['total'] }}</strong><small>{{ $pmdT('foods_combos') }}</small>
            </div>
        </article>

        <article class="pmd-menu-kpi" data-pmd-menu-kpi="categories">
            <div class="pmd-menu-kpi__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"></path></svg>
            </div>
            <div class="pmd-menu-kpi__copy">
                <span>{{ $pmdT('categories') }}</span><strong data-pmd-stat-categories>{{ (int)$categoryCount }}</strong><small>{{ $pmdT('enabled_categories') }}</small>
            </div>
        </article>

        <article class="pmd-menu-kpi" data-pmd-menu-kpi="stock-out">
            <div class="pmd-menu-kpi__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path><path d="m9 12 6 6M15 12l-6 6"></path></svg>
            </div>
            <div class="pmd-menu-kpi__copy">
                <span>{{ $pmdT('stock_out') }}</span><strong data-pmd-stat-stockout>{{ (int)$stats['stock_out'] }}</strong><small>{{ $pmdT('unavailable_foods') }}</small>
            </div>
        </article>

        <article class="pmd-menu-kpi" data-pmd-menu-kpi="disabled">
            <div class="pmd-menu-kpi__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M3 3l18 18"></path><path d="M10.6 10.6A2 2 0 0 0 13.4 13.4"></path><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 8 9 8a16.6 16.6 0 0 1-2.1 3.2"></path><path d="M6.6 6.6C4.3 8.2 3 12 3 12s3.5 8 9 8a9.6 9.6 0 0 0 3.4-.6"></path></svg>
            </div>
            <div class="pmd-menu-kpi__copy">
                <span>{{ $pmdT('disabled') }}</span><strong data-pmd-stat-disabled>{{ (int)$disabledCount }}</strong><small>{{ $pmdT('legacy_hidden_items') }}</small>
            </div>
        </article>
    </section>

    <section class="pmd-menu-manager__panel" aria-label="{{ $pmdT('menu_catalogue') }}">
        <div class="pmd-menu-manager__toolbar" data-pmd-food-toolbar>
            <label class="pmd-menu-manager__search">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
                <input type="search" placeholder="{{ $pmdT('search_menu') }}" autocomplete="off" data-pmd-menu-search>
            </label>
            <div class="pmd-menu-manager__toolbar-actions">
                <div class="pmd-menu-manager__stock-filters" aria-label="{{ $pmdT('stock_filter') }}">
                    <button type="button" class="is-active" data-pmd-stock-filter="all">{{ $pmdT('all') }}</button>
                    <button type="button" data-pmd-stock-filter="in">{{ $pmdT('in_stock') }}</button>
                    <button type="button" data-pmd-stock-filter="out">{{ $pmdT('stock_out') }}</button>
                </div>
                <button type="button" class="pmd-menu-manager__sort-toggle" data-pmd-menu-sort-toggle aria-pressed="false" title="{{ $pmdT('sort_title') }}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"></path><path d="M4 5v2M4 11v2M4 17v2"></path></svg>
                    <span data-pmd-menu-sort-label>{{ $pmdT('sort_edit') }}</span>
                </button>
                <span class="pmd-menu-manager__sort-status" data-pmd-menu-sort-status aria-live="polite"></span>
            </div>
        </div>

        <div class="pmd-menu-manager__categories" aria-label="{{ $pmdT('menu_categories') }}" data-pmd-food-categories>
            <button type="button" class="is-active" data-pmd-category-filter="all" data-pmd-category-fixed>{{ $pmdT('all_foods') }}</button>
            @foreach($categories as $category)
                <button
                    type="button"
                    data-pmd-category-filter="{{ (int)$category->category_id }}"
                    data-pmd-category-id="{{ (int)$category->category_id }}"
                    @if($canManageCategories) data-pmd-category-sortable @endif
                >{{ $category->name }}</button>
            @endforeach
            @if($hasCombos)
                <button type="button" data-pmd-category-filter="combos" data-pmd-category-fixed>{{ $pmdT('combos') }}</button>
            @endif
            @if($canManageCategories)
                <button
                    type="button"
                    class="pmd-menu-manager__category-add"
                    data-pmd-category-create
                    aria-label="{{ $pmdT('add_category') }}"
                    title="{{ $pmdT('add_category') }}"
                ><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg></button>
            @endif
        </div>

        <div class="pmd-menu-manager__grid" data-pmd-menu-grid>
            @foreach($cards as $item)
                @php
                    $searchText = mb_strtolower(trim($item['name'].' '.$item['description'].' '.implode(' ', $item['category_names'] ?? []).' '.implode(' ', $item['allergen_names'] ?? [])));
                    $categoryIdsText = implode(',', array_map('intval', $item['category_ids'] ?? []));
                    $categoryExtra = max(0, count($item['category_names'] ?? []) - 1);
                @endphp
                <article
                    class="pmd-menu-card {{ $item['is_stock_out'] ? 'is-stock-out' : '' }} {{ !$item['menu_status'] ? 'is-hidden-menu' : '' }}"
                    data-pmd-menu-card
                    data-item-type="food"
                    data-menu-id="{{ (int)$item['id'] }}"
                    data-category-ids="{{ $categoryIdsText }}"
                    data-stock-out="{{ $item['is_stock_out'] ? '1' : '0' }}"
                    data-published="{{ $item['menu_status'] ? '1' : '0' }}"
                    data-combo-selectable="{{ $item['menu_status'] ? '1' : '0' }}"
                    data-search="{{ e($searchText) }}"
                >
                    <div class="pmd-menu-card__media">
                        <div class="pmd-menu-card__placeholder" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"></path><circle cx="9" cy="10" r="2"></circle><path d="m5 17 4-4 3 3 2-2 5 4"></path></svg>
                        </div>
                        @if(!empty($item['image']))
                            <img
                                src="{{ e($item['image']) }}"
                                alt="{{ e($item['name']) }}"
                                loading="{{ $loop->index < 4 ? 'eager' : 'lazy' }}"
                                decoding="async"
                                @if($loop->index < 4) fetchpriority="high" @endif
                                data-pmd-menu-image
                            >
                        @endif
                        <span class="pmd-menu-card__category">
                            {{ $item['category_name'] === 'Uncategorized' ? $pmdT('uncategorized') : $item['category_name'] }}@if($categoryExtra > 0) <b>+{{ $categoryExtra }}</b>@endif
                        </span>
                        @if(!$item['menu_status'])<span class="pmd-menu-card__visibility">{{ $pmdT('disabled') }}</span>@endif
                        <span class="pmd-menu-card__select-mark" data-pmd-combo-select-mark aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>
                        </span>
                    </div>

                    <div class="pmd-menu-card__body">
                        <div class="pmd-menu-card__title-row">
                            <h2>{{ $item['name'] }}</h2><strong>{{ currency_format($item['price']) }}</strong>
                        </div>

                        @if($item['description'] !== '')
                            <p class="pmd-menu-card__description">{{ $item['description'] }}</p>
                        @else
                            <p class="pmd-menu-card__description is-empty">{{ $pmdT('no_description') }}</p>
                        @endif

                        @if($item['is_halal'] || $item['is_vegetarian'] || $item['is_vegan'] || count($item['allergen_names'] ?? []))
                            <div class="pmd-menu-card__traits" aria-label="Food attributes">
                                @if($item['is_halal'])<span title="{{ $pmdT('halal') }}"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 1 1-9-9z"></path><path d="m17 4 .7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2L17 4z"></path></svg>{{ $pmdT('halal') }}</span>@endif
                                @if($item['is_vegetarian'])<span title="{{ $pmdT('vegetarian') }}"><svg viewBox="0 0 24 24"><path d="M20 4c-8 0-14 3-14 10 0 3 2 6 6 6 7 0 8-10 8-16z"></path><path d="M4 20c3-5 7-8 12-11"></path></svg>{{ $pmdT('vegetarian') }}</span>@endif
                                @if($item['is_vegan'])<span title="{{ $pmdT('vegan') }}"><svg viewBox="0 0 24 24"><path d="M12 21V10"></path><path d="M12 14c-5 0-8-3-8-8 5 0 8 3 8 8z"></path><path d="M12 11c0-5 3-8 8-8 0 5-3 8-8 8z"></path></svg>{{ $pmdT('vegan') }}</span>@endif
                                @if(count($item['allergen_names'] ?? []))<span class="is-allergen" title="{{ e(implode(', ', $item['allergen_names'])) }}"><svg viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3z"></path><path d="M12 9v4M12 17h.01"></path></svg>{{ count($item['allergen_names']) }} allergen{{ count($item['allergen_names']) === 1 ? '' : 's' }}</span>@endif
                            </div>
                        @endif

                        <div class="pmd-menu-card__availability">
                            <span class="pmd-menu-card__stock-state" data-pmd-stock-state><i></i><span>{{ $item['is_stock_out'] ? $pmdT('stock_out') : $pmdT('in_stock') }}</span></span>
                        </div>

                        <div class="pmd-menu-card__actions">
                            <button type="button" class="pmd-menu-card__stock-btn" data-pmd-menu-stock data-menu-id="{{ (int)$item['id'] }}">{{ $item['is_stock_out'] ? $pmdT('stock_in') : $pmdT('stock_out') }}</button>
                            <button type="button" class="pmd-menu-card__edit-btn" data-pmd-menu-edit="{{ (int)$item['id'] }}">{{ $pmdT('edit') }}</button>
                        </div>
                    </div>
                </article>
            @endforeach

            @foreach($combos as $combo)
                @php
                    $comboSearch = mb_strtolower(trim($combo['name'].' '.$combo['description'].' '.implode(' ', array_column($combo['items'] ?? [], 'name')).' '.implode(' ', $combo['allergen_names'] ?? []).' combos'));
                    $comboImages = array_values(array_filter($combo['images'] ?? []));
                    $comboCustomImage = trim((string)($combo['image'] ?? ''));
                @endphp
                <article
                    class="pmd-menu-card pmd-menu-card--combo {{ !$combo['combo_status'] ? 'is-hidden-menu' : '' }}"
                    data-pmd-menu-card
                    data-item-type="combo"
                    data-combo-id="{{ (int)$combo['id'] }}"
                    data-category-ids="combos"
                    data-stock-out="0"
                    data-published="{{ $combo['combo_status'] ? '1' : '0' }}"
                    data-combo-selectable="0"
                    data-search="{{ e($comboSearch) }}"
                >
                    <div class="pmd-menu-card__media {{ count($comboImages) ? 'has-image' : '' }}">
                        <div class="pmd-menu-card__placeholder pmd-menu-card__placeholder--combo" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M4 7l8-4 8 4-8 4-8-4z"></path><path d="m4 12 8 4 8-4"></path><path d="m4 17 8 4 8-4"></path></svg>
                        </div>
                        @if($comboCustomImage !== '')
                            <img src="{{ e($comboCustomImage) }}" alt="{{ e($combo['name']) }}" loading="lazy" decoding="async" data-pmd-menu-image>
                        @elseif(count($comboImages))
                            <div class="pmd-menu-card__combo-mosaic pmd-menu-card__combo-mosaic--{{ min(4, count($comboImages)) }}" aria-hidden="true">
                                @foreach(array_slice($comboImages, 0, 4) as $comboImage)
                                    <img src="{{ e($comboImage) }}" alt="" loading="lazy" decoding="async">
                                @endforeach
                            </div>
                        @endif
                        <span class="pmd-menu-card__category">{{ $pmdT('combos') }}</span>
                        @if(!$combo['combo_status'])<span class="pmd-menu-card__visibility">{{ $pmdT('disabled') }}</span>@endif
                    </div>

                    <div class="pmd-menu-card__body">
                        <div class="pmd-menu-card__title-row">
                            <h2>{{ $combo['name'] }}</h2><strong>{{ currency_format($combo['price']) }}</strong>
                        </div>

                        @if($combo['description'] !== '')
                            <p class="pmd-menu-card__description">{{ $combo['description'] }}</p>
                        @else
                            <p class="pmd-menu-card__description is-empty">{{ $pmdT('no_description') }}</p>
                        @endif

                        <div class="pmd-menu-card__combo-items" aria-label="{{ $pmdT('combo_foods') }}">
                            @foreach(array_slice($combo['items'] ?? [], 0, 4) as $comboItem)
                                <span>{{ ($comboItem['quantity'] ?? 1) > 1 ? (int)$comboItem['quantity'].'x ' : '' }}{{ $comboItem['name'] }}</span>
                            @endforeach
                            @if(count($combo['items'] ?? []) > 4)<span>+{{ count($combo['items']) - 4 }} {{ $pmdT('more') }}</span>@endif
                        </div>

                        @if($combo['is_halal'] || $combo['is_vegetarian'] || $combo['is_vegan'] || count($combo['allergen_names'] ?? []))
                            <div class="pmd-menu-card__traits" aria-label="{{ $pmdT('combo_attrs') }}">
                                @if($combo['is_halal'])<span title="{{ $pmdT('all_foods_halal') }}"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 1 1-9-9z"></path><path d="m17 4 .7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2L17 4z"></path></svg>{{ $pmdT('halal') }}</span>@endif
                                @if($combo['is_vegetarian'])<span title="{{ $pmdT('all_foods_vegetarian') }}"><svg viewBox="0 0 24 24"><path d="M20 4c-8 0-14 3-14 10 0 3 2 6 6 6 7 0 8-10 8-16z"></path><path d="M4 20c3-5 7-8 12-11"></path></svg>{{ $pmdT('vegetarian') }}</span>@endif
                                @if($combo['is_vegan'])<span title="{{ $pmdT('all_foods_vegan') }}"><svg viewBox="0 0 24 24"><path d="M12 21V10"></path><path d="M12 14c-5 0-8-3-8-8 5 0 8 3 8 8z"></path><path d="M12 11c0-5 3-8 8-8 0 5-3 8-8 8z"></path></svg>{{ $pmdT('vegan') }}</span>@endif
                                @if(count($combo['allergen_names'] ?? []))<span class="is-allergen" title="{{ e(implode(', ', $combo['allergen_names'])) }}"><svg viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3z"></path><path d="M12 9v4M12 17h.01"></path></svg>{{ count($combo['allergen_names']) }} {{ count($combo['allergen_names']) === 1 ? $pmdT('allergen_singular') : $pmdT('allergen_plural') }}</span>@endif
                            </div>
                        @endif

                        <div class="pmd-menu-card__availability">
                            <span class="pmd-menu-card__combo-count"><i></i><span>{{ (int)$combo['item_count'] }} {{ $pmdT('items') }}</span></span>
                        </div>

                        <div class="pmd-menu-card__actions pmd-menu-card__actions--combo">
                            <button type="button" class="pmd-menu-card__edit-btn pmd-menu-card__edit-btn--wide" data-pmd-combo-edit="{{ (int)$combo['id'] }}">{{ $pmdT('edit_combo') }}</button>
                        </div>
                    </div>
                </article>
            @endforeach

            @if($totalCatalogueCards === 0)
                <div class="pmd-menu-manager__empty" data-pmd-menu-empty>
                    <div class="pmd-menu-manager__empty-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"></path><path d="M8 8h8M8 12h8M8 16h5"></path></svg></div>
                    <h2>{{ $pmdT('no_foods_yet') }}</h2><p>{{ $pmdT('create_first_food') }}</p><button type="button" data-pmd-menu-create>{{ $pmdT('create_food') }}</button>
                </div>
            @endif
        </div>

        <div class="pmd-menu-manager__no-results" data-pmd-menu-no-results hidden>{{ $pmdT('no_results') }}</div>
    </section>
</div>

<script type="application/json" id="pmd-menu-manager-i18n">{!! json_encode($pmdMenuCopy[$pmdMenuLocale], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
<script type="application/json" id="pmd-menu-manager-catalog">{!! json_encode($pmdMenuManagerCatalog ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
<script type="application/json" id="pmd-menu-manager-combo-catalog">{!! json_encode($pmdMenuManagerComboCatalog ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>

@include('pmdmenus/_modal_host')
