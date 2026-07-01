# PMD Admin Universal Page Specs v1

> Planning-only. No production Blade/CSS/JS, database, payment, or backend logic changes are included in this deliverable.

## Scope and evidence

- Source review used existing admin controllers and model config files for the target pages.
- Reference list page: `/admin/kds_stations`.
- Reference create/edit page: `/admin/kds_stations/create`.
- KPIs that are not already available through current models/list config are marked in the JSON as needing backend support or safe exposure.

## Existing blocking errors / verification blockers

- **environment**: php artisan route:list cannot run in this workspace because setup/foundation files are missing; runtime route 500/asset verification must be performed on VPS with Playwright. Status: `blocked locally`.
- **asset-risk**: Static references exist to PMD mediafix vendor assets and pmd-waiter JS that should be checked by Playwright network-failure capture on production. Status: `needs VPS verification`.

## Universal list-page pattern

- Header: page title on the left; existing create/secondary actions on the right.
- KPI row: four read-only cards using safe aggregates only. Use fallback values until backend support exists.
- Main card: existing search/filter/list widget inside one content card; preserve pagination, row actions, and permissions.
- Legacy in-page titles/heroes/actions: move into the universal header only during a later implementation task after visual QA; do not remove first.

## Universal create/edit-page pattern

- Header actions: Back, Save, and Delete only on edit pages where the existing toolbar already supports delete.
- Body: section cards derived from current form config/tabs/partials.
- Preview/sidebar: only when existing media/status/summary data is already available; otherwise omit or show safe placeholder.

## Orders — `/admin/orders`

### List page

- **Page title:** Orders
- **Top header actions:** New/Create when existing toolbar supports it, Secondary page-specific action where existing toolbar supports it, Bulk/status/delete only if already present; otherwise do not add
- **Recommended KPI cards:**
  - `fa-calendar-day` **Today orders** — source: orders created today; fallback: `0`; meaning: Daily order volume; support: needs backend support or existing setting lookup.
  - `fa-hourglass-half` **Open orders** — source: orders not completed/paid/canceled; fallback: `0`; meaning: Operational workload; support: needs backend support or existing setting lookup.
  - `fa-euro-sign` **Revenue today** — source: sum order_total for today paid/completed orders; fallback: `€0.00`; meaning: Daily gross sales; support: available via model/query if safely exposed.
  - `fa-triangle-exclamation` **Attention needed** — source: failed/overdue/canceled/rejected orders; fallback: `0`; meaning: Exceptions needing review; support: needs backend support or existing setting lookup.
- **Main content card structure:**
  - Single universal content card containing search/filter controls and existing list/table area
  - Preserve existing list widget behavior and row actions
  - Mobile may switch table rows to cards in future implementation only after visual QA
- **Search:** Use existing searchable columns only; do not add backend search now.
- **Filters:** Expose existing filter scopes only.
- **Table:** Preserve current columns, row actions, pagination, bulk behavior, and permissions.
- **Mobile cards:** Mobile card representation may mirror table columns but must remain read-only until implemented safely.
- **Old elements to hide or move later:**
  - Move old in-page title into universal header when implementation begins
  - Move existing toolbar buttons into universal top header when safe
  - Do not hide legacy actions until replacement actions are verified
- **Risks:**
  - Status calculations may vary by installation status ids
  - Revenue card may need backend support if totals/status filters are not already exposed safely

### Create/edit pages

- **Paths:** /admin/orders/create, /admin/orders/edit/{id}
- **Header actions:** Back, Save, Delete on edit only when existing form toolbar supports delete
- **Section cards needed:**
  - `fa-circle-info` **Order info** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Customer** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Restaurant/location** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Menus/items** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Status history** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Payment logs** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Notes** — Use existing form config fields belonging to this section/tab.
- **Preview/sidebar:** Use only if existing media/status/summary data is already available; otherwise omit or show safe placeholder.
- **Risks:**
  - Status calculations may vary by installation status ids
  - Revenue card may need backend support if totals/status filters are not already exposed safely

## Reservations — `/admin/reservations`

### List page

