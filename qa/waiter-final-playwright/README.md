# PayMyDine Waiter Final Playwright QA

A completely isolated Playwright test project for:

- `https://<tenant>.paymydine.com/admin/dashboardwaiternewfinal`
- the embedded waiter ordering workspace
- the payment center
- V2.2 table-operation endpoints
- desktop, tablet and phone layouts
- light and dark modes
- console, network, layout-shift and freeze diagnostics

It does not change production UI files.

## Safety model

The default suites are non-destructive. They may:

- log in
- load live table and notification data
- filter and search tables
- open a table
- add products to the local unsent cart
- change local quantities, guests and notes
- clear the unsent local cart
- open and inspect payment, split, coupon and method controls
- refresh payment status
- inspect the operations API
- toggle themes
- simulate offline and recovery

They do **not** send an order, record payment, apply a coupon or void anything unless the matching environment switch is enabled.

Real mutations require all of the following:

```bash
PMD_ALLOW_MUTATIONS=1
PMD_TEST_TABLES=10,17
```

Real cash payment additionally requires:

```bash
PMD_ALLOW_PAYMENT_MUTATIONS=1
```

Use those switches only on dedicated test tables and preferably a test tenant.

## Install

```bash
cd qa/waiter-final-playwright
cp .env.example .env
nano .env
npm install
npx playwright install chromium
```

Never commit `.env`.

## Run

```bash
./scripts/run-waiter-final-qa.sh smoke
./scripts/run-waiter-final-qa.sh full
./scripts/run-waiter-final-qa.sh responsive
./scripts/run-waiter-final-qa.sh stability
```

A one-time real order test:

```bash
PMD_ALLOW_MUTATIONS=1 \
PMD_TEST_TABLES=10,17 \
./scripts/run-waiter-final-qa.sh mutations
```

## Reports

Each run produces:

- `playwright-report/index.html`
- `test-results/results.json`
- `test-results/junit.xml`
- screenshots on failures
- retained video on failures
- Playwright traces on failures
- `pmd-qa-telemetry.json` attached to every test

Open the HTML report:

```bash
npx playwright show-report playwright-report
```

Open a trace:

```bash
npx playwright show-trace test-results/artifacts/<test>/trace.zip
```

## Coverage

### Boot and live data

- login and authenticated storage state
- final page root and debug API
- live table data
- notifications API
- status counters
- no experimental V2.2.1 visual decorator
- no final-page MutationObserver loop

### Launcher

- My Tables, Open, Attention, Free and All filters
- area filters
- table/status search
- notification and activity drawer
- refresh
- persistent light/dark mode
- reservations and table-operations destinations

### Ordering

- category and product keys
- positive visible prices
- product search
- grid/list mode
- modifiers and required options
- guest count
- item quantity
- item note
- table/kitchen note
- local draft and clear-cart behavior
- no destructive send during the normal suite

### Payment

- primary payment summary
- modal no-auto-close stability
- full balance
- equal split
- item split
- custom/share split when exposed
- cash and change calculation
- external terminal safeguards
- configured online methods
- tips
- coupon controls and optional validation
- payment history
- refresh status
- no real collection during the normal suite

### Operations

- V2.2 operations endpoint returns authenticated JSON
- gated real Hold or Send test
- optional gated void cleanup
- separately gated cash-payment test

### Responsive and visual

- desktop Chromium
- tablet profile
- phone profile
- light and dark screenshots attached to the report
- horizontal-overflow checks
- minimum visible control size checks
- critical/serious accessibility scan

### Stability

- repeated full reloads
- 15-second live-poll geometry comparison
- repeated open/close of table overlay
- repeated payment open/refresh/close
- offline indicator and online recovery
- uncaught JavaScript errors
- console errors
- same-origin request failures
- HTTP 500 responses
- cumulative layout shift
- long main-thread tasks

## Useful environment options

```bash
PMD_HEADLESS=0
PMD_SLOW_MO=150
PMD_WORKERS=1
PMD_MAX_LAYOUT_SHIFT=0.10
PMD_MAX_LONG_TASKS=12
PMD_TEST_PRODUCT="Joojeh Kebab"
PMD_TEST_COUPON="TEST10"
PMD_ALLOW_COUPON_VALIDATION=1
```

## Mutation cleanup

When `PMD_CLEANUP_VOID=1`, the mutation suite calls the V2.2 `void-order` operation after creating the QA order. If the tenant does not permit voiding, leave this disabled and review the order ID attached to `created-order.json` in the report.

## CI

The included manual GitHub Actions workflow reads credentials only from repository secrets:

- `PMD_QA_BASE_URL`
- `PMD_QA_USERNAME`
- `PMD_QA_PASSWORD`

It never stores credentials in source control.
