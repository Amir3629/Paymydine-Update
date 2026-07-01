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
