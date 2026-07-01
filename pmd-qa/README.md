# PMD Admin Visual QA

Isolated Playwright workspace for PayMyDine admin visual QA. It does not share dependencies with the Laravel/TastyIgniter app and must not submit, save, delete, or mutate business data.

## Setup

```bash
cd /var/www/paymydine/pmd-qa
npm install
npx playwright install chromium
```

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

Results are written to `pmd-qa-results/`, including `pmd-admin-visual-report.md` and Playwright traces retained on failure.
