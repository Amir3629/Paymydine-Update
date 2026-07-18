# PMD Admin Visual QA

Isolated Playwright workspace for PayMyDine admin visual QA. It does not share dependencies with the Laravel/TastyIgniter app and must not submit, save, delete, or mutate business data.

## Setup

```bash
cd /var/www/paymydine/pmd-qa
npm install
npx playwright install chromium
```

## Safe production run

Do not paste or send the admin password in chat, tickets, logs, or PR comments. Run from the isolated QA folder on the VPS and enter the password silently:

```bash
cd /var/www/paymydine/pmd-qa
read -s PMD_ADMIN_PASS
export PMD_ADMIN_PASS
PMD_BASE_URL="https://mimoza.paymydine.com" \
PMD_ADMIN_USER="..." \
npm run visual
```

The visual QA suite only logs in, navigates, screenshots, inspects DOM/styles, and records console/page/network failures. It does not submit forms and does not create, edit, save, delete, or mutate business data. Results remain local under `pmd-qa-results/`.

Use `npm run visual:clean` to remove local QA results and immediately run the visual suite again.

## Run

```bash
PMD_BASE_URL="https://mimoza.paymydine.com" \
PMD_ADMIN_USER="..." \
PMD_ADMIN_PASS="..." \
npm run visual
```

Optional paths:

- `PMD_MENU_CREATE_PATH` defaults to `/admin/menus/create`
- `PMD_MENU_EDIT_PATH` defaults to `/admin/menus/edit/167`
- `PMD_KDS_CREATE_PATH`
- `PMD_KDS_EDIT_PATH`
- `PMD_SETTINGS_PATH` defaults to `/admin`

Results are written to `pmd-qa-results/`, including `pmd-admin-visual-report.md` and Playwright traces captured on every run.

## Admin runtime stabilization audit

Phase 1 and Phase 2 live inside this existing `pmd-qa` workspace. The audit is observational only: it uses Playwright screenshots, video, trace, DOM snapshots, console/network listeners, and static source scanning. It does not hardcode credentials and does not intentionally click destructive controls.

### Required environment

```bash
export PMD_BASE_URL="https://mimoza.paymydine.com"
export PMD_USERNAME="<admin username>"
export PMD_PASSWORD="<admin password>"
```

### Local commands

```bash
cd pmd-qa
npm install
npx playwright install chromium
npm run audit:admin-runtime
```

Run a single route while developing:

```bash
cd pmd-qa
PMD_AUDIT_ROUTE=/admin/reservations npm run audit:admin-runtime:route
```

Run headed for visual debugging:

```bash
cd pmd-qa
npm run audit:admin-runtime:headed
```

Regenerate the ownership report from existing artifacts and static source evidence:

```bash
cd pmd-qa
npm run audit:admin-runtime:report
```

### VPS-safe commands

These commands are safe to run from a checkout or copied QA workspace because they only write local artifacts under `pmd-qa/pmd-qa-results/admin-runtime-stabilization/` and do not deploy or edit the VPS application:

```bash
cd /path/to/Paymydine-Update/pmd-qa
export PMD_BASE_URL="https://mimoza.paymydine.com"
export PMD_USERNAME="<admin username>"
export PMD_PASSWORD="<admin password>"
npm install
npx playwright install chromium
npm run audit:admin-runtime
```

### Artifact locations

The audit writes machine-readable and reviewable evidence under:

- `pmd-qa/pmd-qa-results/admin-runtime-stabilization/summary.json`
- `pmd-qa/pmd-qa-results/admin-runtime-stabilization/routes/<route>/<viewport>/audit.json`
- `pmd-qa/pmd-qa-results/admin-runtime-stabilization/routes/<route>/<viewport>/timeline/`
- `pmd-qa/pmd-qa-results/admin-runtime-stabilization/routes/<route>/<viewport>/screenshots/`
- `pmd-qa/pmd-qa-results/admin-runtime-stabilization/routes/<route>/<viewport>/trace.zip`
- `pmd-qa/pmd-qa-results/admin-runtime-stabilization/routes/<route>/<viewport>/video/`
- `pmd-qa/pmd-qa-results/admin-runtime-stabilization/admin-runtime-report.html`
- `pmd-qa/pmd-qa-results/admin-runtime-stabilization/ownership-map.json`
- `pmd-qa/pmd-qa-results/admin-runtime-stabilization/ownership-map.md`

### Notes and limitations

- The full matrix is intentionally large: target routes plus directly reachable `/admin/settings` child pages across nine viewports and runtime modes.
- Credentials must be supplied as `PMD_USERNAME` and `PMD_PASSWORD`; older `PMD_ADMIN_USER` and `PMD_ADMIN_PASS` variables are not used by this audit.
- Safe rapid/double click coverage skips labels and hrefs that look destructive or data-mutating, including delete, save, payment, confirm, create, and Persian equivalents.
- CPU throttling is enabled only where Chromium CDP supports it; otherwise the audit records the route without CPU throttling.