- **Page title:** Reservations
- **Top header actions:** New/Create when existing toolbar supports it, Secondary page-specific action where existing toolbar supports it, Bulk/status/delete only if already present; otherwise do not add
- **Recommended KPI cards:**
  - `fa-calendar-day` **Today reservations** — source: reservations for today; fallback: `0`; meaning: Expected covers today; support: needs backend support or existing setting lookup.
  - `fa-users` **Guests today** — source: sum guest_num for today; fallback: `0`; meaning: Expected guest load; support: available via model/query if safely exposed.
  - `fa-clock` **Pending/active** — source: reservations not completed/canceled; fallback: `0`; meaning: Reservations requiring action; support: needs backend support or existing setting lookup.
  - `fa-chair` **Assigned tables** — source: reservations with table relation; fallback: `0`; meaning: Table planning readiness; support: needs backend support or existing setting lookup.
- **Main content card structure:**
  - Single universal content card containing search/filter controls and existing list/table area
  - Preserve existing list widget behavior and row actions
  - Mobile may switch table rows to cards in future implementation only after visual QA
- **Search:** Use existing searchable columns only; do not add backend search now.
- **Filters:** Expose existing filter scopes only.
- **Table:** Preserve current columns, row actions, pagination, bulk behavior, and permissions.
- **Mobile cards:** Mobile card representation may mirror table columns but must remain read-only until implemented safely.
- **Old elements to hide or move later:**
  - Move old in-page title into universal header when implementation begins
  - Move existing toolbar buttons into universal top header when safe
  - Do not hide legacy actions until replacement actions are verified
- **Risks:**
  - Calendar/list dual mode must not lose existing switch action
  - Guest sum needs backend support if not exposed

### Create/edit pages

- **Paths:** /admin/reservations/create, /admin/reservations/edit/{id}
- **Header actions:** Back, Save, Delete on edit only when existing form toolbar supports delete
- **Section cards needed:**
  - `fa-circle-info` **Reservation details** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Guest contact** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Restaurant/location** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Status history** — Use existing form config fields belonging to this section/tab.
- **Preview/sidebar:** Use only if existing media/status/summary data is already available; otherwise omit or show safe placeholder.
- **Risks:**
  - Calendar/list dual mode must not lose existing switch action
  - Guest sum needs backend support if not exposed

## Locations — `/admin/locations`

### List page

- **Page title:** Locations
- **Top header actions:** New/Create when existing toolbar supports it, Secondary page-specific action where existing toolbar supports it, Bulk/status/delete only if already present; otherwise do not add
- **Recommended KPI cards:**
  - `fa-store` **Total locations** — source: count locations; fallback: `0`; meaning: Location coverage; support: available via model/query if safely exposed.
  - `fa-toggle-on` **Enabled** — source: count where status enabled; fallback: `0`; meaning: Active service locations; support: available via model/query if safely exposed.
  - `fa-address-book` **Missing contact** — source: locations missing email or telephone; fallback: `0`; meaning: Operational setup gaps; support: needs backend support or existing setting lookup.
  - `fa-map-location-dot` **Needs geo review** — source: locations missing lat/lng or auto geocode disabled; fallback: `0`; meaning: Map/delivery readiness; support: needs backend support or existing setting lookup.
- **Main content card structure:**
  - Single universal content card containing search/filter controls and existing list/table area
  - Preserve existing list widget behavior and row actions
  - Mobile may switch table rows to cards in future implementation only after visual QA
- **Search:** Use existing searchable columns only; do not add backend search now.
- **Filters:** Expose existing filter scopes only.
- **Table:** Preserve current columns, row actions, pagination, bulk behavior, and permissions.
- **Mobile cards:** Mobile card representation may mirror table columns but must remain read-only until implemented safely.
- **Old elements to hide or move later:**
  - Move old in-page title into universal header when implementation begins
  - Move existing toolbar buttons into universal top header when safe
  - Do not hide legacy actions until replacement actions are verified
- **Risks:**
  - Single-location installs may have only one record
  - Geo KPI needs backend support if not exposed

### Create/edit pages

- **Paths:** /admin/locations/create, /admin/locations/edit/{id}
- **Header actions:** Back, Save, Delete on edit only when existing form toolbar supports delete
- **Section cards needed:**
  - `fa-circle-info` **Identity** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Contact** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Address** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Map/geocode** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Schedule** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Delivery area** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Gallery** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Options** — Use existing form config fields belonging to this section/tab.
- **Preview/sidebar:** Use only if existing media/status/summary data is already available; otherwise omit or show safe placeholder.
- **Risks:**
  - Single-location installs may have only one record
  - Geo KPI needs backend support if not exposed

## Categories — `/admin/categories`

### List page

