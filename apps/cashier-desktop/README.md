# PayMyDine Cashier Desktop v1.1.0 — Real App

PayMyDine Cashier v1.1.0 is a locally bundled Electron POS for Windows and macOS Apple Silicon. The main Cashier UI is installed with the application and no longer boots by loading `/admin/cashierlab` as its main screen.

## Architecture

- **Local UI authority:** `src/app.html`, `src/app.css`, `src/app.js`
- **Desktop runtime:** `src/real-app-main.js`
- **Durable local data:** `src/local-store.js`
- **Cloud business authority:** existing PayMyDine tenant Admin endpoints
- **Hardware authority:** existing local printer/cash-drawer modules
- **Payments:** canonical PayMyDine server settlement/provider flows remain authoritative

The desktop app uses the selected tenant's secure Electron session to call existing APIs such as:

- `/admin/pmd-waiter-dashboard-v9-tenant-data`
- `/admin/pmd-waiter-pos-v1/data/{table}`
- `/admin/pmd-waiter-pos-v1/save/{table}`
- `/admin/pmd-waiter-pos-v1/payment-summary/{order}`
- `/admin/pmd-waiter-pos-v1/payment-settle/{order}`

This keeps one order/payment backend instead of creating a second POS database on the device.

## Offline behavior

The app caches successful GET payloads and keeps per-table drafts in the Electron user-data directory. After a restart or internet loss, cached tables/menu data and local drafts remain available.

Offline is intentionally safe:

- cached floor/menu: available
- cart and table-note drafts: available and durable
- printer/cash-drawer configuration: local
- sending a new order to the kitchen: requires cloud connectivity
- recording a payment: requires cloud connectivity
- card/provider approval: never inferred from a client/browser return

When offline, **Save locally** stores the draft but does not claim that the kitchen or cloud received it.

## Cash payments

Cash settlement is posted to the canonical server endpoint with an idempotency key. The local cash drawer opens only after the server returns a successful settlement. Hardware failure never turns a valid payment into a failed payment.

## Card / terminal / online providers

Provider payments use the existing secure PayMyDine payment surface. The local app does not duplicate provider SDK or settlement truth.

## Security

Electron windows keep:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- narrow preload IPC only
- tenant-host allowlisting for remote compatibility/login windows
- no tenant database credentials on the device

## Build

```bash
npm install
npm run check
npm run dist:win
npm run dist:mac -- --arm64
```

Artifacts:

- Windows: `PayMyDine-Cashier-Setup-1.1.0.exe`
- Apple Silicon: `PayMyDine-Cashier-1.1.0-mac-arm64.dmg`

GitHub Actions workflow: `.github/workflows/cashier-desktop-v110.yml`.

## Repository-only source warning

The production VPS intentionally does not own this Electron build source. A clean VPS snapshot must preserve `.github` and `apps/cashier-desktop` from the GitHub base commit using `tools/pmd-preserve-repo-only-after-vps-sync.sh`; otherwise a VPS rsync can accidentally delete the desktop source from a future clean-sync commit.

## Next product phase

After the real app is validated, the separate Windows dedicated-device phase can add kiosk/shell replacement, branded boot, automatic launch and device lockdown. That phase is intentionally not mixed into the v1.1.0 application rewrite.
