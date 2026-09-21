# PMD Admin Page Specs Summary

Generated summary of recommended four KPI cards for each universal admin list page. See `docs/PMD_ADMIN_UNIVERSAL_PAGE_SPECS_V1.md` and `pmd-qa/pmd-admin-page-specs.json` for details.

## KPI card matrix

### Orders — `/admin/orders`
- fa-calendar-day **Today orders**: Daily order volume (source: orders created today; fallback: `0`).
- fa-hourglass-half **Open orders**: Operational workload (source: orders not completed/paid/canceled; fallback: `0`).
- fa-euro-sign **Revenue today**: Daily gross sales (source: sum order_total for today paid/completed orders; fallback: `€0.00`).
- fa-triangle-exclamation **Attention needed**: Exceptions needing review (source: failed/overdue/canceled/rejected orders; fallback: `0`).

### Reservations — `/admin/reservations`
- fa-calendar-day **Today reservations**: Expected covers today (source: reservations for today; fallback: `0`).
- fa-users **Guests today**: Expected guest load (source: sum guest_num for today; fallback: `0`).
- fa-clock **Pending/active**: Reservations requiring action (source: reservations not completed/canceled; fallback: `0`).
- fa-chair **Assigned tables**: Table planning readiness (source: reservations with table relation; fallback: `0`).

### Locations — `/admin/locations`
- fa-store **Total locations**: Location coverage (source: count locations; fallback: `0`).
- fa-toggle-on **Enabled**: Active service locations (source: count where status enabled; fallback: `0`).
- fa-address-book **Missing contact**: Operational setup gaps (source: locations missing email or telephone; fallback: `0`).
- fa-map-location-dot **Needs geo review**: Map/delivery readiness (source: locations missing lat/lng or auto geocode disabled; fallback: `0`).

### Categories — `/admin/categories`
- fa-layer-group **Total categories**: Menu organization size (source: count categories; fallback: `0`).
- fa-toggle-on **Enabled**: Visible taxonomy (source: count categories status enabled; fallback: `0`).
- fa-eye-slash **Hidden from frontend**: Customer visibility exceptions (source: count frontend_visible false; fallback: `0`).
- fa-image **Needs image**: Merchandising gaps (source: count missing image; fallback: `0`).

### Mealtimes — `/admin/mealtimes`
- fa-clock **Total mealtimes**: Configured service windows (source: count mealtimes; fallback: `0`).
- fa-toggle-on **Enabled**: Active windows (source: count enabled mealtimes; fallback: `0`).
- fa-location-dot **Locations covered**: Coverage by restaurant (source: distinct locations relation count; fallback: `0`).
- fa-triangle-exclamation **Overlaps to review**: Scheduling conflict risk (source: overlapping time windows; fallback: `0`).

### Tables — `/admin/tables`
- fa-chair **Total tables**: Floor capacity objects (source: count tables; fallback: `0`).
- fa-toggle-on **Enabled/available**: Usable tables (source: count table_status enabled/free; fallback: `0`).
- fa-users **Total capacity**: Seating capacity (source: sum min/max capacity where available; fallback: `0`).
- fa-cash-register **POS linked**: POS sync coverage (source: tables with pos_table_label/table_no; fallback: `0`).

### Themes — `/admin/themes`
- fa-palette **Installed themes**: Available storefront themes (source: count theme records; fallback: `0`).
- fa-star **Active theme**: Live customer theme (source: current default/active theme; fallback: `—`).
- fa-code-branch **Child themes**: Customization footprint (source: themes marked child; fallback: `0`).
- fa-image **Missing assets**: Theme health risks (source: themes missing screenshot/assets; fallback: `0`).

### Staff — `/admin/staffs`
- fa-users **Total staff**: Staff accounts (source: count staff; fallback: `0`).
- fa-user-check **Active staff**: Accounts able to operate (source: count staff_status active; fallback: `0`).
- fa-user-shield **Super staff**: Privileged access (source: count super_user true; fallback: `0`).
- fa-triangle-exclamation **Missing security setup**: Access-control cleanup (source: missing role/group/location or inactive invite; fallback: `0`).

### Statuses — `/admin/statuses`
- fa-tags **Total statuses**: Workflow states (source: count statuses; fallback: `0`).
- fa-receipt **Order statuses**: Order workflow coverage (source: count type=order; fallback: `0`).
- fa-calendar-check **Reservation statuses**: Reservation workflow coverage (source: count type=reservation; fallback: `0`).
- fa-bell **Notifications enabled**: Customer/staff notification footprint (source: count notify true; fallback: `0`).

### Payment methods — `/admin/payments?mode=methods`
- fa-credit-card **Methods**: Customer payment options (source: count method records; fallback: `0`).
- fa-toggle-on **Enabled**: Available payment methods (source: count enabled records; fallback: `0`).
- fa-star **Default**: Fallback payment choice (source: default method/provider; fallback: `—`).
- fa-triangle-exclamation **Provider issues**: Checkout/payment readiness (source: incompatible/missing provider config; fallback: `0`).

### Coupons & Gift Cards — `/admin/coupons`
- fa-ticket **Total incentives**: Promotion inventory (source: count coupons/gift cards; fallback: `0`).
- fa-toggle-on **Active**: Currently usable incentives (source: count status enabled; fallback: `0`).
- fa-gift **Gift-card balance**: Outstanding stored value (source: sum balance for gift cards; fallback: `€0.00`).
- fa-calendar-xmark **Expiring soon**: Promotion follow-up (source: expiry date within 30 days; fallback: `0`).

### POS configurations — `/admin/pos_configs`
- fa-cash-register **Total configs**: Integration records (source: count pos configs; fallback: `0`).
- fa-plug **Ready2Order**: R2O sync coverage (source: configs whose device code is ready2order; fallback: `0`).
- fa-link **Webhook registered**: Webhook setup status (source: exists_webhook true; fallback: `0`).
- fa-key **Needs credentials**: Integration setup risk (source: missing url/token/username where required; fallback: `0`).

## Blocking errors / runtime checks

- environment: php artisan route:list cannot run in this workspace because setup/foundation files are missing; runtime route 500/asset verification must be performed on VPS with Playwright. Status: `blocked locally`.
- asset-risk: Static references exist to PMD mediafix vendor assets and pmd-waiter JS that should be checked by Playwright network-failure capture on production. Status: `needs VPS verification`.

## Next safe implementation order

1. Validate reference KDS pages and target pages with Playwright visual QA on the VPS.
2. Start with `statuses` or `mealtimes` as the lowest-risk read-only universal list skeleton.
3. Add backend KPI data only after fallbacks render safely; no schema changes.
4. Progress to `categories`, `locations`, and `tables`.
5. Defer `orders`, `reservations`, `payments`, `pos_configs`, and `themes` until the low-risk pages are proven stable.