- **Page title:** Categories
- **Top header actions:** New/Create when existing toolbar supports it, Secondary page-specific action where existing toolbar supports it, Bulk/status/delete only if already present; otherwise do not add
- **Recommended KPI cards:**
  - `fa-layer-group` **Total categories** — source: count categories; fallback: `0`; meaning: Menu organization size; support: available via model/query if safely exposed.
  - `fa-toggle-on` **Enabled** — source: count categories status enabled; fallback: `0`; meaning: Visible taxonomy; support: available via model/query if safely exposed.
  - `fa-eye-slash` **Hidden from frontend** — source: count frontend_visible false; fallback: `0`; meaning: Customer visibility exceptions; support: available via model/query if safely exposed.
  - `fa-image` **Needs image** — source: count missing image; fallback: `0`; meaning: Merchandising gaps; support: available via model/query if safely exposed.
- **Main content card structure:**
  - Single universal content card containing search/filter controls and existing list/table area
  - Preserve existing list widget behavior and row actions
  - Mobile may switch table rows to cards in future implementation only after visual QA
- **Search:** Use existing searchable columns only; do not add backend search now.
- **Filters:** Expose existing filter scopes only.
- **Table:** Preserve current columns, row actions, pagination, bulk behavior, and permissions.
- **Mobile cards:** Mobile card representation may mirror table columns but must remain read-only until implemented safely.
- **Old elements to hide or move later:**
  - Move old in-page title into universal header when implementation begins
  - Move existing toolbar buttons into universal top header when safe
  - Do not hide legacy actions until replacement actions are verified
- **Risks:**
  - Frontend visibility exists in form but KPI needs backend aggregate
  - Parent field may be numeric relation depending current config

### Create/edit pages

- **Paths:** /admin/categories/create, /admin/categories/edit/{id}
- **Header actions:** Back, Save, Delete on edit only when existing form toolbar supports delete
- **Section cards needed:**
  - `fa-circle-info` **Basics** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Hierarchy & sorting** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Visibility** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Media** — Use existing form config fields belonging to this section/tab.
- **Preview/sidebar:** Use only if existing media/status/summary data is already available; otherwise omit or show safe placeholder.
- **Risks:**
  - Frontend visibility exists in form but KPI needs backend aggregate
  - Parent field may be numeric relation depending current config

## Mealtimes — `/admin/mealtimes`

### List page

- **Page title:** Mealtimes
- **Top header actions:** New/Create when existing toolbar supports it, Secondary page-specific action where existing toolbar supports it, Bulk/status/delete only if already present; otherwise do not add
- **Recommended KPI cards:**
  - `fa-clock` **Total mealtimes** — source: count mealtimes; fallback: `0`; meaning: Configured service windows; support: available via model/query if safely exposed.
  - `fa-toggle-on` **Enabled** — source: count enabled mealtimes; fallback: `0`; meaning: Active windows; support: available via model/query if safely exposed.
  - `fa-location-dot` **Locations covered** — source: distinct locations relation count; fallback: `0`; meaning: Coverage by restaurant; support: available via model/query if safely exposed.
  - `fa-triangle-exclamation` **Overlaps to review** — source: overlapping time windows; fallback: `0`; meaning: Scheduling conflict risk; support: needs backend support or existing setting lookup.
- **Main content card structure:**
  - Single universal content card containing search/filter controls and existing list/table area
  - Preserve existing list widget behavior and row actions
  - Mobile may switch table rows to cards in future implementation only after visual QA
- **Search:** Use existing searchable columns only; do not add backend search now.
- **Filters:** Expose existing filter scopes only.
- **Table:** Preserve current columns, row actions, pagination, bulk behavior, and permissions.
- **Mobile cards:** Mobile card representation may mirror table columns but must remain read-only until implemented safely.
- **Old elements to hide or move later:**
  - Move old in-page title into universal header when implementation begins
  - Move existing toolbar buttons into universal top header when safe
  - Do not hide legacy actions until replacement actions are verified
- **Risks:**
  - Overlap KPI needs backend support
  - Relation-based location counts may need eager aggregate

### Create/edit pages

- **Paths:** /admin/mealtimes/create, /admin/mealtimes/edit/{id}
- **Header actions:** Back, Save, Delete on edit only when existing form toolbar supports delete
- **Section cards needed:**
  - `fa-circle-info` **Basics** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Schedule window** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Location assignment** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Status** — Use existing form config fields belonging to this section/tab.
