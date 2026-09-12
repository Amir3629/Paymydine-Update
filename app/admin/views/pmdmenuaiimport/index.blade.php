@php
    $categories = $pmdAiImportCategories ?? [];
    $existingItems = $pmdAiImportExistingItems ?? [];
    $canCreateCategories = !empty($pmdAiImportCanCreateCategories);
    $canImportTables = !empty($pmdAiImportCanImportTables);
    $aiEnabled = !empty($pmdAiImportEnabled);
    $jsonFlags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;
@endphp

<div class="pmd-ai-import" data-pmd-ai-import
     data-can-create-categories="{{ $canCreateCategories ? '1' : '0' }}"
     data-can-import-tables="{{ $canImportTables ? '1' : '0' }}"
     data-ai-enabled="{{ $aiEnabled ? '1' : '0' }}">
    <header class="pmd-ai-import__header">
        <div>
            <span class="pmd-ai-import__eyebrow">PayMyDine AI</span>
            <h1>Import menu with AI</h1>
            <p>Upload your current menu image, screenshot or PDF. PayMyDine reads it, prepares a draft and lets you review everything before saving.</p>
        </div>
        <a href="{{ admin_url('pmdmenus') }}" class="pmd-ai-import__back">Back to Menu</a>
    </header>

    @if(!$aiEnabled)
        <section class="pmd-ai-import__notice is-warning">
            <strong>AI import is currently disabled for this server.</strong>
            <span>You can continue managing the Menu manually.</span>
        </section>
    @endif

    <section class="pmd-ai-import__card" data-pmd-ai-import-upload>
        <div class="pmd-ai-import__step">1</div>
        <div class="pmd-ai-import__card-copy">
            <h2>Upload your menu</h2>
            <p>Choose one or more menu images, screenshots or PDFs. These files are used only to read menu data and are never saved as food photos.</p>
        </div>

        <div class="pmd-ai-import__upload-grid">
            <label class="pmd-ai-import__drop">
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple data-pmd-ai-menu-sources>
                <span class="pmd-ai-import__drop-icon">↑</span>
                <strong>Choose menu image or PDF</strong>
                <small>JPG, PNG, WEBP or PDF · up to 12 files</small>
                <span data-pmd-ai-menu-source-label>No files selected</span>
            </label>
        </div>

        <div class="pmd-ai-import__safety">
            <strong>Food photos:</strong>
            <span>This importer does not attach menu screenshots to foods. Imported foods without a real food image use the normal PayMyDine logo.</span>
        </div>

        <div class="pmd-ai-import__actions">
            <span class="pmd-ai-import__status" data-pmd-ai-import-status aria-live="polite"></span>
            <button type="button" class="pmd-ai-import__primary" data-pmd-ai-analyse {{ $aiEnabled ? '' : 'disabled' }}>Read with AI</button>
        </div>
    </section>

    <section class="pmd-ai-import__card" data-pmd-ai-import-review hidden>
        <div class="pmd-ai-import__step">2</div>
        <div class="pmd-ai-import__card-copy">
            <h2>Review what AI found</h2>
            <p>Edit anything that is wrong. Only checked rows will be imported.</p>
        </div>

        <div class="pmd-ai-import__summary" data-pmd-ai-import-summary></div>

        <div class="pmd-ai-import__section-head">
            <div><h3>Menu items</h3><p>Names, categories, prices and visible descriptions from your files.</p></div>
            <label class="pmd-ai-import__select-all"><input type="checkbox" checked data-pmd-ai-select-all> Select all valid</label>
        </div>
        <div class="pmd-ai-import__table-wrap">
            <table class="pmd-ai-import__table">
                <thead><tr><th>Import</th><th>Category</th><th>Item</th><th>Price</th><th>Description</th><th>Review</th></tr></thead>
                <tbody data-pmd-ai-items></tbody>
            </table>
        </div>

        <section class="pmd-ai-import__floors" data-pmd-ai-floors-section hidden>
            <div class="pmd-ai-import__section-head">
                <div><h3>Floor & table structure</h3><p>Shown only when an uploaded old-system screenshot explicitly contained this information.</p></div>
            </div>
            <div data-pmd-ai-floors></div>
            @if(!$canImportTables)
                <p class="pmd-ai-import__permission-note">Your account may import Menu items, but Floor/Table changes require restaurant Settings permission.</p>
            @endif
        </section>

        <div class="pmd-ai-import__actions">
            <button type="button" class="pmd-ai-import__secondary" data-pmd-ai-start-over>Start over</button>
            <span class="pmd-ai-import__status" data-pmd-ai-import-review-status aria-live="polite"></span>
            <button type="button" class="pmd-ai-import__primary" data-pmd-ai-import-confirm>Import selected items</button>
        </div>
    </section>

    <section class="pmd-ai-import__card pmd-ai-import__done" data-pmd-ai-import-done hidden>
        <div class="pmd-ai-import__done-mark">✓</div>
        <h2>Import completed</h2>
        <p data-pmd-ai-import-result></p>
        <div class="pmd-ai-import__done-actions">
            <a href="{{ admin_url('pmdmenus') }}">Review Menu</a>
            <a href="{{ admin_url('dashboardlab') }}">Open Dashboard</a>
        </div>
    </section>

    <script type="application/json" id="pmd-ai-import-categories">{!! json_encode($categories, $jsonFlags) !!}</script>
    <script type="application/json" id="pmd-ai-import-existing-items">{!! json_encode($existingItems, $jsonFlags) !!}</script>
</div>
