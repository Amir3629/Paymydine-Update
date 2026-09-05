@php
    $state = $pmdQuickSetupStatus ?? [];
    $types = $pmdQuickSetupRestaurantTypes ?? [];
    $completed = ($state['status'] ?? '') === 'completed';
    $eligible = !empty($state['eligible']);
@endphp

<div id="pmd-tenant-quick-setup" class="pmd-quick-setup" data-pmd-quick-setup>
    <header class="pmd-quick-setup__header">
        <div>
            <span class="pmd-quick-setup__eyebrow">PayMyDine</span>
            <h1>Quick Setup</h1>
            <p>Prepare the restaurant basics now. Everything stays editable afterwards.</p>
        </div>
        <a class="pmd-quick-setup__back" href="{{ admin_url('dashboardlab') }}">Back to dashboard</a>
    </header>

    @if($completed)
        <section class="pmd-quick-setup__done">
            <span class="pmd-quick-setup__done-icon">✓</span>
            <h2>Your restaurant setup is ready.</h2>
            <p>Continue with the dashboard, Menu, Team or Devices whenever you want to refine the defaults.</p>
            <div class="pmd-quick-setup__done-actions">
                <a href="{{ admin_url('dashboardlab') }}">Open dashboard</a>
                <a href="{{ admin_url('pmdmenus') }}">Review menu</a>
                <a href="{{ admin_url('pmdteam') }}">Review team</a>
                @if(!empty($state['starter_menu']))
                    <button type="button" data-pmd-refresh-starter-photos>Refresh premium starter photos</button>
                @endif
            </div>
            @if(!empty($state['starter_menu']))
                <div class="pmd-quick-setup__photo-status" data-pmd-starter-photo-status aria-live="polite"></div>
            @endif
        </section>
    @elseif(!$eligible)
        <section class="pmd-quick-setup__done is-warning">
            <h2>Quick Setup is no longer available automatically.</h2>
            <p>This restaurant already has Menu or Category content. Quick Setup will not overwrite real restaurant data.</p>
            <div class="pmd-quick-setup__done-actions">
                <a href="{{ admin_url('dashboardlab') }}">Open dashboard</a>
                <a href="{{ admin_url('pmdmenus') }}">Open menu</a>
            </div>
        </section>
    @else
        <form class="pmd-quick-setup__form" data-pmd-quick-setup-form novalidate>
            <section class="pmd-quick-setup__card">
                <div class="pmd-quick-setup__step">1</div>
                <div class="pmd-quick-setup__card-copy">
                    <h2>Restaurant type</h2>
                    <p>We use this only to choose a suitable starting theme and, if you want it, a matching sample menu.</p>
                </div>
                <div class="pmd-quick-setup__type-grid">
                    @foreach($types as $key => $type)
                        <label class="pmd-quick-setup__type">
                            <input type="radio" name="restaurant_type" value="{{ $key }}" {{ $loop->first ? 'checked' : '' }}>
                            <span>
                                <strong>{{ $type['label'] }}</strong>
                                <small>{{ str_replace('_', ' ', ucfirst($type['theme'])) }}</small>
                            </span>
                        </label>
                    @endforeach
                </div>
            </section>

            <section class="pmd-quick-setup__card">
                <div class="pmd-quick-setup__step">2</div>
                <div class="pmd-quick-setup__card-copy">
                    <h2>Restaurant basics</h2>
                    <p>Tell us only what you need now. Names and credentials can be edited later.</p>
                </div>

                <div class="pmd-quick-setup__subsection">
                    <div class="pmd-quick-setup__subhead">
                        <div>
                            <strong>Floors & tables</strong>
                            <small>Start with the real guest areas. System tables are never deleted.</small>
                        </div>
                        <button type="button" data-pmd-add-floor>Add floor</button>
                    </div>
                    <div class="pmd-quick-setup__rows" data-pmd-floor-rows>
                        <div class="pmd-quick-setup__row" data-pmd-floor-row>
                            <label><span>Floor name</span><input type="text" data-pmd-floor-name value="Main Floor" maxlength="80"></label>
                            <label class="is-small"><span>Tables</span><input type="number" data-pmd-floor-tables value="10" min="1" max="60"></label>
                            <button type="button" class="pmd-quick-setup__remove" data-pmd-remove-row aria-label="Remove floor">×</button>
                        </div>
                    </div>
                </div>

                <div class="pmd-quick-setup__subsection">
                    <div class="pmd-quick-setup__subhead">
                        <div>
                            <strong>Team</strong>
                            <small>Placeholder staff are created with the correct PayMyDine roles. Temporary passwords are shown once after setup.</small>
                        </div>
                    </div>
                    <div class="pmd-quick-setup__staff-grid">
                        @foreach([
                            'manager' => ['Manager', 1],
                            'waiter' => ['Waiters', 3],
                            'cashier' => ['Cashiers', 1],
                            'reservations' => ['Reservations', 1],
                            'accountant' => ['Accountants', 0],
                        ] as $key => $config)
                            <label>
                                <span>{{ $config[0] }}</span>
                                <input type="number" min="0" max="30" value="{{ $config[1] }}" data-pmd-staff-count="{{ $key }}">
                            </label>
                        @endforeach
                    </div>
                </div>

                <div class="pmd-quick-setup__subsection">
                    <div class="pmd-quick-setup__subhead">
                        <div>
                            <strong>Kitchen displays</strong>
                            <small>Add the KDS stations you actually plan to use.</small>
                        </div>
                        <button type="button" data-pmd-add-kds>Add KDS</button>
                    </div>
                    <div class="pmd-quick-setup__rows" data-pmd-kds-rows>
                        <div class="pmd-quick-setup__row" data-pmd-kds-row>
                            <label><span>Station name</span><input type="text" data-pmd-kds-name value="Main Kitchen" maxlength="128"></label>
                            <button type="button" class="pmd-quick-setup__remove" data-pmd-remove-row aria-label="Remove KDS">×</button>
                        </div>
                    </div>
                </div>
            </section>

            <section class="pmd-quick-setup__card">
                <div class="pmd-quick-setup__step">3</div>
                <div class="pmd-quick-setup__card-copy">
                    <h2>Starter menu</h2>
                    <p>Optional. We can add a small editable sample menu based on the restaurant type you selected.</p>
                </div>
                <label class="pmd-quick-setup__starter-toggle">
                    <input type="checkbox" data-pmd-starter-menu checked>
                    <span>
                        <strong>Create a sample starter menu</strong>
                        <small>Includes categories, item descriptions, suggested prices, curated starter photos, nutrition and allergen suggestions. Review these against your real recipes before publishing.</small>
                    </span>
                </label>
                <small class="pmd-quick-setup__photo-credit">Starter photos are sourced through Pexels and saved locally as optimized WebP files.</small>
            </section>

            <div class="pmd-quick-setup__submit-row">
                <div class="pmd-quick-setup__status" data-pmd-quick-setup-status aria-live="polite"></div>
                <button type="submit" class="pmd-quick-setup__submit" data-pmd-quick-setup-submit>Prepare my restaurant</button>
            </div>
        </form>

        <section class="pmd-quick-setup__result" data-pmd-quick-setup-result hidden></section>
    @endif
</div>