- **Preview/sidebar:** Use only if existing media/status/summary data is already available; otherwise omit or show safe placeholder.
- **Risks:**
  - Overlap KPI needs backend support
  - Relation-based location counts may need eager aggregate

## Tables — `/admin/tables`

### List page

- **Page title:** Tables
- **Top header actions:** New/Create when existing toolbar supports it, Secondary page-specific action where existing toolbar supports it, Bulk/status/delete only if already present; otherwise do not add
- **Recommended KPI cards:**
  - `fa-chair` **Total tables** — source: count tables; fallback: `0`; meaning: Floor capacity objects; support: available via model/query if safely exposed.
  - `fa-toggle-on` **Enabled/available** — source: count table_status enabled/free; fallback: `0`; meaning: Usable tables; support: available via model/query if safely exposed.
  - `fa-users` **Total capacity** — source: sum min/max capacity where available; fallback: `0`; meaning: Seating capacity; support: available via model/query if safely exposed.
  - `fa-cash-register` **POS linked** — source: tables with pos_table_label/table_no; fallback: `0`; meaning: POS sync coverage; support: needs backend support or existing setting lookup.
- **Main content card structure:**
  - Single universal content card containing search/filter controls and existing list/table area
  - Preserve existing list widget behavior and row actions
  - Mobile may switch table rows to cards in future implementation only after visual QA
- **Search:** Use existing searchable columns only; do not add backend search now.
- **Filters:** Expose existing filter scopes only.
- **Table:** Preserve current columns, row actions, pagination, bulk behavior, and permissions.
- **Mobile cards:** Mobile card representation may mirror table columns but must remain read-only until implemented safely.
- **Old elements to hide or move later:**
  - Move old in-page title into universal header when implementation begins
  - Move existing toolbar buttons into universal top header when safe
  - Do not hide legacy actions until replacement actions are verified
- **Risks:**
  - Capacity fields are PMD extensions; confirm columns before aggregate
  - Existing controller mutates field labels/options dynamically

### Create/edit pages

- **Paths:** /admin/tables/create, /admin/tables/edit/{id}
- **Header actions:** Back, Save, Delete on edit only when existing form toolbar supports delete
- **Section cards needed:**
  - `fa-circle-info` **Identity** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Capacity** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Location/POS mapping** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Join/priority options** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Status** — Use existing form config fields belonging to this section/tab.
- **Preview/sidebar:** Use only if existing media/status/summary data is already available; otherwise omit or show safe placeholder.
- **Risks:**
  - Capacity fields are PMD extensions; confirm columns before aggregate
  - Existing controller mutates field labels/options dynamically

## Themes — `/admin/themes`

### List page

- **Page title:** Themes
- **Top header actions:** New/Create when existing toolbar supports it, Secondary page-specific action where existing toolbar supports it, Bulk/status/delete only if already present; otherwise do not add
- **Recommended KPI cards:**
  - `fa-palette` **Installed themes** — source: count theme records; fallback: `0`; meaning: Available storefront themes; support: available via model/query if safely exposed.
  - `fa-star` **Active theme** — source: current default/active theme; fallback: `—`; meaning: Live customer theme; support: needs backend support or existing setting lookup.
  - `fa-code-branch` **Child themes** — source: themes marked child; fallback: `0`; meaning: Customization footprint; support: needs backend support or existing setting lookup.
  - `fa-image` **Missing assets** — source: themes missing screenshot/assets; fallback: `0`; meaning: Theme health risks; support: needs backend support or existing setting lookup.
- **Main content card structure:**
  - Single universal content card containing search/filter controls and existing list/table area
  - Preserve existing list widget behavior and row actions
  - Mobile may switch table rows to cards in future implementation only after visual QA
- **Search:** Use existing searchable columns only; do not add backend search now.
- **Filters:** Expose existing filter scopes only.
- **Table:** Preserve current columns, row actions, pagination, bulk behavior, and permissions.
- **Mobile cards:** Mobile card representation may mirror table columns but must remain read-only until implemented safely.
- **Old elements to hide or move later:**
  - Move old in-page title into universal header when implementation begins
  - Move existing toolbar buttons into universal top header when safe
  - Do not hide legacy actions until replacement actions are verified
- **Risks:**
  - Theme controller is under system namespace
  - Source editor can be risky; implementation should avoid behavior changes

### Create/edit pages

- **Paths:** /admin/themes/edit/{code}, /admin/themes/source/{code}
- **Header actions:** Back, Save, Delete on edit only when existing form toolbar supports delete
- **Section cards needed:**
  - `fa-circle-info` **Theme identity** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Theme configuration** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Colors** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Template editor/source** — Use existing form config fields belonging to this section/tab.
- **Preview/sidebar:** Use only if existing media/status/summary data is already available; otherwise omit or show safe placeholder.
- **Risks:**
  - Theme controller is under system namespace
  - Source editor can be risky; implementation should avoid behavior changes

## Staff — `/admin/staffs`

### List page

- **Page title:** Staff
- **Top header actions:** New/Create when existing toolbar supports it, Secondary page-specific action where existing toolbar supports it, Bulk/status/delete only if already present; otherwise do not add
- **Recommended KPI cards:**
  - `fa-users` **Total staff** — source: count staff; fallback: `0`; meaning: Staff accounts; support: available via model/query if safely exposed.
  - `fa-user-check` **Active staff** — source: count staff_status active; fallback: `0`; meaning: Accounts able to operate; support: available via model/query if safely exposed.
  - `fa-user-shield` **Super staff** — source: count super_user true; fallback: `0`; meaning: Privileged access; support: available via model/query if safely exposed.
  - `fa-triangle-exclamation` **Missing security setup** — source: missing role/group/location or inactive invite; fallback: `0`; meaning: Access-control cleanup; support: needs backend support or existing setting lookup.
- **Main content card structure:**
  - Single universal content card containing search/filter controls and existing list/table area
  - Preserve existing list widget behavior and row actions
  - Mobile may switch table rows to cards in future implementation only after visual QA
- **Search:** Use existing searchable columns only; do not add backend search now.
- **Filters:** Expose existing filter scopes only.
- **Table:** Preserve current columns, row actions, pagination, bulk behavior, and permissions.
- **Mobile cards:** Mobile card representation may mirror table columns but must remain read-only until implemented safely.
- **Old elements to hide or move later:**
  - Move old in-page title into universal header when implementation begins
  - Move existing toolbar buttons into universal top header when safe
  - Do not hide legacy actions until replacement actions are verified
- **Risks:**
  - Do not expose password fields in visual summaries
  - Role field is removed for non-super users in controller

### Create/edit pages

- **Paths:** /admin/staffs/create, /admin/staffs/edit/{id}
- **Header actions:** Back, Save, Delete on edit only when existing form toolbar supports delete
- **Section cards needed:**
  - `fa-circle-info` **Account** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Credentials/invite** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Location & group** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Role & permissions** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **POS/RFID/Biometric** — Use existing form config fields belonging to this section/tab.
- **Preview/sidebar:** Use only if existing media/status/summary data is already available; otherwise omit or show safe placeholder.
- **Risks:**
  - Do not expose password fields in visual summaries
  - Role field is removed for non-super users in controller

## Statuses — `/admin/statuses`

### List page

- **Page title:** Statuses
- **Top header actions:** New/Create when existing toolbar supports it, Secondary page-specific action where existing toolbar supports it, Bulk/status/delete only if already present; otherwise do not add
- **Recommended KPI cards:**
  - `fa-tags` **Total statuses** — source: count statuses; fallback: `0`; meaning: Workflow states; support: available via model/query if safely exposed.
  - `fa-receipt` **Order statuses** — source: count type=order; fallback: `0`; meaning: Order workflow coverage; support: available via model/query if safely exposed.
  - `fa-calendar-check` **Reservation statuses** — source: count type=reservation; fallback: `0`; meaning: Reservation workflow coverage; support: available via model/query if safely exposed.
  - `fa-bell` **Notifications enabled** — source: count notify true; fallback: `0`; meaning: Customer/staff notification footprint; support: available via model/query if safely exposed.
- **Main content card structure:**
  - Single universal content card containing search/filter controls and existing list/table area
  - Preserve existing list widget behavior and row actions
  - Mobile may switch table rows to cards in future implementation only after visual QA
- **Search:** Use existing searchable columns only; do not add backend search now.
- **Filters:** Expose existing filter scopes only.
- **Table:** Preserve current columns, row actions, pagination, bulk behavior, and permissions.
- **Mobile cards:** Mobile card representation may mirror table columns but must remain read-only until implemented safely.
- **Old elements to hide or move later:**
  - Move old in-page title into universal header when implementation begins
  - Move existing toolbar buttons into universal top header when safe
  - Do not hide legacy actions until replacement actions are verified
- **Risks:**
  - Controller disables checkbox/bulk/row click; preserve behavior
  - Status ids may be hard-coded elsewhere; no delete-first implementation

### Create/edit pages

- **Paths:** /admin/statuses/create, /admin/statuses/edit/{id}
- **Header actions:** Back, Save, Delete on edit only when existing form toolbar supports delete
- **Section cards needed:**
  - `fa-circle-info` **Identity** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Type/usage** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Color** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Notification** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Comment** — Use existing form config fields belonging to this section/tab.
- **Preview/sidebar:** Use only if existing media/status/summary data is already available; otherwise omit or show safe placeholder.
- **Risks:**
  - Controller disables checkbox/bulk/row click; preserve behavior
  - Status ids may be hard-coded elsewhere; no delete-first implementation

## Payment methods — `/admin/payments?mode=methods`

### List page

- **Page title:** Payment methods
- **Top header actions:** New/Create when existing toolbar supports it, Secondary page-specific action where existing toolbar supports it, Bulk/status/delete only if already present; otherwise do not add
- **Recommended KPI cards:**
  - `fa-credit-card` **Methods** — source: count method records; fallback: `0`; meaning: Customer payment options; support: available via model/query if safely exposed.
  - `fa-toggle-on` **Enabled** — source: count enabled records; fallback: `0`; meaning: Available payment methods; support: available via model/query if safely exposed.
  - `fa-star` **Default** — source: default method/provider; fallback: `—`; meaning: Fallback payment choice; support: needs backend support or existing setting lookup.
  - `fa-triangle-exclamation` **Provider issues** — source: incompatible/missing provider config; fallback: `0`; meaning: Checkout/payment readiness; support: needs backend support or existing setting lookup.
- **Main content card structure:**
  - Single universal content card containing search/filter controls and existing list/table area
  - Preserve existing list widget behavior and row actions
  - Mobile may switch table rows to cards in future implementation only after visual QA
- **Search:** Use existing searchable columns only; do not add backend search now.
- **Filters:** Expose existing filter scopes only.
- **Table:** Preserve current columns, row actions, pagination, bulk behavior, and permissions.
- **Mobile cards:** Mobile card representation may mirror table columns but must remain read-only until implemented safely.
- **Old elements to hide or move later:**
  - Move old in-page title into universal header when implementation begins
  - Move existing toolbar buttons into universal top header when safe
  - Do not hide legacy actions until replacement actions are verified
- **Risks:**
  - Do not change payment code
  - Compatibility KPI needs backend support and redacted provider metadata

### Create/edit pages

- **Paths:** /admin/payments/edit/{code}?mode=methods
- **Header actions:** Back, Save, Delete on edit only when existing form toolbar supports delete
- **Section cards needed:**
  - `fa-circle-info` **Method basics** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Provider assignment** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Status/default** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Provider-specific config** — Use existing form config fields belonging to this section/tab.
- **Preview/sidebar:** Use only if existing media/status/summary data is already available; otherwise omit or show safe placeholder.
- **Risks:**
  - Do not change payment code
  - Compatibility KPI needs backend support and redacted provider metadata

## Coupons & Gift Cards — `/admin/coupons`

### List page

- **Page title:** Coupons & Gift Cards
- **Top header actions:** New/Create when existing toolbar supports it, Secondary page-specific action where existing toolbar supports it, Bulk/status/delete only if already present; otherwise do not add
- **Recommended KPI cards:**
  - `fa-ticket` **Total incentives** — source: count coupons/gift cards; fallback: `0`; meaning: Promotion inventory; support: available via model/query if safely exposed.
  - `fa-toggle-on` **Active** — source: count status enabled; fallback: `0`; meaning: Currently usable incentives; support: available via model/query if safely exposed.
  - `fa-gift` **Gift-card balance** — source: sum balance for gift cards; fallback: `€0.00`; meaning: Outstanding stored value; support: available via model/query if safely exposed.
  - `fa-calendar-xmark` **Expiring soon** — source: expiry date within 30 days; fallback: `0`; meaning: Promotion follow-up; support: needs backend support or existing setting lookup.
- **Main content card structure:**
  - Single universal content card containing search/filter controls and existing list/table area
  - Preserve existing list widget behavior and row actions
  - Mobile may switch table rows to cards in future implementation only after visual QA
- **Search:** Use existing searchable columns only; do not add backend search now.
- **Filters:** Expose existing filter scopes only.
- **Table:** Preserve current columns, row actions, pagination, bulk behavior, and permissions.
- **Mobile cards:** Mobile card representation may mirror table columns but must remain read-only until implemented safely.
- **Old elements to hide or move later:**
  - Move old in-page title into universal header when implementation begins
  - Move existing toolbar buttons into universal top header when safe
  - Do not hide legacy actions until replacement actions are verified
- **Risks:**
  - Balance aggregate must not expose sensitive customer data
  - Expiry KPI needs backend support if not indexed/exposed

### Create/edit pages

- **Paths:** /admin/coupons/create, /admin/coupons/edit/{id}
- **Header actions:** Back, Save, Delete on edit only when existing form toolbar supports delete
- **Section cards needed:**
  - `fa-circle-info` **Identity** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Discount setup** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Gift card balance/purchase** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Redemption limits** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Status & expiry** — Use existing form config fields belonging to this section/tab.
- **Preview/sidebar:** Use only if existing media/status/summary data is already available; otherwise omit or show safe placeholder.
- **Risks:**
  - Balance aggregate must not expose sensitive customer data
  - Expiry KPI needs backend support if not indexed/exposed

## POS configurations — `/admin/pos_configs`

### List page

- **Page title:** POS configurations
- **Top header actions:** New/Create when existing toolbar supports it, Secondary page-specific action where existing toolbar supports it, Bulk/status/delete only if already present; otherwise do not add
- **Recommended KPI cards:**
  - `fa-cash-register` **Total configs** — source: count pos configs; fallback: `0`; meaning: Integration records; support: available via model/query if safely exposed.
  - `fa-plug` **Ready2Order** — source: configs whose device code is ready2order; fallback: `0`; meaning: R2O sync coverage; support: needs backend support or existing setting lookup.
  - `fa-link` **Webhook registered** — source: exists_webhook true; fallback: `0`; meaning: Webhook setup status; support: needs backend support or existing setting lookup.
  - `fa-key` **Needs credentials** — source: missing url/token/username where required; fallback: `0`; meaning: Integration setup risk; support: available via model/query if safely exposed.
- **Main content card structure:**
  - Single universal content card containing search/filter controls and existing list/table area
  - Preserve existing list widget behavior and row actions
  - Mobile may switch table rows to cards in future implementation only after visual QA
- **Search:** Use existing searchable columns only; do not add backend search now.
- **Filters:** Expose existing filter scopes only.
- **Table:** Preserve current columns, row actions, pagination, bulk behavior, and permissions.
- **Mobile cards:** Mobile card representation may mirror table columns but must remain read-only until implemented safely.
- **Old elements to hide or move later:**
  - Move old in-page title into universal header when implementation begins
  - Move existing toolbar buttons into universal top header when safe
  - Do not hide legacy actions until replacement actions are verified
- **Risks:**
  - Secrets must be redacted
  - Existing toolbar has integration test/sync actions; do not trigger during QA

### Create/edit pages

- **Paths:** /admin/pos_configs/create, /admin/pos_configs/edit/{id}
- **Header actions:** Back, Save, Delete on edit only when existing form toolbar supports delete
- **Section cards needed:**
  - `fa-circle-info` **Device** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Endpoint** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Credentials** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Provider-specific fields** — Use existing form config fields belonging to this section/tab.
  - `fa-folder-open` **Diagnostics/actions** — Use existing form config fields belonging to this section/tab.
- **Preview/sidebar:** Use only if existing media/status/summary data is already available; otherwise omit or show safe placeholder.
- **Risks:**
  - Secrets must be redacted
  - Existing toolbar has integration test/sync actions; do not trigger during QA

## Next safe implementation order

1. Run Playwright visual QA on the reference KDS pages and all target list pages without credentials in chat.
2. Implement a read-only universal header + KPI skeleton behind a single page-specific safe flag for one low-risk list page, preferably `statuses` or `mealtimes`.
3. Add safe backend aggregate support only for that page, with fallbacks and no schema changes.
4. Run visual QA and compare screenshots/console/network failures.
5. Extend to `categories`, `locations`, and `tables` after the first page is stable.
6. Defer `orders`, `reservations`, `payments`, `pos_configs`, and `themes` until low-risk pages are verified because they have workflow/payment/integration/theme risks.
